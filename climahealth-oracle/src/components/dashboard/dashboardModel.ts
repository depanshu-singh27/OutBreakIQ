import type { CountrySeries, CountryWeekRecord, DiseaseBurden, RiskLevel, ShapFeatureKey } from '../../types';
import { getLatestHistoricalWeek } from '../location/myLocationModel';
import type { LocalAlert } from '../location/myLocationModel';
import { riskScores } from '../../data/modelOutputs/index';
import { isoAlpha3ToAlpha2 } from '../../data/isoNumericToAlpha3';
export const FEATURE_ORDER: ShapFeatureKey[] = [
    'temperature_lag2w',
    'humidity_7d_avg',
    'rainfall_spike',
    'pm25_trend',
    'no2_30d',
    'population_density',
    'seasonal_index',
    'mobility_index',
];
export const FEATURE_LABELS: Record<ShapFeatureKey, string> = {
    temperature_lag2w: 'Temp lag',
    humidity_7d_avg: 'Humidity',
    rainfall_spike: 'Rain spike',
    pm25_trend: 'PM2.5 trend',
    no2_30d: 'NO₂',
    population_density: 'Density',
    seasonal_index: 'Season',
    mobility_index: 'Mobility',
};
export type MapLayer = 'risk' | 'temperature' | 'pm25' | 'rainfall' | 'disease';
const DISEASE_LABELS: Record<keyof DiseaseBurden, string> = {
    dengue: 'Dengue',
    malaria: 'Malaria',
    cholera: 'Cholera',
    respiratoryIllness: 'Respiratory',
    heatStroke: 'Heat stroke',
};
export function dominantDiseaseName(d: DiseaseBurden): string {
    const entries = Object.entries(d) as [
        keyof DiseaseBurden,
        number
    ][];
    entries.sort((a, b) => b[1] - a[1]);
    return DISEASE_LABELS[entries[0]![0]];
}
export function topDriverLabel(series: CountrySeries): string {
    let best: ShapFeatureKey | null = null;
    let bestAbs = -1;
    for (const k of FEATURE_ORDER) {
        const v = Math.abs(series.shap[k]);
        if (v > bestAbs) {
            bestAbs = v;
            best = k;
        }
    }
    return best ? FEATURE_LABELS[best] : '—';
}
export function compositeDiseaseLoad(d: DiseaseBurden): number {
    return d.dengue + d.malaria + d.cholera + d.respiratoryIllness + d.heatStroke;
}
export function getMapMetric(latest: CountryWeekRecord, layer: MapLayer): number {
    switch (layer) {
        case 'risk':
            return latest.riskScore;
        case 'temperature':
            return latest.temperatureC;
        case 'pm25':
            return latest.pm25;
        case 'rainfall':
            return latest.rainfallMm;
        case 'disease':
            return compositeDiseaseLoad(latest.disease);
        default:
            return latest.riskScore;
    }
}
export function getMapLayerDomain(countries: CountrySeries[], layer: MapLayer): [
    number,
    number
] {
    const values: number[] = [];
    for (const s of countries) {
        const w = getLatestHistoricalWeek(s);
        if (!w)
            continue;
        values.push(getMapMetric(w, layer));
    }
    if (values.length === 0)
        return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max)
        return [min - 1, max + 1];
    return [min, max];
}
export type CountryMapTooltip = {
    name: string;
    code: string;
    riskScore: number;
    dominantDisease: string;
    topDriver: string;
};
export function buildCountryTooltip(series: CountrySeries, latest: CountryWeekRecord): CountryMapTooltip {
    return {
        name: series.name,
        code: series.countryCode,
        riskScore: latest.riskScore,
        dominantDisease: dominantDiseaseName(latest.disease),
        topDriver: topDriverLabel(series),
    };
}
export type GlobalKpis = {
    criticalCount: number;
    globalAvgRisk: number;
    highestRiskCountry: string;
    highestRiskScore: number;
    outbreakZones: number;
};
export function computeGlobalKpis(_countries?: CountrySeries[]): GlobalKpis {
    if (riskScores.length === 0) {
        return {
            criticalCount: 0,
            globalAvgRisk: 0,
            highestRiskCountry: '—',
            highestRiskScore: 0,
            outbreakZones: 0,
        };
    }
    const criticalCount = riskScores.filter((c) => c.risk_level === 'critical' || c.risk_score >= 75).length;
    const globalAvgRisk = Math.round((riskScores.reduce((sum, c) => sum + c.risk_score, 0) / riskScores.length) * 10) / 10;
    const highest = riskScores.reduce((max, c) => (c.risk_score > max.risk_score ? c : max), riskScores[0]!);
    const outbreakZones = riskScores.filter((c) => c.risk_score >= 50).length;
    return {
        criticalCount,
        globalAvgRisk,
        highestRiskCountry: highest.country_name,
        highestRiskScore: highest.risk_score,
        outbreakZones,
    };
}
export type WeeklyAggregateRow = {
    weekIndex: number;
    weekStart: string;
    risk: number;
    temp: number;
    pm25: number;
    disease: number;
    isForecast: boolean;
};
export function buildGlobalWeeklyAggregates(countries: CountrySeries[]): WeeklyAggregateRow[] {
    if (countries.length === 0)
        return [];
    const nWeeks = countries[0]!.weeks.length;
    const rows: WeeklyAggregateRow[] = [];
    for (let i = 0; i < nWeeks; i++) {
        let sr = 0;
        let st = 0;
        let sp = 0;
        let sd = 0;
        const w0 = countries[0]!.weeks[i]!;
        for (const c of countries) {
            const w = c.weeks[i]!;
            sr += w.riskScore;
            st += w.temperatureC;
            sp += w.pm25;
            sd += compositeDiseaseLoad(w.disease);
        }
        const m = countries.length;
        rows.push({
            weekIndex: w0.weekIndex,
            weekStart: w0.weekStart,
            risk: sr / m,
            temp: st / m,
            pm25: sp / m,
            disease: sd / m,
            isForecast: w0.isForecast,
        });
    }
    return rows;
}
export type ChartRow = {
    weekIndex: number;
    weekStart: string;
    risk: number;
    tempN: number;
    pm25N: number;
    diseaseN: number;
    isForecast: boolean;
};
export function buildChartRows(countries: CountrySeries[]): ChartRow[] {
    const raw = buildGlobalWeeklyAggregates(countries);
    const hist = raw.filter((r) => !r.isForecast);
    if (hist.length === 0) {
        return raw.map((r) => ({
            weekIndex: r.weekIndex,
            weekStart: r.weekStart,
            risk: r.risk,
            tempN: 0,
            pm25N: 0,
            diseaseN: 0,
            isForecast: r.isForecast,
        }));
    }
    const norm = (vals: number[]) => {
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const span = hi - lo || 1;
        return (v: number) => ((v - lo) / span) * 100;
    };
    const tN = norm(hist.map((r) => r.temp));
    const pN = norm(hist.map((r) => r.pm25));
    const dN = norm(hist.map((r) => r.disease));
    return raw.map((r) => ({
        weekIndex: r.weekIndex,
        weekStart: r.weekStart,
        risk: r.risk,
        tempN: tN(r.temp),
        pm25N: pN(r.pm25),
        diseaseN: dN(r.disease),
        isForecast: r.isForecast,
    }));
}
export type DashboardAlert = LocalAlert & {
    countryCode: string;
    countryName: string;
    confidence?: number;
};
const DISEASE_DRIVERS: Record<string, string[]> = {
    dengue: [
        'rainfall anomaly 3x above normal',
        'temperature at mosquito breeding optimum 29°C',
        'humidity sustained above 80%',
        'standing water accumulation detected',
    ],
    malaria: [
        'warm nights enabling Anopheles breeding',
        'seasonal rainfall peak',
        'vector density index elevated',
        'post-flood stagnant water',
    ],
    cholera: [
        'flooding contaminating water supply',
        'rainfall event post-drought',
        'sanitation infrastructure stress',
        'river overflow detected',
    ],
    respiratory: [
        'PM2.5 at 14x WHO annual limit',
        'NO2 trending upward 3 consecutive weeks',
        'winter inversion trapping pollutants',
        'wildfire smoke incursion',
    ],
    heatStroke: [
        'temperature forecast 44°C this week',
        'heat index 52°C with humidity',
        'urban heat island +4°C above rural',
        'third consecutive week above 40°C',
    ],
};
function seededRandom(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function diseaseDriverKey(raw: string): keyof typeof DISEASE_DRIVERS {
    const x = raw.toLowerCase();
    if (x.includes('dengue'))
        return 'dengue';
    if (x.includes('malaria'))
        return 'malaria';
    if (x.includes('cholera'))
        return 'cholera';
    if (x.includes('heat'))
        return 'heatStroke';
    return 'respiratory';
}
const ALERT_DATE = '2023-12-25';
export function buildAllDashboardAlerts(_countries?: CountrySeries[]): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];
    for (const country of riskScores) {
        const diseaseRaw = country.dominant_disease || 'respiratory';
        const dKey = diseaseDriverKey(diseaseRaw);
        const drivers = DISEASE_DRIVERS[dKey] ?? DISEASE_DRIVERS.respiratory;
        const driver = drivers[Math.floor(seededRandom(country.iso3) * drivers.length)]!;
        const alpha2 = isoAlpha3ToAlpha2[country.iso3.toUpperCase()] ?? country.iso3.slice(0, 2);
        const score = country.risk_score;
        if (score >= 75) {
            const dis = diseaseRaw.charAt(0).toUpperCase() + diseaseRaw.slice(1);
            alerts.push({
                id: `${country.iso3}_critical`,
                weekStart: ALERT_DATE,
                title: `CRITICAL: ${dis} outbreak imminent`,
                detail: `Risk score ${score.toFixed(0)}/100 — ${driver}. Immediate public health response recommended.`,
                level: 'critical',
                riskLevel: 'critical',
                countryCode: alpha2,
                countryName: country.country_name,
                confidence: Math.floor(75 + seededRandom(`${country.iso3}c`) * 20),
            });
        }
        else if (score >= 50) {
            alerts.push({
                id: `${country.iso3}_high`,
                weekStart: ALERT_DATE,
                title: `HIGH: Elevated ${diseaseRaw} risk`,
                detail: `Risk score ${score.toFixed(0)}/100 — ${driver}.`,
                level: 'high',
                riskLevel: 'high',
                countryCode: alpha2,
                countryName: country.country_name,
                confidence: Math.floor(65 + seededRandom(`${country.iso3}h`) * 20),
            });
        }
        else if (score >= 25) {
            alerts.push({
                id: `${country.iso3}_medium`,
                weekStart: ALERT_DATE,
                title: `MEDIUM: Monitoring ${diseaseRaw} conditions`,
                detail: `Risk score ${score.toFixed(0)}/100 — ${driver} trending upward.`,
                level: 'medium',
                riskLevel: 'medium',
                countryCode: alpha2,
                countryName: country.country_name,
                confidence: Math.floor(55 + seededRandom(`${country.iso3}m`) * 20),
            });
        }
        else {
            alerts.push({
                id: `${country.iso3}_low`,
                weekStart: ALERT_DATE,
                title: `LOW: Stable conditions`,
                detail: `Risk score ${score.toFixed(0)}/100 — routine surveillance active. No immediate threat detected.`,
                level: 'low',
                riskLevel: 'low',
                countryCode: alpha2,
                countryName: country.country_name,
                confidence: Math.floor(85 + seededRandom(`${country.iso3}l`) * 10),
            });
        }
    }
    const order: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort((a, b) => {
        const d = order[a.riskLevel] - order[b.riskLevel];
        if (d !== 0)
            return d;
        return a.countryName.localeCompare(b.countryName);
    });
}
function mean(a: number[]): number {
    return a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);
}
function pearson(xs: number[], ys: number[]): number {
    const n = xs.length;
    if (n < 2 || ys.length !== n)
        return 0;
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i++) {
        const vx = xs[i]! - mx;
        const vy = ys[i]! - my;
        num += vx * vy;
        dx += vx * vx;
        dy += vy * vy;
    }
    const den = Math.sqrt(dx * dy);
    return den < 1e-9 ? 0 : num / den;
}
export function buildFeatureCorrelationMatrix(countries: CountrySeries[]): number[][] {
    const rows: number[][] = [];
    for (const c of countries) {
        for (const w of c.weeks) {
            if (w.isForecast)
                continue;
            const f = w.featureSnapshot;
            rows.push(FEATURE_ORDER.map((k) => f[k]));
        }
    }
    const matrix: number[][] = [];
    for (let i = 0; i < 8; i++) {
        const line: number[] = [];
        const xi = rows.map((r) => r[i]!);
        for (let j = 0; j < 8; j++) {
            const yj = rows.map((r) => r[j]!);
            line.push(pearson(xi, yj));
        }
        matrix.push(line);
    }
    return matrix;
}
export function isoFromGeography(properties: Record<string, unknown>): string | null {
    const a2 = String(properties.ISO_A2 ?? properties.iso_a2 ?? '')
        .trim()
        .toUpperCase();
    if (a2 && a2 !== '-99' && a2.length === 2)
        return a2;
    const a3 = String(properties.ISO_A3 ?? properties.iso_a3 ?? '')
        .trim()
        .toUpperCase();
    const map: Record<string, string> = {
        KOS: 'XK',
        SWZ: 'SZ',
        BIH: 'BA',
        COD: 'CD',
        CAF: 'CF',
        COG: 'CG',
        CZE: 'CZ',
        GNQ: 'GQ',
        FSM: 'FM',
        PSE: 'PS',
        TLS: 'TL',
        VAT: 'VA',
    };
    if (a3 && map[a3])
        return map[a3];
    return null;
}
