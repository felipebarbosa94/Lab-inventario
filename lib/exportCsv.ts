import { Item } from "./types";
import { CATEGORY_LABELS } from "./categories";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportItemsToCsv(items: Item[]) {
  const headers = [
    "Nombre",
    "Categoría",
    "Proyecto/Marca",
    "Sabor",
    "Cantidad",
    "Unidad",
    "Umbral de alerta",
  ];
  const rows = items.map((item) => [
    item.name,
    CATEGORY_LABELS[item.category] ?? item.category,
    item.project ?? "",
    item.flavor ?? "",
    String(item.quantity),
    item.unit,
    item.low_stock_threshold !== null ? String(item.low_stock_threshold) : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `inventario-lab-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
