import { useMemo } from 'react';
import { getClimateDataset } from '../../data/climateDataset';
import { useAppUi } from '../../hooks/useAppUi';
import { GlobalMap } from '../dashboard/GlobalMap';
import { GlobalMapSkeleton } from '../ui/ViewSkeletons';
export function GlobalMapView() {
    const { showPanelSkeletons } = useAppUi();
    const countries = useMemo(() => getClimateDataset().countries, []);
    if (showPanelSkeletons) {
        return <GlobalMapSkeleton />;
    }
    return (<div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Global map</h1>
        <p className="mt-1 text-sm text-muted">
          {countries.length} countries (UN roster + observers) · click a country to open the intelligence
          drawer; layers match the dashboard map.
        </p>
      </header>
      <GlobalMap countries={countries}/>
    </div>);
}
