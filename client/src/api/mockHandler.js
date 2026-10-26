import {
  INITIAL_ORG,
  INITIAL_USERS,
  INITIAL_RUNBOOKS,
  INITIAL_INCIDENTS,
  INITIAL_TIMELINE,
  INITIAL_POSTMORTEMS,
} from './mockData';

// Helper to get / set state in localStorage
const getStorageItem = (key, fallback) => {
  try {
    const saved = localStorage.getItem(`pulse_mock_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(`pulse_mock_${key}`, JSON.stringify(value));
  } catch (e) {}
};

// State caches
let org = getStorageItem('org', INITIAL_ORG);
let users = getStorageItem('users', INITIAL_USERS);
let runbooks = getStorageItem('runbooks', INITIAL_RUNBOOKS);
let incidents = getStorageItem('incidents', INITIAL_INCIDENTS);
let timelines = getStorageItem('timelines', INITIAL_TIMELINE);
let postmortems = getStorageItem('postmortems', INITIAL_POSTMORTEMS);

// Broadcast custom simulated socket event
export const dispatchMockEvent = (eventName, data) => {
  try {
    const event = new CustomEvent('pulse:mock-event', {
      detail: { event: eventName, data },
    });
    window.dispatchEvent(event);
  } catch (e) {}
};

export const handleMockRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  let url = config.url || '';

  // Strip baseURL or leading slash
  url = url.replace(/^https?:\/\/[^/]+/, '');
  url = url.replace(/^\/?api\/?/, '/');
  if (!url.startsWith('/')) url = '/' + url;

  let body = {};
  if (config.data) {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  }

  // 1. Auth: /auth/login
  if (url === '/auth/login' && method === 'post') {
    const email = (body.email || '').toLowerCase().trim();
    const user = users.find((u) => u.email.toLowerCase() === email) || users[0];
    const session = {
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: org.id,
      },
      organization: org,
      tokens: {
        accessToken: `mock_jwt_access_${user.role}`,
        refreshToken: `mock_jwt_refresh_${user.role}`,
      },
    };
    return { success: true, data: session };
  }

  // 2. Auth: /auth/demo-switch
  if (url === '/auth/demo-switch' && method === 'post') {
    const targetRole = body.role || 'ADMIN';
    const user = users.find((u) => u.role === targetRole) || users[0];
    const session = {
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: org.id,
      },
      organization: org,
      tokens: {
        accessToken: `mock_jwt_access_${user.role}`,
        refreshToken: `mock_jwt_refresh_${user.role}`,
      },
    };
    return { success: true, data: session };
  }

  // 3. Auth: /auth/me
  if (url === '/auth/me' && method === 'get') {
    const savedUser = localStorage.getItem('pulse_user');
    const currentUser = savedUser ? JSON.parse(savedUser) : users[0];
    return {
      success: true,
      data: {
        ...currentUser,
        organization: org,
      },
    };
  }

  // 4. Auth: /auth/register
  if (url === '/auth/register' && method === 'post') {
    const newOrg = {
      id: `org_${Date.now()}`,
      name: body.orgName || 'Acme SRE',
      slug: body.orgSlug || 'acme-sre',
      settings: org.settings,
    };
    const newUser = {
      id: `usr_${Date.now()}`,
      name: body.name || 'Admin Officer',
      email: body.email,
      role: 'ADMIN',
      orgId: newOrg.id,
    };
    org = newOrg;
    users = [newUser, ...users];
    setStorageItem('org', org);
    setStorageItem('users', users);
    const session = {
      user: newUser,
      organization: newOrg,
      tokens: {
        accessToken: `mock_jwt_${newUser.id}`,
        refreshToken: `mock_jwt_ref_${newUser.id}`,
      },
    };
    return { success: true, data: session };
  }

  // 5. Incidents: GET /incidents
  if (url === '/incidents' && method === 'get') {
    return { success: true, data: incidents };
  }

  // 6. Incidents: GET /incidents/:id
  const incidentMatch = url.match(/^\/incidents\/([^/]+)$/);
  if (incidentMatch && method === 'get') {
    const id = incidentMatch[1];
    const incident = incidents.find((i) => i._id === id || i.id === id);
    if (!incident) {
      return { success: false, error: { message: 'Incident not found' } };
    }
    const timeline = timelines[incident._id] || timelines[incident.id] || [];
    return {
      success: true,
      data: {
        ...incident,
        timeline,
      },
    };
  }

  // 7. Incidents: POST /incidents (Declare Incident)
  if (url === '/incidents' && method === 'post') {
    const newNum = incidents.length + 1;
    const newInc = {
      _id: `inc_${Date.now()}`,
      id: `inc_${Date.now()}`,
      incidentNumber: newNum,
      title: body.title || 'Untitled Incident',
      description: body.description || '',
      severity: body.severity || 'P2',
      service: body.service || 'api-gateway',
      status: 'FIRED',
      commanderId: null,
      commander: null,
      responderId: null,
      responder: null,
      orgId: org.id,
      runbookId: runbooks[0]._id,
      runbook: runbooks[0],
      runbookProgress: [],
      slaDeadline: new Date(Date.now() + 15 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    incidents = [newInc, ...incidents];
    setStorageItem('incidents', incidents);
    timelines[newInc._id] = [
      {
        _id: `evt_${Date.now()}`,
        incidentId: newInc._id,
        actorName: 'Pulse Console',
        type: 'FIRED',
        content: `Incident declared manually: [${newInc.severity}] ${newInc.title}`,
        createdAt: new Date().toISOString(),
      },
    ];
    setStorageItem('timelines', timelines);
    dispatchMockEvent('incident:created', newInc);
    return { success: true, data: newInc };
  }

  // 8. Incidents: POST /incidents/:id/transition
  const transitionMatch = url.match(/^\/incidents\/([^/]+)\/transition$/);
  if (transitionMatch && method === 'post') {
    const id = transitionMatch[1];
    const incIndex = incidents.findIndex((i) => i._id === id || i.id === id);
    if (incIndex === -1) return { success: false, error: { message: 'Incident not found' } };

    const inc = incidents[incIndex];
    const targetStatus = body.status;
    const updated = {
      ...inc,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
      version: (inc.version || 1) + 1,
    };

    if (targetStatus === 'ACKNOWLEDGED') {
      updated.acknowledgedAt = new Date().toISOString();
    } else if (targetStatus === 'MITIGATED') {
      updated.mitigatedAt = new Date().toISOString();
      if (body.mitigationSummary) updated.mitigationSummary = body.mitigationSummary;
    } else if (targetStatus === 'RESOLVED') {
      updated.resolvedAt = new Date().toISOString();
      if (body.rootCause) updated.rootCause = body.rootCause;
    }

    incidents[incIndex] = updated;
    setStorageItem('incidents', incidents);

    const eventContent =
      targetStatus === 'ACKNOWLEDGED'
        ? 'Incident acknowledged. SLA countdown halted.'
        : targetStatus === 'MITIGATED'
        ? `Incident mitigated: "${body.mitigationSummary || 'Mitigation applied'}"`
        : targetStatus === 'RESOLVED'
        ? `Incident resolved. Root cause: [${body.rootCause?.category || 'CODE'}] ${body.rootCause?.description || ''}`
        : `Status transitioned to ${targetStatus}`;

    const newEvt = {
      _id: `evt_${Date.now()}`,
      incidentId: id,
      actorName: 'Operator',
      type: targetStatus,
      content: eventContent,
      createdAt: new Date().toISOString(),
    };

    timelines[id] = [...(timelines[id] || []), newEvt];
    setStorageItem('timelines', timelines);
    dispatchMockEvent('incident:transitioned', updated);
    return { success: true, data: updated };
  }

  // 9. Incidents: PATCH /incidents/:id/runbook/steps/:stepIndex
  const stepMatch = url.match(/^\/incidents\/([^/]+)\/runbook\/steps\/(\d+)$/);
  if (stepMatch && method === 'patch') {
    const id = stepMatch[1];
    const stepOrder = parseInt(stepMatch[2], 10);
    const incIndex = incidents.findIndex((i) => i._id === id || i.id === id);
    if (incIndex === -1) return { success: false, error: { message: 'Incident not found' } };

    const inc = incidents[incIndex];
    const existingProgress = [...(inc.runbookProgress || [])];
    const pIndex = existingProgress.findIndex((p) => p.stepIndex === stepOrder);
    const newProgressItem = {
      stepIndex: stepOrder,
      status: body.status || 'COMPLETED',
      verificationInput: body.verificationInput || 'Command verified',
      executedAt: new Date().toISOString(),
    };

    if (pIndex > -1) {
      existingProgress[pIndex] = newProgressItem;
    } else {
      existingProgress.push(newProgressItem);
    }

    const updated = {
      ...inc,
      runbookProgress: existingProgress,
      updatedAt: new Date().toISOString(),
    };
    incidents[incIndex] = updated;
    setStorageItem('incidents', incidents);

    const newEvt = {
      _id: `evt_${Date.now()}`,
      incidentId: id,
      actorName: 'Operator',
      type: 'RUNBOOK_STEP_EXECUTED',
      content: `Runbook Step #${stepOrder} ${body.status || 'COMPLETED'}: "${body.verificationInput || 'Executed via Terminal'}"`,
      createdAt: new Date().toISOString(),
    };
    timelines[id] = [...(timelines[id] || []), newEvt];
    setStorageItem('timelines', timelines);
    return { success: true, data: updated };
  }

  // 10. Incidents: POST /incidents/:id/timeline/comment
  const commentMatch = url.match(/^\/incidents\/([^/]+)\/timeline\/comment$/);
  if (commentMatch && method === 'post') {
    const id = commentMatch[1];
    const newEvt = {
      _id: `evt_${Date.now()}`,
      incidentId: id,
      actorName: 'Operator',
      type: 'COMMENT',
      content: body.content || '',
      createdAt: new Date().toISOString(),
    };
    timelines[id] = [...(timelines[id] || []), newEvt];
    setStorageItem('timelines', timelines);
    return { success: true, data: newEvt };
  }

  // 11. Chaos / Webhook simulation: POST /webhooks/simulate
  if (url === '/webhooks/simulate' && method === 'post') {
    const presets = {
      'api-gateway-5xx': {
        title: 'API Gateway Elevated 502 Bad Gateway Error Spike',
        description: 'Edge nodes returning 502 Bad Gateway responses on customer endpoints.',
        severity: 'P1',
        service: 'api-gateway',
      },
      'db-pool-exhaustion': {
        title: 'Primary PostgreSQL Connection Pool Starvation & Hang',
        description: 'Postgres primary reached 98% of max_connections limit. Backend worker pools are dropping transactions.',
        severity: 'P1',
        service: 'database',
      },
      'stripe-timeout': {
        title: 'Stripe Webhook Delivery Degradation & Checkout Callback Timeout',
        description: 'Inbound Stripe webhook callbacks are experiencing 4.8s response latencies.',
        severity: 'P2',
        service: 'payments',
      },
      'alert-storm': {
        title: 'Cascading Dependency Timeout across Auth Cluster and Microservices',
        description: 'Inter-service RPC timeouts causing cascading circuit breaker trips.',
        severity: 'P1',
        service: 'auth-cluster',
      },
    };

    const chosen = presets[body.preset] || presets['api-gateway-5xx'];
    const newInc = {
      _id: `inc_${Date.now()}`,
      id: `inc_${Date.now()}`,
      incidentNumber: incidents.length + 1,
      title: `[SIMULATED] ${chosen.title}`,
      description: chosen.description,
      severity: chosen.severity,
      service: chosen.service,
      status: 'FIRED',
      commanderId: null,
      commander: null,
      responderId: null,
      responder: null,
      orgId: org.id,
      runbookId: runbooks[0]._id,
      runbook: runbooks[0],
      runbookProgress: [],
      slaDeadline: new Date(Date.now() + 5 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    incidents = [newInc, ...incidents];
    setStorageItem('incidents', incidents);

    timelines[newInc._id] = [
      {
        _id: `evt_${Date.now()}`,
        incidentId: newInc._id,
        actorName: 'Chaos Engine',
        type: 'FIRED',
        content: `Chaos Outage Ingested: [${newInc.severity}] ${newInc.title}`,
        createdAt: new Date().toISOString(),
      },
    ];
    setStorageItem('timelines', timelines);
    dispatchMockEvent('incident:created', newInc);
    return { success: true, data: newInc };
  }

  // 12. Analytics: GET /analytics/overview
  if (url === '/analytics/overview' && method === 'get') {
    const total = incidents.length;
    const resolved = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
    const active = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

    return {
      success: true,
      data: {
        summary: {
          totalIncidents: total,
          activeIncidents: active,
          resolvedIncidents: resolved,
          slaBreachCount: 1,
          slaBreachRate: 5.8,
        },
        mtta: {
          avgMinutes: 3.2,
          minMinutes: 1,
          maxMinutes: 7,
        },
        mttr: {
          avgMinutes: 48,
          minMinutes: 12,
          maxMinutes: 115,
        },
        severityBreakdown: [
          { _id: 'P1', count: incidents.filter((i) => i.severity === 'P1').length },
          { _id: 'P2', count: incidents.filter((i) => i.severity === 'P2').length },
          { _id: 'P3', count: incidents.filter((i) => i.severity === 'P3').length },
          { _id: 'P4', count: incidents.filter((i) => i.severity === 'P4').length },
        ],
        rootCauseBreakdown: [
          { _id: 'CODE', count: 3 },
          { _id: 'CONFIG', count: 2 },
          { _id: 'INFRA', count: 1 },
          { _id: 'DEPENDENCY', count: 1 },
        ],
        timelineVolume: [
          { _id: '2026-10-20', count: 2, p1Count: 0 },
          { _id: '2026-10-21', count: 3, p1Count: 1 },
          { _id: '2026-10-22', count: 1, p1Count: 0 },
          { _id: '2026-10-23', count: 4, p1Count: 1 },
          { _id: '2026-10-24', count: 2, p1Count: 0 },
          { _id: '2026-10-25', count: 5, p1Count: 2 },
          { _id: '2026-10-26', count: total, p1Count: 2 },
        ],
        responderWorkload: users.map((u) => ({
          _id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          count: u.activeIncidentCount || 1,
        })),
      },
    };
  }

  // 13. Postmortems: GET /postmortems
  if (url === '/postmortems' && method === 'get') {
    return { success: true, data: postmortems };
  }

  // 14. Postmortems: POST /postmortems
  if (url === '/postmortems' && method === 'post') {
    const newPm = {
      _id: `pm_${Date.now()}`,
      id: `pm_${Date.now()}`,
      incidentId: body.incidentId,
      incident: incidents.find((i) => i._id === body.incidentId) || incidents[0],
      orgId: org.id,
      title: body.title || 'Incident Retrospective Postmortem',
      summary: body.summary || '',
      status: 'DRAFT',
      impact: body.impact || { durationMinutes: 30, affectedServices: ['api-gateway'] },
      rootCause: body.rootCause || { category: 'CODE', description: '' },
      lessonsLearned: body.lessonsLearned || '',
      actionItems: body.actionItems || [],
      createdAt: new Date().toISOString(),
    };
    postmortems = [newPm, ...postmortems];
    setStorageItem('postmortems', postmortems);
    return { success: true, data: newPm };
  }

  // 15. Postmortems: PUT /postmortems/:id
  const pmMatch = url.match(/^\/postmortems\/([^/]+)$/);
  if (pmMatch && method === 'put') {
    const id = pmMatch[1];
    const index = postmortems.findIndex((p) => p._id === id || p.id === id);
    if (index > -1) {
      postmortems[index] = { ...postmortems[index], ...body, updatedAt: new Date().toISOString() };
      setStorageItem('postmortems', postmortems);
      return { success: true, data: postmortems[index] };
    }
  }

  // 16. Postmortems: POST /postmortems/:id/publish
  const pmPubMatch = url.match(/^\/postmortems\/([^/]+)\/publish$/);
  if (pmPubMatch && method === 'post') {
    const id = pmPubMatch[1];
    const index = postmortems.findIndex((p) => p._id === id || p.id === id);
    if (index > -1) {
      postmortems[index].status = 'PUBLISHED';
      postmortems[index].publishedAt = new Date().toISOString();
      setStorageItem('postmortems', postmortems);
      return { success: true, data: postmortems[index] };
    }
  }

  // 17. Team: GET /org/team
  if (url === '/org/team' && method === 'get') {
    return {
      success: true,
      data: {
        members: users,
        invites: [
          {
            _id: 'inv_01',
            email: 'devops-lead@acme.dev',
            role: 'RESPONDER',
            expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };
  }

  // 18. Org Settings: GET /org/settings
  if (url === '/org/settings' && method === 'get') {
    return { success: true, data: org };
  }

  // 19. Invites: POST /invites
  if (url === '/invites' && method === 'post') {
    const token = `inv_${Math.random().toString(36).substring(2, 10)}`;
    const newInv = {
      token,
      email: body.email,
      role: body.role,
      inviteUrl: `${window.location.origin}/invite/${token}`,
    };
    return { success: true, data: newInv };
  }

  // 20. Invites: GET /invites/:token
  const invGetMatch = url.match(/^\/invites\/([^/]+)$/);
  if (invGetMatch && method === 'get') {
    return {
      success: true,
      data: {
        token: invGetMatch[1],
        email: 'responder@acme.dev',
        role: 'RESPONDER',
        orgId: org,
      },
    };
  }

  // 21. Invites: POST /invites/accept
  if (url === '/invites/accept' && method === 'post') {
    const newUser = {
      id: `usr_${Date.now()}`,
      name: body.name || 'Commissioned Officer',
      email: 'officer@acme.dev',
      role: 'RESPONDER',
      orgId: org.id,
    };
    users = [...users, newUser];
    setStorageItem('users', users);
    return {
      success: true,
      data: {
        user: newUser,
        organization: org,
        tokens: {
          accessToken: `mock_jwt_${newUser.id}`,
          refreshToken: `mock_jwt_ref_${newUser.id}`,
        },
      },
    };
  }

  // Default fallback for any unmatched route
  return { success: true, data: [] };
};
