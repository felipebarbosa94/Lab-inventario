"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { RecipeWithItems } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { openProductionOrder } from "@/lib/productionOrder";

export default function ProduceModal({
  recipe,
  workerName,
  onClose,
}: {
  recipe: RecipeWithItems;
  workerName: string;
  onClose: () => void;
}) {
  const batchMatch = recipe.batch_label.match(/^([\d.]+)\s*(.*)$/);
  const batchNumber = batchMatch ? Number(batchMatch[1]) : null;
  const batchUnitLabel = batchMatch ? batchMatch[2].trim() : null;
  const canScaleByTotal = batchNumber !== null && batchNumber > 0;

  const [batches, setBatches] = useState("1");
  const [total, setTotal] = useState(canScaleByTotal ? String(batchNumber) : "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const batchCount = Number(batches) || 0;

  function handleBatchesChange(value: string) {
    setBatches(value);
    if (canScaleByTotal) {
      const n = Number(value);
      setTotal(n > 0 ? String(Number((n * batchNumber!).toFixed(4))) : "");
    }
    setChecked(new Set());
  }

  function handleTotalChange(value: string) {
    setTotal(value);
    if (canScaleByTotal) {
      const n = Number(value);
      setBatches(n > 0 ? String(Number((n / batchNumber!).toFixed(4))) : "");
    }
    setChecked(new Set());
  }

  const rows = recipe.recipe_items.map((ri) => {
    const needed = ri.quantity_per_batch * batchCount;
    const available = ri.items?.quantity ?? 0;
    return {
      ...ri,
      needed,
      available,
      short: needed > available,
    };
  });

  const anyShortage = rows.some((r) => r.short);
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.id));

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGenerateOrder() {
    if (batchCount <= 0) {
      setError("Ingresá cuántos lotes vas a producir");
      return;
    }
    setError(null);
    openProductionOrder(
      recipe,
      batchCount,
      rows.map((r) => ({
        name: r.items?.name ?? "Ítem eliminado",
        needed: r.needed,
        unit: r.items ? UNIT_LABELS[r.items.unit] : "",
        short: r.short,
        available: r.available,
      })),
      workerName
    );
  }

  async function handleConfirm() {
    if (batchCount <= 0) {
      setError("Ingresá cuántos lotes vas a producir");
      return;
    }
    if (anyShortage) {
      setError("No alcanza el stock de uno o más ingredientes — no se puede confirmar.");
      return;
    }
    setSaving(true);
    setError(null);

    const noteText = `Producción: ${recipe.name} × ${batchCount} (${recipe.batch_label})${
      note.trim() ? " — " + note.trim() : ""
    }`;

    const { error: insertError } = await supabase.from("movements").insert(
      rows.map((r) => ({
        item_id: r.item_id,
        user_name: workerName,
        type: "salida",
        quantity: r.needed,
        note: noteText,
        lote: r.items?.lote ?? null,
        caducidad: r.items?.caducidad ?? null,
      }))
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">Producir — {recipe.name}</h3>
        {recipe.project && <p className="text-sm text-neutral-500 mb-4">{recipe.project}</p>}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              ¿Cuántos lotes de {recipe.batch_label}?
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={batches}
              onChange={(e) => handleBatchesChange(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-lg"
              autoFocus
            />
          </div>
          {canScaleByTotal && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                O cuánto total ({batchUnitLabel || "unidades"})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={total}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-lg"
              />
            </div>
          )}
        </div>
        {canScaleByTotal && (
          <p className="text-xs text-neutral-400 -mt-3 mb-4">
            Cambia cualquiera de los dos — el otro se ajusta solo.
          </p>
        )}

        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            Ve tachando cada ingrediente conforme lo agregues:
          </p>
          {!anyShortage && (
            <p className="text-xs text-neutral-400 mb-2">
              {checked.size}/{rows.length} marcados
            </p>
          )}
          <div className="space-y-1.5">
            {rows.map((r) => {
              const isChecked = checked.has(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex justify-between items-center text-sm rounded-md px-3 py-3 cursor-pointer select-none ${
                    r.short
                      ? "bg-red-50 text-red-700"
                      : isChecked
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={r.short}
                      onChange={() => toggleChecked(r.id)}
                      className="w-5 h-5 shrink-0"
                    />
                    <span className={isChecked ? "line-through decoration-emerald-400" : ""}>
                      {r.items?.name ?? "Ítem eliminado"}
                    </span>
                  </span>
                  <span className="font-medium shrink-0 ml-2">
                    {r.needed.toLocaleString("es-MX")} {r.items ? UNIT_LABELS[r.items.unit] : ""}
                    {r.short && (
                      <span className="ml-2 text-xs">
                        (solo hay {r.available.toLocaleString("es-MX")})
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {recipe.steps && (
          <div className="mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-1">Pasos:</p>
            <pre className="text-sm text-neutral-600 whitespace-pre-wrap font-sans bg-neutral-50 rounded-md p-3">
              {recipe.steps}
            </pre>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Nota (ej. número de orden/pedido)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="opcional"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {!anyShortage && !allChecked && rows.length > 0 && (
          <p className="text-xs text-amber-600 mb-2">
            Marca todos los ingredientes antes de confirmar.
          </p>
        )}
        <button
          onClick={handleGenerateOrder}
          disabled={batchCount <= 0}
          className="w-full mb-2 rounded-md border border-neutral-300 py-2 text-neutral-700 text-sm font-medium disabled:opacity-40"
        >
          Generar orden de producción (imprimir)
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-neutral-300 py-2 text-neutral-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || anyShortage || batchCount <= 0 || !allChecked}
            className="flex-1 rounded-md py-2 text-white font-medium bg-red-600 disabled:opacity-40"
          >
            {saving ? "Descontando..." : "Confirmar y descontar todo"}
          </button>
        </div>
      </div>
    </div>
  );
}
