"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { exportExpiryReport } from "@/lib/expiryReport";
import { formatQuantity } from "@/lib/formatQuantity";
import { Unit } from "@/lib/types";

interface RawLotRow {
  id: string;
  lote: string | null;
  caducidad: string;
  quantity: number;
  items: { name: string; unit: Unit } | null;
}

interface ExpiringLotRow {
  id: string;
  lote: string | null;
  caducidad: string;
  quantity: number;
  itemName: string;
  unit: Unit;
}

export default function ExpiryPanel({ onClose }: { onClose: () => void }) {
  const [now] = useState(() => Date.now());
  const [rows, setRows] = useState<ExpiringLotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("item_lots")
      .select("id, lote, caducidad, quantity, items(name, unit)")
      .not("caducidad", "is", null)
      .gt("quantity", 0)
      .order("caducidad", { ascending: true })
      .then(({ data }) => {
        const mapped = ((data as unknown as RawLotRow[]) ?? []).map((r) => ({
          id: r.id,
          lote: r.lote,
          caducidad: r.caducidad,
          quantity: r.quantity,
          itemName: r.items?.name ?? "Ítem eliminado",
          unit: r.items?.unit ?? "unidad",
        }));
        setRows(mapped);
        setLoading(false);
      });
  }, []);

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
          <p className="text-sm text-neutral-500">
            Cada lote por separado, ordenado por fecha más próxima primero.
          </p>
          <button
            onClick={() =>
              exportExpiryReport(
                rows.map((r) => ({
                  name: r.itemName,
                  lote: r.lote,
                  caducidad: r.caducidad,
                  quantity: r.quantity,
                  unit: r.unit,
                }))
              )
            }
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 text-xs font-medium shrink-0"
          >
            Descargar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {loading && <p className="text-sm text-neutral-400 py-8 text-center">Cargando...</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Ningún lote tiene caducidad registrada todavía.
            </p>
          )}
          <div className="space-y-2">
            {rows.map((row) => {
              const days = Math.ceil(
                (new Date(row.caducidad).getTime() - now) / (1000 * 60 * 60 * 24)
              );
              const expired = days < 0;
              const soon = !expired && days <= 15;
              return (
                <div
                  key={row.id}
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
                      <p className="font-medium text-neutral-900">{row.itemName}</p>
                      <p className="text-xs text-neutral-500">
                        {(row.lote && `lote ${row.lote}`) || "—"} ·{" "}
                        {formatQuantity(row.quantity, row.unit)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {new Date(row.caducidad).toLocaleDateString("es-MX")}
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
