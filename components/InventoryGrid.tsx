"use client";

import { Item } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";

export default function InventoryGrid({
  items,
  onQuitar,
  onAgregar,
}: {
  items: Item[];
  onQuitar: (item: Item) => void;
  onAgregar: (item: Item) => void;
}) {
  const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  if (items.length === 0) {
    return (
      <p className="text-neutral-500 text-sm py-8 text-center">
        Todavía no hay ítems cargados. Usá &quot;+ Nuevo ítem&quot; para empezar.
      </p>
    );
  }

  return (
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
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  <p className="text-xs text-neutral-500">
                    {[item.project, item.flavor && `sabor ${item.flavor}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <p
                    className={`text-2xl font-bold mt-2 ${
                      low ? "text-red-600" : "text-neutral-900"
                    }`}
                  >
                    {item.quantity} {UNIT_LABELS[item.unit]}
                  </p>
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
  );
}
