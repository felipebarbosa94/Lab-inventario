import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/sendEmail";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
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

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, quantity, unit, low_stock_threshold")
    .not("low_stock_threshold", "is", null);

  if (itemsError) {
    return NextResponse.json({ sent: false, error: itemsError.message }, { status: 500 });
  }

  const lowStock = ((items as LowStockItem[]) ?? []).filter(
    (i) => i.quantity <= i.low_stock_threshold
  );

  if (lowStock.length === 0) {
    return NextResponse.json({ sent: false, reason: "no low stock items" });
  }

  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - 7);

  const { data: recentAlerts } = await supabase
    .from("alert_log")
    .select("item_id")
    .gte("sent_at", cooldownDate.toISOString());

  const recentlyAlerted = new Set((recentAlerts ?? []).map((a) => a.item_id as string));
  const toAlert = lowStock.filter((i) => !recentlyAlerted.has(i.id));

  if (toAlert.length === 0) {
    return NextResponse.json({ sent: false, reason: "all recently alerted" });
  }

  const rowsHtml = toAlert
    .map(
      (i) =>
        `<li>${i.name}: quedan <strong>${i.quantity} ${i.unit}</strong> (umbral ${i.low_stock_threshold})</li>`
    )
    .join("");
  const html = `<p>⚠️ Stock bajo en el laboratorio:</p><ul>${rowsHtml}</ul>`;

  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    return NextResponse.json(
      { sent: false, error: "Falta la variable de entorno ALERT_EMAIL_TO" },
      { status: 500 }
    );
  }

  const result = await sendEmail({ to, subject: "⚠️ Inventario Lab — stock bajo", html });
  if (!result.ok) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 500 });
  }

  await supabase.from("alert_log").insert(toAlert.map((i) => ({ item_id: i.id })));

  return NextResponse.json({ sent: true, count: toAlert.length, items: toAlert.map((i) => i.name) });
}
