import { useMemo, useState } from 'react';
import { interpolateRgb } from 'd3-interpolate';
import { FEATURE_LABELS, FEATURE_ORDER } from './dashboardModel';
const cool = interpolateRgb('#1d4ed8', '#f1f5f9');
const warm = interpolateRgb('#f1f5f9', '#b91c1c');
function cellColor(c: number): string {
    const v = Math.max(-1, Math.min(1, c));
    if (v <= 0)
        return cool(v + 1);
    return warm(v);
}
type HeatmapGridProps = {
    matrix: number[][];
};
export function HeatmapGrid({ matrix }: HeatmapGridProps) {
    const [hover, setHover] = useState<{
        i: number;
        j: number;
        v: number;
    } | null>(null);
    const labels = useMemo(() => FEATURE_ORDER.map((k) => FEATURE_LABELS[k]), []);
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Feature correlation (8×8)
      </h3>
      <p className="mt-1 text-xs text-muted">
        Pearson correlation of weekly feature snapshots across all countries (historical weeks).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="border-collapse text-left">
          <thead>
            <tr>
              <th className="p-1"/>
              {labels.map((lb) => (<th key={lb} className="h-16 w-10 p-1 align-bottom text-[10px] font-medium text-muted">
                  <span className="block max-w-[4.5rem] [writing-mode:vertical-rl] rotate-180">{lb}</span>
                </th>))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (<tr key={labels[i]}>
                <th className="whitespace-nowrap px-2 py-1 text-right text-[10px] font-medium text-muted">
                  {labels[i]}
                </th>
                {row.map((v, j) => (<td key={`${i}-${j}`} className="p-0.5">
                    <button type="button" className="h-9 w-9 rounded-sm border border-border/40 transition-transform hover:z-10 hover:ring-2 hover:ring-[var(--color-accent)]" style={{ backgroundColor: cellColor(v) }} title={`${labels[i]} × ${labels[j]}: ${v.toFixed(2)}`} onMouseEnter={() => setHover({ i, j, v })} onMouseLeave={() => setHover(null)}/>
                  </td>))}
              </tr>))}
          </tbody>
        </table>
      </div>
      {hover ? (<p className="mt-3 text-center text-xs text-muted">
          {labels[hover.i]} vs {labels[hover.j]}:{' '}
          <strong className="text-foreground">{hover.v.toFixed(3)}</strong>
        </p>) : null}
      <div className="mx-auto mt-4 flex max-w-md items-center gap-2 text-[10px] text-muted">
        <span>−1</span>
        <div className="h-2 flex-1 rounded-full" style={{
            background: 'linear-gradient(90deg, #1d4ed8, #f1f5f9 50%, #b91c1c)',
        }}/>
        <span>+1</span>
      </div>
    </section>);
}
