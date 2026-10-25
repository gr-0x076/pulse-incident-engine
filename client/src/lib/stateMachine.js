export const INCIDENT_STATUS = Object.freeze({
  FIRED: 'FIRED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  INVESTIGATING: 'INVESTIGATING',
  ESCALATED: 'ESCALATED',
  MITIGATED: 'MITIGATED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
});

export const VALID_TRANSITIONS = Object.freeze({
  [INCIDENT_STATUS.FIRED]: [INCIDENT_STATUS.ACKNOWLEDGED, INCIDENT_STATUS.ESCALATED],
  [INCIDENT_STATUS.ACKNOWLEDGED]: [INCIDENT_STATUS.INVESTIGATING, INCIDENT_STATUS.ESCALATED],
  [INCIDENT_STATUS.ESCALATED]: [INCIDENT_STATUS.INVESTIGATING],
  [INCIDENT_STATUS.INVESTIGATING]: [INCIDENT_STATUS.MITIGATED, INCIDENT_STATUS.ESCALATED],
  [INCIDENT_STATUS.MITIGATED]: [INCIDENT_STATUS.RESOLVED],
  [INCIDENT_STATUS.RESOLVED]: [INCIDENT_STATUS.CLOSED],
  [INCIDENT_STATUS.CLOSED]: [],
});

export const ROOT_CAUSE_CATEGORIES = Object.freeze([
  'CODE',
  'INFRA',
  'CONFIG',
  'DEPENDENCY',
  'HUMAN',
  'UNKNOWN',
]);

export const getValidTransitions = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

export const canTransition = (currentStatus, targetStatus) => {
  return getValidTransitions(currentStatus).includes(targetStatus);
};

// Ordered pipeline for visual state machine display
export const STATUS_PIPELINE = [
  INCIDENT_STATUS.FIRED,
  INCIDENT_STATUS.ACKNOWLEDGED,
  INCIDENT_STATUS.INVESTIGATING,
  INCIDENT_STATUS.MITIGATED,
  INCIDENT_STATUS.RESOLVED,
  INCIDENT_STATUS.CLOSED,
];

// Display labels for statuses
export const STATUS_LABELS = {
  [INCIDENT_STATUS.FIRED]: 'Fired',
  [INCIDENT_STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [INCIDENT_STATUS.INVESTIGATING]: 'Investigating',
  [INCIDENT_STATUS.ESCALATED]: 'Escalated',
  [INCIDENT_STATUS.MITIGATED]: 'Mitigated',
  [INCIDENT_STATUS.RESOLVED]: 'Resolved',
  [INCIDENT_STATUS.CLOSED]: 'Closed',
};

// Color mapping for each status
export const STATUS_COLORS = {
  [INCIDENT_STATUS.FIRED]: 'text-severity-p1 bg-severity-p1/10 border-severity-p1/20',
  [INCIDENT_STATUS.ACKNOWLEDGED]: 'text-severity-p2 bg-severity-p2/10 border-severity-p2/20',
  [INCIDENT_STATUS.INVESTIGATING]: 'text-accent-primary bg-accent-primary/10 border-accent-primary/20',
  [INCIDENT_STATUS.ESCALATED]: 'text-severity-p1 bg-severity-p1/10 border-severity-p1/20',
  [INCIDENT_STATUS.MITIGATED]: 'text-severity-p2 bg-severity-p2/10 border-severity-p2/20',
  [INCIDENT_STATUS.RESOLVED]: 'text-accent-success bg-accent-success/10 border-accent-success/20',
  [INCIDENT_STATUS.CLOSED]: 'text-text-secondary bg-bg-tertiary border-border-subtle',
};

export const SEVERITY_LABELS = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Moderate',
  P4: 'Low',
};

export const SEVERITY_COLORS = {
  P1: 'text-severity-p1',
  P2: 'text-severity-p2',
  P3: 'text-severity-p3',
  P4: 'text-severity-p4',
};

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  INCIDENT_COMMANDER: 'INCIDENT_COMMANDER',
  RESPONDER: 'RESPONDER',
  VIEWER: 'VIEWER',
});

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.INCIDENT_COMMANDER]: 'Incident Commander',
  [ROLES.RESPONDER]: 'Responder',
  [ROLES.VIEWER]: 'Viewer',
};
