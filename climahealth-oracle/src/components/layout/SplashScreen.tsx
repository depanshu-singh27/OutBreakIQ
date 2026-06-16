import { motion } from 'framer-motion';
export function SplashScreen() {
    return (<motion.div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-bg)] px-6" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} aria-busy="true" aria-label="Loading application">
      <div className="relative flex h-[min(52vmin,320px)] w-[min(52vmin,320px)] items-center justify-center">
        <motion.svg viewBox="0 0 200 200" className="h-full w-full text-[var(--color-accent)]" aria-hidden animate={{ rotate: 360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}>
          <defs>
            <linearGradient id="globe-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.15}/>
              <stop offset="50%" stopColor="currentColor" stopOpacity={0.85}/>
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.15}/>
            </linearGradient>
          </defs>
          
          {[0, 30, 60, 90, 120, 150].map((deg) => (<ellipse key={`m-${deg}`} cx="100" cy="100" rx="78" ry="78" fill="none" stroke="url(#globe-line)" strokeWidth="0.65" transform={`rotate(${deg} 100 100)`}/>))}
          
          {[-52, -26, 0, 26, 52].map((dy, i) => {
            const ry = Math.max(8, 78 * Math.cos((dy / 78) * 1.1));
            return (<ellipse key={`p-${i}`} cx="100" cy={100 + dy * 0.85} rx="78" ry={ry} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth="0.5"/>);
        })}
          <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth="1"/>
        </motion.svg>
        <motion.div className="pointer-events-none absolute inset-0 rounded-full" style={{
            background: 'radial-gradient(circle at 30% 25%, var(--color-accent) 0%, transparent 55%)',
            opacity: 0.12,
        }} animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.05, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}/>
      </div>
      <motion.h1 className="mt-8 text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        ClimaHealth
      </motion.h1>
      <p className="mt-2 text-center text-sm text-muted">Preparing climate–health intelligence…</p>
      <motion.div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-[var(--color-border)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <motion.div className="h-full rounded-full bg-[var(--color-accent)]" initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }}/>
      </motion.div>
    </motion.div>);
}
