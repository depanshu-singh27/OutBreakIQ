export { GlobalMapView } from './GlobalMapView';
export { MyLocationView } from './MyLocationView';
type PlaceholderProps = {
    title?: string;
    description?: string;
};
export function LocationPlaceholder({ title = 'Location', description = 'Placeholder — add ComposableMap / geography layers.', }: PlaceholderProps) {
    return (<section className="rounded-[var(--radius-md)] border border-border bg-elevated p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </section>);
}
export function GlobalMapPlaceholder() {
    return (<section className="rounded-[var(--radius-md)] border border-border bg-elevated p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-medium text-foreground">Global Map</h2>
      <p className="mt-2 text-sm text-muted">
        Placeholder — choropleth risk layers and react-simple-maps topology.
      </p>
    </section>);
}
