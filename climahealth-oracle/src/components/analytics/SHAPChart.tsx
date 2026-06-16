import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { CountrySeries, ShapFeatureKey } from '../../types';
import { useAppStore } from '../../store/appStore';
import { FEATURE_LABELS, FEATURE_ORDER } from '../dashboard/dashboardModel';
import { globalMeanLatestRisk } from './analyticsModel';
import { shap as modelShap } from '../../data/modelOutputs/index';
type ShapRow = {
    key: ShapFeatureKey;
    value: number;
    label: string;
};
type SHAPChartProps = {
    countries: CountrySeries[];
};
export function SHAPChart({ countries }: SHAPChartProps) {
    const storeCountry = useAppStore((s) => s.selectedCountry);
    const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
    const [code, setCode] = useState(() => storeCountry ?? countries[0]?.countryCode ?? '');
    useEffect(() => {
        if (!storeCountry)
            return;
        const id = window.setTimeout(() => setCode(storeCountry), 0);
        return () => clearTimeout(id);
    }, [storeCountry]);
    const series = useMemo(() => countries.find((c) => c.countryCode === code), [countries, code]);
    const rows: ShapRow[] = useMemo(() => {
        if (!series)
            return [];
        return FEATURE_ORDER.map((key) => ({
            key,
            value: series.shap[key],
            label: FEATURE_LABELS[key],
        })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    }, [series]);
    const maxAbs = useMemo(() => Math.max(1e-6, ...rows.map((r) => Math.abs(r.value))), [rows]);
    const baseline = useMemo(() => globalMeanLatestRisk(countries), [countries]);
    const finalRisk = series
        ? (() => {
            const hist = series.weeks.filter((w) => !w.isForecast);
            return hist[hist.length - 1]?.riskScore ?? 0;
        })()
        : 0;
    const topModelShap = useMemo(() => {
        return [...modelShap]
            .sort((a, b) => b.mean_shap - a.mean_shap)
            .slice(0, 15)
            .map((s) => ({ feature: s.feature, mean: s.mean_shap }));
    }, []);
    const [normalizedView, setNormalizedView] = useState(false);
    const modelShapRows = useMemo(() => {
        const maxAbs = Math.max(...topModelShap.map((d) => d.mean), 1e-9);
        return topModelShap.map((s) => ({
            feature: s.feature,
            display: normalizedView ? s.mean / maxAbs : s.mean,
            raw: s.mean,
        }));
    }, [topModelShap, normalizedView]);
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      {topModelShap.length > 0 ? (<div className="mb-6 rounded-[var(--radius-sm)] border border-border bg-elevated/50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Trained model — global mean |SHAP|
              </h3>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
                Top 15 features by absolute SHAP contribution. abs_latitude dominates because disease risk is fundamentally
                geography-dependent — tropical countries have 3–8× higher burden than temperate ones.
              </p>
            </div>
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-[var(--color-bg)] p-0.5">
              <button type="button" onClick={() => setNormalizedView(false)} className={[
                'rounded px-2.5 py-1 text-[11px] font-semibold',
                !normalizedView ? 'bg-[var(--color-accent)] text-[var(--color-bg)]' : 'text-muted hover:text-foreground',
            ].join(' ')}>
                Absolute
              </button>
              <button type="button" onClick={() => setNormalizedView(true)} className={[
                'rounded px-2.5 py-1 text-[11px] font-semibold',
                normalizedView ? 'bg-[var(--color-accent)] text-[var(--color-bg)]' : 'text-muted hover:text-foreground',
            ].join(' ')}>
                Normalized
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {modelShapRows.map((s, i) => {
                const maxDisp = Math.max(...modelShapRows.map((d) => d.display), 1e-9);
                const barWidth = `${(s.display / maxDisp) * 100}%`;
                const barColor = shapCategoryColor(s.feature);
                return (<div key={s.feature} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-[11px] text-foreground sm:w-48" title={s.feature}>
                    {s.feature}
                  </span>
                  <div className="relative h-6 min-w-0 flex-1 rounded bg-[var(--color-bg)]">
                    <motion.div className="absolute inset-y-1 left-0 rounded" style={{ background: barColor }} initial={{ width: 0 }} animate={{ width: barWidth }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.03 }}/>
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] font-mono tabular-nums text-muted">
                    {normalizedView ? s.display.toFixed(3) : s.raw.toFixed(4)}
                  </span>
                </div>);
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#3b82f6' }}/>
              Climate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#8b5cf6' }}/>
              Geography
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#f97316' }}/>
              Air quality
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: '#10b981' }}/>
              Rolling / lag
            </span>
          </div>
          <div style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10,
                padding: '12px 16px',
                marginTop: 16,
                fontSize: 13,
                color: '#94a3b8',
                lineHeight: 1.7,
            }}>
            <strong style={{ color: '#e2e8f0' }}>Why does latitude dominate?</strong>
            <br />
            The model learned that geographic location (latitude) is the strongest predictor of climate-driven health risk.
            Countries near the equator experience year-round warm temperatures and humidity that sustain vector breeding,
            while temperate regions have seasonal transmission windows. Within each latitude band, the climate features
            (temperature lag, humidity, rainfall) and air quality (PM2.5) drive week-to-week variation in risk.
          </div>
        </div>) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">SHAP attribution</h3>
          <p className="mt-1 text-xs text-muted">
            Mean-centered contributions: green reduces modeled risk vs cohort average, red increases it.
          </p>
        </div>
        <label className="text-xs text-muted">
          Country
          <select value={code} onChange={(e) => {
            const v = e.target.value;
            setCode(v);
            setSelectedCountry(v);
        }} className="ml-2 mt-1 block w-full min-w-[200px] rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-sm text-foreground sm:ml-2 sm:mt-0 sm:inline-block">
            {countries.map((c) => (<option key={c.countryCode} value={c.countryCode}>
                {c.name}
              </option>))}
          </select>
        </label>
      </div>

      {!series || rows.length === 0 ? (<p className="mt-6 text-sm text-muted">No country data.</p>) : (<>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Baseline (global avg)
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">{baseline.toFixed(1)}</p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Final (country risk)
              </p>
              <p className="text-xl font-bold tabular-nums text-[var(--color-accent)]">{finalRisk.toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-[10px] uppercase text-muted">
              <span className="w-36 shrink-0">Feature</span>
              <div className="relative min-w-0 flex-1 text-center">← Risk-reducing · Risk-increasing →</div>
              <span className="w-14 shrink-0 text-right">Δ</span>
            </div>

            {rows.map((r, i) => {
                const wPct = (Math.abs(r.value) / maxAbs) * 50;
                const isNeg = r.value < 0;
                return (<div key={r.key} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate text-xs text-foreground" title={r.label}>
                    {r.label}
                  </span>
                  <div className="relative h-7 min-w-0 flex-1 rounded-md bg-[var(--color-bg)]">
                    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-border"/>
                    {isNeg ? (<motion.div className="absolute inset-y-1 right-1/2 rounded-l bg-emerald-500/85" initial={{ width: 0 }} animate={{ width: `${wPct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.04 }}/>) : (<motion.div className="absolute inset-y-1 left-1/2 rounded-r bg-red-500/85" initial={{ width: 0 }} animate={{ width: `${wPct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.04 }}/>)}
                  </div>
                  <span className={`w-14 shrink-0 text-right text-xs font-mono tabular-nums ${isNeg ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.value >= 0 ? '+' : ''}
                    {r.value.toFixed(2)}
                  </span>
                </div>);
            })}
          </div>
        </>)}
    </section>);
}
function shapCategoryColor(feature: string): string {
    const x = feature.toLowerCase();
    if (/abs_latitude|^latitude$|is_tropical|is_equatorial|is_temperate/.test(x))
        return '#8b5cf6';
    if (/pm25|aqi|no2|air/.test(x))
        return '#f97316';
    if (/lag|roll|_lag|_roll/.test(x))
        return '#10b981';
    if (/temp|humidity|rain|heat_index|sin_week|cos_week|week/.test(x))
        return '#3b82f6';
    return '#64748b';
}
