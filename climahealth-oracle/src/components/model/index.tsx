export { ModelView } from './ModelView';
export { ModelArchitectureDiagram } from './ModelArchitectureDiagram';
export { TrainingMetrics } from './TrainingMetrics';
export function ModelPlaceholder() {
    return (<section className="rounded-[var(--radius-md)] border border-border bg-elevated p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-medium text-foreground">Model architecture</h2>
      <p className="mt-2 text-sm text-muted">Placeholder — prediction flow, SHAP, and scenario controls.</p>
    </section>);
}
