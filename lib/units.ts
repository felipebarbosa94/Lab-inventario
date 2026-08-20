import { Unit } from "./types";

// Unidad en la que se puede CAPTURAR una cantidad — incluye "mg" para dar más
// precisión al pesar, aunque ningún ítem se guarda en mg como unidad base.
export type EntryUnit = Unit | "mg";

// Gramos que equivale una unidad de captura (referencia común para convertir
// entre cualquier par kg/g/mg con precisión exacta, sin arrastrar redondeos).
const GRAMS_PER_UNIT: Record<"kg" | "g" | "mg", number> = {
  kg: 1000,
  g: 1,
  mg: 0.001,
};

// Convierte un valor capturado en `fromUnit` al valor equivalente en
// `toUnit` (la unidad base del ítem). Si cualquiera de las dos es "unidad"
// (piezas discretas) no hay conversión posible y se regresa tal cual.
export function convertQuantity(value: number, fromUnit: EntryUnit, toUnit: Unit): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === "unidad" || toUnit === "unidad") return value;
  const grams = value * GRAMS_PER_UNIT[fromUnit];
  return grams / GRAMS_PER_UNIT[toUnit];
}

// Unidades en las que tiene sentido capturar una cantidad para un ítem cuya
// unidad base es `baseUnit`. Para kg/g agregamos mg como tercera opción —
// útil para pesar principios activos que se dosifican en miligramos.
export function entryUnitOptions(baseUnit: Unit): EntryUnit[] {
  if (baseUnit === "kg") return ["kg", "g", "mg"];
  if (baseUnit === "g") return ["g", "mg", "kg"];
  return [baseUnit];
}
