import { create } from 'zustand';
export type PredictionHorizon = '7d' | '30d' | '90d';
export type ThemeMode = 'dark' | 'light';
export type TimeRange = '3m' | '6m' | '1y' | '2y';
export type ActiveView = 'dashboard' | 'myLocation' | 'globalMap' | 'analytics' | 'alerts' | 'model';
export type AlertsFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
export type LocationPermission = 'granted' | 'denied' | 'pending';
export interface UserLocation {
    lat: number;
    lng: number;
    countryCode: string;
    city: string;
    country?: string;
}
export interface AppStoreState {
    selectedCountry: string | null;
    predictionHorizon: PredictionHorizon;
    theme: ThemeMode;
    timeRange: TimeRange;
    activeView: ActiveView;
    alertsFilter: AlertsFilter;
    userLocation: UserLocation | null;
    locationPermission: LocationPermission;
}
export interface AppStoreActions {
    setSelectedCountry: (countryCode: string | null) => void;
    setPredictionHorizon: (horizon: PredictionHorizon) => void;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
    setTimeRange: (range: TimeRange) => void;
    setActiveView: (view: ActiveView) => void;
    setAlertsFilter: (filter: AlertsFilter) => void;
    setUserLocation: (location: UserLocation | null) => void;
    setLocationPermission: (permission: LocationPermission) => void;
    resetFilters: () => void;
    resetLocation: () => void;
}
export type AppStore = AppStoreState & AppStoreActions;
const initialState: AppStoreState = {
    selectedCountry: null,
    predictionHorizon: '30d',
    theme: 'dark',
    timeRange: '1y',
    activeView: 'dashboard',
    alertsFilter: 'all',
    userLocation: null,
    locationPermission: 'pending',
};
export const useAppStore = create<AppStore>((set) => ({
    ...initialState,
    setSelectedCountry: (selectedCountry) => set({ selectedCountry }),
    setPredictionHorizon: (predictionHorizon) => set({ predictionHorizon }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark',
    })),
    setTimeRange: (timeRange) => set({ timeRange }),
    setActiveView: (activeView) => set({ activeView }),
    setAlertsFilter: (alertsFilter) => set({ alertsFilter }),
    setUserLocation: (userLocation) => set({ userLocation }),
    setLocationPermission: (locationPermission) => set({ locationPermission }),
    resetFilters: () => set({
        selectedCountry: initialState.selectedCountry,
        predictionHorizon: initialState.predictionHorizon,
        timeRange: initialState.timeRange,
        alertsFilter: initialState.alertsFilter,
    }),
    resetLocation: () => set({
        userLocation: initialState.userLocation,
        locationPermission: initialState.locationPermission,
    }),
}));
