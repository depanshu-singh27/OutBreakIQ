export { AlertsView } from './AlertsView';
export { EarlyWarningFeed } from './EarlyWarningFeed';
export { RegionalSummaryCard } from './RegionalSummaryCard';
export function AlertsPlaceholder() {
    return (<section className="rounded-[var(--radius-md)] border border-border bg-elevated p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-medium text-foreground">Early warnings</h2>
      <p className="mt-2 text-sm text-muted">Placeholder — list climate / health alerts.</p>
    </section>);
}
