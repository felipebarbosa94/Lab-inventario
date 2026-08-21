import type { SupabaseClient } from "@supabase/supabase-js";
import { ItemLot } from "./types";

interface LotLike {
  caducidad: string | null;
  received_at: string;
}

// FEFO: lotes con caducidad más próxima primero; los que no tienen
// caducidad van al final (no hay urgencia, se consumen de último). Entre
// lotes sin caducidad, el más antiguo primero.
export function sortLotsFefo<T extends LotLike>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    if (a.caducidad && b.caducidad) return a.caducidad.localeCompare(b.caducidad);
    if (a.caducidad) return -1;
    if (b.caducidad) return 1;
    return a.received_at.localeCompare(b.received_at);
  });
}

export interface LotAllocation {
  lot: ItemLot;
  take: number;
}

// Reparte `needed` entre los lotes de un ítem siguiendo FEFO, para saber de
// cuál lote descontar cada gramo/pieza. La suma de `take` siempre da
// exactamente `needed` (si el stock por lote no alcanza —no debería pasar
// si todo quedó sincronizado—, el resto se completa sobre el lote más
// próximo a vencer para no bloquear la operación ni perder cantidad).
export function allocateFefo(lots: ItemLot[], needed: number): LotAllocation[] {
  if (lots.length === 0 || needed <= 0) return [];
  const ordered = sortLotsFefo(lots);
  const allocation: LotAllocation[] = [];
  let remaining = needed;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    if (lot.quantity <= 0) continue;
    const take = Math.min(lot.quantity, remaining);
    allocation.push({ lot, take });
    remaining -= take;
  }
  if (remaining > 0) {
    const fallback = ordered[0];
    const existing = allocation.find((a) => a.lot.id === fallback.id);
    if (existing) existing.take += remaining;
    else allocation.push({ lot: fallback, take: remaining });
  }
  return allocation;
}

// Recalcula el lote "vigente" del ítem (el que caduca más próximo, con
// stock > 0) y sincroniza items.lote/caducidad/proveedor — así las
// tarjetas, alertas y reportes que ya leían esos campos siguen funcionando
// sin cambios, siempre mostrando el lote más urgente.
export async function syncItemHeadlineLot(supabase: SupabaseClient, itemId: string) {
  const { data } = await supabase
    .from("item_lots")
    .select("lote, caducidad, proveedor, received_at")
    .eq("item_id", itemId)
    .gt("quantity", 0);
  const headline = sortLotsFefo(data ?? [])[0] ?? null;
  await supabase
    .from("items")
    .update({
      lote: headline?.lote ?? null,
      caducidad: headline?.caducidad ?? null,
      proveedor: headline?.proveedor ?? null,
    })
    .eq("id", itemId);
}

// Encuentra o crea el lote "sin datos" de un ítem — usado para altas/bajas
// rápidas (corrección de stock) que no vienen de una recepción con lote y
// caducidad propios.
export async function getOrCreateDefaultLot(
  supabase: SupabaseClient,
  itemId: string
): Promise<ItemLot> {
  const { data: existing } = await supabase
    .from("item_lots")
    .select("*")
    .eq("item_id", itemId)
    .is("lote", null)
    .is("caducidad", null)
    .maybeSingle();
  if (existing) return existing as ItemLot;

  const { data: created, error } = await supabase
    .from("item_lots")
    .insert({ item_id: itemId, lote: null, caducidad: null, proveedor: null, quantity: 0 })
    .select()
    .single();
  if (error || !created) throw new Error(error?.message ?? "No se pudo crear el lote");
  return created as ItemLot;
}
