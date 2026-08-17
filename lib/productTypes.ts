export const PRODUCT_TYPES = {
  jarabe: { label: "Jarabe", units: ["L", "ml"] },
  capsulas: { label: "Cápsulas / Tabletas", units: ["unidad"] },
  polvo: { label: "Polvo / Proteína", units: ["kg", "g"] },
  crema: { label: "Crema / Gel", units: ["kg", "g", "ml"] },
  otro: { label: "Otro", units: ["kg", "g", "L", "ml", "unidad"] },
} as const;

export type ProductType = keyof typeof PRODUCT_TYPES;

export const PRODUCT_TYPE_OPTIONS = Object.keys(PRODUCT_TYPES) as ProductType[];

export const BATCH_UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  g: "g",
  L: "L",
  ml: "ml",
  unidad: "unidad(es)",
};

export function unitsForType(type: string | null): readonly string[] {
  if (type && type in PRODUCT_TYPES) return PRODUCT_TYPES[type as ProductType].units;
  return PRODUCT_TYPES.otro.units;
}
