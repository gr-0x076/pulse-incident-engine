import React, { useState } from 'react';
import { X, Flame, Database, CreditCard, Copy, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

export const ChaosSimulatorDrawer = ({ isOpen, onClose }) => {
  const [loadingPreset, setLoadingPreset] = useState(null);
  const [resetting, setResetting] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async (preset, title) => {
    setLoadingPreset(preset);
    try {
      const response = await apiClient.post('/webhooks/simulate', { preset });
      if (response.success) {
        toast.success(`Outage Simulated: ${title}`, {
          icon: '⚡',
          style: { borderLeft: '3px solid #FF453A' },
        });
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Re-seed entire environment back to pristine demo state?')) return;
    setResetting(true);
    try {
      const response = await apiClient.post('/demo/reset');
      if (response.success) {
        toast.success('Environment re-seeded! Reloading state...', { icon: '🔄' });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      toast.error(err.message || 'Demo reset failed');
    } finally {
      setResetting(false);
    }
  };

  const presets = [
    {
      id: 'API_GATEWAY_5XX',
      title: 'API Gateway 5xx Spike',
      severity: 'P1',
      service: 'api-gateway',
      desc: 'Simulates 18.4% HTTP 503 error flood on payment & checkout clusters. Triggers automated runbook attachment.',
      icon: Flame,
      color: 'text-severity-p1 border-severity-p1/30 bg-severity-p1/10',
    },
    {
      id: 'DB_POOL_EXHAUSTION',
      title: 'DB Connection Pool Exhaustion',
      severity: 'P1',
      service: 'database',
      desc: 'Simulates Postgres connection pool starvation (>98% capacity). Tests multi-responder assignment & SLA timer.',
      icon: Database,
      color: 'text-severity-p1 border-severity-p1/30 bg-severity-p1/10',
    },
    {
      id: 'PAYMENT_TIMEOUT',
      title: 'Stripe Webhook Delivery Timeout',
      severity: 'P2',
      service: 'payments',
      desc: 'Simulates Stripe gateway timeouts (>15s). Tests high-priority escalation and diagnostic checklist.',
      icon: CreditCard,
      color: 'text-severity-p2 border-severity-p2/30 bg-severity-p2/10',
    },
    {
      id: 'ALERT_STORM_DUPLICATES',
      title: 'Alert Storm (Deduplication Test)',
      severity: 'P2',
      service: 'kubernetes',
      desc: 'Fires duplicate Datadog alerts. Tests SHA-256 fingerprint deduplication so 10 alerts do not create 10 incidents.',
      icon: Copy,
      color: 'text-severity-p3 border-severity-p3/30 bg-severity-p3/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-bg-secondary border-l border-border-subtle h-full flex flex-col shadow-2xl relative">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-severity-p1 animate-pulse" />
            <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase font-mono">
              // CHAOS_OUTAGE_SIMULATOR
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-5 py-2.5 bg-severity-p1/10 border-b border-severity-p1/20 flex items-center gap-2 text-xs text-severity-p1 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>EVALUATOR BENCHMARK: Ingest real-time alerts with 1 click.</span>
        </div>

        {/* Preset Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <p className="text-xs text-text-secondary leading-relaxed font-sans">
            Trigger external webhook payloads to evaluate real-time WebSocket broadcasting, automated runbook SOP attachment, SLA auto-escalation countdowns, and deduplication logic.
          </p>

          <div className="space-y-3 pt-2">
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSimulating = loadingPreset === preset.id;
              return (
                <div
                  key={preset.id}
                  className="group relative p-3.5 rounded border border-border-subtle bg-bg-tertiary/20 hover:border-border-default hover:bg-bg-tertiary/40 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded border ${preset.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">
                            {preset.title}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${preset.color}`}>
                            {preset.severity}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-text-tertiary">
                          svc: {preset.service}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary mt-2.5 leading-normal">
                    {preset.desc}
                  </p>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleSimulate(preset.id, preset.title)}
                      disabled={isSimulating}
                      className="px-3 py-1.5 text-xs font-mono font-medium rounded bg-bg-elevated hover:bg-white/10 text-text-primary border border-border-default hover:border-white/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSimulating ? (
                        <>
                          <span className="w-3 h-3 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
                          <span>Ingesting...</span>
                        </>
                      ) : (
                        <>
                          <span>Trigger Outage</span>
                          <span className="text-[10px] text-text-tertiary">↵</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: 1-Click Environment Reset */}
        <div className="p-4 border-t border-border-subtle bg-bg-tertiary/50">
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="w-full py-2.5 px-3 rounded bg-bg-primary hover:bg-bg-elevated border border-border-subtle hover:border-border-default text-text-secondary hover:text-text-primary text-xs font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Re-seeding Environment...' : '1-Click Restore Default Demo State'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChaosSimulatorDrawer;
