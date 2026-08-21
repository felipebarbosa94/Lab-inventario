import type { SupabaseClient } from "@supabase/supabase-js";

// Ventana de historial que se usa para calcular el ritmo de consumo, y a
// cuántos días de quedarse sin stock se considera "urgente" avisar — antes
// de que llegue al umbral fijo de alerta (o aunque no tenga umbral definido).
export const REORDER_WINDOW_DAYS = 60;
export const REORDER_URGENT_DAYS = 14;

export interface ReorderPrediction {
  dailyRate: number;
  daysRemaining: number;
}

// Calcula, para cada ítem, cuántos días le quedan de stock según su ritmo
// real de consumo (promedio de salidas en la ventana). Solo devuelve
// predicción para ítems que sí tuvieron consumo — sin eso no hay ritmo que
// proyectar.
export async function computeReorderPredictions(
  supabase: SupabaseClient,
  itemQuantities: { id: string; quantity: number }[],
  windowDays: number = REORDER_WINDOW_DAYS
): Promise<Map<string, ReorderPrediction>> {
  const ids = new Set(itemQuantities.map((i) => i.id));
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const { data } = await supabase
    .from("movements")
    .select("item_id, quantity")
    .eq("type", "salida")
    .gte("created_at", since.toISOString());

  const totals: Record<string, number> = {};
  for (const m of data ?? []) {
    if (!ids.has(m.item_id)) continue;
    totals[m.item_id] = (totals[m.item_id] ?? 0) + Number(m.quantity);
  }

  const result = new Map<string, ReorderPrediction>();
  for (const item of itemQuantities) {
    const totalUsed = totals[item.id] ?? 0;
    if (totalUsed <= 0) continue;
    const dailyRate = totalUsed / windowDays;
    result.set(item.id, { dailyRate, daysRemaining: item.quantity / dailyRate });
  }
  return result;
}

export type SemaphoreColor = "red" | "amber" | "green";

export interface SemaphoreInfo {
  color: SemaphoreColor;
  label: string;
}

// Semáforo de un ítem: rojo si ya está en stock bajo o se acaba en menos de
// una semana, amarillo si se acaba pronto, verde si tiene margen. Si no hay
// umbral definido ni historial de consumo, no hay señal que dar (null) —
// mejor no mostrar nada que mostrar un verde falso.
export function getStockSemaphore(
  item: { quantity: number; low_stock_threshold: number | null },
  prediction: ReorderPrediction | undefined
): SemaphoreInfo | null {
  const lowStock = item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold;
  if (lowStock) {
    return { color: "red", label: `Stock bajo — umbral ${item.low_stock_threshold}` };
  }
  if (prediction) {
    const days = Math.max(0, Math.round(prediction.daysRemaining));
    if (prediction.daysRemaining <= 7) {
      return { color: "red", label: `Se acaba en ~${days} día${days === 1 ? "" : "s"}` };
    }
    if (prediction.daysRemaining <= REORDER_URGENT_DAYS) {
      return { color: "amber", label: `Se acaba en ~${days} día${days === 1 ? "" : "s"}` };
    }
    return { color: "green", label: `Alcanza para ~${days} días` };
  }
  return item.low_stock_threshold !== null ? { color: "green", label: "Stock saludable" } : null;
}
