"use client";

import { useState } from "react";
import { Item, MovementType } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
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
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = type === "entrada" ? "Agregar" : "Quitar";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("movements").insert({
      item_id: item.id,
      user_name: workerName,
      type,
      quantity: qty,
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Cantidad ({UNIT_LABELS[item.unit]})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-lg"
              placeholder="0"
            />
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
