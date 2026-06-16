import { useContext, type RefObject } from 'react';
import { AppUiContext, type AppUiValue } from '../context/AppUiContext';
export function useAppUi(): AppUiValue {
    const v = useContext(AppUiContext);
    if (!v) {
        return { captureRef: { current: null } as RefObject<HTMLDivElement | null>, showPanelSkeletons: false };
    }
    return v;
}
