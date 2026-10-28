import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, LockKeyhole, Mail, Radio, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      try {
        await apiClient.post('/demo/reset');
      } catch (err) {
        console.warn('API reset fallback to sandbox:', err);
      }
      localStorage.removeItem('pulse_sandbox_store_v1');
      toast.success('Environment & database reset: INC-00001 is fresh in FIRED status.', { icon: '🔄' });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } finally {
      setResetting(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (data) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-portal relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050507] px-5 py-12 font-sans text-white selection:bg-[#C8A97E]/25">
      {/* Background Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_70%_55%_at_50%_-12%,rgba(120,119,198,.13),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.018]"
      />

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        {/* Left: Product Value & Context */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#C8A97E]/20 bg-[#C8A97E]/[0.08] text-[#D9C1A1]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight text-white">Pulse</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[.2em] text-text-tertiary font-mono">
                Incident Operations Control Plane
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-secondary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#91B5A1]" />
              Autonomous Incident Governance
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.15] tracking-[-.04em] text-white sm:text-5xl">
              The calm center of your{' '}
              <span className="font-serif font-normal italic text-[#D9C1A1]">response.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-text-secondary">
              An authoritative platform for high-stakes incident triage, deterministic state machine enforcement,
              interactive runbook execution, and autonomous SLA escalation.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-6">
            <div>
              <div className="font-mono text-xl text-white">24/7</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">SLA Sentinel</div>
            </div>
            <div>
              <div className="font-mono text-xl text-white">Sub-sec</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Real-time Bus</div>
            </div>
            <div>
              <div className="font-mono text-xl text-white">OCC</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Guarded States</div>
            </div>
          </div>
        </section>

        {/* Right: Clean, Secure Authentication Form */}
        <section className="linear-card p-7 sm:p-10 shadow-[0_36px_100px_-50px_rgba(0,0,0,.95)] relative space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[.18em] text-text-tertiary">
                Authentication Gate
              </div>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                Sign in to Console
              </h2>
              <p className="mt-1 text-xs text-text-secondary font-serif italic text-base">
                Enter your operator credentials to access the workspace.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 text-[#D9C1A1]">
              <LockKeyhole className="h-4 w-4" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-text-secondary">Email address</span>
              <span className="relative block">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070709] py-3 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-text-tertiary focus:border-white/20"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-text-secondary">Password</span>
              <span className="relative block">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070709] py-3 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-text-tertiary focus:border-white/20"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-ivory flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold disabled:opacity-40 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Console'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Autofill Helper */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
                Demo Operator Credentials
              </span>
              <span className="text-[10px] text-text-tertiary">1-Click Fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-label="Admin (admin@acme.dev)"
                data-testid="login-as-admin"
                onClick={() => {
                  setEmail('admin@acme.dev');
                  setPassword('password123');
                }}
                className="text-left p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition group"
              >
                <div className="text-xs font-medium text-white group-hover:text-[#D9C1A1] transition-colors">Admin (admin@acme.dev)</div>
                <div className="text-[10px] text-text-tertiary font-mono">Sarah Chen · Administrator</div>
              </button>
              <button
                type="button"
                aria-label="Commander (commander@acme.dev)"
                data-testid="login-as-commander"
                onClick={() => {
                  setEmail('commander@acme.dev');
                  setPassword('password123');
                }}
                className="text-left p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition group"
              >
                <div className="text-xs font-medium text-white group-hover:text-[#D9C1A1] transition-colors">Commander (commander@acme.dev)</div>
                <div className="text-[10px] text-text-tertiary font-mono">Alex Rivera · Incident Commander</div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-secondary pt-2">
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetDemoData}
              className="text-[11px] text-[#D9C1A1] hover:underline font-mono disabled:opacity-50"
              title="Reset incidents back to seed state (INC-00001 fresh in FIRED status)"
            >
              {resetting ? '↺ Resetting...' : '↺ Reset Demo Data'}
            </button>
            <Link to="/register" className="text-white hover:text-[#D9C1A1] transition-colors font-medium">
              Create Organization →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
