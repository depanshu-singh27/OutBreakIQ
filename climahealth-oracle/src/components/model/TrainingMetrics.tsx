import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { history } from '../../data/modelOutputs/index';
type LossRow = {
    epoch: number;
    train: number;
    val: number;
};
function buildLossRows(): LossRow[] {
    const tl = history.train_loss ?? history.loss ?? [];
    const vl = history.val_loss ?? [];
    const ep = history.epochs && history.epochs.length > 0 ? history.epochs : tl.map((_, i) => i + 1);
    if (!tl.length)
        return [];
    const n = Math.min(tl.length, vl.length || tl.length, ep.length);
    const rows: LossRow[] = [];
    for (let i = 0; i < n; i++) {
        rows.push({ epoch: ep[i] ?? i + 1, train: tl[i]!, val: vl[i]! });
    }
    return rows;
}
export function TrainingMetrics() {
    const data = useMemo(() => buildLossRows(), []);
    const maxEp = data.length || 1;
    const bestEpoch = useMemo(() => {
        if (!data.length)
            return 1;
        let best = data[0]!.epoch;
        let bestV = data[0]!.val;
        for (const r of data) {
            if (r.val < bestV) {
                bestV = r.val;
                best = r.epoch;
            }
        }
        return best;
    }, [data]);
    const [epoch, setEpoch] = useState(maxEp);
    useEffect(() => {
        setEpoch(maxEp);
    }, [maxEp]);
    const safeEpoch = Math.min(Math.max(1, epoch), maxEp);
    const snap = data[safeEpoch - 1];
    return (<section className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-semibold text-foreground">Training metrics</h2>
      <p className="mt-1 text-sm text-muted">
        Train vs validation loss from saved training history (best epoch {bestEpoch}).
      </p>

      <div className="mt-4">
        <label htmlFor="epoch-slider" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-foreground">Epoch</span>
          <input id="epoch-slider" type="range" min={1} max={maxEp} value={safeEpoch} onChange={(e) => setEpoch(Number(e.target.value))} className="h-2 w-full max-w-xs cursor-pointer accent-[var(--color-accent)]"/>
          <span className="tabular-nums text-[var(--color-accent)]">{safeEpoch}</span>
          <span className="text-muted">
            train {snap ? snap.train.toFixed(3) : '—'} · val {snap ? snap.val.toFixed(3) : '—'}
          </span>
        </label>
      </div>

      <div className="mt-4 h-56 w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4"/>
            <XAxis dataKey="epoch" tick={{ fill: 'var(--color-fg-muted)', fontSize: 11 }}/>
            <YAxis tick={{ fill: 'var(--color-fg-muted)', fontSize: 11 }} domain={[0, 'auto']} width={40}/>
            <Tooltip contentStyle={{
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
        }} labelStyle={{ color: 'var(--color-fg)' }}/>
            <ReferenceLine x={safeEpoch} stroke="var(--color-accent)" strokeDasharray="4 4" strokeWidth={2}/>
            <ReferenceLine x={bestEpoch} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: 'Best val', fill: 'var(--color-fg-muted)', fontSize: 10 }}/>
            <Line type="monotone" dataKey="train" name="Train loss" stroke="#94a3b8" strokeWidth={2} dot={false}/>
            <Line type="monotone" dataKey="val" name="Val loss" stroke="var(--color-accent)" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
