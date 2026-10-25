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
          icon: '⚡',
          style: { borderLeft: '3px solid #C8A97E' },
        });
      }
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Alert Ingest & Deduplication',
      desc: 'External webhook fires (Datadog/PagerDuty). Alert is SHA-256 fingerprinted and deduplicated in a 300s cache window to avoid alert storms.',
      badge: 'SHA-256 CACHE',
      icon: Flame,
      color: 'jewel-pill-p1',
      action: (
        <button
          onClick={handleQuickOutage}
          className="mt-2 text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg btn-ivory flex items-center gap-1.5"
        >
          <Zap className="w-3 h-3 text-severity-p1" />
          <span>Simulate P1 Alert</span>
        </button>
      ),
    },
    {
      num: '02',
      title: 'Event Bus & SLA Sentinel',
      desc: 'Pushed instantly over Socket.io dual-rooms. The 5s SLA Sentinel starts ticking; unacknowledged incidents automatically escalate.',
      badge: '5s TICKER ACTIVE',
      icon: Radio,
      color: 'jewel-pill-p2',
    },
    {
      num: '03',
      title: 'Deterministic SOP Runbooks',
      desc: 'Runbook engine auto-attaches diagnostic SOP checklists. Responders execute CLI verification commands directly in the terminal console.',
      badge: 'CLI SOP PLAYBOOKS',
      icon: Terminal,
      color: 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20',
    },
    {
      num: '04',
      title: 'Postmortem Governance Gate',
      desc: 'State machine mathematically blocks closure until root cause taxonomy is recorded and a published Postmortem report is attached.',
      badge: 'GOVERNANCE GATE',
      icon: FileCheck,
      color: 'jewel-pill-p4',
      action: (
        <Link
          to="/postmortems"
          className="mt-2 text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg btn-ghost inline-flex items-center gap-1.5"
        >
          <span>Postmortem Studio</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl titanium-surface relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
            Operational Architecture & Incident Lifecycle
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/5 transition-colors text-xs font-mono flex items-center gap-1"
        >
          <span className="hidden sm:inline">Dismiss Guide</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.num}
              className="p-4 rounded-xl bg-white/[0.02] border border-border-subtle flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold text-text-tertiary">
                    STAGE {st.num}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold ${st.color}`}>
                    {st.badge}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-text-primary flex-shrink-0" />
                  <h3 className="text-xs font-semibold text-text-primary">{st.title}</h3>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed font-sans">{st.desc}</p>
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
