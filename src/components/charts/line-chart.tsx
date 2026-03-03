interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  title: string;
  points: LineChartPoint[];
  valueFormatter?: (value: number) => string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function LineChart({ title, points, valueFormatter }: LineChartProps) {
  const width = 560;
  const height = 220;
  const padX = 32;
  const padY = 20;

  const values = points.map((p) => p.value);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const range = max - min || 1;

  const segments = Math.max(points.length - 1, 1);

  const chartPoints = points.map((point, index) => {
    const x = padX + (index / segments) * (width - padX * 2);
    const ratio = (point.value - min) / range;
    const y = height - padY - ratio * (height - padY * 2);
    return { ...point, x, y };
  });

  const path = chartPoints
    .map((p, index) => `${index === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const latest = points[points.length - 1];
  const format = valueFormatter ?? ((value: number) => String(value));

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {latest ? <p className="text-xs text-cyan-200">Latest: {format(latest.value)}</p> : null}
      </div>

      {points.length === 0 ? (
        <p className="text-sm text-slate-300">暂无趋势数据。</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-48 w-full overflow-visible rounded-lg border border-white/10 bg-slate-950/50"
            role="img"
            aria-label={title}
          >
            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth="1"
            />
            <line
              x1={padX}
              y1={padY}
              x2={padX}
              y2={height - padY}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth="1"
            />

            <polyline
              points={`${padX},${height - padY - 1} ${width - padX},${height - padY - 1}`}
              stroke="rgba(56, 189, 248, 0.18)"
              strokeWidth="10"
              fill="none"
            />

            <path d={path} stroke="#38bdf8" strokeWidth="2.5" fill="none" />

            {chartPoints.map((point) => (
              <circle
                key={point.label}
                cx={clamp(point.x, padX, width - padX)}
                cy={clamp(point.y, padY, height - padY)}
                r="2.8"
                fill="#22d3ee"
              />
            ))}
          </svg>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{points[0]?.label ?? "-"}</span>
            <span>{points[points.length - 1]?.label ?? "-"}</span>
          </div>
        </>
      )}
    </section>
  );
}
