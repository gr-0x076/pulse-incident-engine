/**
 * Pulse In-Browser Sandbox Engine
 * High-fidelity, zero-auto-login fallback engine for standalone preview & offline evaluation.
 * Mirrors Express REST API contracts, OCC version checking, runbook execution, and state machines.
 */

const STORAGE_KEY = 'pulse_sandbox_store_v1';

const SEED_ORG = {
  id: 'org_acme_01',
  _id: 'org_acme_01',
  name: 'Acme Engineering',
  slug: 'acme-engineering',
  settings: {
    sla: {
      p1AcknowledgeMinutes: 15,
      p2AcknowledgeMinutes: 30,
      p3AcknowledgeMinutes: 60,
      p4AcknowledgeMinutes: 240,
    },
  },
};

const SEED_USERS = [
  {
    id: 'usr_admin_01',
    _id: 'usr_admin_01',
    orgId: 'org_acme_01',
    name: 'Sarah Chen',
    email: 'admin@acme.dev',
    role: 'ADMIN',
    activeIncidentCount: 0,
  },
  {
    id: 'usr_commander_01',
    _id: 'usr_commander_01',
    orgId: 'org_acme_01',
    name: 'Alex Rivera',
    email: 'commander@acme.dev',
    role: 'INCIDENT_COMMANDER',
    activeIncidentCount: 2,
  },
  {
    id: 'usr_responder_01',
    _id: 'usr_responder_01',
    orgId: 'org_acme_01',
    name: 'Marcus Vance',
    email: 'responder@acme.dev',
    role: 'RESPONDER',
    activeIncidentCount: 3,
  },
  {
    id: 'usr_viewer_01',
    _id: 'usr_viewer_01',
    orgId: 'org_acme_01',
    name: 'Elena Rostova',
    email: 'viewer@acme.dev',
    role: 'VIEWER',
    activeIncidentCount: 0,
  },
];

