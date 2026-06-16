import { useMemo } from 'react';
import { useAppUi } from '../../hooks/useAppUi';
import { getClimateDataset } from '../../data/climateDataset';
import { AlertsSkeleton } from '../ui/ViewSkeletons';
import { EarlyWarningFeed } from './EarlyWarningFeed';
import { RegionalSummaryCard } from './RegionalSummaryCard';
import { SUMMARY_REGIONS } from './regionMapping';
export function AlertsView() {
    const { showPanelSkeletons } = useAppUi();
    const countries = useMemo(() => getClimateDataset().countries, []);
    if (showPanelSkeletons) {
        return <AlertsSkeleton />;
    }
    return (<div className="flex flex-col gap-8">
      <EarlyWarningFeed countries={countries}/>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Regional summaries</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SUMMARY_REGIONS.map((region) => (<RegionalSummaryCard key={region} region={region} countries={countries}/>))}
        </div>
      </section>
    </div>);
}
