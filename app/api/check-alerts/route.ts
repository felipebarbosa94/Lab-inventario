import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/sendEmail";
import { computeReorderPredictions, REORDER_URGENT_DAYS } from "@/lib/reorderPrediction";

const EXPIRY_WINDOW_DAYS = 15;
const COOLDOWN_DAYS = 7;

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
}

interface ExpiringItem {
  id: string;
  name: string;
  caducidad: string;
  lote: string | null;
}

interface AllItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);

  const expiryLimit = new Date();
  expiryLimit.setDate(expiryLimit.getDate() + EXPIRY_WINDOW_DAYS);

  const [itemsRes, allItemsRes, expiringRes, alertLogRes] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, quantity, unit, low_stock_threshold")
      .not("low_stock_threshold", "is", null),
    supabase.from("items").select("id, name, quantity, unit"),
    supabase
      .from("items")
      .select("id, name, caducidad, lote")
      .not("caducidad", "is", null)
      .lte("caducidad", expiryLimit.toISOString().slice(0, 10)),
    supabase.from("alert_log").select("item_id, alert_type").gte("sent_at", cooldownDate.toISOString()),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ sent: false, error: itemsRes.error.message }, { status: 500 });
  }
  if (allItemsRes.error) {
    return NextResponse.json({ sent: false, error: allItemsRes.error.message }, { status: 500 });
  }
  if (expiringRes.error) {
    return NextResponse.json({ sent: false, error: expiringRes.error.message }, { status: 500 });
  }

  const recentlyAlerted = new Set(
    (alertLogRes.data ?? []).map((a) => `${a.alert_type}:${a.item_id}`)
  );

  const lowStock = ((itemsRes.data as LowStockItem[]) ?? []).filter(
    (i) => i.quantity <= i.low_stock_threshold
  );
  const lowStockToAlert = lowStock.filter((i) => !recentlyAlerted.has(`low_stock:${i.id}`));

  const expiringToAlert = ((expiringRes.data as ExpiringItem[]) ?? []).filter(
    (i) => !recentlyAlerted.has(`caducidad:${i.id}`)
  );

  // Ítems que, según su ritmo real de consumo, se van a agotar pronto —
  // aunque todavía no hayan cruzado su umbral fijo (o no tengan umbral).
  const allItems = (allItemsRes.data as AllItem[]) ?? [];
  const lowStockIds = new Set(lowStock.map((i) => i.id));
  const predictions = await computeReorderPredictions(
    supabase,
    allItems.map((i) => ({ id: i.id, quantity: i.quantity }))
  );
  const reorderToAlert = allItems
    .filter((i) => !lowStockIds.has(i.id) && !recentlyAlerted.has(`reorder_prediction:${i.id}`))
    .map((i) => ({ ...i, prediction: predictions.get(i.id) }))
    .filter(
      (i): i is AllItem & { prediction: { dailyRate: number; daysRemaining: number } } =>
        i.prediction !== undefined && i.prediction.daysRemaining <= REORDER_URGENT_DAYS
    )
    .sort((a, b) => a.prediction.daysRemaining - b.prediction.daysRemaining);

  if (lowStockToAlert.length === 0 && expiringToAlert.length === 0 && reorderToAlert.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing new to alert" });
  }

  const sections: string[] = [];
  if (lowStockToAlert.length > 0) {
    const rowsHtml = lowStockToAlert
      .map(
        (i) =>
          `<li>${i.name}: quedan <strong>${i.quantity} ${i.unit}</strong> (umbral ${i.low_stock_threshold})</li>`
      )
      .join("");
    sections.push(`<p>⚠️ Stock bajo:</p><ul>${rowsHtml}</ul>`);
  }
  if (expiringToAlert.length > 0) {
    const rowsHtml = expiringToAlert
      .map((i) => {
        const days = Math.ceil(
          (new Date(i.caducidad).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const dateLabel = new Date(i.caducidad).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const status = days < 0 ? "ya caducó" : `caduca en ${days} día${days === 1 ? "" : "s"}`;
        return `<li>${i.name}${i.lote ? ` (lote ${i.lote})` : ""}: ${dateLabel} — ${status}</li>`;
      })
      .join("");
    sections.push(`<p>⏳ Por caducar o caducado:</p><ul>${rowsHtml}</ul>`);
  }
  if (reorderToAlert.length > 0) {
    const rowsHtml = reorderToAlert
      .map(
        (i) =>
          `<li>${i.name}: quedan <strong>${i.quantity} ${i.unit}</strong> — a este ritmo se acaba en ~${Math.round(i.prediction.daysRemaining)} día${Math.round(i.prediction.daysRemaining) === 1 ? "" : "s"}</li>`
      )
      .join("");
    sections.push(`<p>🔮 Se va a agotar pronto (según tu consumo):</p><ul>${rowsHtml}</ul>`);
  }
  const html = sections.join("<br/>");

  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    return NextResponse.json(
      { sent: false, error: "Falta la variable de entorno ALERT_EMAIL_TO" },
      { status: 500 }
    );
  }

  const result = await sendEmail({ to, subject: "⚠️ Inventario Lab — alertas", html });
  if (!result.ok) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 });
  }

  await supabase.from("alert_log").insert([
    ...lowStockToAlert.map((i) => ({ item_id: i.id, alert_type: "low_stock" })),
    ...expiringToAlert.map((i) => ({ item_id: i.id, alert_type: "caducidad" })),
    ...reorderToAlert.map((i) => ({ item_id: i.id, alert_type: "reorder_prediction" })),
  ]);

  return NextResponse.json({
    sent: true,
    lowStock: lowStockToAlert.map((i) => i.name),
    expiring: expiringToAlert.map((i) => i.name),
    reorderPrediction: reorderToAlert.map((i) => i.name),
  });
}