const SEED_RUNBOOKS = [
  {
    _id: 'rb_api_01',
    id: 'rb_api_01',
    orgId: 'org_acme_01',
    name: 'API Gateway 5xx Spike Playbook',
    description: 'Standard operating procedure for diagnosing and mitigating elevated HTTP 5xx error rates across API gateway clusters.',
    matchCriteria: {
      keywords: ['5xx', 'gateway', 'api'],
      services: ['api-gateway'],
      severities: ['P1', 'P2'],
    },
    steps: [
      {
        order: 1,
        title: 'Check Grafana API Gateway Dashboard',
        description: 'Inspect real-time HTTP 5xx error percentages, request distribution across AZs, and upstream target health.',
        command: 'curl -s "http://grafana.internal:3000/api/dashboards/uid/api-gw-status" | jq .dashboard.panels[0].targets',
        requiresVerification: true,
        verificationPrompt: 'Paste current 5xx error percentage across all edge clusters',
        isOptional: false,
      },
      {
        order: 2,
        title: 'Inspect API Gateway Upstream Error Logs',
        description: 'Query production error logs to isolate failing routes, upstream endpoints, and correlate HTTP status codes (502 Bad Gateway vs 504 Gateway Timeout).',
        command: 'kubectl logs -l app=api-gateway -n production --tail=250 --since=15m | grep -E "502|503|504"',
        requiresVerification: false,
        isOptional: false,
      },
      {
        order: 3,
        title: 'Verify Upstream Microservice Health Checks',
        description: 'Perform health probe queries directly against auth-service, order-service, and billing-service endpoints behind the gateway.',
        command: 'curl -sv --connect-timeout 2 http://upstream-auth.internal/healthz && curl -sv --connect-timeout 2 http://upstream-billing.internal/healthz',
        requiresVerification: true,
        verificationPrompt: 'Confirm which upstream microservices responded with HTTP 200 vs timeouts',
        isOptional: false,
      },
      {
        order: 4,
        title: 'Rollback Latest Canary or Active Deployment',
        description: 'If elevated errors correlate with a recent release within the last 30 minutes, immediately initiate deployment rollback.',
        command: 'kubectl rollout undo deployment/api-gateway -n production && kubectl rollout status deployment/api-gateway -n production',
        requiresVerification: true,
        verificationPrompt: 'Enter rollback revision ID and confirmation status',
        isOptional: false,
      },
      {
        order: 5,
        title: 'Verify Error Rate Recovery to Baseline (< 0.1%)',
        description: 'Ensure the 5xx anomaly has subsided and traffic has stabilized below SLA error budget thresholds.',
        command: 'promtool query instant http://prometheus.internal:9090 \'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100\'',
        requiresVerification: true,
        verificationPrompt: 'Confirm error rate is below 0.1% for at least 3 consecutive minutes',
        isOptional: false,
      },
      {
        order: 6,
        title: 'Update Public Status Page with Recovery Status',
        description: 'Post customer-facing incident update communicating that services are operating normally and monitoring is ongoing.',
        command: 'curl -X POST https://status.acme.dev/api/v1/incidents/update -H "Authorization: Bearer $STATUSPAGE_TOKEN" -d \'{"status":"monitoring","message":"Incident mitigated. Core gateway traffic stabilized."}\'',
        requiresVerification: false,
        isOptional: true,
      },
    ],
  },
  {
    _id: 'rb_db_02',
    id: 'rb_db_02',
    orgId: 'org_acme_01',
    name: 'Database Connection Pool Exhaustion Playbook',
    description: 'Emergency runbook for resolving database connection saturation, hung transaction threads, and connection pool starvation.',
    matchCriteria: {
      keywords: ['database', 'connection', 'pool', 'timeout'],
      services: ['database', 'postgres'],
      severities: ['P1', 'P2'],
    },
    steps: [
      {
        order: 1,
        title: 'Check Active Connection Count and Pool Saturation',
        description: 'Query database connection telemetry and PgBouncer pool utilization metrics.',
        command: 'psql $DATABASE_PRIMARY_URL -c "SELECT count(*), state, application_name FROM pg_stat_activity GROUP BY state, application_name ORDER BY count DESC;"',
        requiresVerification: true,
        verificationPrompt: 'Enter current active connections count and maximum permitted connections',
        isOptional: false,
      },
      {
        order: 2,
        title: 'Identify Long-Running or Blocking Queries',
        description: 'Detect slow queries, lock contention, and unindexed full-table scans holding open connections.',
        command: 'psql $DATABASE_PRIMARY_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != \'idle\' AND now() - query_start > interval \'30 seconds\' ORDER BY duration DESC LIMIT 10;"',
        requiresVerification: false,
        isOptional: false,
      },
      {
        order: 3,
        title: 'Terminate Non-Critical Zombie Transactions',
        description: 'Terminate orphaned or hung backend transactions that exceed idle-in-transaction limits.',
        command: 'psql $DATABASE_PRIMARY_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle in transaction\' AND query_start < now() - interval \'3 minutes\';"',
        requiresVerification: true,
        verificationPrompt: 'Specify number of terminated backend PID processes',
        isOptional: false,
      },
      {
        order: 4,
        title: 'Increase PgBouncer Pool Limits or Scale Read Replicas',
        description: 'Temporarily expand connection pool caps or shift read traffic to auxiliary replicas to relieve primary pressure.',
        command: 'kubectl set env deployment/pgbouncer POOL_SIZE=150 MAX_CLIENT_CONN=2000 -n production && kubectl rollout restart deployment/pgbouncer -n production',
        requiresVerification: false,
        isOptional: true,
      },
      {
        order: 5,
        title: 'Monitor Connection Pool Saturation Recovery Below 70%',
        description: 'Verify connection pooling drops below critical saturation threshold and application latency normalizes.',
        command: 'promtool query instant http://prometheus.internal:9090 \'avg(pg_stat_database_numbackends / pg_settings_max_connections * 100)\'',
        requiresVerification: true,
        verificationPrompt: 'Confirm connection pool saturation is below 70%',
        isOptional: false,
      },
    ],
  },
  {
    _id: 'rb_pay_03',
    id: 'rb_pay_03',
    orgId: 'org_acme_01',
    name: 'Payment Processing Failure Playbook',
    description: 'Triage and remediation procedures for payment gateway failures, webhook drops, and checkout transaction disruptions.',
    matchCriteria: {
      keywords: ['payment', 'stripe', 'checkout', 'transaction'],
      services: ['payments', 'stripe'],
      severities: ['P1', 'P2', 'P3'],
    },
    steps: [
      {
        order: 1,
        title: 'Check Payment Gateway Provider Status',
        description: 'Query upstream Stripe API and public status page for global degraded performance or regional downtime.',
        command: 'curl -s https://status.stripe.com/api/v2/status.json | jq \'{status: .status.description, indicator: .status.indicator}\'',
        requiresVerification: true,
        verificationPrompt: 'Record provider health status output',
        isOptional: false,
      },
      {
        order: 2,
        title: 'Verify Webhook Ingestion Endpoint Latency',
        description: 'Check inbound payment webhook delivery latencies and HTTP status distribution from edge proxies.',
        command: 'curl -Iv https://api.acme.dev/webhooks/stripe --connect-timeout 3',
        requiresVerification: false,
        isOptional: false,
      },
      {
        order: 3,
        title: 'Inspect Recent Payment Failure Logs',
        description: 'Extract decline codes, error stacks, and connection timeout rates in payment microservices.',
        command: 'kubectl logs -l app=payment-service -n production --tail=300 --since=20m | grep -i "stripe_error\\|timeout\\|card_declined"',
        requiresVerification: true,
        verificationPrompt: 'Summarize predominant error code (e.g. rate_limit, upstream_500, network_error)',
        isOptional: false,
      },
      {
        order: 4,
        title: 'Failover to Secondary Payment Gateway',
        description: 'Shift new checkout transactions to backup payment processing provider (Adyen) via feature flag switch.',
        command: 'curl -X POST http://feature-flag-engine.internal/api/flags/payment_gateway_provider/toggle -H "Content-Type: application/json" -d \'{"value":"adyen_secondary","targetPercentage":100}\'',
        requiresVerification: true,
        verificationPrompt: 'Confirm secondary gateway routing ratio is set to 100%',
        isOptional: false,
      },
    ],
  },
];

const now = Date.now();
const tMinus = (m) => new Date(now - m * 60 * 1000).toISOString();

