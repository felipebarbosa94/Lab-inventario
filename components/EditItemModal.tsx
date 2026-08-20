"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, UNIT_LABELS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { Item, Unit } from "@/lib/types";
import { useProjectSuggestions } from "@/lib/useProjectSuggestions";
import { convertQuantity } from "@/lib/units";

export default function EditItemModal({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
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
  const [lote, setLote] = useState(item.lote ?? "");
  const [caducidad, setCaducidad] = useState(item.caducidad ?? "");
  const [proveedor, setProveedor] = useState(item.proveedor ?? "");
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
    const { error: updateError } = await supabase
      .from("items")
      .update({
        name: name.trim(),
        category,
        project: project.trim() || null,
        flavor: flavor.trim() || null,
        unit,
        quantity: Number(quantity) || 0,
        low_stock_threshold: threshold ? Number(threshold) : null,
        lote: lote.trim() || null,
        caducidad: caducidad || null,
        proveedor: proveedor.trim() || null,
      })
      .eq("id", item.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
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
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              />
              <p className="text-xs text-neutral-400 mt-1">en {UNIT_LABELS[unit]}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Alerta si ≤
              </label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="opcional"
              />
            </div>
          </div>
          {category === "materia_prima" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Número de lote
                </label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Caducidad
                </label>
                <input
                  type="date"
                  value={caducidad}
                  onChange={(e) => setCaducidad(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2"
                  placeholder="opcional"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-neutral-400">
            Corregir la cantidad aquí no queda registrado en el historial de movimientos — es un
            ajuste directo, no un uso.
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
