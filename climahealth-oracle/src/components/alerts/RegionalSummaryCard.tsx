import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { CountrySeries, RiskLevel } from '../../types';
import { flagEmoji } from './earlyWarningData';
import { REGION_LABELS, type RegionKey } from './regionMapping';
import { REGION_ISO3 } from './regionalRiskIso3';
import { riskScores } from '../../data/modelOutputs/index';
import { isoAlpha3ToAlpha2 } from '../../data/isoNumericToAlpha3';
type RegionalSummaryCardProps = {
    region: Exclude<RegionKey, 'other'>;
    countries: CountrySeries[];
};
function alpha2FromIso3(iso3: string): string {
    return isoAlpha3ToAlpha2[iso3.toUpperCase()] ?? iso3.slice(0, 2);
}
function getRegionDominantDisease(regionIso3s: string[]): string {
    const regionCountries = riskScores.filter((c) => regionIso3s.includes(c.iso3.toUpperCase()));
    const diseaseCounts: Record<string, number> = {
        dengue: 0,
        malaria: 0,
        cholera: 0,
        respiratoryIllness: 0,
        heatStroke: 0,
    };
    for (const c of regionCountries) {
        const d = (c.dominant_disease || 'respiratoryIllness').toLowerCase();
        if (d.includes('heat'))
            diseaseCounts.heatStroke += 1;
        else if (d.includes('dengue'))
            diseaseCounts.dengue += 1;
        else if (d.includes('malaria'))
            diseaseCounts.malaria += 1;
        else if (d.includes('cholera'))
            diseaseCounts.cholera += 1;
        else
            diseaseCounts.respiratoryIllness += 1;
    }
    const top = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]![0];
    return top === 'respiratoryIllness' ? 'respiratory illness' : top;
}
function generateRegionalTrend(regionCountries: string[], weeks: number): number[] {
    const regionData = riskScores.filter((c) => regionCountries.includes(c.iso3.toUpperCase()));
    const baseAvg = regionData.reduce((s, c) => s + c.risk_score, 0) / Math.max(1, regionData.length);
    return Array.from({ length: weeks }, (_, i) => {
        const trend = baseAvg + (i - weeks / 2) * 0.3;
        const noise = Math.sin(i * 0.8) * 3 + Math.cos(i * 1.2) * 2;
        return Math.min(100, Math.max(0, Math.round((trend + noise) * 10) / 10));
    });
}
function badgeClass(level: RiskLevel): string {
    if (level === 'critical')
        return 'bg-red-500/20 text-red-200 ring-red-500/40';
    if (level === 'high')
        return 'bg-orange-500/20 text-orange-200 ring-orange-500/40';
    if (level === 'medium')
        return 'bg-amber-500/20 text-amber-100 ring-amber-500/35';
    return 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30';
}
export function RegionalSummaryCard({ region, countries: _countries }: RegionalSummaryCardProps) {
    void _countries;
    const [trendWeeks, setTrendWeeks] = useState(12);
    const iso3List = useMemo(() => REGION_ISO3[region].map((x) => x.toUpperCase()), [region]);
    const iso3Set = useMemo(() => new Set(iso3List), [iso3List]);
    const { topCountries, dominant, trendData } = useMemo(() => {
        const inRegion = [...riskScores]
            .filter((r) => iso3Set.has(r.iso3.toUpperCase()))
            .sort((a, b) => b.risk_score - a.risk_score);
        const topCountries = inRegion.slice(0, 3).map((r) => ({
            iso3: r.iso3,
            name: r.country_name,
            score: r.risk_score,
            level: r.risk_level,
            code: alpha2FromIso3(r.iso3),
        }));
        const trendArr = generateRegionalTrend(iso3List, trendWeeks);
        const trendData = trendArr.map((risk, i) => ({ week: i + 1, risk }));
        return {
            topCountries,
            dominant: getRegionDominantDisease(iso3List),
            trendData,
        };
    }, [iso3List, iso3Set, trendWeeks]);
    const gradId = `reg-grad-${region}`;
    return (<article className="flex flex-col rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <h3 className="text-sm font-semibold text-foreground">{REGION_LABELS[region]}</h3>
      <p className="mt-1 text-xs text-muted">
        Dominant disease (region): <span className="font-medium capitalize text-foreground">{dominant}</span>
      </p>
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Top countries by model risk</p>
        <ol className="mt-2 space-y-1.5 text-sm">
          {topCountries.length === 0 ? (<li className="text-muted">No data</li>) : (topCountries.map((c, idx) => (<li key={c.iso3} className="flex items-center gap-2">
                <span className="w-4 text-xs text-muted">{idx + 1}.</span>
                <span className="text-lg leading-none" aria-hidden>
                  {flagEmoji(c.code)}
                </span>
                <span className="flex-1 truncate font-medium text-foreground">{c.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">{c.score.toFixed(1)}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ${badgeClass(c.level)}`}>
                  {c.level}
                </span>
              </li>)))}
        </ol>
      </div>
      <div className="mt-4 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Regional risk trend</p>
          <div className="flex gap-1">
            {[4, 8, 12].map((w) => (<button key={w} type="button" onClick={() => setTrendWeeks(w)} style={{
                padding: '3px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                background: trendWeeks === w ? '#06b6d4' : '#1e293b',
                color: trendWeeks === w ? '#000' : '#64748b',
                transition: 'all 0.2s',
            }}>
                {w}w
              </button>))}
          </div>
        </div>
        <div className="mt-2 h-[60px] w-full">
          {trendData.length === 0 ? (<p className="text-xs text-muted">No trend</p>) : (<ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="risk" stroke="#06b6d4" strokeWidth={2} fill={`url(#${gradId})`} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>)}
        </div>
      </div>
    </article>);
}
