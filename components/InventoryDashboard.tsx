"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { Item, MovementWithItem, MovementType } from "@/lib/types";
import KpiAlerts from "./KpiAlerts";
import SummaryStrip from "./SummaryStrip";
import InventoryGrid from "./InventoryGrid";
import MovementFeed from "./MovementFeed";
import MovementModal from "./MovementModal";
import NewItemModal from "./NewItemModal";
import WorkerNameGate from "./WorkerNameGate";
import { useWorkerName } from "@/lib/useWorkerName";

export default function InventoryDashboard() {
  const { name, saveName, clearName } = useWorkerName();
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [modal, setModal] = useState<{ item: Item; type: MovementType } | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;

    async function loadInitial() {
      const [{ data: itemsData }, { data: movementsData }] = await Promise.all([
        supabase.from("items").select("*").order("category").order("name"),
        supabase
          .from("movements")
          .select("*, items(name, unit, project, flavor)")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setItems((itemsData as Item[]) ?? []);
      setMovements((movementsData as MovementWithItem[]) ?? []);
      setLoading(false);
    }
    loadInitial();

    const channel = supabase
      .channel("inventario-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, (payload) => {
        setItems((prev) => {
          if (payload.eventType === "INSERT") return [...prev, payload.new as Item];
          if (payload.eventType === "UPDATE")
            return prev.map((i) => (i.id === payload.new.id ? (payload.new as Item) : i));
          if (payload.eventType === "DELETE")
            return prev.filter((i) => i.id !== payload.old.id);
          return prev;
        });
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "movements" },
        async (payload) => {
          const { data } = await supabase
            .from("movements")
            .select("*, items(name, unit, project, flavor)")
            .eq("id", payload.new.id)
            .single();
          if (data) setMovements((prev) => [data as MovementWithItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!supabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
        <h2 className="font-semibold mb-2">Falta configurar Supabase</h2>
        <p className="text-sm">
          Copiá <code>.env.local.example</code> a <code>.env.local</code>, completá tu URL y anon
          key de Supabase, corré <code>supabase/schema.sql</code> en el SQL Editor de tu proyecto,
          y reiniciá el servidor.
        </p>
      </div>
    );
  }

  if (!name) {
    return <WorkerNameGate onSave={saveName} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Inventario Lab</h1>
          <p className="text-sm text-neutral-500">
            Conectado como <span className="font-medium">{name}</span>{" "}
            <button onClick={clearName} className="text-neutral-400 underline ml-1">
              cambiar
            </button>
          </p>
        </div>
        <button
          onClick={() => setShowNewItem(true)}
          className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          + Nuevo ítem
        </button>
      </header>

      {loading ? (
        <p className="text-neutral-400 text-sm">Cargando...</p>
      ) : (
        <>
          <KpiAlerts items={items} />
          <SummaryStrip items={items} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InventoryGrid
                items={items}
                onQuitar={(item) => setModal({ item, type: "salida" })}
                onAgregar={(item) => setModal({ item, type: "entrada" })}
              />
            </div>
            <div>
              <MovementFeed movements={movements} />
            </div>
          </div>
        </>
      )}

      {modal && (
        <MovementModal
          item={modal.item}
          type={modal.type}
          workerName={name}
          onClose={() => setModal(null)}
        />
      )}
      {showNewItem && <NewItemModal onClose={() => setShowNewItem(false)} />}
    </div>
  );
}
