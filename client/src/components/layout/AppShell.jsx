import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Clock3, Command, FileText, Flame, LogOut, Radio, ShieldCheck, Users, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChaosSimulatorDrawer from './ChaosSimulatorDrawer';
import CommandPalette from './CommandPalette';
import EvaluatorSandboxDock from './EvaluatorSandboxDock';

const sections = [
  { title: 'Operations', items: [{ to: '/dashboard', label: 'Mission Control', icon: Activity }] },
  { title: 'Intelligence', items: [{ to: '/analytics', label: 'Analytics', icon: Zap }, { to: '/postmortems', label: 'Postmortems', icon: FileText }] },
  { title: 'Workspace', items: [{ to: '/team', label: 'People & access', icon: Users }] },
];

export const AppShell = () => {
  const { user, organization, logout } = useAuth(); const { connected } = useSocket(); const navigate = useNavigate();
  const [utcTime, setUtcTime] = useState(''); const [chaosOpen, setChaosOpen] = useState(false); const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => { const tick = () => setUtcTime(new Date().toISOString().slice(11, 19)); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { const onKeyDown = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(open => !open); } }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  const roleTone = user?.role === 'ADMIN' ? 'text-[#D9C1A1]' : user?.role === 'VIEWER' ? 'text-text-tertiary' : 'text-text-secondary';
  return <div className="app-shell min-h-screen bg-[#070709] font-sans text-text-primary">
    <header className="app-topbar sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] px-5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-6"><button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-3 rounded-lg text-left"><span className="grid h-8 w-8 place-items-center rounded-xl border border-[#C8A97E]/20 bg-[#C8A97E]/[0.08] text-[#D9C1A1]"><Activity className="h-4 w-4"/></span><span><span className="block text-sm font-semibold tracking-tight text-white">Pulse</span><span className="block text-[10px] text-text-tertiary">Incident operations</span></span></button>
        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-mono sm:flex ${connected ? 'border-[#91B5A1]/15 bg-[#91B5A1]/[0.04] text-[#A9C8B7]' : 'border-[#C8A97E]/20 bg-[#C8A97E]/[0.04] text-[#D9C1A1]'}`}><Radio className={`h-3 w-3 ${connected ? 'animate-pulse' : ''}`}/>{connected ? 'LIVE CONNECTION' : 'SANDBOX SIMULATOR'}</div>
      </div>
      <div className="flex items-center gap-2 md:gap-3"><div className="hidden items-center gap-2 border-r border-white/[0.08] px-3 font-mono text-[11px] text-text-tertiary lg:flex"><Clock3 className="h-3.5 w-3.5"/>{utcTime} UTC</div><button onClick={() => setPaletteOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-text-secondary transition hover:border-white/[0.14] hover:text-white sm:flex"><Command className="h-3.5 w-3.5"/>Search<span className="rounded border border-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-text-tertiary">⌘ K</span></button><button onClick={() => setChaosOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#C8A97E]/20 bg-[#C8A97E]/[0.07] px-3 py-2 text-xs font-medium text-[#D9C1A1] transition hover:bg-[#C8A97E]/[0.13]"><Flame className="h-3.5 w-3.5"/><span className="hidden sm:inline">Simulate</span></button>
        <div className="ml-1 flex items-center gap-2 border-l border-white/[0.08] pl-3"><div className="hidden text-right md:block"><div className="text-xs font-medium text-white">{user?.name || 'Operator'}</div><div className={`mt-0.5 text-[9px] font-mono ${roleTone}`}>{(user?.role || 'VIEWER').replace('_', ' ')}</div></div><div className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.1] bg-white/[0.05] text-xs font-semibold text-[#D9C1A1]">{user?.name?.[0] || 'P'}</div><button onClick={logout} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-text-tertiary transition hover:bg-white/[0.05] hover:text-white"><LogOut className="h-4 w-4"/></button></div>
      </div>
    </header>
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="app-sidebar hidden w-[232px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-[#070709] px-4 py-6 md:flex"><div><div className="mb-8 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"><div className="min-w-0"><div className="truncate text-xs font-medium text-white">{organization?.name || 'Pulse Workspace'}</div><div className="mt-1 text-[10px] text-text-tertiary">Production environment</div></div><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary"/></div>
        <nav className="space-y-7" aria-label="Primary navigation">{sections.map(section => <div key={section.title}><div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-text-tertiary">{section.title}</div><div className="space-y-1">{section.items.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={!item.match} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all ${isActive ? 'border border-white/[0.07] bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04)]' : 'border border-transparent text-text-secondary hover:bg-white/[0.035] hover:text-white'}`}><Icon className="h-4 w-4 text-text-tertiary transition group-hover:text-text-secondary"/>{item.label}</NavLink>; })}</div></div>)}</nav>
      </div><div className="border-t border-white/[0.06] pt-4"><div className="flex items-center gap-2 px-2 text-[10px] text-text-tertiary"><ShieldCheck className="h-3.5 w-3.5 text-[#91B5A1]"/>SLA monitoring active</div><div className="mt-3 truncate px-2 text-[10px] text-text-tertiary">{organization?.name || 'Pulse'}</div></div></aside>
      <main className="min-w-0 flex-1 overflow-y-auto"><Outlet/></main>
    </div>
    <ChaosSimulatorDrawer isOpen={chaosOpen} onClose={() => setChaosOpen(false)}/><CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenChaos={() => setChaosOpen(true)}/><EvaluatorSandboxDock/>
  </div>;
};
export default AppShell;
