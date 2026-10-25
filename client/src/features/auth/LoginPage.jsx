import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleInsignia } from '../../components/ui/TacticalInsignia';

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
      const data = await login(email, password);
      if (data) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Manual login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDossier = async (role) => {
    setLoading(true);
    try {
      const data = await switchDemoRole(role);
      if (data) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Quick dossier login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const demoDossiers = [
    {
      role: 'ADMIN',
      name: 'Sarah Chen',
      email: 'admin@acme.dev',
      badge: 'Admin',
      desc: 'Full administrative rights & org policies',
    },
    {
      role: 'INCIDENT_COMMANDER',
      name: 'Alex Rivera',
      email: 'commander@acme.dev',
      badge: 'Commander',
      desc: 'Incident escalation & postmortem governance',
    },
    {
      role: 'RESPONDER',
      name: 'Marcus Vance',
      email: 'responder@acme.dev',
      badge: 'Responder',
      desc: 'Interactive runbook SOP execution',
    },
    {
      role: 'VIEWER',
      name: 'Elena Rostova',
      email: 'viewer@acme.dev',
      badge: 'Observer',
      desc: 'Read-only compliance & analytics review',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050507] text-[#F4F3EF] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans selection:bg-[#C8A97E]/25">
      {/* High-End Ambient Velvet Spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.12),transparent_70%)] pointer-events-none rounded-full" />

      <div className="w-full max-w-lg mx-auto relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-[#A1A1AA] mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5C185] animate-pulse" />
            <span>Autonomous Incident Governance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F3EF]">
            Pulse <span className="font-serif italic font-normal text-[#C8A97E]">Intelligence</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
            Stateful incident triage, deterministic runbook SOP playbooks, and autonomous SLA sentinel.
          </p>
        </div>

        {/* 1-Click Evaluator Persona Dossiers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#63636B] uppercase tracking-wider px-1">
            <span>Evaluator 1-Click Personas</span>
            <span className="text-[#C8A97E] font-medium">Instant JWT Auth</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {demoDossiers.map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleQuickDossier(d.role)}
                disabled={loading}
                className="p-3.5 rounded-2xl linear-card hover:border-[#C8A97E]/40 text-left transition-all duration-200 group relative disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {getRoleInsignia(d.role, 'w-3.5 h-3.5 text-[#C8A97E]')}
                    <span className="text-[11px] font-mono font-bold text-[#F4F3EF]">
                      {d.badge}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#63636B] group-hover:text-[#F4F3EF] group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-xs font-medium text-[#F4F3EF]">{d.name}</div>
                <div className="text-[10px] text-[#A1A1AA] mt-0.5 leading-snug">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-white/[0.06]" />
          <span className="bg-[#050507] px-3 text-[10px] font-mono uppercase text-[#63636B] relative">
            Or Standard Credentials
          </span>
        </div>

        {/* Manual Login Card */}
        <div className="linear-card p-6 space-y-5">
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-[#A1A1AA] block mb-1.5 uppercase">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#63636B] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="commander@acme.dev"
                  className="w-full bg-[#141418] border border-white/[0.08] focus:border-[#C8A97E] rounded-xl px-3.5 py-2.5 pl-10 text-xs text-[#F4F3EF] placeholder:text-[#63636B] focus:outline-none font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-[#A1A1AA] block mb-1.5 uppercase">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#63636B] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#141418] border border-white/[0.08] focus:border-[#C8A97E] rounded-xl px-3.5 py-2.5 pl-10 text-xs text-[#F4F3EF] placeholder:text-[#63636B] focus:outline-none font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-xl btn-ivory text-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#A1A1AA]">
          Deploying a fresh workspace?{' '}
          <Link to="/register" className="text-[#C8A97E] hover:underline font-medium">
            Initialize Organization →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