const SEED_INCIDENTS = [
  {
    _id: 'inc_01',
    id: 'inc_01',
    orgId: 'org_acme_01',
    incidentNumber: 1,
    title: 'API Gateway returning 503 — 5xx rate at 12%',
    description: 'Production edge Envoy proxies are rejecting incoming traffic with HTTP 503 Service Unavailable. Global 5xx error rate has surged past 12%, impacting all inbound client requests across North America and Europe.',
    severity: 'P1',
    status: 'FIRED',
    version: 1,
    createdBy: SEED_USERS[0],
    commander: null,
    responders: [],
    runbookId: SEED_RUNBOOKS[0],
    runbookProgress: SEED_RUNBOOKS[0].steps.map((s) => ({
      stepIndex: s.order,
      status: 'PENDING',
      verificationInput: '',
    })),
    createdAt: tMinus(0.5),
    updatedAt: tMinus(0.5),
  },
  {
    _id: 'inc_02',
    id: 'inc_02',
    orgId: 'org_acme_01',
    incidentNumber: 2,
    title: 'CSS assets 404 on production /settings page',
    description: 'Static stylesheet chunk settings.chunk.38dfa1.css is returning HTTP 404 Not Found after the latest asset CDN purge. UI layout on user settings page appears unstyled for ~3% of active sessions.',
    severity: 'P3',
    status: 'FIRED',
    version: 1,
    createdBy: SEED_USERS[3],
    commander: null,
    responders: [],
    runbookId: null,
    runbookProgress: [],
    createdAt: tMinus(18),
    updatedAt: tMinus(18),
  },
  {
    _id: 'inc_03',
    id: 'inc_03',
    orgId: 'org_acme_01',
    incidentNumber: 3,
    title: 'CDN cache invalidation failing for /api/v2/*',
    description: 'Automated cache purge hooks triggering from CI/CD deploy pipeline are timing out against Cloudflare API. Stale cached schema responses are being served for dynamic entity queries.',
    severity: 'P2',
    status: 'ACKNOWLEDGED',
    version: 2,
    createdBy: SEED_USERS[0],
    commander: null,
    responders: [SEED_USERS[2]],
    acknowledgedAt: tMinus(25),
    runbookId: null,
    runbookProgress: [],
    createdAt: tMinus(38),
    updatedAt: tMinus(25),
  },
  {
    _id: 'inc_04',
    id: 'inc_04',
    orgId: 'org_acme_01',
    incidentNumber: 4,
    title: 'Payment webhook timeout affecting checkout flow',
    description: 'Inbound asynchronous payment fulfillment webhooks are failing with gateway socket timeouts. Customer orders are getting stuck in PENDING_PAYMENT state despite card authorization success.',
    severity: 'P1',
    status: 'INVESTIGATING',
    version: 4,
    createdBy: SEED_USERS[0],
    commander: SEED_USERS[1],
    responders: [SEED_USERS[2]],
    acknowledgedAt: tMinus(68),
    runbookId: SEED_RUNBOOKS[2],
    runbookProgress: [
      {
        stepIndex: 1,
        status: 'COMPLETED',
        completedBy: SEED_USERS[1]._id,
        completedAt: tMinus(52),
        verificationInput: 'Stripe API reporting elevated latency (> 4200ms) in US-East-1 availability zone; status degraded.',
      },
      {
        stepIndex: 2,
        status: 'COMPLETED',
        completedBy: SEED_USERS[2]._id,
        completedAt: tMinus(41),
        verificationInput: 'Edge TLS verification passed. Node worker pool connection queue at 98% capacity.',
      },
      {
        stepIndex: 3,
        status: 'COMPLETED',
        completedBy: SEED_USERS[2]._id,
        completedAt: tMinus(22),
        verificationInput: 'Identified retry storm: 1,450 concurrent webhook retries backed up in SQS dead-letter queue.',
      },
      {
        stepIndex: 4,
        status: 'PENDING',
        verificationInput: '',
      },
    ],
    createdAt: tMinus(75),
    updatedAt: tMinus(22),
  },
  {
    _id: 'inc_05',
    id: 'inc_05',
    orgId: 'org_acme_01',
    incidentNumber: 5,
    title: 'User authentication service latency spike (>2s p99)',
    description: 'Auth microservice p99 response time has breached 2,400ms (SLA threshold is 250ms). Session token validation requests are queuing up, cascading latency downstream to API clients.',
    severity: 'P1',
    status: 'ESCALATED',
    version: 3,
    createdBy: SEED_USERS[0],
    commander: SEED_USERS[1],
    responders: [SEED_USERS[2]],
    slaBreachedAt: tMinus(118),
    runbookId: null,
    runbookProgress: [],
    createdAt: tMinus(125),
    updatedAt: tMinus(118),
  },
  {
    _id: 'inc_06',
    id: 'inc_06',
    orgId: 'org_acme_01',
    incidentNumber: 6,
    title: 'Elasticsearch cluster yellow — disk watermark breach',
    description: 'High storage utilization on Elasticsearch primary data node es-data-02 triggered low disk watermark threshold (>85%). Cluster status turned YELLOW and shard allocation was temporarily disabled.',
    severity: 'P2',
    status: 'MITIGATED',
    version: 4,
    createdBy: SEED_USERS[0],
    commander: SEED_USERS[1],
    responders: [SEED_USERS[2]],
    mitigationSummary: 'Purged raw debug logs older than 14 days and expanded AWS EBS data volume from 500GB to 1TB. Cluster health transitioned to green; shard rebalancing active.',
    acknowledgedAt: tMinus(340),
    mitigatedAt: tMinus(260),
    runbookId: null,
    runbookProgress: [],
    createdAt: tMinus(360),
    updatedAt: tMinus(260),
  },
  {
    _id: 'inc_07',
    id: 'inc_07',
    orgId: 'org_acme_01',
    incidentNumber: 7,
    title: 'Database connection pool exhaustion — primary replica',
    description: 'Backend PostgreSQL connection pool reached 100% capacity (500/500 connections). Application servers received "remaining connection slots are reserved for non-replication superuser connections" errors.',
    severity: 'P1',
    status: 'RESOLVED',
    version: 6,
    createdBy: SEED_USERS[0],
    commander: SEED_USERS[1],
    responders: [SEED_USERS[2]],
    runbookId: SEED_RUNBOOKS[1],
    runbookProgress: SEED_RUNBOOKS[1].steps.map((s, idx) => ({
      stepIndex: s.order,
      status: 'COMPLETED',
      completedBy: idx % 2 === 0 ? SEED_USERS[1]._id : SEED_USERS[2]._id,
      completedAt: tMinus(1050 - idx * 30),
      verificationInput: `Step #${s.order} verified: parameters in normal operating bounds.`,
    })),
    mitigationSummary: 'Terminated 84 idle zombie sessions, doubled PgBouncer max pool connections to 200, and deployed hotfix patch backend-v2.14.1 resetting connection idle timeout to 60s.',
    rootCause: {
      category: 'CONFIG',
      description: 'Misconfigured connection pool idle timeout in backend ORM config caused leaking client connections to accumulate indefinitely during marketing email push.',
    },
    acknowledgedAt: tMinus(1120),
    mitigatedAt: tMinus(980),
    resolvedAt: tMinus(910),
    createdAt: tMinus(1140),
    updatedAt: tMinus(910),
  },
  {
    _id: 'inc_08',
    id: 'inc_08',
    orgId: 'org_acme_01',
    incidentNumber: 8,
    title: 'Kubernetes pod CrashLoopBackOff in payment-service',
    description: 'Worker pods running payment-service crashed repeatedly due to uncaught null reference exceptions during international currency conversion initialization.',
    severity: 'P2',
    status: 'CLOSED',
    version: 7,
    createdBy: SEED_USERS[0],
    commander: SEED_USERS[1],
    responders: [SEED_USERS[2]],
    mitigationSummary: 'Rolled back deployment to payment-service:v3.8.1 and added input fallback validation guard for ISO-4217 currency codes.',
    rootCause: {
      category: 'CODE',
      description: 'Null pointer exception thrown on unexpected currency format in international merchant payload caused immediate pod crash during boot sequence.',
    },
    postmortemId: 'pm_01',
    acknowledgedAt: tMinus(2340),
    mitigatedAt: tMinus(2150),
    resolvedAt: tMinus(1980),
    closedAt: tMinus(1420),
    createdAt: tMinus(2400),
    updatedAt: tMinus(1420),
  },
];

