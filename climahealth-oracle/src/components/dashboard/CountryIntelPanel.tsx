import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { Activity, CloudRain, Download, Droplets, Factory, MapPin, Thermometer, Wind, X, } from 'lucide-react';
import type { CountrySeries } from '../../types';
import { alpha2ToAlpha3 } from '../../data/isoNumericToAlpha3';
import { flagEmoji } from '../alerts/earlyWarningData';
import { useAppStore } from '../../store/appStore';
import type { PredictionHorizon } from '../../store/appStore';
import { buildCaseTimeline, forecastWeeksForHorizon } from './countryIntelModel';
import { IntelAlertsSection, IntelDiseasesSection, IntelPrecautionsSection } from './countryIntelBlocks';
import { getLatestHistoricalWeek, metricStatus, riskLevelLabel } from '../location/myLocationModel';
type CountryIntelPanelProps = {
    open: boolean;
    series: CountrySeries | null | undefined;
    onClose: () => void;
};
const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07, delayChildren: 0.06 },
    },
};
const staggerItem: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
};
function intelEnvBadge(kind: 'temp' | 'humidity' | 'rain' | 'pm25' | 'aqi' | 'no2', value: number): {
    label: string;
    badgeClass: string;
} {
    const map = (s: 'good' | 'moderate' | 'bad' | 'severe') => {
        if (s === 'good')
            return { label: 'Normal', badgeClass: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/30' };
        if (s === 'moderate')
            return { label: 'Elevated', badgeClass: 'bg-amber-500/20 text-amber-100 ring-amber-500/35' };
        if (s === 'bad')
            return { label: 'Extreme', badgeClass: 'bg-orange-500/25 text-orange-100 ring-orange-500/40' };
        return { label: 'Hazardous', badgeClass: 'bg-red-600/30 text-red-100 ring-red-500/45' };
    };
    if (kind === 'no2') {
        if (value <= 25)
            return map('good');
        if (value <= 50)
            return map('moderate');
        if (value <= 80)
            return map('bad');
        return map('severe');
    }
    return map(metricStatus(kind, value));
}
function EnvIntelCard({ icon, label, value, badge, }: {
    icon: ReactNode;
    label: string;
    value: string;
    badge: {
        label: string;
        badgeClass: string;
    };
}) {
    return (<div className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 shadow-md">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums leading-tight text-slate-100">{value}</p>
      <span className={`mt-2 inline-flex max-w-full rounded-full px-2 py-0.5 text-[10px] font-semibold leading-snug ring-1 ${badge.badgeClass}`}>
        {badge.label}
      </span>
    </div>);
}
function HorizonToggle({ value, onChange, }: {
    value: PredictionHorizon;
    onChange: (h: PredictionHorizon) => void;
}) {
    const opts: PredictionHorizon[] = ['7d', '30d', '90d'];
    const labels: Record<PredictionHorizon, string> = {
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
    };
    return (<div className="flex flex-wrap rounded-md border border-slate-700 bg-slate-900/80 p-0.5">
      {opts.map((h) => (<button key={h} type="button" onClick={() => onChange(h)} className={[
                'rounded-[4px] px-2.5 py-1 text-xs font-semibold max-sm:flex-1',
                value === h ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}>
          {labels[h]}
        </button>))}
    </div>);
}
export function CountryIntelPanel({ open, series, onClose }: CountryIntelPanelProps) {
    const selectedCountry = useAppStore((s) => s.selectedCountry);
    const latest = series ? getLatestHistoricalWeek(series) : undefined;
    const setUserLocation = useAppStore((s) => s.setUserLocation);
    const setLocationPermission = useAppStore((s) => s.setLocationPermission);
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    const setPredictionHorizon = useAppStore((s) => s.setPredictionHorizon);
    const [pdfBusy, setPdfBusy] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);
    const isoAlpha3Display = useMemo(() => {
        if (!series)
            return '—';
        const s = selectedCountry?.trim().toUpperCase();
        if (s && s.length === 3)
            return s;
        return alpha2ToAlpha3(series.countryCode) ?? series.countryCode;
    }, [selectedCountry, series]);
    const timeline = useMemo(() => (series ? buildCaseTimeline(series, forecastWeeksForHorizon(predictionHorizon)) : []), [series, predictionHorizon]);
    const todayIndex = useMemo(() => timeline.findIndex((p) => p.isToday), [timeline]);
    const setAsMyLocation = useCallback(() => {
        if (!series)
            return;
        setUserLocation({
            lat: series.latitude,
            lng: series.longitude,
            countryCode: series.countryCode,
            city: series.name,
            country: series.name,
        });
        setLocationPermission('granted');
    }, [series, setLocationPermission, setUserLocation]);
    const downloadPdf = useCallback(async () => {
        const el = reportRef.current;
        if (!el || pdfBusy)
            return;
        setPdfBusy(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#0f172a',
            });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const img = canvas.toDataURL('image/png');
            const ratioW = pageW / canvas.width;
            const drawH = canvas.height * ratioW;
            if (drawH > pageH) {
                const ratioH = pageH / canvas.height;
                const drawW = canvas.width * ratioH;
                pdf.addImage(img, 'PNG', (pageW - drawW) / 2, 0, drawW, pageH);
            }
            else {
                pdf.addImage(img, 'PNG', 0, 0, pageW, drawH);
            }
            pdf.save(`ClimaHealth-report-${series?.countryCode ?? 'country'}.pdf`);
        }
        catch {
        }
        finally {
            setPdfBusy(false);
        }
    }, [pdfBusy, series?.countryCode]);
    const updatedLabel = latest
        ? new Date(`${latest.weekStart}T12:00:00Z`).toLocaleDateString(undefined, {
            dateStyle: 'long',
        })
        : '—';
    const predictionValue = predictionHorizon === '7d'
        ? (latest?.prediction7d ?? 0)
        : predictionHorizon === '30d'
            ? (latest?.prediction30d ?? 0)
            : (latest?.prediction90d ?? 0);
    const predictionLabel = predictionHorizon === '7d' ? 'Next 7 Days' : predictionHorizon === '30d' ? 'Next 30 Days' : 'Next 90 Days';
    return (<AnimatePresence>
      {open && series && latest ? (<>
          <motion.button type="button" aria-label="Close panel" className="fixed inset-0 z-[999] bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
          <motion.aside role="dialog" aria-modal="true" aria-labelledby="country-intel-title" className="fixed right-0 top-0 z-[1000] flex h-screen w-full max-w-[680px] flex-col border-l border-[#1e293b] bg-[#0f172a] shadow-2xl" initial={{ x: 680 }} animate={{ x: 0 }} exit={{ x: 680 }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <motion.div ref={reportRef} className="space-y-8 p-4 pb-12 sm:p-5" initial="hidden" animate="show" variants={staggerContainer}>
                
                <motion.header variants={staggerItem} className="border-b border-slate-800 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                      <span className="text-5xl leading-none" aria-hidden>
                        {flagEmoji(series.countryCode)}
                      </span>
                      <div className="min-w-0">
                        <h2 id="country-intel-title" className="text-2xl font-bold tracking-tight text-slate-100">
                          {series.name}
                        </h2>
                        <span className="mt-2 inline-block rounded-md border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-mono text-xs text-slate-400">
                          {isoAlpha3Display}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">Health Intelligence Report · Updated {updatedLabel}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {latest.riskLevel === 'critical' ? (<motion.span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-red-300 ring-2 ring-red-500/50" animate={{ opacity: [1, 0.72, 1], scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                              {riskLevelLabel(latest.riskLevel)}
                            </motion.span>) : (<span className={[
                    'inline-flex rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide ring-1',
                    latest.riskLevel === 'high'
                        ? 'bg-orange-500/15 text-orange-300 ring-orange-500/40'
                        : latest.riskLevel === 'medium'
                            ? 'bg-amber-500/15 text-amber-300 ring-amber-500/40'
                            : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
                ].join(' ')}>
                              {riskLevelLabel(latest.riskLevel)}
                            </span>)}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={setAsMyLocation} className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 hover:border-sky-500/50">
                            <MapPin className="h-4 w-4 text-sky-400" aria-hidden/>
                            Set as My Location
                          </button>
                          <button type="button" disabled={pdfBusy} onClick={() => void downloadPdf()} className="inline-flex items-center gap-2 rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50">
                            <Download className="h-4 w-4" aria-hidden/>
                            {pdfBusy ? 'Building PDF…' : 'Download Report (PDF)'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Close">
                      <X className="h-5 w-5"/>
                    </button>
                  </div>
                </motion.header>

                
                <motion.section variants={staggerItem}>
                  <IntelDiseasesSection series={series} latest={latest} variant="panel"/>
                </motion.section>

                
                <motion.section variants={staggerItem}>
                  <IntelAlertsSection series={series} latest={latest} variant="panel"/>
                </motion.section>

                
                <motion.section variants={staggerItem}>
                  <IntelPrecautionsSection latest={latest} variant="panel"/>
                </motion.section>

                
                <motion.section variants={staggerItem}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Prediction timeline</h3>
                    <HorizonToggle value={predictionHorizon} onChange={setPredictionHorizon}/>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Bars: past 8 weeks composite cases. Dashed line: forecast with shaded confidence band.
                  </p>
                  <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/70 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Predicted risk ({predictionLabel})</p>
                    <p className="text-2xl font-bold tabular-nums text-cyan-300" style={{ transition: 'all 0.3s ease' }}>
                      {predictionValue.toFixed(1)}
                    </p>
                  </div>
                  <div className="mt-4 h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.45}/>
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }}/>
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={36}/>
                        <Tooltip contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12,
            }}/>
                        <Bar dataKey="actual" name="Weekly cases" fill="rgba(56, 189, 248, 0.55)" radius={[4, 4, 0, 0]}/>
                        <Area type="monotone" dataKey="confStackBase" stackId="forecastBand" stroke="none" fill="rgba(0,0,0,0)" fillOpacity={0} isAnimationActive={false} legendType="none" name="Forecast band (base)"/>
                        <Area type="monotone" dataKey="confStackSpan" stackId="forecastBand" stroke="none" fill="rgba(251, 146, 60, 0.28)" isAnimationActive={false} name="Forecast confidence"/>
                        <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#fb923c" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls/>
                        {todayIndex >= 0 ? (<ReferenceLine x={timeline[todayIndex]?.label} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'Today', fill: '#94a3b8', fontSize: 10 }}/>) : null}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>

                
                <motion.section variants={staggerItem}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Environmental conditions</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <EnvIntelCard icon={<Thermometer className="h-4 w-4 text-sky-400" aria-hidden/>} label="Temperature" value={`${latest.temperatureC.toFixed(1)}\u00B0C`} badge={intelEnvBadge('temp', latest.temperatureC)}/>
                    <EnvIntelCard icon={<Droplets className="h-4 w-4 text-sky-400" aria-hidden/>} label="Humidity" value={`${latest.humidityPct.toFixed(0)}%`} badge={intelEnvBadge('humidity', latest.humidityPct)}/>
                    <EnvIntelCard icon={<CloudRain className="h-4 w-4 text-sky-400" aria-hidden/>} label="Rainfall" value={`${latest.rainfallMm.toFixed(0)} mm/wk`} badge={intelEnvBadge('rain', latest.rainfallMm)}/>
                    <EnvIntelCard icon={<Wind className="h-4 w-4 text-sky-400" aria-hidden/>} label="PM2.5" value={`${latest.pm25.toFixed(1)} \u03BCg/m\u00B3`} badge={intelEnvBadge('pm25', latest.pm25)}/>
                    <EnvIntelCard icon={<Factory className="h-4 w-4 text-sky-400" aria-hidden/>} label="NO₂" value={`${latest.no2.toFixed(1)} ppb`} badge={intelEnvBadge('no2', latest.no2)}/>
                    <EnvIntelCard icon={<Activity className="h-4 w-4 text-sky-400" aria-hidden/>} label="AQI" value={latest.aqi.toFixed(0)} badge={intelEnvBadge('aqi', latest.aqi)}/>
                  </div>
                </motion.section>
              </motion.div>
            </div>
          </motion.aside>
        </>) : null}
    </AnimatePresence>);
}
