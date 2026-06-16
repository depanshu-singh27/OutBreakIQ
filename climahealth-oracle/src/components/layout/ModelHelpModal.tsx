import { useCallback, useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, Network, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export function ModelHelpModal() {
    const [open, setOpen] = useState(false);
    const setActiveView = useAppStore((s) => s.setActiveView);
    const titleId = useId();
    const onKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape')
            setOpen(false);
    }, []);
    useEffect(() => {
        if (!open)
            return;
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onKey]);
    return (<>
      <motion.button type="button" onClick={() => setOpen(true)} className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-accent)] md:bottom-8 md:right-8" aria-label="How the model works" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
        <HelpCircle className="h-6 w-6" aria-hidden/>
      </motion.button>

      <AnimatePresence>
        {open ? (<motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-[var(--color-bg)]/75 p-4 backdrop-blur-sm" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-[var(--radius-md)] border border-border bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)]" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-[var(--radius-sm)] p-2 text-muted hover:bg-elevated hover:text-foreground" aria-label="Close">
                <X className="h-5 w-5"/>
              </button>
              <h2 id={titleId} className="pr-10 text-lg font-semibold text-foreground">
                LSTM + XGBoost hybrid (plain English)
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The app blends two kinds of models. An <strong className="text-foreground">LSTM</strong>{' '}
                reads week-by-week climate, mobility, and health history so it can remember trends and
                seasonality. That sequence is compressed into a small numeric fingerprint.{' '}
                <strong className="text-foreground">XGBoost</strong> (gradient-boosted decision trees) mixes
                that fingerprint with static context—things like population density—and applies sharp
                “if rainfall crosses this bucket, risk jumps” rules. A final calibration step keeps displayed
                risk scores honest relative to past outcomes.
              </p>

              <div className="mt-6 rounded-[var(--radius-sm)] border border-border bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Flow</p>
                <svg viewBox="0 0 360 120" className="mt-3 h-auto w-full text-[var(--color-accent)]" aria-hidden>
                  <defs>
                    <marker id="help-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" opacity={0.8}/>
                    </marker>
                  </defs>
                  <rect x="8" y="36" width="72" height="44" rx="8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5"/>
                  <text x="44" y="62" textAnchor="middle" fill="var(--color-fg)" style={{ fontSize: 10, fontWeight: 600 }}>
                    Inputs
                  </text>
                  <line x1="80" y1="58" x2="108" y2="58" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#help-arrow)"/>
                  <rect x="108" y="28" width="76" height="60" rx="8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5"/>
                  <text x="146" y="58" textAnchor="middle" fill="var(--color-fg)" style={{ fontSize: 10, fontWeight: 600 }}>
                    LSTM
                  </text>
                  <text x="146" y="74" textAnchor="middle" fill="var(--color-fg-muted)" style={{ fontSize: 8 }}>
                    time
                  </text>
                  <line x1="184" y1="58" x2="212" y2="58" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#help-arrow)"/>
                  <rect x="212" y="36" width="68" height="44" rx="8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5"/>
                  <text x="246" y="62" textAnchor="middle" fill="var(--color-fg)" style={{ fontSize: 10, fontWeight: 600 }}>
                    XGB
                  </text>
                  <line x1="280" y1="58" x2="308" y2="58" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#help-arrow)"/>
                  <rect x="308" y="40" width="44" height="36" rx="6" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5"/>
                  <text x="330" y="62" textAnchor="middle" fill="var(--color-fg)" style={{ fontSize: 9, fontWeight: 600 }}>
                    Risk
                  </text>
                </svg>
              </div>

              <p className="mt-4 text-xs text-muted">
                SHAP values in the app explain which drivers the ensemble leaned on for a given country-week.
                All series here are synthetic for demonstration.
              </p>
              <button type="button" onClick={() => {
                setActiveView('model');
                setOpen(false);
            }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-elevated px-4 py-2.5 text-sm font-medium text-foreground hover:border-[var(--color-accent)]">
                <Network className="h-4 w-4 text-[var(--color-accent)]" aria-hidden/>
                Open full model architecture
              </button>
            </motion.div>
          </motion.div>) : null}
      </AnimatePresence>
    </>);
}
