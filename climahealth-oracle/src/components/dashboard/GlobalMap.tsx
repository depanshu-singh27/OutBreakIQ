import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import * as d3 from 'd3';
import type { CountrySeries, CountryWeekRecord, RiskLevel } from '../../types';
import { useAppStore } from '../../store/appStore';
import { getLatestHistoricalWeek } from '../location/myLocationModel';
import { isoAlpha3ToAlpha2, isoNumericToAlpha3 } from '../../data/isoNumericToAlpha3';
import { dominantDiseaseName, getMapLayerDomain, getMapMetric, isoFromGeography, topDriverLabel, type MapLayer, } from './dashboardModel';
import { getCountryRisk } from '../../data/modelOutputs/index';
import { getPM25ForMap, pm25StepColor } from './mapPm25Overlay';
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
type MapGeo = {
    rsmKey: string;
    properties: Record<string, unknown>;
    id?: string | number;
};
const RISK_COLORS = ['#15803d', '#ca8a04', '#ea580c', '#dc2626', '#450a0a'];
const LAYER_LABEL: Record<MapLayer, string> = {
    risk: 'Risk score',
    temperature: 'Temperature \u00B0C',
    pm25: 'PM2.5 \u03BCg/m\u00B3',
    rainfall: 'Rainfall mm/wk',
    disease: 'Disease load',
};
function makeScale(layer: MapLayer, domain: [
    number,
    number
]) {
    const [a, b] = domain;
    if (layer === 'risk') {
        return d3.scaleSequential(d3.interpolateRgbBasis(RISK_COLORS)).domain([0, 100]);
    }
    if (layer === 'pm25') {
        return d3.scaleSequential().domain([0, 150]).interpolator(d3.interpolateRgb('#10b981', '#7b0000'));
    }
    return d3.scaleSequential(d3.interpolateRgbBasis(RISK_COLORS)).domain([a, b]);
}
function paddedNumericFromGeo(geo: MapGeo): string | null {
    const props = geo.properties;
    const raw = props.ISO_N3 ?? props.iso_n3 ?? geo.id;
    if (raw == null || raw === '')
        return null;
    const digits = String(raw).replace(/\D/g, '');
    if (!digits)
        return null;
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 0)
        return null;
    return String(n).padStart(3, '0');
}
function alpha3FromGeo(geo: MapGeo): string | null {
    const padded = paddedNumericFromGeo(geo);
    if (!padded)
        return null;
    return isoNumericToAlpha3[padded] ?? null;
}
type ResolvedCountry = {
    alpha3: string | null;
    alpha2: string;
    series: CountrySeries;
    latest: CountryWeekRecord;
};
function resolveCountryFromGeo(geo: MapGeo, byCode: Map<string, CountrySeries>): ResolvedCountry | null {
    const padded = paddedNumericFromGeo(geo);
    if (padded) {
        const a3 = isoNumericToAlpha3[padded] ?? null;
        if (a3) {
            const a2 = isoAlpha3ToAlpha2[a3]?.toUpperCase();
            if (a2) {
                const series = byCode.get(a2);
                if (series) {
                    const latest = getLatestHistoricalWeek(series);
                    if (latest)
                        return { alpha3: a3, alpha2: a2, series, latest };
                }
            }
        }
    }
    const a2fb = isoFromGeography(geo.properties);
    if (!a2fb)
        return null;
    const series = byCode.get(a2fb);
    if (!series)
        return null;
    const latest = getLatestHistoricalWeek(series);
    if (!latest)
        return null;
    return { alpha3: alpha3FromGeo(geo), alpha2: a2fb, series, latest };
}
function getRiskColor(score: number): string {
    if (score >= 75)
        return '#7b0000';
    if (score >= 60)
        return '#d73027';
    if (score >= 45)
        return '#f97316';
    if (score >= 30)
        return '#fbbf24';
    if (score >= 15)
        return '#86efac';
    return '#10b981';
}
function getLatestDataForCountry(alpha3: string, byCode: Map<string, CountrySeries>): (CountryWeekRecord & {
    series: CountrySeries;
    riskScore: number;
}) | null {
    const a2 = isoAlpha3ToAlpha2[alpha3.toUpperCase()]?.toUpperCase();
    if (!a2)
        return null;
    const series = byCode.get(a2);
    if (!series)
        return null;
    const latest = getLatestHistoricalWeek(series);
    if (!latest)
        return null;
    const realRisk = getCountryRisk(alpha3.trim().toUpperCase());
    if (realRisk) {
        const rl = realRisk.risk_level;
        const riskLevel: RiskLevel = rl === 'low' || rl === 'medium' || rl === 'high' || rl === 'critical' ? rl : latest.riskLevel;
        return {
            ...latest,
            series,
            riskScore: realRisk.risk_score,
            riskLevel,
            prediction7d: realRisk.prediction_7d,
            prediction30d: realRisk.prediction_30d,
            prediction90d: realRisk.prediction_90d,
            temperatureC: realRisk.temp_mean,
            humidityPct: realRisk.humidity_mean,
            rainfallMm: realRisk.rainfall_total,
            pm25: realRisk.pm25,
        };
    }
    return { ...latest, series, riskScore: latest.riskScore };
}
function getDominantDisease(data: CountryWeekRecord): string {
    return dominantDiseaseName(data.disease);
}
function getTopDriver(series: CountrySeries): string {
    return topDriverLabel(series);
}
type MapTooltipState = {
    x: number;
    y: number;
    country: string;
    score: number;
    disease: string;
    driver: string;
};
type GlobalMapProps = {
    countries: CountrySeries[];
};
export function GlobalMap({ countries }: GlobalMapProps) {
    const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
    const [layer, setLayer] = useState<MapLayer>('risk');
    const [tooltip, setTooltip] = useState<MapTooltipState | null>(null);
    const byCode = useMemo(() => {
        const m = new Map<string, CountrySeries>();
        for (const c of countries) {
            m.set(c.countryCode.toUpperCase(), c);
        }
        return m;
    }, [countries]);
    const domain = useMemo(() => getMapLayerDomain(countries, layer), [countries, layer]);
    const colorScale = useMemo(() => makeScale(layer, domain), [layer, domain]);
    const fillForGeo = useCallback((geo: MapGeo) => {
        const numericId = paddedNumericFromGeo(geo);
        const alpha3 = numericId ? isoNumericToAlpha3[numericId] : undefined;
        const countryData = alpha3 ? getLatestDataForCountry(alpha3, byCode) : null;
        const resolved = countryData
            ? {
                latest: countryData,
                series: countryData.series,
            }
            : resolveCountryFromGeo(geo, byCode);
        if (!resolved)
            return '#1e293b';
        if (layer === 'risk')
            return getRiskColor(resolved.latest.riskScore);
        if (layer === 'pm25') {
            const a3 = alpha3 ??
                (Object.entries(isoAlpha3ToAlpha2).find(([, a2]) => a2.toUpperCase() === resolved.series.countryCode.toUpperCase())?.[0] ??
                    null);
            if (!a3)
                return '#1e293b';
            const lat = resolved.series.latitude ?? 0;
            return pm25StepColor(getPM25ForMap(a3, lat));
        }
        const v = getMapMetric(resolved.latest, layer);
        return colorScale(v) as string;
    }, [byCode, colorScale, layer]);
    const pulseForGeo = useCallback((geo: MapGeo) => {
        const resolved = resolveCountryFromGeo(geo, byCode);
        return !!resolved && resolved.latest.riskScore > 80;
    }, [byCode]);
    return (<section className="relative rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Global map</h3>
          <p className="text-xs text-muted">Click a country for details · Hover for summary</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['risk', 'temperature', 'pm25', 'rainfall', 'disease'] as const).map((key) => (<button key={key} type="button" onClick={() => setLayer(key)} className={[
                'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
                layer === key
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'bg-elevated text-muted hover:text-foreground',
            ].join(' ')}>
              {key === 'pm25' ? 'PM2.5' : key}
            </button>))}
        </div>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-[#0c0e14]">
        <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 220, center: [0, 15] }} width={980} height={520} className="mx-auto h-auto w-full max-h-[min(52vh,520px)] [&_svg]:h-auto [&_svg]:max-h-[min(52vh,520px)] [&_svg]:w-full">
          <Geographies geography={TOPO_URL}>
            {({ geographies }: {
            geographies: MapGeo[];
        }) => geographies.map((geo: MapGeo) => {
            const pulse = pulseForGeo(geo);
            const fillColor = fillForGeo(geo);
            return (<Geography key={geo.rsmKey} geography={geo} style={{
                    default: {
                        fill: fillColor,
                        stroke: '#334155',
                        strokeWidth: 0.5,
                        cursor: 'pointer',
                        transition: 'fill 0.2s',
                        outline: 'none',
                    },
                    hover: {
                        outline: 'none',
                        filter: 'brightness(1.12)',
                    },
                    pressed: { outline: 'none' },
                }} className={pulse ? 'animate-map-pulse' : ''} onMouseEnter={(evt: MouseEvent<SVGPathElement>) => {
                    const numericId = paddedNumericFromGeo(geo);
                    const alpha3 = numericId ? isoNumericToAlpha3[numericId] : undefined;
                    const data = alpha3 ? getLatestDataForCountry(alpha3, byCode) : null;
                    if (data) {
                        setTooltip({
                            x: evt.clientX,
                            y: evt.clientY,
                            country: data.series.name,
                            score: Math.round(data.riskScore),
                            disease: getDominantDisease(data),
                            driver: getTopDriver(data.series),
                        });
                        return;
                    }
                    const resolved = resolveCountryFromGeo(geo, byCode);
                    if (resolved) {
                        setTooltip({
                            x: evt.clientX,
                            y: evt.clientY,
                            country: resolved.series.name,
                            score: Math.round(resolved.latest.riskScore),
                            disease: getDominantDisease(resolved.latest),
                            driver: getTopDriver(resolved.series),
                        });
                    }
                    else {
                        setTooltip(null);
                    }
                }} onMouseLeave={() => setTooltip(null)} onMouseMove={(evt: MouseEvent<SVGPathElement>) => {
                    setTooltip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : t));
                }} onClick={() => {
                    const idPart = geo.id != null && geo.id !== '' ? String(geo.id) : (paddedNumericFromGeo(geo) ?? '');
                    if (!idPart)
                        return;
                    const digits = idPart.replace(/\D/g, '');
                    if (!digits)
                        return;
                    const padded = String(parseInt(digits, 10)).padStart(3, '0');
                    const alpha3 = isoNumericToAlpha3[padded];
                    if (alpha3)
                        setSelectedCountry(alpha3);
                }}/>);
        })}
          </Geographies>
        </ComposableMap>

        {tooltip ? (<div style={{
                position: 'fixed',
                left: tooltip.x + 12,
                top: tooltip.y - 60,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '10px 14px',
                pointerEvents: 'none',
                zIndex: 9999,
                minWidth: 200,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{tooltip.country}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              Risk Score:{' '}
              <span style={{ color: getRiskColor(tooltip.score), fontWeight: 600 }}>
                {tooltip.score}/100
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              Top Disease: <span style={{ color: '#f59e0b' }}>{tooltip.disease}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Primary Driver: {tooltip.driver}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
              Click for full intelligence report →
            </div>
          </div>) : null}
      </div>

      <div className="mt-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
          {LAYER_LABEL[layer]} scale
        </p>
        <div className="h-3 w-full max-w-md rounded-full" style={{
            background: layer === 'risk'
                ? 'linear-gradient(90deg, #10b981, #86efac, #fbbf24, #f97316, #d73027, #7b0000)'
                : layer === 'pm25'
                    ? 'linear-gradient(90deg, #10b981, #86efac, #fbbf24, #f97316, #d73027, #7b0000)'
                    : `linear-gradient(90deg, ${String(colorScale(domain[0]))}, ${String(colorScale((domain[0] + domain[1]) / 2))}, ${String(colorScale(domain[1]))})`,
        }}/>
        <div className="mt-1 flex max-w-md justify-between text-[10px] text-muted">
          <span>{layer === 'risk' ? '0' : layer === 'pm25' ? '0' : domain[0].toFixed(1)}</span>
          <span>{layer === 'risk' ? '100' : layer === 'pm25' ? '150' : domain[1].toFixed(1)}</span>
        </div>
      </div>
    </section>);
}
