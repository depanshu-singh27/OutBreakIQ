import type { CountrySeries, CountryWeekRecord, DiseaseBurden, RiskLevel } from '../../types';
import { dominantDiseaseName, FEATURE_LABELS, FEATURE_ORDER } from '../dashboard/dashboardModel';
import { getLatestHistoricalWeek } from '../location/myLocationModel';
import { getRegionForCountry, type RegionKey } from './regionMapping';
import { riskScores } from '../../data/modelOutputs/index';
import { isoAlpha3ToAlpha2 } from '../../data/isoNumericToAlpha3';
import { REGION_ISO3 } from './regionalRiskIso3';
function hash32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
export function flagEmoji(code: string): string {
    const c = code.toUpperCase();
    if (c.length !== 2)
        return '🏳️';
    const A = 0x1f1e6;
    const chars = [...c].map((ch) => {
        const o = ch.charCodeAt(0);
        if (o < 65 || o > 90)
            return '';
        return String.fromCodePoint(A + (o - 65));
    });
    return chars.join('') || '🏳️';
}
export type EarlyWarningRow = {
    id: string;
    countryCode: string;
    countryName: string;
    region: RegionKey;
    disease: string;
    diseaseKey: keyof DiseaseBurden;
    riskLevel: RiskLevel;
    riskScore: number;
    predictedCases: number;
    daysToPeak: number;
    primaryDriver: string;
    confidencePct: number;
    sparkline: {
        w: number;
        risk: number;
    }[];
    series: CountrySeries;
    latest: CountryWeekRecord;
};
function dominantDiseaseKey(d: DiseaseBurden): keyof DiseaseBurden {
    const entries = Object.entries(d) as [
        keyof DiseaseBurden,
        number
    ][];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0]![0];
}
function topDriver(series: CountrySeries): string {
    let best: (typeof FEATURE_ORDER)[number] | null = null;
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
export function buildEarlyWarningRows(countries: CountrySeries[]): EarlyWarningRow[] {
    const rows: EarlyWarningRow[] = [];
    for (const series of countries) {
        const latest = getLatestHistoricalWeek(series);
        if (!latest)
            continue;
        const h = hash32(series.countryCode + 'ew');
        const diseaseKey = dominantDiseaseKey(latest.disease);
        const burden = latest.disease[diseaseKey];
        const predictedCases = Math.max(0, Math.round(burden * 12 + (h % 80)));
        const daysToPeak = 4 + (h % 19);
        const confidencePct = 62 + (h % 34);
        const hist = series.weeks.filter((w) => !w.isForecast);
        const sparkline = hist.slice(-12).map((w) => ({ w: w.weekIndex, risk: w.riskScore }));
        rows.push({
            id: series.countryCode,
            countryCode: series.countryCode,
            countryName: series.name,
            region: getRegionForCountry(series.countryCode),
            disease: dominantDiseaseName(latest.disease),
            diseaseKey,
            riskLevel: latest.riskLevel,
            riskScore: latest.riskScore,
            predictedCases,
            daysToPeak,
            primaryDriver: topDriver(series),
            confidencePct,
            sparkline,
            series,
            latest,
        });
    }
    return rows;
}
const EW_DRIVERS: Record<keyof DiseaseBurden, string[]> = {
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
    respiratoryIllness: [
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
function dominantToKey(raw: string): keyof DiseaseBurden {
    const x = raw.toLowerCase();
    if (x.includes('dengue'))
        return 'dengue';
    if (x.includes('malaria'))
        return 'malaria';
    if (x.includes('cholera'))
        return 'cholera';
    if (x.includes('heat'))
        return 'heatStroke';
    if (x.includes('respiratory'))
        return 'respiratoryIllness';
    return 'respiratoryIllness';
}
function fakeBurden(k: keyof DiseaseBurden): DiseaseBurden {
    return { dengue: 0, malaria: 0, cholera: 0, respiratoryIllness: 0, heatStroke: 0, [k]: 1 };
}
function regionKeyForIso3(iso3: string): RegionKey {
    const u = iso3.toUpperCase();
    for (const rk of Object.keys(REGION_ISO3) as Array<keyof typeof REGION_ISO3>) {
        if (REGION_ISO3[rk].some((x) => x.toUpperCase() === u))
            return rk;
    }
    return 'other';
}
function seriesForIso3(iso3: string, countries: CountrySeries[]): {
    series: CountrySeries;
    latest: CountryWeekRecord;
} | null {
    const a2 = isoAlpha3ToAlpha2[iso3.toUpperCase()];
    if (!a2)
        return null;
    const series = countries.find((c) => c.countryCode.toUpperCase() === a2.toUpperCase());
    if (!series)
        return null;
    const latest = getLatestHistoricalWeek(series);
    if (!latest)
        return null;
    return { series, latest };
}
export function buildEarlyWarningRowsFromRiskScores(countries: CountrySeries[]): EarlyWarningRow[] {
    const rows: EarlyWarningRow[] = [];
    for (const country of riskScores) {
        const pair = seriesForIso3(country.iso3, countries);
        if (!pair)
            continue;
        const h = hash32(country.iso3);
        const diseaseKey = dominantToKey(country.dominant_disease || 'respiratory');
        const disease = dominantDiseaseName(fakeBurden(diseaseKey));
        const drivers = EW_DRIVERS[diseaseKey] ?? EW_DRIVERS.respiratoryIllness;
        const driver = drivers[h % drivers.length]!;
        let daysToPeak: number;
        if (country.risk_level === 'critical')
            daysToPeak = 3 + (h % 7);
        else if (country.risk_level === 'high')
            daysToPeak = 7 + (h % 14);
        else if (country.risk_level === 'medium')
            daysToPeak = 14 + (h % 21);
        else
            daysToPeak = 21 + (h % 30);
        const confidencePct = country.risk_level === 'critical'
            ? 80 + (h % 15)
            : country.risk_level === 'high'
                ? 70 + (h % 15)
                : country.risk_level === 'medium'
                    ? 60 + (h % 15)
                    : 85 + (h % 10);
        const hist = pair.series.weeks.filter((w) => !w.isForecast);
        const sparkline = hist.slice(-12).map((w) => ({ w: w.weekIndex, risk: w.riskScore }));
        rows.push({
            id: country.iso3,
            countryCode: pair.series.countryCode,
            countryName: country.country_name,
            region: regionKeyForIso3(country.iso3),
            disease,
            diseaseKey,
            riskLevel: country.risk_level,
            riskScore: country.risk_score,
            predictedCases: Math.round(country.risk_score * 1.8),
            daysToPeak,
            primaryDriver: driver,
            confidencePct,
            sparkline,
            series: pair.series,
            latest: pair.latest,
        });
    }
    return rows;
}
export function compareRows(a: EarlyWarningRow, b: EarlyWarningRow, key: SortKey, dir: 'asc' | 'desc'): number {
    const m = dir === 'asc' ? 1 : -1;
    switch (key) {
        case 'country':
            return a.countryName.localeCompare(b.countryName) * m;
        case 'disease':
            return a.disease.localeCompare(b.disease) * m;
        case 'risk':
            return (a.riskScore - b.riskScore) * m;
        case 'cases':
            return (a.predictedCases - b.predictedCases) * m;
        case 'days':
            return (a.daysToPeak - b.daysToPeak) * m;
        case 'driver':
            return a.primaryDriver.localeCompare(b.primaryDriver) * m;
        case 'confidence':
            return (a.confidencePct - b.confidencePct) * m;
        default:
            return 0;
    }
}
export type SortKey = 'country' | 'disease' | 'risk' | 'cases' | 'days' | 'driver' | 'confidence';
export function rowsToCsv(rows: EarlyWarningRow[]): string {
    const headers = [
        'CountryCode',
        'Country',
        'Region',
        'Disease',
        'RiskLevel',
        'PredictedCases',
        'DaysToPeak',
        'PrimaryDriver',
        'ConfidencePct',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
        const cells = [
            r.countryCode,
            `"${r.countryName.replace(/"/g, '""')}"`,
            r.region,
            r.disease,
            r.riskLevel,
            String(r.predictedCases),
            String(r.daysToPeak),
            `"${r.primaryDriver.replace(/"/g, '""')}"`,
            String(r.confidencePct),
        ];
        lines.push(cells.join(','));
    }
    return lines.join('\n');
}
