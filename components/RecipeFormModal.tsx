"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, RecipeWithItems } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";

interface Row {
  item_id: string;
  quantity_per_batch: string;
}

export default function RecipeFormModal({
  items,
  recipe,
  onClose,
  onCreated,
}: {
  items: Item[];
  recipe?: RecipeWithItems;
  onClose: () => void;
  onCreated?: (recipeId: string) => void;
}) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [project, setProject] = useState(recipe?.project ?? "");
  const [batchLabel, setBatchLabel] = useState(recipe?.batch_label ?? "1 kg");
  const [steps, setSteps] = useState(recipe?.steps ?? "");
  const [rows, setRows] = useState<Row[]>(
    recipe?.recipe_items.map((ri) => ({
      item_id: ri.item_id,
      quantity_per_batch: String(ri.quantity_per_batch),
    })) ?? [{ item_id: "", quantity_per_batch: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { item_id: "", quantity_per_batch: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponele un nombre a la receta");
      return;
    }
    const validRows = rows.filter((r) => r.item_id && Number(r.quantity_per_batch) > 0);
    if (validRows.length === 0) {
      setError("Agregá al menos un ingrediente con cantidad");
      return;
    }
    setSaving(true);
    setError(null);

    if (recipe) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update({
          name: name.trim(),
          project: project.trim() || null,
          batch_label: batchLabel.trim() || "unidad",
          steps: steps.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id);
      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }
      await supabase.from("recipe_items").delete().eq("recipe_id", recipe.id);
      const { error: itemsError } = await supabase.from("recipe_items").insert(
        validRows.map((r) => ({
          recipe_id: recipe.id,
          item_id: r.item_id,
          quantity_per_batch: Number(r.quantity_per_batch),
        }))
      );
      setSaving(false);
      if (itemsError) {
        setError(itemsError.message);
        return;
      }
      onClose();
    } else {
      const { data: newRecipe, error: insertError } = await supabase
        .from("recipes")
        .insert({
          name: name.trim(),
          project: project.trim() || null,
          batch_label: batchLabel.trim() || "unidad",
          steps: steps.trim() || null,
        })
        .select()
        .single();
      if (insertError || !newRecipe) {
        setSaving(false);
        setError(insertError?.message ?? "No se pudo crear la receta");
        return;
      }
      const { error: itemsError } = await supabase.from("recipe_items").insert(
        validRows.map((r) => ({
          recipe_id: newRecipe.id,
          item_id: r.item_id,
          quantity_per_batch: Number(r.quantity_per_batch),
        }))
      );
      setSaving(false);
      if (itemsError) {
        setError(itemsError.message);
        return;
      }
      if (onCreated) {
        onCreated(newRecipe.id);
      } else {
        onClose();
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          {recipe ? "Editar receta" : onCreated ? "Nuevo proyecto" : "Nueva receta"}
        </h3>
        {!recipe && onCreated && (
          <p className="text-sm text-neutral-500 -mt-3 mb-4">
            Decinos qué necesitas y en cuanto guardes te mostramos el desglose exacto de
            materiales.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre de la receta
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="ej. Proteína Fresa 1kg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Proyecto/marca
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="Rafas, Daniela..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                ¿Qué es &quot;1 lote&quot;?
              </label>
              <input
                type="text"
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                placeholder="ej. 1 kg, 1 frasco"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Ingredientes / insumos por lote
            </label>
            <div className="space-y-2">
              {rows.map((row, i) => {
                const selected = items.find((it) => it.id === row.item_id);
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={row.item_id}
                      onChange={(e) => updateRow(i, { item_id: e.target.value })}
                      className="flex-1 rounded-md border border-neutral-300 px-2 py-2 text-sm"
                    >
                      <option value="">Elegí un ítem...</option>
                      {sortedItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                          {it.project ? ` (${it.project})` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity_per_batch}
                      onChange={(e) => updateRow(i, { quantity_per_batch: e.target.value })}
                      className="w-24 rounded-md border border-neutral-300 px-2 py-2 text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-neutral-400 w-8">
                      {selected ? UNIT_LABELS[selected.unit] : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-neutral-400 hover:text-red-600 text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="text-sm text-neutral-600 underline mt-2"
            >
              + Agregar ingrediente
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Pasos de producción (opcional)
            </label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder={
                "ej.\nRevolver 5 minutos\nAgregar con scoop de 75 cc\nCerrar, sellar y limpiar el empaque"
              }
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
              className="flex-1 rounded-md py-2 text-white font-medium bg-neutral-900 disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : onCreated
                ? "Ver desglose"
                : "Guardar receta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
