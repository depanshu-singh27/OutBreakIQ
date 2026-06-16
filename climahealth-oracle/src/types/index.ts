export type AppView = 'dashboard' | 'myLocation' | 'globalMap' | 'analytics' | 'alerts' | 'model';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ShapFeatureKey = 'temperature_lag2w' | 'humidity_7d_avg' | 'rainfall_spike' | 'pm25_trend' | 'no2_30d' | 'population_density' | 'seasonal_index' | 'mobility_index';
export type ShapContributions = Record<ShapFeatureKey, number>;
export interface DiseaseBurden {
    dengue: number;
    malaria: number;
    cholera: number;
    respiratoryIllness: number;
    heatStroke: number;
}
export interface CountryWeekRecord {
    countryCode: string;
    weekIndex: number;
    weekStart: string;
    isForecast: boolean;
    temperatureC: number;
    humidityPct: number;
    rainfallMm: number;
    pm25: number;
    no2: number;
    aqi: number;
    disease: DiseaseBurden;
    populationDensity: number;
    riskScore: number;
    riskLevel: RiskLevel;
    prediction7d: number;
    prediction30d: number;
    prediction90d: number;
    featureSnapshot: ShapContributions;
}
export interface CountrySeries {
    countryCode: string;
    name: string;
    latitude: number;
    longitude: number;
    populationDensity: number;
    shap: ShapContributions;
    weeks: CountryWeekRecord[];
}
export interface GeneratedClimateHealthDataset {
    seed: number;
    anchorWeekStart: string;
    historicalWeeks: number;
    forecastWeeks: number;
    countries: CountrySeries[];
}
