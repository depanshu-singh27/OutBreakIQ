import { useMemo } from 'react';
import { getClimateDataset } from '../../data/climateDataset';
import { useAppUi } from '../../hooks/useAppUi';
import { DashboardSkeleton } from '../ui/ViewSkeletons';
import { AlertBanner } from './AlertBanner';
import { AlertFeed } from './AlertFeed';
import { buildAllDashboardAlerts, buildChartRows, buildFeatureCorrelationMatrix, computeGlobalKpis, } from './dashboardModel';
import { GlobalMap } from './GlobalMap';
import { HeatmapGrid } from './HeatmapGrid';
import { RiskScoreCard } from './RiskScoreCard';
import { TimeSeriesPanel } from './TimeSeriesPanel';
export function DashboardView() {
    const { showPanelSkeletons } = useAppUi();
    const countries = useMemo(() => getClimateDataset().countries, []);
    const kpis = useMemo(() => computeGlobalKpis(countries), [countries]);
    const alerts = useMemo(() => buildAllDashboardAlerts(countries), [countries]);
    const chartRows = useMemo(() => buildChartRows(countries), [countries]);
    const correlation = useMemo(() => buildFeatureCorrelationMatrix(countries), [countries]);
    if (showPanelSkeletons) {
        return <DashboardSkeleton />;
    }
    return (<div className="space-y-4">
      <AlertBanner alerts={alerts}/>
      <RiskScoreCard kpis={kpis}/>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <GlobalMap countries={countries}/>
          <TimeSeriesPanel rows={chartRows}/>
          <HeatmapGrid matrix={correlation}/>
        </div>
        <AlertFeed alerts={alerts}/>
      </div>
    </div>);
}
