"use client";

import { useState } from "react";
import MiniBarChart from "./MiniBarChart";
import SupplierPanel from "./SupplierPanel";
import { exportFinanceReport } from "@/lib/financeReport";

interface RecipeSummary {
  id: string;
  name: string;
  project: string | null;
  batch_label: string;
  cost_per_batch: number;
  missing_cost: boolean;
  selling_price: number | null;
  margin_per_batch: number | null;
}

interface ItemCost {
  id: string;
  name: string;
  unit: string;
  category: string;
  unit_cost: number | null;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: string;
}

interface MonthHistory {
  month: string;
  realizedMargin: number;
  monthlyExpenses: number;
  netProfit: number;
}

interface FinanceData {
  recipes: RecipeSummary[];
  negativeMarginRecipes: RecipeSummary[];
  items: ItemCost[];
  expenses: Expense[];
  month: string;
  productionThisMonth: {
    recipe_id: string;
    name: string;
    batches: number;
    margin: number | null;
  }[];
  realizedMargin: number;
  monthlyExpenses: number;
  netProfitThisMonth: number;
  history: MonthHistory[];
}

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

export default function FinancePanel({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"resumen" | "costos" | "precios" | "gastos" | "proveedores">(
    "resumen"
  );
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  async function load(pinToUse: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/finance", { headers: { "x-finance-pin": pinToUse } });
    if (res.status === 401) {
      setError("PIN incorrecto");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("No se pudo cargar la información");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setData(json);
    setPin(pinToUse);
    setAuthed(true);
    setLoading(false);
  }

  async function handleSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    load(pinInput);
  }

  async function post(action: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-finance-pin": pin },
      body: JSON.stringify({ action, ...payload }),
    });
    if (res.ok) load(pin);
    return res.ok;
  }

  if (!authed) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">Finanzas</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Solo Felipe y Ramón tienen el PIN de esta sección.
          </p>
          <form onSubmit={handleSubmitPin} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-lg text-center tracking-widest"
              placeholder="PIN"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-neutral-300 py-2 text-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md py-2 text-white font-medium bg-neutral-900 disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Finanzas — privado</h3>
          <button onClick={onClose} className="text-neutral-400 text-sm px-2">
            Cerrar
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-4 w-fit">
          {(["resumen", "precios", "costos", "gastos", "proveedores"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 -mx-5 px-5">
          {tab === "resumen" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-neutral-500 capitalize">{data.month}</p>
                <button
                  onClick={() =>
                    exportFinanceReport({
                      month: data.month,
                      recipes: data.recipes,
                      productionThisMonth: data.productionThisMonth,
                      realizedMargin: data.realizedMargin,
                      monthlyExpenses: data.monthlyExpenses,
                      netProfitThisMonth: data.netProfitThisMonth,
                      expenses: data.expenses,
                    })
                  }
                  className="rounded-md border border-neutral-300 text-neutral-700 px-3 py-1.5 text-xs font-medium"
                >
                  Descargar reporte
                </button>
              </div>

              {data.negativeMarginRecipes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                    ⚠ Recetas vendiéndose por debajo del costo
                  </h4>
                  <div className="space-y-1.5">
                    {data.negativeMarginRecipes.map((r) => (
                      <div
                        key={r.id}
                        className="flex justify-between text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2"
                      >
                        <span className="text-red-800">{r.name}</span>
                        <span className="font-medium text-red-700">
                          {money(r.margin_per_batch ?? 0)} por lote
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Margen realizado</p>
                  <p className="text-xl font-bold text-neutral-900">
                    {money(data.realizedMargin)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Gastos fijos</p>
                  <p className="text-xl font-bold text-red-600">
                    {money(data.monthlyExpenses)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 px-3 py-2">
                  <p className="text-xs text-neutral-500">Ganancia neta</p>
                  <p
                    className={`text-xl font-bold ${
                      data.netProfitThisMonth >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {money(data.netProfitThisMonth)}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-lg px-3 py-2 mb-6 text-sm font-medium ${
                  data.netProfitThisMonth >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {data.netProfitThisMonth >= 0
                  ? `Ya cubriste tus gastos fijos del mes — vas ${money(
                      data.netProfitThisMonth
                    )} arriba del punto de equilibrio.`
                  : `Te faltan ${money(
                      Math.abs(data.netProfitThisMonth)
                    )} en margen para cubrir tus gastos fijos de este mes.`}
              </div>

              <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                Producción de este mes
              </h4>
              {data.productionThisMonth.length === 0 && (
                <p className="text-sm text-neutral-400 mb-6">
                  No hay producción registrada este mes todavía (o falta ponerle precio/costo a
                  las recetas usadas).
                </p>
              )}
              <ul className="space-y-1 mb-6">
                {data.productionThisMonth.map((p) => (
                  <li key={p.name} className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      {p.name} × {p.batches}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {p.margin !== null ? money(p.margin) : "sin precio"}
                    </span>
                  </li>
                ))}
              </ul>

              <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                Últimos {data.history.length} meses
              </h4>
              <p className="text-xs text-neutral-400 mb-2">
                Usa tus gastos fijos actuales aplicados a cada mes — no llevamos histórico de
                cuándo cambió cada gasto.
              </p>
              <MiniBarChart
                data={data.history.map((h) => ({ label: h.month, value: h.netProfit }))}
              />
              <div className="space-y-1 mt-2">
                {data.history.map((h) => (
                  <div key={h.month} className="flex justify-between text-sm">
                    <span className="text-neutral-600">{h.month}</span>
                    <span
                      className={`font-medium ${
                        h.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {money(h.netProfit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "precios" && (
            <div className="space-y-3">
              {data.recipes.length === 0 && (
                <p className="text-sm text-neutral-400">No hay recetas creadas todavía.</p>
              )}
              {data.recipes.map((r) => (
                <RecipePriceRow key={r.id} recipe={r} onSave={post} />
              ))}
            </div>
          )}

          {tab === "costos" && (
            <div className="space-y-2">
              {data.items.map((item) => (
                <ItemCostRow key={item.id} item={item} onSave={post} />
              ))}
            </div>
          )}

          {tab === "gastos" && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="ej. Renta, Luz, Sueldos"
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="$ mensual"
                  className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    if (newExpenseName.trim() && Number(newExpenseAmount) > 0) {
                      post("add_expense", {
                        name: newExpenseName.trim(),
                        amount: Number(newExpenseAmount),
                      });
                      setNewExpenseName("");
                      setNewExpenseAmount("");
                    }
                  }}
                  className="rounded-md bg-neutral-900 text-white px-3 py-2 text-sm font-medium"
                >
                  Agregar
                </button>
              </div>
              <ul className="divide-y divide-neutral-100">
                {data.expenses.map((e) => (
                  <li key={e.id} className="flex justify-between items-center py-2 text-sm">
                    <span className="text-neutral-700">{e.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900">{money(e.amount)}/mes</span>
                      <button
                        onClick={() => post("delete_expense", { id: e.id })}
                        className="text-neutral-400 hover:text-red-600 text-xs"
                      >
                        Borrar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "proveedores" && <SupplierPanel />}
        </div>
      </div>
    </div>
  );
}

function RecipePriceRow({
  recipe,
  onSave,
}: {
  recipe: RecipeSummary;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [price, setPrice] = useState(recipe.selling_price?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="border border-neutral-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className="font-medium text-neutral-900">{recipe.name}</p>
          <p className="text-xs text-neutral-500">
            {[recipe.project, `1 lote = ${recipe.batch_label}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm mt-2">
        <span className="text-neutral-500">
          Costo/lote:{" "}
          <span className="font-medium text-neutral-900">
            {money(recipe.cost_per_batch)}
            {recipe.missing_cost && (
              <span className="text-amber-600"> (falta costo de algún ingrediente)</span>
            )}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm text-neutral-500">Precio de venta:</span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          placeholder="0"
        />
        <button
          onClick={async () => {
            setSaving(true);
            await onSave("save_price", { recipe_id: recipe.id, selling_price: Number(price) });
            setSaving(false);
          }}
          disabled={saving}
          className="text-sm rounded-md border border-neutral-300 px-2 py-1"
        >
          {saving ? "..." : "Guardar"}
        </button>
        {recipe.selling_price !== null && (
          <button
            onClick={async () => {
              setSaving(true);
              await onSave("clear_price", { recipe_id: recipe.id });
              setPrice("");
              setSaving(false);
            }}
            disabled={saving}
            className="text-xs text-neutral-400 hover:text-red-600"
          >
            Quitar
          </button>
        )}
        {recipe.margin_per_batch !== null && (
          <span
            className={`text-sm font-medium ml-auto ${
              recipe.margin_per_batch >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            Margen: {money(recipe.margin_per_batch)}
          </span>
        )}
      </div>
    </div>
  );
}

function ItemCostRow({
  item,
  onSave,
}: {
  item: ItemCost;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [cost, setCost] = useState(item.unit_cost?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-2 text-sm border-b border-neutral-100 pb-2">
      <span className="flex-1 text-neutral-700">{item.name}</span>
      <input
        type="number"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="w-24 rounded-md border border-neutral-300 px-2 py-1"
        placeholder="0"
      />
      <span className="text-xs text-neutral-400 w-8">/{item.unit}</span>
      <button
        onClick={async () => {
          setSaving(true);
          await onSave("save_cost", { item_id: item.id, unit_cost: Number(cost) });
          setSaving(false);
        }}
        disabled={saving}
        className="rounded-md border border-neutral-300 px-2 py-1"
      >
        {saving ? "..." : "Guardar"}
      </button>
    </div>
  );
}
