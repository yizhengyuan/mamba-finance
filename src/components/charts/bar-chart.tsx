interface BarChartItem {
  label: string;
  value: number;
  subValue?: number;
}

interface BarChartProps {
  title: string;
  items: BarChartItem[];
  valueFormatter?: (value: number) => string;
}

export function BarChart({ title, items, valueFormatter }: BarChartProps) {
  const max = items.length > 0 ? Math.max(...items.map((item) => item.value), 1) : 1;
  const format = valueFormatter ?? ((value: number) => String(value));

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-slate-300">暂无到期结构数据。</p>
      ) : (
        <div className="space-y-2">
          <div className="grid h-36 grid-cols-7 items-end gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-2">
            {items.map((item) => {
              const heightPercent = Math.max(6, (item.value / max) * 100);
              return (
                <div key={item.label} className="flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-sm bg-gradient-to-t from-cyan-500/90 to-cyan-300/90"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.label}: ${format(item.value)}`}
                  />
                  <span className="text-[10px] text-slate-400">{item.label.slice(5)}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-1 text-xs">
            {items.map((item) => (
              <div key={`${item.label}-row`} className="flex items-center justify-between text-slate-300">
                <span>{item.label}</span>
                <span>
                  {format(item.value)}
                  {item.subValue !== undefined ? ` · ${item.subValue} plans` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
