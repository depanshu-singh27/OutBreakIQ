import maps from './iso3166Maps.json';
export const alpha2toAlpha3: Record<string, string> = (() => {
    const out: Record<string, string> = {};
    for (const [a3, a2] of Object.entries(maps.isoAlpha3ToAlpha2)) {
        out[String(a2).toUpperCase()] = a3;
    }
    return out;
})();
export const countryCode2to3 = alpha2toAlpha3;
export function toAlpha3FromAlpha2(code: string): string | undefined {
    return alpha2toAlpha3[code.trim().toUpperCase()];
}
