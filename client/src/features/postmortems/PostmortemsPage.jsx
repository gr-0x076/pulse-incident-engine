import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  User,
  Trash2,
  Save,
  Tag,
  CheckSquare,
  Square,
  Shield,
  Layers,
  Lock,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime } from '../../lib/formatters';
import { ROOT_CAUSE_CATEGORIES } from '../../lib/stateMachine';
import BrutalistCard from '../../components/ui/BrutalistCard';
import toast from 'react-hot-toast';

export const PostmortemsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedPostmortem, setSelectedPostmortem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

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

  // Fetch team members for action item assignment
  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await apiClient.get('/org/team');
      return res.data;
    },
  });

  const teamMembers = teamData?.members || [];

  // When selected postmortem changes, clone it into editForm state
  useEffect(() => {
    if (selectedPostmortem) {
      setEditForm({
        title: selectedPostmortem.title,
        summary: selectedPostmortem.summary || '',
        impact: {
          durationMinutes: selectedPostmortem.impact?.durationMinutes || 45,
          affectedServices: selectedPostmortem.impact?.affectedServices || ['api-gateway', 'checkout'],
        },
        rootCause: {
          category: selectedPostmortem.rootCause?.category || 'CODE',
          description: selectedPostmortem.rootCause?.description || '',
        },
        lessonsLearned: selectedPostmortem.lessonsLearned || '',
        actionItems: selectedPostmortem.actionItems || [],
      });
    } else {
      setEditForm(null);
    }
  }, [selectedPostmortem]);

  // Handle draft postmortem creation for resolved incidents
  const handleCreateDraft = async (incident) => {
    if (user?.role === 'VIEWER') {
      toast.error('Read-only observers cannot author postmortems');
      return;
    }
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

  // Save changes to draft or published postmortem
  const handleSaveDraft = async (silent = false) => {
    if (!selectedPostmortem || !editForm) return;
    if (user?.role === 'VIEWER') {
      toast.error('Read-only observers cannot modify postmortems');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.put(`/postmortems/${selectedPostmortem._id}`, editForm);
      if (res.success) {
        setSelectedPostmortem(res.data);
        queryClient.invalidateQueries({ queryKey: ['postmortems'] });
        if (!silent) toast.success('Postmortem draft saved', { icon: '💾' });
        return res.data;
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Publish postmortem and unlock incident closure
  const handlePublish = async () => {
    if (!selectedPostmortem) return;
    if (user?.role !== 'ADMIN' && user?.role !== 'INCIDENT_COMMANDER') {
      toast.error('Incident Commander or Admin clearance required to publish postmortems');
      return;
    }
    if (!editForm?.summary || editForm.summary.trim().length < 20) {
      toast.error('Please write an executive summary (min 20 chars) before publishing.');
      return;
    }
    if (!editForm?.actionItems || editForm.actionItems.length === 0) {
      toast.error('Add at least 1 remediation action item before publishing.');
      return;
    }

    try {
      // Save latest edits first
      await handleSaveDraft(true);
      const res = await apiClient.post(`/postmortems/${selectedPostmortem._id}/publish`);
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

  // Action item handlers
  const handleAddActionItem = () => {
    if (!editForm) return;
    const newItem = {
      description: '',
      assignee: teamMembers[0]?._id || null,
      completed: false,
    };
    setEditForm({
      ...editForm,
      actionItems: [...editForm.actionItems, newItem],
    });
  };

  const handleUpdateActionItem = (index, field, value) => {
    const updated = [...editForm.actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, actionItems: updated });
  };

  const handleRemoveActionItem = (index) => {
    const updated = editForm.actionItems.filter((_, i) => i !== index);
    setEditForm({ ...editForm, actionItems: updated });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const current = editForm.impact.affectedServices || [];
      if (!current.includes(newTag.trim().toLowerCase())) {
        setEditForm({
          ...editForm,
          impact: {
            ...editForm.impact,
            affectedServices: [...current, newTag.trim().toLowerCase()],
          },
        });
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditForm({
      ...editForm,
      impact: {
        ...editForm.impact,
        affectedServices: editForm.impact.affectedServices.filter((t) => t !== tagToRemove),
      },
    });
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

      {/* Resolved Incidents Banner */}
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
                {user?.role === 'VIEWER' ? (
                  <span className="text-[10px] text-text-tertiary font-mono">Observer Mode (Locked)</span>
                ) : (
                  <button
                    onClick={() => handleCreateDraft(inc)}
                    className="btn-ivory px-2.5 py-1 rounded-lg text-[11px] font-medium flex-shrink-0"
                  >
                    Create Postmortem
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Dossier List */}
        <div className="space-y-3">
          <div className="text-xs font-mono text-text-tertiary uppercase">
            // PUBLISHED & DRAFT RETROSPECTIVES
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
                      ? 'border-accent-primary bg-accent-primary/10 shadow-[0_0_12px_rgba(10,132,255,0.15)]'
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

        {/* Right Active Editor / Dossier Inspector Pane */}
        <div className="lg:col-span-2">
          {selectedPostmortem && editForm ? (
            <BrutalistCard
              indexStamp={`// POSTMORTEM_STUDIO: ${selectedPostmortem.status}`}
              className="space-y-5"
            >
              {/* Studio Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
                <div>
                  <span className="text-[10px] font-mono text-accent-primary uppercase tracking-widest">
                    // DOSSIER_TITLE
                  </span>
                  <input
                    type="text"
                    value={editForm.title}
                    disabled={selectedPostmortem.status === 'PUBLISHED'}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-transparent text-base font-bold text-text-primary focus:outline-none border-b border-transparent focus:border-accent-primary transition-colors font-sans mt-0.5"
                  />
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedPostmortem.status === 'DRAFT' && (
                    user?.role === 'VIEWER' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-border-subtle text-text-tertiary text-xs font-mono">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Observer Mode (Locked)</span>
                      </div>
                    ) : user?.role === 'RESPONDER' ? (
                      <>
                        <button
                          onClick={() => handleSaveDraft(false)}
                          disabled={saving}
                          className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                        </button>
                        <div
                          title="Incident Commander or Admin clearance required to publish"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-border-subtle text-text-tertiary text-xs font-mono flex items-center gap-1.5 cursor-not-allowed opacity-60"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Publish (Commander Clearance Required)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveDraft(false)}
                          disabled={saving}
                          className="btn-ghost px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                        </button>

                        <button
                          onClick={handlePublish}
                          disabled={saving}
                          className="btn-ivory px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-accent-success" />
                          <span>Publish & Link</span>
                        </button>
                      </>
                    )
                  )}
                  {selectedPostmortem.status === 'PUBLISHED' && (
                    <span className="px-3 py-1 rounded-full bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono font-semibold">
                      PUBLISHED // LOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* Impact Telemetry & Service Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
                <div className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle space-y-1">
                  <span className="text-text-tertiary block text-[10px] uppercase">OUTAGE DURATION (MINS)</span>
                  <input
                    type="number"
                    min={1}
                    disabled={selectedPostmortem.status === 'PUBLISHED'}
                    value={editForm.impact.durationMinutes}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        impact: { ...editForm.impact, durationMinutes: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    className="w-full bg-bg-primary/60 border border-border-default rounded px-2.5 py-1 text-sm font-bold text-text-primary font-mono focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded bg-bg-tertiary/40 border border-border-subtle space-y-1">
                  <span className="text-text-tertiary block text-[10px] uppercase">ROOT CAUSE TAXONOMY</span>
                  <select
                    disabled={selectedPostmortem.status === 'PUBLISHED'}
                    value={editForm.rootCause.category}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        rootCause: { ...editForm.rootCause, category: e.target.value },
                      })
                    }
                    className="w-full bg-bg-primary/60 border border-border-default rounded px-2 py-1 text-xs font-bold text-accent-success font-mono focus:outline-none"
                  >
                    {ROOT_CAUSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Affected Services Tags */}
              <div>
                <label className="text-xs font-mono text-text-tertiary uppercase block mb-1">
                  // AFFECTED MICROSERVICES & CLUSTERS
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded bg-bg-primary/50 border border-border-subtle">
                  {editForm.impact.affectedServices?.map((service) => (
                    <span
                      key={service}
                      className="px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-xs font-mono text-text-primary flex items-center gap-1.5"
                    >
                      <span>{service}</span>
                      {selectedPostmortem.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(service)}
                          className="text-text-tertiary hover:text-severity-p1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {selectedPostmortem.status === 'DRAFT' && (
                    <input
                      type="text"
                      placeholder="+ add tag (Enter)"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="bg-transparent text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none px-2 py-0.5"
                    />
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <label className="text-xs font-mono text-text-tertiary uppercase block mb-1">
                  Executive Summary & Scope
                </label>
                <textarea
                  rows={3}
                  disabled={selectedPostmortem.status === 'PUBLISHED' || user?.role === 'VIEWER'}
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  placeholder="Concise high-level description of what happened, user impact, and immediate resolution..."
                  className="w-full bg-bg-primary/60 border border-border-default focus:border-accent-primary rounded-xl p-3 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans leading-relaxed disabled:opacity-60"
                />
              </div>

              {/* Root Cause Analysis */}
              <div>
                <label className="text-xs font-mono text-text-tertiary uppercase block mb-1">
                  Root Cause Technical Analysis
                </label>
                <textarea
                  rows={3}
                  disabled={selectedPostmortem.status === 'PUBLISHED' || user?.role === 'VIEWER'}
                  value={editForm.rootCause.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      rootCause: { ...editForm.rootCause, description: e.target.value },
                    })
                  }
                  placeholder="Deep technical breakdown: code diff, configuration flaw, upstream provider fault..."
                  className="w-full bg-bg-primary/60 border border-border-default focus:border-accent-primary rounded-xl p-3 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-mono leading-relaxed disabled:opacity-60"
                />
              </div>

              {/* Interactive Action Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-text-tertiary uppercase">
                    Remediation Action Items ({editForm.actionItems.length})
                  </label>
                  {selectedPostmortem.status === 'DRAFT' && user?.role !== 'VIEWER' && (
                    <button
                      type="button"
                      onClick={handleAddActionItem}
                      className="text-xs font-mono text-accent-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Action Item</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {editForm.actionItems.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border-subtle text-center text-xs font-mono text-text-tertiary">
                      Zero action items added. Add at least 1 preventative task.
                    </div>
                  ) : (
                    editForm.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-bg-primary/50 border border-border-subtle flex items-center gap-3 text-xs font-mono"
                      >
                        <button
                          type="button"
                          disabled={selectedPostmortem.status === 'PUBLISHED' || user?.role === 'VIEWER'}
                          onClick={() => handleUpdateActionItem(idx, 'completed', !item.completed)}
                          className="text-accent-success hover:opacity-80 disabled:opacity-50"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-accent-success" />
                          ) : (
                            <Square className="w-4 h-4 text-text-tertiary" />
                          )}
                        </button>

                        <input
                          type="text"
                          disabled={selectedPostmortem.status === 'PUBLISHED' || user?.role === 'VIEWER'}
                          placeholder="Action item description..."
                          value={item.description}
                          onChange={(e) => handleUpdateActionItem(idx, 'description', e.target.value)}
                          className={`flex-1 bg-transparent text-xs text-text-primary focus:outline-none disabled:opacity-60 ${
                            item.completed ? 'line-through text-text-secondary' : ''
                          }`}
                        />

                        {teamMembers.length > 0 && (
                          <select
                            disabled={selectedPostmortem.status === 'PUBLISHED' || user?.role === 'VIEWER'}
                            value={item.assignee || ''}
                            onChange={(e) => handleUpdateActionItem(idx, 'assignee', e.target.value)}
                            className="bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-[11px] text-text-secondary font-mono disabled:opacity-50"
                          >
                            <option value="">Assign Responder</option>
                            {teamMembers.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {selectedPostmortem.status === 'DRAFT' && user?.role !== 'VIEWER' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveActionItem(idx)}
                            className="text-text-tertiary hover:text-severity-p1 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lessons Learned */}
              <div>
                <label className="text-xs font-mono text-text-tertiary uppercase block mb-1">
                  // ARCHITECTURAL LESSONS LEARNED
                </label>
                <textarea
                  rows={2}
                  disabled={selectedPostmortem.status === 'PUBLISHED'}
                  value={editForm.lessonsLearned}
                  onChange={(e) => setEditForm({ ...editForm, lessonsLearned: e.target.value })}
                  placeholder="What went well, what went poorly, where did telemetry fail..."
                  className="w-full bg-bg-primary/60 border border-border-default focus:border-accent-primary rounded p-3 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none font-sans"
                />
              </div>
            </BrutalistCard>
          ) : (
            <BrutalistCard className="p-12 text-center text-xs font-mono text-text-tertiary" indexStamp="// RETROSPECTIVE_STUDIO">
              Select a postmortem from the roster to inspect or author retrospective telemetry.
            </BrutalistCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostmortemsPage;
