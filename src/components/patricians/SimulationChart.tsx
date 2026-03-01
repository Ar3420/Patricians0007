type SimulationChartPoint = {
  date: string;
  alpha: number;
  beta: number;
  gamma: number;
  total: number;
  benchmarkValue: number;
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildPath(points: SimulationChartPoint[], selector: (p: SimulationChartPoint) => number) {
  const width = 920;
  const height = 360;
  const margin = 36;

  const values = points.flatMap((point) => [
    point.alpha,
    point.beta,
    point.gamma,
    point.total,
    point.benchmarkValue,
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? min - 1 : min;
  const yMax = min === max ? max + 1 : max;
  const ySpan = yMax - yMin;

  return points
    .map((point, index) => {
      const x =
        points.length <= 1
          ? margin
          : margin + (index / (points.length - 1)) * (width - margin * 2);
      const y = height - margin - ((selector(point) - yMin) / ySpan) * (height - margin * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SimulationChart({
  points,
}: {
  points: SimulationChartPoint[];
}) {
  if (points.length === 0) {
    return (
      <section className="helix-panel rounded-2xl p-4">
        <h2 className="mb-2 text-2xl">Simulation Market Chart</h2>
        <p className="text-sm text-[#5f6b7d]">
          No simulation points yet. Save your first manual snapshot to start tracking performance.
        </p>
      </section>
    );
  }

  const width = 920;
  const height = 360;
  const margin = 36;

  const values = points.flatMap((point) => [
    point.alpha,
    point.beta,
    point.gamma,
    point.total,
    point.benchmarkValue,
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? min - 1 : min;
  const yMax = min === max ? max + 1 : max;

  const xLabelLeft = points[0]?.date ?? "";
  const xLabelRight = points[points.length - 1]?.date ?? "";
  const yMiddle = (yMin + yMax) / 2;

  return (
    <section className="helix-panel rounded-2xl p-4">
      <h2 className="mb-1 text-2xl">Simulation Market Chart</h2>
      <p className="mb-3 text-sm text-[#5f6b7d]">
        Tracks manually entered sleeve equity curves against SPY benchmark (normalized).
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--helix-border)] bg-white/70 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]">
          <rect x={0} y={0} width={width} height={height} fill="transparent" />

          <line x1={margin} y1={margin} x2={margin} y2={height - margin} stroke="#c9ced8" />
          <line
            x1={margin}
            y1={height - margin}
            x2={width - margin}
            y2={height - margin}
            stroke="#c9ced8"
          />

          <line
            x1={margin}
            y1={(height - margin + margin) / 2}
            x2={width - margin}
            y2={(height - margin + margin) / 2}
            stroke="#e0e4ea"
            strokeDasharray="4 4"
          />

          <path d={buildPath(points, (p) => p.alpha)} fill="none" stroke="#60a5fa" strokeWidth={2} />
          <path d={buildPath(points, (p) => p.beta)} fill="none" stroke="#f59e0b" strokeWidth={2} />
          <path d={buildPath(points, (p) => p.gamma)} fill="none" stroke="#34d399" strokeWidth={2} />
          <path d={buildPath(points, (p) => p.total)} fill="none" stroke="#1f2937" strokeWidth={2.4} />
          <path
            d={buildPath(points, (p) => p.benchmarkValue)}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          <text x={margin - 6} y={margin} textAnchor="end" className="fill-[#6b7584] text-[11px]">
            {formatMoney(yMax)}
          </text>
          <text
            x={margin - 6}
            y={(height - margin + margin) / 2}
            textAnchor="end"
            className="fill-[#6b7584] text-[11px]"
          >
            {formatMoney(yMiddle)}
          </text>
          <text x={margin - 6} y={height - margin} textAnchor="end" className="fill-[#6b7584] text-[11px]">
            {formatMoney(yMin)}
          </text>

          <text x={margin} y={height - 8} className="fill-[#6b7584] text-[11px]">
            {xLabelLeft}
          </text>
          <text x={width - margin} y={height - 8} textAnchor="end" className="fill-[#6b7584] text-[11px]">
            {xLabelRight}
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#4e596a]">
        <span className="rounded border border-[var(--helix-border)] bg-white/75 px-2 py-1">Alpha: blue</span>
        <span className="rounded border border-[var(--helix-border)] bg-white/75 px-2 py-1">Beta: amber</span>
        <span className="rounded border border-[var(--helix-border)] bg-white/75 px-2 py-1">Gamma: green</span>
        <span className="rounded border border-[var(--helix-border)] bg-white/75 px-2 py-1">Total: black</span>
        <span className="rounded border border-[var(--helix-border)] bg-white/75 px-2 py-1">
          SPY (normalized): dashed gray
        </span>
      </div>
    </section>
  );
}

