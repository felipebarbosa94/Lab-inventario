"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, UNIT_LABELS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { Item, Unit } from "@/lib/types";
import { useProjectSuggestions } from "@/lib/useProjectSuggestions";
import { convertQuantity, roundQty } from "@/lib/units";
import { getOrCreateDefaultLot, syncItemHeadlineLot } from "@/lib/lots";
import { sanitizeDecimalInput } from "@/lib/parseDecimal";

export default function EditItemModal({
  item,
  onClose,
  onOpenReceive,
  onOpenLotes,
}: {
  item: Item;
  onClose: () => void;
  onOpenReceive?: () => void;
  onOpenLotes?: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [project, setProject] = useState(item.project ?? "");
  const projectSuggestions = useProjectSuggestions();
  const [flavor, setFlavor] = useState(item.flavor ?? "");
  const [unit, setUnit] = useState<Unit>(item.unit);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [threshold, setThreshold] = useState(
    item.low_stock_threshold !== null ? String(item.low_stock_threshold) : ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleUnitChange(newUnit: Unit) {
    setQuantity(String(convertQuantity(Number(quantity) || 0, unit, newUnit)));
    setUnit(newUnit);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponele un nombre al ítem");
      return;
    }
    setSaving(true);
    setError(null);

    const finalQuantity = Number(quantity) || 0;

    const { error: updateError } = await supabase
      .from("items")
      .update({
        name: name.trim(),
        category,
        project: project.trim() || null,
        flavor: flavor.trim() || null,
        unit,
        quantity: finalQuantity,
        low_stock_threshold: threshold ? Number(threshold) : null,
      })
      .eq("id", item.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Si cambió la unidad, los lotes existentes se recalculan a la nueva
    // unidad para que sigan representando la misma cantidad física.
    if (unit !== item.unit) {
      const { data: lots } = await supabase
        .from("item_lots")
        .select("id, quantity")
        .eq("item_id", item.id);
      await Promise.all(
        (lots ?? []).map((l) =>
          supabase
            .from("item_lots")
            .update({ quantity: roundQty(convertQuantity(l.quantity, item.unit, unit)) })
            .eq("id", l.id)
        )
      );
    }

    // Si la cantidad final no coincide con la suma de lotes (corrección
    // manual de stock), la diferencia se guarda en el lote "sin datos" del
    // ítem — así ningún gramo se pierde ni queda sin explicación.
    const { data: refreshedLots } = await supabase
      .from("item_lots")
      .select("quantity")
      .eq("item_id", item.id);
    const lotsTotal = (refreshedLots ?? []).reduce((sum, l) => sum + l.quantity, 0);
    const delta = Number((finalQuantity - lotsTotal).toFixed(6));
    if (Math.abs(delta) > 1e-9) {
      const defaultLot = await getOrCreateDefaultLot(supabase, item.id);
      await supabase
        .from("item_lots")
        .update({ quantity: roundQty(Math.max(0, defaultLot.quantity + delta)) })
        .eq("id", defaultLot.id);
    }

    await syncItemHeadlineLot(supabase, item.id);

    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.from("items").delete().eq("id", item.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Editar ítem</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Proyecto/marca
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">Sin proyecto/marca</option>
                {project && !projectSuggestions.includes(project) && (
                  <option value={project}>{project} (no está en la lista)</option>
                )}
                {projectSuggestions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Sabor</label>
              <input
                type="text"
                value={flavor}
                onChange={(e) => setFlavor(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="chocolate..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Unidad</label>
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as Unit)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="unidad">unidad</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Corregir cantidad
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(sanitizeDecimalInput(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
              <p className="text-xs text-neutral-400 mt-1">en {UNIT_LABELS[unit]}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Alerta si ≤
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={threshold}
                onChange={(e) => setThreshold(sanitizeDecimalInput(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="opcional"
              />
            </div>
          </div>
          {category === "materia_prima" && (
            <div className="bg-neutral-50 rounded-md p-2 space-y-2">
              <p className="text-xs text-neutral-500">
                Los lotes, fechas de caducidad y proveedor se manejan por separado, para que un
                ítem pueda tener varios lotes a la vez sin que uno borre al otro.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onOpenReceive}
                  disabled={!onOpenReceive}
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40"
                >
                  + Agregar lote nuevo
                </button>
                <button
                  type="button"
                  onClick={onOpenLotes}
                  disabled={!onOpenLotes}
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-40"
                >
                  Ver lotes que ya tiene
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-400">
            Este número sí queda guardado y sí se descuenta normalmente cuando lo uses (Quitar,
            producción de recetas, etc). Lo único distinto es que, al ser una corrección puntual
            de conteo, no aparece como una línea en el historial de movimientos.
          </p>
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
              className="flex-1 rounded-md py-2 text-white font-medium bg-neutral-900 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
        <div className="mt-4 pt-4 border-t border-neutral-100">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 hover:underline"
            >
              Borrar este ítem
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-neutral-600 flex-1">
                ¿Seguro? Se borra también su historial.
              </p>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-neutral-500 px-2 py-1"
              >
                No
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-white bg-red-600 rounded-md px-3 py-1 disabled:opacity-50"
              >
                {deleting ? "Borrando..." : "Sí, borrar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
