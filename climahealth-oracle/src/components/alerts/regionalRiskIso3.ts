import type { RegionKey } from './regionMapping';
export const REGION_ISO3: Record<Exclude<RegionKey, 'other'>, string[]> = {
    south_asia: ['IND', 'BGD', 'PAK', 'LKA', 'NPL', 'BTN', 'MDV', 'AFG'],
    sub_saharan_africa: [
        'NGA', 'ETH', 'COD', 'TZA', 'KEN', 'UGA', 'GHA', 'CMR', 'AGO', 'MOZ', 'ZMB', 'ZWE', 'MLI', 'NER', 'BFA',
        'TCD', 'SSD', 'SDN', 'SEN', 'RWA', 'BDI', 'SOM', 'ERI', 'DJI', 'COM', 'STP', 'GNQ', 'GAB', 'COG', 'CAF',
        'GNB', 'SLE', 'LBR', 'GIN', 'GMB', 'CPV', 'MRT', 'MUS', 'MDG', 'MWI', 'LSO', 'SWZ', 'BWA', 'NAM', 'ZAF',
        'TGO', 'BEN', 'CIV',
    ],
    southeast_asia: ['THA', 'VNM', 'IDN', 'PHL', 'MMR', 'KHM', 'LAO', 'MYS', 'SGP', 'BRN', 'TLS'],
    latin_america: [
        'BRA', 'MEX', 'COL', 'ARG', 'PER', 'VEN', 'CHL', 'ECU', 'BOL', 'PRY', 'URY', 'GUY', 'SUR', 'HTI', 'DOM',
        'CUB', 'GTM', 'HND', 'SLV', 'NIC', 'CRI', 'PAN', 'JAM', 'TTO', 'BRB', 'LCA', 'VCT', 'GRD', 'ATG', 'DMA',
        'KNA', 'BHS', 'BLZ',
    ],
    middle_east: [
        'SAU', 'IRN', 'IRQ', 'TUR', 'YEM', 'SYR', 'JOR', 'ARE', 'ISR', 'LBN', 'OMN', 'KWT', 'QAT', 'BHR', 'PSE',
        'CYP',
    ],
    pacific_islands: ['PNG', 'FJI', 'SLB', 'VUT', 'WSM', 'KIR', 'TON', 'FSM', 'PLW', 'MHL', 'NRU', 'TUV', 'NZL', 'AUS'],
};
