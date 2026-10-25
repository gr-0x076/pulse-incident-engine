import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, Shield, AlertTriangle, Zap, CheckCircle2, TrendingUp } from 'lucide-react';
import apiClient from '../../api/client';

export const AnalyticsPage = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading || !metrics) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 rounded skeleton" />
          <div className="h-40 rounded skeleton" />
          <div className="h-40 rounded skeleton" />
        </div>
      </div>
    );
  }

  const summary = metrics.summary || {};
  const mtta = metrics.mtta || {};
  const mttr = metrics.mttr || {};
  const severities = metrics.severityBreakdown || [];
  const rootCauses = metrics.rootCauseBreakdown || [];
  const workload = metrics.responderWorkload || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-text-tertiary uppercase">
              // MONGODB_AGGREGATION_PIPELINES
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">
            Operational Reliability & SRE Telemetry
          </h1>
        </div>
        <div className="text-xs font-mono text-text-tertiary">
          Calculated in MongoDB Engine via $facet & $group
        </div>
      </div>

      {/* Top 3 Core Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MTTA Pipeline Card */}
        <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
            <span>MTTA (TRIAGE SPEED)</span>
            <Clock className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="text-3xl font-bold font-mono text-text-primary">
            {mtta.avgMinutes || 0}m
          </div>
          <div className="text-xs font-mono text-text-secondary flex justify-between border-t border-border-subtle/40 pt-2">
            <span>Fastest: {mtta.minMinutes || 0}m</span>
            <span>Slowest: {mtta.maxMinutes || 0}m</span>
          </div>
        </div>

        {/* MTTR Pipeline Card */}
        <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
            <span>MTTR (RESTORATION SPEED)</span>
            <CheckCircle2 className="w-4 h-4 text-accent-success" />
          </div>
          <div className="text-3xl font-bold font-mono text-text-primary">
            {mttr.avgMinutes ? `${Math.round(mttr.avgMinutes / 60)}h ${mttr.avgMinutes % 60}m` : '0m'}
          </div>
          <div className="text-xs font-mono text-text-secondary flex justify-between border-t border-border-subtle/40 pt-2">
            <span>Min: {mttr.minMinutes || 0}m</span>
            <span>Max: {mttr.maxMinutes || 0}m</span>
          </div>
        </div>

        {/* SLA Sentinel Compliance Card */}
        <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
            <span>SLA SENTINEL INTEGRITY</span>
            <Shield className="w-4 h-4 text-severity-p2" />
          </div>
          <div className="text-3xl font-bold font-mono text-accent-success">
            {100 - (summary.slaBreachRate || 0)}%
          </div>
          <div className="text-xs font-mono text-text-secondary flex justify-between border-t border-border-subtle/40 pt-2">
            <span>Total Outages: {summary.totalIncidents || 0}</span>
            <span className="text-severity-p1">{summary.slaBreachCount || 0} Auto-Escalations</span>
          </div>
        </div>
      </div>

      {/* Breakdown Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase text-text-primary">
            // SEVERITY_DISTRIBUTION (OUTAGE INTENSITY)
          </h2>
          <div className="space-y-3">
            {severities.map((sev) => {
              const pct = summary.totalIncidents ? Math.round((sev.count / summary.totalIncidents) * 100) : 0;
              const color =
                sev._id === 'P1'
                  ? 'bg-severity-p1'
                  : sev._id === 'P2'
                  ? 'bg-severity-p2'
                  : sev._id === 'P3'
                  ? 'bg-severity-p3'
                  : 'bg-severity-p4';

              return (
                <div key={sev._id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-text-primary">Tier {sev._id}</span>
                    <span className="text-text-tertiary">
                      {sev.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Root Cause Taxonomy */}
        <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase text-text-primary">
            // ROOT_CAUSE_TAXONOMY (POSTMORTEM FINDINGS)
          </h2>
          {rootCauses.length === 0 ? (
            <div className="text-xs font-mono text-text-tertiary py-8 text-center">
              No root cause classifications recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rootCauses.map((rc) => (
                <div
                  key={rc._id}
                  className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-accent-primary font-bold">{rc._id}</span>
                  <span className="text-text-primary font-semibold">{rc.count} Incidents</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Responder Workload Distribution */}
      <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase text-text-primary">
          // RESPONDER_SQUADRON_LOAD_DISTRIBUTION
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-text-tertiary">
                <th className="pb-2.5">RESPONDER</th>
                <th className="pb-2.5">TACTICAL ROLE</th>
                <th className="pb-2.5 text-right">ACTIVE INCIDENTS CLAIMED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30">
              {workload.map((resp) => (
                <tr key={resp._id} className="hover:bg-bg-tertiary/30">
                  <td className="py-2.5 font-semibold text-text-primary">{resp.name}</td>
                  <td className="py-2.5 text-text-secondary">{resp.role}</td>
                  <td className="py-2.5 text-right font-bold text-accent-primary">
                    {resp.activeIncidentCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
