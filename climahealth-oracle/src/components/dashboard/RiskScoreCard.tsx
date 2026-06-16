import { useAnimatedFloat, useAnimatedInt } from '../../hooks/useCountUp';
import type { GlobalKpis } from './dashboardModel';
import { useAppStore } from '../../store/appStore';
import { riskScores } from '../../data/modelOutputs/index';
type RiskScoreCardProps = {
    kpis: GlobalKpis;
};
export function RiskScoreCard({ kpis }: RiskScoreCardProps) {
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    const critical = useAnimatedInt(kpis.criticalCount);
    const avg = useAnimatedFloat(kpis.globalAvgRisk);
    const highest = useAnimatedFloat(kpis.highestRiskScore);
    const zones = useAnimatedInt(kpis.outbreakZones);
    const predictedAvg = riskScores.length === 0
        ? 0
        : Math.round((riskScores.reduce((sum, c) => {
            const v = predictionHorizon === '7d'
                ? c.prediction_7d
                : predictionHorizon === '30d'
                    ? c.prediction_30d
                    : c.prediction_90d;
            return sum + (v ?? c.risk_score);
        }, 0) /
            riskScores.length) *
            10) / 10;
    const projectedRisk = useAnimatedFloat(predictedAvg);
    return (<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Countries at critical risk</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-red-400" style={{ transition: 'all 0.3s ease' }}>{critical}</p>
        <p className="mt-1 text-xs text-muted">Latest week · model riskLevel = critical</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Global average risk score</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-accent)]">
          <span style={{ transition: 'all 0.3s ease' }}>{avg.toFixed(1)}</span>
        </p>
        <p className="mt-1 text-xs text-muted">Mean across all countries</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Highest risk country</p>
        <p className="mt-2 truncate text-lg font-semibold text-foreground">{kpis.highestRiskCountry}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-orange-400" style={{ transition: 'all 0.3s ease' }}>{highest.toFixed(1)}</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active outbreak zones</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-amber-400" style={{ transition: 'all 0.3s ease' }}>{zones}</p>
        <p className="mt-1 text-xs text-muted">Countries with risk score ≥ 50</p>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Predicted global risk ({predictionHorizon})</p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-400" style={{ transition: 'all 0.3s ease' }}>
          {projectedRisk.toFixed(1)}
        </p>
        <p className="mt-1 text-xs text-muted">Mean modeled horizon-adjusted projection</p>
      </div>
    </div>);
}
