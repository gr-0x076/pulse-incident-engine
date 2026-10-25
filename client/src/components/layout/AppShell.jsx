import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Flame,
  FileText,
  Users,
  Shield,
  Zap,
  Terminal,
  LogOut,
  Radio,
  Clock,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getRoleInsignia } from '../ui/TacticalInsignia';
import ChaosSimulatorDrawer from './ChaosSimulatorDrawer';
import CommandPalette from './CommandPalette';
import EvaluatorSandboxDock from './EvaluatorSandboxDock';

export const AppShell = () => {
  const { user, organization, logout } = useAuth();
  const { connected } = useSocket();
  const [utcTime, setUtcTime] = useState('');
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

  // Helper for role badge colors
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'jewel-pill-p1';
      case 'INCIDENT_COMMANDER':
        return 'jewel-pill-p2';
      case 'RESPONDER':
        return 'jewel-pill-p3';
      case 'VIEWER':
      default:
        return 'bg-white/5 text-text-secondary border border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans selection:bg-accent-primary/20">
      {/* ── TOP TELEMETRY CHASSIS ── */}
      <header className="h-13 border-b border-border-subtle bg-bg-secondary/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
        {/* Left: Brand & Connection Status */}
        <div className="flex items-center gap-5">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate('/dashboard')}
          >
            <span className="w-2 h-2 rounded-full bg-[#E5C185] animate-pulse shadow-[0_0_8px_rgba(229,193,133,0.4)]" />
            <span className="text-sm font-semibold tracking-tight text-text-primary group-hover:text-white transition-colors">
              Pulse <span className="text-text-tertiary font-normal text-xs ml-1 font-mono">ops console</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-border-subtle text-[11px] font-mono text-text-secondary">
            <Radio className={`w-3 h-3 ${connected ? 'text-accent-success animate-pulse' : 'text-[#E5C185]'}`} />
            <span>{connected ? 'WS_LIVE' : 'WS_DISCONNECTED'}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-text-tertiary">
            <Clock className="w-3 h-3" />
            <span>{utcTime}</span>
          </div>
        </div>

        {/* Right: Quick Controls & Profile Pill */}
        <div className="flex items-center gap-3">
          {/* Cmd+K Quick Trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg btn-ghost text-xs font-mono transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Cmd+K</span>
          </button>

          {/* Chaos Simulator Trigger */}
          <button
            onClick={() => setChaosOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C8A97E]/10 hover:bg-[#C8A97E]/20 border border-[#C8A97E]/25 text-[#E5C185] text-xs font-mono font-medium transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate Outage</span>
          </button>

          {/* Refined User Profile Pill with Sign Out */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-border-subtle">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.02] border border-border-subtle">
              <div className="w-5 h-5 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-[10px] font-bold text-accent-primary">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-medium text-text-primary">{user?.name}</span>
                <span className="text-[10px] text-text-tertiary font-mono">{organization?.name || 'Acme Eng'}</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${getRoleBadgeClass(user?.role)}`}>
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-text-tertiary hover:text-[#E5C185] hover:bg-white/[0.04] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE BODY WITH REFINED MINIMAL SIDEBAR ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-border-subtle bg-bg-secondary/40 backdrop-blur-md flex flex-col justify-between p-4 flex-shrink-0 hidden md:flex">
          <div className="space-y-6">
            {/* Org Slug stamp */}
            <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-border-subtle flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary truncate">
                {organization?.name || 'Acme Engineering'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
            </div>

            {/* Navigation Group: Operations */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-mono tracking-wider text-text-tertiary uppercase mb-2">
                Operations
              </div>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>Console</span>
              </NavLink>

              <NavLink
                to="/postmortems"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Postmortems</span>
              </NavLink>
            </div>

            {/* Navigation Group: Telemetry */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-mono tracking-wider text-text-tertiary uppercase mb-2">
                Telemetry
              </div>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`
                }
              >
                <Zap className="w-4 h-4" />
                <span>Analytics</span>
              </NavLink>
            </div>

            {/* Navigation Group: Team */}
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-mono tracking-wider text-text-tertiary uppercase mb-2">
                Organization
              </div>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>Squadron & RBAC</span>
              </NavLink>
            </div>
          </div>

          {/* Sidebar Footer: System Status */}
          <div className="pt-4 border-t border-border-subtle px-2 text-[11px] font-mono text-text-tertiary flex items-center justify-between">
            <span>SLA Sentinel Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
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

      {/* Discreet Evaluator Sandbox Dock (Fixed Bottom-Left) */}
      <EvaluatorSandboxDock />
    </div>
  );
};

export default AppShell;
