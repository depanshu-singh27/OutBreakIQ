import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import type { CountrySeries } from '../../types';
import { useAppStore } from '../../store/appStore';
import { useAnimatedFloat } from '../../hooks/useCountUp';
import { generateCountryRiskHistory, mae, rmse, type BacktestPoint } from './analyticsModel';
import { backtest, metrics } from '../../data/modelOutputs/index';
type WindowW = 4 | 8 | 12;
type PredictionAccuracyProps = {
    countries: CountrySeries[];
};
export function PredictionAccuracy({ countries }: PredictionAccuracyProps) {
    const storeCountry = useAppStore((s) => s.selectedCountry);
    const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
    const [code, setCode] = useState(() => storeCountry ?? countries[0]?.countryCode ?? '');
    const [backtestWindow, setBacktestWindow] = useState<WindowW>(12);
    const [mode, setMode] = useState<'country' | 'global'>('global');
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    useEffect(() => {
        if (!storeCountry)
            return;
        const id = window.setTimeout(() => setCode(storeCountry), 0);
        return () => window.clearTimeout(id);
    }, [storeCountry]);
    const series = useMemo(() => countries.find((c) => c.countryCode === code), [countries, code]);
    const countryPoints = useMemo((): BacktestPoint[] => {
        if (!series)
            return [];
        return generateCountryRiskHistory(series, backtestWindow, predictionHorizon);
    }, [series, backtestWindow, predictionHorizon]);
    const globalRows = useMemo(() => {
        const a = backtest.actual ?? [];
        const p = backtest.predicted ?? [];
        const lstm = backtest.lstm_only ?? [];
        const w = backtest.weeks ?? a.map((_, i) => i + 1);
        const n = Math.min(a.length, p.length, w.length);
        const rows: {
            week: string | number;
            actual: number;
            predicted: number;
            lstm?: number;
        }[] = [];
        for (let i = 0; i < n; i++) {
            rows.push({
                week: `w${w[i]}`,
                actual: a[i]!,
                predicted: p[i]!,
                lstm: lstm[i],
            });
        }
        return rows;
    }, []);
    const sliceLen = backtestWindow * 4;
    const globalSliced = useMemo(() => {
        if (globalRows.length === 0)
            return [];
        const take = Math.min(sliceLen, globalRows.length);
        return globalRows.slice(-take);
    }, [globalRows, sliceLen]);
    const globalWindowPoints = useMemo((): BacktestPoint[] => {
        return globalSliced.map((r) => ({
            weekStart: String(r.week),
            actual: r.actual,
            predicted: r.predicted,
        }));
    }, [globalSliced]);
    const windowRmse = useMemo(() => {
        if (mode === 'global')
            return rmse(globalWindowPoints);
        return rmse(countryPoints);
    }, [mode, globalWindowPoints, countryPoints]);
    const windowMae = useMemo(() => {
        if (mode === 'global')
            return mae(globalWindowPoints);
        return mae(countryPoints);
    }, [mode, globalWindowPoints, countryPoints]);
    const chartData = useMemo(() => {
        if (mode === 'global') {
            return globalSliced.map((r) => ({
                week: r.week,
                actual: r.actual,
                predicted: r.predicted,
                lstm: r.lstm,
            }));
        }
        return countryPoints.map((p) => ({
            week: p.weekStart.slice(5),
            actual: p.actual,
            predicted: p.predicted,
            lstm: undefined as number | undefined,
        }));
    }, [mode, globalSliced, countryPoints]);
    const rmseAnim = useAnimatedFloat(windowRmse, 1);
    const maeAnim = useAnimatedFloat(windowMae, 1);
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Prediction accuracy</h3>
          <p className="mt-1 text-xs text-muted">
            Prior week&apos;s selected horizon forecast vs realized weekly risk (one-step backtest).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-[var(--radius-sm)] border border-border bg-elevated p-0.5">
            <button type="button" onClick={() => setMode('global')} className={[
            'px-3 py-1.5 text-xs font-semibold',
            mode === 'global'
                ? 'rounded-[4px] bg-[var(--color-accent)] text-white'
                : 'text-muted hover:text-foreground',
        ].join(' ')}>
              Global ML (52w)
            </button>
            <button type="button" onClick={() => setMode('country')} className={[
            'px-3 py-1.5 text-xs font-semibold',
            mode === 'country'
                ? 'rounded-[4px] bg-[var(--color-accent)] text-white'
                : 'text-muted hover:text-foreground',
        ].join(' ')}>
              Country risk
            </button>
          </div>
          <label className="text-xs text-muted">
            Country
            <select value={code} disabled={mode === 'global'} onChange={(e) => {
            const v = e.target.value;
            setCode(v);
            setSelectedCountry(v);
        }} className="ml-2 rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-sm text-foreground disabled:opacity-50">
              {countries.map((c) => (<option key={c.countryCode} value={c.countryCode}>
                  {c.name}
                </option>))}
            </select>
          </label>
          <div className="flex gap-1">
            {([4, 8, 12] as const).map((w) => (<button key={w} type="button" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBacktestWindow(w);
            }} style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                background: backtestWindow === w ? '#06b6d4' : '#1e293b',
                color: backtestWindow === w ? '#000000' : '#64748b',
                transition: 'all 0.2s ease',
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative',
            }}>
                {w}w
              </button>))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted">RMSE ({backtestWindow}w window)</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--color-accent)]">{rmseAnim.toFixed(2)}</p>
          {mode === 'global' ? (<p className="mt-1 text-[10px] text-muted">Fusion (full train): {metrics.rmse_fusion.toFixed(2)}</p>) : null}
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted">MAE ({backtestWindow}w window)</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{maeAnim.toFixed(2)}</p>
          {mode === 'global' ? (<p className="mt-1 text-[10px] text-muted">Fusion (full train): {metrics.mae_fusion.toFixed(2)}</p>) : null}
        </div>
      </div>

      <div className="mt-4 h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" opacity={0.45}/>
            <XAxis dataKey="week" tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }}/>
            <YAxis domain={mode === 'global' && chartData.length ? ['auto', 'auto'] : [0, 100]} tick={{ fill: 'var(--color-fg-muted)', fontSize: 10 }} width={44}/>
            <Tooltip contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
        }}/>
            <Legend wrapperStyle={{ fontSize: 11 }}/>
            <Line type="monotone" dataKey="actual" name={mode === 'global' ? 'Actual (risk)' : 'Actual risk'} stroke="#5eead4" strokeWidth={2} dot={false} isAnimationActive animationDuration={900}/>
            <Line type="monotone" dataKey="predicted" name={mode === 'global' ? 'Fusion predicted' : `Predicted (lag-1 ${predictionHorizon})`} stroke="#fb923c" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive animationDuration={900}/>
            {mode === 'global' && chartData.some((r: {
            lstm?: number;
        }) => r.lstm !== undefined) ? (<Line type="monotone" dataKey="lstm" name="LSTM only" stroke="#a78bfa" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={900}/>) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
