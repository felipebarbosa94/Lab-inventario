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
import EditItemModal from "./EditItemModal";
import ItemHistoryModal from "./ItemHistoryModal";
import RecipesPanel from "./RecipesPanel";
import NewProjectFlow from "./NewProjectFlow";
import InsightsPanel from "./InsightsPanel";
import MonthlySummaryPanel from "./MonthlySummaryPanel";
import FinancePanel from "./FinancePanel";
import ReceiveShipmentModal from "./ReceiveShipmentModal";
import ExpiryPanel from "./ExpiryPanel";
import TodayPanel from "./TodayPanel";
import WorkerNameGate from "./WorkerNameGate";
import { useWorkerName } from "@/lib/useWorkerName";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { exportItemsToCsv } from "@/lib/exportCsv";
import { exportFullBackup } from "@/lib/backup";

export default function InventoryDashboard() {
  const { name, saveName, clearName } = useWorkerName();
  const { simpleMode, setSimpleMode } = useSimpleMode();
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [modal, setModal] = useState<{ item: Item; type: MovementType } | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [section, setSection] = useState<"materia_prima" | "envases">("materia_prima");
  const [showMonthly, setShowMonthly] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [mostUsedIds, setMostUsedIds] = useState<string[]>([]);

  async function handleBackup() {
    setBackingUp(true);
    try {
      await exportFullBackup();
    } finally {
      setBackingUp(false);
    }
  }

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

  useEffect(() => {
    if (!supabaseConfigured) return;

    const since = new Date();
    since.setDate(since.getDate() - 30);

    supabase
      .from("movements")
      .select("item_id")
      .gte("created_at", since.toISOString())
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const m of data ?? []) {
          counts[m.item_id] = (counts[m.item_id] ?? 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => id);
        setMostUsedIds(sorted);
      });
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

  const projects = Array.from(
    new Set(items.map((i) => i.project).filter((p): p is string => Boolean(p)))
  ).sort();
  const filteredItems = projectFilter ? items.filter((i) => i.project === projectFilter) : items;
  const materiaPrimaCount = filteredItems.filter((i) => i.category === "materia_prima").length;
  const envasesCount = filteredItems.filter((i) => i.category !== "materia_prima").length;
  const sectionItems = filteredItems.filter((i) =>
    section === "materia_prima" ? i.category === "materia_prima" : i.category !== "materia_prima"
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Inventario Lab</h1>
          <p className="text-sm text-neutral-500">
            Conectado como <span className="font-medium">{name}</span>{" "}
            <button onClick={clearName} className="text-neutral-400 underline ml-1">
              cambiar
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!simpleMode && (
            <>
              <button
                onClick={() => setShowFinance(true)}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
              >
                Finanzas
              </button>
              <button
                onClick={() => setShowMonthly(true)}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
              >
                Resumen mensual
              </button>
              <button
                onClick={() => setShowInsights(true)}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
              >
                Sugerencias
              </button>
            </>
          )}
          <button
            onClick={() => setShowToday(true)}
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
          >
            Hoy
          </button>
          <button
            onClick={() => setShowRecipes(true)}
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
          >
            Recetas
          </button>
          <button
            onClick={() => setShowReceive(true)}
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
          >
            Recibir mercancía
          </button>
          <button
            onClick={() => setShowExpiry(true)}
            className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
          >
            Vencimientos
          </button>
          {!simpleMode && (
            <>
              <button
                onClick={() => exportItemsToCsv(sectionItems)}
                disabled={sectionItems.length === 0}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium disabled:opacity-40"
              >
                Exportar CSV{projectFilter ? ` (${projectFilter})` : ""}
              </button>
              <button
                onClick={handleBackup}
                disabled={backingUp}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium disabled:opacity-40"
              >
                {backingUp ? "Generando..." : "Respaldo completo"}
              </button>
              <button
                onClick={() => setShowNewItem(true)}
                className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
              >
                + Nuevo ítem
              </button>
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded-md bg-neutral-900 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium"
              >
                + Nuevo proyecto
              </button>
            </>
          )}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={`rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium border ${
              simpleMode
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "border-neutral-300 text-neutral-700"
            }`}
          >
            {simpleMode ? "Vista completa" : "Vista simple"}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-neutral-400 text-sm">Cargando...</p>
      ) : (
        <>
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-4 w-full sm:w-fit">
            <button
              onClick={() => setSection("materia_prima")}
              className={`flex-1 sm:flex-initial rounded-md px-2 sm:px-4 py-2 text-sm font-medium transition-colors ${
                section === "materia_prima"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500"
              }`}
            >
              Materia prima
              <span className="ml-1.5 text-xs text-neutral-400">({materiaPrimaCount})</span>
            </button>
            <button
              onClick={() => setSection("envases")}
              className={`flex-1 sm:flex-initial rounded-md px-2 sm:px-4 py-2 text-sm font-medium transition-colors ${
                section === "envases" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              Envases y empaques
              <span className="ml-1.5 text-xs text-neutral-400">({envasesCount})</span>
            </button>
          </div>

          {projects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setProjectFilter(null)}
                className={`rounded-full px-3 py-1 text-sm font-medium border ${
                  !projectFilter
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-300"
                }`}
              >
                Todos
              </button>
              {projects.map((p) => (
                <button
                  key={p}
                  onClick={() => setProjectFilter(p)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border ${
                    projectFilter === p
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <KpiAlerts items={sectionItems} />
          {!simpleMode && <SummaryStrip items={sectionItems} />}
          <div className={simpleMode ? "" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
            <div className={simpleMode ? "" : "lg:col-span-2"}>
              <InventoryGrid
                items={sectionItems}
                mostUsedIds={mostUsedIds}
                simpleMode={simpleMode}
                onQuitar={(item) => setModal({ item, type: "salida" })}
                onAgregar={(item) => setModal({ item, type: "entrada" })}
                onEditar={(item) => setEditItem(item)}
                onHistorial={(item) => setHistoryItem(item)}
              />
            </div>
            {!simpleMode && (
              <div>
                <MovementFeed movements={movements} />
              </div>
            )}
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
      {editItem && (
        <EditItemModal
          item={items.find((i) => i.id === editItem.id) ?? editItem}
          onClose={() => setEditItem(null)}
        />
      )}
      {historyItem && (
        <ItemHistoryModal
          item={items.find((i) => i.id === historyItem.id) ?? historyItem}
          workerName={name}
          onClose={() => setHistoryItem(null)}
        />
      )}
      {showRecipes && (
        <RecipesPanel items={items} workerName={name} onClose={() => setShowRecipes(false)} />
      )}
      {showInsights && <InsightsPanel items={items} onClose={() => setShowInsights(false)} />}
      {showMonthly && <MonthlySummaryPanel onClose={() => setShowMonthly(false)} />}
      {showFinance && <FinancePanel onClose={() => setShowFinance(false)} />}
      {showReceive && (
        <ReceiveShipmentModal
          items={items}
          workerName={name}
          onClose={() => setShowReceive(false)}
        />
      )}
      {showExpiry && <ExpiryPanel items={items} onClose={() => setShowExpiry(false)} />}
      {showToday && <TodayPanel workerName={name} onClose={() => setShowToday(false)} />}
      {showNewProject && (
        <NewProjectFlow items={items} workerName={name} onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
