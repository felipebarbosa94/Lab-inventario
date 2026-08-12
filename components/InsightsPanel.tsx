"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";
import { computeStockoutCounts } from "@/lib/stockouts";

const WINDOW_DAYS = 60;

interface Insight {
  item: Item;
  totalUsed: number;
  dailyRate: number;
  daysRemaining: number | null;
  suggestedThreshold: number;
}

interface StockoutRow {
  item: Item;
  count: number;
}

export default function InsightsPanel({
  items,
  onClose,
}: {
  items: Item[];
  onClose: () => void;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [tab, setTab] = useState<"consumo" | "agotamiento">("consumo");
  const [stockouts, setStockouts] = useState<StockoutRow[] | null>(null);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);

    supabase
      .from("movements")
      .select("item_id, quantity")
      .eq("type", "salida")
      .gte("created_at", since.toISOString())
      .then(({ data }) => {
        const totals: Record<string, number> = {};
        for (const m of data ?? []) {
          totals[m.item_id] = (totals[m.item_id] ?? 0) + Number(m.quantity);
        }
        const computed = items
          .filter((item) => totals[item.id] > 0)
          .map((item) => {
            const totalUsed = totals[item.id];
            const dailyRate = totalUsed / WINDOW_DAYS;
            const daysRemaining = dailyRate > 0 ? item.quantity / dailyRate : null;
            const suggestedThreshold = Math.max(1, Math.ceil(dailyRate * 7));
            return { item, totalUsed, dailyRate, daysRemaining, suggestedThreshold };
          })
          .sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity));
        setInsights(computed);
        setLoading(false);
      });
  }, [items]);

  useEffect(() => {
    supabase
      .from("movements")
      .select("item_id, type, quantity, created_at")
      .then(({ data }) => {
        const counts = computeStockoutCounts(data ?? []);
        const rows = items
          .map((item) => ({ item, count: counts.get(item.id) ?? 0 }))
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count);
        setStockouts(rows);
      });
  }, [items]);

  async function applyThreshold(insight: Insight) {
    setApplying(insight.item.id);
    await supabase
      .from("items")
      .update({ low_stock_threshold: insight.suggestedThreshold })
      .eq("id", insight.item.id);
    setApplying(null);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Sugerencias de consumo</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-3 w-fit">
          <button
            onClick={() => setTab("consumo")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === "consumo" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Consumo
          </button>
          <button
            onClick={() => setTab("agotamiento")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === "agotamiento" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Se agota seguido
          </button>
        </div>

        {tab === "consumo" && (
          <p className="text-sm text-neutral-500 mb-4">
            Basado en tus movimientos de &quot;Quitar&quot; de los últimos {WINDOW_DAYS} días.
          </p>
        )}
        {tab === "agotamiento" && (
          <p className="text-sm text-neutral-500 mb-4">
            Cuántas veces cada ítem ha llegado a 0 desde que hay registro. No cuenta correcciones
            manuales de cantidad, solo entradas/salidas.
          </p>
        )}

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {tab === "consumo" && (
            <>
          {loading && <p className="text-sm text-neutral-400">Analizando...</p>}
          {!loading && insights.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Todavía no hay suficiente historial de movimientos para calcular sugerencias.
            </p>
          )}
          <div className="space-y-2">
            {insights.map((ins) => {
              const unit = UNIT_LABELS[ins.item.unit];
              const urgent = ins.daysRemaining !== null && ins.daysRemaining <= 14;
              return (
                <div
                  key={ins.item.id}
                  className={`rounded-lg border px-4 py-3 ${
                    urgent ? "border-red-300 bg-red-50" : "border-neutral-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-neutral-900">{ins.item.name}</p>
                      <p className="text-xs text-neutral-500">
                        Usás ~{ins.dailyRate.toFixed(2)} {unit}/día · quedan {ins.item.quantity}{" "}
                        {unit}
                        {ins.daysRemaining !== null && (
                          <>
                            {" "}
                            ·{" "}
                            <span className={urgent ? "text-red-600 font-medium" : ""}>
                              se acaba en ~{Math.max(0, Math.round(ins.daysRemaining))} días
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                    <span>
                      Umbral actual: {ins.item.low_stock_threshold ?? "sin definir"} {unit} —
                      sugerido: {ins.suggestedThreshold} {unit} (1 semana de uso)
                    </span>
                    <button
                      onClick={() => applyThreshold(ins)}
                      disabled={
                        applying === ins.item.id ||
                        ins.item.low_stock_threshold === ins.suggestedThreshold
                      }
                      className="rounded-md border border-neutral-300 px-2 py-1 text-neutral-700 disabled:opacity-40 shrink-0 ml-2"
                    >
                      {applying === ins.item.id
                        ? "Aplicando..."
                        : ins.item.low_stock_threshold === ins.suggestedThreshold
                        ? "Ya aplicado"
                        : "Aplicar sugerencia"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}

          {tab === "agotamiento" && (
            <>
              {stockouts === null && <p className="text-sm text-neutral-400">Analizando...</p>}
              {stockouts !== null && stockouts.length === 0 && (
                <p className="text-sm text-neutral-400 py-8 text-center">
                  Ningún ítem ha llegado a 0 desde que hay registro de movimientos. Buena señal.
                </p>
              )}
              <div className="space-y-2">
                {stockouts?.map((row) => (
                  <div
                    key={row.item.id}
                    className="rounded-lg border border-neutral-200 px-4 py-3 flex justify-between items-center"
                  >
                    <p className="font-medium text-neutral-900">{row.item.name}</p>
                    <p className="text-sm text-neutral-600">
                      Se agotó{" "}
                      <span className="font-semibold text-red-600">
                        {row.count} vez{row.count === 1 ? "" : "es"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
