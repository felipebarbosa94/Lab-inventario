import { Unit } from "./types";
import { UNIT_LABELS } from "./categories";

// Muestra una cantidad guardada en la unidad base del ítem (kg/g/unidad) en
// la unidad que un humano leería más natural — así "0.0002 kg" se ve como
// "200 mg" y "1500 g" se ve como "1.5 kg", en vez de forzar siempre la
// unidad de almacenamiento. No cambia lo que se guarda, solo cómo se lee.
export function formatQuantity(value: number, baseUnit: Unit, maximumFractionDigits = 3): string {
  if (baseUnit === "unidad" || value === 0) {
    return `${value.toLocaleString("es-MX", { maximumFractionDigits: 6 })} ${UNIT_LABELS[baseUnit]}`;
  }

  const grams = baseUnit === "kg" ? value * 1000 : value;
  const absGrams = Math.abs(grams);

  if (absGrams < 1) {
    return `${(grams * 1000).toLocaleString("es-MX", { maximumFractionDigits })} mg`;
  }
  if (absGrams < 1000) {
    return `${grams.toLocaleString("es-MX", { maximumFractionDigits })} g`;
  }
  return `${(grams / 1000).toLocaleString("es-MX", { maximumFractionDigits })} kg`;
}
