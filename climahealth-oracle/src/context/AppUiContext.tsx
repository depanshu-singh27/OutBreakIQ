import { createContext, type ReactNode, type RefObject } from 'react';
export type AppUiValue = {
    captureRef: RefObject<HTMLDivElement | null>;
    showPanelSkeletons: boolean;
};
export const AppUiContext = createContext<AppUiValue | null>(null);
export function AppUiProvider({ children, value, }: {
    children: ReactNode;
    value: AppUiValue;
}) {
    return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
}
