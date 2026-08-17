import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";

function checkPin(request: Request): boolean {
  const pin = request.headers.get("x-finance-pin");
  const expected = process.env.FINANCE_PIN;
  return Boolean(expected) && pin === expected;
}

function unauthorized() {
  return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
}

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

export async function GET(request: Request) {
  if (!checkPin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "YYYY-MM", opcional
  const historyItemId = searchParams.get("item_history"); // opcional

  const supabase = getSupabaseAdmin();

  if (historyItemId) {
    const { data, error } = await supabase
      .from("item_cost_history")
      .select("unit_cost, recorded_at")
      .eq("item_id", historyItemId)
      .order("recorded_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ history: data ?? [] });
  }

  const [itemsRes, recipesRes, recipeItemsRes, costsRes, pricingRes, expensesRes] =
    await Promise.all([
      supabase.from("items").select("id, name, unit, category"),
      supabase.from("recipes").select("id, name, project, batch_label"),
      supabase.from("recipe_items").select("id, recipe_id, item_id, quantity_per_batch"),
      supabase.from("item_costs").select("item_id, unit_cost"),
      supabase.from("recipe_pricing").select("recipe_id, selling_price"),
      supabase.from("expenses").select("id, name, amount, frequency, created_at").order("created_at"),
    ]);

  const items = itemsRes.data ?? [];
  const recipes = recipesRes.data ?? [];
  const recipeItems = recipeItemsRes.data ?? [];
  const costs = costsRes.data ?? [];
  const pricing = pricingRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const costByItem = new Map(costs.map((c) => [c.item_id as string, Number(c.unit_cost)]));
  const priceByRecipe = new Map(pricing.map((p) => [p.recipe_id as string, Number(p.selling_price)]));
  const itemById = new Map(items.map((i) => [i.id as string, i]));

  const recipeSummaries = recipes.map((r) => {
    const ingredients = recipeItems.filter((ri) => ri.recipe_id === r.id);
    let costPerBatch = 0;
    let missingCost = false;
    const breakdown = ingredients.map((ri) => {
      const item = itemById.get(ri.item_id as string);
      const unitCost = costByItem.get(ri.item_id as string);
      if (unitCost === undefined) missingCost = true;
      const lineCost = (unitCost ?? 0) * Number(ri.quantity_per_batch);
      costPerBatch += lineCost;
      return {
        item_id: ri.item_id,
        name: item?.name ?? "Ítem eliminado",
        quantity_per_batch: ri.quantity_per_batch,
        unit_cost: unitCost ?? null,
        line_cost: lineCost,
      };
    });
    const sellingPrice = priceByRecipe.get(r.id as string) ?? null;
    return {
      id: r.id,
      name: r.name,
      project: r.project,
      batch_label: r.batch_label,
      cost_per_batch: costPerBatch,
      missing_cost: missingCost,
      selling_price: sellingPrice,
      margin_per_batch: sellingPrice !== null ? sellingPrice - costPerBatch : null,
      breakdown,
    };
  });

  const negativeMarginRecipes = recipeSummaries.filter(
    (r) => r.selling_price !== null && r.margin_per_batch !== null && r.margin_per_batch < 0
  );

  const monthlyExpenses = expenses
    .filter((e) => e.frequency === "mensual")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Mes actual (o el pedido)
  const now = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 1).toISOString();

  const currentBatches = await batchesByRecipeName(supabase, start, end);

  let realizedMargin = 0;
  const productionThisMonth = recipeSummaries
    .filter((r) => currentBatches.has(r.name))
    .map((r) => {
      const batches = currentBatches.get(r.name) ?? 0;
      const margin = r.margin_per_batch !== null ? r.margin_per_batch * batches : null;
      if (margin !== null) realizedMargin += margin;
      return { recipe_id: r.id, name: r.name, batches, margin };
    });

  // Historial de los últimos 6 meses (incluye el actual), usando costos/precios
  // ACTUALES para todos los meses — no llevamos histórico de cuándo cambió cada precio.
  const HISTORY_MONTHS = 6;
  const history = [];
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const hy = y;
    const hm = m - i;
    const hStart = new Date(hy, hm - 1, 1);
    const hEnd = new Date(hy, hm, 1);
    const batches = await batchesByRecipeName(supabase, hStart.toISOString(), hEnd.toISOString());
    let margin = 0;
    for (const r of recipeSummaries) {
      const b = batches.get(r.name) ?? 0;
      if (b > 0 && r.margin_per_batch !== null) margin += r.margin_per_batch * b;
    }
    history.push({
      month: `${hStart.getFullYear()}-${String(hStart.getMonth() + 1).padStart(2, "0")}`,
      realizedMargin: margin,
      monthlyExpenses,
      netProfit: margin - monthlyExpenses,
    });
  }

  return NextResponse.json({
    recipes: recipeSummaries,
    negativeMarginRecipes,
    items: items.map((i) => ({
      ...i,
      unit_cost: costByItem.get(i.id as string) ?? null,
    })),
    expenses,
    month: `${y}-${String(m).padStart(2, "0")}`,
    productionThisMonth,
    realizedMargin,
    monthlyExpenses,
    netProfitThisMonth: realizedMargin - monthlyExpenses,
    history,
  });
}

export async function POST(request: Request) {
  if (!checkPin(request)) return unauthorized();

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  if (body.action === "save_cost") {
    const { data: existing } = await supabase
      .from("item_costs")
      .select("unit_cost")
      .eq("item_id", body.item_id)
      .maybeSingle();

    const { error } = await supabase
      .from("item_costs")
      .upsert({ item_id: body.item_id, unit_cost: body.unit_cost, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!existing || Number(existing.unit_cost) !== Number(body.unit_cost)) {
      await supabase
        .from("item_cost_history")
        .insert({ item_id: body.item_id, unit_cost: body.unit_cost });
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "save_price") {
    const { error } = await supabase
      .from("recipe_pricing")
      .upsert({
        recipe_id: body.recipe_id,
        selling_price: body.selling_price,
        updated_at: new Date().toISOString(),
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_expense") {
    const { error } = await supabase.from("expenses").insert({
      name: body.name,
      amount: body.amount,
      frequency: body.frequency ?? "mensual",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "clear_price") {
    const { error } = await supabase
      .from("recipe_pricing")
      .delete()
      .eq("recipe_id", body.recipe_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_expense") {
    const { error } = await supabase.from("expenses").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
