import { RecipeWithItems } from "./types";

interface OrderRow {
  name: string;
  needed: number;
  unit: string;
  short: boolean;
  available: number;
}

export function openProductionOrder(
  recipe: RecipeWithItems,
  batchCount: number,
  rows: OrderRow[],
  workerName: string,
  lotCode?: string | null
) {
  const dateStr = new Date().toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const rowsHtml = rows
    .map(
      (r) => `
      <tr style="${r.short ? "color:#b91c1c;" : ""}">
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${r.name}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${r.needed.toLocaleString(
          "es-MX"
        )} ${r.unit}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">&#9744;</td>
      </tr>`
    )
    .join("");

  const stepsHtml = recipe.steps
    ? `<h2 style="font-size:15px; margin:24px 0 8px;">Pasos</h2>
       <pre style="white-space:pre-wrap; font-family:inherit; font-size:13px; background:#fafafa; padding:12px; border-radius:6px; border:1px solid #e5e5e5;">${recipe.steps}</pre>`
    : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Orden de producción — ${recipe.name}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #171717; max-width: 640px; margin: 32px auto; padding: 0 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; color: #737373; padding: 8px 12px; border-bottom: 2px solid #171717; }
  .meta { font-size: 13px; color: #525252; margin-bottom: 20px; }
  .print-btn { margin: 20px 0; padding: 10px 16px; background: #171717; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  <h1>Orden de producción</h1>
  <p class="meta">
    <strong>${recipe.name}</strong>${recipe.project ? ` — ${recipe.project}` : ""}<br/>
    ${batchCount} lote(s) de ${recipe.batch_label}<br/>
    ${lotCode ? `<strong>Lote interno: ${lotCode}</strong><br/>` : ""}
    Generada por ${workerName} — ${dateStr}
  </p>
  <table>
    <thead>
      <tr><th>Material</th><th style="text-align:right;">Cantidad necesaria</th><th>Listo</th></tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  ${stepsHtml}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    return;
  }

  // Popup bloqueado por el navegador: caemos a descargar el archivo directo.
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orden-produccion-${recipe.name.replace(/\s+/g, "-").toLowerCase()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
