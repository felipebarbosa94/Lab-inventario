interface ExpiryRow {
  name: string;
  lote: string | null;
  caducidad: string;
  quantity: number;
  unit: string;
}

export function exportExpiryReport(rows: ExpiryRow[]) {
  const dateStr = new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });

  const rowsHtml = rows
    .map((r) => {
      const days = Math.ceil(
        (new Date(r.caducidad).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const status = days < 0 ? "caducado" : `${days} día${days === 1 ? "" : "s"}`;
      return `
      <tr style="${days < 0 ? "color:#b91c1c;" : days <= 15 ? "color:#b45309;" : ""}">
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${r.name}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${r.lote ?? "—"}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5; text-align:right;">${
          r.quantity
        } ${r.unit}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${new Date(
          r.caducidad
        ).toLocaleDateString("es-MX")}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e5e5e5;">${status}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Vencimientos — Inventario Lab</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #171717; max-width: 720px; margin: 32px auto; padding: 0 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #737373; padding: 8px 12px; border-bottom: 2px solid #171717; }
  .meta { font-size: 13px; color: #525252; margin-bottom: 20px; }
  .print-btn { margin: 20px 0; padding: 10px 16px; background: #171717; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  <h1>Vencimientos de materia prima</h1>
  <p class="meta">Laboratorio Galenic · Generado ${dateStr}</p>
  <table>
    <thead>
      <tr><th>Ítem</th><th>Lote</th><th style="text-align:right;">Cantidad</th><th>Caducidad</th><th>Estado</th></tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5" style="padding:16px; color:#737373;">Nada con caducidad registrada.</td></tr>`}
    </tbody>
  </table>
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
  link.download = `vencimientos-${new Date().toISOString().slice(0, 10)}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