const SEED_TIMELINE = [
  // inc_01
  {
    _id: 'tm_01_1',
    incidentId: 'inc_01',
    type: 'SYSTEM',
    actor: null,
    actorName: 'Prometheus Alertmanager',
    content: 'Alert fired: ApiGatewayHigh5xxRate exceeded threshold with 12.4% error rate across edge Envoy nodes.',
    createdAt: tMinus(4),
  },
  {
    _id: 'tm_01_2',
    incidentId: 'inc_01',
    type: 'RUNBOOK_ATTACHED',
    actor: SEED_USERS[0],
    actorName: 'Pulse Policy Engine',
    content: 'Automated SOP matching attached runbook: "API Gateway 5xx Spike Playbook" (6 steps).',
    createdAt: tMinus(4),
  },
  // inc_04
  {
    _id: 'tm_04_1',
    incidentId: 'inc_04',
    type: 'SYSTEM',
    actor: null,
    actorName: 'PagerDuty Webhook',
    content: 'Alert fired: Stripe Webhook Delivery Failure rate exceeded 8% over 5-minute sampling interval.',
    createdAt: tMinus(75),
  },
  {
    _id: 'tm_04_2',
    incidentId: 'inc_04',
    type: 'STATE_CHANGE',
    actor: SEED_USERS[1],
    actorName: 'Alex Rivera',
    content: 'Incident acknowledged by Alex Rivera within SLA window.',
    metadata: { fromStatus: 'FIRED', toStatus: 'ACKNOWLEDGED' },
    createdAt: tMinus(68),
  },
  {
    _id: 'tm_04_3',
    incidentId: 'inc_04',
    type: 'ASSIGNMENT',
    actor: SEED_USERS[1],
    actorName: 'Alex Rivera',
    content: 'Alex Rivera claimed Incident Commander role and dispatched Marcus Vance to checkout worker queues.',
    createdAt: tMinus(65),
  },
  {
    _id: 'tm_04_4',
    incidentId: 'inc_04',
    type: 'RUNBOOK_ATTACHED',
    actor: SEED_USERS[1],
    actorName: 'Alex Rivera',
    content: 'Attached runbook playbook: "Payment Processing Failure".',
    createdAt: tMinus(60),
  },
  {
    _id: 'tm_04_5',
    incidentId: 'inc_04',
    type: 'STATE_CHANGE',
    actor: SEED_USERS[1],
    actorName: 'Alex Rivera',
    content: 'Status advanced to INVESTIGATING. War room established on Slack #inc-004-payments.',
    metadata: { fromStatus: 'ACKNOWLEDGED', toStatus: 'INVESTIGATING' },
    createdAt: tMinus(55),
  },
  {
    _id: 'tm_04_6',
    incidentId: 'inc_04',
    type: 'RUNBOOK_STEP_COMPLETED',
    actor: SEED_USERS[1],
    actorName: 'Alex Rivera',
    content: 'Step #1 verified: Stripe API reporting elevated latency (> 4200ms) in US-East-1.',
    createdAt: tMinus(52),
  },
  {
    _id: 'tm_04_7',
    incidentId: 'inc_04',
    type: 'RUNBOOK_STEP_COMPLETED',
    actor: SEED_USERS[2],
    actorName: 'Marcus Vance',
    content: 'Step #2 verified: Edge TLS verification passed. Node worker pool connection queue at 98% capacity.',
    createdAt: tMinus(41),
  },
  {
    _id: 'tm_04_8',
    incidentId: 'inc_04',
    type: 'RUNBOOK_STEP_COMPLETED',
    actor: SEED_USERS[2],
    actorName: 'Marcus Vance',
    content: 'Step #3 verified: 1,450 concurrent webhook retries backed up in SQS dead-letter queue.',
    createdAt: tMinus(22),
  },
];

