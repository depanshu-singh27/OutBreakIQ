import type { CountrySeries, CountryWeekRecord, DiseaseBurden, ShapFeatureKey } from '../../types';
import { compositeDiseaseLoad, dominantDiseaseName, FEATURE_ORDER, } from './dashboardModel';
export type DiseaseSpreadKey = keyof DiseaseBurden;
export type VelocityKind = 'surging' | 'stable' | 'declining';
export type DiseaseSpreadRow = {
    key: DiseaseSpreadKey;
    label: string;
    velocity: VelocityKind;
    velocityBadge: string;
    currentWeekly: number;
    wowPct: number;
    sparkline: {
        week: string;
        cases: number;
    }[];
    reasons: string[];
};
export type IntelAlertCard = {
    level: 'critical' | 'high' | 'medium';
    icon: string;
    title: string;
    body: string;
    peakDate: string;
    confidencePct: number;
};
const DISEASE_LABEL: Record<DiseaseSpreadKey, string> = {
    dengue: 'Dengue',
    malaria: 'Malaria',
    cholera: 'Cholera',
    respiratoryIllness: 'Respiratory illness',
    heatStroke: 'Heat stroke',
};
const DISEASE_SHAP_PRIORITY: Record<DiseaseSpreadKey, ShapFeatureKey[]> = {
    dengue: ['rainfall_spike', 'humidity_7d_avg', 'temperature_lag2w', 'seasonal_index', 'mobility_index'],
    malaria: ['rainfall_spike', 'humidity_7d_avg', 'temperature_lag2w', 'seasonal_index'],
    cholera: ['rainfall_spike', 'seasonal_index', 'humidity_7d_avg', 'population_density'],
    respiratoryIllness: ['pm25_trend', 'no2_30d', 'mobility_index', 'humidity_7d_avg'],
    heatStroke: ['temperature_lag2w', 'seasonal_index', 'humidity_7d_avg', 'population_density'],
};
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}
function hash32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
export function addDaysIso(weekStart: string, days: number): string {
    const d = new Date(`${weekStart}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function velocityFromWow(wow: number): {
    kind: VelocityKind;
    badge: string;
} {
    if (wow > 10)
        return { kind: 'surging', badge: 'Spreading Fast' };
    if (wow < -10)
        return { kind: 'declining', badge: 'Declining' };
    return { kind: 'stable', badge: 'Stable' };
}
export function shapFeatureReasonTag(key: ShapFeatureKey, snapshot: number, contribution: number): string {
    const sign = Math.sign(contribution) || 1;
    switch (key) {
        case 'rainfall_spike': {
            const mult = Math.max(1.2, 1 + Math.abs(snapshot) * 0.45 + (sign > 0 ? 0.35 : 0));
            return `🌧️ Rainfall was ~${mult.toFixed(1)}× above normal in recent weeks`;
        }
        case 'humidity_7d_avg': {
            const sticky = snapshot > 55;
            return sticky
                ? '🦟 Humidity is elevated — conditions favour mosquito breeding'
                : '💧 Humidity pattern is shifting transmission pressure';
        }
        case 'temperature_lag2w': {
            const t = 28 + Math.min(12, Math.abs(snapshot) * 4);
            return sign > 0
                ? `🌡️ Temperature averaging ~${t.toFixed(0)}\u00B0C — extends vector & heat risk`
                : '🌡️ Cooler lagged temperatures are moderating some pathways';
        }
        case 'pm25_trend': {
            const pm = Math.round(18 + Math.abs(snapshot) * 42);
            const who = Math.max(4, Math.round(pm / 5));
            return sign > 0
                ? `💨 PM2.5 near ${pm} \u03BCg/m\u00B3 — ~${who}× WHO safe limit (respiratory stress)`
                : '💨 Particulate levels trending lower than baseline';
        }
        case 'no2_30d':
            return sign > 0
                ? '🏭 Urban NO₂ elevated — combustion plumes adding respiratory load'
                : '🏭 NO₂ lower than typical for this density band';
        case 'population_density':
            return '👥 High population density accelerating contact & transmission';
        case 'seasonal_index':
            return sign > 0
                ? '📅 Seasonal phase aligns with historical disease peaks here'
                : '📅 Seasonal cycle currently dampening outbreak potential';
        case 'mobility_index':
            return sign > 0
                ? '🏙️ Mobility & mixing above baseline — faster pathogen spread'
                : '🏙️ Mobility below baseline — slightly slower mixing';
        default:
            return '';
    }
}
function reasonsForDisease(series: CountrySeries, latest: CountryWeekRecord, key: DiseaseSpreadKey): string[] {
    const priority = DISEASE_SHAP_PRIORITY[key];
    const entries = FEATURE_ORDER.map((k) => ({
        key: k,
        contribution: series.shap[k],
        snapshot: latest.featureSnapshot[k],
    })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const out: string[] = [];
    const used = new Set<ShapFeatureKey>();
    for (const k of priority) {
        const e = entries.find((x) => x.key === k);
        if (!e || used.has(e.key))
            continue;
        const tag = shapFeatureReasonTag(e.key, e.snapshot, e.contribution);
        if (tag) {
            out.push(tag);
            used.add(e.key);
        }
        if (out.length >= 2)
            break;
    }
    for (const e of entries) {
        if (out.length >= 3)
            break;
        if (used.has(e.key))
            continue;
        const tag = shapFeatureReasonTag(e.key, e.snapshot, e.contribution);
        if (tag) {
            out.push(tag);
            used.add(e.key);
        }
    }
    return out.slice(0, 3);
}
export function rankSpreadingDiseases(series: CountrySeries, latest: CountryWeekRecord): DiseaseSpreadRow[] {
    const hist = series.weeks.filter((w) => !w.isForecast);
    if (hist.length < 2)
        return [];
    const keys = Object.keys(DISEASE_LABEL) as DiseaseSpreadKey[];
    const ranked = keys.map((key) => {
        const last = hist[hist.length - 1]!.disease[key];
        const prev = hist[hist.length - 2]!.disease[key];
        const wowPct = ((last - prev) / Math.max(prev, 0.25)) * 100;
        const { kind, badge } = velocityFromWow(wowPct);
        const spark = hist.slice(-8).map((w) => ({
            week: w.weekStart.slice(5),
            cases: round1(w.disease[key]),
        }));
        return {
            key,
            label: DISEASE_LABEL[key],
            velocity: kind,
            velocityBadge: badge,
            currentWeekly: round1(last),
            wowPct,
            sparkline: spark,
            reasons: reasonsForDisease(series, latest, key),
        };
    });
    ranked.sort((a, b) => {
        const av = Math.abs(a.wowPct) + a.currentWeekly * 0.02;
        const bv = Math.abs(b.wowPct) + b.currentWeekly * 0.02;
        if (bv !== av)
            return bv - av;
        return b.currentWeekly - a.currentWeekly;
    });
    return ranked.slice(0, 5);
}
const SHAP_INTEL_HIGH = 52;
const INTEL_EXACT_TAGS: Record<ShapFeatureKey, string> = {
    temperature_lag2w: `${String.fromCodePoint(0x1f321)}\uFE0F Temperatures 2 weeks ago were above seasonal norm`,
    humidity_7d_avg: `${String.fromCodePoint(0x1f4a7)} Humidity above 80% — ideal pathogen conditions`,
    rainfall_spike: `${String.fromCodePoint(0x1f327)}\uFE0F Heavy rainfall anomaly detected 2-3 weeks ago`,
    pm25_trend: `${String.fromCodePoint(0x1f4a8)} PM2.5 trending upward — respiratory stress elevated`,
    no2_30d: `${String.fromCodePoint(0x1f3ed)}\uFE0F NO₂ levels elevated — air quality degraded`,
    population_density: `${String.fromCodePoint(0x1f465)} High population density accelerating spread`,
    seasonal_index: `${String.fromCodePoint(0x1f4c5)} Peak transmission season for this region`,
    mobility_index: `${String.fromCodePoint(0x1f6b6)} Elevated human mobility increasing exposure`,
};
function isShapFeatureHigh(key: ShapFeatureKey, latest: CountryWeekRecord): boolean {
    const v = latest.featureSnapshot[key];
    if (key === 'humidity_7d_avg')
        return v > SHAP_INTEL_HIGH || latest.humidityPct >= 80;
    return v > SHAP_INTEL_HIGH;
}
function intelExactReasonsForDisease(series: CountrySeries, latest: CountryWeekRecord, key: DiseaseSpreadKey): string[] {
    const priority = DISEASE_SHAP_PRIORITY[key];
    const out: string[] = [];
    for (const k of priority) {
        if (!isShapFeatureHigh(k, latest))
            continue;
        const tag = INTEL_EXACT_TAGS[k];
        if (tag && !out.includes(tag))
            out.push(tag);
        if (out.length >= 3)
            break;
    }
    if (out.length < 2) {
        const entries = FEATURE_ORDER.map((fk) => ({
            fk,
            snap: latest.featureSnapshot[fk],
            shap: series.shap[fk],
        }))
            .filter((e) => isShapFeatureHigh(e.fk, latest))
            .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
        for (const e of entries) {
            const tag = INTEL_EXACT_TAGS[e.fk];
            if (tag && !out.includes(tag))
                out.push(tag);
            if (out.length >= 3)
                break;
        }
    }
    return out.slice(0, 3);
}
function velocityIntelLabels(wow: number): {
    label: string;
    tone: 'surge' | 'decline' | 'stable';
} {
    if (wow > 15)
        return { label: '↑ Spreading Fast', tone: 'surge' };
    if (wow < -10)
        return { label: '↓ Declining', tone: 'decline' };
    return { label: '→ Stable', tone: 'stable' };
}
export type IntelDiseaseRow = {
    key: DiseaseSpreadKey;
    label: string;
    velocityLabel: string;
    velocityTone: 'surge' | 'decline' | 'stable';
    currentWeekly: number;
    wowPct: number;
    sparkline: {
        week: string;
        cases: number;
    }[];
    reasons: string[];
};
export function rankIntelDiseasesByCases(series: CountrySeries, latest: CountryWeekRecord): IntelDiseaseRow[] {
    const hist = series.weeks.filter((w) => !w.isForecast);
    if (hist.length < 2)
        return [];
    const keys = Object.keys(DISEASE_LABEL) as DiseaseSpreadKey[];
    const rows: IntelDiseaseRow[] = keys.map((key) => {
        const last = hist[hist.length - 1]!.disease[key];
        const prev = hist[hist.length - 2]!.disease[key];
        const wowPct = ((last - prev) / Math.max(prev, 0.25)) * 100;
        const vel = velocityIntelLabels(wowPct);
        const spark = hist.slice(-8).map((w) => ({
            week: w.weekStart.slice(5),
            cases: round1(w.disease[key]),
        }));
        return {
            key,
            label: DISEASE_LABEL[key],
            velocityLabel: vel.label,
            velocityTone: vel.tone,
            currentWeekly: round1(last),
            wowPct,
            sparkline: spark,
            reasons: intelExactReasonsForDisease(series, latest, key),
        };
    });
    rows.sort((a, b) => b.currentWeekly - a.currentWeekly);
    return rows;
}
export function buildIntelAlerts(series: CountrySeries, latest: CountryWeekRecord): IntelAlertCard[] {
    const h = hash32(series.countryCode + latest.weekStart);
    const dom = dominantDiseaseName(latest.disease);
    const cards: IntelAlertCard[] = [];
    if (latest.riskLevel === 'critical') {
        cards.push({
            level: 'critical',
            icon: '🚨',
            title: `${dom} outbreak risk — next 14 days`,
            body: `The ensemble flags sustained transmission pressure: environmental drivers and burden signals are aligned for a sharp rise in modeled ${dom.toLowerCase()} cases. Surveillance and vector control should be heightened through the predicted peak window.`,
            peakDate: addDaysIso(latest.weekStart, 10 + (h % 6)),
            confidencePct: 72 + (h % 23),
        });
    }
    else if (latest.riskLevel === 'high') {
        cards.push({
            level: 'high',
            icon: '⚠️',
            title: `${dom} surge watch — next 21 days`,
            body: `Weekly risk is elevated with accelerating burden in the synthetic panel. Rainfall, temperature, and mobility composites suggest conditions favourable for case growth unless countermeasures blunt the curve.`,
            peakDate: addDaysIso(latest.weekStart, 12 + (h % 9)),
            confidencePct: 64 + (h % 26),
        });
    }
    const load = compositeDiseaseLoad(latest.disease);
    const prev = series.weeks.filter((w) => !w.isForecast);
    const prevW = prev[prev.length - 2];
    if (prevW) {
        const prevLoad = compositeDiseaseLoad(prevW.disease);
        const jump = ((load - prevLoad) / Math.max(prevLoad, 1)) * 100;
        if (jump > 15 && cards.length < 4) {
            cards.push({
                level: 'medium',
                icon: '🟡',
                title: 'Composite burden rising week-over-week',
                body: `Total modeled case intensity increased by roughly ${jump.toFixed(0)}% versus last week. This pattern often precedes localized outbreaks when climate stressors persist.`,
                peakDate: addDaysIso(latest.weekStart, 7 + (h % 5)),
                confidencePct: 58 + (h % 20),
            });
        }
    }
    if (latest.pm25 > 55 && cards.length < 4) {
        cards.push({
            level: 'high',
            icon: '⚠️',
            title: 'Respiratory load from particulate air pollution',
            body: `PM2.5 is elevated in the current week snapshot. Vulnerable groups may see higher respiratory care demand even when vector-borne signals are stable.`,
            peakDate: addDaysIso(latest.weekStart, 4 + (h % 4)),
            confidencePct: 61 + (h % 18),
        });
    }
    return cards.slice(0, 5);
}
export function buildIntelAlertsForPanel(series: CountrySeries, latest: CountryWeekRecord): IntelAlertCard[] {
    if (latest.riskScore < 30)
        return [];
    const out = buildIntelAlerts(series, latest).slice(0, 4);
    const h = hash32(series.countryCode + latest.weekStart + 'intelpanel');
    const dom = dominantDiseaseName(latest.disease);
    if (out.length < 2) {
        out.push({
            level: 'high',
            icon: `${String.fromCodePoint(0x26a0)}\uFE0F`,
            title: `${dom} Outbreak Risk — 14 days`,
            body: `Forecast models highlight rising weekly burden for ${dom.toLowerCase()} in the synthetic climate-health panel. Environmental drivers and mobility patterns align with historical surge windows for this geography.`,
            peakDate: addDaysIso(latest.weekStart, 10 + (h % 6)),
            confidencePct: 62 + (h % 20),
        });
    }
    if (out.length < 2) {
        out.push({
            level: 'medium',
            icon: `${String.fromCodePoint(0x1f7e1)}`,
            title: 'Climate-health stress window',
            body: `Combined heat, humidity, and air quality signals are elevated versus baseline. The model treats this interval as elevated transmission uncertainty even when individual diseases remain heterogeneous.`,
            peakDate: addDaysIso(latest.weekStart, 7 + (h % 5)),
            confidencePct: 54 + (h % 18),
        });
    }
    return out.slice(0, 4);
}
export type CaseTimelinePoint = {
    weekStart: string;
    label: string;
    actual: number | null;
    predicted: number | null;
    bandLow: number | null;
    bandHigh: number | null;
    confStackBase: number | null;
    confStackSpan: number | null;
    isToday: boolean;
};
export function buildCaseTimeline(series: CountrySeries, forecastHorizonWeeks: number): CaseTimelinePoint[] {
    const hist = series.weeks.filter((w) => !w.isForecast).slice(-8);
    const fut = series.weeks.filter((w) => w.isForecast).slice(0, Math.max(1, Math.min(forecastHorizonWeeks, 12)));
    const points: CaseTimelinePoint[] = [];
    for (const w of hist) {
        const v = compositeDiseaseLoad(w.disease);
        points.push({
            weekStart: w.weekStart,
            label: w.weekStart.slice(5),
            actual: round1(v),
            predicted: null,
            bandLow: null,
            bandHigh: null,
            confStackBase: null,
            confStackSpan: null,
            isToday: false,
        });
    }
    if (points.length)
        points[points.length - 1]!.isToday = true;
    for (const w of fut) {
        const v = compositeDiseaseLoad(w.disease);
        const band = 4 + v * 0.08;
        const low = round1(Math.max(0, v - band));
        const high = round1(v + band);
        points.push({
            weekStart: w.weekStart,
            label: w.weekStart.slice(5),
            actual: null,
            predicted: round1(v),
            bandLow: low,
            bandHigh: high,
            confStackBase: low,
            confStackSpan: Math.max(0, high - low),
            isToday: false,
        });
    }
    return points;
}
export function forecastWeeksForHorizon(h: '7d' | '30d' | '90d'): number {
    switch (h) {
        case '7d':
            return 1;
        case '30d':
            return 4;
        case '90d':
            return 13;
        default:
            return 4;
    }
}
export type PrecautionItem = {
    text: string;
    icon: 'shield' | 'droplets' | 'wind' | 'sun' | 'users' | 'thermometer';
};
export type PrecautionBlock = {
    diseaseKey: DiseaseSpreadKey;
    title: string;
    items: PrecautionItem[];
};
const PRECAUTIONS: Record<DiseaseSpreadKey, PrecautionItem[]> = {
    dengue: [
        { icon: 'shield', text: 'Use mosquito repellent (DEET-based) especially at dawn and dusk.' },
        { icon: 'users', text: 'Wear long sleeves and trousers when vectors are active.' },
        { icon: 'droplets', text: 'Eliminate standing water around the home weekly.' },
        { icon: 'shield', text: 'Sleep under bed nets where dengue is circulating.' },
        {
            icon: 'thermometer',
            text: 'Seek medical attention for fever above 38.5\u00B0C lasting 2+ days.',
        },
    ],
    malaria: [
        { icon: 'shield', text: 'Take antimalarial prophylaxis if travelling to endemic areas.' },
        { icon: 'shield', text: 'Sleep under insecticide-treated bed nets.' },
        { icon: 'users', text: 'Wear protective clothing after dusk.' },
        { icon: 'shield', text: 'Avoid outdoor exposure between dusk and dawn when possible.' },
        {
            icon: 'thermometer',
            text: 'Seek immediate care for fever with chills or rigors.',
        },
    ],
    cholera: [
        { icon: 'droplets', text: 'Drink only bottled or boiled water.' },
        { icon: 'shield', text: 'Avoid raw seafood and unhygienic street food.' },
        { icon: 'droplets', text: 'Wash hands with soap before eating and after toilet use.' },
        { icon: 'droplets', text: 'Use oral rehydration salts for watery diarrhea.' },
        { icon: 'shield', text: 'Get vaccinated if cholera vaccine is available locally.' },
    ],
    respiratoryIllness: [
        { icon: 'wind', text: 'Wear N95 masks outdoors when AQI > 150.' },
        { icon: 'wind', text: 'Avoid strenuous outdoor exercise on pollution peaks.' },
        { icon: 'shield', text: 'Keep windows closed on high-pollution days.' },
        { icon: 'wind', text: 'Use a HEPA air purifier indoors if possible.' },
        { icon: 'droplets', text: 'Stay hydrated to help mucosal defenses.' },
    ],
    heatStroke: [
        { icon: 'sun', text: 'Stay indoors during peak heat (11am–4pm) when feasible.' },
        { icon: 'droplets', text: 'Drink 3–4L of water daily in extreme heat.' },
        { icon: 'sun', text: 'Wear loose, light-coloured, breathable clothing.' },
        { icon: 'users', text: 'Never leave children or elderly in parked vehicles.' },
        { icon: 'shield', text: 'Use public cooling centres if available during heat waves.' },
    ],
};
export function precautionsForThreats(rows: DiseaseSpreadRow[]): PrecautionBlock[] {
    const active = rows.filter((r) => r.currentWeekly > 0.5 || r.velocity === 'surging').slice(0, 4);
    const keys = active.length ? active.map((r) => r.key) : (['dengue', 'respiratoryIllness'] as DiseaseSpreadKey[]);
    const seen = new Set<DiseaseSpreadKey>();
    const out: PrecautionBlock[] = [];
    for (const k of keys) {
        if (seen.has(k))
            continue;
        seen.add(k);
        out.push({
            diseaseKey: k,
            title: `Precautions for ${DISEASE_LABEL[k]}`,
            items: PRECAUTIONS[k],
        });
    }
    return out;
}
export type IntelPrecautionIconKey = 'shield' | 'shirt' | 'droplets' | 'moon' | 'stethoscope' | 'pill' | 'mapPin' | 'fish' | 'hand' | 'heart' | 'syringe' | 'mask' | 'wind' | 'home' | 'zap' | 'car' | 'building' | 'sun';
export type IntelPrecautionRow = {
    icon: IntelPrecautionIconKey;
    text: string;
};
export const INTEL_PRECAUTION_ROWS: Record<DiseaseSpreadKey, IntelPrecautionRow[]> = {
    dengue: [
        { icon: 'shield', text: 'Use DEET mosquito repellent' },
        { icon: 'shirt', text: 'Wear long sleeves at dawn and dusk' },
        { icon: 'droplets', text: 'Eliminate standing water near home' },
        { icon: 'moon', text: 'Use bed nets while sleeping' },
        { icon: 'stethoscope', text: 'Seek care for fever above 38.5\u00B0C lasting 2+ days' },
    ],
    malaria: [
        { icon: 'pill', text: 'Take antimalarial prophylaxis if travelling' },
        { icon: 'moon', text: 'Sleep under insecticide-treated nets' },
        { icon: 'shirt', text: 'Wear protective clothing at night' },
        { icon: 'mapPin', text: 'Avoid outdoor activity dusk to dawn' },
        { icon: 'stethoscope', text: 'Seek immediate care for fever with chills' },
    ],
    cholera: [
        { icon: 'droplets', text: 'Drink only bottled or boiled water' },
        { icon: 'fish', text: 'Avoid raw seafood and street food' },
        { icon: 'hand', text: 'Wash hands with soap before eating' },
        { icon: 'heart', text: 'Use oral rehydration salts for diarrhea' },
        { icon: 'syringe', text: 'Get vaccinated if available locally' },
    ],
    respiratoryIllness: [
        { icon: 'mask', text: 'Wear N95 mask when AQI exceeds 150' },
        { icon: 'wind', text: 'Avoid outdoor exercise during pollution peaks' },
        { icon: 'home', text: 'Keep windows closed on high-pollution days' },
        { icon: 'zap', text: 'Use air purifier indoors' },
        { icon: 'droplets', text: 'Stay well hydrated' },
    ],
    heatStroke: [
        { icon: 'sun', text: 'Stay indoors between 11am and 4pm' },
        { icon: 'droplets', text: 'Drink 3 to 4 litres of water daily' },
        { icon: 'shirt', text: 'Wear loose light-coloured clothing' },
        { icon: 'car', text: 'Never leave children or elderly in parked cars' },
        { icon: 'building', text: 'Use cooling centres if available nearby' },
    ],
};
export type IntelPrecautionAccordion = {
    diseaseKey: DiseaseSpreadKey;
    title: string;
    items: IntelPrecautionRow[];
};
export function intelPrecautionAccordionBlocks(latest: CountryWeekRecord): IntelPrecautionAccordion[] {
    const keys = (Object.keys(latest.disease) as DiseaseSpreadKey[])
        .filter((k) => latest.disease[k] > 0)
        .sort((a, b) => latest.disease[b] - latest.disease[a]);
    return keys.map((k) => ({
        diseaseKey: k,
        title: `Precautions for ${DISEASE_LABEL[k]}`,
        items: INTEL_PRECAUTION_ROWS[k],
    }));
}
