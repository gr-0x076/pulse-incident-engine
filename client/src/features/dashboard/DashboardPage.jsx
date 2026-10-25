import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  PlusCircle,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  Clock,
  Shield,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Activity,
  Layers,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatIncidentNumber, formatRelativeTime } from '../../lib/formatters';
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_COLORS } from '../../lib/stateMachine';
import CreateIncidentModal from '../incidents/CreateIncidentModal';
import LiveSLACountdown from '../../components/ui/LiveSLACountdown';
import BrutalistCard from '../../components/ui/BrutalistCard';

export const DashboardPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch incidents list with TanStack query
  const {
    data: incidentsData,
    isLoading: loadingIncidents,
    error: incidentError,
  } = useQuery({
    queryKey: ['incidents', { status: selectedStatus, severity: selectedSeverity, search, assignedToMe }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedSeverity) params.append('severity', selectedSeverity);
      if (search) params.append('search', search);
      if (assignedToMe) params.append('assignedToMe', 'true');
      return await apiClient.get(`/incidents?${params.toString()}`);
    },
    refetchInterval: 10000,
  });

  // Fetch aggregated operational analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Fetch team members for incident assignment
  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await apiClient.get('/org/team');
      return res.data;
    },
  });

  const incidents = incidentsData?.data || [];
  const metrics = analyticsData || {};
  const teamMembers = teamData?.members || [];

  // Determine DEFCON status
  const hasCriticalActive = incidents.some(
    (inc) => inc.severity === 'P1' && ['FIRED', 'ESCALATED'].includes(inc.status)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── DEFCON WARNING BANNER (ACTIVATES WHEN P1 IS ACTIVE) ── */}
      {hasCriticalActive && (
        <div className="hazard-stripes-p1 border border-severity-p1/40 rounded-lg p-3.5 flex items-center justify-between animate-fade-in shadow-[0_0_20px_rgba(255,69,58,0.15)]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-severity-p1 animate-ping" />
            <div>
              <div className="text-xs font-mono font-bold text-severity-p1 tracking-wider uppercase flex items-center gap-2">
                <span>[ DEFCON 1 // CRITICAL PRODUCTION OUTAGE DETECTED ]</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-sans">
                Active P1 incidents require immediate triage. SLA auto-escalation active.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedSeverity('P1')}
            className="px-3 py-1.5 rounded bg-severity-p1 text-white font-mono text-xs font-semibold hover:bg-severity-p1/90 transition-all flex items-center gap-1.5"
          >
            <span>Filter P1 Outages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── TOP ACTION HEADER & SYSTEM STATUS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-text-tertiary uppercase">
              // TELEMETRY_MATRIX
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">
            Incident Operations Center
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded bg-severity-p1 hover:bg-severity-p1/90 text-white font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,69,58,0.25)] flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Declare Incident</span>
          </button>
        </div>
      </div>

      {/* ── FROSTED-GLASS METRICS BAR WITH SVG SPARKLINE TELESCOPES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* MTTA Metric */}
        <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel relative overflow-hidden">
          <div className="flex items-center justify-between text-text-tertiary text-xs font-mono">
            <span>MTTA (ACKNOWLEDGE)</span>
            <Clock className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary">
              {metrics.mtta?.avgMinutes || 0}m
            </span>
            <span className="text-[11px] font-mono text-accent-success flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> -12%
            </span>
          </div>
          {/* Custom SVG Bezier Sparkline */}
          <div className="mt-2 h-7 w-full">
            <svg viewBox="0 0 100 24" className="w-full h-full stroke-accent-primary fill-accent-primary/10">
              <path d="M0,18 Q20,12 40,16 T70,8 T100,6" fill="none" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* MTTR Metric */}
        <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel relative overflow-hidden">
          <div className="flex items-center justify-between text-text-tertiary text-xs font-mono">
            <span>MTTR (RESOLVE)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary">
              {metrics.mttr?.avgMinutes ? `${Math.round(metrics.mttr.avgMinutes / 60)}h ${metrics.mttr.avgMinutes % 60}m` : '0m'}
            </span>
            <span className="text-[11px] font-mono text-text-secondary">Median</span>
          </div>
          {/* Custom SVG Bezier Sparkline */}
          <div className="mt-2 h-7 w-full">
            <svg viewBox="0 0 100 24" className="w-full h-full stroke-accent-success fill-accent-success/10">
              <path d="M0,8 Q25,20 50,14 T80,10 T100,4" fill="none" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* SLA Breach Rate Metric */}
        <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel relative overflow-hidden">
          <div className="flex items-center justify-between text-text-tertiary text-xs font-mono">
            <span>SLA COMPLIANCE</span>
            <Shield className="w-3.5 h-3.5 text-severity-p2" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary">
              {100 - (metrics.summary?.slaBreachRate || 0)}%
            </span>
            <span className="text-[11px] font-mono text-severity-p2">
              {metrics.summary?.slaBreachCount || 0} Breaches
            </span>
          </div>
          {/* Segmented ASCII Bar */}
          <div className="mt-3 text-[11px] font-mono text-accent-success tracking-widest truncate">
            ||||||||||||||||<span className="text-border-default">||||</span>
          </div>
        </div>

        {/* Active Incident Load */}
        <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel relative overflow-hidden">
          <div className="flex items-center justify-between text-text-tertiary text-xs font-mono">
            <span>ACTIVE LOAD</span>
            <Activity className="w-3.5 h-3.5 text-severity-p1" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary">
              {metrics.summary?.activeCount || 0}
            </span>
            <span className="text-[11px] font-mono text-text-tertiary">
              / {metrics.summary?.totalIncidents || 0} Total
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-severity-p1 animate-pulse" />
            <span>P1 Critical: {metrics.severityBreakdown?.find((s) => s._id === 'P1')?.count || 0}</span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE SPLIT: FILTERS & INCIDENT ROWS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Filter Column */}
        <div className="p-4 rounded-lg bg-bg-secondary/40 border border-border-subtle space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary uppercase pb-2 border-b border-border-subtle/60">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Query</span>
            </span>
            {(selectedStatus !== 'ACTIVE' || selectedSeverity || search || assignedToMe) && (
              <button
                onClick={() => {
                  setSelectedStatus('ACTIVE');
                  setSelectedSeverity('');
                  setSearch('');
                  setAssignedToMe(false);
                }}
                className="text-accent-primary hover:underline lowercase text-[10px]"
              >
                reset
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by title or INC-#"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-2.5 py-1.5 pl-8 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div>
            <label className="text-[10px] font-mono text-text-tertiary uppercase block mb-1.5">
              Status Phase
            </label>
            <div className="space-y-1">
              {[
                { id: 'ACTIVE', label: 'Active Incidents' },
                { id: '', label: 'All Lifecycles' },
                { id: 'FIRED', label: 'Fired (Unacknowledged)' },
                { id: 'INVESTIGATING', label: 'Investigating' },
                { id: 'MITIGATED', label: 'Mitigated' },
                { id: 'RESOLVED', label: 'Resolved' },
                { id: 'CLOSED', label: 'Closed' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`w-full px-2.5 py-1.5 rounded text-left text-xs font-mono flex items-center justify-between transition-colors ${
                    selectedStatus === s.id
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-text-secondary hover:bg-bg-tertiary/60'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="text-[10px] font-mono text-text-tertiary uppercase block mb-1.5">
              Severity Level
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '', label: 'ALL' },
                { id: 'P1', label: 'P1 Crit' },
                { id: 'P2', label: 'P2 High' },
                { id: 'P3', label: 'P3 Mod' },
                { id: 'P4', label: 'P4 Low' },
              ].map((sev) => (
                <button
                  key={sev.id}
                  onClick={() => setSelectedSeverity(sev.id)}
                  className={`px-2 py-1 rounded text-center text-xs font-mono transition-colors ${
                    selectedSeverity === sev.id
                      ? 'bg-text-primary text-bg-primary font-bold'
                      : 'bg-bg-tertiary/40 border border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned to Me Toggle */}
          <div className="pt-2 border-t border-border-subtle/40">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-text-secondary hover:text-text-primary">
              <input
                type="checkbox"
                checked={assignedToMe}
                onChange={(e) => setAssignedToMe(e.target.checked)}
                className="rounded border-border-default bg-bg-tertiary text-accent-primary focus:ring-0"
              />
              <span>Assigned to Me</span>
            </label>
          </div>
        </div>

        {/* Right Incident Rows Column */}
        <div className="lg:col-span-3 space-y-2.5">
          {loadingIncidents ? (
            // Skeleton Rows
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded border border-border-subtle bg-bg-secondary/40 skeleton" />
              ))}
            </div>
          ) : incidentError ? (
            <div className="p-8 rounded border border-severity-p1/30 bg-severity-p1/10 text-center font-mono text-xs text-severity-p1">
              Failed to load incident streams. Please check API server connection.
            </div>
          ) : incidents.length === 0 ? (
            // Tactical Empty State
            <div className="p-12 rounded-lg border border-border-subtle bg-bg-secondary/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-accent-success mx-auto" />
              <div className="text-sm font-mono font-semibold text-text-primary">
                All Systems Nominal — Zero Incidents Match Criteria
              </div>
              <p className="text-xs text-text-secondary max-w-sm mx-auto font-sans">
                No active operational incidents matching your filters. You can declare a new incident or simulate an external alert flood.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedStatus('');
                    setSelectedSeverity('');
                    setSearch('');
                  }}
                  className="px-3 py-1.5 rounded border border-border-default text-xs font-mono text-text-secondary hover:text-text-primary"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-severity-p1 text-white text-xs font-mono font-bold"
                >
                  Declare Outage
                </button>
              </div>
            </div>
          ) : (
            // High-Density Incident Rows
            incidents.map((incident) => {
              const statusStyle = STATUS_COLORS[incident.status] || 'text-text-secondary bg-bg-tertiary';
              const isP1 = incident.severity === 'P1';
              const completedSteps = incident.runbookProgress?.filter((p) => p.status === 'COMPLETED').length || 0;
              const totalSteps = incident.runbookProgress?.length || 0;

              return (
                <div
                  key={incident._id}
                  onClick={() => navigate(`/incidents/${incident._id}`)}
                  className={`group p-3.5 rounded border border-border-subtle bg-bg-secondary/70 hover:bg-bg-tertiary/40 hover:border-border-default cursor-pointer transition-all duration-150 relative ${
                    isP1 && ['FIRED', 'ESCALATED'].includes(incident.status) ? 'border-l-4 border-l-severity-p1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: ID & Title & Service */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-mono font-bold ${SEVERITY_COLORS[incident.severity]}`}>
                        [{incident.severity}]
                      </span>
                      <span className="text-xs font-mono text-text-tertiary">
                        {formatIncidentNumber(incident.incidentNumber)}
                      </span>
                      <h3 className="text-xs font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                        {incident.title}
                      </h3>
                    </div>

                    {/* Right: Status Pill & Time */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {totalSteps > 0 && (
                        <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-text-tertiary bg-bg-tertiary/60 px-2 py-0.5 rounded border border-border-subtle">
                          <BookOpen className="w-3 h-3 text-accent-primary" />
                          <span>
                            {completedSteps}/{totalSteps} SOP
                          </span>
                        </div>
                      )}

                      <span className={`status-badge text-[10px] border ${statusStyle}`}>
                        {STATUS_LABELS[incident.status] || incident.status}
                      </span>

                      <span className="text-[11px] font-mono text-text-tertiary hidden md:inline">
                        {formatRelativeTime(incident.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Subline: Commander & Description preview */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-text-tertiary">CMD:</span>
                      <span className="text-text-primary">
                        {incident.commander?.name || 'Unassigned'}
                      </span>
                      {incident.responders?.length > 0 && (
                        <span className="text-text-tertiary">
                          +{incident.responders.length} on-call
                        </span>
                      )}
                    </div>

                    {/* SLA live countdown timer */}
                    <LiveSLACountdown incident={incident} compact={true} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(newInc) => {
          navigate(`/incidents/${newInc._id}`);
        }}
        teamMembers={teamMembers}
      />
    </div>
  );
};

export default DashboardPage;
