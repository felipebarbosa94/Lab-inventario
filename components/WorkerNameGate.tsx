"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Worker {
  id: string;
  name: string;
}

export default function WorkerNameGate({ onSave }: { onSave: (name: string) => void }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("workers")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (!cancelled) {
        setWorkers((data as Worker[]) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">¿Quién sos?</h3>
        <p className="text-sm text-neutral-500 mb-4">
          Elegí tu nombre — queda registrado en cada movimiento que hagas.
        </p>
        {loading && <p className="text-sm text-neutral-400">Cargando...</p>}
        {!loading && workers.length === 0 && (
          <p className="text-sm text-neutral-400">
            Todavía no hay trabajadores cargados. Pedile al administrador que los agregue.
          </p>
        )}
        <div className="space-y-2">
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => onSave(w.name)}
              className="w-full rounded-md border border-neutral-300 py-2.5 text-left px-4 text-lg font-medium text-neutral-900 hover:bg-neutral-50"
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
