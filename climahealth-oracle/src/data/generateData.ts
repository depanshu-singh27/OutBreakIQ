import type { CountrySeries, CountryWeekRecord, DiseaseBurden, GeneratedClimateHealthDataset, RiskLevel, ShapContributions, ShapFeatureKey, } from '../types';
import unCountries from './unCountries.json';
import { isoAlpha3ToAlpha2 } from './isoNumericToAlpha3';
import { riskScores } from './modelOutputs/index';
export const countryLatitudes: Record<string, number> = {
    IND: 20,
    USA: 38,
    GBR: 52,
    CHN: 35,
    JPN: 36,
    DEU: 51,
    FRA: 46,
    BRA: -10,
    AUS: -25,
    CAN: 56,
    RUS: 60,
    ZAF: -29,
    NGA: 9,
    EGY: 26,
    SAU: 24,
    PAK: 30,
    BGD: 24,
    IDN: -5,
    MEX: 23,
    ARG: -34,
    THA: 15,
    VNM: 16,
    PHL: 13,
    MMR: 17,
    KHM: 12,
    LAO: 18,
    MYS: 3,
    SGP: 1,
    LKA: 7,
    NPL: 28,
    BTN: 27,
};
const SHAP_KEYS: ShapFeatureKey[] = [
    'temperature_lag2w',
    'humidity_7d_avg',
    'rainfall_spike',
    'pm25_trend',
    'no2_30d',
    'population_density',
    'seasonal_index',
    'mobility_index',
];
export const HISTORICAL_WEEKS = 104;
export const FORECAST_WEEKS = 12;
export const TOTAL_WEEKS = HISTORICAL_WEEKS + FORECAST_WEEKS;
export const LAST_HISTORICAL_WEEK_INDEX = HISTORICAL_WEEKS - 1;
export const DEFAULT_ANCHOR_WEEK_START_UTC = '2023-12-25';
function hash32(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function combineSeed(parts: (string | number)[]): number {
    let acc = 374761393;
    for (const p of parts) {
        const s = typeof p === 'number' ? String(p) : p;
        acc = Math.imul(acc ^ hash32(s), 2654435761) >>> 0;
    }
    return acc >>> 0;
}
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function uniform(rng: () => number, min: number, max: number): number {
    return min + rng() * (max - min);
}
function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}
function parseAnchorMonday(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
function addDaysUtc(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 86400000);
}
function isoDateUtc(d: Date): string {
    return d.toISOString().slice(0, 10);
}
function midpointUtc(weekStart: Date): Date {
    return addDaysUtc(weekStart, 3);
}
function dayOfYearUtc(d: Date): number {
    const y = d.getUTCFullYear();
    const start = Date.UTC(y, 0, 0);
    return Math.floor((d.getTime() - start) / 86400000);
}
function isoWeekNumberUtc(d: Date): number {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
const ISO2_TO_ISO3: Record<string, string> = (() => {
    const m: Record<string, string> = {};
    for (const [a3, a2] of Object.entries(isoAlpha3ToAlpha2)) {
        m[String(a2).toUpperCase()] = a3;
    }
    return m;
})();
const PM25_BY_COUNTRY: Record<string, number> = {
    BGD: 142,
    PAK: 118,
    IND: 102,
    CHN: 88,
    NPL: 95,
    NGA: 72,
    EGY: 68,
    KWT: 65,
    QAT: 58,
    SAU: 55,
    IRN: 58,
    IRQ: 62,
    VNM: 52,
    IDN: 48,
    PHL: 42,
    THA: 38,
    MMR: 45,
    KHM: 35,
    KEN: 28,
    TZA: 25,
    ETH: 22,
    GHA: 32,
    CMR: 30,
    COD: 26,
    BRA: 14,
    MEX: 22,
    COL: 18,
    ARG: 12,
    PER: 16,
    BOL: 15,
    DEU: 11,
    FRA: 10,
    GBR: 9,
    ITA: 13,
    ESP: 11,
    POL: 18,
    USA: 8,
    CAN: 7,
    AUS: 6,
    NZL: 5,
    JPN: 12,
    KOR: 25,
    RUS: 15,
    UKR: 16,
    TUR: 28,
    ZAF: 20,
    MAR: 32,
    DZA: 38,
    LBY: 42,
    SDN: 35,
    SSD: 22,
    MLI: 28,
    NER: 30,
    TCD: 25,
    HTI: 25,
    CUB: 18,
    DOM: 20,
    GTM: 22,
    HND: 20,
    SLV: 18,
    SWE: 6,
    NOR: 5,
    FIN: 6,
    DNK: 8,
    NLD: 10,
    BEL: 11,
    CHE: 9,
    AUT: 10,
    CZE: 14,
    HUN: 14,
    ROU: 16,
    BGR: 15,
    GRC: 13,
    PRT: 9,
    IRL: 7,
    SGP: 18,
    MYS: 20,
    BRN: 15,
    LKA: 22,
    BTN: 28,
    MDV: 12,
    MNG: 35,
    KAZ: 22,
    UZB: 38,
};
function seededRandom(key: string): number {
    return mulberry32(combineSeed([key, 'env']))();
}
export function getPM25(iso3: string, latitude: number): number {
    const u = iso3.toUpperCase();
    if (PM25_BY_COUNTRY[u] != null) {
        return clamp(PM25_BY_COUNTRY[u] + seededRandom(u) * 10 - 5, 2, 200);
    }
    const absLat = Math.abs(latitude);
    if (absLat < 15)
        return clamp(25 + seededRandom(`${u}|lat`) * 20, 5, 150);
    if (absLat < 30)
        return clamp(40 + seededRandom(`${u}|lat`) * 40, 5, 150);
    if (absLat < 45)
        return clamp(15 + seededRandom(`${u}|lat`) * 20, 5, 150);
    return clamp(8 + seededRandom(`${u}|lat`) * 8, 5, 150);
}
const COUNTRY_TEMP_BASE: Record<string, number> = {
    IND: 32,
    BGD: 33,
    PAK: 36,
    LKA: 31,
    NPL: 28,
    BTN: 22,
    THA: 34,
    VNM: 32,
    PHL: 32,
    IDN: 29,
    MYS: 30,
    MMR: 33,
    KHM: 34,
    LAO: 34,
    SGP: 30,
    BRN: 30,
    TLS: 30,
    NGA: 35,
    GHA: 32,
    ETH: 28,
    KEN: 26,
    TZA: 27,
    UGA: 25,
    COD: 27,
    CMR: 28,
    SEN: 33,
    MLI: 38,
    NER: 40,
    BFA: 36,
    TCD: 38,
    SDN: 38,
    SSD: 33,
    AGO: 28,
    MOZ: 27,
    ZMB: 26,
    ZWE: 24,
    ZAF: 18,
    MDG: 24,
    RWA: 22,
    BDI: 24,
    EGY: 28,
    LBY: 26,
    DZA: 24,
    MAR: 22,
    TUN: 20,
    SAU: 35,
    ARE: 36,
    QAT: 35,
    KWT: 36,
    BHR: 34,
    OMN: 35,
    YEM: 33,
    IRQ: 30,
    IRN: 20,
    SYR: 20,
    LBN: 18,
    JOR: 22,
    ISR: 20,
    CHN: 18,
    JPN: 16,
    KOR: 14,
    MNG: 8,
    USA: 15,
    CAN: 8,
    MEX: 22,
    GTM: 22,
    HND: 28,
    CRI: 24,
    BRA: 26,
    COL: 22,
    VEN: 28,
    PER: 20,
    BOL: 18,
    ARG: 16,
    CHL: 12,
    PRY: 24,
    URY: 16,
    ECU: 20,
    DEU: 12,
    FRA: 13,
    GBR: 11,
    ESP: 16,
    ITA: 15,
    GRC: 17,
    PRT: 16,
    NLD: 11,
    BEL: 11,
    CHE: 10,
    AUT: 11,
    SWE: 6,
    NOR: 5,
    FIN: 4,
    DNK: 9,
    POL: 11,
    CZE: 11,
    HUN: 13,
    ROU: 14,
    BGR: 14,
    HRV: 14,
    SRB: 14,
    MKD: 14,
    ALB: 15,
    RUS: 5,
    UKR: 12,
    BLR: 9,
    MDA: 13,
    TUR: 14,
    AZE: 16,
    GEO: 14,
    ARM: 12,
    KAZ: 10,
    UZB: 20,
    AUS: 20,
    NZL: 14,
    PNG: 27,
    FJI: 27,
};
export function getTemperature(iso3: string, latitude: number, week: number): number {
    const u = iso3.toUpperCase();
    const base = COUNTRY_TEMP_BASE[u] ?? 28 - Math.abs(latitude) * 0.45;
    const isNorthern = latitude >= 0;
    const seasonalOffset = isNorthern
        ? 5 * Math.sin((2 * Math.PI * (week - 13)) / 52)
        : 5 * Math.sin((2 * Math.PI * (week - 39)) / 52);
    return parseFloat((base + seasonalOffset + (seededRandom(`${u}|${week}`) * 3 - 1.5)).toFixed(1));
}
function monsoonAsiaWeight(code: string, lat: number, lng: number): number {
    const monsoonCore = new Set([
        'IN',
        'BD',
        'BT',
        'NP',
        'LK',
        'MV',
        'MM',
        'TH',
        'LA',
        'KH',
        'VN',
        'PH',
        'MY',
        'BN',
        'SG',
        'TL',
    ]);
    if (monsoonCore.has(code))
        return 1;
    if (code === 'PK' && lat < 31 && lng > 66 && lng < 78)
        return 0.55;
    if (code === 'ID' && lat > -11 && lng < 128)
        return 0.75;
    if (lat >= 5 && lat <= 35 && lng >= 78 && lng <= 106)
        return 0.35;
    return 0;
}
function hemisphere(lat: number): 'N' | 'S' | 'E' {
    if (Math.abs(lat) < 10)
        return 'E';
    return lat >= 0 ? 'N' : 'S';
}
function aqiFromPm25(ug: number): number {
    const c = ug;
    if (c <= 12)
        return clamp((50 / 12) * c, 0, 50);
    if (c <= 35.4)
        return clamp(51 + (49 / (35.4 - 12.1)) * (c - 12.1), 51, 100);
    if (c <= 55.4)
        return clamp(101 + (49 / (55.4 - 35.5)) * (c - 35.5), 101, 150);
    if (c <= 150.4)
        return clamp(151 + (49 / (150.4 - 55.5)) * (c - 55.5), 151, 200);
    if (c <= 250.4)
        return clamp(201 + (99 / (250.4 - 150.5)) * (c - 150.5), 201, 300);
    return clamp(301 + (99 / (400.4 - 250.5)) * (c - 250.5), 301, 400);
}
function aqiFromNo2(ppb: number): number {
    const c = ppb;
    if (c <= 53)
        return clamp((50 / 53) * c, 0, 50);
    if (c <= 100)
        return clamp(51 + (49 / (100 - 54)) * (c - 54), 51, 100);
    if (c <= 360)
        return clamp(101 + (49 / (360 - 101)) * (c - 101), 101, 150);
    return clamp(151 + Math.min(99, (c - 361) * 0.08), 151, 200);
}
function blendAqi(pm25Aqi: number, no2Aqi: number): number {
    return clamp(0.78 * pm25Aqi + 0.22 * no2Aqi, 0, 500);
}
function riskLevelFromScore(score: number): RiskLevel {
    if (score < 25)
        return 'low';
    if (score < 50)
        return 'medium';
    if (score < 75)
        return 'high';
    return 'critical';
}
function logistic(x: number): number {
    return 1 / (1 + Math.exp(-x));
}
function mean(values: number[]): number {
    if (values.length === 0)
        return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
function trailingMean(buf: number[], window: number): number {
    const n = Math.min(window, buf.length);
    if (n === 0)
        return 0;
    let s = 0;
    for (let i = buf.length - n; i < buf.length; i++)
        s += buf[i];
    return s / n;
}
function ema(prev: number, value: number, alpha: number): number {
    return alpha * value + (1 - alpha) * prev;
}
function generateMeanCenteredShap(masterSeed: number, countryCode: string): ShapContributions {
    const rng = mulberry32(combineSeed([masterSeed, countryCode, 'shap']));
    const raw = SHAP_KEYS.map(() => uniform(rng, -1, 1));
    const mu = mean(raw);
    const scaled = raw.map((v) => round1((v - mu) * 6));
    return {
        temperature_lag2w: scaled[0],
        humidity_7d_avg: scaled[1],
        rainfall_spike: scaled[2],
        pm25_trend: scaled[3],
        no2_30d: scaled[4],
        population_density: scaled[5],
        seasonal_index: scaled[6],
        mobility_index: scaled[7],
    };
}
function buildFeatureSnapshot(args: {
    tempLag2w: number;
    humidity7dAvg: number;
    rainfallSpike: number;
    pm25Trend: number;
    no2Avg30d: number;
    populationDensity: number;
    seasonalIndex: number;
    mobilityIndex: number;
}): ShapContributions {
    return {
        temperature_lag2w: round1(args.tempLag2w),
        humidity_7d_avg: round1(args.humidity7dAvg),
        rainfall_spike: round1(args.rainfallSpike),
        pm25_trend: round1(args.pm25Trend),
        no2_30d: round1(args.no2Avg30d),
        population_density: round1(args.populationDensity),
        seasonal_index: round1(args.seasonalIndex),
        mobility_index: round1(args.mobilityIndex),
    };
}
function syntheticDisease(args: {
    rng: () => number;
    temp: number;
    humidity: number;
    rain: number;
    pm25: number;
    latAbs: number;
    isForecast: boolean;
    monsoonW: number;
    density: number;
}): DiseaseBurden {
    const { rng, temp, humidity, rain, pm25, latAbs, isForecast, monsoonW, density } = args;
    const noise = () => (isForecast ? 1.25 : 1) * uniform(rng, 0.85, 1.15);
    const tropical = clamp(1 - latAbs / 50, 0, 1);
    const dengueBase = tropical *
        clamp((humidity - 45) / 45, 0, 1) *
        clamp((temp - 18) / 16, 0, 1) *
        (0.35 + 0.65 * clamp(rain / 120, 0, 1)) *
        (0.6 + 0.4 * monsoonW);
    const malariaBase = tropical *
        clamp(rain / 90, 0, 1.2) *
        clamp((27 - Math.abs(temp - 26)) / 12, 0.2, 1);
    const choleraBase = clamp((rain - 40) / 80, 0, 1) *
        clamp(1 - Math.log10(10 + density) / 4, 0.15, 1);
    const respBase = clamp((pm25 - 8) / 45, 0, 1.4) *
        clamp((18 - temp) / 25 + 0.35, 0.2, 1.2);
    const heatBase = clamp((temp - 33) / 10, 0, 1) * clamp((humidity - 30) / 50, 0.2, 1);
    const scale = 12;
    return {
        dengue: Math.max(0, round1(dengueBase * scale * noise())),
        malaria: Math.max(0, round1(malariaBase * scale * 0.85 * noise())),
        cholera: Math.max(0, round1(choleraBase * scale * 0.35 * noise())),
        respiratoryIllness: Math.max(0, round1(respBase * scale * 1.1 * noise())),
        heatStroke: Math.max(0, round1(heatBase * scale * 0.5 * noise())),
    };
}
function compositeRisk(args: {
    temp: number;
    humidity: number;
    rain: number;
    pm25: number;
    no2: number;
    aqi: number;
    disease: DiseaseBurden;
    density: number;
    latAbs: number;
}): number {
    const { temp, humidity, rain, pm25, no2, aqi, disease, density, latAbs } = args;
    const heatStress = clamp((temp - 22) / 14, -0.8, 1.4);
    const moistureStress = clamp((humidity - 55) / 35, -0.6, 1);
    const floodStress = clamp((rain - 25) / 90, -0.2, 1.3);
    const pmStress = clamp((pm25 - 12) / 40, -0.2, 1.5);
    const no2Stress = clamp((no2 - 8) / 25, -0.2, 1.2);
    const aqiStress = clamp((aqi - 45) / 120, -0.2, 1.4);
    const dSum = disease.dengue * 1.1 +
        disease.malaria * 1.0 +
        disease.cholera * 1.35 +
        disease.respiratoryIllness * 0.9 +
        disease.heatStroke * 1.2;
    const disStress = clamp(dSum / 55, 0, 2.2);
    const urbanStress = clamp(Math.log10(50 + density) / 3.2 - 0.55, -0.3, 1.1);
    const latStress = clamp(latAbs / 55, 0, 1) * 0.15;
    const z = 0.14 * heatStress +
        0.1 * moistureStress +
        0.12 * floodStress +
        0.16 * pmStress +
        0.09 * no2Stress +
        0.13 * aqiStress +
        0.2 * disStress +
        0.12 * urbanStress +
        latStress -
        0.35;
    return clamp(100 * logistic(z), 0, 100);
}
function projectRisk(current: number, futureWindow: number[], rng: () => number, horizonDays: number): number {
    const fmean = mean(futureWindow.length ? futureWindow : [current]);
    const trend = futureWindow.length >= 2 ? futureWindow[futureWindow.length - 1] - futureWindow[0] : 0;
    const h = clamp(horizonDays / 90, 0.08, 1);
    const base = current + (fmean - current) * (0.35 + 0.45 * h) + trend * (0.08 + 0.12 * h);
    return clamp(base + uniform(rng, -2.2, 2.2), 0, 100);
}
type RawCountry = {
    code: string;
    name: string;
    lat: number;
    lng: number;
    pop: number;
    area: number;
};
function estimatedLatitudeFromAlpha3(alpha3: string): number {
    const c = alpha3.trim().toUpperCase()[0] || 'M';
    const idx = Math.max(0, Math.min(25, c.charCodeAt(0) - 65));
    return -40 + (idx / 25) * 80;
}
function climateLatitude(alpha2: string, fallback: number): number {
    const a3 = Object.entries(isoAlpha3ToAlpha2).find(([, a2]) => String(a2).toUpperCase() === alpha2)?.[0];
    if (a3 && countryLatitudes[a3] != null)
        return countryLatitudes[a3]!;
    if (a3)
        return estimatedLatitudeFromAlpha3(a3);
    return fallback;
}
function populationDensityKm2(c: RawCountry): number {
    const area = Math.max(c.area, 0.5);
    return c.pop / area;
}
function generateCountrySeries(meta: RawCountry, masterSeed: number, anchor: Date): CountrySeries {
    const code = meta.code;
    const density = populationDensityKm2(meta);
    const lat = climateLatitude(code, meta.lat);
    const lng = meta.lng;
    const latAbs = Math.abs(lat);
    const monsoonW = monsoonAsiaWeight(code, lat, lng);
    const hem = hemisphere(lat);
    const shap = generateMeanCenteredShap(masterSeed, code);
    const temps: number[] = [];
    const rains: number[] = [];
    const hums: number[] = [];
    const pm25s: number[] = [];
    const no2s: number[] = [];
    const risks: number[] = [];
    let rainEma = 18 + (combineSeed([masterSeed, code, 'init']) % 17);
    let mobility = 0.62 + ((combineSeed([masterSeed, code, 'mob']) % 1000) / 10000) * 0.2;
    type WeekDraft = Omit<CountryWeekRecord, 'prediction7d' | 'prediction30d' | 'prediction90d'>;
    const draft: WeekDraft[] = [];
    for (let weekIndex = 0; weekIndex < TOTAL_WEEKS; weekIndex++) {
        const isForecast = weekIndex > LAST_HISTORICAL_WEEK_INDEX;
        const rng = mulberry32(combineSeed([masterSeed, code, weekIndex]));
        const weekStart = addDaysUtc(anchor, (weekIndex - LAST_HISTORICAL_WEEK_INDEX) * 7);
        const mid = midpointUtc(weekStart);
        const doy = dayOfYearUtc(mid);
        const yearPhase = (doy / 365.25) * Math.PI * 2;
        const currentWeek = isoWeekNumberUtc(mid);
        const forecastNoise = isForecast ? uniform(rng, -1.4, 1.4) : uniform(rng, -0.65, 0.65);
        const isoA3 = ISO2_TO_ISO3[code.toUpperCase()] ?? 'USA';
        const temp = round1(clamp(getTemperature(isoA3, lat, currentWeek) + forecastNoise * (isForecast ? 0.35 : 0.2), -30, 48));
        const woy = Math.floor(doy / 7) % 52;
        const monsoonPhase = monsoonW *
            Math.max(0, Math.sin(Math.PI * clamp((woy - 20) / 16, 0, 1))) *
            Math.max(0, Math.sin(Math.PI * clamp((34 - woy) / 14, 0, 1)));
        const baselineRain = 8 +
            22 *
                clamp(1 - latAbs / 65, 0.15, 1) *
                (0.55 + 0.45 * logistic((rainEma - 25) / 18));
        const monsoonBurst = monsoonPhase * uniform(rng, 55, 195) * (isForecast ? 1.05 : 1);
        const convective = clamp((temp - 24) / 18, 0, 1) * uniform(rng, 0, 35) * (latAbs < 40 ? 1 : 0.35);
        let rain = round1(clamp(baselineRain * uniform(rng, 0.45, 1.35) + monsoonBurst + convective + uniform(rng, -6, 18), 0, 520));
        if (code === 'IN' && currentWeek >= 12 && currentWeek <= 20) {
            rain = round1(clamp(uniform(rng, 8, 15), 0, 520));
        }
        else if ((code === 'BD' || code === 'PK') && currentWeek >= 12 && currentWeek <= 20) {
            rain = round1(clamp(rain, 5, 15));
        }
        if (isForecast)
            rain = round1(clamp(rain + uniform(rng, -12, 18), 0, 560));
        rainEma = ema(rainEma, rain, 0.28);
        let humidityBase = latAbs < 25 ? 68 : latAbs < 35 ? 55 : latAbs < 55 ? 62 : 70;
        if (code === 'IN' || code === 'BD')
            humidityBase += 6;
        let humidity = round1(clamp(humidityBase + monsoonPhase * 16 + uniform(rng, -8, 8), 20, 98));
        if (code === 'IN' && currentWeek >= 12 && currentWeek <= 20) {
            humidity = round1(clamp(uniform(rng, 65, 75), 20, 98));
        }
        const urbanPm = clamp(Math.log10(80 + density) / 2.2 - 0.55, 0, 1.4);
        const heating = hem === 'N' && latAbs > 38 ? 0.35 * Math.max(0, Math.sin(yearPhase + Math.PI / 3)) : 0;
        const pm25 = round1(clamp(getPM25(isoA3, lat) + 8 * urbanPm + heating * 8, 2, 220));
        const no2 = round1(clamp(5 +
            32 * urbanPm * uniform(rng, 0.75, 1.25) +
            0.12 * density ** 0.35 +
            uniform(rng, -2.5, 3.5), 1.5, 95));
        const aqi = round1(blendAqi(aqiFromPm25(pm25), aqiFromNo2(no2)));
        const pm25Trend = pm25 - trailingMean(pm25s, 4);
        temps.push(temp);
        rains.push(rain);
        hums.push(humidity);
        pm25s.push(pm25);
        no2s.push(no2);
        const tempLag2w = weekIndex >= 2 ? temps[weekIndex - 2]! : temps[0]!;
        const humidity7dAvg = trailingMean(hums, 7);
        const rainfallSpike = round1(rain / (5 + rainEma));
        const no2Avg30d = trailingMean(no2s, 4);
        const seasonalIndex = round1(Math.sin(yearPhase));
        const mobilityJitter = (combineSeed([code, weekIndex, 'mobw']) % 628) / 100;
        mobility = clamp(ema(mobility, uniform(rng, 0.35, 0.95), isForecast ? 0.35 : 0.22) +
            0.04 * Math.sin(yearPhase + mobilityJitter) +
            (isForecast ? uniform(rng, -0.06, 0.06) : 0), 0.12, 0.98);
        const featureSnapshot = buildFeatureSnapshot({
            tempLag2w,
            humidity7dAvg,
            rainfallSpike,
            pm25Trend,
            no2Avg30d,
            populationDensity: clamp(Math.log10(20 + density) * 22 - 18, 0, 100),
            seasonalIndex,
            mobilityIndex: mobility * 100,
        });
        const disease = syntheticDisease({
            rng,
            temp,
            humidity,
            rain,
            pm25,
            latAbs,
            isForecast,
            monsoonW,
            density,
        });
        const riskScore = round1(compositeRisk({
            temp,
            humidity,
            rain,
            pm25,
            no2,
            aqi,
            disease,
            density,
            latAbs,
        }));
        risks.push(riskScore);
        draft.push({
            countryCode: code,
            weekIndex,
            weekStart: isoDateUtc(weekStart),
            isForecast,
            temperatureC: temp,
            humidityPct: humidity,
            rainfallMm: rain,
            pm25,
            no2,
            aqi,
            disease,
            populationDensity: round1(density),
            riskScore,
            riskLevel: riskLevelFromScore(riskScore),
            featureSnapshot,
        });
    }
    const weeks: CountryWeekRecord[] = draft.map((w, i) => {
        const predRng = mulberry32(combineSeed([masterSeed, code, 'pred', w.weekIndex]));
        const rs = risks[i]!;
        const fut7 = risks.slice(i + 1, i + 3);
        const fut30 = risks.slice(i + 1, i + 6);
        const fut90 = risks.slice(i + 1, i + 14);
        return {
            ...w,
            prediction7d: round1(projectRisk(rs, fut7, predRng, 7)),
            prediction30d: round1(projectRisk(rs, fut30, predRng, 30)),
            prediction90d: round1(projectRisk(rs, fut90, predRng, 90)),
        };
    });
    return {
        countryCode: code,
        name: meta.name,
        latitude: lat,
        longitude: lng,
        populationDensity: round1(density),
        shap,
        weeks,
    };
}
export function generateClimateHealthDataset(seed = 42, anchorWeekStartUtc = DEFAULT_ANCHOR_WEEK_START_UTC): GeneratedClimateHealthDataset {
    const anchor = parseAnchorMonday(anchorWeekStartUtc);
    const roster = (unCountries as RawCountry[]).slice().sort((a, b) => a.code.localeCompare(b.code));
    const countries = roster.map((c) => generateCountrySeries(c, seed, anchor));
    return {
        seed,
        anchorWeekStart: anchorWeekStartUtc,
        historicalWeeks: HISTORICAL_WEEKS,
        forecastWeeks: FORECAST_WEEKS,
        countries,
    };
}
export function getCalendarWeekOfYear(now = new Date()): number {
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const w = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(53, w || 1));
}
let cachedDataset: GeneratedClimateHealthDataset | null = null;
function getCachedDataset(): GeneratedClimateHealthDataset {
    if (!cachedDataset)
        cachedDataset = generateClimateHealthDataset(42);
    return cachedDataset;
}
export function getLatestDataForCountry(alpha3: string): CountryWeekRecord | null {
    const latestByWeekStart = (weeks: CountryWeekRecord[]): CountryWeekRecord | null => {
        const hist = weeks.filter((w) => !w.isForecast);
        if (hist.length === 0)
            return null;
        return hist.reduce((latest, row) => (row.weekStart > latest.weekStart ? row : latest));
    };
    const key = alpha3.trim().toUpperCase();
    const modelData = riskScores.find((r) => r.iso3 === key);
    const alpha2 = isoAlpha3ToAlpha2[key];
    if (!alpha2)
        return null;
    const row = getCachedDataset().countries.find((c) => c.countryCode.toUpperCase() === alpha2.toUpperCase());
    if (!row)
        return null;
    const base = latestByWeekStart(row.weeks);
    if (!base)
        return null;
    if (modelData) {
        const rl = modelData.risk_level;
        const riskLevel: RiskLevel = rl === 'low' || rl === 'medium' || rl === 'high' || rl === 'critical' ? rl : base.riskLevel;
        const calWeek = getCalendarWeekOfYear();
        const lat = row.latitude;
        let temperatureC = getTemperature(key, lat, calWeek);
        let humidityPct = base.humidityPct;
        let rainfallMm = base.rainfallMm;
        let pm25 = getPM25(key, lat);
        if (key === 'IND' && calWeek >= 14 && calWeek <= 22) {
            humidityPct = 68;
            rainfallMm = 10;
            pm25 = 102;
        }
        return {
            ...base,
            riskScore: modelData.risk_score,
            riskLevel,
            prediction7d: modelData.prediction_7d,
            prediction30d: modelData.prediction_30d,
            prediction90d: modelData.prediction_90d,
            temperatureC,
            humidityPct,
            rainfallMm,
            pm25,
        };
    }
    return base;
}
