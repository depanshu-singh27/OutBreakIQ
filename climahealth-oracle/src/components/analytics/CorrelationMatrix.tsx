import { useCallback, useId, useMemo, useState } from 'react';
import { interpolateRgb } from 'd3-interpolate';
import { FEATURE_LABELS, FEATURE_ORDER } from '../dashboard/dashboardModel';
const cool = interpolateRgb('#1d4ed8', '#f8fafc');
const warm = interpolateRgb('#f8fafc', '#b91c1c');
function cellFill(c: number): string {
    const v = Math.max(-1, Math.min(1, c));
    if (v <= 0)
        return cool(v + 1);
    return warm(v);
}
type CorrelationMatrixProps = {
    matrix: number[][];
};
export function CorrelationMatrix({ matrix }: CorrelationMatrixProps) {
    const uid = useId();
    const labels = useMemo(() => FEATURE_ORDER.map((k) => FEATURE_LABELS[k]), []);
    const cell = 46;
    const lab = 108;
    const w = lab + cell * 8;
    const h = lab + cell * 8;
    const [tip, setTip] = useState<{
        i: number;
        j: number;
        v: number;
        x: number;
        y: number;
    } | null>(null);
    const hideTip = useCallback(() => setTip(null), []);
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Feature correlation</h3>
      <p className="mt-1 text-xs text-muted">
        Pearson r on weekly feature snapshots (all countries, historical weeks). Hover a cell for the exact
        coefficient.
      </p>

      <div className="relative mt-4 overflow-x-auto">
        <svg width={w} height={h} className="mx-auto block font-sans text-[10px]" onMouseLeave={hideTip}>
          <defs>
            <linearGradient id={`${uid}-leg`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8"/>
              <stop offset="50%" stopColor="#f8fafc"/>
              <stop offset="100%" stopColor="#b91c1c"/>
            </linearGradient>
          </defs>

          {labels.map((lb, j) => (<text key={`tc-${j}`} x={lab + j * cell + cell / 2} y={lab - 8} textAnchor="end" transform={`rotate(-55 ${lab + j * cell + cell / 2} ${lab - 8})`} fill="var(--color-fg-muted)">
              {lb.length > 12 ? `${lb.slice(0, 11)}…` : lb}
            </text>))}

          {labels.map((lb, i) => (<text key={`lr-${i}`} x={lab - 8} y={lab + i * cell + cell / 2 + 4} textAnchor="end" fill="var(--color-fg-muted)">
              {lb.length > 14 ? `${lb.slice(0, 13)}…` : lb}
            </text>))}

          {matrix.map((row, i) => row.map((v, j) => (<rect key={`${i}-${j}`} x={lab + j * cell + 1} y={lab + i * cell + 1} width={cell - 2} height={cell - 2} rx={4} fill={cellFill(v)} stroke="var(--color-border)" strokeWidth={0.5} className="cursor-crosshair transition-opacity hover:opacity-90" onMouseEnter={(e) => {
                const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                setTip({
                    i,
                    j,
                    v,
                    x: r.left + r.width / 2,
                    y: r.top,
                });
            }} onMouseMove={(e) => {
                setTip((prev) => prev
                    ? {
                        ...prev,
                        x: e.clientX,
                        y: e.clientY,
                    }
                    : null);
            }}/>)))}

          <rect x={lab} y={h - 20} width={cell * 4} height={8} fill={`url(#${uid}-leg)`} rx={4}/>
          <text x={lab} y={h - 4} fill="var(--color-fg-muted)">
            −1
          </text>
          <text x={lab + cell * 4 - 12} y={h - 4} fill="var(--color-fg-muted)">
            +1
          </text>
        </svg>

        {tip ? (<div className="pointer-events-none fixed z-[75] rounded-md border border-border bg-[var(--color-surface)] px-2 py-1.5 text-xs shadow-lg" style={{ left: tip.x + 10, top: tip.y + 8 }}>
            <p className="font-medium text-foreground">
              {labels[tip.i]} × {labels[tip.j]}
            </p>
            <p className="font-mono tabular-nums text-[var(--color-accent)]">r = {tip.v.toFixed(4)}</p>
          </div>) : null}
      </div>
    </section>);
}
