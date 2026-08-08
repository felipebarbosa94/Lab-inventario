"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, Movement } from "@/lib/types";
import { UNIT_LABELS } from "@/lib/categories";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ItemHistoryModal({
  item,
  workerName,
  onClose,
}: {
  item: Item;
  workerName: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("movements")
      .select("*")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setMovements((data as Movement[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    supabase
      .from("movements")
      .select("*")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setMovements((data as Movement[]) ?? []);
        setLoading(false);
      });
  }, [item.id]);

  async function handleUndo(m: Movement) {
    if (m.type !== "entrada" && m.type !== "salida") return;
    setUndoing(true);
    setError(null);
    const reverseType = m.type === "entrada" ? "salida" : "entrada";
    const { error: insertError } = await supabase.from("movements").insert({
      item_id: item.id,
      user_name: workerName,
      type: reverseType,
      quantity: m.quantity,
      note: `Corrección: se deshizo un movimiento de ${m.user_name} (${formatDate(m.created_at)})`,
    });
    setUndoing(false);
    setConfirmUndoId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    load();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-neutral-900">Historial — {item.name}</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-4">
          Stock actual: {item.quantity} {UNIT_LABELS[item.unit]}
        </p>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {loading && <p className="text-sm text-neutral-400">Cargando...</p>}
          {!loading && movements.length === 0 && (
            <p className="text-sm text-neutral-400">Sin movimientos todavía para este ítem.</p>
          )}
          <ul className="divide-y divide-neutral-100">
            {movements.map((m, i) => (
              <li key={m.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-neutral-900">{m.user_name}</span>
                  <span className="text-neutral-400 text-xs">{formatDate(m.created_at)}</span>
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
                    {m.type === "entrada" ? "agregó" : m.type === "salida" ? "quitó" : "ajustó a"}
                  </span>{" "}
                  {m.quantity} {UNIT_LABELS[item.unit]}
                </p>
                {m.note && <p className="text-xs text-neutral-400 mt-0.5">{m.note}</p>}

                {i === 0 && m.type !== "ajuste" && (
                  <>
                    {confirmUndoId === m.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-neutral-500 flex-1">
                          ¿Deshacer? Se agrega un movimiento de corrección, no se borra este.
                        </span>
                        <button
                          onClick={() => setConfirmUndoId(null)}
                          className="text-xs text-neutral-500 px-2 py-1"
                        >
                          No
                        </button>
                        <button
                          onClick={() => handleUndo(m)}
                          disabled={undoing}
                          className="text-xs text-white bg-red-600 rounded-md px-2 py-1 disabled:opacity-50"
                        >
                          {undoing ? "Deshaciendo..." : "Sí, deshacer"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmUndoId(m.id)}
                        className="text-xs text-neutral-400 hover:text-red-600 underline mt-1"
                      >
                        Deshacer este movimiento
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
