import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, CheckCircle, Clock, AlertTriangle, ArrowRight, User } from 'lucide-react';
import apiClient from '../../api/client';
import { formatRelativeTime } from '../../lib/formatters';
import toast from 'react-hot-toast';

export const PostmortemsPage = () => {
  const queryClient = useQueryClient();
  const [selectedPostmortem, setSelectedPostmortem] = useState(null);
  const [editingPostmortem, setEditingPostmortem] = useState(null);

  // Fetch all postmortems
  const { data: postmortems = [], isLoading } = useQuery({
    queryKey: ['postmortems'],
    queryFn: async () => {
      const res = await apiClient.get('/postmortems');
      return res.data;
    },
  });

  // Fetch resolved incidents without postmortem yet
  const { data: resolvedIncidents = [] } = useQuery({
    queryKey: ['incidents', 'resolved_without_pm'],
    queryFn: async () => {
      const res = await apiClient.get('/incidents?status=RESOLVED');
      return (res.data || []).filter((inc) => !inc.postmortemId);
    },
  });

  const handleCreateDraft = async (incident) => {
    try {
      const res = await apiClient.post('/postmortems', {
        incidentId: incident._id,
        title: `Postmortem: INC-${incident.incidentNumber} - ${incident.title}`,
        summary: incident.mitigationSummary || '',
        rootCause: {
          category: incident.rootCause?.category || 'CODE',
          description: incident.rootCause?.description || '',
        },
        actionItems: [
          { description: 'Implement automated integration test covering trigger condition', completed: false },
          { description: 'Update monitoring alert threshold in Datadog/Prometheus', completed: false },
        ],
      });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['postmortems'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        setSelectedPostmortem(res.data);
        toast.success('Postmortem draft initialized');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create postmortem');
    }
  };

  const handlePublish = async (id) => {
    try {
      const res = await apiClient.post(`/postmortems/${id}/publish`);
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['postmortems'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        setSelectedPostmortem(res.data);
        toast.success('Postmortem published! Incident closure unlocked.', { icon: '🎉' });
      }
    } catch (err) {
      toast.error(err.message || 'Publish failed');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-text-tertiary uppercase">
              // RETROSPECTIVE_STUDIO
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">
            Incident Postmortems & Retrospectives
          </h1>
        </div>
      </div>

      {/* Resolved Incidents Needing Postmortem */}
      {resolvedIncidents.length > 0 && (
        <div className="p-4 rounded-lg bg-severity-p2/10 border border-severity-p2/30 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-severity-p2 uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>{resolvedIncidents.length} Resolved Incidents Require Postmortem Reports</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {resolvedIncidents.map((inc) => (
              <div
                key={inc._id}
                className="p-3 rounded bg-bg-secondary border border-border-subtle flex items-center justify-between gap-2 text-xs font-mono"
              >
                <div className="truncate">
                  <span className="text-text-tertiary">INC-{inc.incidentNumber}:</span>{' '}
                  <span className="text-text-primary font-semibold">{inc.title}</span>
                </div>
                <button
                  onClick={() => handleCreateDraft(inc)}
                  className="px-2.5 py-1 rounded bg-accent-primary hover:bg-accent-primary/90 text-white font-mono text-[11px] font-bold flex-shrink-0"
                >
                  Create Postmortem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Postmortems List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-3">
          <div className="text-xs font-mono text-text-tertiary uppercase">
            // PUBLISHED & DRAFT DOSSIERS
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded skeleton" />
              ))}
            </div>
          ) : postmortems.length === 0 ? (
            <div className="p-8 rounded border border-border-subtle text-center text-xs font-mono text-text-tertiary">
              No postmortems created yet. Resolve an incident to author one.
            </div>
          ) : (
            postmortems.map((pm) => {
              const isSelected = selectedPostmortem?._id === pm._id;
              const isPublished = pm.status === 'PUBLISHED';
              return (
                <div
                  key={pm._id}
                  onClick={() => setSelectedPostmortem(pm)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border-subtle bg-bg-secondary hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[10px] ${
                        isPublished
                          ? 'bg-accent-success/10 text-accent-success border border-accent-success/30'
                          : 'bg-severity-p2/10 text-severity-p2 border border-severity-p2/30'
                      }`}
                    >
                      {pm.status}
                    </span>
                    <span className="text-text-tertiary">{formatRelativeTime(pm.createdAt)}</span>
                  </div>

                  <h3 className="text-xs font-semibold text-text-primary mt-2 line-clamp-2">
                    {pm.title}
                  </h3>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-text-tertiary">
                    <span>Taxonomy: {pm.rootCause?.category || 'N/A'}</span>
                    <span>{pm.actionItems?.length || 0} Action Items</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Postmortem Detail / Studio Pane */}
        <div className="lg:col-span-2">
          {selectedPostmortem ? (
            <div className="p-6 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-5">
              <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                <div>
                  <span className="text-[10px] font-mono text-accent-primary uppercase tracking-widest">
                    // POSTMORTEM_DOSSIER: {selectedPostmortem.status}
                  </span>
                  <h2 className="text-base font-bold text-text-primary mt-1">
                    {selectedPostmortem.title}
                  </h2>
                </div>

                {selectedPostmortem.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePublish(selectedPostmortem._id)}
                    className="px-4 py-2 rounded bg-accent-success hover:bg-accent-success/90 text-bg-primary font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(48,209,88,0.2)] flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Publish & Unlock Closure</span>
                  </button>
                )}
              </div>

              {/* Impact Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle">
                  <span className="text-text-tertiary block text-[10px] uppercase">OUTAGE DURATION</span>
                  <span className="text-lg font-bold text-text-primary">
                    {selectedPostmortem.impact?.durationMinutes || 45} Minutes
                  </span>
                </div>
                <div className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle">
                  <span className="text-text-tertiary block text-[10px] uppercase">ROOT CAUSE TAXONOMY</span>
                  <span className="text-lg font-bold text-accent-success">
                    {selectedPostmortem.rootCause?.category || 'CODE'}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-xs font-mono text-text-tertiary uppercase mb-1">// EXECUTIVE SUMMARY</h4>
                <p className="text-xs text-text-secondary leading-relaxed bg-bg-primary/50 p-3 rounded border border-border-subtle">
                  {selectedPostmortem.summary || 'No summary documented.'}
                </p>
              </div>

              {/* Root Cause Details */}
              <div>
                <h4 className="text-xs font-mono text-text-tertiary uppercase mb-1">// ROOT CAUSE ANALYSIS</h4>
                <p className="text-xs text-text-primary leading-relaxed bg-bg-primary/50 p-3 rounded border border-border-subtle font-mono">
                  {selectedPostmortem.rootCause?.description || 'Pending diagnosis.'}
                </p>
              </div>

              {/* Action Items */}
              <div>
                <h4 className="text-xs font-mono text-text-tertiary uppercase mb-2">
                  // REMEDIATION ACTION ITEMS ({selectedPostmortem.actionItems?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedPostmortem.actionItems?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-bg-tertiary/40 border border-border-subtle flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-accent-success" />
                        <span className="text-text-primary">{item.description}</span>
                      </div>
                      <span className="text-[10px] text-text-tertiary uppercase">ASSIGNED</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-lg border border-border-subtle bg-bg-secondary/30 text-center text-xs font-mono text-text-tertiary">
              Select a postmortem from the roster to inspect retrospective telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostmortemsPage;
