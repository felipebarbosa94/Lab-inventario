"use client";

import { useState } from "react";
import { Item } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { exportExpiryReport } from "@/lib/expiryReport";

export default function ExpiryPanel({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [now] = useState(() => Date.now());

  const rows = items
    .filter((i): i is Item & { caducidad: string } => Boolean(i.caducidad))
    .sort((a, b) => new Date(a.caducidad!).getTime() - new Date(b.caducidad!).getTime());

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Vencimientos</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-neutral-500">Ordenado por fecha más próxima primero.</p>
          <button
            onClick={() =>
              exportExpiryReport(
                rows.map((r) => ({
                  name: r.name,
                  lote: r.lote,
                  caducidad: r.caducidad!,
                  quantity: r.quantity,
                  unit: UNIT_LABELS[r.unit],
                }))
              )
            }
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 text-xs font-medium shrink-0"
          >
            Descargar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {rows.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Ningún ítem tiene caducidad registrada todavía.
            </p>
          )}
          <div className="space-y-2">
            {rows.map((item) => {
              const days = Math.ceil(
                (new Date(item.caducidad).getTime() - now) / (1000 * 60 * 60 * 24)
              );
              const expired = days < 0;
              const soon = !expired && days <= 15;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 ${
                    expired
                      ? "border-red-300 bg-red-50"
                      : soon
                      ? "border-amber-300 bg-amber-50"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      <p className="text-xs text-neutral-500">
                        {(item.lote && `lote ${item.lote}`) || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {new Date(item.caducidad).toLocaleDateString("es-MX")}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          expired ? "text-red-600" : soon ? "text-amber-600" : "text-neutral-400"
                        }`}
                      >
                        {expired ? "caducado" : `en ${days} día${days === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