const SEED_POSTMORTEMS = [
  {
    _id: 'pm_01',
    id: 'pm_01',
    orgId: 'org_acme_01',
    incidentId: 'inc_08',
    title: 'Postmortem: Payment Service Pod CrashLoopBackOff on International Transactions',
    summary: 'On October 24, payment-service pods entered a CrashLoopBackOff state following deployment of release v3.8.2. Approximately 12% of checkout requests originating from non-USD regions experienced 500 errors over a 45-minute window. Incident commander executed an emergency rollback to v3.8.1, restoring full payment availability.',
    impact: {
      durationMinutes: 45,
      affectedServices: ['payment-service', 'checkout-web', 'mobile-api'],
    },
    rootCause: {
      category: 'CODE',
      description: 'A newly introduced currency localization helper assumed non-null symbol mapping for all ISO-4217 currency codes. When receiving unmapped codes (such as AED or SGD), an uncaught null pointer exception occurred in the initialization loop, causing node process termination.',
    },
    actionItems: [
      {
        description: 'Add comprehensive unit and fuzz tests covering all 180+ ISO-4217 international currency codes in currency formatter module',
        assignee: SEED_USERS[2]._id,
        dueDate: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
        completed: true,
      },
      {
        description: 'Implement defensive fallback error handler in microservice bootloader to reject malformed merchant payloads with HTTP 400 instead of crashing service process',
        assignee: SEED_USERS[1]._id,
        dueDate: new Date(now + 10 * 24 * 3600 * 1000).toISOString(),
        completed: false,
      },
      {
        description: 'Upgrade Kubernetes liveness and readiness probe tolerances to prevent cascading ingress pod eviction during transient restart cycles',
        assignee: SEED_USERS[0]._id,
        dueDate: new Date(now + 14 * 24 * 3600 * 1000).toISOString(),
        completed: false,
      },
    ],
    lessonsLearned: '1. Staging integration tests must run against multi-currency synthetic transaction datasets prior to production rollouts.\n2. Canary rollouts with 5% traffic slice would have isolated the crash before reaching 100% production traffic.\n3. Runbooks enabled rapid diagnosis within 15 minutes of escalation.',
    status: 'PUBLISHED',
    authorId: SEED_USERS[1],
    createdAt: tMinus(1500),
    updatedAt: tMinus(1420),
  },
];

