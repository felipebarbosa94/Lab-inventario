"use client";

const POSITIVE = "#059669"; // emerald-600
const NEGATIVE = "#dc2626"; // red-600
const GRID = "#e5e5e5"; // neutral-200
const LABEL = "#525252"; // neutral-600

interface Point {
  label: string;
  value: number;
}

export default function MiniBarChart({ data }: { data: Point[] }) {
  if (data.length === 0) return null;

  const width = 640;
  const height = 190;
  const padding = { top: 16, bottom: 40, left: 8, right: 8 };
  const plotHeight = height - padding.top - padding.bottom;
  const barSlot = (width - padding.left - padding.right) / data.length;
  const barWidth = Math.min(40, barSlot * 0.55);

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const zeroY = padding.top + plotHeight / 2;
  const scale = plotHeight / 2 / maxAbs;

  const money = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Ganancia neta por mes"
    >
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={zeroY}
        y2={zeroY}
        stroke={GRID}
        strokeWidth={1}
      />
      {data.map((d, i) => {
        const cx = padding.left + barSlot * i + barSlot / 2;
        const barHeight = Math.abs(d.value) * scale;
        const positive = d.value >= 0;
        const y = positive ? zeroY - barHeight : zeroY;
        const color = positive ? POSITIVE : NEGATIVE;
        const radius = 4;

        return (
          <g key={d.label}>
            <title>
              {d.label}: {money(d.value)}
            </title>
            <rect
              x={cx - barWidth / 2}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill={color}
              rx={radius}
              ry={radius}
            />
            <text
              x={cx}
              y={positive ? zeroY - barHeight - 6 : zeroY + barHeight + 12}
              textAnchor="middle"
              fontSize="10"
              fill={LABEL}
            >
              {money(d.value)}
            </text>
            <text
              x={cx}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill={LABEL}
            >
              {d.label.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
