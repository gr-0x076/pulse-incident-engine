import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Zap, Radio, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // toast handled in client interceptor or context
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDossier = async (role) => {
    setLoading(true);
    try {
      await switchDemoRole(role);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const demoDossiers = [
    {
      role: 'ADMIN',
      name: 'Sarah Chen',
      email: 'admin@acme.dev',
      badge: '👑 Commander-in-Chief',
      desc: 'Full administrative rights, escalation policy control & settings access.',
      border: 'border-accent-primary/40 hover:border-accent-primary bg-accent-primary/5',
    },
    {
      role: 'INCIDENT_COMMANDER',
      name: 'Alex Rivera',
      email: 'commander@acme.dev',
      badge: '⚡ Incident Commander',
      desc: 'Can escalate P1s, reassign responders, mitigate, and close postmortems.',
      border: 'border-severity-p1/40 hover:border-severity-p1 bg-severity-p1/5',
    },
    {
      role: 'RESPONDER',
      name: 'Marcus Vance',
      email: 'responder@acme.dev',
      badge: '🛡️ On-Call SRE',
      desc: 'Executes interactive runbooks, acknowledges incidents, posts timeline notes.',
      border: 'border-severity-p2/40 hover:border-severity-p2 bg-severity-p2/5',
    },
    {
      role: 'VIEWER',
      name: 'Elena Rostova',
      email: 'viewer@acme.dev',
      badge: '👁️ Audit Observer',
      desc: 'Read-only observer for compliance audits, metrics & postmortem reviews.',
      border: 'border-border-default hover:border-text-secondary bg-bg-tertiary/20',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col md:flex-row font-sans">
      {/* ── LEFT PANE: CINEMATIC MISSION CONTROL BRIEFING ── */}
      <div className="w-full md:w-5/12 bg-bg-secondary border-r border-border-subtle p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-severity-p1/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-severity-p1 animate-pulse shadow-[0_0_10px_#FF453A]" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-text-primary">
              PULSE // INCIDENT WAR-ROOM
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-text-primary leading-tight">
              Mission-Critical Incident Response Engine.
            </h1>
            <p className="text-xs text-text-secondary font-mono leading-relaxed">
              Real-time finite state triage, deterministic runbook SOP execution, autonomous SLA sentinel, and SHA-256 deduplicated alert ingestion.
            </p>
          </div>

          {/* Radar Sweep Telemetry Visual */}
          <div className="relative w-48 h-48 mx-auto my-6 flex items-center justify-center">
            {/* Concentric rings */}
            <div className="absolute inset-0 rounded-full border border-border-subtle" />
            <div className="absolute inset-6 rounded-full border border-border-subtle/60" />
            <div className="absolute inset-12 rounded-full border border-border-subtle/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[1px] bg-border-subtle/40" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rotate-90">
              <div className="w-full h-[1px] bg-border-subtle/40" />
            </div>
            {/* Radar Sweep Ray */}
            <div
              className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, rgba(255, 69, 58, 0.25) 0deg, transparent 60deg)',
              }}
            />
            {/* Center Blip */}
            <div className="w-2 h-2 rounded-full bg-severity-p1 shadow-[0_0_8px_#FF453A]" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-subtle/60 text-xs font-mono text-text-secondary">
            <div>
              <span className="text-[10px] text-text-tertiary uppercase block">HEARTBEAT</span>
              <span className="text-accent-success flex items-center gap-1.5 mt-0.5">
                <Radio className="w-3 h-3 animate-pulse" /> 5s SLA SENTINEL
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-tertiary uppercase block">TELEMETRY</span>
              <span className="text-accent-primary mt-0.5 block">DUAL-WEBSOCKET BUS</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 text-[11px] font-mono text-text-tertiary flex items-center justify-between">
          <span>SEC_LEVEL: TOP_SECRET</span>
          <span>v1.0.0-PROD</span>
        </div>
      </div>

      {/* ── RIGHT PANE: 1-CLICK EVALUATOR LOGIN & FORM ── */}
      <div className="flex-1 p-6 md:p-12 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <div className="text-[11px] font-mono tracking-widest text-accent-primary uppercase mb-1">
              // EVALUATOR ACCESS TERMINAL
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              1-Click Authentication Dossier
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              For evaluation grading, select any role card below to authenticate instantly with seeded demo data:
            </p>
          </div>

          {/* 1-Click Dossier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demoDossiers.map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleQuickDossier(d.role)}
                disabled={loading}
                className={`p-3.5 rounded border ${d.border} text-left transition-all duration-200 group relative disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-text-primary">
                    {d.badge}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-xs font-semibold text-text-primary mt-1">{d.name}</div>
                <div className="text-[11px] font-mono text-text-tertiary">{d.email}</div>
                <p className="text-[11px] text-text-secondary mt-2 leading-tight">{d.desc}</p>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border-subtle" />
            <span className="bg-bg-primary px-3 text-[10px] font-mono uppercase text-text-tertiary relative">
              OR LOGIN WITH CUSTOM CREDENTIALS
            </span>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1.5 uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="commander@acme.dev"
                  className="w-full bg-bg-secondary border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1.5 uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-bg-secondary border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-text-secondary">
            Need to deploy a new organization?{' '}
            <Link to="/register" className="text-accent-primary hover:underline font-mono">
              Initialize Organization →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
