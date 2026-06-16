import type { CountryWeekRecord } from '../../types';
import { buildPredictionTimeline, slicePredictionTimelineByHorizon, type RiskForecastHorizon, } from './myLocationModel';
export type RealWeather = {
    temperature: number;
    humidity: number;
    rainfall: number;
    windspeed: number;
    feelsLike: number;
};
export type RealAirQuality = {
    pm25: number;
    aqi: number;
};
export type OpenMeteoDaily = {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    relative_humidity_2m_max: number[];
};
export async function fetchRealWeather(lat: number, lng: number): Promise<RealWeather | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,apparent_temperature&daily=precipitation_sum&timezone=auto&forecast_days=1`;
        const res = await fetch(url);
        const data = (await res.json()) as {
            current?: {
                temperature_2m?: number;
                relative_humidity_2m?: number;
                precipitation?: number;
                wind_speed_10m?: number;
                apparent_temperature?: number;
            };
        };
        const current = data.current;
        if (current == null || current.temperature_2m === undefined)
            return null;
        return {
            temperature: parseFloat(Number(current.temperature_2m).toFixed(1)),
            humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
            rainfall: parseFloat((Number(current.precipitation ?? 0) * 7).toFixed(1)),
            windspeed: parseFloat(Number(current.wind_speed_10m ?? 0).toFixed(1)),
            feelsLike: parseFloat(Number(current.apparent_temperature ?? current.temperature_2m).toFixed(1)),
        };
    }
    catch (err) {
        console.error('Open-Meteo fetch failed:', err);
        return null;
    }
}
export async function fetchRealAirQuality(lat: number, lng: number): Promise<RealAirQuality | null> {
    try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,european_aqi`;
        const res = await fetch(url);
        const data = (await res.json()) as {
            current?: {
                pm2_5?: number;
                european_aqi?: number;
            };
        };
        const current = data.current;
        if (current?.pm2_5 === undefined && current?.european_aqi === undefined)
            return null;
        return {
            pm25: parseFloat(Number(current?.pm2_5 ?? 0).toFixed(1)),
            aqi: Math.round(Number(current?.european_aqi ?? 0)),
        };
    }
    catch (err) {
        console.error('Air quality fetch failed:', err);
        return null;
    }
}
export async function fetchForecast7(lat: number, lng: number): Promise<OpenMeteoDaily | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max&timezone=auto&forecast_days=7`;
        const res = await fetch(url);
        const data = (await res.json()) as {
            daily?: OpenMeteoDaily;
        };
        if (!data.daily?.time?.length)
            return null;
        return data.daily;
    }
    catch {
        return null;
    }
}
function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}
export function riskTimelineFromOpenMeteoDaily(daily: OpenMeteoDaily, baselineRisk: number): Array<{
    day: number;
    mid: number;
    low: number;
    high: number;
}> {
    const n = Math.min(7, daily.time.length);
    const out: Array<{
        day: number;
        mid: number;
        low: number;
        high: number;
    }> = [];
    for (let i = 0; i < n; i++) {
        const tmax = Number(daily.temperature_2m_max[i] ?? 22);
        const tmin = Number(daily.temperature_2m_min[i] ?? tmax - 6);
        const pr = Number(daily.precipitation_sum[i] ?? 0);
        const hum = Number(daily.relative_humidity_2m_max[i] ?? 60);
        const heatStress = clamp((tmax - 20) / 22, 0, 1) * 28;
        const rainStress = clamp(pr / 35, 0, 1) * 18;
        const humStress = clamp((hum - 45) / 45, 0, 1) * 12;
        const mid = clamp(baselineRisk * 0.5 + heatStress + rainStress + humStress + (tmax - tmin) * 0.4, 0, 100);
        const w = 3 + i * 0.6;
        out.push({
            day: i + 1,
            mid,
            low: Math.max(0, mid - w),
            high: Math.min(100, mid + w),
        });
    }
    return out;
}
export function buildMergedPredictionChartData(latestWeek: CountryWeekRecord, daily: OpenMeteoDaily | null, horizon: RiskForecastHorizon): Array<{
    day: number;
    mid: number;
    low: number;
    high: number;
}> {
    const base = buildPredictionTimeline(latestWeek);
    if (!daily?.time?.length)
        return slicePredictionTimelineByHorizon(base, horizon);
    const om = riskTimelineFromOpenMeteoDaily(daily, latestWeek.riskScore);
    const map = new Map<number, {
        day: number;
        mid: number;
        low: number;
        high: number;
    }>();
    for (const p of base) {
        if (p.day > 7)
            map.set(p.day, p);
    }
    const d0 = base.find((p) => p.day === 0);
    if (d0)
        map.set(0, d0);
    for (const p of om)
        map.set(p.day, p);
    const merged = [...map.keys()]
        .sort((a, b) => a - b)
        .map((d) => map.get(d)!);
    return slicePredictionTimelineByHorizon(merged, horizon);
}
