import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Camera, ChevronDown, LogOut, Settings, User as UserIcon, } from 'lucide-react';
import { useAppUi } from '../../hooks/useAppUi';
import type { PredictionHorizon } from '../../store/appStore';
import { useAppStore } from '../../store/appStore';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { useToastStore } from '../ui/Toast';
import { ThemeToggle } from './ThemeToggle';
import { metrics } from '../../data/modelOutputs/index';
const HORIZONS: PredictionHorizon[] = ['7d', '30d', '90d'];
function formatUtcClock(d: Date): string {
    return d.toLocaleString('en-GB', {
        timeZone: 'UTC',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
function initialsFromFullName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return '?';
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    return `${a}${b}`.toUpperCase();
}
export function TopBar() {
    const predictionHorizon = useAppStore((s) => s.predictionHorizon);
    const setPredictionHorizon = useAppStore((s) => s.setPredictionHorizon);
    const activeView = useAppStore((s) => s.activeView);
    const { captureRef } = useAppUi();
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const user = useAuthStore((s) => s.user);
    const openAuthModal = useAuthStore((s) => s.openAuthModal);
    const logout = useAuthStore((s) => s.logout);
    const [utcNow, setUtcNow] = useState(() => new Date());
    const [shotBusy, setShotBusy] = useState(false);
    const shotLock = useRef(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const downloadScreenshot = useCallback(async () => {
        const el = captureRef.current;
        if (!el || shotLock.current)
            return;
        shotLock.current = true;
        setShotBusy(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const bg = getComputedStyle(document.body).backgroundColor || '#07080c';
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: bg,
                scrollX: 0,
                scrollY: -el.scrollTop,
            });
            const name = `ClimaHealth-${activeView}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
            const link = document.createElement('a');
            link.download = name;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        catch {
        }
        finally {
            shotLock.current = false;
            setShotBusy(false);
        }
    }, [activeView, captureRef]);
    useEffect(() => {
        const id = window.setInterval(() => setUtcNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        if (!menuOpen)
            return;
        const onDoc = (e: MouseEvent) => {
            const el = menuRef.current;
            if (el && !el.contains(e.target as Node))
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [menuOpen]);
    const onSignOut = () => {
        setMenuOpen(false);
        logout();
        useToastStore.getState().showToast('You have been signed out.', 'info');
    };
    return (<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-[var(--color-surface)]/95 px-3 backdrop-blur-md sm:gap-4 sm:px-4 md:px-5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
          ClimaHealth
        </h1>
        <p className="hidden text-xs text-muted sm:block">Climate &amp; health intelligence</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <div className="flex rounded-[var(--radius-sm)] border border-border bg-elevated p-0.5 shadow-[var(--shadow-sm)]" role="group" aria-label="Prediction horizon">
          {HORIZONS.map((h) => {
            const active = predictionHorizon === h;
            return (<button key={h} type="button" onClick={() => setPredictionHorizon(h)} className={[
                    'min-w-[2.25rem] rounded-[4px] px-2 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm',
                    active
                        ? 'bg-cyan-500 text-white'
                        : 'text-muted hover:bg-[var(--color-bg)] hover:text-foreground',
                ].join(' ')}>
                {h}
              </button>);
        })}
        </div>

        <time className="hidden min-w-[11rem] font-mono text-xs text-muted xl:block" dateTime={utcNow.toISOString()}>
          UTC {formatUtcClock(utcNow)}
        </time>

        <div className="hidden items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-elevated px-2 py-1.5 text-xs text-muted shadow-[var(--shadow-sm)] sm:flex" title="Synthetic model pipeline status">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
          </span>
          <span className="hidden font-medium text-foreground md:inline">Model running</span>
          <Activity className="h-3.5 w-3.5 text-emerald-500 md:hidden" aria-hidden/>
        </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 999,
            padding: '4px 12px',
            fontSize: 12,
        }} className="hidden sm:flex" title="Trained fusion model (exported metrics)">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}/>
          <span style={{ color: '#10b981' }}>Model Active</span>
          <span style={{ color: '#475569', marginLeft: 4 }}>
            MAE: {metrics.mae_fusion.toFixed(2)} pts (0–100)
          </span>
        </div>

        <button type="button" onClick={() => void downloadScreenshot()} disabled={shotBusy} className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-elevated text-foreground shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50" aria-label="Download screenshot of current view as PNG" title="Save view as PNG">
          <Camera className="h-4 w-4" aria-hidden/>
        </button>

        <ThemeToggle />

        {!isAuthenticated ? (<button type="button" onClick={() => openAuthModal()} className="whitespace-nowrap rounded-lg border border-[#334155] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e293b]">
            Sign In
          </button>) : (<div className="relative shrink-0" ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-1.5 text-white transition-colors hover:bg-white/5" aria-expanded={menuOpen} aria-haspopup="menu">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: '#3b82f6', width: '40px', height: '40px' }}>
                {user ? initialsFromFullName(user.fullName) : '?'}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden/>
            </button>
            {menuOpen ? (<div role="menu" className="absolute right-0 z-[9999] min-w-[200px] rounded-lg border border-[#1e293b] bg-[#0f172a] p-2 shadow-xl" style={{
                    top: '48px',
                    right: 0,
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '8px',
                    zIndex: 9999,
                }}>
                <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800" onClick={() => {
                    setMenuOpen(false);
                    useToastStore.getState().showToast('Profile settings are coming soon.', 'info');
                }}>
                  <UserIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden/>
                  My Profile
                </button>
                <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800" onClick={() => {
                    setMenuOpen(false);
                    useToastStore.getState().showToast('Preferences are coming soon.', 'info');
                }}>
                  <Settings className="h-4 w-4 shrink-0 text-slate-400" aria-hidden/>
                  Preferences
                </button>
                <div className="my-1.5 h-px bg-[#1e293b]" role="separator"/>
                <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-red-950/40" onClick={onSignOut}>
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden/>
                  Sign Out
                </button>
              </div>) : null}
          </div>)}
      </div>
    </header>);
}
