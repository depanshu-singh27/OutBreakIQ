import { Bug, Building2, Car, ChevronDown, Droplets, Fish, Hand, Heart, Home, MapPin, Moon, Pill, ScanFace, Shield, Shirt, Stethoscope, Sun, Syringe, Thermometer, TrendingDown, TrendingUp, Wind, Zap, } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { CountrySeries, CountryWeekRecord } from '../../types';
import { buildIntelAlertsForPanel, intelPrecautionAccordionBlocks, rankIntelDiseasesByCases, type IntelDiseaseRow, type IntelPrecautionAccordion, type IntelPrecautionIconKey, } from './countryIntelModel';
export type CountryIntelBlockVariant = 'panel' | 'embed';
const shell = (v: CountryIntelBlockVariant, extra: string) => v === 'panel'
    ? `rounded-lg border border-slate-700/80 bg-slate-900/60 p-4 shadow-md ${extra}`
    : `rounded-[var(--radius-md)] border border-border bg-elevated p-4 shadow-[var(--shadow-sm)] ${extra}`;
const tTitle = (v: CountryIntelBlockVariant) => v === 'panel' ? 'text-xs font-bold uppercase tracking-wider text-slate-500' : 'text-xs font-bold uppercase tracking-wider text-muted';
const tSub = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-xs text-slate-500' : 'text-xs text-muted');
const tCardTitle = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'font-semibold text-slate-100' : 'font-semibold text-foreground');
const tMuted = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-slate-500' : 'text-muted');
const tBody = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-sm text-slate-400' : 'text-sm text-muted');
const tStrong = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-slate-100' : 'text-foreground');
const tNum = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-slate-100' : 'text-foreground');
const accent = (v: CountryIntelBlockVariant) => (v === 'panel' ? 'text-sky-400' : 'text-[var(--color-accent)]');
function DiseaseIcon({ k, v }: {
    k: IntelDiseaseRow['key'];
    v: CountryIntelBlockVariant;
}) {
    const cls = `h-5 w-5 shrink-0 ${accent(v)}`;
    if (k === 'dengue' || k === 'malaria')
        return <Bug className={cls} aria-hidden/>;
    if (k === 'respiratoryIllness')
        return <Wind className={cls} aria-hidden/>;
    if (k === 'cholera')
        return <Droplets className={cls} aria-hidden/>;
    return <Thermometer className={cls} aria-hidden/>;
}
export function IntelPrecIcon({ icon, v }: {
    icon: IntelPrecautionIconKey;
    v: CountryIntelBlockVariant;
}) {
    const c = `h-4 w-4 shrink-0 ${accent(v)}`;
    switch (icon) {
        case 'shield':
            return <Shield className={c} aria-hidden/>;
        case 'shirt':
            return <Shirt className={c} aria-hidden/>;
        case 'droplets':
            return <Droplets className={c} aria-hidden/>;
        case 'moon':
            return <Moon className={c} aria-hidden/>;
        case 'stethoscope':
            return <Stethoscope className={c} aria-hidden/>;
        case 'pill':
            return <Pill className={c} aria-hidden/>;
        case 'mapPin':
            return <MapPin className={c} aria-hidden/>;
        case 'fish':
            return <Fish className={c} aria-hidden/>;
        case 'hand':
            return <Hand className={c} aria-hidden/>;
        case 'heart':
            return <Heart className={c} aria-hidden/>;
        case 'syringe':
            return <Syringe className={c} aria-hidden/>;
        case 'mask':
            return <ScanFace className={c} aria-hidden/>;
        case 'wind':
            return <Wind className={c} aria-hidden/>;
        case 'home':
            return <Home className={c} aria-hidden/>;
        case 'zap':
            return <Zap className={c} aria-hidden/>;
        case 'car':
            return <Car className={c} aria-hidden/>;
        case 'building':
            return <Building2 className={c} aria-hidden/>;
        case 'sun':
            return <Sun className={c} aria-hidden/>;
        default:
            return <Shield className={c} aria-hidden/>;
    }
}
function velocityPillClass(tone: IntelDiseaseRow['velocityTone']): string {
    if (tone === 'surge')
        return 'bg-red-500/15 text-red-300 ring-red-500/35';
    if (tone === 'decline')
        return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/35';
    return 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/35';
}
export function IntelDiseaseCard({ row, v }: {
    row: IntelDiseaseRow;
    v: CountryIntelBlockVariant;
}) {
    return (<div className={shell(v, '')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <DiseaseIcon k={row.key} v={v}/>
          <span className={tCardTitle(v)}>{row.label}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${velocityPillClass(row.velocityTone)}`}>
          {row.velocityLabel}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <div>
          <p className={`text-xs ${tMuted(v)}`}>Weekly cases</p>
          <p className={`text-xl font-bold tabular-nums ${tNum(v)}`}>{row.currentWeekly}</p>
        </div>
        <div>
          <p className={`text-xs ${tMuted(v)}`}>Week over week</p>
          <p className={`inline-flex items-center gap-1 text-lg font-bold tabular-nums ${row.wowPct >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {row.wowPct >= 0 ? <TrendingUp className="h-4 w-4"/> : <TrendingDown className="h-4 w-4"/>}
            {row.wowPct >= 0 ? '+' : ''}
            {row.wowPct.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mt-3 h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={row.sparkline} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`intel-spark-${v}-${row.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={v === 'panel' ? '#38bdf8' : 'var(--color-accent)'} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={v === 'panel' ? '#38bdf8' : 'var(--color-accent)'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="week" hide/>
            <YAxis hide domain={['auto', 'auto']}/>
            <Area type="monotone" dataKey="cases" stroke={v === 'panel' ? '#38bdf8' : 'var(--color-accent)'} strokeWidth={2} fill={`url(#intel-spark-${v}-${row.key})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {row.reasons.length > 0 ? (<div className={`mt-3 space-y-2 border-t pt-3 ${v === 'panel' ? 'border-slate-700/80' : 'border-border'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${tMuted(v)}`}>Why it is spreading</p>
          <ul className={`space-y-1.5 text-xs leading-snug ${tBody(v)}`}>
            {row.reasons.map((r, i) => (<li key={i}>{r}</li>))}
          </ul>
        </div>) : null}
    </div>);
}
export function IntelDiseasesSection({ series, latest, variant, title = 'Top spreading diseases', description = 'All five diseases ranked by modeled weekly case count (latest week, synthetic panel).', }: {
    series: CountrySeries;
    latest: CountryWeekRecord;
    variant: CountryIntelBlockVariant;
    title?: string;
    description?: string;
}) {
    const rows = rankIntelDiseasesByCases(series, latest);
    return (<section>
      <h3 className={tTitle(variant)}>{title}</h3>
      <p className={`mt-1 ${tSub(variant)}`}>{description}</p>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (<IntelDiseaseCard key={row.key} row={row} v={variant}/>))}
      </div>
    </section>);
}
export function IntelAlertsSection({ series, latest, variant, }: {
    series: CountrySeries;
    latest: CountryWeekRecord;
    variant: CountryIntelBlockVariant;
}) {
    const panelAlerts = buildIntelAlertsForPanel(series, latest);
    const alertShell = variant === 'panel'
        ? 'rounded-lg border border-slate-700/80 bg-slate-900/60 p-4 shadow-md'
        : 'rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]';
    const badge = variant === 'panel'
        ? 'rounded-full bg-slate-950 px-2 py-0.5 text-xs font-semibold text-sky-400 ring-1 ring-slate-700'
        : 'rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)] ring-1 ring-border';
    return (<section>
      <h3 className={tTitle(variant)}>Active alerts</h3>
      <div className="mt-4 space-y-3">
        {latest.riskScore < 30 ? (<div className={variant === 'panel'
                ? 'rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-100'
                : 'rounded-[var(--radius-md)] border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200'}>
            No active warnings
          </div>) : (panelAlerts.map((a, i) => (<div key={`${a.title}-${i}`} className={alertShell}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-lg" aria-hidden>
                  {a.icon}
                </span>
                <span className={badge}>{a.confidencePct}% confidence</span>
              </div>
              <h4 className={`mt-2 text-sm font-semibold capitalize ${tStrong(variant)}`}>{a.title}</h4>
              <p className={`mt-2 text-sm leading-relaxed ${tBody(variant)}`}>{a.body}</p>
              <p className={`mt-3 text-xs ${tMuted(variant)}`}>
                Predicted peak: <span className={`font-medium ${tStrong(variant)}`}>{a.peakDate}</span>
              </p>
            </div>)))}
      </div>
    </section>);
}
export function IntelPrecautionsSection({ latest, variant, }: {
    latest: CountryWeekRecord;
    variant: CountryIntelBlockVariant;
}) {
    const blocks = intelPrecautionAccordionBlocks(latest);
    const border = variant === 'panel' ? 'border-slate-700/80' : 'border-border';
    const inner = variant === 'panel' ? 'border-slate-700/80 text-slate-400' : 'border-border text-muted';
    return (<section>
      <h3 className={tTitle(variant)}>Precautions</h3>
      <div className="mt-4 space-y-2">
        {blocks.map((block: IntelPrecautionAccordion) => (<details key={block.diseaseKey} className={`group rounded-lg border ${border} ${variant === 'panel' ? 'bg-slate-900/60' : 'bg-elevated'}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              {block.title}
              <ChevronDown className={`h-4 w-4 shrink-0 ${tMuted(variant)} transition-transform group-open:rotate-180`}/>
            </summary>
            <ul className={`space-y-3 border-t px-4 py-3 text-sm ${inner}`}>
              {block.items.map((item, idx) => (<li key={idx} className="flex gap-3">
                  <IntelPrecIcon icon={item.icon} v={variant}/>
                  <span>{item.text}</span>
                </li>))}
            </ul>
          </details>))}
      </div>
    </section>);
}
