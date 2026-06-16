import { useEffect, useRef, type ReactNode } from 'react';
import { useAppStore } from '../../store/appStore';
export { Sidebar } from './Sidebar';
export { SplashScreen } from './SplashScreen';
export { TopBar } from './TopBar';
export { ThemeToggle } from './ThemeToggle';
export { ModelHelpModal } from './ModelHelpModal';
type LayoutRootProps = {
    children: ReactNode;
};
export function LayoutRoot({ children }: LayoutRootProps) {
    const theme = useAppStore((s) => s.theme);
    const themeTransitionSkipFirst = useRef(true);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
    }, [theme]);
    useEffect(() => {
        if (themeTransitionSkipFirst.current) {
            themeTransitionSkipFirst.current = false;
            return;
        }
        document.documentElement.classList.add('theme-animate');
        const id = window.setTimeout(() => {
            document.documentElement.classList.remove('theme-animate');
        }, 280);
        return () => window.clearTimeout(id);
    }, [theme]);
    return (<div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)] text-[var(--color-fg)] md:min-h-screen md:flex-row">
      {children}
    </div>);
}
