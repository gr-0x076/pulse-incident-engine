import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Shield, Activity, Users, FileText, PlusCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CommandPalette = ({ isOpen, onClose, onOpenChaos, onOpenCreateIncident }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { switchDemoRole } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'create-incident',
      title: 'Declare Production Incident',
      category: 'Actions',
      icon: PlusCircle,
      action: () => {
        onClose();
        if (onOpenCreateIncident) onOpenCreateIncident();
      },
    },
    {
      id: 'chaos-simulator',
      title: 'Open Chaos Outage Simulator',
      category: 'Actions',
      icon: Flame,
      action: () => {
        onClose();
        if (onOpenChaos) onOpenChaos();
      },
    },
    {
      id: 'nav-dashboard',
      title: 'Go to Ops Console Dashboard',
      category: 'Navigation',
      icon: Activity,
      action: () => {
        onClose();
        navigate('/dashboard');
      },
    },
    {
      id: 'nav-postmortems',
      title: 'Go to Incident Postmortems',
      category: 'Navigation',
      icon: FileText,
      action: () => {
        onClose();
        navigate('/postmortems');
      },
    },
    {
      id: 'nav-analytics',
      title: 'Go to Operational Analytics',
      category: 'Navigation',
      icon: Activity,
      action: () => {
        onClose();
        navigate('/analytics');
      },
    },
    {
      id: 'nav-team',
      title: 'Go to Team Squadron & RBAC',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onClose();
        navigate('/team');
      },
    },
    {
      id: 'switch-admin',
      title: 'Switch Role: ADMIN (Sarah Chen)',
      category: 'Role Switcher',
      icon: Shield,
      action: () => {
        onClose();
        switchDemoRole('ADMIN');
      },
    },
    {
      id: 'switch-commander',
      title: 'Switch Role: INCIDENT COMMANDER (Alex Rivera)',
      category: 'Role Switcher',
      icon: UserCheck,
      action: () => {
        onClose();
        switchDemoRole('INCIDENT_COMMANDER');
      },
    },
    {
      id: 'switch-responder',
      title: 'Switch Role: RESPONDER (Marcus Vance)',
      category: 'Role Switcher',
      icon: UserCheck,
      action: () => {
        onClose();
        switchDemoRole('RESPONDER');
      },
    },
    {
      id: 'switch-viewer',
      title: 'Switch Role: VIEWER (Elena Rostova)',
      category: 'Role Switcher',
      icon: UserCheck,
      action: () => {
        onClose();
        switchDemoRole('VIEWER');
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-bg-secondary border border-border-default rounded-lg shadow-2xl overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-bg-tertiary/40">
          <Search className="w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Type a command or navigate... (Cmd+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-elevated border border-border-subtle rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border-subtle/30">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-text-tertiary">
              No matching commands or actions found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2.5 rounded flex items-center justify-between text-left transition-colors ${
                    isSelected ? 'bg-accent-primary/15 text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`} />
                    <span className="text-xs font-medium">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-text-tertiary">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-tertiary/30 flex items-center justify-between text-[11px] font-mono text-text-tertiary">
          <span>Navigate: ↑ / ↓</span>
          <span>Select: ↵</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
