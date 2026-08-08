import { Item } from "@/lib/types";

export default function SummaryStrip({ items }: { items: Item[] }) {
  const totalKgEquivalent = items
    .filter((i) => i.unit === "kg" || i.unit === "g")
    .reduce((sum, i) => sum + (i.unit === "kg" ? i.quantity : i.quantity / 1000), 0);

  const totalUnidades = items
    .filter((i) => i.unit === "unidad")
    .reduce((sum, i) => sum + i.quantity, 0);

  const totalGramos = totalKgEquivalent * 1000;

  const hasWeight = items.some((i) => i.unit === "kg" || i.unit === "g");
  const hasUnits = items.some((i) => i.unit === "unidad");

  const cards = [
    ...(hasWeight
      ? [
          { label: "Total (kg)", value: totalKgEquivalent.toFixed(2) },
          { label: "Total (g)", value: totalGramos.toFixed(0) },
        ]
      : []),
    ...(hasUnits ? [{ label: "Total (unidades)", value: totalUnidades.toFixed(0) }] : []),
  ];

  if (cards.length === 0) return null;

  return (
    <div
      className={`grid grid-cols-1 gap-3 mb-6 ${
        cards.length === 3 ? "sm:grid-cols-3" : cards.length === 2 ? "sm:grid-cols-2" : ""
      }`}
    >
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{c.label}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
