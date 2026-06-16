import type { DashboardAlert } from './dashboardModel';
type AlertBannerProps = {
    alerts: DashboardAlert[];
};
export function AlertBanner({ alerts }: AlertBannerProps) {
    const critical = alerts.filter((a) => a.level === 'critical').slice(0, 5);
    if (critical.length === 0) {
        return (<div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] px-4 py-2 text-sm text-muted">
        No critical alerts in the synthetic feed.
      </div>);
    }
    const items = [...critical, ...critical];
    return (<div className="relative overflow-hidden rounded-[var(--radius-md)] border border-red-500/30 bg-red-950/20 py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-bg)] to-transparent"/>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent"/>
      <div className="flex animate-dashboard-marquee whitespace-nowrap">
        {items.map((a, i) => (<span key={`${a.id}-${i}`} className="inline-flex items-center gap-2 px-8 text-sm text-foreground">
            <span className="font-mono text-xs text-red-400">CRITICAL</span>
            <span className="text-muted">{a.countryName}</span>
            <span className="text-foreground/90">{a.title}</span>
            <span className="text-muted">·</span>
            <span className="max-w-[220px] truncate text-muted">{a.detail}</span>
          </span>))}
      </div>
    </div>);
}
