import React, { useState } from 'react';
import { X, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ROOT_CAUSE_CATEGORIES } from '../../lib/stateMachine';
import toast from 'react-hot-toast';

export const TransitionModal = ({
  isOpen,
  onClose,
  targetStatus,
  currentIncident,
  onSubmit,
  teamMembers = [],
}) => {
  const [reason, setReason] = useState('');
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [mitigationSummary, setMitigationSummary] = useState('');
  const [rootCauseCategory, setRootCauseCategory] = useState('CODE');
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        targetStatus,
        expectedVersion: currentIncident.version,
      };

      if (targetStatus === 'ESCALATED') {
        if (!reason.trim()) {
          toast.error('Escalation reason is required');
          return;
        }
        payload.reason = reason;
      } else if (targetStatus === 'INVESTIGATING') {
        payload.assigneeIds = assigneeIds.length > 0 ? assigneeIds : undefined;
      } else if (targetStatus === 'MITIGATED') {
        if (mitigationSummary.trim().length < 15) {
          toast.error('Mitigation summary must be at least 15 characters');
          return;
        }
        payload.mitigationSummary = mitigationSummary;
      } else if (targetStatus === 'RESOLVED') {
        if (!rootCauseCategory || rootCauseDescription.trim().length < 15) {
          toast.error('Root cause category and description (min 15 chars) required');
          return;
        }
        payload.rootCauseCategory = rootCauseCategory;
        payload.rootCauseDescription = rootCauseDescription;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Transition failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-lg modal-surface relative overflow-hidden text-text-primary">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
            <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-text-primary">
              // TRANSITION_GATE: {targetStatus}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-text-secondary">
            Enforcing state transition guard requirements for <strong className="font-mono text-text-primary">{targetStatus}</strong>:
          </p>

          {/* ESCALATED: Requires reason */}
          {targetStatus === 'ESCALATED' && (
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                Escalation Justification (Required)
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why incident severity must be elevated or higher tier paging is necessary..."
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-severity-p1 rounded p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans"
              />
            </div>
          )}

          {/* INVESTIGATING: Assign responders */}
          {targetStatus === 'INVESTIGATING' && (
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                Assign Responder Team
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded bg-bg-tertiary/40 border border-border-subtle">
                {teamMembers.map((member) => (
                  <label
                    key={member._id}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-bg-tertiary text-xs font-mono text-text-secondary cursor-pointer"
                  >
                    <span>{member.name} ({member.role})</span>
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(member._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssigneeIds([...assigneeIds, member._id]);
                        } else {
                          setAssigneeIds(assigneeIds.filter((id) => id !== member._id));
                        }
                      }}
                      className="rounded border-border-default bg-bg-tertiary text-accent-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* MITIGATED: Requires mitigation summary */}
          {targetStatus === 'MITIGATED' && (
            <div>
              <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                Mitigation Containment Summary (min 15 chars)
              </label>
              <textarea
                required
                rows={3}
                value={mitigationSummary}
                onChange={(e) => setMitigationSummary(e.target.value)}
                placeholder="Describe tactical containment actions taken (e.g. rolled back deployment v2.4, traffic rerouted to secondary cluster)..."
                className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-success rounded p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans"
              />
            </div>
          )}

          {/* RESOLVED: Requires root cause taxonomy */}
          {targetStatus === 'RESOLVED' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                  Root Cause Category
                </label>
                <select
                  value={rootCauseCategory}
                  onChange={(e) => setRootCauseCategory(e.target.value)}
                  className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-success rounded px-2.5 py-2 text-xs text-text-primary font-mono"
                >
                  {['CODE', 'INFRA', 'CONFIG', 'DEPENDENCY', 'HUMAN', 'UNKNOWN'].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-text-secondary block mb-1 uppercase">
                  Root Cause Technical Description (min 15 chars)
                </label>
                <textarea
                  required
                  rows={3}
                  value={rootCauseDescription}
                  onChange={(e) => setRootCauseDescription(e.target.value)}
                  placeholder="Explain fundamental defect or trigger event that caused the incident..."
                  className="w-full bg-bg-tertiary/60 border border-border-default focus:border-accent-success rounded p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-mono text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(10,132,255,0.2)] disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Confirm Transition</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransitionModal;
