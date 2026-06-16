import { useMemo, type CSSProperties } from 'react';
import type { DashboardAlert } from './dashboardModel';
import type { AlertsFilter } from '../../store/appStore';
import { useAppStore } from '../../store/appStore';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
const FILTERS: AlertsFilter[] = ['all', 'critical', 'high', 'medium', 'low'];
function cardRiskStyle(level: DashboardAlert['riskLevel']): CSSProperties {
    const base: CSSProperties = { transition: 'all 0.3s ease', borderLeftWidth: 4, borderLeftStyle: 'solid' };
    if (level === 'critical')
        return { ...base, borderLeftColor: '#dc2626', background: 'rgba(220,38,38,0.08)' };
    if (level === 'high')
        return { ...base, borderLeftColor: '#f97316', background: 'rgba(249,115,22,0.08)' };
    if (level === 'medium')
        return { ...base, borderLeftColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' };
    return { ...base, borderLeftColor: '#10b981', background: 'rgba(16,185,129,0.05)' };
}
type AlertFeedProps = {
    alerts: DashboardAlert[];
};
function levelIcon(level: DashboardAlert['riskLevel']) {
    if (level === 'critical')
        return <AlertCircle className="h-4 w-4 text-red-400" aria-hidden/>;
    if (level === 'high')
        return <AlertTriangle className="h-4 w-4 text-orange-400" aria-hidden/>;
    if (level === 'medium')
        return <Info className="h-4 w-4 text-amber-300" aria-hidden/>;
    return <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden/>;
}
export function AlertFeed({ alerts }: AlertFeedProps) {
    const alertsFilter = useAppStore((s) => s.alertsFilter);
    const setAlertsFilter = useAppStore((s) => s.setAlertsFilter);
    const filteredAlerts = useMemo(() => (alertsFilter === 'all' ? alerts : alerts.filter((a) => a.riskLevel === alertsFilter)), [alerts, alertsFilter]);
    return (<aside className="flex h-[min(720px,70vh)] flex-col rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:sticky lg:top-20">
      <div className="border-b border-border p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Alert feed</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (<button key={f} type="button" onClick={() => setAlertsFilter(f)} className={[
                'rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                alertsFilter === f
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                    : 'bg-elevated text-muted hover:text-foreground',
            ].join(' ')}>
              {f}
            </button>))}
        </div>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {filteredAlerts.slice(0, 200).map((a) => (<li key={a.id} className="rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm shadow-[var(--shadow-sm)]" style={cardRiskStyle(a.riskLevel)}>
            <p className="flex items-center gap-2 font-semibold text-foreground">
              {levelIcon(a.riskLevel)}
              {a.countryName}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted">{a.riskLevel}</p>
            <p className="mt-1 font-medium">{a.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{a.detail}</p>
            {a.confidence != null ? (<p className="mt-1 text-[10px] text-muted">Confidence: {a.confidence}%</p>) : null}
            <p className="mt-1 text-[10px] text-muted">{a.weekStart}</p>
          </li>))}
      </ul>
    </aside>);
}
