interface DonutChartItem {
  label: string;
  value: number;
}

interface DonutChartProps {
  title: string;
  items: DonutChartItem[];
  valueFormatter?: (value: number) => string;
}

const palette = ["#06b6d4", "#22c55e", "#f59e0b", "#f43f5e", "#a78bfa", "#14b8a6"];

export function DonutChart({ title, items, valueFormatter }: DonutChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const format = valueFormatter ?? ((value: number) => String(value));

  const stops: string[] = [];
  let cursor = 0;
  items.forEach((item, index) => {
    const ratio = total > 0 ? item.value / total : 0;
    const next = cursor + ratio * 100;
    const color = palette[index % palette.length];
    stops.push(`${color} ${cursor.toFixed(2)}% ${next.toFixed(2)}%`);
    cursor = next;
  });

  const background =
    stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#334155 0% 100%)";

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-cyan-200">Total: {format(total)}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-300">No composition data.</p>
      ) : (
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div className="flex items-center justify-center">
            <div
              className="relative h-24 w-24 rounded-full border border-white/10"
              style={{ background }}
            >
              <div className="absolute inset-4 rounded-full bg-slate-950/90" />
            </div>
          </div>

          <div className="space-y-1.5">
            {items.map((item, index) => {
              const color = palette[index % palette.length];
              const ratio = total > 0 ? ((item.value / total) * 100).toFixed(2) : "0.00";
              return (
                <div key={item.label} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-slate-400">
                    {format(item.value)} ({ratio}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
