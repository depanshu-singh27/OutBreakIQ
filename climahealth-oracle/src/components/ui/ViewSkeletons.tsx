function Shimmer({ className = '' }: {
    className?: string;
}) {
    return <div className={['animate-shimmer rounded-[var(--radius-md)]', className].join(' ')}/>;
}
export function DashboardSkeleton() {
    return (<div className="space-y-4">
      <Shimmer className="h-14 w-full"/>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (<Shimmer key={i} className="h-28"/>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)]">
        <div className="space-y-4">
          <Shimmer className="h-[min(420px,55vh)] w-full"/>
          <Shimmer className="h-64 w-full"/>
          <Shimmer className="h-72 w-full"/>
        </div>
        <Shimmer className="min-h-[320px]"/>
      </div>
    </div>);
}
export function AnalyticsSkeleton() {
    return (<div className="space-y-6">
      <Shimmer className="h-24 w-full max-w-xl"/>
      <div className="grid gap-6 xl:grid-cols-2">
        <Shimmer className="h-80"/>
        <Shimmer className="h-80"/>
      </div>
      <Shimmer className="h-96 w-full"/>
      <Shimmer className="h-80 w-full"/>
    </div>);
}
export function AlertsSkeleton() {
    return (<div className="space-y-8">
      <div className="space-y-4 rounded-[var(--radius-md)] border border-border p-4">
        <div className="flex flex-wrap gap-2">
          <Shimmer className="h-9 w-40"/>
          <Shimmer className="h-9 w-32"/>
        </div>
        <Shimmer className="h-10 max-w-md"/>
        <Shimmer className="h-9 w-full max-w-lg"/>
        <Shimmer className="h-[min(55vh,560px)] w-full"/>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (<Shimmer key={i} className="h-56"/>))}
      </div>
    </div>);
}
export function ModelSkeleton() {
    return (<div className="space-y-8">
      <Shimmer className="h-[min(360px,50vh)] w-full"/>
      <Shimmer className="h-72 w-full"/>
    </div>);
}
export function GlobalMapSkeleton() {
    return (<div className="space-y-4">
      <Shimmer className="h-8 w-72"/>
      <Shimmer className="h-[min(480px,60vh)] w-full"/>
      <p className="text-xs text-muted">195 countries · map topology loading…</p>
    </div>);
}
export function MyLocationSkeleton() {
    return (<div className="space-y-6">
      <Shimmer className="h-40 w-full"/>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (<Shimmer key={i} className="h-24"/>))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Shimmer className="h-72"/>
        <Shimmer className="h-72"/>
      </div>
    </div>);
}
