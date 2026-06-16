import { generateClimateHealthDataset } from './generateData';
import type { CountrySeries, GeneratedClimateHealthDataset } from '../types';
import { isoAlpha3ToAlpha2 } from './isoNumericToAlpha3';
let cached: GeneratedClimateHealthDataset | null = null;
export function getClimateDataset(): GeneratedClimateHealthDataset {
    if (!cached) {
        cached = generateClimateHealthDataset(42);
    }
    return cached;
}
export function getCountrySeriesByCode(code: string): CountrySeries | undefined {
    let upper = code.trim().toUpperCase();
    if (upper.length === 3 && isoAlpha3ToAlpha2[upper]) {
        upper = isoAlpha3ToAlpha2[upper].toUpperCase();
    }
    return getClimateDataset().countries.find((c) => c.countryCode === upper);
}
