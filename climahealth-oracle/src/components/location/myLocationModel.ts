import type { CountrySeries, CountryWeekRecord, RiskLevel, ShapFeatureKey } from '../../types';
export type LocalAlert = {
    id: string;
    weekStart: string;
    title: string;
    detail: string;
    level: RiskLevel;
    riskLevel: RiskLevel;
    confidence?: number;
};
export function getLatestHistoricalWeek(series: CountrySeries): CountryWeekRecord | undefined {
    const hist = series.weeks.filter((w) => !w.isForecast);
    return hist[hist.length - 1];
}
export function buildCountryAlerts(series: CountrySeries, limit = 8): LocalAlert[] {
    const alerts: LocalAlert[] = [];
    const weeks = series.weeks.filter((w) => !w.isForecast);
    for (let i = 1; i < weeks.length; i++) {
        const w = weeks[i]!;
        const prev = weeks[i - 1]!;
        if (w.riskLevel === 'critical' || w.riskLevel === 'high') {
            alerts.push({
                id: `${w.countryCode}-${w.weekStart}-lvl`,
                weekStart: w.weekStart,
                title: `${w.riskLevel === 'critical' ? 'Critical' : 'High'} climate–health risk`,
                detail: `Risk score reached ${w.riskScore.toFixed(0)} with ${w.riskLevel} burden signals.`,
                level: w.riskLevel,
                riskLevel: w.riskLevel,
            });
        }
        const jump = w.riskScore - prev.riskScore;
        if (jump >= 12 && w.riskScore >= 40) {
            alerts.push({
                id: `${w.countryCode}-${w.weekStart}-jump`,
                weekStart: w.weekStart,
                title: 'Sharp risk increase',
                detail: `Weekly risk rose by ${jump.toFixed(0)} points — review environmental drivers.`,
                level: w.riskScore >= 70 ? 'high' : 'medium',
                riskLevel: w.riskScore >= 70 ? 'high' : 'medium',
            });
        }
    }
    alerts.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const seen = new Set<string>();
    const unique = alerts.filter((a) => {
        if (seen.has(a.id))
            return false;
        seen.add(a.id);
        return true;
    });
    return unique.slice(0, limit);
}
const SHAP_META: Record<ShapFeatureKey, {
    label: string;
    IconHint: string;
    explain: (ctx: {
        snapshot: number;
        sign: number;
    }) => string;
}> = {
    temperature_lag2w: {
        label: 'Temperature (2-week lag)',
        IconHint: 'thermometer',
        explain: ({ snapshot, sign }) => {
            const dir = sign >= 0 ? 'elevated' : 'cooler-than-usual';
            return `Temperature pattern is ${dir} versus the seasonal norm (lagged signal ≈ ${snapshot.toFixed(1)}). This shifts vector exposure and heat-stroke potential.`;
        },
    },
    humidity_7d_avg: {
        label: 'Humidity (7-week average)',
        IconHint: 'droplets',
        explain: ({ snapshot, sign }) => {
            const s = sign >= 0 ? 'stickier air than usual' : 'drier air than usual';
            return `Recent humidity has been ${s} (rolling index ${snapshot.toFixed(0)}), which ${sign >= 0 ? 'supports mosquito breeding and heat stress' : 'moderates some vector pressure'}.`;
        },
    },
    rainfall_spike: {
        label: 'Rainfall spike',
        IconHint: 'cloud-rain',
        explain: ({ snapshot, sign }) => {
            const pct = Math.min(280, Math.round(85 + Math.abs(snapshot) * 48 + (sign >= 0 ? 22 : 0)));
            return `Rainfall was about ${pct}% above normal for the past couple of weeks — ${sign >= 0 ? 'this is often the #1 driver when dengue risk spikes together with heat' : 'drier trends are tempering waterborne and vector pressure'}.`;
        },
    },
    pm25_trend: {
        label: 'PM2.5 trend',
        IconHint: 'wind',
        explain: ({ snapshot, sign }) => {
            return `Fine particulate trend is ${sign >= 0 ? 'worsening' : 'improving'} (trend index ${snapshot.toFixed(1)}), ${sign >= 0 ? 'pushing respiratory illness risk' : 'easing respiratory pressure'}.`;
        },
    },
    no2_30d: {
        label: 'NO₂ (30-day context)',
        IconHint: 'factory',
        explain: ({ snapshot, sign }) => {
            return `Traffic and combustion signals (${snapshot.toFixed(0)} index) are ${sign >= 0 ? 'elevated' : 'below typical'} for your density band — this nudges cardio-respiratory vulnerability.`;
        },
    },
    population_density: {
        label: 'Population density',
        IconHint: 'users',
        explain: ({ snapshot }) => {
            return `Your country’s average density context scores ${snapshot.toFixed(0)}/100 — denser settlement patterns amplify exposure to pollution and rapid outbreak spread.`;
        },
    },
    seasonal_index: {
        label: 'Seasonal cycle',
        IconHint: 'calendar',
        explain: ({ snapshot, sign }) => {
            return `You are ${sign >= 0 ? 'in a higher-risk phase' : 'in a relatively lower phase'} of the seasonal cycle (index ${snapshot.toFixed(2)}), which aligns with historical disease peaks in this region.`;
        },
    },
    mobility_index: {
        label: 'Mobility / mixing',
        IconHint: 'activity',
        explain: ({ snapshot, sign }) => {
            return `Mobility mixing is ${sign >= 0 ? 'above' : 'below'} the model baseline (index ${snapshot.toFixed(0)}), ${sign >= 0 ? 'increasing encounter rates for respiratory pathogens' : 'slightly dampening transmission potential'}.`;
        },
    },
};
export type ShapDriverCard = {
    rank: number;
    key: ShapFeatureKey;
    title: string;
    body: string;
    contribution: number;
};
export function topShapDrivers(series: CountrySeries, latest: CountryWeekRecord, diseaseLabel: string, topN = 3): ShapDriverCard[] {
    const snap = latest.featureSnapshot;
    const entries = (Object.keys(series.shap) as ShapFeatureKey[]).map((key) => ({
        key,
        contribution: series.shap[key],
        snapshot: snap[key],
    }));
    entries.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    return entries.slice(0, topN).map((e, i) => {
        const meta = SHAP_META[e.key];
        const sign = Math.sign(e.contribution);
        const body = `${meta.explain({ snapshot: e.snapshot, sign })} In the model attribution for ${diseaseLabel}, this factor ranks #${i + 1}.`;
        return {
            rank: i + 1,
            key: e.key,
            title: meta.label,
            body,
            contribution: e.contribution,
        };
    });
}
export function diseaseBarValues(latest: CountryWeekRecord): {
    key: keyof CountryWeekRecord['disease'];
    label: string;
    value: number;
    max: number;
}[] {
    const d = latest.disease;
    const entries = [
        { key: 'dengue' as const, label: 'Dengue', value: d.dengue },
        { key: 'malaria' as const, label: 'Malaria', value: d.malaria },
        { key: 'cholera' as const, label: 'Cholera', value: d.cholera },
        { key: 'respiratoryIllness' as const, label: 'Respiratory', value: d.respiratoryIllness },
        { key: 'heatStroke' as const, label: 'Heat stroke', value: d.heatStroke },
    ];
    const max = Math.max(...entries.map((e) => e.value), 1);
    return entries.map((e) => ({ ...e, max }));
}
export function buildPredictionTimeline(latest: CountryWeekRecord): Array<{
    day: number;
    mid: number;
    low: number;
    high: number;
}> {
    const now = latest.riskScore;
    const p7 = latest.prediction7d;
    const p30 = latest.prediction30d;
    const p90 = latest.prediction90d;
    const points = [0, 7, 30, 90];
    const values = [now, p7, p30, p90];
    const lerp = (t: number, a: number, b: number, ta: number, tb: number) => a + ((t - ta) / (tb - ta)) * (b - a);
    const interp = (day: number): number => {
        if (day <= 0)
            return values[0]!;
        if (day >= 90)
            return values[3]!;
        for (let i = 0; i < points.length - 1; i++) {
            const d0 = points[i]!;
            const d1 = points[i + 1]!;
            if (day >= d0 && day <= d1) {
                return lerp(day, values[i]!, values[i + 1]!, d0, d1);
            }
        }
        return values[3]!;
    };
    const band = (day: number) => 2 + (day / 90) * 9;
    const out: Array<{
        day: number;
        mid: number;
        low: number;
        high: number;
    }> = [];
    for (let day = 0; day <= 90; day += 3) {
        const mid = interp(day);
        const w = band(day);
        out.push({
            day,
            mid,
            low: Math.max(0, mid - w),
            high: Math.min(100, mid + w),
        });
    }
    return out;
}
export function whatIfRisk(baseRisk: number, tempOffset: number, pmOffset: number, rainOffset: number): number {
    const raw = baseRisk + tempOffset * 1.2 + pmOffset * 0.08 + rainOffset * 0.05;
    return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}
