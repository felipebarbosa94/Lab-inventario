"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { convertQuantity, entryUnitOptions, EntryUnit } from "@/lib/units";

interface Row {
  item_id: string;
  quantity: string;
  entryUnit: EntryUnit | null;
  lote: string;
  caducidad: string;
}

export default function ReceiveShipmentModal({
  items,
  workerName,
  onClose,
}: {
  items: Item[];
  workerName: string;
  onClose: () => void;
}) {
  const materiaPrima = items
    .filter((i) => i.category === "materia_prima")
    .sort((a, b) => a.name.localeCompare(b.name));

  const [proveedor, setProveedor] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { item_id: "", quantity: "", entryUnit: null, lote: "", caducidad: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function selectItem(index: number, itemId: string) {
    const item = materiaPrima.find((it) => it.id === itemId);
    updateRow(index, { item_id: itemId, entryUnit: item ? item.unit : null });
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { item_id: "", quantity: "", entryUnit: null, lote: "", caducidad: "" },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter((r) => r.item_id && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Agregá al menos un ítem con cantidad");
      return;
    }
    setSaving(true);
    setError(null);

    const proveedorTrimmed = proveedor.trim() || null;

    const { error: insertError } = await supabase.from("movements").insert(
      validRows.map((r) => {
        const item = materiaPrima.find((it) => it.id === r.item_id);
        const qty = item
          ? convertQuantity(Number(r.quantity), r.entryUnit ?? item.unit, item.unit)
          : Number(r.quantity);
        return {
          item_id: r.item_id,
          user_name: workerName,
          type: "entrada",
          quantity: qty,
          note: "Recepción de mercancía",
          lote: r.lote.trim() || null,
          caducidad: r.caducidad || null,
          proveedor: proveedorTrimmed,
        };
      })
    );
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    await Promise.all(
      validRows.map((r) =>
        supabase
          .from("items")
          .update({
            lote: r.lote.trim() || null,
            caducidad: r.caducidad || null,
            proveedor: proveedorTrimmed,
          })
          .eq("id", r.item_id)
      )
    );

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">Recibir mercancía</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Captura todo lo que llegó de un pedido en una sola pasada.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Proveedor</label>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="ej. Droguería XYZ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Materia prima recibida
            </label>
            <div className="space-y-2">
              {rows.map((row, i) => {
                const selected = materiaPrima.find((it) => it.id === row.item_id);
                const unitOptions = selected ? entryUnitOptions(selected.unit) : [];
                const rawQty = Number(row.quantity) || 0;
                const convertedQty =
                  selected && row.entryUnit
                    ? convertQuantity(rawQty, row.entryUnit, selected.unit)
                    : rawQty;
                return (
                  <div key={i} className="border border-neutral-200 rounded-lg p-2 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        value={row.item_id}
                        onChange={(e) => selectItem(i, e.target.value)}
                        className="flex-1 rounded-md border border-neutral-300 px-2 py-2 text-sm"
                      >
                        <option value="">Elegí un ítem...</option>
                        {materiaPrima.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.quantity}
                        onChange={(e) => updateRow(i, { quantity: e.target.value })}
                        className="w-20 rounded-md border border-neutral-300 px-2 py-2 text-sm"
                        placeholder="0"
                      />
                      {unitOptions.length > 1 ? (
                        <select
                          value={row.entryUnit ?? selected!.unit}
                          onChange={(e) => updateRow(i, { entryUnit: e.target.value as EntryUnit })}
                          className="w-16 rounded-md border border-neutral-300 px-1 py-2 text-sm"
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {UNIT_LABELS[u]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-neutral-400 w-8">
                          {selected ? UNIT_LABELS[selected.unit] : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-neutral-400 hover:text-red-600 text-sm px-1"
                      >
                        ✕
                      </button>
                    </div>
                    {selected && row.entryUnit && row.entryUnit !== selected.unit && rawQty > 0 && (
                      <p className="text-xs text-neutral-400 -mt-1">
                        = {convertedQty.toLocaleString("es-MX", { maximumFractionDigits: 6 })}{" "}
                        {UNIT_LABELS[selected.unit]}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={row.lote}
                        onChange={(e) => updateRow(i, { lote: e.target.value })}
                        className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="Número de lote"
                      />
                      <input
                        type="date"
                        value={row.caducidad}
                        onChange={(e) => updateRow(i, { caducidad: e.target.value })}
                        className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addRow} className="text-sm text-neutral-600 underline mt-2">
              + Agregar otro ítem
            </button>
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
              className="flex-1 rounded-md py-2 text-white font-medium bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Registrar recepción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
