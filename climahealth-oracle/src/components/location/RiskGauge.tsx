import { motion } from 'framer-motion';
import { useId } from 'react';
import { useAnimatedInt } from '../../hooks/useCountUp';
function strokeForScore(v: number): string {
    if (v < 25)
        return '#22c55e';
    if (v < 50)
        return '#84cc16';
    if (v < 75)
        return '#f97316';
    return '#ef4444';
}
type RiskGaugeProps = {
    value: number;
    className?: string;
    footerPrimary?: string;
    footerSecondary?: string | null;
    gradientStroke?: boolean;
};
export function RiskGauge({ value, className = '', footerPrimary = 'Risk score', footerSecondary = null, gradientStroke = false, }: RiskGaugeProps) {
    const gid = useId().replace(/:/g, '');
    const displayScore = useAnimatedInt(Math.round(Math.min(100, Math.max(0, value))), 1.1);
    const r = 88;
    const c = 2 * Math.PI * r;
    const pct = Math.min(100, Math.max(0, value)) / 100;
    const targetOffset = c * (1 - pct);
    const gradId = `risk-gauge-grad-${gid}`;
    return (<div className={['relative', className].join(' ')}>
      <svg viewBox="0 0 220 220" className="mx-auto h-52 w-52 md:h-64 md:w-64" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e"/>
            <stop offset="35%" stopColor="#84cc16"/>
            <stop offset="65%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-border)" strokeWidth="16"/>
        <motion.circle cx="110" cy="110" r={r} fill="none" stroke={gradientStroke ? `url(#${gradId})` : strokeForScore(value)} strokeWidth="16" strokeLinecap="round" strokeDasharray={c} transform="rotate(-90 110 110)" initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: targetOffset }} transition={{ type: 'spring', stiffness: 70, damping: 18 }}/>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-6 pt-2 text-center">
        <span className="text-4xl font-bold tabular-nums text-foreground md:text-5xl">
          {displayScore}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {footerPrimary}
        </span>
        {footerSecondary ? (<span className="max-w-[12rem] text-xs font-medium leading-snug text-muted">{footerSecondary}</span>) : null}
      </div>
    </div>);
}
