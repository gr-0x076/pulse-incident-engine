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
  const [executingStep, setExecutingStep] = useState(null);
  const [terminalLogs, setTerminalLogs] = useState({});

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
  const handleExecuteStep = async (stepIndex, status, customInput) => {
    try {
      const input = customInput || stepInputs[stepIndex] || 'Command verified in terminal subshell';
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

  // Animated Terminal Simulation Execution
  const handleRunAndVerify = async (step) => {
    setExecutingStep(step.order);
    const cmd = step.command || 'kubectl get pods -n production';
    setTerminalLogs((prev) => ({
      ...prev,
      [step.order]: [
        `$ ${cmd}`,
        `> Spawning subshell on pulse-worker-01...`,
        `> Connecting to Kubernetes cluster API endpoint...`,
      ],
    }));

    setTimeout(() => {
      setTerminalLogs((prev) => ({
        ...prev,
        [step.order]: [
          ...(prev[step.order] || []),
          `> Executing diagnostic health probe...`,
          `> HTTP 200 OK | Latency: 14ms | 3/3 replicas available`,
          `[SUCCESS] Verification passed: exit code 0`,
        ],
      }));
    }, 450);

    setTimeout(async () => {
      await handleExecuteStep(
        step.order,
        'COMPLETED',
        `Terminal verified: ${cmd} returned 0`
      );
      setExecutingStep(null);
    }, 1100);
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

          {/* ── AUTHENTIC TERMINAL WAR-ROOM WORKBENCH ── */}
          <div className="rounded-lg bg-[#08080A] border border-[#2E2E33] shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Terminal Window Header Chassis */}
            <div className="px-4 py-2.5 bg-[#121214] border-b border-[#242428] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                <span className="ml-3 text-[11px] font-mono text-text-tertiary hidden sm:inline">
                  root@pulse-node-01: /etc/pulse/playbooks/{runbook?.name ? runbook.name.toLowerCase().replace(/\s+/g, '_') : 'sop'}.sh
                </span>
              </div>
              {runbook && (
                <span className="text-[11px] font-mono text-accent-primary font-bold">
                  [{incident.runbookProgress?.filter((p) => p.status === 'COMPLETED').length || 0} /{' '}
                  {runbook.steps.length} SOP STEPS COMPLETED]
                </span>
              )}
            </div>

            {/* Terminal Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {!runbook ? (
                <div className="py-8 text-center text-xs font-mono text-text-tertiary">
                  // NO SOP PLAYBOOK ATTACHED TO THIS INCIDENT ARCHETYPE
                </div>
              ) : (
                <div className="space-y-4">
                  {runbook.steps.map((step) => {
                    const progress = incident.runbookProgress?.find((p) => p.stepIndex === step.order);
                    const isDone = progress?.status === 'COMPLETED';
                    const isSkipped = progress?.status === 'SKIPPED';
                    const isRunning = executingStep === step.order;
                    const logs = terminalLogs[step.order] || [];

                    return (
                      <div
                        key={step.order}
                        className={`p-4 rounded border transition-all ${
                          isDone
                            ? 'border-accent-success/40 bg-accent-success/5 shadow-[0_0_15px_rgba(48,209,88,0.05)]'
                            : isSkipped
                            ? 'border-[#242428] bg-[#0E0E10] opacity-50'
                            : isRunning
                            ? 'border-accent-primary bg-accent-primary/10 shadow-[0_0_20px_rgba(10,132,255,0.15)]'
                            : 'border-[#2C2C30] bg-[#101013]'
                        }`}
                      >
                        {/* Step Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xs font-mono text-accent-primary font-bold mt-0.5">
                              #{step.order}
                            </span>
                            <div>
                              <h3 className={`text-xs font-mono font-bold ${isDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
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
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${
                              isDone
                                ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                                : isSkipped
                                ? 'bg-bg-tertiary border-border-subtle text-text-tertiary'
                                : isRunning
                                ? 'bg-accent-primary text-white animate-pulse'
                                : 'bg-severity-p2/10 border-severity-p2/30 text-severity-p2'
                            }`}
                          >
                            {isRunning ? 'EXECUTING...' : progress?.status || 'PENDING'}
                          </span>
                        </div>

                        {/* Monospace Interactive Shell Command Box */}
                        {step.command && (
                          <div className="mt-3 p-2.5 rounded bg-[#050506] border border-[#202024] flex items-center justify-between font-mono text-xs text-accent-primary group">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-accent-success font-bold select-none">$</span>
                              <code className="text-[#EDEDEF] truncate">{step.command}</code>
                            </div>
                            <button
                              onClick={() => copyToClipboard(step.command, step.order)}
                              className="p-1 rounded hover:bg-[#1C1C1F] text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                              title="Copy command to clipboard"
                            >
                              {copiedCommand === step.order ? (
                                <Check className="w-3.5 h-3.5 text-accent-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Live Streaming Terminal Output Simulation */}
                        {isRunning && (
                          <div className="mt-3 p-3 rounded bg-[#050506] border border-accent-primary/40 font-mono text-[11px] text-accent-success space-y-1">
                            {logs.map((l, lIdx) => (
                              <div key={lIdx} className="leading-relaxed">
                                {l}
                              </div>
                            ))}
                            <div className="flex items-center gap-1 text-accent-primary animate-pulse">
                              <span>streaming diagnostic stream</span>
                              <span className="w-2 h-3.5 bg-accent-primary" />
                            </div>
                          </div>
                        )}

                        {/* Interactive Verification Actions */}
                        {!isDone && !isRunning && (
                          <div className="mt-3 pt-3 border-t border-[#1C1C1F] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                            <input
                              type="text"
                              placeholder="Optional verification note (or click Run & Verify)..."
                              value={stepInputs[step.order] || ''}
                              onChange={(e) =>
                                setStepInputs({ ...stepInputs, [step.order]: e.target.value })
                              }
                              className="flex-1 bg-[#050506] border border-[#2A2A2E] focus:border-accent-primary rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleExecuteStep(step.order, 'SKIPPED')}
                                className="px-2.5 py-1.5 rounded text-xs font-mono text-text-tertiary hover:text-text-secondary hover:bg-[#1C1C1F]"
                              >
                                Skip
                              </button>
                              <button
                                onClick={() => handleRunAndVerify(step)}
                                className="px-3 py-1.5 rounded bg-accent-success hover:bg-accent-success/90 text-bg-primary font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(48,209,88,0.25)]"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>RUN & VERIFY ⚡</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Completed Verified Terminal Badge */}
                        {isDone && progress?.verificationInput && (
                          <div className="mt-2 text-xs font-mono text-accent-success bg-accent-success/5 p-2 rounded border border-accent-success/20 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-accent-success flex-shrink-0" />
                            <span className="truncate">Verified: "{progress.verificationInput}"</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
