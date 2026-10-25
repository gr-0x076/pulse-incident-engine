import React from 'react';
import { Shield, Clock, CheckCircle2, Radio, Activity, TrendingDown } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const SentinelRadarWidget = ({ metrics = {} }) => {
  const { connected } = useSocket();

  const mtta = metrics.mtta?.avgMinutes || 0;
  const mttrMinutes = metrics.mttr?.avgMinutes || 0;
  const mttrDisplay = mttrMinutes > 60 ? `${Math.round(mttrMinutes / 60)}h ${mttrMinutes % 60}m` : `${mttrMinutes}m`;
  const slaCompliance = Math.max(0, 100 - (metrics.summary?.slaBreachRate || 0));
  const activeCount = metrics.summary?.activeCount || 0;
  const p1Count = metrics.severityBreakdown?.find((s) => s._id === 'P1')?.count || 0;

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-[#141416] border border-[#3A3A3F] relative overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between">
      {/* Corner crosshairs */}
      <span className="absolute top-1.5 left-2 font-mono text-[10px] text-text-tertiary select-none">+</span>
      <span className="absolute top-1.5 right-2 font-mono text-[10px] text-text-tertiary select-none">+</span>
      <span className="absolute bottom-1.5 left-2 font-mono text-[10px] text-text-tertiary select-none">+</span>
      <span className="absolute bottom-1.5 right-2 font-mono text-[10px] text-text-tertiary select-none">+</span>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2A2A2E]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-accent-success animate-pulse" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
              // BENTO_02: SLA SENTINEL TELEMETRY
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-success/15 border border-accent-success/30 text-accent-success font-bold">
            5s TICKER
          </span>
        </div>

        {/* Monumental Numbers Grid */}
        <div className="space-y-4">
          {/* MTTA (Acknowledge) */}
          <div className="p-3 rounded border border-[#2A2A2E] bg-[#1C1C1F]/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-tertiary uppercase block">
                MEAN TIME TO ACKNOWLEDGE (MTTA)
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-text-primary mt-0.5">
                {mtta}m
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-accent-success flex items-center gap-0.5 justify-end">
                <TrendingDown className="w-3 h-3" /> -14%
              </span>
              <span className="text-[10px] font-mono text-text-tertiary">Target: &lt;5m</span>
            </div>
          </div>

          {/* MTTR (Resolve) */}
          <div className="p-3 rounded border border-[#2A2A2E] bg-[#1C1C1F]/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-tertiary uppercase block">
                MEAN TIME TO REPAIR (MTTR)
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-text-primary mt-0.5">
                {mttrDisplay}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-accent-primary">MEDIAN</span>
              <span className="text-[10px] font-mono text-text-tertiary block">Target: &lt;4h</span>
            </div>
          </div>

          {/* SLA Compliance Gauge & Brutalist ASCII Bar */}
          <div className="p-3 rounded border border-[#2A2A2E] bg-[#1C1C1F]/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-tertiary uppercase">
                SLA COMPLIANCE GAUGE
              </span>
              <span className="text-xs font-mono font-bold text-accent-success">
                {slaCompliance}%
              </span>
            </div>
            {/* Monumental Number */}
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-text-primary mt-1">
              {slaCompliance}%
            </div>
            {/* Segmented brutalist bar */}
            <div className="mt-2 text-xs font-mono tracking-widest text-accent-success truncate select-none">
              ||||||||||||||||||||<span className="text-border-default">||||</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-accent-success' : 'bg-severity-p1'}`} />
          <span className="text-text-secondary">{connected ? 'BI-DIRECTIONAL WS: UP' : 'WS RECONNECTING'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-severity-p1 font-bold">P1 CRIT: {p1Count}</span>
        </div>
      </div>
    </div>
  );
};

export default SentinelRadarWidget;
