import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
type ThemeToggleProps = {
    className?: string;
};
export function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const theme = useAppStore((s) => s.theme);
    const toggleTheme = useAppStore((s) => s.toggleTheme);
    return (<button type="button" onClick={toggleTheme} className={[
            'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-elevated text-foreground shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
            className,
        ].join(' ')} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? (<Sun className="h-4 w-4" aria-hidden/>) : (<Moon className="h-4 w-4" aria-hidden/>)}
    </button>);
}
