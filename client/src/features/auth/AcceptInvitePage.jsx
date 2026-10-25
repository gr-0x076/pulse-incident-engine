import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getRoleInsignia } from '../../components/ui/TacticalInsignia';
import BrutalistCard from '../../components/ui/BrutalistCard';
import toast from 'react-hot-toast';

export const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await apiClient.get(`/invites/${token}`);
        if (res.success) {
          setInvite(res.data);
        }
      } catch (err) {
        setError(err.message || 'Invitation is invalid, expired, or already claimed.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password || password.length < 6) {
      toast.error('Name and password (min 6 characters) are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/invites/accept', {
        token,
        name,
        password,
      });

      if (res.success) {
        localStorage.setItem('pulse_access_token', res.data.tokens.accessToken);
        localStorage.setItem('pulse_refresh_token', res.data.tokens.refreshToken);
        localStorage.setItem('pulse_user', JSON.stringify(res.data.user));
        toast.success(`Squadron joined as [${res.data.user.role}]! Welcome, ${res.data.user.name}`, {
          icon: '🛡️',
        });
        window.location.href = '/dashboard';
      }
    } catch (err) {
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 font-mono">
          <span className="w-8 h-8 rounded-full border-2 border-border-default border-t-accent-primary animate-spin" />
          <span className="text-xs text-text-tertiary uppercase tracking-widest">
            Validating Squadron Clearance...
          </span>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 bg-grid-dots">
        <BrutalistCard className="w-full max-w-md text-center space-y-4" indexStamp="// ACCESS_DENIED">
          <AlertTriangle className="w-10 h-10 text-severity-p1 mx-auto" />
          <h2 className="text-base font-bold text-text-primary font-mono">
            Invalid or Expired Invitation
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            {error || 'This invite token has either already been claimed, revoked, or expired.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-bg-tertiary border border-border-default text-xs font-mono text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <span>Return to Login Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </BrutalistCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 font-sans relative">
      {/* Background Atmosphere glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#7877C6]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md linear-card p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.85)] relative z-10 space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-text-secondary mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            <span>Squadron Commission</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Accept Invitation
          </h1>
          <p className="text-xs text-text-secondary font-serif italic text-base text-text-secondary/80">
            You have been cleared to join <strong>{invite.orgId?.name || 'Pulse Squadron'}</strong>.
          </p>
        </div>

        {/* Assigned Tactical Role Badge Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            {getRoleInsignia(invite.role, "w-5 h-5")}
            <div>
              <span className="text-text-tertiary text-[10px] uppercase block font-medium">Assigned Tactical Role</span>
              <span className="font-semibold text-text-primary">{invite.role}</span>
            </div>
          </div>
          <span className="text-[10px] text-accent-success bg-accent-success/10 px-2 py-0.5 rounded-full border border-accent-success/30 font-medium">
            Clearance Valid
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Officer Email Address (Locked)
            </label>
            <input
              type="email"
              disabled
              value={invite.email}
              className="w-full bg-[#070709] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-text-tertiary font-mono cursor-not-allowed opacity-75"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Full Officer Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Marcus Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Create Officer Access Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-tertiary absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#070709] border border-white/[0.08] focus:border-white/20 rounded-xl px-3.5 py-2.5 pl-10 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || password.length < 6}
            className="btn-ivory w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 mt-4"
          >
            {submitting ? (
              <span>Commissioning Officer...</span>
            ) : (
              <>
                <span>Confirm Commission & Access Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-text-secondary pt-2">
          Already commissioned?{' '}
          <Link to="/login" className="text-text-primary font-medium hover:underline">
            Login Terminal →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
