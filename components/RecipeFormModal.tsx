"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, RecipeWithItems } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { PRODUCT_TYPES, PRODUCT_TYPE_OPTIONS, BATCH_UNIT_LABELS, unitsForType } from "@/lib/productTypes";
import { useProjectSuggestions } from "@/lib/useProjectSuggestions";
import { convertQuantity, entryUnitOptions, EntryUnit } from "@/lib/units";

interface Row {
  item_id: string;
  quantity_per_batch: string;
  entryUnit: EntryUnit | null;
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
  const [productType, setProductType] = useState(recipe?.product_type ?? "polvo");
  const [batchQuantity, setBatchQuantity] = useState(
    recipe?.batch_quantity != null ? String(recipe.batch_quantity) : "1"
  );
  const [batchUnit, setBatchUnit] = useState(
    recipe?.batch_unit ?? unitsForType(recipe?.product_type ?? "polvo")[0]
  );
  const [steps, setSteps] = useState(recipe?.steps ?? "");
  const [rows, setRows] = useState<Row[]>(
    recipe?.recipe_items.map((ri) => ({
      item_id: ri.item_id,
      quantity_per_batch: String(ri.quantity_per_batch),
      entryUnit: null,
    })) ?? [{ item_id: "", quantity_per_batch: "", entryUnit: null }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const allowedUnits = unitsForType(productType);
  const projectSuggestions = useProjectSuggestions();

  function handleProductTypeChange(value: string) {
    setProductType(value);
    const units = unitsForType(value);
    if (!units.includes(batchUnit)) setBatchUnit(units[0]);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function selectRowItem(index: number, itemId: string) {
    const item = items.find((it) => it.id === itemId);
    updateRow(index, { item_id: itemId, entryUnit: item ? item.unit : null });
  }

  function addRow() {
    setRows((prev) => [...prev, { item_id: "", quantity_per_batch: "", entryUnit: null }]);
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

    const batchLabel = `${batchQuantity} ${BATCH_UNIT_LABELS[batchUnit] ?? batchUnit}`;

    function resolvedQuantity(r: Row): number {
      const item = items.find((it) => it.id === r.item_id);
      if (!item) return Number(r.quantity_per_batch);
      return convertQuantity(Number(r.quantity_per_batch), r.entryUnit ?? item.unit, item.unit);
    }

    if (recipe) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update({
          name: name.trim(),
          project: project.trim() || null,
          product_type: productType,
          batch_quantity: Number(batchQuantity),
          batch_unit: batchUnit,
          batch_label: batchLabel,
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
          quantity_per_batch: resolvedQuantity(r),
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
          product_type: productType,
          batch_quantity: Number(batchQuantity),
          batch_unit: batchUnit,
          batch_label: batchLabel,
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
          quantity_per_batch: resolvedQuantity(r),
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Tipo de producto
              </label>
              <select
                value={productType}
                onChange={(e) => handleProductTypeChange(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                {PRODUCT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPES[t].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              ¿Qué es &quot;1 lote&quot;?
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(e.target.value)}
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
              />
              <select
                value={batchUnit}
                onChange={(e) => setBatchUnit(e.target.value)}
                className="w-32 rounded-md border border-neutral-300 px-3 py-2"
              >
                {allowedUnits.map((u) => (
                  <option key={u} value={u}>
                    {BATCH_UNIT_LABELS[u] ?? u}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Solo puedes elegir unidades que tienen sentido para &quot;
              {PRODUCT_TYPES[productType as keyof typeof PRODUCT_TYPES]?.label ?? productType}
              &quot; — así evitamos poner litros a algo que se mide en kg, por ejemplo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Ingredientes / insumos por lote
            </label>
            <div className="space-y-2">
              {rows.map((row, i) => {
                const selected = items.find((it) => it.id === row.item_id);
                const unitOptions = selected ? entryUnitOptions(selected.unit) : [];
                const rawQty = Number(row.quantity_per_batch) || 0;
                const entryUnit = row.entryUnit ?? selected?.unit ?? null;
                const convertedQty =
                  selected && entryUnit ? convertQuantity(rawQty, entryUnit, selected.unit) : rawQty;
                return (
                  <div key={i}>
                    <div className="flex gap-2 items-center">
                      <select
                        value={row.item_id}
                        onChange={(e) => selectRowItem(i, e.target.value)}
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
                        className="w-20 rounded-md border border-neutral-300 px-2 py-2 text-sm"
                        placeholder="0"
                      />
                      {unitOptions.length > 1 ? (
                        <select
                          value={entryUnit ?? selected!.unit}
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
                    {selected && entryUnit && entryUnit !== selected.unit && rawQty > 0 && (
                      <p className="text-xs text-neutral-400 mt-0.5 ml-1">
                        = {convertedQty.toLocaleString("es-MX", { maximumFractionDigits: 6 })}{" "}
                        {UNIT_LABELS[selected.unit]} por lote
                      </p>
                    )}
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
