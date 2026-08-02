import { Item } from "@/lib/types";

export default function SummaryStrip({ items }: { items: Item[] }) {
  const totalKgEquivalent = items
    .filter((i) => i.unit === "kg" || i.unit === "g")
    .reduce((sum, i) => sum + (i.unit === "kg" ? i.quantity : i.quantity / 1000), 0);

  const totalUnidades = items
    .filter((i) => i.unit === "unidad")
    .reduce((sum, i) => sum + i.quantity, 0);

  const totalGramos = totalKgEquivalent * 1000;

  const cards = [
    { label: "Materia prima (kg)", value: totalKgEquivalent.toFixed(2) },
    { label: "Materia prima (g)", value: totalGramos.toFixed(0) },
    { label: "Total envases / insumos (u)", value: totalUnidades.toFixed(0) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{c.label}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
