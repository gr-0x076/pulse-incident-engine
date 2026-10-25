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

// Miniature SVG Sparkline for Executive KPI Cards
const Sparkline = ({ points, color = '#C8A97E', gradientId }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 100;
  const height = 28;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-24 h-7 overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const DashboardPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
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

  // Executive Metrics
  const activeCount = incidents.filter((inc) =>
    ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'].includes(inc.status)
  ).length;
  const mttaValue = metrics?.summary?.mttaSeconds !== undefined
    ? `${metrics.summary.mttaSeconds}s`
    : metrics?.mtta !== undefined
    ? `${metrics.mtta}s`
    : '14s';
  const mttrValue = metrics?.summary?.mttrMinutes !== undefined
    ? `${metrics.summary.mttrMinutes}m`
    : metrics?.mttr !== undefined
    ? `${metrics.mttr}m`
    : '22m';
  const slaValue = metrics?.summary?.slaComplianceRate !== undefined
    ? `${metrics.summary.slaComplianceRate}%`
    : metrics?.slaComplianceRate !== undefined
    ? `${metrics.slaComplianceRate}%`
    : '98.5%';

  // Service health status mapping
  const serviceStatuses = [
    { name: 'API Gateway', metric: '24ms latency', ok: !incidents.some(i => i.title.toLowerCase().includes('gateway') && ['FIRED', 'ESCALATED'].includes(i.status)) },
    { name: 'Auth Cluster', metric: '1.2k req/s', ok: !incidents.some(i => i.title.toLowerCase().includes('auth') && ['FIRED', 'ESCALATED'].includes(i.status)) },
    { name: 'Payment Engine', metric: '99.98% ok', ok: !incidents.some(i => (i.title.toLowerCase().includes('payment') || i.title.toLowerCase().includes('stripe')) && ['FIRED', 'ESCALATED'].includes(i.status)) },
    { name: 'Postgres Primary', metric: '18% pool', ok: !incidents.some(i => (i.title.toLowerCase().includes('db') || i.title.toLowerCase().includes('postgres')) && ['FIRED', 'ESCALATED'].includes(i.status)) },
    { name: 'K8s Workers', metric: '0 restarts', ok: !incidents.some(i => (i.title.toLowerCase().includes('k8s') || i.title.toLowerCase().includes('kafka')) && ['FIRED', 'ESCALATED'].includes(i.status)) },
  ];

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
    <div className="p-4 md:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto font-sans">
      {/* ── TOP ACTION HEADER & EDITORIAL SUBHEAD ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-wider text-text-tertiary uppercase">
              Operational Telemetry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
            Operations <span className="font-serif italic font-normal text-accent-primary ml-1.5">Console</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-xl">
            Distributed system triage, automated runbook execution, and autonomous SLA governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBriefingOpen((prev) => !prev)}
            className="btn-ghost px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
            <span>{briefingOpen ? 'Hide Briefing' : 'Mission Briefing'}</span>
          </button>

          {user?.role !== 'VIEWER' ? (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn-ivory px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Declare Incident</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-border-subtle text-text-tertiary text-xs font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>Observer Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 EXECUTIVE KPI CARDS (LINEAR / STRIPE GRADE) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTTA */}
        <div className="linear-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#C8A97E]/30 to-transparent group-hover:via-[#C8A97E]/60 transition-all duration-300" />
          <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
            <span>MTTA (Acknowledge)</span>
            <Clock className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-3xl font-light text-text-primary tracking-tight font-mono-data">
                {mttaValue}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1 font-mono flex items-center gap-1.5">
                <span className="text-accent-success">Nominal</span>
                <span>• 5s Sentinel</span>
              </div>
            </div>
            <Sparkline points={[28, 24, 20, 22, 18, 15, 12]} color="#C8A97E" gradientId="mttaGrad" />
          </div>
        </div>

        {/* MTTR */}
        <div className="linear-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-300" />
          <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
            <span>MTTR (Resolve)</span>
            <Activity className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-3xl font-light text-text-primary tracking-tight font-mono-data">
                {mttrValue}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1 font-mono flex items-center gap-1.5">
                <span className="text-accent-primary">Automated SOP</span>
                <span>• Median</span>
              </div>
            </div>
            <Sparkline points={[35, 30, 28, 32, 26, 24, 22]} color="#E5C185" gradientId="mttrGrad" />
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="linear-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#6EE7B7]/25 to-transparent group-hover:via-[#6EE7B7]/50 transition-all duration-300" />
          <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
            <span>SLA Compliance</span>
            <Shield className="w-3.5 h-3.5 text-accent-success" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-3xl font-light text-[#E5C185] tracking-tight font-mono-data">
                {slaValue}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1 font-mono flex items-center gap-1.5">
                <span className="text-accent-success">Target &gt;98%</span>
                <span>• Strict OCC</span>
              </div>
            </div>
            <Sparkline points={[96, 97, 98, 97.5, 98.2, 98.8, 99.1]} color="#6EE7B7" gradientId="slaGrad" />
          </div>
        </div>

        {/* Active Stream */}
        <div className="linear-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#E5C185]/25 to-transparent group-hover:via-[#E5C185]/50 transition-all duration-300" />
          <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
            <span>Active Stream</span>
            <Flame className="w-3.5 h-3.5 text-severity-p1" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-3xl font-light text-text-primary tracking-tight font-mono-data">
                {activeCount}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1 font-mono flex items-center gap-1.5">
                <span>{incidents.length} in stream</span>
                <span>• Real-time</span>
              </div>
            </div>
            <Sparkline points={[3, 4, 2, 5, 3, 2, activeCount || 1]} color="#94A3B8" gradientId="streamGrad" />
          </div>
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

      {/* ── BENTO GRID ROW 2: ACTIVE TRIAGE COMMAND QUEUE (LINEAR ATELIER) ── */}
      <div className="linear-card p-5 sm:p-6 relative">
        {/* Stream Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border-subtle/60">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">
              Active Incident Stream
            </h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-medium">
              {incidents.length} in stream
            </span>
          </div>

          <div className="text-xs font-serif italic text-text-tertiary">
            Real-time finite state engine protected by OCC
          </div>
        </div>

        {/* Workspace Split: Filters (Left) + Linear-Style Issue Stream (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Filter Column */}
          <div className="p-4 rounded-xl bg-bg-secondary/70 border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-text-tertiary uppercase pb-2 border-b border-white/[0.05]">
              <span className="flex items-center gap-1.5 font-sans font-medium text-text-secondary normal-case">
                <Filter className="w-3.5 h-3.5 text-accent-primary" />
                <span>Filter Queue</span>
              </span>
              {(selectedStatus !== 'ACTIVE' || selectedSeverity || search || assignedToMe) && (
                <button
                  onClick={() => {
                    setSelectedStatus('ACTIVE');
                    setSelectedSeverity('');
                    setSearch('');
                    setAssignedToMe(false);
                  }}
                  className="text-accent-primary hover:underline lowercase text-[11px]"
                >
                  reset
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-tertiary absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search title, ID, node..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#141418] border border-white/[0.08] focus:border-accent-primary rounded-xl px-2.5 py-2 pl-8 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none transition-colors"
              />
            </div>

            {/* Lifecycle Phase Tabs */}
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
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                      selectedStatus === s.id
                        ? 'bg-accent-primary/15 text-accent-primary font-medium border border-accent-primary/30'
                        : 'text-text-secondary hover:bg-white/[0.04]'
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
                    className={`px-2 py-1.5 rounded-lg text-center text-xs font-mono transition-colors ${
                      selectedSeverity === sev.id
                        ? 'bg-white text-bg-primary font-bold'
                        : 'bg-[#141418] border border-white/[0.06] text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned to Me Toggle */}
            <div className="pt-2 border-t border-white/[0.05]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-text-secondary hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                  className="rounded border-border-default bg-[#141418] text-accent-primary focus:ring-0"
                />
                <span>Assigned to Me</span>
              </label>
            </div>
          </div>

          {/* Right Linear-Style Incident Rows Column */}
          <div className="lg:col-span-3 space-y-2.5">
            {loadingIncidents ? (
              // Skeleton Rows
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-xl border border-white/[0.04] bg-bg-secondary/40 skeleton" />
                ))}
              </div>
            ) : incidentError ? (
              <div className="p-8 rounded-xl border border-severity-p1/30 bg-severity-p1/10 text-center font-mono text-xs text-severity-p1">
                Failed to load incident streams. Please check API server connection.
              </div>
            ) : incidents.length === 0 ? (
              // Clean Empty State
              <div className="p-12 rounded-2xl border border-white/[0.06] bg-bg-secondary/40 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-accent-success mx-auto" />
                <div className="text-sm font-semibold text-text-primary">
                  All Systems Nominal — Zero Matching Incidents
                </div>
                <p className="text-xs text-text-secondary max-w-sm mx-auto font-sans leading-relaxed">
                  No active operational incidents matching your filters. You can declare a new incident or simulate an external alert.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedStatus('');
                      setSelectedSeverity('');
                      setSearch('');
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="btn-ivory px-3.5 py-1.5 rounded-xl text-xs font-medium"
                  >
                    Declare Incident
                  </button>
                </div>
              </div>
            ) : (
              // Linear-Style Issue Stream Rows
              incidents.map((incident) => {
                const statusStyle = STATUS_COLORS[incident.status] || 'text-text-secondary bg-bg-tertiary';
                const isP1 = incident.severity === 'P1';
                const isFiredOrEscalated = ['FIRED', 'ESCALATED'].includes(incident.status);
                const completedSteps = incident.runbookProgress?.filter((p) => p.status === 'COMPLETED').length || 0;
                const totalSteps = incident.runbookProgress?.length || 0;
                const isAcknowledging = acknowledgingId === incident._id;

                // Guess service from title
                const titleLower = incident.title.toLowerCase();
                let svcTag = 'CORE';
                if (titleLower.includes('gateway') || titleLower.includes('5xx') || titleLower.includes('api')) svcTag = 'GATEWAY';
                else if (titleLower.includes('db') || titleLower.includes('postgres') || titleLower.includes('pool')) svcTag = 'POSTGRES';
                else if (titleLower.includes('stripe') || titleLower.includes('payment')) svcTag = 'PAYMENT';
                else if (titleLower.includes('kubernetes') || titleLower.includes('k8s') || titleLower.includes('kafka')) svcTag = 'K8S';
                else if (titleLower.includes('auth') || titleLower.includes('token')) svcTag = 'AUTH';

                // Severity dot color
                const severityDotColor =
                  incident.severity === 'P1'
                    ? 'bg-[#E5C185] shadow-[0_0_8px_rgba(229,193,133,0.5)]'
                    : incident.severity === 'P2'
                    ? 'bg-[#C8A97E]'
                    : incident.severity === 'P3'
                    ? 'bg-[#94A3B8]'
                    : 'bg-[#64748B]';

                return (
                  <div
                    key={incident._id}
                    onClick={() => navigate(`/incidents/${incident._id}`)}
                    className={`group p-4 sm:px-5 sm:py-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                      isP1 && isFiredOrEscalated
                        ? 'bg-[#E5C185]/[0.03] border-[#E5C185]/35 hover:border-[#E5C185]/60 hover:bg-[#E5C185]/[0.06]'
                        : 'bg-bg-secondary/70 border-white/[0.05] hover:border-white/[0.12] hover:bg-bg-tertiary/70'
                    }`}
                  >
                    {/* Left: Indicator + Incident ID + Service Tag + Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDotColor}`} />
                      <span className="text-xs font-mono text-text-tertiary tracking-tight flex-shrink-0 font-medium">
                        {formatIncidentNumber(incident.incidentNumber)}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] text-accent-primary border border-white/[0.05] flex-shrink-0 font-medium">
                        {svcTag}
                      </span>
                      <h3 className="text-xs font-medium text-text-primary group-hover:text-white transition-colors truncate">
                        {incident.title}
                      </h3>
                    </div>

                    {/* Right: Status Badge + Commander + SLA Countdown + View Action */}
                    <div className="flex items-center gap-3.5 flex-shrink-0 justify-between md:justify-end">
                      {/* Commander Avatar/Name */}
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
                        <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono flex items-center justify-center text-text-primary font-medium">
                          {incident.commander?.name?.[0] || 'U'}
                        </div>
                        <span className="text-[11px] text-text-tertiary font-medium">
                          {incident.commander?.name ? incident.commander.name.split(' ')[0] : 'Unassigned'}
                        </span>
                      </div>

                      {/* Runbook Progress Indicator */}
                      {totalSteps > 0 && (
                        <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-text-tertiary">
                          <BookOpen className="w-3 h-3 text-accent-primary" />
                          <span>{completedSteps}/{totalSteps}</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <span className={`status-badge text-[10px] border ${statusStyle}`}>
                        {STATUS_LABELS[incident.status] || incident.status}
                      </span>

                      {/* SLA Live Bar */}
                      <LiveSLACountdown incident={incident} compact={true} />

                      {/* Inline Acknowledge (Stop SLA) Button if unacknowledged */}
                      {isFiredOrEscalated && user?.role !== 'VIEWER' && (
                        <button
                          type="button"
                          onClick={(e) => handleInlineAcknowledge(e, incident)}
                          disabled={isAcknowledging}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#C8A97E]/15 hover:bg-[#C8A97E]/25 text-[#E5C185] border border-[#C8A97E]/30 transition-all flex items-center gap-1 disabled:opacity-50"
                        >
                          {isAcknowledging ? (
                            <span>Stopping...</span>
                          ) : (
                            <>
                              <CheckCheck className="w-3 h-3" />
                              <span>Ack</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Buttery-Smooth View Action Link */}
                      <span className="text-xs font-medium text-text-tertiary group-hover:text-text-primary flex items-center gap-1 transition-colors pl-1">
                        <span className="hidden sm:inline">View</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-accent-primary" />
                      </span>
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
