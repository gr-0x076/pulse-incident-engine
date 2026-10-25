import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SLA_DEFAULTS } from '../../lib/stateMachine';

export const LiveSLACountdown = ({ incident, compact = false }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Only tick if incident is in FIRED or ESCALATED status
    if (!['FIRED', 'ESCALATED'].includes(incident.status)) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [incident.status]);

  if (!incident) return null;

  // If already acknowledged, resolved, or closed, render static completion
  if (['ACKNOWLEDGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'CLOSED'].includes(incident.status)) {
    if (incident.acknowledgedAt && incident.createdAt) {
      const ackMs = new Date(incident.acknowledgedAt) - new Date(incident.createdAt);
      const ackMin = Math.round(ackMs / 60000);
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-accent-success">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SLA Met (Ack in {ackMin || '<1'}m)</span>
        </div>
      );
    }
    return null;
  }

  const severity = incident.severity || 'P2';
  const slaMinutes =
    severity === 'P1' ? 5 : severity === 'P2' ? 15 : severity === 'P3' ? 60 : 240;
  const slaWindowMs = slaMinutes * 60 * 1000;
  const createdAtMs = new Date(incident.createdAt).getTime();
  const deadlineMs = createdAtMs + slaWindowMs;
  const diffMs = deadlineMs - now;

  const isBreached = diffMs <= 0 || Boolean(incident.slaBreachedAt);

  if (isBreached) {
    const elapsedBreachMs = Math.abs(diffMs);
    const breachMin = Math.floor(elapsedBreachMs / 60000);
    const breachSec = Math.floor((elapsedBreachMs % 60000) / 1000);
    const breachTimeStr = `${String(breachMin).padStart(2, '0')}m ${String(breachSec).padStart(2, '0')}s`;

    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-severity-p1 font-bold animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>BREACH +{breachTimeStr}</span>
        </div>
      );
    }

    return (
      <div className="p-2.5 rounded bg-severity-p1/10 border border-severity-p1/30 space-y-1.5 animate-pulse font-mono">
        <div className="flex items-center justify-between text-xs text-severity-p1 font-bold">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SLA BREACHED (+{breachTimeStr})</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider">LIMIT: {slaMinutes}m</span>
        </div>
        <div className="h-1.5 w-full bg-severity-p1/20 rounded-full overflow-hidden">
          <div className="h-full bg-severity-p1 w-full" />
        </div>
      </div>
    );
  }

  // Active countdown
  const remainMin = Math.floor(diffMs / 60000);
  const remainSec = Math.floor((diffMs % 60000) / 1000);
  const timeStr = `${String(remainMin).padStart(2, '0')}m ${String(remainSec).padStart(2, '0')}s`;
  const pctLeft = Math.max(0, Math.min(100, Math.round((diffMs / slaWindowMs) * 100)));

  // Color logic
  const colorClass =
    pctLeft < 25
      ? 'text-severity-p1'
      : pctLeft < 55
      ? 'text-severity-p2'
      : 'text-accent-success';

  const barColor =
    pctLeft < 25
      ? 'bg-severity-p1'
      : pctLeft < 55
      ? 'bg-severity-p2'
      : 'bg-accent-success';

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] font-mono ${colorClass} font-semibold`}>
        <Clock className={`w-3.5 h-3.5 ${pctLeft < 25 ? 'animate-pulse' : ''}`} />
        <span>{timeStr} SLA</span>
      </div>
    );
  }

  // Full detailed widget for detail page
  return (
    <div className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle space-y-1.5 font-mono">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${colorClass}`} />
          <span>SLA TIER ({severity} — {slaMinutes}m):</span>
        </span>
        <span className={`font-bold ${colorClass}`}>
          {timeStr} REMAINING ({pctLeft}%)
        </span>
      </div>

      {/* Segmented Cyber-Brutalist Bar */}
      <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden border border-border-subtle p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pctLeft}%` }}
        />
      </div>
    </div>
  );
};

export default LiveSLACountdown;
