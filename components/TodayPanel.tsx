"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MovementWithItem } from "@/lib/types";
import { formatQuantity } from "@/lib/formatQuantity";

export default function TodayPanel({
  workerName,
  onClose,
}: {
  workerName: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<MovementWithItem[] | null>(null);

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    supabase
      .from("movements")
      .select("*, items(name, unit, project, flavor)")
      .eq("user_name", workerName)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setMovements((data as MovementWithItem[]) ?? []);
      });
  }, [workerName]);

  const entradas = movements?.filter((m) => m.type === "entrada").length ?? 0;
  const salidas = movements?.filter((m) => m.type === "salida").length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Hoy — {workerName}</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        {movements !== null && (
          <p className="text-sm text-neutral-500 mb-4">
            {entradas} entrada{entradas === 1 ? "" : "s"} · {salidas} salida
            {salidas === 1 ? "" : "s"}
          </p>
        )}

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {movements === null && <p className="text-sm text-neutral-400">Cargando...</p>}
          {movements !== null && movements.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">
              Todavía no has hecho ningún movimiento hoy.
            </p>
          )}
          <ul className="divide-y divide-neutral-100">
            {movements?.map((m) => (
              <li key={m.id} className="py-2.5 text-sm">
                <div className="flex justify-between gap-2">
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
                    <span className="font-medium">{m.items?.name ?? "ítem eliminado"}</span>
                  </p>
                  <span className="text-neutral-400 text-xs shrink-0">
                    {new Date(m.created_at).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {m.note && <p className="text-xs text-neutral-400 mt-0.5">{m.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
