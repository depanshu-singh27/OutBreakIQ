import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertsView } from './components/alerts';
import { AnalyticsView } from './components/analytics';
import { LandingPage } from './components/auth/LandingPage';
import { SplashScreen as AuthSplashScreen } from './components/auth/SplashScreen';
import { CountryIntelPanel, DashboardView } from './components/dashboard';
import { LayoutRoot, ModelHelpModal, Sidebar, SplashScreen, TopBar } from './components/layout';
import { GlobalMapView, MyLocationView } from './components/location';
import { ModelView } from './components/model';
import { ToastViewport } from './components/ui/Toast';
import { AppUiProvider } from './context/AppUiContext';
import { getClimateDataset, getCountrySeriesByCode } from './data/climateDataset';
import type { ActiveView } from './store/appStore';
import { useAppStore } from './store/appStore';
import { useAuthStore } from './store/authStore';
function renderView(view: ActiveView) {
    switch (view) {
        case 'dashboard':
            return <DashboardView />;
        case 'myLocation':
            return <MyLocationView />;
        case 'globalMap':
            return <GlobalMapView />;
        case 'analytics':
            return <AnalyticsView />;
        case 'alerts':
            return <AlertsView />;
        case 'model':
            return <ModelView />;
        default:
            return <DashboardView />;
    }
}
function MainApp() {
    const activeView = useAppStore((s) => s.activeView);
    const selectedCountry = useAppStore((s) => s.selectedCountry);
    const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
    const intelSeries = useMemo(() => (selectedCountry ? getCountrySeriesByCode(selectedCountry) : undefined), [selectedCountry]);
    const captureRef = useRef<HTMLDivElement>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [showPanelSkeletons, setShowPanelSkeletons] = useState(false);
    useEffect(() => {
        const start = performance.now();
        queueMicrotask(() => {
            getClimateDataset();
        });
        const minSplashMs = 950;
        const id = window.setTimeout(() => {
            setShowSplash(false);
        }, Math.max(0, minSplashMs - (performance.now() - start)));
        return () => clearTimeout(id);
    }, []);
    useEffect(() => {
        if (showSplash)
            return;
        const idOn = window.setTimeout(() => setShowPanelSkeletons(true), 0);
        const idOff = window.setTimeout(() => setShowPanelSkeletons(false), 750);
        return () => {
            clearTimeout(idOn);
            clearTimeout(idOff);
        };
    }, [showSplash]);
    const uiValue = { captureRef, showPanelSkeletons };
    return (<AppUiProvider value={uiValue}>
      <AnimatePresence>{showSplash ? <SplashScreen key="splash"/> : null}</AnimatePresence>

      <LayoutRoot>
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar />
          <main ref={captureRef} data-capture-root className={`mx-auto w-full flex-1 overflow-auto px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 ${activeView === 'dashboard' ||
            activeView === 'analytics' ||
            activeView === 'alerts' ||
            activeView === 'model' ||
            activeView === 'globalMap'
            ? 'max-w-[min(1600px,100%)]'
            : 'max-w-6xl'}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeView} role="presentation" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="min-h-0">
                {renderView(activeView)}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <ModelHelpModal />
        <CountryIntelPanel open={Boolean(selectedCountry && intelSeries)} series={intelSeries} onClose={() => setSelectedCountry(null)}/>
      </LayoutRoot>
      <ToastViewport />
    </AppUiProvider>);
}
export default function App() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isLoading = useAuthStore((s) => s.isLoading);
    const loadUser = useAuthStore((s) => s.loadUser);
    useEffect(() => {
        void loadUser();
    }, [loadUser]);
    if (isLoading)
        return <AuthSplashScreen />;
    return (<AnimatePresence mode="wait">
      {!isAuthenticated ? (<motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <LandingPage />
        </motion.div>) : (<motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <MainApp />
        </motion.div>)}
    </AnimatePresence>);
}
