"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatQuantity } from "@/lib/formatQuantity";
import { MovementType, Unit } from "@/lib/types";

interface MonthMovement {
  id: string;
  item_id: string;
  user_name: string;
  type: MovementType;
  quantity: number;
  note: string | null;
  created_at: string;
  items: { name: string; category: string; project: string | null; unit: Unit } | null;
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthValue: string) {
  const [y, m] = monthValue.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export default function MonthlySummaryPanel({ onClose }: { onClose: () => void }) {
  const [month, setMonth] = useState(currentMonthValue());
  const [movements, setMovements] = useState<MonthMovement[] | null>(null);

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    let ignore = false;
    supabase
      .from("movements")
      .select("id, item_id, user_name, type, quantity, note, created_at, items(name, category, project, unit)")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!ignore) setMovements((data as unknown as MonthMovement[]) ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [month]);

  const loading = movements === null;
  const monthMovements = useMemo(() => movements ?? [], [movements]);

  const stats = useMemo(() => {
    const entradas = monthMovements.filter((m) => m.type === "entrada");
    const salidas = monthMovements.filter((m) => m.type === "salida");

    const byItemUsed: Record<string, { name: string; unit: Unit; total: number }> = {};
    for (const m of salidas) {
      if (!m.items) continue;
      const key = m.item_id;
      byItemUsed[key] ??= { name: m.items.name, unit: m.items.unit, total: 0 };
      byItemUsed[key].total += Number(m.quantity);
    }
    const topUsed = Object.values(byItemUsed)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const byCategory: Record<string, number> = {};
    for (const m of salidas) {
      if (!m.items) continue;
      const cat = m.items.category;
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }
    const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    const byProject: Record<string, number> = {};
    for (const m of monthMovements) {
      const project = m.items?.project ?? "Sin proyecto";
      byProject[project] = (byProject[project] ?? 0) + 1;
    }
    const topProjects = Object.entries(byProject).sort((a, b) => b[1] - a[1]);

    const byWorker: Record<string, number> = {};
    for (const m of monthMovements) {
      byWorker[m.user_name] = (byWorker[m.user_name] ?? 0) + 1;
    }
    const topWorkers = Object.entries(byWorker).sort((a, b) => b[1] - a[1]);

    return {
      totalMovements: monthMovements.length,
      entradasCount: entradas.length,
      salidasCount: salidas.length,
      topUsed,
      topCategories,
      topProjects,
      topWorkers,
    };
  }, [monthMovements]);

  function exportMonthCsv() {
    const headers = ["Fecha", "Trabajador", "Tipo", "Ítem", "Cantidad", "Unidad", "Nota"];
    const rows = monthMovements.map((m) => [
      new Date(m.created_at).toLocaleString("es-MX"),
      m.user_name,
      m.type,
      m.items?.name ?? "",
      String(m.quantity),
      m.items?.unit ?? "",
      m.note ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimientos-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Resumen mensual</h3>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button onClick={onClose} className="text-neutral-400 text-sm px-2">
              Cerrar
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-500 capitalize mb-4">{monthLabel(month)}</p>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {loading && <p className="text-sm text-neutral-400">Cargando...</p>}

          {!loading && monthMovements.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              No hubo movimientos registrados este mes.
            </p>
          )}

          {!loading && monthMovements.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Movimientos</p>
                  <p className="text-xl font-bold text-neutral-900">{stats.totalMovements}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Entradas</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.entradasCount}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Salidas</p>
                  <p className="text-xl font-bold text-red-600">{stats.salidasCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                    Lo que más se usó (salidas)
                  </h4>
                  <ul className="space-y-1">
                    {stats.topUsed.map((u) => (
                      <li key={u.name} className="flex justify-between text-sm">
                        <span className="text-neutral-600 truncate mr-2">{u.name}</span>
                        <span className="font-medium text-neutral-900 shrink-0">
                          {formatQuantity(u.total, u.unit)}
                        </span>
                      </li>
                    ))}
                    {stats.topUsed.length === 0 && (
                      <li className="text-sm text-neutral-400">Sin salidas este mes</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                    Movimientos por trabajador
                  </h4>
                  <ul className="space-y-1">
                    {stats.topWorkers.map(([worker, count]) => (
                      <li key={worker} className="flex justify-between text-sm">
                        <span className="text-neutral-600">{worker}</span>
                        <span className="font-medium text-neutral-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">Por categoría</h4>
                  <ul className="space-y-1">
                    {stats.topCategories.map(([cat, count]) => (
                      <li key={cat} className="flex justify-between text-sm">
                        <span className="text-neutral-600">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="font-medium text-neutral-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">Por proyecto</h4>
                  <ul className="space-y-1">
                    {stats.topProjects.map(([project, count]) => (
                      <li key={project} className="flex justify-between text-sm">
                        <span className="text-neutral-600">{project}</span>
                        <span className="font-medium text-neutral-900">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-700">Detalle de movimientos</h4>
                <button
                  onClick={exportMonthCsv}
                  className="text-sm rounded-md border border-neutral-300 px-3 py-1 text-neutral-700"
                >
                  Exportar CSV del mes
                </button>
              </div>
              <ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-lg">
                {monthMovements.map((m) => (
                  <li key={m.id} className="px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-neutral-900">{m.user_name}</span>
                      <span className="text-neutral-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-neutral-600">
                      <span
                        className={
                          m.type === "entrada"
                            ? "text-emerald-600 font-medium"
                            : m.type === "salida"
                            ? "text-red-600 font-medium"
                            : "text-neutral-500 font-medium"
                        }
                      >
                        {m.type === "entrada" ? "agregó" : m.type === "salida" ? "quitó" : "ajustó"}
                      </span>{" "}
                      {m.items ? formatQuantity(m.quantity, m.items.unit) : m.quantity} de{" "}
                      {m.items?.name ?? "ítem eliminado"}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
