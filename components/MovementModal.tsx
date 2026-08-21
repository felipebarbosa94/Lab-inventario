"use client";

import { useState } from "react";
import { Item, ItemLot, MovementType } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { convertQuantity, entryUnitOptions, EntryUnit, roundQty } from "@/lib/units";
import { allocateFefo, getOrCreateDefaultLot, syncItemHeadlineLot } from "@/lib/lots";
import { sanitizeDecimalInput } from "@/lib/parseDecimal";
import { formatQuantity } from "@/lib/formatQuantity";
import { supabase } from "@/lib/supabase";

export default function MovementModal({
  item,
  type,
  workerName,
  onClose,
}: {
  item: Item;
  type: MovementType;
  workerName: string;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [entryUnit, setEntryUnit] = useState<EntryUnit>(item.unit);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = type === "entrada" ? "Agregar" : "Quitar";
  const unitOptions = entryUnitOptions(item.unit);
  const rawQty = Number(quantity) || 0;
  const qtyInItemUnit = convertQuantity(rawQty, entryUnit, item.unit);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawQty || rawQty <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    if (type === "salida" && qtyInItemUnit > item.quantity) {
      setError(`Solo quedan ${formatQuantity(item.quantity, item.unit)} — no podés quitar más de eso.`);
      return;
    }
    setSaving(true);
    setError(null);

    if (type === "salida") {
      // Descuenta primero del lote más próximo a caducar (FEFO), y deja
      // registrado en el historial exactamente de qué lote salió cada uno.
      const { data: lots, error: lotsError } = await supabase
        .from("item_lots")
        .select("*")
        .eq("item_id", item.id)
        .gt("quantity", 0);
      if (lotsError) {
        setSaving(false);
        setError(lotsError.message);
        return;
      }
      const allocation = allocateFefo((lots ?? []) as ItemLot[], qtyInItemUnit);
      const { error: insertError } = await supabase.from("movements").insert(
        allocation.map((a) => ({
          item_id: item.id,
          user_name: workerName,
          type: "salida",
          quantity: a.take,
          note: note.trim() || null,
          lot_id: a.lot.id || null,
          lote: a.lot.lote,
          caducidad: a.lot.caducidad,
          proveedor: a.lot.proveedor,
        }))
      );
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
      await Promise.all(
        allocation.map((a) =>
          supabase.rpc("adjust_lot_quantity", { p_lot_id: a.lot.id, p_delta: -roundQty(a.take) })
        )
      );
      await syncItemHeadlineLot(supabase, item.id);
    } else {
      const defaultLot = await getOrCreateDefaultLot(supabase, item.id);
      const { error: insertError } = await supabase.from("movements").insert({
        item_id: item.id,
        user_name: workerName,
        type: "entrada",
        quantity: qtyInItemUnit,
        note: note.trim() || null,
        lot_id: defaultLot.id,
        lote: null,
        caducidad: null,
        proveedor: null,
      });
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
      await supabase.rpc("adjust_lot_quantity", {
        p_lot_id: defaultLot.id,
        p_delta: roundQty(qtyInItemUnit),
      });
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-lg font-semibold mb-1">
          {label} — {item.name}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          Stock actual: {formatQuantity(item.quantity, item.unit)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cantidad</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(sanitizeDecimalInput(e.target.value))}
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-lg"
                placeholder="0"
              />
              {unitOptions.length > 1 ? (
                <select
                  value={entryUnit}
                  onChange={(e) => setEntryUnit(e.target.value as EntryUnit)}
                  className="rounded-md border border-neutral-300 px-2 text-lg"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="flex items-center px-2 text-neutral-500">
                  {UNIT_LABELS[item.unit]}
                </span>
              )}
            </div>
            {entryUnit !== item.unit && rawQty > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                = {formatQuantity(qtyInItemUnit, item.unit)}
              </p>
            )}
            {type === "salida" && qtyInItemUnit > item.quantity && rawQty > 0 && (
              <div className="mt-1">
                <p className="text-xs text-red-600">
                  Solo quedan {formatQuantity(item.quantity, item.unit)}.
                </p>
                {entryUnit === item.unit && unitOptions.length > 1 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                    ¿Quisiste decir {unitOptions.filter((u) => u !== item.unit).join(" o ")}? Cambia
                    la unidad junto al número — arriba dice &quot;{UNIT_LABELS[item.unit]}&quot;.
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="ej. lote #12, proyecto X"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-neutral-300 py-2 text-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 rounded-md py-2 text-white font-medium disabled:opacity-50 ${
                type === "entrada" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {saving ? "Guardando..." : label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