export function whatIfRiskTriple(latest: CountryWeekRecord, tempOffset: number, pmOffset: number, rainOffset: number): {
    d7: number;
    d30: number;
    d90: number;
} {
    return {
        d7: whatIfRisk(latest.prediction7d, tempOffset, pmOffset, rainOffset),
        d30: whatIfRisk(latest.prediction30d, tempOffset, pmOffset, rainOffset),
        d90: whatIfRisk(latest.prediction90d, tempOffset, pmOffset, rainOffset),
    };
}
export type RiskForecastHorizon = '7d' | '30d' | '90d';
export function slicePredictionTimelineByHorizon(timeline: Array<{
    day: number;
    mid: number;
    low: number;
    high: number;
}>, horizon: RiskForecastHorizon): Array<{
    day: number;
    mid: number;
    low: number;
    high: number;
}> {
    const maxDay = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
    return timeline.filter((p) => p.day <= maxDay);
}
export function metricStatus(kind: 'temp' | 'humidity' | 'rain' | 'pm25' | 'aqi', value: number): 'good' | 'moderate' | 'bad' | 'severe' {
    switch (kind) {
        case 'temp':
            if (value < 18 || value > 36)
                return 'severe';
            if (value < 20 || value > 32)
                return 'bad';
            if (value < 22 || value > 30)
                return 'moderate';
            return 'good';
        case 'humidity':
            if (value < 25 || value > 92)
                return 'bad';
            if (value < 35 || value > 85)
                return 'moderate';
            return 'good';
        case 'rain':
            if (value > 180)
                return 'severe';
            if (value > 90)
                return 'bad';
            if (value > 45)
                return 'moderate';
            return 'good';
        case 'pm25':
            if (value > 75)
                return 'severe';
            if (value > 35)
                return 'bad';
            if (value > 12)
                return 'moderate';
            return 'good';
        case 'aqi':
            if (value > 150)
                return 'severe';
            if (value > 100)
                return 'bad';
            if (value > 50)
                return 'moderate';
            return 'good';
        default:
            return 'moderate';
    }
}
export function riskLevelLabel(level: RiskLevel): string {
    switch (level) {
        case 'low':
            return 'Low';
        case 'medium':
            return 'Medium';
        case 'high':
            return 'High';
        case 'critical':
            return 'Critical';
        default:
            return level;
    }
}
