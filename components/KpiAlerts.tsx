import { Item } from "@/lib/types";
import { formatQuantity } from "@/lib/formatQuantity";

function describeItem(item: Item) {
  const parts = [item.name];
  if (item.project) parts.push(item.project);
  if (item.flavor) parts.push(`sabor ${item.flavor}`);
  return parts.join(" — ");
}

export default function KpiAlerts({ items }: { items: Item[] }) {
  const lowStock = items.filter(
    (item) => item.low_stock_threshold !== null && item.quantity <= item.low_stock_threshold
  );

  if (lowStock.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-red-600 mb-2 uppercase tracking-wide">
        ⚠ Alertas de stock bajo
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lowStock.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 shadow-sm"
          >
            <p className="text-sm font-medium text-red-800">
              Quedan pocas unidades de {describeItem(item)}
            </p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {formatQuantity(item.quantity, item.unit)}
            </p>
            <p className="text-xs text-red-500 mt-1">
              Umbral de alerta: {formatQuantity(item.low_stock_threshold ?? 0, item.unit)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
