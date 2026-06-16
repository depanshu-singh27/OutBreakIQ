import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getClimateDataset } from '../../data/climateDataset';
import { getLatestHistoricalWeek } from '../location/myLocationModel';
import { computeGlobalKpis } from '../dashboard/dashboardModel';
import { useAnimatedFloat } from '../../hooks/useCountUp';
const DISEASE_KEYS = ['dengue', 'malaria', 'cholera', 'respiratoryIllness', 'heatStroke'] as const;
export function GlobalRiskPulse() {
    const { avgRisk, diseaseFracs } = useMemo(() => {
        const countries = getClimateDataset().countries;
        const kpis = computeGlobalKpis(countries);
        let sumD = 0;
        const totals = { dengue: 0, malaria: 0, cholera: 0, respiratoryIllness: 0, heatStroke: 0 };
        for (const s of countries) {
            const w = getLatestHistoricalWeek(s);
            if (!w)
                continue;
            const d = w.disease;
            totals.dengue += d.dengue;
            totals.malaria += d.malaria;
            totals.cholera += d.cholera;
            totals.respiratoryIllness += d.respiratoryIllness;
            totals.heatStroke += d.heatStroke;
            sumD += d.dengue + d.malaria + d.cholera + d.respiratoryIllness + d.heatStroke;
        }
        const fracs = DISEASE_KEYS.map((k) => (sumD > 0 ? totals[k] / sumD : 0.2));
        return { avgRisk: kpis.globalAvgRisk, diseaseFracs: fracs };
    }, []);
    const avgAnimated = useAnimatedFloat(avgRisk, 1.4);
    const outerLen = 2 * Math.PI * 40;
    const size = 112;
    const cx = size / 2;
    const cy = size / 2;
    const rings = [36, 30, 24, 18, 12];
    return (<div className="rounded-[var(--radius-sm)] border border-border bg-[var(--color-bg)]/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Global risk pulse</p>
      <div className="relative mx-auto mt-2 flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-[var(--color-accent)]">
          <defs>
            <linearGradient id="pulse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25}/>
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.9}/>
            </linearGradient>
          </defs>
          
          <circle cx={cx} cy={cy} r={40} fill="none" stroke="var(--color-border)" strokeWidth="3"/>
          <motion.circle cx={cx} cy={cy} r={40} fill="none" stroke="url(#pulse-grad)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(avgRisk / 100) * outerLen} ${outerLen}`} transform={`rotate(-90 ${cx} ${cy})`} initial={false} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}/>
          
          {rings.map((r, i) => {
            const frac = diseaseFracs[i] ?? 0.2;
            const len = 2 * Math.PI * r;
            const dash = Math.max(0.08, frac) * len;
            return (<motion.circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.35 - i * 0.05} strokeWidth="2" strokeDasharray={`${dash} ${len}`} strokeLinecap="round" transform={`rotate(${-90 + i * 18} ${cx} ${cy})`} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: [0, -len * 0.15, 0] }} transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}/>);
        })}
          <circle cx={cx} cy={cy} r={6} fill="var(--color-accent)" fillOpacity={0.35}/>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="text-lg font-bold tabular-nums text-foreground">{avgAnimated.toFixed(0)}</span>
          <span className="text-[9px] font-medium uppercase text-muted">avg</span>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-[9px] text-muted">
        {['Dengue', 'Malaria', 'Cholera', 'Resp.', 'Heat'].map((label, i) => (<li key={label} className="flex justify-between gap-1">
            <span>{label}</span>
            <span className="tabular-nums text-foreground/80">
              {((diseaseFracs[i] ?? 0) * 100).toFixed(0)}%
            </span>
          </li>))}
      </ul>
    </div>);
}
