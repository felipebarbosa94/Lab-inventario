interface RecipeSummary {
  id: string;
  name: string;
  cost_per_batch: number;
  selling_price: number | null;
}

interface ProductionLine {
  recipe_id: string;
  name: string;
  batches: number;
  margin: number | null;
}

interface Expense {
  name: string;
  amount: number;
  frequency: string;
}

interface FinanceReportData {
  month: string;
  recipes: RecipeSummary[];
  productionThisMonth: ProductionLine[];
  realizedMargin: number;
  monthlyExpenses: number;
  netProfitThisMonth: number;
  expenses: Expense[];
}

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
};

export function exportFinanceReport(data: FinanceReportData) {
  const recipeById = new Map(data.recipes.map((r) => [r.id, r]));

  let totalRevenue = 0;
  let totalCost = 0;

  const productionRowsHtml = data.productionThisMonth
    .map((p) => {
      const recipe = recipeById.get(p.recipe_id);
      const cost = recipe ? recipe.cost_per_batch * p.batches : null;
      const revenue =
        recipe && recipe.selling_price !== null ? recipe.selling_price * p.batches : null;
      if (cost !== null) totalCost += cost;
      if (revenue !== null) totalRevenue += revenue;
      return `
      <tr>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${p.name}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${p.batches}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${
          revenue !== null ? money(revenue) : "—"
        }</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${
          cost !== null ? money(cost) : "—"
        }</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${
          p.margin !== null ? money(p.margin) : "—"
        }</td>
      </tr>`;
    })
    .join("");

  const expenseRowsHtml = data.expenses
    .map(
      (e) => `
      <tr>
        <td style="padding:6px 12px; border-bottom:1px solid #e5e5e5;">${e.name}</td>
        <td style="padding:6px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${money(
          e.amount
        )}${e.frequency !== "mensual" ? ` (${e.frequency})` : ""}</td>
      </tr>`
    )
    .join("");

  const dateStr = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte financiero — ${data.month}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #171717; max-width: 720px; margin: 32px auto; padding: 0 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; text-transform: capitalize; }
  h2 { font-size: 14px; margin: 28px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #737373; padding: 8px 12px; border-bottom: 2px solid #171717; }
  th.num, td.num { text-align: right; }
  .meta { font-size: 13px; color: #525252; margin-bottom: 20px; }
  .totals { display: flex; gap: 16px; margin-top: 16px; }
  .totals div { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 14px; }
  .totals .label { font-size: 11px; color: #737373; text-transform: uppercase; }
  .totals .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
  .negative { color: #b91c1c; }
  .positive { color: #059669; }
  .print-btn { margin: 20px 0; padding: 10px 16px; background: #171717; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  <h1>Reporte financiero — ${monthLabel(data.month)}</h1>
  <p class="meta">Laboratorio Galenic · Generado ${dateStr}</p>

  <div class="totals">
    <div>
      <div class="label">Ingresos (producción del mes)</div>
      <div class="value">${money(totalRevenue)}</div>
    </div>
    <div>
      <div class="label">Costo de producción</div>
      <div class="value">${money(totalCost)}</div>
    </div>
    <div>
      <div class="label">Margen realizado</div>
      <div class="value">${money(data.realizedMargin)}</div>
    </div>
  </div>
  <div class="totals">
    <div>
      <div class="label">Gastos fijos del mes</div>
      <div class="value">${money(data.monthlyExpenses)}</div>
    </div>
    <div>
      <div class="label">Ganancia neta</div>
      <div class="value ${data.netProfitThisMonth >= 0 ? "positive" : "negative"}">${money(
        data.netProfitThisMonth
      )}</div>
    </div>
  </div>

  <h2>Producción del mes</h2>
  ${
    data.productionThisMonth.length === 0
      ? `<p style="font-size:13px; color:#737373;">No hay producción registrada este mes.</p>`
      : `<table>
    <thead>
      <tr>
        <th>Receta</th>
        <th class="num">Lotes</th>
        <th class="num">Ingresos</th>
        <th class="num">Costo</th>
        <th class="num">Margen</th>
      </tr>
    </thead>
    <tbody>
      ${productionRowsHtml}
    </tbody>
  </table>`
  }

  <h2>Gastos fijos</h2>
  ${
    data.expenses.length === 0
      ? `<p style="font-size:13px; color:#737373;">No hay gastos fijos registrados.</p>`
      : `<table>
    <thead>
      <tr><th>Concepto</th><th class="num">Monto</th></tr>
    </thead>
    <tbody>
      ${expenseRowsHtml}
    </tbody>
  </table>`
  }
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    return;
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-financiero-${data.month}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
