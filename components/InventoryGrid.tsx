"use client";

import { useState } from "react";
import { Item } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";

export default function InventoryGrid({
  items,
  onQuitar,
  onAgregar,
  onEditar,
  onHistorial,
}: {
  items: Item[];
  onQuitar: (item: Item) => void;
  onAgregar: (item: Item) => void;
  onEditar: (item: Item) => void;
  onHistorial: (item: Item) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? items.filter((item) => {
        const haystack = [item.name, item.project, item.flavor]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
      })
    : items;

  const grouped = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      {items.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, proyecto o sabor..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 mb-4 text-sm"
        />
      )}

      {items.length === 0 && (
        <p className="text-neutral-500 text-sm py-8 text-center">
          Todavía no hay ítems cargados. Usá &quot;+ Nuevo ítem&quot; para empezar.
        </p>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <p className="text-neutral-500 text-sm py-8 text-center">
          No encontré ningún ítem que coincida con &quot;{search}&quot;.
        </p>
      )}

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[cat].map((item) => {
                const low =
                  item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-4 py-3 shadow-sm bg-white ${
                      low ? "border-red-300" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      <button
                        onClick={() => onEditar(item)}
                        className="text-neutral-400 hover:text-neutral-700 text-xs shrink-0"
                        title="Editar ítem"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {[item.project, item.flavor && `sabor ${item.flavor}`]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <button
                      onClick={() => onHistorial(item)}
                      className={`text-2xl font-bold mt-2 block text-left hover:underline ${
                        low ? "text-red-600" : "text-neutral-900"
                      }`}
                      title="Ver historial"
                    >
                      {item.quantity} {UNIT_LABELS[item.unit]}
                    </button>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onQuitar(item)}
                        className="flex-1 rounded-md bg-red-50 text-red-700 border border-red-200 py-1.5 text-sm font-medium"
                      >
                        Quitar
                      </button>
                      <button
                        onClick={() => onAgregar(item)}
                        className="flex-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 text-sm font-medium"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
