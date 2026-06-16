import { useAppUi } from '../../hooks/useAppUi';
import { ModelSkeleton } from '../ui/ViewSkeletons';
import { ModelArchitectureDiagram } from './ModelArchitectureDiagram';
import { TrainingMetrics } from './TrainingMetrics';
export function ModelView() {
    const { showPanelSkeletons } = useAppUi();
    if (showPanelSkeletons) {
        return <ModelSkeleton />;
    }
    return (<div className="flex flex-col gap-8">
      <ModelArchitectureDiagram />
      <TrainingMetrics />
    </div>);
}
