import React, { useState } from 'react';
import { X, Flame, AlertCircle, BookOpen, User, CheckCircle } from 'lucide-react';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';

export const CreateIncidentModal = ({ isOpen, onClose, onCreated, teamMembers = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    severity: 'P2',
    description: '',
    commanderId: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Runbook matching preview heuristic
  const titleLower = formData.title.toLowerCase();
  let matchedRunbook = null;
  if (titleLower.includes('5xx') || titleLower.includes('gateway') || titleLower.includes('api')) {
    matchedRunbook = 'API Gateway 5xx Spike Playbook (6 SOP steps)';
  } else if (titleLower.includes('db') || titleLower.includes('pool') || titleLower.includes('database')) {
    matchedRunbook = 'Database Connection Pool Exhaustion Playbook (5 SOP steps)';
  } else if (titleLower.includes('stripe') || titleLower.includes('payment') || titleLower.includes('checkout')) {
    matchedRunbook = 'Payment Processing Failure Playbook (4 SOP steps)';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        severity: formData.severity,
        description: formData.description,
      };
      if (formData.commanderId) {
        payload.commanderId = formData.commanderId;
      }

      const response = await apiClient.post('/incidents', payload);
      if (response.success) {
        toast.success(`Declared INC-${String(response.data.incidentNumber).padStart(5, '0')}`, {
          icon: '🚨',
        });
        if (onCreated) onCreated(response.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to declare incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-lg shadow-2xl glass-panel relative overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-severity-p1 animate-pulse" />
            <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-text-primary">
              // DECLARE_PRODUCTION_INCIDENT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Incident Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., API Gateway returning 503 errors on checkout"
              className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                Severity Level
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-2.5 py-2 text-xs text-text-primary font-mono"
              >
                <option value="P1">🔴 P1 — Critical (5m SLA)</option>
                <option value="P2">🟠 P2 — High (15m SLA)</option>
                <option value="P3">🟡 P3 — Moderate (60m SLA)</option>
                <option value="P4">🟢 P4 — Low (240m SLA)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                Assign Commander
              </label>
              <select
                value={formData.commanderId}
                onChange={(e) => setFormData({ ...formData, commanderId: e.target.value })}
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-2.5 py-2 text-xs text-text-primary font-mono"
              >
                <option value="">Auto-assign or Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
              Diagnostic Context / Logs Summary
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Observed error rates, affected customer segments, Grafana query..."
              className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-primary rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans"
            />
          </div>

          {/* Auto-matching Runbook Preview */}
          {matchedRunbook && (
            <div className="p-3 rounded border border-accent-primary/30 bg-accent-primary/10 flex items-center gap-2.5 text-xs text-accent-primary animate-fade-in font-mono">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>Auto-attaching: <strong>{matchedRunbook}</strong></span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-4 py-2 rounded bg-severity-p1 hover:bg-severity-p1/90 text-white font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,69,58,0.2)] disabled:opacity-50"
            >
              {loading ? 'Declaring...' : 'Declare Incident 🚨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIncidentModal;
