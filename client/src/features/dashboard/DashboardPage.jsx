import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Sparkles,
  Check,
  CheckCheck,
  Lock,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatIncidentNumber, formatRelativeTime } from '../../lib/formatters';
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_COLORS } from '../../lib/stateMachine';
import CreateIncidentModal from '../incidents/CreateIncidentModal';
import LiveSLACountdown from '../../components/ui/LiveSLACountdown';
import InfrastructureTopologyMap from '../../components/dashboard/InfrastructureTopologyMap';
import MissionBriefingTour from '../../components/dashboard/MissionBriefingTour';
import SentinelRadarWidget from '../../components/dashboard/SentinelRadarWidget';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    refetchInterval: 8000,
  });

  // Fetch aggregated operational analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data;
    },
    refetchInterval: 12000,
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

  // Inline Quick Acknowledge Action
  const handleInlineAcknowledge = async (e, incident) => {
    e.stopPropagation();
    setAcknowledgingId(incident._id);
    try {
      const res = await apiClient.post(`/incidents/${incident._id}/transition`, {
        targetStatus: 'ACKNOWLEDGED',
        expectedVersion: incident.version,
      });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        toast.success(`INC-${String(incident.incidentNumber).padStart(5, '0')} Acknowledged! SLA Clock Stopped.`, {
          icon: '⚡',
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge incident');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── DEFCON WARNING BANNER (ACTIVATES WHEN P1 IS ACTIVE) ── */}
      {hasCriticalActive && (
        <div className="bg-severity-p1/5 border border-severity-p1/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-[0_8px_30px_rgba(244,63,94,0.12)]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-severity-p1 animate-ping flex-shrink-0" />
            <div>
              <div className="text-xs font-mono font-bold text-severity-p1 tracking-wide uppercase flex items-center gap-2">
                <span>Critical P1 Incident in Progress</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Active P1 incidents require immediate triage. Automated 5s SLA Sentinel actively monitoring for breach.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedSeverity('P1')}
            className="btn-ivory px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 flex-shrink-0"
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
            <span className="text-[10px] font-mono tracking-wider text-text-tertiary uppercase">
              Ops Console Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary mt-0.5">
            Incident Operations Center
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time distributed systems health, live triage queue, and automated SLA enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBriefingOpen((prev) => !prev)}
            className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
            <span>{briefingOpen ? 'Hide Guide' : 'Mission Guide'}</span>
          </button>

          {user?.role !== 'VIEWER' ? (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn-ivory px-3.5 py-2 rounded-xl text-xs flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Declare Incident</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-border-subtle text-text-tertiary text-xs font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-Only Observer</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MISSION BRIEFING TOUR (HOW PULSE WORKS) ── */}
      <MissionBriefingTour isOpen={briefingOpen} onClose={() => setBriefingOpen(false)} />

      {/* ── BENTO GRID ROW 1: LIVE TOPOLOGY MESH + SLA SENTINEL RADAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Cell 1: Live Infrastructure Topology Map (8 Cols) */}
        <div className="lg:col-span-8">
          <InfrastructureTopologyMap incidents={incidents} />
        </div>

        {/* Bento Cell 2: Sentinel Radar & System Telemetry (4 Cols) */}
        <div className="lg:col-span-4 flex">
          <SentinelRadarWidget metrics={metrics} />
        </div>
      </div>

      {/* ── BENTO GRID ROW 2: ACTIVE TRIAGE COMMAND QUEUE (FULL WIDTH SPLIT) ── */}
      <div className="p-5 sm:p-6 rounded-2xl titanium-surface relative">
        {/* Bento Queue Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
              Active Incident Stream
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-bold">
              {incidents.length} IN STREAM
            </span>
          </div>

          <div className="text-[11px] font-mono text-text-tertiary">
            STATE ENGINE: <span className="text-text-primary font-semibold">FINITE STATE MACHINE (OCC PROTECTED)</span>
          </div>
        </div>

        {/* Workspace Split: Filters (Left) + Queue (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Filter Column */}
          <div className="p-3.5 rounded-lg bg-[#1C1C1F]/50 border border-[#2A2A2E] space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-text-tertiary uppercase pb-2 border-b border-[#2A2A2E]">
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
                placeholder="Search title, ID, or node..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#141416] border border-[#3A3A3F] focus:border-accent-primary rounded px-2.5 py-1.5 pl-8 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
              />
            </div>

            {/* Status Tabs */}
            <div>
              <label className="text-[10px] font-mono text-text-tertiary uppercase block mb-1.5">
                Lifecycle Phase
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
                        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-bold'
                        : 'text-text-secondary hover:bg-[#232326]'
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
                        : 'bg-[#141416] border border-[#2A2A2E] text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned to Me Toggle */}
            <div className="pt-2 border-t border-[#2A2A2E]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-text-secondary hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                  className="rounded border-[#3A3A3F] bg-[#141416] text-accent-primary focus:ring-0"
                />
                <span>Assigned to Me</span>
              </label>
            </div>
          </div>

          {/* Right Incident Rows Column */}
          <div className="lg:col-span-3 space-y-3">
            {loadingIncidents ? (
              // Skeleton Rows
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded border border-[#2A2A2E] bg-[#1C1C1F]/40 skeleton" />
                ))}
              </div>
            ) : incidentError ? (
              <div className="p-8 rounded border border-severity-p1/30 bg-severity-p1/10 text-center font-mono text-xs text-severity-p1">
                Failed to load incident streams. Please check API server connection.
              </div>
            ) : incidents.length === 0 ? (
              // Tactical Empty State
              <div className="p-12 rounded-lg border border-[#2A2A2E] bg-[#1C1C1F]/30 text-center space-y-3">
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
                    className="px-3 py-1.5 rounded border border-[#3A3A3F] text-xs font-mono text-text-secondary hover:text-text-primary"
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
              // Tactical Incident Telemetry Modules
              incidents.map((incident) => {
                const statusStyle = STATUS_COLORS[incident.status] || 'text-text-secondary bg-bg-tertiary';
                const isP1 = incident.severity === 'P1';
                const isFiredOrEscalated = ['FIRED', 'ESCALATED'].includes(incident.status);
                const completedSteps = incident.runbookProgress?.filter((p) => p.status === 'COMPLETED').length || 0;
                const totalSteps = incident.runbookProgress?.length || 0;
                const isAcknowledging = acknowledgingId === incident._id;

                // Guess service from title
                const titleLower = incident.title.toLowerCase();
                let svcTag = 'CORE_SERVICE';
                if (titleLower.includes('gateway') || titleLower.includes('5xx') || titleLower.includes('api')) svcTag = 'API_GATEWAY';
                else if (titleLower.includes('db') || titleLower.includes('postgres') || titleLower.includes('pool')) svcTag = 'POSTGRES_DB';
                else if (titleLower.includes('stripe') || titleLower.includes('payment')) svcTag = 'PAYMENT_ENGINE';
                else if (titleLower.includes('kubernetes') || titleLower.includes('k8s') || titleLower.includes('kafka')) svcTag = 'K8S_CLUSTER';
                else if (titleLower.includes('auth') || titleLower.includes('token')) svcTag = 'AUTH_CLUSTER';

                return (
                  <div
                    key={incident._id}
                    onClick={() => navigate(`/incidents/${incident._id}`)}
                    className={`group p-4 rounded-xl transition-all duration-200 cursor-pointer relative ${
                      isP1 && isFiredOrEscalated
                        ? 'bg-severity-p1/[0.06] border border-severity-p1/40 hover:border-severity-p1/70 shadow-[0_4px_24px_rgba(244,63,94,0.15)]'
                        : 'titanium-surface-interactive'
                    }`}
                  >
                    {/* Top Row: Severity + Incident Number + Service Tag + Title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        <span className={`text-xs font-mono font-bold ${SEVERITY_COLORS[incident.severity]}`}>
                          [{incident.severity}]
                        </span>
                        <span className="text-xs font-mono text-text-tertiary">
                          {formatIncidentNumber(incident.incidentNumber)}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#232326] border border-[#3A3A3F] text-accent-primary font-semibold">
                          {svcTag}
                        </span>
                        <h3 className="text-xs font-bold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                          {incident.title}
                        </h3>
                      </div>

                      {/* Right Status Pill & Relative Time */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`status-badge text-[10px] border ${statusStyle}`}>
                          {STATUS_LABELS[incident.status] || incident.status}
                        </span>
                        <span className="text-[11px] font-mono text-text-tertiary hidden sm:inline">
                          {formatRelativeTime(incident.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Middle Telemetry Row: Runbook meter & Commander & Live SLA */}
                    <div className="mt-3 pt-2.5 border-t border-[#2A2A2E] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Commander badge */}
                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                          <span className="text-text-tertiary">CMD:</span>
                          <span className="text-text-primary font-semibold">
                            {incident.commander?.name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Runbook completion meter */}
                        {totalSteps > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary bg-[#141416] px-2 py-0.5 rounded border border-[#2A2A2E]">
                            <BookOpen className="w-3 h-3 text-accent-primary" />
                            <span>
                              SOP: {completedSteps}/{totalSteps} Steps
                            </span>
                            <span className="text-accent-success font-bold">
                              ({Math.round((completedSteps / totalSteps) * 100)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* SLA Live Countdown Bar */}
                      <div className="flex items-center gap-3">
                        <LiveSLACountdown incident={incident} compact={true} />
                      </div>
                    </div>

                    {/* Bottom Action Row: Inline 1-Click Quick Actions */}
                    <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-end gap-2.5">
                      {/* Inline 1-Click Acknowledge button (RBAC Gated: Non-Viewers only) */}
                      {isFiredOrEscalated && user?.role !== 'VIEWER' && (
                        <button
                          type="button"
                          onClick={(e) => handleInlineAcknowledge(e, incident)}
                          disabled={isAcknowledging}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-severity-p2 hover:bg-severity-p2/90 text-bg-primary transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.25)] disabled:opacity-50"
                        >
                          {isAcknowledging ? (
                            <span>Stopping SLA...</span>
                          ) : (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Acknowledge (Stop SLA)</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Open War Room */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${incident._id}`);
                        }}
                        className="btn-ghost px-3 py-1.5 text-xs font-medium rounded-lg text-text-primary flex items-center gap-1.5"
                      >
                        <span>War Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
