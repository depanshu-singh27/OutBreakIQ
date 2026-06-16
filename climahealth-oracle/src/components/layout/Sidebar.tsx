import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Globe2, LayoutDashboard, LineChart, MapPin, Network, } from 'lucide-react';
import type { ActiveView } from '../../store/appStore';
import { useAppStore } from '../../store/appStore';
import { GlobalRiskPulse } from './GlobalRiskPulse';
const NAV_ITEMS: {
    view: ActiveView;
    label: string;
    icon: typeof LayoutDashboard;
}[] = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'myLocation', label: 'My Location', icon: MapPin },
    { view: 'globalMap', label: 'Global Map', icon: Globe2 },
    { view: 'analytics', label: 'Analytics', icon: LineChart },
    { view: 'alerts', label: 'Early Warnings', icon: AlertTriangle },
    { view: 'model', label: 'Model Architecture', icon: Network },
];
const MOBILE_NAV_VIEWS = new Set<ActiveView>([
    'dashboard',
    'myLocation',
    'globalMap',
    'analytics',
    'alerts',
]);
function NavButton({ item, collapsed, active, onSelect, }: {
    item: (typeof NAV_ITEMS)[number];
    collapsed: boolean;
    active: boolean;
    onSelect: () => void;
}) {
    const Icon = item.icon;
    return (<button type="button" onClick={onSelect} title={item.label} className={[
            'flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm font-medium transition-colors',
            active
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'text-muted hover:bg-elevated hover:text-foreground',
            collapsed ? 'justify-center px-0' : '',
        ].join(' ')}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden/>
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </button>);
}
export function Sidebar() {
    const activeView = useAppStore((s) => s.activeView);
    const setActiveView = useAppStore((s) => s.setActiveView);
    const [collapsed, setCollapsed] = useState(false);
    return (<>
      
      <aside className="relative z-20 hidden h-svh shrink-0 flex-col border-r border-border bg-[var(--color-surface)] md:flex" style={{ width: collapsed ? 64 : 240 }} aria-label="Main navigation">
        <div className="flex h-14 items-center justify-between border-b border-border px-2">
          {!collapsed ? (<span className="truncate pl-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Navigate
            </span>) : null}
          <button type="button" onClick={() => setCollapsed((c) => !c)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-elevated hover:text-foreground" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? (<ChevronRight className="h-5 w-5" aria-hidden/>) : (<ChevronLeft className="h-5 w-5" aria-hidden/>)}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (<NavButton key={item.view} item={item} collapsed={collapsed} active={activeView === item.view} onSelect={() => setActiveView(item.view)}/>))}
        </nav>

        <div className={`mt-auto border-t border-border ${collapsed ? 'p-1' : 'p-2'}`}>
          {collapsed ? (<p className="px-1 py-2 text-center text-[9px] text-muted" title="Expand sidebar for global risk pulse">
              Pulse
            </p>) : (<GlobalRiskPulse />)}
        </div>
      </aside>

      
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-[var(--color-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Main navigation">
        {NAV_ITEMS.filter((item) => MOBILE_NAV_VIEWS.has(item.view)).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.view;
            return (<button key={item.view} type="button" onClick={() => setActiveView(item.view)} className={[
                    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                    active ? 'text-[var(--color-accent)]' : 'text-muted',
                ].join(' ')} aria-label={item.label} aria-current={active ? 'page' : undefined}>
              <Icon className="h-6 w-6 shrink-0" aria-hidden/>
              <span className="sr-only">{item.label}</span>
            </button>);
        })}
      </nav>
    </>);
}
