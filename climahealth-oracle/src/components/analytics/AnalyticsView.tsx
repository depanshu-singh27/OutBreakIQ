import { useMemo } from 'react';
import { useAppUi } from '../../hooks/useAppUi';
import { getClimateDataset } from '../../data/climateDataset';
import { AnalyticsSkeleton } from '../ui/ViewSkeletons';
import { buildFeatureCorrelationMatrix } from '../dashboard/dashboardModel';
import { CorrelationMatrix } from './CorrelationMatrix';
import { FeatureImportance } from './FeatureImportance';
import { PredictionAccuracy } from './PredictionAccuracy';
import { SHAPChart } from './SHAPChart';
export function AnalyticsView() {
    const { showPanelSkeletons } = useAppUi();
    const countries = useMemo(() => getClimateDataset().countries, []);
    const matrix = useMemo(() => buildFeatureCorrelationMatrix(countries), [countries]);
    if (showPanelSkeletons) {
        return <AnalyticsSkeleton />;
    }
    return (<div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          SHAP breakdowns, global drivers, feature correlations, and simple backtests on the synthetic panel.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <SHAPChart countries={countries}/>
        <CorrelationMatrix matrix={matrix}/>
      </div>

      <FeatureImportance countries={countries}/>

      <PredictionAccuracy countries={countries}/>
    </div>);
}
