import type { CountrySeries, ShapFeatureKey } from '../../types';
import { FEATURE_LABELS, FEATURE_ORDER } from '../dashboard/dashboardModel';
export type GlobalFeatureImportance = {
    key: ShapFeatureKey;
    label: string;
    importance: number;
};
export function computeGlobalMeanAbsShap(countries: CountrySeries[]): GlobalFeatureImportance[] {
    if (countries.length === 0)
        return [];
    const sums: Record<ShapFeatureKey, number> = {
        temperature_lag2w: 0,
        humidity_7d_avg: 0,
        rainfall_spike: 0,
        pm25_trend: 0,
        no2_30d: 0,
        population_density: 0,
        seasonal_index: 0,
        mobility_index: 0,
    };
    for (const c of countries) {
        for (const k of FEATURE_ORDER) {
            sums[k] += Math.abs(c.shap[k]);
        }
    }
    const n = countries.length;
    return FEATURE_ORDER.map((k) => ({
        key: k,
        label: FEATURE_LABELS[k],
        importance: sums[k] / n,
    })).sort((a, b) => b.importance - a.importance);
}
export type BacktestPoint = {
    weekStart: string;
    actual: number;
    predicted: number;
};
export function buildBacktestSeries(series: CountrySeries, windowWeeks: 4 | 8 | 12, horizon: '7d' | '30d' | '90d'): BacktestPoint[] {
    const hist = series.weeks.filter((w) => !w.isForecast);
    if (hist.length < 2)
        return [];
    const need = Math.min(windowWeeks, hist.length - 1);
    const tail = hist.slice(-(need + 1));
    const out: BacktestPoint[] = [];
    for (let i = 1; i < tail.length; i++) {
        const prev = tail[i - 1]!;
        const cur = tail[i]!;
        out.push({
            weekStart: cur.weekStart,
            actual: cur.riskScore,
            predicted: horizon === '7d'
                ? prev.prediction7d
                : horizon === '30d'
                    ? prev.prediction30d
                    : prev.prediction90d,
        });
    }
    return out;
}
export function rmse(points: BacktestPoint[]): number {
    if (points.length === 0)
        return 0;
    const s = points.reduce((acc, p) => acc + (p.predicted - p.actual) ** 2, 0);
    return Math.sqrt(s / points.length);
}
export function mae(points: BacktestPoint[]): number {
    if (points.length === 0)
        return 0;
    const s = points.reduce((acc, p) => acc + Math.abs(p.predicted - p.actual), 0);
    return s / points.length;
}
function hash32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
export function generateCountryRiskHistory(series: CountrySeries, windowWeeks: 4 | 8 | 12, horizon: '7d' | '30d' | '90d'): BacktestPoint[] {
    const real = buildBacktestSeries(series, windowWeeks, horizon);
    if (real.length > 0)
        return real;
    const out: BacktestPoint[] = [];
    const last = (() => {
        const hist = series.weeks.filter((w) => !w.isForecast);
        return hist[hist.length - 1]?.riskScore ?? 48;
    })();
    for (let i = 0; i < windowWeeks; i++) {
        const u = (hash32(`${series.countryCode}|h|${i}`) % 2000) / 100 - 10;
        const actual = Math.max(0, Math.min(100, last + u + i * 0.12));
        const pred = Math.max(0, Math.min(100, actual + (hash32(`${series.countryCode}|p|${i}`) % 1600) / 100 - 8));
        out.push({ weekStart: `w${i + 1}`, actual, predicted: pred });
    }
    return out;
}
export function globalMeanLatestRisk(countries: CountrySeries[]): number {
    if (countries.length === 0)
        return 0;
    let s = 0;
    let n = 0;
    for (const c of countries) {
        const hist = c.weeks.filter((w) => !w.isForecast);
        const w = hist[hist.length - 1];
        if (w) {
            s += w.riskScore;
            n += 1;
        }
    }
    return n ? s / n : 0;
}
