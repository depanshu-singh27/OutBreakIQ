import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { type FormEvent, useCallback, useState } from 'react';
import { loginRequest, registerRequest } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../ui/Toast';
type Tab = 'signIn' | 'register';
function firstNameFromFull(fullName: string): string {
    const t = fullName.trim().split(/\s+/)[0];
    return t || 'there';
}
function passwordStrength(password: string): 'weak' | 'fair' | 'strong' {
    const len = password.length > 8;
    const num = /\d/.test(password);
    const spec = /[^a-zA-Z0-9]/.test(password);
    if (len && num && spec)
        return 'strong';
    if (len && (num || spec))
        return 'fair';
    return 'weak';
}
const strengthBar: Record<'weak' | 'fair' | 'strong', {
    width: string;
    color: string;
    label: string;
}> = {
    weak: { width: '33%', color: '#ef4444', label: 'Weak' },
    fair: { width: '66%', color: '#eab308', label: 'Fair' },
    strong: { width: '100%', color: '#22c55e', label: 'Strong' },
};
const inputClass = 'mt-1.5 w-full rounded-lg border border-[#334155] bg-[#020617] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40';
export function AuthModal() {
    const open = useAuthStore((s) => s.showAuthModal);
    const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
    const setSession = useAuthStore((s) => s.setSession);
    const showToast = useToastStore((s) => s.showToast);
    const [tab, setTab] = useState<Tab>('signIn');
    const [signInEmail, setSignInEmail] = useState('');
    const [signInPassword, setSignInPassword] = useState('');
    const [showPw1, setShowPw1] = useState(false);
    const [signInLoading, setSignInLoading] = useState(false);
    const [signInError, setSignInError] = useState<string | null>(null);
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [showPw2, setShowPw2] = useState(false);
    const [showPw3, setShowPw3] = useState(false);
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState<string | null>(null);
    const resetErrors = useCallback(() => {
        setSignInError(null);
        setRegError(null);
    }, []);
    const handleBackdrop = useCallback(() => {
        resetErrors();
        closeAuthModal();
    }, [closeAuthModal, resetErrors]);
    const onSignIn = async (e: FormEvent) => {
        e.preventDefault();
        setSignInError(null);
        setSignInLoading(true);
        try {
            const payload = await loginRequest(signInEmail.trim(), signInPassword);
            setSession(payload);
            closeAuthModal();
            showToast(`Welcome back, ${firstNameFromFull(payload.user.fullName)}!`, 'success');
            setSignInPassword('');
        }
        catch (err) {
            setSignInError(err instanceof Error ? err.message : 'Sign in failed');
        }
        finally {
            setSignInLoading(false);
        }
    };
    const regStrength = passwordStrength(regPassword);
    const regBar = strengthBar[regStrength];
    const confirmMismatch = regConfirm.length > 0 && regPassword !== regConfirm;
    const onRegister = async (e: FormEvent) => {
        e.preventDefault();
        setRegError(null);
        if (confirmMismatch) {
            setRegError('Passwords do not match');
            return;
        }
        setRegLoading(true);
        try {
            const payload = await registerRequest(regName.trim(), regEmail.trim(), regPassword);
            setSession(payload);
            closeAuthModal();
            showToast('Account created! Welcome to ClimaHealth.', 'success');
            setRegPassword('');
            setRegConfirm('');
        }
        catch (err) {
            setRegError(err instanceof Error ? err.message : 'Registration failed');
        }
        finally {
            setRegLoading(false);
        }
    };
    return (<AnimatePresence>
      {open ? (<>
          <motion.div role="presentation" aria-hidden className="fixed inset-0 z-[9999] cursor-default bg-black/70" style={{ background: 'rgba(0,0,0,0.7)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleBackdrop}/>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="fixed left-1/2 top-1/2 z-[10000] w-[420px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-8 shadow-2xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            <h2 id="auth-modal-title" className="text-center text-xl font-bold text-slate-100">
              ClimaHealth
            </h2>
            <p className="mt-1 text-center text-xs text-slate-500">Sign in or create an account</p>

            <div className="mt-6 flex border-b border-[#1e293b]">
              <button type="button" onClick={() => {
                setTab('signIn');
                resetErrors();
            }} className={[
                'relative flex-1 pb-3 text-sm font-semibold transition-colors',
                tab === 'signIn' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}>
                Sign In
                {tab === 'signIn' ? (<span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-sky-500"/>) : null}
              </button>
              <button type="button" onClick={() => {
                setTab('register');
                resetErrors();
            }} className={[
                'relative flex-1 pb-3 text-sm font-semibold transition-colors',
                tab === 'register' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}>
                Create Account
                {tab === 'register' ? (<span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-sky-500"/>) : null}
              </button>
            </div>

            {tab === 'signIn' ? (<form className="mt-6 space-y-4" onSubmit={onSignIn}>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Email
                  <input className={inputClass} type="email" autoComplete="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} required/>
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Password
                  <div className="relative mt-1.5">
                    <input className={`${inputClass} pr-10`} type={showPw1 ? 'text' : 'password'} autoComplete="current-password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} required/>
                    <button type="button" tabIndex={-1} onClick={() => setShowPw1((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={showPw1 ? 'Hide password' : 'Show password'}>
                      {showPw1 ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </label>
                <button type="submit" disabled={signInLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60">
                  {signInLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden/> : null}
                  Sign In
                </button>
                {signInError ? (<div className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200">
                    {signInError}
                  </div>) : null}
              </form>) : (<form className="mt-6 space-y-4" onSubmit={onRegister}>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Full name
                  <input className={inputClass} type="text" autoComplete="name" value={regName} onChange={(e) => setRegName(e.target.value)} required/>
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Email
                  <input className={inputClass} type="email" autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required/>
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Password
                  <div className="relative mt-1.5">
                    <input className={`${inputClass} pr-10`} type={showPw2 ? 'text' : 'password'} autoComplete="new-password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required/>
                    <button type="button" tabIndex={-1} onClick={() => setShowPw2((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={showPw2 ? 'Hide password' : 'Show password'}>
                      {showPw2 ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: regBar.width, backgroundColor: regBar.color }}/>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Strength: <span className="font-medium text-slate-300">{regBar.label}</span> (use 8+
                      chars with a number and a special character for strong)
                    </p>
                  </div>
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Confirm password
                  <div className="relative mt-1.5">
                    <input className={`${inputClass} pr-10 ${confirmMismatch ? 'border-red-500 ring-1 ring-red-500/40' : ''}`} type={showPw3 ? 'text' : 'password'} autoComplete="new-password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required/>
                    <button type="button" tabIndex={-1} onClick={() => setShowPw3((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200" aria-label={showPw3 ? 'Hide confirm password' : 'Show confirm password'}>
                      {showPw3 ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </label>
                <button type="submit" disabled={regLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60">
                  {regLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden/> : null}
                  Create Account
                </button>
                {regError ? (<div className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200">
                    {regError}
                  </div>) : null}
              </form>)}
          </motion.div>
        </>) : null}
    </AnimatePresence>);
}