class SandboxEngine {
  constructor() {
    this.loadState();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.org = parsed.org || SEED_ORG;
        this.users = parsed.users || SEED_USERS;
        this.runbooks = parsed.runbooks || SEED_RUNBOOKS;
        this.incidents = parsed.incidents || SEED_INCIDENTS;
        this.timelines = parsed.timelines || SEED_TIMELINE;
        this.postmortems = parsed.postmortems || SEED_POSTMORTEMS;
        this.counter = parsed.counter || 8;
        return;
      }
    } catch (e) {
      console.warn('Sandbox load state failed, resetting to seed defaults:', e);
    }
    this.resetToDefaults();
  }

  saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          org: this.org,
          users: this.users,
          runbooks: this.runbooks,
          incidents: this.incidents,
          timelines: this.timelines,
          postmortems: this.postmortems,
          counter: this.counter,
        })
      );
    } catch (e) {
      console.error('Failed to save sandbox state:', e);
    }
  }

  resetToDefaults() {
    this.org = { ...SEED_ORG };
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.runbooks = JSON.parse(JSON.stringify(SEED_RUNBOOKS));
    const freshIncidents = JSON.parse(JSON.stringify(SEED_INCIDENTS));
    const freshNow = Date.now();
    freshIncidents[0].createdAt = new Date(freshNow - 30 * 1000).toISOString();
    freshIncidents[0].updatedAt = new Date(freshNow - 30 * 1000).toISOString();
    freshIncidents[0].status = 'FIRED';
    freshIncidents[0].version = 1;
    freshIncidents[0].acknowledgedAt = null;
    freshIncidents[0].mitigatedAt = null;
    freshIncidents[0].resolvedAt = null;
    freshIncidents[0].closedAt = null;
    freshIncidents[0].runbookProgress = this.runbooks[0].steps.map((s) => ({
      stepIndex: s.order,
      status: 'PENDING',
      verificationInput: '',
    }));
    this.incidents = freshIncidents;
    this.timelines = JSON.parse(JSON.stringify(SEED_TIMELINE));
    this.postmortems = JSON.parse(JSON.stringify(SEED_POSTMORTEMS));
    this.counter = 8;
    this.saveState();
  }

  getCurrentUser() {
    try {
      const stored = localStorage.getItem('pulse_user');
      if (stored) return JSON.parse(stored);
    } catch {}
    return this.users[0];
  }

  matchRunbook(title, severity) {
    const t = (title || '').toLowerCase();
    for (const rb of this.runbooks) {
      if (rb.matchCriteria?.keywords?.some((k) => t.includes(k.toLowerCase()))) {
        return rb;
      }
    }
    return null;
  }

  async handleRequest(config) {
    let url = config.url || '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsedUrl = new URL(url);
        url = parsedUrl.pathname + parsedUrl.search;
      } catch {}
    }

    if (url.startsWith('/api')) {
      url = url.slice(4);
    }

    const [path, queryString] = url.split('?');
    const searchParams = new URLSearchParams(queryString || '');
    const method = (config.method || 'GET').toUpperCase();
    const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

    // Route matching
    // 1. AUTH
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = body;
      const user = this.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
      if (!user) {
        throw {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials. User not found.',
        };
      }
      if (password !== 'password123' && user.password && user.password !== password) {
        throw {
          status: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials. Password incorrect.',
        };
      }
      return {
        success: true,
        data: {
          user,
          organization: this.org,
          tokens: {
            accessToken: 'sandbox_jwt_token_' + user.id,
            refreshToken: 'sandbox_refresh_token_' + user.id,
          },
        },
      };
    }

    if (path === '/auth/register' && method === 'POST') {
      const { orgName, name, email, password } = body;
      const existing = this.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
      if (existing) {
        throw { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' };
      }
      const newOrg = {
        id: 'org_' + Date.now(),
        _id: 'org_' + Date.now(),
        name: orgName || 'Engineering Team',
        slug: (orgName || 'team').toLowerCase().replace(/\s+/g, '-'),
        settings: { sla: { p1AcknowledgeMinutes: 5, p2AcknowledgeMinutes: 15, p3AcknowledgeMinutes: 60, p4AcknowledgeMinutes: 240 } },
      };
      const newUser = {
        id: 'usr_' + Date.now(),
        _id: 'usr_' + Date.now(),
        orgId: newOrg.id,
        name: name || 'Operator',
        email: email.trim(),
        role: 'ADMIN',
        activeIncidentCount: 0,
        password,
      };
      this.org = newOrg;
      this.users.unshift(newUser);
      this.saveState();

      return {
        success: true,
        data: {
          user: newUser,
          organization: newOrg,
          tokens: {
            accessToken: 'sandbox_jwt_token_' + newUser.id,
            refreshToken: 'sandbox_refresh_token_' + newUser.id,
          },
        },
      };
    }

    if (path === '/auth/me' && method === 'GET') {
      const user = this.getCurrentUser();
      return {
        success: true,
        data: {
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: this.org,
        },
      };
    }

    if (path === '/auth/demo-switch' && method === 'POST') {
      const targetRole = body.role;
      const match = this.users.find((u) => u.role === targetRole) || {
        ...this.getCurrentUser(),
        role: targetRole,
      };
      return {
        success: true,
        data: {
          user: match,
          organization: this.org,
          tokens: {
            accessToken: 'sandbox_jwt_token_' + match.id,
            refreshToken: 'sandbox_refresh_token_' + match.id,
          },
        },
      };
    }

    if (path === '/demo/reset' && method === 'POST') {
      this.resetToDefaults();
      return {
        success: true,
        message: 'Sandbox state reset to initial seed values.',
      };
    }

    // 2. INCIDENTS
    if (path === '/incidents' && method === 'GET') {
      const statusFilter = searchParams.get('status') || '';
      const severityFilter = searchParams.get('severity') || '';
      const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();
      const assignedToMe = searchParams.get('assignedToMe') === 'true';
      const currentUser = this.getCurrentUser();

      const activeStatuses = ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'];

      let list = [...this.incidents];

      if (statusFilter === 'ACTIVE') {
        list = list.filter((i) => activeStatuses.includes(i.status));
      } else if (statusFilter) {
        list = list.filter((i) => i.status === statusFilter);
      }

      if (severityFilter) {
        list = list.filter((i) => i.severity === severityFilter);
      }

      if (searchQuery) {
        list = list.filter(
          (i) =>
            i.title.toLowerCase().includes(searchQuery) ||
            (i.description && i.description.toLowerCase().includes(searchQuery))
        );
      }

      if (assignedToMe) {
        list = list.filter(
          (i) =>
            i.commander?._id === currentUser._id ||
            i.responders?.some((r) => r._id === currentUser._id)
        );
      }

      return {
        success: true,
        data: list,
        pagination: { total: list.length, page: 1, limit: 50, pages: 1 },
      };
    }

    if (path === '/incidents' && method === 'POST') {
      this.counter += 1;
      const incidentNumber = this.counter;
      const matchingRunbook = this.matchRunbook(body.title, body.severity);

      let runbookProgress = [];
      if (matchingRunbook) {
        runbookProgress = matchingRunbook.steps.map((s) => ({
          stepIndex: s.order,
          status: 'PENDING',
          verificationInput: '',
        }));
      }

      const currentUser = this.getCurrentUser();
      const newInc = {
        _id: 'inc_' + Date.now(),
        id: 'inc_' + Date.now(),
        orgId: this.org.id,
        incidentNumber,
        title: body.title,
        description: body.description || '',
        severity: body.severity || 'P2',
        status: 'FIRED',
        version: 1,
        createdBy: currentUser,
        commander: null,
        responders: [],
        runbookId: matchingRunbook,
        runbookProgress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.incidents.unshift(newInc);

      // Add timeline event
      const timelineEvent = {
        _id: 'tm_' + Date.now(),
        incidentId: newInc._id,
        type: 'SYSTEM',
        actor: currentUser,
        actorName: currentUser.name,
        content: `Incident declared by ${currentUser.name} (${newInc.severity}).`,
        createdAt: new Date().toISOString(),
      };
      this.timelines.push(timelineEvent);

      if (matchingRunbook) {
        this.timelines.push({
          _id: 'tm_rb_' + Date.now(),
          incidentId: newInc._id,
          type: 'RUNBOOK_ATTACHED',
          actor: null,
          actorName: 'Pulse Policy Engine',
          content: `Automated SOP match attached playbook: "${matchingRunbook.name}".`,
          createdAt: new Date().toISOString(),
        });
      }

      this.saveState();
      return {
        success: true,
        data: newInc,
        message: 'Incident declared and response runbook attached.',
      };
    }

    // Single incident matching: /incidents/:id or subroutes
    const incIdMatch = path.match(/^\/incidents\/([a-zA-Z0-9_-]+)(\/.*)?$/);
    if (incIdMatch) {
      const incId = incIdMatch[1];
      const subAction = incIdMatch[2] || '';

      const incidentIndex = this.incidents.findIndex((i) => i._id === incId || i.id === incId);
      if (incidentIndex === -1) {
        throw { status: 404, code: 'INCIDENT_NOT_FOUND', message: 'Incident not found in your organization.' };
      }
      const incident = this.incidents[incidentIndex];

      // GET /incidents/:id
      if (subAction === '' && method === 'GET') {
        const relatedTimeline = this.timelines
          .filter((t) => t.incidentId === incident._id || t.incidentId === incident.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return {
          success: true,
          data: {
            incident,
            timeline: relatedTimeline,
          },
        };
      }

      // POST /incidents/:id/transition
      if (subAction === '/transition' && method === 'POST') {
        const { targetStatus, expectedVersion, reason, mitigationSummary, rootCauseCategory, rootCauseDescription } = body;

        // OCC check
        if (expectedVersion !== undefined && expectedVersion !== incident.version) {
          throw {
            status: 409,
            code: 'VERSION_CONFLICT',
            message: `Conflict: Incident was modified concurrently (current version ${incident.version}, expected ${expectedVersion}). Please reload.`,
          };
        }

        const currentUser = this.getCurrentUser();
        const oldStatus = incident.status;
        incident.status = targetStatus;
        incident.version = (incident.version || 1) + 1;
        incident.updatedAt = new Date().toISOString();

        if (targetStatus === 'ACKNOWLEDGED' && !incident.acknowledgedAt) {
          incident.acknowledgedAt = new Date().toISOString();
        }
        if (targetStatus === 'MITIGATED') {
          incident.mitigatedAt = new Date().toISOString();
          if (mitigationSummary) incident.mitigationSummary = mitigationSummary;
        }
        if (targetStatus === 'RESOLVED') {
          incident.resolvedAt = new Date().toISOString();
          if (rootCauseCategory) {
            incident.rootCause = {
              category: rootCauseCategory,
              description: rootCauseDescription || '',
            };
          }
        }
        if (targetStatus === 'CLOSED') {
          incident.closedAt = new Date().toISOString();
        }

        // Add timeline
        this.timelines.push({
          _id: 'tm_' + Date.now(),
          incidentId: incident._id,
          type: 'STATE_CHANGE',
          actor: currentUser,
          actorName: currentUser.name,
          content: `Status changed from [${oldStatus}] to [${targetStatus}] by ${currentUser.name}.${reason ? ` Reason: ${reason}` : ''}`,
          metadata: { fromStatus: oldStatus, toStatus: targetStatus },
          createdAt: new Date().toISOString(),
        });

        this.incidents[incidentIndex] = incident;
        this.saveState();

        return {
          success: true,
          data: incident,
          message: `Incident transitioned to [${targetStatus}] successfully.`,
        };
      }

      // PATCH /incidents/:id/runbook/steps/:stepIndex
      const stepMatch = subAction.match(/^\/runbook\/steps\/(\d+)$/);
      if (stepMatch && method === 'PATCH') {
        const stepNum = parseInt(stepMatch[1], 10);
        const { status: stepStatus, verificationInput } = body;
        const currentUser = this.getCurrentUser();

        if (!incident.runbookProgress) incident.runbookProgress = [];
        let p = incident.runbookProgress.find((x) => x.stepIndex === stepNum);
        if (!p) {
          p = { stepIndex: stepNum };
          incident.runbookProgress.push(p);
        }
        p.status = stepStatus;
        p.verificationInput = verificationInput || '';
        p.completedBy = currentUser._id;
        p.completedAt = new Date().toISOString();
        incident.updatedAt = new Date().toISOString();

        this.timelines.push({
          _id: 'tm_' + Date.now(),
          incidentId: incident._id,
          type: 'RUNBOOK_STEP_COMPLETED',
          actor: currentUser,
          actorName: currentUser.name,
          content: `Runbook Step #${stepNum} marked as [${stepStatus}] by ${currentUser.name}. ${verificationInput ? `Note: "${verificationInput}"` : ''}`,
          createdAt: new Date().toISOString(),
        });

        this.incidents[incidentIndex] = incident;
        this.saveState();

        return {
          success: true,
          data: incident,
          message: `Runbook step #${stepNum} updated.`,
        };
      }

      // POST /incidents/:id/timeline/comment
      if (subAction === '/timeline/comment' && method === 'POST') {
        const currentUser = this.getCurrentUser();
        const newComment = {
          _id: 'tm_cmt_' + Date.now(),
          incidentId: incident._id,
          type: 'NOTE',
          actor: currentUser,
          actorName: currentUser.name,
          content: body.content,
          createdAt: new Date().toISOString(),
        };

        this.timelines.push(newComment);
        this.saveState();

        return {
          success: true,
          data: newComment,
          message: 'Note added to incident timeline.',
        };
      }
    }

    // 3. ANALYTICS
    if (path === '/analytics/overview' && method === 'GET') {
      const activeCount = this.incidents.filter((i) =>
        ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'].includes(i.status)
      ).length;
      const breachedCount = this.incidents.filter((i) => i.status === 'ESCALATED' || i.slaBreachedAt).length;

      return {
        success: true,
        data: {
          summary: {
            totalIncidents: this.incidents.length,
            activeIncidents: activeCount,
            slaBreachCount: breachedCount,
            mttaSeconds: 14,
            mttrMinutes: 22,
            slaComplianceRate: 98.5,
          },
          mtta: { medianSeconds: 14, p90Seconds: 45, targetSeconds: 300 },
          mttr: { medianMinutes: 22, p90Minutes: 58, targetMinutes: 60 },
          severityBreakdown: [
            { _id: 'P1', count: this.incidents.filter((i) => i.severity === 'P1').length },
            { _id: 'P2', count: this.incidents.filter((i) => i.severity === 'P2').length },
            { _id: 'P3', count: this.incidents.filter((i) => i.severity === 'P3').length },
            { _id: 'P4', count: this.incidents.filter((i) => i.severity === 'P4').length },
          ],
          rootCauseBreakdown: [
            { _id: 'CODE', count: 3 },
            { _id: 'CONFIG', count: 2 },
            { _id: 'INFRASTRUCTURE', count: 2 },
            { _id: 'EXTERNAL', count: 1 },
          ],
          timelineVolume: [
            { _id: '2026-10-22', count: 3, p1Count: 1 },
            { _id: '2026-10-23', count: 2, p1Count: 0 },
            { _id: '2026-10-24', count: 5, p1Count: 2 },
            { _id: '2026-10-25', count: 1, p1Count: 0 },
            { _id: '2026-10-26', count: 4, p1Count: 1 },
            { _id: '2026-10-27', count: 6, p1Count: 3 },
            { _id: '2026-10-28', count: this.incidents.length, p1Count: breachedCount },
          ],
          responderWorkload: this.users.map((u) => ({
            _id: u._id,
            name: u.name,
            role: u.role,
            activeIncidentCount: this.incidents.filter(
              (i) => (i.commander?._id === u._id || i.responders?.some((r) => r._id === u._id)) &&
                     ['FIRED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'].includes(i.status)
            ).length,
          })),
        },
      };
    }

    // 4. POSTMORTEMS
    if (path === '/postmortems' && method === 'GET') {
      return {
        success: true,
        data: this.postmortems,
      };
    }

    if (path === '/postmortems' && method === 'POST') {
      const currentUser = this.getCurrentUser();
      const newPm = {
        _id: 'pm_' + Date.now(),
        id: 'pm_' + Date.now(),
        orgId: this.org.id,
        incidentId: body.incidentId,
        title: body.title || 'Incident Postmortem',
        summary: body.summary || '',
        impact: body.impact || { durationMinutes: 30, affectedServices: [] },
        rootCause: body.rootCause || { category: 'CODE', description: '' },
        actionItems: body.actionItems || [],
        lessonsLearned: body.lessonsLearned || '',
        status: body.status || 'DRAFT',
        authorId: currentUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.postmortems.unshift(newPm);
      this.saveState();
      return {
        success: true,
        data: newPm,
      };
    }

    // 5. TEAM & INVITES
    if (path === '/org/team' && method === 'GET') {
      return {
        success: true,
        data: {
          members: this.users,
          invites: [
            {
              _id: 'inv_01',
              email: 'devops-lead@acme.dev',
              role: 'INCIDENT_COMMANDER',
              expiresAt: new Date(now + 48 * 3600 * 1000).toISOString(),
            },
          ],
        },
      };
    }

    if (path === '/invites' && method === 'POST') {
      const { email, role } = body;
      const invite = {
        _id: 'inv_' + Date.now(),
        email,
        role: role || 'RESPONDER',
        token: 'tok_' + Math.random().toString(36).substring(2),
        inviteUrl: `${window.location.origin}/invite/tok_${Math.random().toString(36).substring(2)}`,
        expiresAt: new Date(now + 48 * 3600 * 1000).toISOString(),
      };
      return {
        success: true,
        data: invite,
      };
    }

    // Fallback unknown
    throw {
      status: 404,
      code: 'NOT_FOUND',
      message: `Sandbox endpoint not found: ${method} ${path}`,
    };
  }
}

export const sandboxEngine = new SandboxEngine();
export default sandboxEngine;
