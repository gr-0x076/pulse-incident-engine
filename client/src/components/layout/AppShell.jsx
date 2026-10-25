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
    { role: 'ADMIN', name: 'Sarah Chen', desc: 'Full System Commander Privileges', icon: '👑' },
    { role: 'INCIDENT_COMMANDER', name: 'Alex Rivera', desc: 'Incident Escalation & Mitigation Gate', icon: '⚡' },
    { role: 'RESPONDER', name: 'Marcus Vance', desc: 'On-Call Tactical Execution', icon: '🛡️' },
    { role: 'VIEWER', name: 'Elena Rostova', desc: 'Read-Only Audit Observer', icon: '👁️' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans selection:bg-accent-primary/20">
      {/* ── TOP TELEMETRY CHASSIS ── */}
      <header className="h-12 border-b border-border-subtle bg-bg-secondary/90 backdrop-blur-md px-4 flex items-center justify-between z-40 sticky top-0">
        {/* Left: Brand & Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <span className="w-2.5 h-2.5 rounded-full bg-severity-p1 animate-pulse-live shadow-[0_0_8px_#FF453A]" />
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
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-bg-tertiary/80 hover:bg-bg-elevated border border-border-subtle text-text-tertiary hover:text-text-secondary text-xs font-mono transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cmd+K</span>
          </button>

          {/* Chaos Simulator Drawer Trigger */}
          <button
            onClick={() => setChaosOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-severity-p1/10 hover:bg-severity-p1/20 border border-severity-p1/30 text-severity-p1 text-xs font-mono font-semibold transition-all shadow-[0_0_10px_rgba(255,69,58,0.1)]"
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Simulate Outage</span>
          </button>

          {/* 1-Click Evaluator Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-bg-elevated border border-border-default hover:border-text-tertiary text-xs transition-all font-mono"
            >
              <span className="text-accent-primary font-semibold">[{user?.role}]</span>
              <span className="text-text-primary hidden md:inline">{user?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-lg bg-bg-secondary border border-border-default shadow-2xl py-1.5 z-50 glass-panel animate-slide-in"
                onClick={() => setRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-border-subtle text-[10px] font-mono tracking-widest uppercase text-text-tertiary">
                  // 1-CLICK EVALUATOR ROLE SWITCHER
                </div>
                {roles.map((r) => {
                  const isActive = user?.role === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => switchDemoRole(r.role)}
                      className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-bg-tertiary transition-colors ${
                        isActive ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : ''
                      }`}
                    >
                      <span className="text-sm">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-semibold ${isActive ? 'text-accent-primary' : 'text-text-primary'}`}>
                            {r.role}
                          </span>
                          <span className="text-[11px] text-text-secondary">{r.name}</span>
                        </div>
                        <p className="text-[10px] text-text-tertiary truncate">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}

                <div className="border-t border-border-subtle mt-1 pt-1 px-1">
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
