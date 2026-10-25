import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  User,
  Shield,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Flame,
  FileText,
  Lock,
  ChevronRight,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatIncidentNumber, formatRelativeTime, formatTime } from '../../lib/formatters';
import {
  STATUS_PIPELINE,
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_COLORS,
  getValidTransitions,
} from '../../lib/stateMachine';
import LiveSLACountdown from '../../components/ui/LiveSLACountdown';
import BrutalistCard from '../../components/ui/BrutalistCard';
import TransitionModal from './TransitionModal';
import toast from 'react-hot-toast';

export const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { joinIncident, leaveIncident } = useSocket();

  const [transitionModalTarget, setTransitionModalTarget] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(null);
  const [stepInputs, setStepInputs] = useState({});
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Join Socket.io room for this incident
  useEffect(() => {
    if (id) {
      joinIncident(id);
      return () => leaveIncident(id);
    }
  }, [id, joinIncident, leaveIncident]);

  // Fetch Incident & Timeline
  const { data, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const res = await apiClient.get(`/incidents/${id}`);
      return res.data;
    },
    refetchInterval: 8000,
  });

  // Fetch Team members
  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await apiClient.get('/org/team');
      return res.data;
    },
  });

  const incident = data?.incident;
  const timeline = data?.timeline || [];
  const teamMembers = teamData?.members || [];
  const runbook = incident?.runbookId;

  // Handle direct transitions
  const handleTransition = async (payload) => {
    try {
      const response = await apiClient.post(`/incidents/${id}/transition`, payload);
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['incident', id] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        toast.success(`Transitioned to [${payload.targetStatus}]`, { icon: '⚡' });
      }
    } catch (err) {
      toast.error(err.message || 'Transition rejected by state machine');
    }
  };

  // Runbook step execution mutation
  const handleExecuteStep = async (stepIndex, status) => {
    try {
      const input = stepInputs[stepIndex] || '';
      const response = await apiClient.patch(`/incidents/${id}/runbook/steps/${stepIndex}`, {
        status,
        verificationInput: input,
      });
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['incident', id] });
        toast.success(`Step #${stepIndex} marked as [${status}]`, { icon: '✓' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update runbook step');
    }
  };

  // Timeline comment mutation
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const response = await apiClient.post(`/incidents/${id}/timeline/comment`, {
        content: newComment,
      });
      if (response.success) {
        setNewComment('');
        queryClient.invalidateQueries({ queryKey: ['incident', id] });
        toast.success('Note posted to timeline');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to post note');
    } finally {
      setPostingComment(false);
    }
  };

  const copyToClipboard = (text, stepIndex) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(stepIndex);
    toast.success('Command copied to clipboard');
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded skeleton" />
        <div className="h-16 rounded-lg skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-lg skeleton" />
          <div className="h-96 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-severity-p1 mx-auto" />
        <div className="text-base font-mono font-bold text-text-primary">
          Incident Not Found or Access Denied
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded bg-bg-secondary border border-border-default text-xs font-mono"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const validTransitions = getValidTransitions(incident.status);
  const currentPipelineIdx = STATUS_PIPELINE.indexOf(incident.status);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP BREADCRUMB & INCIDENT ID ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold ${SEVERITY_COLORS[incident.severity]}`}>
                [{incident.severity}]
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                {formatIncidentNumber(incident.incidentNumber)}
              </span>
              <span className={`status-badge text-[10px] border ${STATUS_COLORS[incident.status]}`}>
                {STATUS_LABELS[incident.status] || incident.status}
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-text-primary mt-1">
              {incident.title}
            </h1>
          </div>
        </div>

        {/* Postmortem Shortcut Badge */}
        {incident.postmortemId ? (
          <Link
            to={`/postmortems`}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent-success/10 border border-accent-success/30 text-accent-success text-xs font-mono hover:bg-accent-success/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Postmortem Published</span>
          </Link>
        ) : incident.status === 'RESOLVED' ? (
          <Link
            to={`/postmortems`}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-severity-p2/15 border border-severity-p2/40 text-severity-p2 text-xs font-mono animate-pulse hover:bg-severity-p2/25 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Author Postmortem to Unlock Closure →</span>
          </Link>
        ) : null}
      </div>

      {/* ── INTERACTIVE VISUAL STATE MACHINE PIPELINE HEADER ── */}
      <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel">
        <div className="text-[10px] font-mono tracking-widest text-text-tertiary uppercase mb-3 flex items-center justify-between">
          <span>// DETERMINISTIC_STATE_MACHINE_PIPELINE</span>
          <span>CURRENT_VERSION: v{incident.version}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STATUS_PIPELINE.map((stage, idx) => {
            const isCompleted = currentPipelineIdx > idx;
            const isActive = currentPipelineIdx === idx;
            const isLocked = currentPipelineIdx < idx;

            return (
              <div
                key={stage}
                className={`p-2.5 rounded border text-center transition-all relative ${
                  isActive
                    ? 'border-accent-primary bg-accent-primary/10 shadow-[0_0_12px_rgba(10,132,255,0.2)]'
                    : isCompleted
                    ? 'border-accent-success/40 bg-accent-success/5 text-text-secondary'
                    : 'border-border-subtle/50 bg-bg-tertiary/20 text-text-tertiary'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-accent-success" />
                  ) : isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-ping" />
                  ) : (
                    <Lock className="w-3 h-3 text-text-tertiary" />
                  )}
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      isActive ? 'text-accent-primary' : isCompleted ? 'text-text-primary' : 'text-text-tertiary'
                    }`}
                  >
                    {STATUS_LABELS[stage]}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-text-tertiary">
                  {isActive ? 'ACTIVE' : isCompleted ? 'COMPLETED' : 'LOCKED'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LIVE SLA COUNTDOWN WIDGET ── */}
      <LiveSLACountdown incident={incident} compact={false} />

      {/* ── SPLIT WORKSPACE: WORKBENCH (LEFT) & TIMELINE (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / CENTER PANE: RUNBOOK & ACTION CONSOLE */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Console: Transition Buttons */}
          <div className="p-4 rounded-lg bg-bg-secondary/40 border border-border-subtle space-y-3">
            <div className="text-xs font-mono text-text-tertiary uppercase flex items-center justify-between">
              <span>// STATE_MUTATION_GATES</span>
              <span className="text-[10px] text-text-tertiary">OCC Protected</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {validTransitions.length === 0 ? (
                <div className="text-xs font-mono text-text-tertiary py-1">
                  Incident lifecycle is finalized (CLOSED). No further transitions permitted.
                </div>
              ) : (
                validTransitions.map((target) => {
                  const needsModal = ['INVESTIGATING', 'ESCALATED', 'MITIGATED', 'RESOLVED'].includes(target);
                  return (
                    <button
                      key={target}
                      onClick={() => {
                        if (needsModal) {
                          setTransitionModalTarget(target);
                        } else if (target === 'CLOSED' && !incident.postmortemId) {
                          toast.error('Cannot close incident without an attached published postmortem report');
                        } else {
                          handleTransition({
                            targetStatus: target,
                            expectedVersion: incident.version,
                          });
                        }
                      }}
                      className={`px-3.5 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                        target === 'ACKNOWLEDGED'
                          ? 'bg-severity-p2 hover:bg-severity-p2/90 text-bg-primary'
                          : target === 'ESCALATED'
                          ? 'bg-severity-p1 hover:bg-severity-p1/90 text-white'
                          : target === 'MITIGATED'
                          ? 'bg-severity-p2 hover:bg-severity-p2/90 text-bg-primary'
                          : target === 'RESOLVED'
                          ? 'bg-accent-success hover:bg-accent-success/90 text-bg-primary'
                          : target === 'CLOSED'
                          ? 'bg-text-secondary hover:bg-text-primary text-bg-primary'
                          : 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                      }`}
                    >
                      <span>Transition → {target}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Diagnostic Context / Root Cause Details */}
          {(incident.description || incident.mitigationSummary || incident.rootCause?.category) && (
            <div className="p-4 rounded-lg bg-bg-secondary/40 border border-border-subtle space-y-3 font-mono text-xs">
              {incident.description && (
                <div>
                  <span className="text-text-tertiary block text-[10px] uppercase mb-0.5">CONTEXT:</span>
                  <p className="text-text-secondary whitespace-pre-wrap">{incident.description}</p>
                </div>
              )}
              {incident.mitigationSummary && (
                <div className="pt-2 border-t border-border-subtle/40">
                  <span className="text-severity-p2 block text-[10px] uppercase mb-0.5">MITIGATION SUMMARY:</span>
                  <p className="text-text-primary">{incident.mitigationSummary}</p>
                </div>
              )}
              {incident.rootCause?.category && (
                <div className="pt-2 border-t border-border-subtle/40">
                  <span className="text-accent-success block text-[10px] uppercase mb-0.5">
                    ROOT CAUSE TAXONOMY [{incident.rootCause.category}]:
                  </span>
                  <p className="text-text-primary">{incident.rootCause.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── INTERACTIVE RUNBOOK EXECUTION WORKBENCH (UPGRADE 2) ── */}
          <div className="p-5 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-primary" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
                  // RUNBOOK_EXECUTION_WORKBENCH: {runbook?.name || 'Standard Incident SOP'}
                </h2>
              </div>
              {runbook && (
                <span className="text-[11px] font-mono text-accent-primary">
                  {incident.runbookProgress?.filter((p) => p.status === 'COMPLETED').length || 0} /{' '}
                  {runbook.steps.length} Steps Completed
                </span>
              )}
            </div>

            {!runbook ? (
              <div className="py-6 text-center text-xs font-mono text-text-tertiary">
                No matching playbook template attached to this incident.
              </div>
            ) : (
              <div className="space-y-3.5">
                {runbook.steps.map((step) => {
                  const progress = incident.runbookProgress?.find((p) => p.stepIndex === step.order);
                  const isDone = progress?.status === 'COMPLETED';
                  const isSkipped = progress?.status === 'SKIPPED';

                  return (
                    <div
                      key={step.order}
                      className={`p-4 rounded border transition-all ${
                        isDone
                          ? 'border-accent-success/40 bg-accent-success/5'
                          : isSkipped
                          ? 'border-border-subtle bg-bg-tertiary/20 opacity-60'
                          : 'border-border-default bg-bg-tertiary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xs font-mono text-accent-primary font-bold mt-0.5">
                            #{step.order}
                          </span>
                          <div>
                            <h3 className={`text-xs font-bold ${isDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                              {step.title}
                            </h3>
                            {step.description && (
                              <p className="text-xs text-text-secondary mt-1 font-sans">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                            isDone
                              ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                              : isSkipped
                              ? 'bg-bg-tertiary border-border-subtle text-text-tertiary'
                              : 'bg-severity-p2/10 border-severity-p2/30 text-severity-p2'
                          }`}
                        >
                          {progress?.status || 'PENDING'}
                        </span>
                      </div>

                      {/* Copyable CLI Command Block */}
                      {step.command && (
                        <div className="mt-2.5 p-2 rounded bg-bg-primary border border-border-subtle flex items-center justify-between font-mono text-xs text-accent-primary group">
                          <code className="truncate pr-2">{step.command}</code>
                          <button
                            onClick={() => copyToClipboard(step.command, step.order)}
                            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                            title="Copy command"
                          >
                            {copiedCommand === step.order ? (
                              <Check className="w-3.5 h-3.5 text-accent-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Output or Verification Input */}
                      {!isDone && (
                        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            placeholder="Verification output (e.g. error rate returned to <0.1%)..."
                            value={stepInputs[step.order] || ''}
                            onChange={(e) =>
                              setStepInputs({ ...stepInputs, [step.order]: e.target.value })
                            }
                            className="flex-1 bg-bg-primary border border-border-default focus:border-accent-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleExecuteStep(step.order, 'SKIPPED')}
                              className="px-2.5 py-1.5 rounded text-xs font-mono text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary"
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => handleExecuteStep(step.order, 'COMPLETED')}
                              className="px-3 py-1.5 rounded bg-accent-success hover:bg-accent-success/90 text-bg-primary font-mono text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Execute Step</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Completed summary */}
                      {isDone && progress?.verificationInput && (
                        <div className="mt-2 text-xs font-mono text-accent-success bg-accent-success/5 p-2 rounded border border-accent-success/20">
                          Verified: "{progress.verificationInput}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: REAL-TIME AUDIT TIMELINE */}
        <div className="p-4 rounded-lg bg-bg-secondary/60 border border-border-subtle glass-panel flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
              // AUDIT_TIMELINE_LOG
            </h2>
            <span className="text-[10px] font-mono text-text-tertiary">
              {timeline.length} Events
            </span>
          </div>

          {/* Timeline Feed */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {timeline.length === 0 ? (
              <div className="text-xs font-mono text-text-tertiary text-center py-12">
                No timeline events recorded yet.
              </div>
            ) : (
              timeline.map((event) => {
                const isEscalation = event.type === 'ESCALATION';
                const isStep = event.type === 'RUNBOOK_STEP_EXECUTED';
                const isComment = event.type === 'COMMENT';

                return (
                  <div
                    key={event._id}
                    className={`p-3 rounded border text-xs font-mono space-y-1 ${
                      isEscalation
                        ? 'border-severity-p1/40 bg-severity-p1/10 text-severity-p1'
                        : isStep
                        ? 'border-accent-success/30 bg-accent-success/5 text-text-secondary'
                        : isComment
                        ? 'border-accent-primary/30 bg-accent-primary/5 text-text-primary'
                        : 'border-border-subtle bg-bg-tertiary/30 text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                      <span className="font-semibold text-text-primary">
                        {event.actorName || 'Pulse System'}
                      </span>
                      <span>{formatTime(event.createdAt)}</span>
                    </div>

                    <p className="text-xs font-sans leading-relaxed text-text-primary">
                      {event.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Composer */}
          <form onSubmit={handlePostComment} className="pt-3 border-t border-border-subtle flex gap-2">
            <input
              type="text"
              placeholder="Post tactical update or hypothesis..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-bg-primary border border-border-default focus:border-accent-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
            />
            <button
              type="submit"
              disabled={postingComment || !newComment.trim()}
              className="px-3 py-1.5 rounded bg-accent-primary text-white text-xs font-mono font-bold hover:bg-accent-primary/90 transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>

      {/* Transition Gate Modal */}
      {transitionModalTarget && (
        <TransitionModal
          isOpen={Boolean(transitionModalTarget)}
          onClose={() => setTransitionModalTarget(null)}
          targetStatus={transitionModalTarget}
          currentIncident={incident}
          onSubmit={handleTransition}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

export default IncidentDetailPage;
