import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
type AuthTab = 'signin' | 'register';
const particleSpec = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    size: 2 + (i % 5),
    delay: `${(i % 7) * 0.7}s`,
    duration: `${8 + (i % 6)}s`,
}));
function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (!el)
        return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function firstError(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}
function passwordScore(password: string): 0 | 1 | 2 | 3 {
    if (!password)
        return 0;
    const len6 = password.length > 6;
    const len8 = password.length > 8;
    const hasNum = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    if (len8 && hasNum && hasSpecial)
        return 3;
    if (len6 && (hasNum || hasSpecial))
        return 2;
    if (len6)
        return 1;
    return 0;
}
function scoreLabel(score: 0 | 1 | 2 | 3): {
    text: string;
    color: string;
} {
    if (score === 3)
        return { text: 'Strong', color: 'text-emerald-400' };
    if (score === 2)
        return { text: 'Fair', color: 'text-yellow-400' };
    if (score === 1)
        return { text: 'Weak', color: 'text-red-400' };
    return { text: 'Weak', color: 'text-slate-500' };
}
const inputCls = 'mt-2 w-full rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40';
export function LandingPage() {
    const login = useAuthStore((s) => s.login);
    const register = useAuthStore((s) => s.register);
    const isLoading = useAuthStore((s) => s.isLoading);
    const [tab, setTab] = useState<AuthTab>('signin');
    const [signInEmail, setSignInEmail] = useState('');
    const [signInPassword, setSignInPassword] = useState('');
    const [showSignPw, setShowSignPw] = useState(false);
    const [signInError, setSignInError] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showRegPw, setShowRegPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [regError, setRegError] = useState('');
    const score = useMemo(() => passwordScore(password), [password]);
    const scoreInfo = scoreLabel(score);
    const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
    const onSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setSignInError('');
        try {
            await login(signInEmail.trim(), signInPassword);
        }
        catch (err) {
            setSignInError(firstError(err, 'Unable to sign in'));
        }
    };
    const onRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegError('');
        if (mismatch) {
            setRegError('Passwords do not match.');
            return;
        }
        try {
            await register(fullName.trim(), email.trim(), password);
        }
        catch (err) {
            setRegError(firstError(err, 'Unable to create account'));
        }
    };
    return (<div className="min-h-screen bg-[#0a0e1a] text-white">
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0px); opacity: 0.1; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-120px); opacity: 0.1; }
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0px); opacity: 0.7; }
          50% { transform: translateY(8px); opacity: 1; }
        }
      `}</style>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 text-center">
        {particleSpec.map((p) => (<div key={p.id} className="pointer-events-none absolute rounded-full" style={{
                left: p.left,
                bottom: '-40px',
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: 'rgba(59,130,246,0.4)',
                animationName: 'floatParticle',
                animationDuration: p.duration,
                animationDelay: p.delay,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
            }}/>))}
        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="inline-flex rounded-full border border-[rgba(59,130,246,0.4)] px-4 py-1.5 text-xs text-[#94a3b8]">
            🌍 Global Health Intelligence Platform
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-[56px]">
            Predict Health Risks
            <br />
            Before They Strike
          </h1>
          <p className="mx-auto mt-6 max-w-[520px] text-base leading-7 text-[#94a3b8] sm:text-lg">
            ClimaHealth combines climate data, air quality, and epidemiological patterns to deliver
            AI-powered early warnings for disease outbreaks worldwide.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => scrollToId('auth')} className="rounded-[10px] bg-[#3b82f6] px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2563eb]">
              Get Started Free
            </button>
            <button type="button" onClick={() => scrollToId('how-it-works')} className="rounded-[10px] border border-[#334155] bg-transparent px-8 py-3.5 text-base font-semibold text-[#e2e8f0] transition-colors hover:bg-[#1e293b]">
              See How It Works
            </button>
          </div>
          <p className="mt-5 text-xs text-[#64748b] sm:text-[13px]">
            ✓ Free to use &nbsp; ✓ No credit card &nbsp; ✓ 195 countries covered
          </p>
          <div className="mt-12 text-2xl text-[#64748b]" style={{ animation: 'bounceArrow 1.5s infinite' }}>
            ↓
          </div>
        </div>
      </section>

      <section className="border-y border-[#1e293b] bg-[#0f1629] px-6 py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            ['195', 'Countries Monitored'],
            ['5', 'Disease Types Tracked'],
            ['90 Days', 'Prediction Horizon'],
            ['Real-time', 'Climate Analysis'],
        ].map(([v, l]) => (<div key={l}>
              <p className="text-3xl font-bold text-[#3b82f6] sm:text-[36px]">{v}</p>
              <p className="mt-1 text-sm text-[#64748b]">{l}</p>
            </div>))}
        </div>
      </section>

      <section className="bg-[#0a0e1a] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold text-white sm:text-[32px]">
            Everything you need to stay ahead of health risks
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
            ['🗺️', 'Global Risk Map', 'Color-coded choropleth map showing real-time health risk scores across all 195 countries'],
            ['🤖', 'AI Predictions', 'LSTM + XGBoost hybrid model predicts outbreak risk 7, 30, and 90 days ahead'],
            ['🧬', 'Disease Intelligence', 'Deep analysis of dengue, malaria, cholera, respiratory illness, and heat stroke patterns'],
            ['📍', 'My Location Alerts', 'Personalized risk dashboard and early warnings for your exact location'],
            ['📊', 'SHAP Explainability', 'Understand exactly which climate factors are driving risk in any region'],
            ['🚨', 'Early Warning System', 'Automated alerts when outbreak conditions are detected in your tracked regions'],
        ].map(([icon, title, body]) => (<article key={title} className="rounded-xl border border-[#1e293b] bg-[#0f1629] p-6 transition-colors hover:border-[#3b82f6]">
                <p className="text-2xl">{icon}</p>
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#94a3b8]">{body}</p>
              </article>))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#0f1629] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-semibold text-white sm:text-[32px]">How ClimaHealth works</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
            {[
            ['1', 'We collect data', 'Climate, air quality, and health data from 195 countries updated continuously'],
            ['2', 'AI analyzes patterns', 'Our LSTM model detects the environmental memory signatures that precede outbreaks'],
            ['3', 'You get early warnings', 'Receive risk scores, predictions, and actionable precautions before risk peaks'],
        ].map(([step, title, desc], i) => (<div key={step} className="relative text-center">
                {i < 2 ? (<span className="absolute left-[62%] top-6 hidden h-px w-[76%] bg-[#334155] md:block"/>) : null}
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6] text-lg font-bold text-white">
                  {step}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#94a3b8]">{desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      <section id="auth" className="bg-[#0a0e1a] px-6 py-20">
        <div className="mx-auto max-w-[440px] rounded-2xl border border-[#1e293b] bg-[#0f1629] p-8 sm:p-10">
          <div className="grid grid-cols-2 rounded-lg border border-[#1e293b] p-1">
            <button type="button" onClick={() => {
            setTab('signin');
            setRegError('');
        }} className={[
            'rounded-md py-2 text-sm font-semibold transition-colors',
            tab === 'signin' ? 'bg-[#3b82f6] text-white' : 'bg-transparent text-[#94a3b8]',
        ].join(' ')}>
              Sign In
            </button>
            <button type="button" onClick={() => {
            setTab('register');
            setSignInError('');
        }} className={[
            'rounded-md py-2 text-sm font-semibold transition-colors',
            tab === 'register' ? 'bg-[#3b82f6] text-white' : 'bg-transparent text-[#94a3b8]',
        ].join(' ')}>
              Create Account
            </button>
          </div>

          {tab === 'signin' ? (<form className="mt-6 space-y-4" onSubmit={onSignIn}>
              <label className="block text-sm text-[#cbd5e1]">
                Email
                <input className={inputCls} type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} required/>
              </label>
              <label className="block text-sm text-[#cbd5e1]">
                Password
                <div className="relative">
                  <input className={`${inputCls} pr-10`} type={showSignPw ? 'text' : 'password'} value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} required/>
                  <button type="button" onClick={() => setShowSignPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#94a3b8] hover:bg-[#1e293b]" aria-label={showSignPw ? 'Hide password' : 'Show password'}>
                    {showSignPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </label>
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] py-3.5 font-semibold text-white transition-colors hover:bg-[#2563eb] disabled:opacity-60">
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : null}
                Sign In
              </button>
              {signInError ? (<div className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] p-3 text-sm text-[#fca5a5]">
                  {signInError}
                </div>) : null}
              <p className="text-center text-sm text-[#94a3b8]">
                Don&apos;t have an account?{' '}
                <button type="button" className="text-[#3b82f6] hover:underline" onClick={() => setTab('register')}>
                  Create one
                </button>
              </p>
            </form>) : (<form className="mt-6 space-y-4" onSubmit={onRegister}>
              <label className="block text-sm text-[#cbd5e1]">
                Full Name
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required/>
              </label>
              <label className="block text-sm text-[#cbd5e1]">
                Email
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
              </label>
              <label className="block text-sm text-[#cbd5e1]">
                Password
                <div className="relative">
                  <input className={`${inputCls} pr-10`} type={showRegPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required/>
                  <button type="button" onClick={() => setShowRegPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#94a3b8] hover:bg-[#1e293b]" aria-label={showRegPw ? 'Hide password' : 'Show password'}>
                    {showRegPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[0, 1, 2].map((idx) => (<span key={idx} className={[
                    'h-1.5 rounded',
                    score === 0
                        ? 'bg-[#334155]'
                        : idx < score
                            ? score === 1
                                ? 'bg-red-500'
                                : score === 2
                                    ? 'bg-yellow-400'
                                    : 'bg-emerald-500'
                            : 'bg-[#334155]',
                ].join(' ')}/>))}
                </div>
                <p className={`mt-1 text-xs ${scoreInfo.color}`}>{scoreInfo.text}</p>
              </label>
              <label className="block text-sm text-[#cbd5e1]">
                Confirm password
                <div className="relative">
                  <input className={`${inputCls} pr-10 ${mismatch ? 'border-red-500' : ''}`} type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
                  <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#94a3b8] hover:bg-[#1e293b]" aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}>
                    {showConfirmPw ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </button>
                </div>
              </label>
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] py-3.5 font-semibold text-white transition-colors hover:bg-[#2563eb] disabled:opacity-60">
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : null}
                Create Account
              </button>
              {regError ? (<div className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] p-3 text-sm text-[#fca5a5]">
                  {regError}
                </div>) : null}
              <p className="text-center text-sm text-[#94a3b8]">
                Already have an account?{' '}
                <button type="button" className="text-[#3b82f6] hover:underline" onClick={() => setTab('signin')}>
                  Sign in
                </button>
              </p>
              <p className="text-center text-xs text-[#64748b]">
                By creating an account you agree to receive personalised health risk alerts
              </p>
            </form>)}
        </div>
      </section>

      <footer className="border-t border-[#1e293b] bg-[#0a0e1a] px-6 py-8 text-center text-[13px] text-[#475569]">
        ClimaHealth · Built with climate data, ML models, and a mission to protect public health
      </footer>
    </div>);
}
