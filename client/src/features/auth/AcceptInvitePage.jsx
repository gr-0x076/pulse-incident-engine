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
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 font-sans bg-grid-dots">
      <BrutalistCard className="w-full max-w-md space-y-5" indexStamp="// SQUADRON_CLEARANCE_PORTAL">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-accent-primary uppercase">
              // SQUADRON COMMISSION
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary mt-1">
            Accept Squadron Commission
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            You have been cleared to join <strong>{invite.orgId?.name || 'Pulse Squadron'}</strong>.
          </p>
        </div>

        {/* Assigned Tactical Role Badge Card */}
        <div className="p-3.5 rounded bg-bg-tertiary/50 border border-border-subtle flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2.5">
            {getRoleInsignia(invite.role, "w-5 h-5")}
            <div>
              <span className="text-text-tertiary text-[10px] uppercase block">ASSIGNED TACTICAL ROLE</span>
              <span className="font-bold text-text-primary">{invite.role}</span>
            </div>
          </div>
          <span className="text-[10px] text-accent-success bg-accent-success/10 px-2 py-0.5 rounded border border-accent-success/30 font-semibold">
            CLEARANCE VALID
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Officer Email Address (Locked)
            </label>
            <input
              type="email"
              disabled
              value={invite.email}
              className="w-full bg-bg-primary/80 border border-border-subtle rounded px-3 py-2 text-xs text-text-tertiary font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Full Officer Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Marcus Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Create Officer Access Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-tertiary absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-3 py-2.5 pl-9 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || password.length < 6}
            className="w-full py-2.5 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(10,132,255,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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

        <div className="text-center text-xs font-mono text-text-tertiary">
          Already commissioned?{' '}
          <Link to="/login" className="text-accent-primary hover:underline">
            Login Terminal →
          </Link>
        </div>
      </BrutalistCard>
    </div>
  );
};

export default AcceptInvitePage;
