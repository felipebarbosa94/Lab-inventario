import { MovementWithItem } from "@/lib/types";
import { formatQuantity } from "@/lib/formatQuantity";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return new Date(iso).toLocaleDateString();
}

export default function MovementFeed({ movements }: { movements: MovementWithItem[] }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide px-4 pt-3 pb-2">
        Actividad reciente
      </h2>
      <ul className="divide-y divide-neutral-100 max-h-[28rem] overflow-y-auto">
        {movements.length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-400 text-center">Sin movimientos todavía</li>
        )}
        {movements.map((m) => (
          <li key={m.id} className="px-4 py-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-neutral-900">{m.user_name}</span>
              <span className="text-neutral-400 text-xs">{timeAgo(m.created_at)}</span>
            </div>
            <p className="text-neutral-600">
              <span
                className={
                  m.type === "entrada"
                    ? "text-emerald-600 font-medium"
                    : m.type === "salida"
                    ? "text-red-600 font-medium"
                    : "text-neutral-500 font-medium"
                }
              >
                {m.type === "entrada" ? "agregó" : m.type === "salida" ? "quitó" : "ajustó"}
              </span>{" "}
              {m.items ? formatQuantity(m.quantity, m.items.unit) : m.quantity} de{" "}
              <span className="font-medium">{m.items?.name ?? "ítem eliminado"}</span>
              {m.items?.project ? ` (${m.items.project}${m.items.flavor ? `, ${m.items.flavor}` : ""})` : ""}
            </p>
            {m.note && <p className="text-xs text-neutral-400 mt-0.5">{m.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
