import { useCallback, useState } from 'react';
import { backtest, metrics, shap } from '../../data/modelOutputs/index';
type NodeId = 'inputs' | 'lstm' | 'embeddings' | 'xgboost' | 'calibrated';
const NODE_SHORT: Record<NodeId, string> = {
    inputs: 'Multivariate\ninputs',
    lstm: 'LSTM\nencoder',
    embeddings: 'Sequence\nembeddings',
    xgboost: 'XGBoost\nfusion',
    calibrated: 'Calibrated\nrisk',
};
const NODE_COPY: Record<NodeId, {
    title: string;
    body: string;
}> = {
    inputs: {
        title: 'Multivariate inputs',
        body: 'Weekly vectors combine climate anomalies, water and sanitation proxies, mobility, and disease burden history. Each country-time step is aligned so the temporal model sees a consistent feature order.',
    },
    lstm: {
        title: 'LSTM temporal encoder',
        body: 'A recurrent stack reads the past sequence of inputs and learns short- and medium-term dynamics—lags, persistence after shocks, and seasonality—producing a compact hidden state that summarizes recent trajectory.',
    },
    embeddings: {
        title: 'Sequence embeddings',
        body: 'The final LSTM hidden states form a fixed-length embedding per location. This bridges irregular climate signals and irregular health reporting into a single vector the tree ensemble can score.',
    },
    xgboost: {
        title: 'XGBoost fusion',
        body: 'Gradient-boosted trees blend the LSTM embedding with hand-picked static and contextual features. Trees excel at sharp thresholds (e.g., extreme rainfall buckets) while the LSTM carries smooth temporal context.',
    },
    calibrated: {
        title: 'Calibrated risk score',
        body: 'Outputs are scaled with a calibration layer so displayed risk aligns with historical hit rates. The hybrid reduces overconfidence from either component alone before thresholds drive early-warning badges.',
    },
};
const BOXES: Record<NodeId, {
    x: number;
    y: number;
    w: number;
    h: number;
}> = {
    inputs: { x: 32, y: 140, w: 118, h: 72 },
    lstm: { x: 198, y: 132, w: 124, h: 88 },
    embeddings: { x: 372, y: 140, w: 132, h: 72 },
    xgboost: { x: 556, y: 132, w: 118, h: 88 },
    calibrated: { x: 712, y: 148, w: 108, h: 56 },
};
function centerRight(b: (typeof BOXES)[NodeId]) {
    return { x: b.x + b.w, y: b.y + b.h / 2 };
}
function centerLeft(b: (typeof BOXES)[NodeId]) {
    return { x: b.x, y: b.y + b.h / 2 };
}
export function ModelArchitectureDiagram() {
    const [active, setActive] = useState<NodeId | null>(null);
    const close = useCallback(() => setActive(null), []);
    const i = BOXES.inputs;
    const l = BOXES.lstm;
    const e = BOXES.embeddings;
    const x = BOXES.xgboost;
    const c = BOXES.calibrated;
    const p1 = `M ${i.x + i.w} ${i.y + i.h / 2} L ${l.x} ${l.y + l.h / 2}`;
    const p2 = `M ${l.x + l.w} ${l.y + l.h / 2} L ${e.x} ${e.y + e.h / 2}`;
    const p3 = `M ${e.x + e.w} ${e.y + e.h / 2} L ${x.x} ${x.y + x.h / 2}`;
    const p4 = `M ${x.x + x.w} ${x.y + x.h / 2} L ${c.x} ${c.y + c.h / 2}`;
    const pSkip = `M ${l.x + l.w * 0.55} ${l.y + l.h} C ${l.x + l.w * 0.55} ${l.y + l.h + 56} ${x.x + x.w * 0.35} ${x.y + x.h + 48} ${x.x + x.w * 0.35} ${x.y + x.h}`;
    const cr = centerRight(l);
    const cl = centerLeft(x);
    const pLatent = `M ${cr.x} ${cr.y} Q ${(cr.x + cl.x) / 2} ${cr.y - 72} ${cl.x} ${cl.y}`;
    return (<div className="relative rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold text-foreground">LSTM + XGBoost hybrid pipeline</h2>
          <p className="mb-3 max-w-2xl text-sm text-muted">
            Click a stage to read a plain-English description. Dashed connectors animate to suggest data flow.
          </p>
          <div className="mb-4 grid max-w-2xl grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">MAE (fusion)</p>
              <p className="font-mono font-semibold text-foreground">
                {metrics.mae_fusion.toFixed(2)} <span className="font-sans font-normal text-muted">risk score pts (0–100)</span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">RMSE (fusion)</p>
              <p className="font-mono font-semibold text-foreground">
                {metrics.rmse_fusion.toFixed(2)} <span className="font-sans font-normal text-muted">risk score pts</span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">Train / test</p>
              <p className="font-mono font-semibold text-foreground">
                {metrics.train_samples.toLocaleString()} / {metrics.test_samples.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">Features</p>
              <p className="font-mono font-semibold text-foreground">{metrics.n_features}</p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">Countries</p>
              <p className="font-mono font-semibold text-foreground">{metrics.n_countries}</p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5">
              <p className="text-muted">Backtest weeks</p>
              <p className="font-mono font-semibold text-foreground">{backtest.weeks?.length ?? 0}</p>
            </div>
            <div className="rounded-md border border-border bg-elevated px-2 py-1.5 sm:col-span-3">
              <p className="text-muted">Top SHAP (first feature)</p>
              <p className="truncate font-mono text-[11px] text-foreground">
                {shap.length > 0 ? `${shap[0]!.feature} (${shap[0]!.mean_shap.toFixed(4)})` : '—'}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 860 320" className="h-auto w-full min-w-[640px] text-[var(--color-fg)]" role="img" aria-label="Model architecture diagram">
            <defs>
              <marker id="arrow-model" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-accent)" opacity={0.85}/>
              </marker>
            </defs>

            <path d={p1} className="model-arch-flow-path" markerEnd="url(#arrow-model)"/>
            <path d={p2} className="model-arch-flow-path model-arch-flow-path--dim"/>
            <path d={p3} className="model-arch-flow-path model-arch-flow-path--dim"/>
            <path d={p4} className="model-arch-flow-path" markerEnd="url(#arrow-model)"/>
            <path d={pLatent} className="model-arch-flow-path model-arch-flow-path--branch"/>
            <path d={pSkip} className="model-arch-flow-path model-arch-flow-path--branch"/>

            {(Object.keys(BOXES) as NodeId[]).map((id) => {
            const b = BOXES[id];
            const on = active === id;
            return (<g key={id}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} className={`cursor-pointer transition-[stroke,fill] ${on
                    ? 'fill-[var(--color-elevated)] stroke-[var(--color-accent)] stroke-[2.5]'
                    : 'fill-[var(--color-elevated)] stroke-[var(--color-border)] stroke-2 hover:stroke-[var(--color-accent-hover)]'}`} onClick={() => setActive(id)} onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setActive(id);
                    }
                }} tabIndex={0} role="button" aria-pressed={on} aria-label={NODE_COPY[id].title}/>
                  <text x={b.x + b.w / 2} y={b.y + b.h / 2} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-[var(--color-fg)] text-[10px] font-semibold">
                    {NODE_SHORT[id].split('\n').map((line, li) => (<tspan key={li} x={b.x + b.w / 2} dy={li === 0 ? '-0.5em' : '1.05em'}>
                        {line}
                      </tspan>))}
                  </text>
                </g>);
        })}
          </svg>
        </div>

        <aside className={`w-full shrink-0 rounded-[var(--radius-sm)] border border-border bg-elevated p-4 transition-opacity lg:w-[min(100%,280px)] ${active ? 'opacity-100' : 'opacity-90'}`}>
          {active ? (<>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{NODE_COPY[active].title}</h3>
                <button type="button" onClick={close} className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-[var(--color-surface)] hover:text-foreground">
                  Close
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{NODE_COPY[active].body}</p>
            </>) : (<p className="text-sm text-muted">Select a node in the diagram to see how that stage contributes to the forecast.</p>)}
        </aside>
      </div>
    </div>);
}
