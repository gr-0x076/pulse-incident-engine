import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowRight, CheckCheck, Clock3, Flame, Plus, Search, ShieldCheck, Siren } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatIncidentNumber } from '../../lib/formatters';
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/stateMachine';
import LiveSLACountdown from '../../components/ui/LiveSLACountdown';
import InfrastructureTopologyMap from '../../components/dashboard/InfrastructureTopologyMap';
import CreateIncidentModal from '../incidents/CreateIncidentModal';
import toast from 'react-hot-toast';

const Sparkline = ({ values, color = '#C8A97E' }) => {
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const path = values.map((value, index) => `${(index / (values.length - 1)) * 100},${25 - ((value - min) / range) * 19}`).join(' ');
  return <svg aria-hidden="true" viewBox="0 0 100 28" className="h-8 w-24 overflow-visible"><polyline points={path} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

const liveStatuses = ['FIRED', 'ESCALATED'];

export const DashboardPage = () => {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const { user } = useAuth();
  const [status, setStatus] = useState('ACTIVE'); const [severity, setSeverity] = useState(''); const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false); const [createOpen, setCreateOpen] = useState(false); const [acking, setAcking] = useState(null);
  const { data: incidentData, isLoading, error } = useQuery({
    queryKey: ['incidents', { status, severity, search, mine }],
    queryFn: async () => { const p = new URLSearchParams(); if (status) p.set('status', status); if (severity) p.set('severity', severity); if (search) p.set('search', search); if (mine) p.set('assignedToMe', 'true'); return apiClient.get(`/incidents?${p}`); },
    refetchInterval: 8000,
  });
  const { data: metrics = {} } = useQuery({ queryKey: ['analytics'], queryFn: async () => (await apiClient.get('/analytics/overview')).data, refetchInterval: 12000 });
  const incidents = Array.isArray(incidentData?.data) ? incidentData.data : (Array.isArray(incidentData) ? incidentData : []);
  const activeCount = incidents.filter(i => ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'].includes(i.status)).length;
  const services = useMemo(() => [
    ['API Gateway', '24 ms', ['gateway', 'api', '5xx']], ['Auth Cluster', '1.2k req/s', ['auth', 'token']],
    ['Payment Engine', '99.98% ok', ['payment', 'stripe']], ['Postgres Primary', '18% pool', ['db', 'postgres']], ['K8s Workers', '0 restarts', ['k8s', 'kubernetes', 'kafka']],
  ].map(([name, value, terms]) => ({ name, value, healthy: !incidents.some(i => terms.some(t => i.title.toLowerCase().includes(t)) && liveStatuses.includes(i.status)) })), [incidents]);

  const acknowledge = async (event, incident) => {
    event.stopPropagation(); setAcking(incident._id);
    try { const result = await apiClient.post(`/incidents/${incident._id}/transition`, { targetStatus: 'ACKNOWLEDGED', expectedVersion: incident.version });
      if (result.success) { queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['analytics'] }); toast.success(`${formatIncidentNumber(incident.incidentNumber)} acknowledged`); }
    } catch (err) { toast.error(err.message || 'Could not acknowledge incident'); } finally { setAcking(null); }
  };

  const kpis = [
    { label: 'Mean time to acknowledge', value: `${metrics.summary?.mttaSeconds ?? 14}s`, note: 'Median response', icon: Clock3, spark: [24, 20, 22, 17, 18, 13, 11], color: '#C8A97E' },
    { label: 'Mean time to restore', value: `${metrics.summary?.mttrMinutes ?? 22}m`, note: 'Rolling period', icon: Activity, spark: [32, 28, 30, 25, 24, 22, 20], color: '#AAB3C2' },
    { label: 'SLA compliance', value: `${metrics.summary?.slaComplianceRate ?? 98.5}%`, note: 'Target ≥ 98%', icon: ShieldCheck, spark: [96, 97, 96.5, 98, 97.7, 98.4, 99], color: '#91B5A1' },
    { label: 'Active incidents', value: activeCount, note: `${incidents.length} visible in queue`, icon: Flame, spark: [2, 4, 3, 5, 3, 4, Math.max(activeCount, 1)], color: '#D9B68A' },
  ];

  return <main className="mission-control mx-auto max-w-[1480px] space-y-8 p-6 md:p-10">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.07] pb-7">
      <div><div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[.18em] text-text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-[#91B5A1]"/>Operations / Live</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Mission Control</h1><p className="mt-2 max-w-2xl font-serif text-lg italic text-text-secondary">A clear view of service health, response velocity, and what needs attention.</p></div>
      {user?.role === 'VIEWER' ? <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-secondary">Observer access · read only</span> : <button onClick={() => setCreateOpen(true)} className="btn-ivory inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4"/>Declare incident</button>}
    </header>

    <section aria-label="Executive metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(({ label, value, note, icon: Icon, spark, color }) => <article key={label} className="dashboard-kpi linear-card group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111115] p-6">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"/><div className="flex items-center justify-between text-sm text-text-secondary"><span>{label}</span><Icon className="h-4 w-4 text-text-tertiary"/></div>
        <div className="mt-6 flex items-end justify-between gap-3"><div><div className="font-mono-data text-3xl font-medium tracking-tight text-white md:text-4xl">{value}</div><p className="mt-2 text-xs text-text-tertiary">{note}</p></div><Sparkline values={spark} color={color}/></div>
      </article>)}
    </section>

    <section aria-label="Service status" className="rounded-2xl border border-white/[0.08] bg-[#111115] p-5 md:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Service topology</h2><p className="mt-1 text-xs text-text-tertiary">Core production dependencies</p></div><span className="inline-flex items-center gap-2 text-xs text-text-secondary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#91B5A1]"/>Live</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{services.map(service => <div key={service.name} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"><div><div className="text-xs font-medium text-white">{service.name}</div><div className="mt-1 font-mono text-[10px] text-text-tertiary">{service.value}</div></div><span className={`h-2 w-2 shrink-0 rounded-full ${service.healthy ? 'bg-[#91B5A1] shadow-[0_0_10px_rgba(145,181,161,.45)]' : 'animate-pulse bg-[#D9B68A] shadow-[0_0_10px_rgba(217,182,138,.45)]'}`} title={service.healthy ? 'Healthy' : 'Incident detected'}/></div>)}</div>
    </section>

    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12"><section className="2xl:col-span-8"><InfrastructureTopologyMap incidents={incidents}/></section><section className="2xl:col-span-4"><div className="linear-card h-full rounded-2xl p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Response pulse</h2><p className="mt-1 text-xs text-text-tertiary">Current operational posture</p></div><Siren className="h-4 w-4 text-[#C8A97E]"/></div><div className="space-y-4">{[['MTTA', kpis[0].value], ['MTTR', kpis[1].value], ['SLA adherence', kpis[2].value]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-white/[0.06] pb-4 last:border-0 last:pb-0"><span className="text-sm text-text-secondary">{label}</span><span className="font-mono text-sm tabular-nums text-white">{value}</span></div>)}</div><div className="mt-6 rounded-xl border border-[#C8A97E]/15 bg-[#C8A97E]/[0.05] p-4"><div className="text-xs font-medium text-[#D9C1A1]">Triage focus</div><p className="mt-1 text-xs leading-relaxed text-text-secondary">{activeCount ? `${activeCount} active ${activeCount === 1 ? 'incident needs' : 'incidents need'} attention. Start with the highest severity in the live queue.` : 'No active incidents. Production is currently within its normal operating posture.'}</p></div></div></section></div>

    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111115]"><div className="flex flex-col gap-4 border-b border-white/[0.06] p-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-3"><h2 className="text-lg font-semibold tracking-tight text-white">Incident feed</h2><span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-text-secondary">{incidents.length} records</span></div><p className="mt-1 text-xs text-text-tertiary">Prioritized response queue · refreshes automatically</p></div><div className="flex flex-wrap items-center gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents" className="w-48 rounded-xl border border-white/[0.08] bg-[#09090B] py-2 pl-9 pr-3 text-xs text-white outline-none transition focus:border-white/20"/></label><select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#09090B] px-3 py-2 text-xs text-text-secondary"><option value="ACTIVE">Active</option><option value="">All statuses</option><option value="FIRED">Fired</option><option value="INVESTIGATING">Investigating</option><option value="MITIGATED">Mitigated</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><select value={severity} onChange={e => setSeverity(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#09090B] px-3 py-2 text-xs text-text-secondary"><option value="">All severities</option>{['P1','P2','P3','P4'].map(s => <option key={s}>{s}</option>)}</select><label className="flex items-center gap-2 px-2 text-xs text-text-secondary"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} className="accent-[#C8A97E]"/>Mine</label></div></div>
      {error ? <div className="p-12 text-center text-sm text-[#D9B68A]">Incident feed unavailable. Check the service connection and refresh.</div> : isLoading ? <div className="space-y-2 p-6">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div> : incidents.length === 0 ? <div className="p-14 text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"><ShieldCheck className="h-5 w-5 text-[#91B5A1]"/></div><h3 className="text-sm font-medium text-white">Nothing needs attention</h3><p className="mt-1 text-xs text-text-tertiary">No incidents match your current filters.</p></div> : <div className="divide-y divide-white/[0.05]">{incidents.map(incident => { const active = liveStatuses.includes(incident.status); const severityColor = incident.severity === 'P1' ? '#D9B68A' : incident.severity === 'P2' ? '#C8A97E' : incident.severity === 'P3' ? '#AAB3C2' : '#737985'; return <article key={incident._id} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(`/incidents/${incident._id}`)} onClick={() => navigate(`/incidents/${incident._id}`)} className="incident-row group flex cursor-pointer flex-col gap-4 p-5 transition duration-200 hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between md:px-6"><div className="flex min-w-0 items-center gap-4"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: severityColor, boxShadow: `0 0 10px ${severityColor}55` }}/><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] text-text-tertiary">{formatIncidentNumber(incident.incidentNumber)}</span><span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-text-tertiary">{incident.severity}</span><span className={`status-badge border text-[10px] ${STATUS_COLORS[incident.status]}`}>{STATUS_LABELS[incident.status] || incident.status}</span></div><h3 className="truncate text-sm font-medium text-white transition group-hover:text-white">{incident.title}</h3><p className="mt-1 text-xs text-text-tertiary">Commander · {incident.commander?.name || 'Unassigned'}{incident.runbookProgress?.length ? ` · Runbook ${incident.runbookProgress.filter(s => s.status === 'COMPLETED').length}/${incident.runbookProgress.length}` : ''}</p></div></div><div className="flex flex-wrap items-center gap-4 pl-6 md:pl-0"><LiveSLACountdown incident={incident} compact/><button onClick={e => { e.stopPropagation(); navigate(`/incidents/${incident._id}`); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition group-hover:text-white">View War Room <ArrowRight className="h-3.5 w-3.5"/></button>{active && user?.role !== 'VIEWER' && <button onClick={e => acknowledge(e, incident)} disabled={acking === incident._id} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C8A97E]/20 bg-[#C8A97E]/[0.07] px-3 py-2 text-xs text-[#D9C1A1] transition hover:bg-[#C8A97E]/[0.14] disabled:opacity-50"><CheckCheck className="h-3.5 w-3.5"/>{acking === incident._id ? 'Acknowledging' : 'Acknowledge'}</button>}</div></article>; })}</div>}
    </section>
    <CreateIncidentModal isOpen={createOpen} onClose={() => setCreateOpen(false)}/>
  </main>;
};
export default DashboardPage;
