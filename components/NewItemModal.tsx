"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { Unit } from "@/lib/types";
import { useProjectSuggestions } from "@/lib/useProjectSuggestions";
import { sanitizeDecimalInput } from "@/lib/parseDecimal";

export default function NewItemModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [project, setProject] = useState("");
  const projectSuggestions = useProjectSuggestions();
  const [flavor, setFlavor] = useState("");
  const [unit, setUnit] = useState<Unit>("unidad");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [lote, setLote] = useState("");
  const [caducidad, setCaducidad] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponele un nombre al ítem");
      return;
    }
    setSaving(true);
    setError(null);
    const initialQuantity = Number(quantity) || 0;
    const loteTrimmed = lote.trim() || null;
    const proveedorTrimmed = proveedor.trim() || null;
    const { data: newItem, error: insertError } = await supabase
      .from("items")
      .insert({
        name: name.trim(),
        category,
        project: project.trim() || null,
        flavor: flavor.trim() || null,
        unit,
        quantity: initialQuantity,
        low_stock_threshold: threshold ? Number(threshold) : null,
        lote: loteTrimmed,
        caducidad: caducidad || null,
        proveedor: proveedorTrimmed,
      })
      .select()
      .single();
    if (insertError || !newItem) {
      setSaving(false);
      setError(insertError?.message ?? "No se pudo crear el ítem");
      return;
    }
    if (initialQuantity > 0 || loteTrimmed || caducidad) {
      await supabase.from("item_lots").insert({
        item_id: newItem.id,
        lote: loteTrimmed,
        caducidad: caducidad || null,
        proveedor: proveedorTrimmed,
        quantity: initialQuantity,
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Nuevo ítem de inventario</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="ej. Frasco capsulero ámbar"
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
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="unidad">unidad</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Stock inicial
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(sanitizeDecimalInput(e.target.value))}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="0"
              />
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
              {saving ? "Guardando..." : "Crear ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
