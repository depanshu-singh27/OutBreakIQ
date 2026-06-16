import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { List, type RowComponentProps } from 'react-window';
import { Download } from 'lucide-react';
import type { CountrySeries } from '../../types';
import { buildEarlyWarningRowsFromRiskScores, compareRows, flagEmoji, rowsToCsv, type EarlyWarningRow, type SortKey, } from './earlyWarningData';
import { REGION_LABELS, type RegionKey } from './regionMapping';
import { topShapDrivers } from '../location/myLocationModel';
const DISEASE_FILTERS = [
    'all',
    'Dengue',
    'Malaria',
    'Cholera',
    'Respiratory',
    'Heat stroke',
] as const;
const RISK_FILTERS: Array<'all' | 'low' | 'medium' | 'high' | 'critical'> = [
    'all',
    'low',
    'medium',
    'high',
    'critical',
];
const REGION_FILTERS: Array<'all' | RegionKey> = [
    'all',
    'south_asia',
    'sub_saharan_africa',
    'southeast_asia',
    'latin_america',
    'middle_east',
    'pacific_islands',
    'other',
];
function riskBadgeStyle(level: string): React.CSSProperties {
    switch (level) {
        case 'critical':
            return { background: '#dc2626', color: '#ffffff', borderRadius: 9999, padding: '2px 8px', fontWeight: 600 };
        case 'high':
            return { background: '#f97316', color: '#ffffff', borderRadius: 9999, padding: '2px 8px', fontWeight: 600 };
        case 'medium':
            return { background: '#f59e0b', color: '#000000', borderRadius: 9999, padding: '2px 8px', fontWeight: 600 };
        case 'low':
            return { background: '#10b981', color: '#ffffff', borderRadius: 9999, padding: '2px 8px', fontWeight: 600 };
        default:
            return { background: '#334155', color: '#e2e8f0', borderRadius: 9999, padding: '2px 8px' };
    }
}
const COL_TEMPLATE = 'grid grid-cols-[2.5rem_1.2fr_1fr_5.5rem_4.5rem_4rem_1fr_3.5rem] gap-2 items-center';
type FeedRowProps = {
    rows: EarlyWarningRow[];
    expanded: Set<string>;
    toggle: (id: string) => void;
};
function VirtualRow({ ariaAttributes, index, style, rows, expanded, toggle, }: RowComponentProps<FeedRowProps>) {
    const row = rows[index]!;
    const open = expanded.has(row.id);
    return (<div {...ariaAttributes} style={style} className="border-b border-border">
      <button type="button" onClick={() => toggle(row.id)} className={`${COL_TEMPLATE} w-full px-2 py-2 text-left text-xs hover:bg-elevated/80 sm:text-sm`}>
        <span className="text-center text-lg" aria-hidden>
          {flagEmoji(row.countryCode)}
        </span>
        <span className="truncate font-medium text-foreground">{row.countryName}</span>
        <span className="truncate text-muted">{row.disease}</span>
        <span className="flex justify-center">
          <span className="text-[10px] font-semibold capitalize sm:text-xs" style={riskBadgeStyle(row.riskLevel)}>
            {row.riskLevel}
          </span>
        </span>
        <span className="tabular-nums text-foreground">{row.predictedCases}</span>
        <span className="tabular-nums text-muted">{row.daysToPeak}</span>
        <span className="truncate text-muted">{row.primaryDriver}</span>
        <span className="text-right tabular-nums text-[var(--color-accent)]">{row.confidencePct}%</span>
      </button>
      {open ? (<div className="border-t border-border bg-[var(--color-bg)] px-3 py-3 sm:px-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Risk trend (12 wk)</p>
              <div className="mt-2 h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={row.sparkline}>
                    <YAxis domain={[0, 100]} hide width={0}/>
                    <Line type="monotone" dataKey="risk" stroke="var(--color-accent)" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Top drivers (plain English)</p>
              <ul className="mt-2 space-y-2 text-xs text-muted">
                {topShapDrivers(row.series, row.latest, row.disease, 3).map((d) => (<li key={d.key} className="rounded-md border border-border bg-elevated p-2">
                    <span className="font-medium text-foreground">{d.title}</span>
                    <p className="mt-1 leading-snug">{d.body}</p>
                  </li>))}
              </ul>
            </div>
          </div>
        </div>) : null}
    </div>);
}
type EarlyWarningFeedProps = {
    countries: CountrySeries[];
};
export function EarlyWarningFeed({ countries }: EarlyWarningFeedProps) {
    const baseRows = useMemo(() => buildEarlyWarningRowsFromRiskScores(countries), [countries]);
    const [search, setSearch] = useState('');
    const [diseaseF, setDiseaseF] = useState<(typeof DISEASE_FILTERS)[number]>('all');
    const [riskF, setRiskF] = useState<(typeof RISK_FILTERS)[number]>('all');
    const [regionF, setRegionF] = useState<(typeof REGION_FILTERS)[number]>('all');
    const [sortKey, setSortKey] = useState<SortKey>('risk');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [listDims, setListDims] = useState({ width: 960, height: 480 });
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const update = () => setListDims({
            width: Math.max(320, el.clientWidth),
            height: Math.max(320, el.clientHeight),
        });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        update();
        return () => ro.disconnect();
    }, []);
    const filtered = useMemo(() => {
        let r = baseRows;
        const q = search.trim().toLowerCase();
        if (q) {
            r = r.filter((x) => x.countryName.toLowerCase().includes(q) ||
                x.countryCode.toLowerCase().includes(q) ||
                x.id.toLowerCase().includes(q));
        }
        if (diseaseF !== 'all') {
            r = r.filter((x) => x.disease === diseaseF);
        }
        if (riskF !== 'all') {
            r = r.filter((x) => x.riskLevel === riskF);
        }
        if (regionF !== 'all') {
            r = r.filter((x) => x.region === regionF);
        }
        return [...r].sort((a, b) => compareRows(a, b, sortKey, sortDir));
    }, [baseRows, diseaseF, regionF, riskF, search, sortDir, sortKey]);
    const toggleExpand = useCallback((id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, []);
    const toggleSort = (k: SortKey) => {
        if (sortKey === k)
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(k);
            setSortDir(k === 'country' || k === 'disease' || k === 'driver' ? 'asc' : 'desc');
        }
    };
    const downloadCsv = () => {
        const blob = new Blob([rowsToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `early-warnings-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const rowProps = useMemo((): FeedRowProps => ({ rows: filtered, expanded, toggle: toggleExpand }), [filtered, expanded, toggleExpand]);
    const rowHeight = useCallback((index: number, props: FeedRowProps) => {
        const id = props.rows[index]?.id;
        return id && props.expanded.has(id) ? 268 : 44;
    }, []);
    return (<section className="flex min-h-0 flex-1 flex-col rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Early warning feed</h2>
          <button type="button" onClick={downloadCsv} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2 text-sm font-medium text-foreground hover:border-[var(--color-accent)]">
            <Download className="h-4 w-4" aria-hidden/>
            Download CSV
          </button>
        </div>
        <input type="search" placeholder="Search country or ISO code…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted"/>
        <div className="flex flex-wrap gap-2">
          <select value={diseaseF} onChange={(e) => setDiseaseF(e.target.value as (typeof DISEASE_FILTERS)[number])} className="rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs text-foreground">
            {DISEASE_FILTERS.map((d) => (<option key={d} value={d}>
                {d === 'all' ? 'All diseases' : d}
              </option>))}
          </select>
          <select value={riskF} onChange={(e) => setRiskF(e.target.value as (typeof RISK_FILTERS)[number])} className="rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs text-foreground">
            {RISK_FILTERS.map((r) => (<option key={r} value={r}>
                {r === 'all' ? 'All risk levels' : r}
              </option>))}
          </select>
          <select value={regionF} onChange={(e) => setRegionF(e.target.value as (typeof REGION_FILTERS)[number])} className="rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs text-foreground">
            {REGION_FILTERS.map((r) => (<option key={r} value={r}>
                {r === 'all' ? 'All regions' : REGION_LABELS[r]}
              </option>))}
          </select>
        </div>
      </div>

      <div className={`${COL_TEMPLATE} border-b border-border bg-elevated px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs`}>
        <span className="text-center">Flag</span>
        <button type="button" onClick={() => toggleSort('country')} className="text-left hover:text-foreground">
          Country {sortKey === 'country' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('disease')} className="text-left hover:text-foreground">
          Disease {sortKey === 'disease' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('risk')} className="text-center hover:text-foreground">
          Risk {sortKey === 'risk' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('cases')} className="text-left hover:text-foreground">
          Cases {sortKey === 'cases' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('days')} className="text-left hover:text-foreground">
          Peak {sortKey === 'days' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('driver')} className="text-left hover:text-foreground">
          Driver {sortKey === 'driver' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button type="button" onClick={() => toggleSort('confidence')} className="text-right hover:text-foreground">
          Conf. {sortKey === 'confidence' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </button>
      </div>

      <div ref={containerRef} className="h-[min(55vh,560px)] min-h-[320px] w-full overflow-hidden">
        {filtered.length === 0 ? (<p className="p-6 text-sm text-muted">No rows match your filters.</p>) : (<List<FeedRowProps> rowComponent={VirtualRow} rowCount={filtered.length} rowHeight={rowHeight} rowProps={rowProps} overscanCount={4} style={{ height: listDims.height, width: listDims.width }}/>)}
      </div>
    </section>);
}
