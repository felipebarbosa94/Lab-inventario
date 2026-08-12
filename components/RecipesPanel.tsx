"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, RecipeWithItems } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import RecipeFormModal from "./RecipeFormModal";
import ProduceModal from "./ProduceModal";

export default function RecipesPanel({
  items,
  workerName,
  onClose,
}: {
  items: Item[];
  workerName: string;
  onClose: () => void;
}) {
  const [recipes, setRecipes] = useState<RecipeWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState<RecipeWithItems | null>(null);
  const [produceRecipe, setProduceRecipe] = useState<RecipeWithItems | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*, recipe_items(*, items(name, unit, quantity, lote, caducidad))")
      .order("name");
    setRecipes((data as RecipeWithItems[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    supabase
      .from("recipes")
      .select("*, recipe_items(*, items(name, unit, quantity, lote, caducidad))")
      .order("name")
      .then(({ data }) => {
        setRecipes((data as RecipeWithItems[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    await supabase.from("recipes").delete().eq("id", id);
    setConfirmDeleteId(null);
    reload();
  }

  const projects = Array.from(
    new Set(recipes.map((r) => r.project).filter((p): p is string => Boolean(p)))
  ).sort();

  const filteredRecipes = recipes.filter((r) => {
    if (projectFilter && r.project !== projectFilter) return false;
    if (search.trim()) {
      const haystack = [r.name, r.project].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Recetas</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm font-medium"
            >
              + Nueva receta
            </button>
            <button onClick={onClose} className="text-neutral-400 text-sm px-2">
              Cerrar
            </button>
          </div>
        </div>

        {recipes.length > 0 && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o proyecto..."
              className="w-full rounded-md border border-neutral-300 px-3 py-2 mb-2 text-sm"
            />
            {projects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setProjectFilter(null)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    !projectFilter
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}
                >
                  Todos
                </button>
                {projects.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProjectFilter(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border ${
                      projectFilter === p
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {loading && <p className="text-sm text-neutral-400">Cargando...</p>}
          {!loading && recipes.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Todavía no hay recetas. Usá &quot;+ Nueva receta&quot; para crear la primera.
            </p>
          )}
          {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              No encontré ninguna receta que coincida.
            </p>
          )}
          <div className="space-y-3">
            {filteredRecipes.map((r) => (
              <div key={r.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{r.name}</p>
                    <p className="text-xs text-neutral-500">
                      {[r.project, `1 lote = ${r.batch_label}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm shrink-0">
                    <button
                      onClick={() => setEditRecipe(r)}
                      className="text-neutral-500 hover:text-neutral-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="text-neutral-500 hover:text-red-600"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
                <ul className="text-xs text-neutral-500 mt-2 space-y-0.5">
                  {r.recipe_items.map((ri) => (
                    <li key={ri.id}>
                      {ri.quantity_per_batch} {ri.items ? UNIT_LABELS[ri.items.unit] : ""} de{" "}
                      {ri.items?.name ?? "ítem eliminado"}
                    </li>
                  ))}
                </ul>
                {confirmDeleteId === r.id ? (
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-neutral-600 flex-1">¿Borrar esta receta?</span>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-neutral-500"
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md"
                    >
                      Sí, borrar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setProduceRecipe(r)}
                    className="w-full mt-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 text-sm font-medium"
                  >
                    Producir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <RecipeFormModal
          items={items}
          onClose={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}
      {editRecipe && (
        <RecipeFormModal
          items={items}
          recipe={editRecipe}
          onClose={() => {
            setEditRecipe(null);
            reload();
          }}
        />
      )}
      {produceRecipe && (
        <ProduceModal
          recipe={produceRecipe}
          workerName={workerName}
          onClose={() => {
            setProduceRecipe(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
