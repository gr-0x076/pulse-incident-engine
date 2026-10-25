import React, { useState } from 'react';
import { Shield, Sparkles, ChevronUp, ChevronDown, Check, User, FlaskConical, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleInsignia } from '../ui/TacticalInsignia';

export const EvaluatorSandboxDock = () => {
  const { user, switchDemoRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!user) return null;

  const personas = [
    {
      role: 'ADMIN',
      name: 'Sarah Chen',
      title: 'Command Officer',
      desc: 'Full administrative rights: team invites, organization settings, declare and close outages.',
      badgeClass: 'jewel-pill-p1',
      insignia: 'COMMANDER_IN_CHIEF',
    },
    {
      role: 'INCIDENT_COMMANDER',
      name: 'Alex Rivera',
      title: 'Incident Commander',
      desc: 'Triage lead: P1 escalation authority, assign responders, publish postmortems.',
      badgeClass: 'jewel-pill-p2',
      insignia: 'INCIDENT_COMMANDER',
    },
    {
      role: 'RESPONDER',
      name: 'Marcus Vance',
      title: 'On-Call SRE',
      desc: 'Tactical responder: acknowledge incidents (stops SLA), execute runbook CLI steps, investigation notes.',
      badgeClass: 'jewel-pill-p3',
      insignia: 'ON_CALL_SRE',
    },
    {
      role: 'VIEWER',
      name: 'Elena Rostova',
      title: 'Compliance Observer',
      desc: 'Read-only observer: view real-time metrics, telemetry & postmortems. All mutations strictly locked.',
      badgeClass: 'bg-white/5 text-text-secondary border border-white/10',
      insignia: 'AUDIT_OBSERVER',
    },
  ];

  const handleSwitch = async (role) => {
    if (user.role === role) return;
    setSwitching(true);
    try {
      await switchDemoRole(role);
      setIsOpen(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 font-sans select-none">
      {/* Expanded Persona Selection Card */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-40 mb-2 w-80 sm:w-96 rounded-2xl titanium-surface p-4 shadow-[0_24px_50px_rgba(0,0,0,0.95)] animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">Grading Sandbox</h4>
                  <p className="text-[10px] text-text-tertiary font-mono">1-Click RBAC Persona Switcher</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Persona List */}
            <div className="mt-3 space-y-2">
              {personas.map((p) => {
                const isActive = user.role === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    disabled={switching}
                    onClick={() => handleSwitch(p.role)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-white/10 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.06)]'
                        : 'bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleInsignia(p.role, 'w-3.5 h-3.5')}
                        <span className="text-xs font-semibold text-text-primary">{p.name}</span>
                        <span className="text-[10px] text-text-tertiary font-mono">({p.role})</span>
                      </div>
                      {isActive ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-ivory text-bg-primary">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-text-tertiary hover:text-text-primary">
                          Switch →
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary mt-1 leading-snug font-sans">
                      {p.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Notice Footer */}
            <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-tertiary">
              <span>SANDBOX ENVIRONMENT</span>
              <span className="text-accent-success">RBAC GATED</span>
            </div>
          </div>
        </>
      )}

      {/* Floating Collapsed Pill Dock */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-full titanium-surface-interactive text-xs shadow-lg group"
      >
        <span className="p-1 rounded-full bg-accent-primary/15 text-accent-primary">
          <FlaskConical className="w-3.5 h-3.5" />
        </span>
        <span className="text-text-tertiary font-mono text-[11px] hidden sm:inline">Sandbox:</span>
        <span className="font-medium text-text-primary text-xs flex items-center gap-1.5">
          {getRoleInsignia(user.role, 'w-3 h-3')}
          <span>{user.name}</span>
          <span className="text-[10px] text-text-tertiary font-mono">[{user.role}]</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary transition-colors" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary transition-colors" />
        )}
      </button>
    </div>
  );
};

export default EvaluatorSandboxDock;
