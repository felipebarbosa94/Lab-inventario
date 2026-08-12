"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UNIT_LABELS } from "@/lib/categories";

interface ReceivingRow {
  id: string;
  created_at: string;
  quantity: number;
  lote: string | null;
  items: { name: string; unit: string } | null;
}

export default function SupplierPanel() {
  const [byProveedor, setByProveedor] = useState<Record<string, ReceivingRow[]> | null>(null);
  const [activeProveedor, setActiveProveedor] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("movements")
      .select("id, created_at, quantity, lote, proveedor, items(name, unit)")
      .eq("type", "entrada")
      .not("proveedor", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const grouped: Record<string, ReceivingRow[]> = {};
        for (const m of (data ?? []) as unknown as (ReceivingRow & { proveedor: string })[]) {
          (grouped[m.proveedor] ??= []).push(m);
        }
        setByProveedor(grouped);
      });
  }, []);

  const proveedores = byProveedor ? Object.keys(byProveedor).sort() : [];

  return (
    <div>
      {byProveedor === null && <p className="text-sm text-neutral-400">Cargando...</p>}
      {byProveedor !== null && proveedores.length === 0 && (
        <p className="text-sm text-neutral-400 py-8 text-center">
          Todavía no hay recepciones con proveedor registrado. Usá &quot;Recibir mercancía&quot;
          para empezar a llevar este historial.
        </p>
      )}

      {activeProveedor === null &&
        proveedores.map((p) => (
          <button
            key={p}
            onClick={() => setActiveProveedor(p)}
            className="w-full flex justify-between items-center text-left border border-neutral-200 rounded-lg px-3 py-2.5 mb-2"
          >
            <span className="font-medium text-neutral-900">{p}</span>
            <span className="text-xs text-neutral-400">
              {byProveedor![p].length} recepción{byProveedor![p].length === 1 ? "" : "es"}
            </span>
          </button>
        ))}

      {activeProveedor !== null && byProveedor && (
        <div>
          <button
            onClick={() => setActiveProveedor(null)}
            className="text-sm text-neutral-500 underline mb-3"
          >
            ← Todos los proveedores
          </button>
          <h4 className="font-medium text-neutral-900 mb-2">{activeProveedor}</h4>
          <div className="space-y-1.5">
            {byProveedor[activeProveedor].map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center text-sm border-b border-neutral-100 pb-1.5"
              >
                <div>
                  <span className="text-neutral-700">{r.items?.name ?? "ítem eliminado"}</span>
                  {r.lote && <span className="text-neutral-400 text-xs"> · lote {r.lote}</span>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-medium text-neutral-900">
                    {r.quantity} {r.items ? UNIT_LABELS[r.items.unit] : ""}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(r.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
