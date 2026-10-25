import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Flame,
  FileText,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Terminal,
  LogOut,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getRoleInsignia } from '../ui/TacticalInsignia';
import ChaosSimulatorDrawer from './ChaosSimulatorDrawer';
import CommandPalette from './CommandPalette';

export const AppShell = () => {
  const { user, organization, logout, switchDemoRole } = useAuth();
  const { connected } = useSocket();
  const [utcTime, setUtcTime] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [chaosOpen, setChaosOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();

  // Live ticking UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roles = [
    {
      role: 'ADMIN',
      name: 'Sarah Chen',
      badge: 'COMMANDER_IN_CHIEF',
      desc: 'Full administrative rights, org settings & squadron control.',
      permissions: ['✓ Full System & SLA Settings', '✓ Issue Team Invites & RBAC', '✓ Declare & Close Outages'],
      color: 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary',
    },
    {
      role: 'INCIDENT_COMMANDER',
      name: 'Alex Rivera',
      badge: 'INCIDENT_COMMANDER',
      desc: 'Can escalate P1s, reassign responders, mitigate, and close postmortems.',
      permissions: ['✓ Escalate P1/P2 Incidents', '✓ Assign Tactical Responders', '✓ Close Postmortem Reports'],
      color: 'border-severity-p1/40 bg-severity-p1/10 text-severity-p1',
    },
    {
      role: 'RESPONDER',
      name: 'Marcus Vance',
      badge: 'ON_CALL_SRE',
      desc: 'Executes interactive runbooks, acknowledges incidents, posts timeline notes.',
      permissions: ['✓ Acknowledge (Stops SLA)', '✓ Execute Runbook CLI Steps', '✓ Post Timeline Investigation'],
      color: 'border-severity-p2/40 bg-severity-p2/10 text-severity-p2',
    },
    {
      role: 'VIEWER',
      name: 'Elena Rostova',
      badge: 'AUDIT_OBSERVER',
      desc: 'Read-only observer for compliance audits, metrics & postmortem reviews.',
      permissions: ['✓ Telemetry & Recharts Access', '✗ State Mutation Locked', '✗ Runbook Checkboxes Locked'],
      color: 'border-border-default bg-bg-tertiary/40 text-text-secondary',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans selection:bg-accent-primary/20">
      {/* ── TOP TELEMETRY CHASSIS ── */}
      <header className="h-12 border-b border-border-subtle bg-[#141416] px-4 flex items-center justify-between z-40 sticky top-0 shadow-md">
        {/* Left: Brand & Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <span className="w-2.5 h-2.5 rounded-full bg-severity-p1 animate-pulse shadow-[0_0_8px_#FF453A]" />
            <span className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
              PULSE <span className="text-text-tertiary font-normal">// OPS_CONSOLE</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-tertiary/60 border border-border-subtle text-[11px] font-mono text-text-secondary">
            <Radio className={`w-3 h-3 ${connected ? 'text-accent-success animate-pulse' : 'text-severity-p1'}`} />
            <span>{connected ? 'WS_LIVE' : 'WS_DISCONNECTED'}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary">
            <Clock className="w-3 h-3" />
            <span>{utcTime}</span>
          </div>
        </div>

        {/* Right: Evaluator Role Switcher & Tactical Quick Controls */}
        <div className="flex items-center gap-2.5">
          {/* Cmd+K Quick Trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[#1C1C1F] hover:bg-bg-elevated border border-border-subtle text-text-tertiary hover:text-text-secondary text-xs font-mono transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cmd+K</span>
          </button>

          {/* Chaos Simulator Drawer Trigger */}
          <button
            onClick={() => setChaosOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-severity-p1/15 hover:bg-severity-p1/25 border border-severity-p1/40 text-severity-p1 text-xs font-mono font-semibold transition-all shadow-[0_0_10px_rgba(255,69,58,0.15)]"
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Simulate Outage</span>
          </button>

          {/* 1-Click Evaluator Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#1C1C1F] border border-[#3A3A3F] hover:border-text-secondary text-xs transition-all font-mono"
            >
              {getRoleInsignia(user?.role, "w-3.5 h-3.5")}
              <span className="text-accent-primary font-bold">[{user?.role}]</span>
              <span className="text-text-primary hidden md:inline">{user?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
            </button>

            {/* Click-outside backdrop */}
            {roleDropdownOpen && (
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setRoleDropdownOpen(false)}
              />
            )}

            {/* Opaque High-Contrast RBAC Tactical Dossier Dropdown */}
            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg popover-surface py-2 z-50 animate-slide-in font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3.5 py-2 border-b border-[#2A2A2E] flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-accent-primary font-bold">
                    // EVALUATOR RBAC SWITCHER & PERMISSION MATRIX
                  </span>
                  <span className="text-[9px] font-mono text-text-tertiary">1-CLICK DEMO</span>
                </div>

                <div className="p-2 space-y-1.5 max-h-[460px] overflow-y-auto">
                  {roles.map((r) => {
                    const isActive = user?.role === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          switchDemoRole(r.role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded border text-left transition-all ${
                          isActive
                            ? 'bg-accent-primary/15 border-accent-primary shadow-[0_0_12px_rgba(10,132,255,0.2)]'
                            : 'bg-[#1C1C1F]/60 border-[#2C2C30] hover:border-[#4A4A50] hover:bg-[#1C1C1F]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getRoleInsignia(r.role, "w-4 h-4")}
                            <span className="text-xs font-mono font-bold text-text-primary">
                              {r.role}
                            </span>
                            <span className="text-[11px] text-text-secondary">({r.name})</span>
                          </div>
                          {isActive && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-primary text-white">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-text-secondary mt-1 font-mono leading-tight">
                          {r.desc}
                        </p>

                        {/* RBAC Permission Matrix Preview */}
                        <div className="mt-2 pt-1.5 border-t border-[#2A2A2E] flex flex-wrap gap-1.5 text-[9px] font-mono">
                          {r.permissions.map((p, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded ${
                                p.startsWith('✓')
                                  ? 'bg-accent-success/10 text-accent-success border border-accent-success/20'
                                  : 'bg-severity-p1/10 text-severity-p1 border border-severity-p1/20'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-[#2A2A2E] mt-1 pt-1.5 px-2">
                  <button
                    onClick={logout}
                    className="w-full px-2.5 py-1.5 rounded text-left text-xs font-mono text-severity-p1 hover:bg-severity-p1/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Terminate Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── PERSISTENT ACTIVE CLEARANCE SUBHEADER ── */}
      <div className="h-8 border-b border-[#2A2A2E] bg-[#141416]/90 px-4 flex items-center justify-between text-xs font-mono z-30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">// ACTIVE_CLEARANCE:</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-accent-primary/40 bg-accent-primary/10 text-accent-primary flex items-center gap-1.5">
            {getRoleInsignia(user?.role, "w-3 h-3")}
            <span>{user?.role}</span>
          </span>
          <span className="text-[11px] text-text-secondary hidden sm:inline">
            {user?.role === 'ADMIN' && '— Full System Clearance (Root Settings, Squadron RBAC & Outage Ingestion)'}
            {user?.role === 'INCIDENT_COMMANDER' && '— Incident Command Clearance (P1 Escalations & Postmortem Gate)'}
            {user?.role === 'RESPONDER' && '— On-Call Tactical Clearance (Runbook CLI Execution & Acknowledgment)'}
            {user?.role === 'VIEWER' && '— Read-Only Observer Mode (Mutation Buttons Locked)'}
          </span>
        </div>
        <button
          onClick={() => setRoleDropdownOpen(true)}
          className="text-[10px] font-mono text-accent-primary hover:underline flex items-center gap-1"
        >
          <span>Switch Clearance</span>
          <span className="text-text-tertiary">[ ⇄ ]</span>
        </button>
      </div>

      {/* ── WORKSPACE BODY WITH CYBER-BRUTALIST SIDEBAR ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border-subtle bg-bg-secondary/40 flex flex-col justify-between p-3.5 flex-shrink-0 hidden md:flex">
          <div className="space-y-6">
            {/* Org Slug stamp */}
            <div className="px-2 py-1.5 rounded bg-bg-tertiary/40 border border-border-subtle flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-secondary truncate">
                {organization?.name || 'Acme Engineering'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
            </div>

            {/* Navigation Group /01 */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono tracking-widest text-text-tertiary uppercase mb-2">
                /01 MISSION_CONTROL
              </div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium font-mono transition-colors ${
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/postmortems"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium font-mono transition-colors ${
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Postmortems</span>
              </NavLink>
            </div>

            {/* Navigation Group /02 */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono tracking-widest text-text-tertiary uppercase mb-2">
                /02 TELEMETRY
              </div>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium font-mono transition-colors ${
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                  }`
                }
              >
                <Zap className="w-4 h-4" />
                <span>Aggregations</span>
              </NavLink>
            </div>

            {/* Navigation Group /03 */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-mono tracking-widest text-text-tertiary uppercase mb-2">
                /03 SQUADRON
              </div>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium font-mono transition-colors ${
                    isActive
                      ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>Team & RBAC</span>
              </NavLink>
            </div>
          </div>

          {/* Sidebar Footer: System Status */}
          <div className="pt-4 border-t border-border-subtle/40 px-2 text-[10px] font-mono text-text-tertiary flex items-center justify-between">
            <span>SLA_SENTINEL: OK</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-grid-dots relative">
          <Outlet />
        </main>
      </div>

      {/* Slide-over Chaos Simulator */}
      <ChaosSimulatorDrawer isOpen={chaosOpen} onClose={() => setChaosOpen(false)} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenChaos={() => setChaosOpen(true)}
      />
    </div>
  );
};

export default AppShell;
