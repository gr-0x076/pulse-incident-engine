import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, UserCheck, Copy, Check, X, Lock } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getRoleInsignia } from '../../components/ui/TacticalInsignia';
import BrutalistCard from '../../components/ui/BrutalistCard';
import toast from 'react-hot-toast';

export const TeamPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('RESPONDER');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await apiClient.get('/org/team');
      return res.data;
    },
  });

  const members = data?.members || [];
  const invites = data?.invites || [];

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    if (user?.role !== 'ADMIN') {
      toast.error('Only Administrators can issue team invitations');
      return;
    }
    try {
      const res = await apiClient.post('/invites', { email, role });
      if (res.success) {
        setGeneratedInvite(res.data);
        queryClient.invalidateQueries({ queryKey: ['team'] });
        toast.success('Invitation link generated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate invitation');
    }
  };

  const copyInvite = () => {
    if (generatedInvite?.inviteUrl) {
      navigator.clipboard.writeText(generatedInvite.inviteUrl);
      setCopied(true);
      toast.success('Invite URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase">
              Organization Squadron
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary mt-0.5">
            Squadron Roster & Role-Based Access Control
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage responder clearances, team invites, and cryptographic access delegation.
          </p>
        </div>

        {user?.role === 'ADMIN' ? (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-ivory px-3.5 py-2 rounded-xl text-xs flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Responder</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-border-subtle text-text-tertiary text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Clearance Required to Invite</span>
          </div>
        )}
      </div>

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-lg skeleton" />)
        ) : (
          members.map((m) => (
            <BrutalistCard
              key={m._id}
              indexStamp={`//OFFICER_${m.role}`}
              className="space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded bg-bg-tertiary/70 border border-border-subtle">
                  {getRoleInsignia(m.role, "w-6 h-6")}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border-subtle bg-bg-tertiary/60 text-accent-primary font-semibold">
                  {m.role}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-text-primary">{m.name}</h3>
                <p className="text-xs font-mono text-text-tertiary truncate">{m.email}</p>
              </div>

              <div className="pt-2 border-t border-border-subtle/40 flex items-center justify-between text-xs font-mono">
                <span className="text-text-tertiary">Active Load:</span>
                <span className="font-bold text-text-primary">
                  {m.activeIncidentCount || 0} Incidents
                </span>
              </div>
            </BrutalistCard>
          ))
        )}
      </div>

      {/* Pending Invites List */}
      {invites.length > 0 && (
        <div className="p-4 rounded-lg bg-bg-secondary/40 border border-border-subtle space-y-3">
          <h2 className="text-xs font-mono text-text-tertiary uppercase">// PENDING INVITATIONS</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv._id}
                className="p-2.5 rounded bg-bg-tertiary/40 border border-border-subtle flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="text-text-primary font-semibold">{inv.email}</span>
                  <span className="text-text-tertiary ml-2">Role: {inv.role}</span>
                </div>
                <span className="text-[10px] text-severity-p2 bg-severity-p2/10 px-2 py-0.5 rounded border border-severity-p2/30">
                  PENDING ACCEPTANCE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg p-5 modal-surface relative">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                // GENERATE_MEMBER_INVITE
              </h3>
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setGeneratedInvite(null);
                }}
                className="p-1 rounded text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!generatedInvite ? (
              <form onSubmit={handleGenerateInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                    Responder Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@acme.dev"
                    className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-3 py-2 text-xs text-text-primary font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-2.5 py-2 text-xs text-text-primary font-mono"
                  >
                    <option value="RESPONDER">[RESPONDER] On-Call SRE (Tactical Playbook Execution)</option>
                    <option value="INCIDENT_COMMANDER">[INCIDENT_COMMANDER] Lead IC (Triage & Mitigation)</option>
                    <option value="ADMIN">[ADMIN] Command Officer (Full Authority)</option>
                    <option value="VIEWER">[VIEWER] Audit Observer (Compliance & Metrics)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-3 py-1.5 rounded text-xs font-mono text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-accent-primary text-white font-mono text-xs font-bold"
                  >
                    Generate Invite Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary">
                  Invitation link created for <strong>{generatedInvite.invite?.email}</strong>. Evaluators can copy this URL directly to test invite acceptance:
                </p>

                <div className="p-3 rounded bg-bg-primary border border-border-subtle font-mono text-xs text-accent-primary break-all">
                  {generatedInvite.inviteUrl}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={copyInvite}
                    className="px-4 py-2 rounded bg-accent-primary text-white font-mono text-xs font-bold flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
