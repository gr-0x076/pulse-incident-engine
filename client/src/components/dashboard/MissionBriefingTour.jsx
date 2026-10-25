import React from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Radio,
  Terminal,
  FileCheck,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  CheckCircle,
} from 'lucide-react';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

export const MissionBriefingTour = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleQuickOutage = async () => {
    try {
      const res = await apiClient.post('/webhooks/simulate', { preset: 'API_GATEWAY_5XX' });
      if (res.success) {
        toast.success('Synthetic P1 Outage Ingested! Watch the SLA Sentinel start ticking.', {
          icon: '🚨',
          style: { borderLeft: '3px solid #FF453A' },
        });
      }
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    }
  };

  const steps = [
    {
      num: '01',
      title: 'OUTAGE INGESTED & DEDUPLICATED',
      desc: 'External webhook fires (Datadog/PagerDuty). Alert is SHA-256 fingerprinted and deduplicated in a 300s cache window to avoid alert storms.',
      badge: 'SHA-256 CACHE',
      icon: Flame,
      color: 'text-severity-p1 border-severity-p1/30 bg-severity-p1/10',
      action: (
        <button
          onClick={handleQuickOutage}
          className="mt-2 text-[10px] font-mono font-bold px-2 py-1 rounded bg-severity-p1 text-white hover:bg-severity-p1/90 transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(255,69,58,0.3)]"
        >
          <Zap className="w-3 h-3" />
          <span>Fire Simulated P1 Alert</span>
        </button>
      ),
    },
    {
      num: '02',
      title: 'REAL-TIME BUS & SLA SENTINEL',
      desc: 'Pushed instantly over Socket.io dual-rooms. The 5s SLA Sentinel starts ticking; unacknowledged incidents automatically escalate.',
      badge: '5s TICKER ACTIVE',
      icon: Radio,
      color: 'text-severity-p2 border-severity-p2/30 bg-severity-p2/10',
    },
    {
      num: '03',
      title: 'DETERMINISTIC RUNBOOK TRIAGE',
      desc: 'Runbook engine auto-attaches diagnostic SOP checklists. Responders execute CLI verification commands directly in the terminal console.',
      badge: 'CLI SOP PLAYBOOKS',
      icon: Terminal,
      color: 'text-accent-primary border-accent-primary/30 bg-accent-primary/10',
    },
    {
      num: '04',
      title: 'ROOT CAUSE & POSTMORTEM GATE',
      desc: 'State machine mathematically blocks closure until root cause taxonomy is recorded and a published Postmortem report is attached.',
      badge: 'GOVERNANCE GATE',
      icon: FileCheck,
      color: 'text-accent-success border-accent-success/30 bg-accent-success/10',
      action: (
        <Link
          to="/postmortems"
          className="mt-2 text-[10px] font-mono font-bold px-2 py-1 rounded bg-accent-success/20 border border-accent-success/40 text-accent-success hover:bg-accent-success hover:text-bg-primary transition-all inline-flex items-center gap-1"
        >
          <span>Postmortem Studio</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-[#141416] border border-[#3A3A3F] relative overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
            // SYSTEM_BRIEFING: HOW PULSE WORKS (AUTOMATED INCIDENT LOOP)
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-[#232326] transition-colors text-xs font-mono flex items-center gap-1"
        >
          <span className="hidden sm:inline">Dismiss Guide</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3.5">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.num}
              className="p-3.5 rounded border border-[#2A2A2E] bg-[#1C1C1F]/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-text-tertiary">
                    STAGE {st.num}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${st.color}`}>
                    {st.badge}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-text-primary" />
                  <h3 className="text-xs font-mono font-bold text-text-primary">{st.title}</h3>
                </div>
                <p className="text-[11px] text-text-secondary font-mono leading-relaxed">{st.desc}</p>
              </div>

              {st.action && <div className="pt-2">{st.action}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MissionBriefingTour;
