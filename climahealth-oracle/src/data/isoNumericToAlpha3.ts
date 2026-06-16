import maps from './iso3166Maps.json';
export const isoNumericToAlpha3: Record<string, string> = maps.isoNumericToAlpha3;
export const isoAlpha3ToAlpha2: Record<string, string> = maps.isoAlpha3ToAlpha2;
export function alpha2ToAlpha3(alpha2: string): string | undefined {
    const u = alpha2.trim().toUpperCase();
    for (const [a3, a2] of Object.entries(isoAlpha3ToAlpha2)) {
        if (String(a2).toUpperCase() === u)
            return a3;
    }
    return undefined;
}
