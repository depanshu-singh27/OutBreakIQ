import { motion } from 'framer-motion';
export function SplashScreen() {
    return (<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a0e1a] px-6">
      <div className="flex flex-col items-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} className="h-16 w-16 text-[#3b82f6]" aria-hidden>
          <svg viewBox="0 0 64 64" className="h-full w-full">
            <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.9"/>
            <ellipse cx="32" cy="32" rx="24" ry="10" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.8"/>
            <ellipse cx="32" cy="32" rx="10" ry="24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.7"/>
            <path d="M16 22c8 8 24 12 32 20" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.85"/>
            <path d="M16 42c8-8 24-12 32-20" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.85"/>
          </svg>
        </motion.div>
        <h1 className="mt-5 text-2xl font-semibold text-white">ClimaHealth</h1>
        <div className="mt-5 h-[3px] w-[200px] overflow-hidden rounded-full bg-[#1e293b]">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '45%' }}/>
        </div>
      </div>
    </div>);
}
