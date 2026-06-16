import { useMemo } from 'react';
import { Brush, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import type { ChartRow } from './dashboardModel';
import { useAppStore } from '../../store/appStore';
type TimeSeriesPanelProps = {
    rows: ChartRow[];
};
export function TimeSeriesPanel({ rows }: TimeSeriesPanelProps) {
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    const { lastHistIdx, forecastStart, forecastEnd, hasForecast, visibleRows } = useMemo(() => {
        const lastHist = [...rows].reverse().find((r) => !r.isForecast);
        const firstFc = rows.find((r) => r.isForecast);
        const horizonWeeks = predictionHorizon === '7d' ? 1 : predictionHorizon === '30d' ? 4 : 13;
        const horizonEnd = firstFc ? firstFc.weekIndex + horizonWeeks - 1 : undefined;
        const visible = rows.filter((r) => !r.isForecast || (horizonEnd != null && r.weekIndex <= horizonEnd));
        const last = visible[visible.length - 1];
        return {
            lastHistIdx: lastHist?.weekIndex ?? 0,
            forecastStart: firstFc?.weekIndex ?? 0,
            forecastEnd: last?.weekIndex ?? 0,
            hasForecast: Boolean(firstFc),
            visibleRows: visible.map((row) => ({
                ...row,
                forecastRisk: row.isForecast && row.weekIndex >= (firstFc?.weekIndex ?? Infinity) && row.weekIndex <= (horizonEnd ?? -1)
                    ? row.risk
                    : null,
            })),
        };
    }, [predictionHorizon, rows]);
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Global time series</h3>
      <p className="mt-1 text-xs text-muted">
        Weekly means across countries: risk score (left axis) vs normalized temperature, PM2.5, and disease
        load (right axis, 0–100). Shaded band = forecast window; dashed separator = latest historical week.
      </p>
      <div className="mt-4 h-80 w-full min-w-0 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleRows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" opacity={0.45}/>
            <XAxis dataKey="weekIndex" type="number" tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }} tickLine={false}/>
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }} width={36} tickLine={false}/>
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }} width={36} tickLine={false}/>
            <Tooltip contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
        }} labelFormatter={(label) => {
            const idx = typeof label === 'number' ? label : Number(label);
            const row = rows.find((r) => r.weekIndex === idx);
            return row ? `${row.weekStart} (w${row.weekIndex})` : String(label);
        }}/>
            <Legend wrapperStyle={{ fontSize: 12 }}/>
            {hasForecast && forecastStart <= forecastEnd ? (<ReferenceArea yAxisId="left" x1={forecastStart} x2={forecastEnd} fill="var(--color-accent)" fillOpacity={0.08} strokeOpacity={0}/>) : null}
            <ReferenceLine yAxisId="left" x={lastHistIdx} stroke="var(--color-accent)" strokeDasharray="5 5" strokeWidth={1.5} label={{
            value: 'Latest hist.',
            fill: 'var(--color-fg-muted)',
            fontSize: 10,
            position: 'top',
        }}/>
            <Line yAxisId="left" type="monotone" dataKey="risk" name="Risk score" stroke="#5eead4" strokeWidth={2} dot={false} isAnimationActive animationDuration={1400} animationBegin={100}/>
            <Line yAxisId="left" type="monotone" dataKey="forecastRisk" name="Forecast risk" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive animationDuration={700}/>
            <Line yAxisId="right" type="monotone" dataKey="tempN" name="Temp (norm)" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={1400} animationBegin={200}/>
            <Line yAxisId="right" type="monotone" dataKey="pm25N" name="PM2.5 (norm)" stroke="#a78bfa" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={1400} animationBegin={280}/>
            <Line yAxisId="right" type="monotone" dataKey="diseaseN" name="Disease (norm)" stroke="#fb7185" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={1400} animationBegin={360}/>
            <Brush dataKey="weekIndex" height={26} stroke="var(--color-accent)" travellerWidth={7} tickFormatter={(v) => String(v)}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
