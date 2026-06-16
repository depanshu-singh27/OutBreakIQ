import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import type { CountrySeries } from '../../types';
import { computeGlobalMeanAbsShap } from './analyticsModel';
type FeatureImportanceProps = {
    countries: CountrySeries[];
};
export function FeatureImportance({ countries }: FeatureImportanceProps) {
    const [codeA, setCodeA] = useState(() => countries[0]?.countryCode ?? '');
    const [codeB, setCodeB] = useState(() => countries[1]?.countryCode ?? countries[0]?.countryCode ?? '');
    const seriesA = useMemo(() => countries.find((c) => c.countryCode === codeA), [countries, codeA]);
    const seriesB = useMemo(() => countries.find((c) => c.countryCode === codeB), [countries, codeB]);
    const globalSorted = useMemo(() => computeGlobalMeanAbsShap(countries), [countries]);
    const chartData = useMemo(() => {
        return globalSorted.map((g) => ({
            name: g.label.length > 16 ? `${g.label.slice(0, 15)}…` : g.label,
            fullName: g.label,
            global: g.importance,
            countryA: seriesA ? Math.abs(seriesA.shap[g.key]) : 0,
            countryB: seriesB ? Math.abs(seriesB.shap[g.key]) : 0,
        }));
    }, [globalSorted, seriesA, seriesB]);
    const gMaxVal = useMemo(() => Math.max(1e-9, ...chartData.map((d) => d.global)), [chartData]);
    const magColor = (v: number) => {
        const t = Math.min(1, v / gMaxVal);
        return `hsl(${32 + t * 22}, ${78}%, ${38 + t * 18}%)`;
    };
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Feature importance</h3>
      <p className="mt-1 text-xs text-muted">
        Global mean |SHAP| (sorted). Compare any two countries side by side.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col text-xs text-muted">
          Country A
          <select value={codeA} onChange={(e) => setCodeA(e.target.value)} className="mt-1 max-w-[200px] rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-sm text-foreground">
            {countries.map((c) => (<option key={c.countryCode} value={c.countryCode}>
                {c.name}
              </option>))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-muted">
          Country B
          <select value={codeB} onChange={(e) => setCodeB(e.target.value)} className="mt-1 max-w-[200px] rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-sm text-foreground">
            {countries.map((c) => (<option key={c.countryCode} value={c.countryCode}>
                {c.name}
              </option>))}
          </select>
        </label>
      </div>

      <div className="mt-4 h-[min(420px,55vh)] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} opacity={0.4}/>
            <XAxis type="number" tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }}/>
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }}/>
            <Tooltip contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
        }} formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : String(v))} labelFormatter={(_, p) => (p[0]?.payload as {
        fullName?: string;
    })?.fullName ?? ''}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Bar dataKey="global" name="Global mean |SHAP|" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (<Cell key={`g-${i}`} fill={magColor(d.global)}/>))}
            </Bar>
            <Bar dataKey="countryA" name={seriesA?.name ?? 'A'} fill="#5eead4" radius={[0, 4, 4, 0]}/>
            <Bar dataKey="countryB" name={seriesB?.name ?? 'B'} fill="#a78bfa" radius={[0, 4, 4, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] text-muted">
        Teal and violet bars show |SHAP| magnitude for the selected countries (same features as global ranking).
      </p>
    </section>);
}
