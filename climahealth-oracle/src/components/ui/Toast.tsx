import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';
export type ToastType = 'success' | 'error' | 'info';
type ToastItem = {
    id: number;
    message: string;
    type: ToastType;
};
type ToastStore = {
    items: ToastItem[];
    showToast: (message: string, type?: ToastType) => void;
    dismiss: (id: number) => void;
};
let toastSeq = 0;
export const useToastStore = create<ToastStore>((set, get) => ({
    items: [],
    showToast: (message, type = 'info') => {
        const id = ++toastSeq;
        set((s) => ({ items: [...s.items, { id, message, type }] }));
        window.setTimeout(() => {
            get().dismiss(id);
        }, 3000);
    },
    dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
export function useToast() {
    const showToast = useToastStore((s) => s.showToast);
    return { showToast };
}
const typeStyles: Record<ToastType, string> = {
    success: 'border-emerald-600/50 bg-emerald-950/90 text-emerald-50',
    error: 'border-red-600/50 bg-red-950/90 text-red-50',
    info: 'border-sky-600/50 bg-sky-950/90 text-sky-50',
};
export function ToastViewport() {
    const items = useToastStore((s) => s.items);
    return (<div className="pointer-events-none fixed z-[10001] flex w-[min(360px,calc(100vw-3rem))] flex-col gap-2" style={{ bottom: 24, right: 24 }} aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (<motion.div key={t.id} layout initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className={[
                'pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm',
                typeStyles[t.type],
            ].join(' ')}>
            {t.message}
          </motion.div>))}
      </AnimatePresence>
    </div>);
}
