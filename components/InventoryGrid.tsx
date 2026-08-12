"use client";

import { useState } from "react";
import { Item } from "@/lib/types";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/categories";

function ItemCard({
  item,
  simple,
  onQuitar,
  onAgregar,
  onEditar,
  onHistorial,
}: {
  item: Item;
  simple?: boolean;
  onQuitar: (item: Item) => void;
  onAgregar: (item: Item) => void;
  onEditar: (item: Item) => void;
  onHistorial: (item: Item) => void;
}) {
  const low = item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold;

  const [now] = useState(() => Date.now());
  const daysToExpire = item.caducidad
    ? Math.ceil((new Date(item.caducidad).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const expired = daysToExpire !== null && daysToExpire < 0;
  const expiringSoon = daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 30;

  return (
    <div
      className={`rounded-lg border shadow-sm bg-white ${simple ? "px-4 py-4" : "px-4 py-3"} ${
        low || expired ? "border-red-300" : expiringSoon ? "border-amber-300" : "border-neutral-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-medium text-neutral-900 ${simple ? "text-lg" : ""}`}>{item.name}</p>
        {!simple && (
          <button
            onClick={() => onEditar(item)}
            className="text-neutral-400 hover:text-neutral-700 text-xs shrink-0"
            title="Editar ítem"
          >
            Editar
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {[item.project, item.flavor && `sabor ${item.flavor}`].filter(Boolean).join(" · ") || "—"}
      </p>
      {(item.lote || item.caducidad || item.proveedor) && (
        <p className="text-xs text-neutral-400 mt-0.5">
          {[
            item.lote && `lote ${item.lote}`,
            item.proveedor,
            item.caducidad &&
              `cad. ${new Date(item.caducidad).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          {expired && <span className="text-red-600 font-medium"> — caducado</span>}
          {!expired && expiringSoon && (
            <span className="text-amber-600 font-medium"> — caduca pronto</span>
          )}
        </p>
      )}
      <button
        onClick={() => onHistorial(item)}
        className={`font-bold mt-2 block text-left hover:underline ${
          simple ? "text-3xl" : "text-2xl"
        } ${low ? "text-red-600" : "text-neutral-900"}`}
        title="Ver historial"
      >
        {item.quantity} {UNIT_LABELS[item.unit]}
      </button>
      <div className={`flex gap-2 mt-3 ${simple ? "gap-3" : ""}`}>
        <button
          onClick={() => onQuitar(item)}
          className={`flex-1 rounded-md bg-red-50 text-red-700 border border-red-200 font-medium ${
            simple ? "py-3 text-base" : "py-1.5 text-sm"
          }`}
        >
          Quitar
        </button>
        <button
          onClick={() => onAgregar(item)}
          className={`flex-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium ${
            simple ? "py-3 text-base" : "py-1.5 text-sm"
          }`}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

export default function InventoryGrid({
  items,
  mostUsedIds,
  simpleMode,
  onQuitar,
  onAgregar,
  onEditar,
  onHistorial,
}: {
  items: Item[];
  mostUsedIds?: string[];
  simpleMode?: boolean;
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

  const itemById = new Map(items.map((item) => [item.id, item]));
  const mostUsed = !search.trim()
    ? (mostUsedIds ?? [])
        .map((id) => itemById.get(id))
        .filter((item): item is Item => Boolean(item))
        .slice(0, 6)
    : [];

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

      {mostUsed.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">
            ⭐ Más usados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mostUsed.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                simple={simpleMode}
                onQuitar={onQuitar}
                onAgregar={onAgregar}
                onEditar={onEditar}
                onHistorial={onHistorial}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[cat].map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onQuitar={onQuitar}
                  onAgregar={onAgregar}
                  onEditar={onEditar}
                  onHistorial={onHistorial}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
