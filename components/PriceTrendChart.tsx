"use client";

interface Point {
  date: string;
  value: number;
}

export default function PriceTrendChart({ data, unit }: { data: Point[]; unit: string }) {
  if (data.length < 2) return null;

  const width = 400;
  const height = 100;
  const padding = { top: 16, bottom: 20, left: 8, right: 8 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - ((d.value - min) / range) * plotHeight;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const rising = data[data.length - 1].value > data[0].value;
  const lineColor = rising ? "#dc2626" : "#059669";

  const money = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Tendencia de precio">
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <title>
            {new Date(p.date).toLocaleDateString("es-MX")}: {money(p.value)}/{unit}
          </title>
          <circle cx={p.x} cy={p.y} r={4} fill={lineColor} />
          {(i === 0 || i === points.length - 1) && (
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize="10"
              fill="#525252"
            >
              {money(p.value)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
