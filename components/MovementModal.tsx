"use client";

import { useState } from "react";
import { Item, MovementType } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { convertQuantity, entryUnitOptions, EntryUnit } from "@/lib/units";
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
      setError(
        `Solo quedan ${item.quantity} ${UNIT_LABELS[item.unit]} — no podés quitar más de eso.`
      );
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("movements").insert({
      item_id: item.id,
      user_name: workerName,
      type,
      quantity: qtyInItemUnit,
      note: note.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-lg font-semibold mb-1">
          {label} — {item.name}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          Stock actual: {item.quantity} {UNIT_LABELS[item.unit]}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cantidad</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
                = {qtyInItemUnit.toLocaleString("es-MX", { maximumFractionDigits: 6 })}{" "}
                {UNIT_LABELS[item.unit]}
              </p>
            )}
            {type === "salida" && qtyInItemUnit > item.quantity && rawQty > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Solo quedan {item.quantity} {UNIT_LABELS[item.unit]}.
              </p>
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
