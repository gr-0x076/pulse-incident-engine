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
    <div className="p-5 sm:p-6 rounded-2xl titanium-surface relative overflow-hidden flex flex-col justify-between w-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-accent-success animate-pulse" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
              Reliability Telemetry
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-success/15 border border-accent-success/30 text-accent-success font-bold">
            5s TICKER
          </span>
        </div>

        {/* Monumental Numbers Grid */}
        <div className="space-y-3.5">
          {/* MTTA (Acknowledge) */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-tertiary uppercase block">
                Mean Time to Ack (MTTA)
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-text-primary mt-0.5">
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
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-text-tertiary uppercase block">
                Mean Time to Repair (MTTR)
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-text-primary mt-0.5">
                {mttrDisplay}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-accent-primary">MEDIAN</span>
              <span className="text-[10px] font-mono text-text-tertiary block">Target: &lt;4h</span>
            </div>
          </div>

          {/* SLA Compliance Gauge & Sleek Segmented Bar */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-tertiary uppercase">
                SLA Compliance Gauge
              </span>
              <span className="text-xs font-mono font-bold text-accent-success">
                {slaCompliance}%
              </span>
            </div>
            {/* Monumental Number */}
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-text-primary mt-0.5">
              {slaCompliance}%
            </div>
            {/* Segmented luxury titanium track */}
            <div className="mt-3 flex gap-1 h-1.5">
              {Array.from({ length: 24 }).map((_, idx) => {
                const isFilled = idx < Math.round((slaCompliance / 100) * 24);
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm transition-all duration-500 ${
                      isFilled
                        ? 'bg-accent-success'
                        : 'bg-white/[0.06]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-accent-success' : 'bg-[#E5C185]'}`} />
          <span className="text-text-secondary">{connected ? 'BI-DIRECTIONAL WS: UP' : 'WS RECONNECTING'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E5C185] font-semibold">P1 ACTIVE: {p1Count}</span>
        </div>
      </div>
    </div>
  );
};

export default SentinelRadarWidget;
