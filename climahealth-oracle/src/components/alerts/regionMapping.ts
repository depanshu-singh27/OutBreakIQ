export type RegionKey = 'south_asia' | 'sub_saharan_africa' | 'southeast_asia' | 'latin_america' | 'middle_east' | 'pacific_islands' | 'other';
export const REGION_LABELS: Record<RegionKey, string> = {
    south_asia: 'South Asia',
    sub_saharan_africa: 'Sub-Saharan Africa',
    southeast_asia: 'Southeast Asia',
    latin_america: 'Latin America',
    middle_east: 'Middle East',
    pacific_islands: 'Pacific Islands',
    other: 'Other',
};
const SOUTH_ASIA = new Set(['AF', 'BD', 'BT', 'IN', 'LK', 'MV', 'NP', 'PK']);
const SE_ASIA = new Set(['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN']);
const PACIFIC_ISLANDS = new Set(['FJ', 'KI', 'MH', 'FM', 'NR', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU']);
const MIDDLE_EAST = new Set([
    'AE',
    'BH',
    'CY',
    'EG',
    'IL',
    'IQ',
    'IR',
    'JO',
    'KW',
    'LB',
    'LY',
    'MA',
    'OM',
    'PS',
    'QA',
    'SA',
    'SD',
    'SS',
    'SY',
    'TN',
    'TR',
    'YE',
    'DZ',
]);
const SUB_SAHARAN_AFRICA = new Set([
    'AO',
    'BJ',
    'BW',
    'BF',
    'BI',
    'CV',
    'CM',
    'CF',
    'TD',
    'KM',
    'CG',
    'CD',
    'CI',
    'DJ',
    'GQ',
    'ER',
    'SZ',
    'ET',
    'GA',
    'GM',
    'GH',
    'GN',
    'GW',
    'KE',
    'LS',
    'LR',
    'MG',
    'MW',
    'ML',
    'MR',
    'MU',
    'MZ',
    'NA',
    'NE',
    'NG',
    'RW',
    'ST',
    'SN',
    'SC',
    'SL',
    'SO',
    'ZA',
    'TZ',
    'TG',
    'UG',
    'ZM',
    'ZW',
]);
const LATIN_AMERICA = new Set([
    'AG',
    'AR',
    'BS',
    'BB',
    'BZ',
    'BO',
    'BR',
    'CL',
    'CO',
    'CR',
    'CU',
    'DM',
    'DO',
    'EC',
    'SV',
    'GD',
    'GT',
    'GY',
    'HT',
    'HN',
    'JM',
    'MX',
    'NI',
    'PA',
    'PY',
    'PE',
    'KN',
    'LC',
    'VC',
    'SR',
    'TT',
    'UY',
    'VE',
]);
export function getRegionForCountry(code: string): RegionKey {
    const c = code.toUpperCase();
    if (SOUTH_ASIA.has(c))
        return 'south_asia';
    if (SE_ASIA.has(c))
        return 'southeast_asia';
    if (PACIFIC_ISLANDS.has(c))
        return 'pacific_islands';
    if (MIDDLE_EAST.has(c))
        return 'middle_east';
    if (SUB_SAHARAN_AFRICA.has(c))
        return 'sub_saharan_africa';
    if (LATIN_AMERICA.has(c))
        return 'latin_america';
    return 'other';
}
export const SUMMARY_REGIONS: Exclude<RegionKey, 'other'>[] = [
    'south_asia',
    'sub_saharan_africa',
    'southeast_asia',
    'latin_america',
    'middle_east',
    'pacific_islands',
];
