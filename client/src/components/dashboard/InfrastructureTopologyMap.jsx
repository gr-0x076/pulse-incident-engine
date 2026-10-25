import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Database,
  CreditCard,
  Key,
  Cpu,
  Flame,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Zap,
  Lock,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const InfrastructureTopologyMap = ({ incidents = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [simulatingNode, setSimulatingNode] = useState(null);

  // Helper to find active incident for a service
  const findActiveIncident = (keywords) => {
    return incidents.find((inc) => {
      const text = `${inc.title} ${inc.description || ''}`.toLowerCase();
      const isActive = ['FIRED', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'ESCALATED'].includes(
        inc.status
      );
      return isActive && keywords.some((k) => text.includes(k));
    });
  };

  const services = [
    {
      id: 'api-gateway',
      name: 'API Gateway',
      role: 'Edge Proxy & Ingress',
      port: ':443',
      metrics: '2,480 RPS // 14ms',
      keywords: ['gateway', '5xx', 'api', 'ingress'],
      preset: 'API_GATEWAY_5XX',
      icon: Server,
    },
    {
      id: 'auth-cluster',
      name: 'Auth Cluster',
      role: 'JWT & Token Authority',
      port: ':8080',
      metrics: '14.2k Sess // 8ms',
      keywords: ['auth', 'token', 'session', 'jwt', 'login'],
      preset: 'API_GATEWAY_5XX',
      icon: Key,
    },
    {
      id: 'payments',
      name: 'Payment Engine',
      role: 'Stripe & Ledger Sync',
      port: ':8443',
      metrics: '99.98% Ok // 42ms',
      keywords: ['payment', 'stripe', 'checkout', 'webhook', 'billing'],
      preset: 'PAYMENT_TIMEOUT',
      icon: CreditCard,
    },
    {
      id: 'database',
      name: 'Primary Postgres DB',
      role: 'State & Concurrency Node',
      port: ':5432',
      metrics: 'Pool 42/100 // 4ms',
      keywords: ['db', 'database', 'postgres', 'pool', 'sql'],
      preset: 'DB_POOL_EXHAUSTION',
      icon: Database,
    },
    {
      id: 'kubernetes',
      name: 'K8s Worker Grid',
      role: '16 Nodes // 148 Pods',
      port: ':6443',
      metrics: '34% CPU // Nominal',
      keywords: ['kubernetes', 'k8s', 'worker', 'pod', 'cluster', 'storm'],
      preset: 'ALERT_STORM_DUPLICATES',
      icon: Cpu,
    },
  ];

  const handleSimulate = async (e, service) => {
    e.stopPropagation();
    if (user?.role === 'VIEWER') {
      toast.error('Simulation locked: Read-only observers cannot trigger outages');
      return;
    }
    setSimulatingNode(service.id);
    try {
      const res = await apiClient.post('/webhooks/simulate', { preset: service.preset });
      if (res.success) {
        toast.success(`Outage Simulated: ${service.name} failed!`, {
          icon: '⚡',
          style: { borderLeft: '3px solid #F43F5E' },
        });
      }
    } catch (err) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setSimulatingNode(null);
    }
  };

  const burningCount = services.filter((s) => Boolean(findActiveIncident(s.keywords))).length;

  return (
    <div className="p-5 sm:p-6 rounded-2xl titanium-surface relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${burningCount > 0 ? 'bg-severity-p1 animate-ping shadow-[0_0_8px_#F43F5E]' : 'bg-accent-success'}`} />
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
            Distributed Infrastructure Topology
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-text-tertiary">
            STATUS:{' '}
            <strong className={burningCount > 0 ? 'text-severity-p1' : 'text-accent-success'}>
              {burningCount > 0 ? `${burningCount} NODES DEGRADED` : 'ALL SYSTEMS NOMINAL'}
            </strong>
          </span>
          <span className="text-border-default">|</span>
          <span className="text-text-tertiary">UPTIME: <strong className="text-text-primary">99.98%</strong></span>
        </div>
      </div>

      {/* Microservice Topology Map Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
        {services.map((svc) => {
          const Icon = svc.icon;
          const activeIncident = findActiveIncident(svc.keywords);
          const isBurning = Boolean(activeIncident);
          const isSimulating = simulatingNode === svc.id;

          return (
            <div
              key={svc.id}
              onClick={() => {
                if (activeIncident) {
                  navigate(`/incidents/${activeIncident._id}`);
                }
              }}
              className={`p-3.5 rounded border transition-all duration-200 relative group text-left ${
                isBurning
                  ? 'bg-severity-p1/10 border-severity-p1/60 shadow-[0_0_20px_rgba(255,69,58,0.2)] cursor-pointer hover:border-severity-p1'
                  : 'bg-[#1C1C1F]/60 border-[#2C2C30] hover:border-[#4A4A50] hover:bg-[#1C1C1F]'
              }`}
            >
              {/* Top Row: Icon + Name + Port */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded border ${
                      isBurning
                        ? 'bg-severity-p1/20 border-severity-p1 text-severity-p1 animate-pulse'
                        : 'bg-bg-tertiary border-[#3A3A3F] text-accent-primary'
                    }`}
                  >
                    {isBurning ? <Flame className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-text-primary flex items-center gap-1.5">
                      <span>{svc.name}</span>
                      <span className="text-[10px] text-text-tertiary font-normal">{svc.port}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary font-mono">{svc.role}</div>
                  </div>
                </div>

                {/* Status Indicator */}
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isBurning
                      ? 'bg-severity-p1 text-white animate-pulse'
                      : 'bg-accent-success/15 text-accent-success border border-accent-success/30'
                  }`}
                >
                  {isBurning ? 'CRIT' : 'OK'}
                </span>
              </div>

              {/* Middle Row: Metrics telemetry */}
              <div className="mt-3 pt-2 border-t border-[#2A2A2E] flex items-center justify-between text-[10px] font-mono">
                <span className="text-text-tertiary">TELEMETRY:</span>
                <span className={isBurning ? 'text-severity-p1 font-bold' : 'text-text-secondary'}>
                  {isBurning ? 'HIGH LATENCY / 5XX SPIKE' : svc.metrics}
                </span>
              </div>

              {/* Bottom Row: 1-Click Action */}
              <div className="mt-2.5 flex items-center justify-between">
                {isBurning ? (
                  <div className="w-full flex items-center justify-between text-xs font-mono text-severity-p1 bg-severity-p1/20 px-2 py-1 rounded border border-severity-p1/40 hover:bg-severity-p1 hover:text-white transition-colors">
                    <span className="font-bold">INC-{String(activeIncident.incidentNumber).padStart(5, '0')}</span>
                    <span className="flex items-center gap-1 text-[11px]">
                      War Room <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                ) : user?.role === 'VIEWER' ? (
                  <div className="w-full py-1.5 px-2 rounded-lg bg-white/[0.02] border border-border-subtle text-text-tertiary text-[10px] font-mono flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Simulation Locked</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSimulate(e, svc)}
                    disabled={isSimulating}
                    className="w-full py-1.5 px-2 rounded-lg btn-ghost hover:text-severity-p1 text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSimulating ? (
                      <span>Injecting Outage...</span>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-severity-p1" />
                        <span>Simulate Node Failure</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Chaos Trigger Module */}
        <div className="p-3.5 rounded border border-dashed border-[#3A3A3F] bg-[#141416]/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-text-primary">
              <Zap className="w-4 h-4 text-severity-p2" />
              <span>SYNTHETIC INGESTION</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1 font-mono leading-relaxed">
              Test automated runbook matching, SHA-256 alert deduplication, and the 5s SLA Sentinel ticker in real time.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-text-tertiary pt-2 border-t border-[#2A2A2E]">
            <span>ENGINE: SHA-256 CACHE</span>
            <span className="text-accent-success">SENTINEL: 5s TICK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfrastructureTopologyMap;
