import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/sendEmail";
import { computeStockoutCounts } from "@/lib/stockouts";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ProdEvent {
  note: string;
  created_at: string;
}

const PROD_NOTE_RE = /^Producción: (.+?) × ([\d.]+) \(/;

async function batchesByRecipeName(
  supabase: SupabaseClient,
  start: string,
  end: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("movements")
    .select("note, created_at")
    .eq("type", "salida")
    .like("note", "Producción:%")
    .gte("created_at", start)
    .lt("created_at", end);

  const seen = new Set<string>();
  const result = new Map<string, number>();
  for (const mv of (data ?? []) as ProdEvent[]) {
    const dedupeKey = `${mv.note}__${mv.created_at}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const match = mv.note.match(PROD_NOTE_RE);
    if (!match) continue;
    const [, recipeName, batchStr] = match;
    result.set(recipeName, (result.get(recipeName) ?? 0) + Number(batchStr));
  }
  return result;
}

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM", opcional (para pruebas)

  const supabase = getSupabaseAdmin();

  const now = new Date();
  let y: number;
  let m: number;
  if (monthParam) {
    [y, m] = monthParam.split("-").map(Number);
  } else {
    // Por default, el mes anterior (el digest corre el día 1 de cada mes).
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    y = prev.getFullYear();
    m = prev.getMonth() + 1;
  }
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 1).toISOString();
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const [recipesRes, recipeItemsRes, costsRes, pricingRes, expensesRes] = await Promise.all([
    supabase.from("recipes").select("id, name"),
    supabase.from("recipe_items").select("recipe_id, item_id, quantity_per_batch"),
    supabase.from("item_costs").select("item_id, unit_cost"),
    supabase.from("recipe_pricing").select("recipe_id, selling_price"),
    supabase.from("expenses").select("amount, frequency"),
  ]);

  const recipes = recipesRes.data ?? [];
  const recipeItems = recipeItemsRes.data ?? [];
  const costByItem = new Map((costsRes.data ?? []).map((c) => [c.item_id as string, Number(c.unit_cost)]));
  const priceByRecipe = new Map(
    (pricingRes.data ?? []).map((p) => [p.recipe_id as string, Number(p.selling_price)])
  );
  const monthlyExpenses = (expensesRes.data ?? [])
    .filter((e) => e.frequency === "mensual")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const recipeSummaries = recipes.map((r) => {
    const ingredients = recipeItems.filter((ri) => ri.recipe_id === r.id);
    const costPerBatch = ingredients.reduce(
      (sum, ri) => sum + (costByItem.get(ri.item_id as string) ?? 0) * Number(ri.quantity_per_batch),
      0
    );
    const sellingPrice = priceByRecipe.get(r.id as string) ?? null;
    return {
      name: r.name as string,
      marginPerBatch: sellingPrice !== null ? sellingPrice - costPerBatch : null,
    };
  });

  const batches = await batchesByRecipeName(supabase, start, end);
  let realizedMargin = 0;
  const negativeMargin: string[] = [];
  for (const r of recipeSummaries) {
    const b = batches.get(r.name) ?? 0;
    if (b > 0 && r.marginPerBatch !== null) {
      realizedMargin += r.marginPerBatch * b;
      if (r.marginPerBatch < 0) negativeMargin.push(r.name);
    }
  }

  const netProfit = realizedMargin - monthlyExpenses;

  const [itemsRes, allMovementsRes] = await Promise.all([
    supabase.from("items").select("id, name"),
    supabase.from("movements").select("item_id, type, quantity, created_at"),
  ]);
  const itemNameById = new Map(
    (itemsRes.data ?? []).map((i) => [i.id as string, i.name as string])
  );
  const stockoutCounts = computeStockoutCounts(allMovementsRes.data ?? []);
  const topStockouts = [...stockoutCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([itemId, count]) => ({ name: itemNameById.get(itemId) ?? "Ítem eliminado", count }));

  const stockoutsHtml =
    topStockouts.length > 0
      ? `
    <h3>📉 Lo que más se agota</h3>
    <p style="font-size:13px;color:#525252;">Veces que ha llegado a 0 desde que hay registro.</p>
    <ul>
      ${topStockouts.map((r) => `<li>${r.name}: se agotó ${r.count} vez${r.count === 1 ? "" : "es"}</li>`).join("")}
    </ul>
  `
      : "";

  const breakevenHtml =
    netProfit >= 0
      ? `<p style="color:#059669;">✅ Cubriste tus gastos fijos — vas ${money(
          netProfit
        )} arriba del punto de equilibrio.</p>`
      : `<p style="color:#b91c1c;">⚠️ Te faltaron ${money(
          Math.abs(netProfit)
        )} en margen para cubrir tus gastos fijos.</p>`;
  const negativeMarginHtml =
    negativeMargin.length > 0
      ? `<p style="color:#b91c1c;">⚠️ Recetas vendidas por debajo del costo: ${negativeMargin.join(
          ", "
        )}</p>`
      : "";

  const html = `
    <h2>📊 Resumen financiero — ${monthLabel}</h2>
    <p>Margen realizado: <strong>${money(realizedMargin)}</strong></p>
    <p>Gastos fijos: <strong>${money(monthlyExpenses)}</strong></p>
    <p>Ganancia neta: <strong>${money(netProfit)}</strong></p>
    ${breakevenHtml}
    ${negativeMarginHtml}
    ${stockoutsHtml}
  `;

  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    return NextResponse.json(
      { sent: false, error: "Falta la variable de entorno ALERT_EMAIL_TO" },
      { status: 500 }
    );
  }

  const result = await sendEmail({
    to,
    subject: `📊 Resumen financiero — ${monthLabel}`,
    html,
  });
  if (!result.ok) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sent: true, month: `${y}-${String(m).padStart(2, "0")}`, netProfit });
}
