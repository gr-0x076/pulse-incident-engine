require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const {
  Organization,
  User,
  Incident,
  TimelineEvent,
  Postmortem,
  Counter,
  Runbook,
  WebhookDelivery,
} = require('./src/models');

const {
  ROLES,
  SEVERITY,
  INCIDENT_STATUS,
  TIMELINE_EVENT_TYPES,
  POSTMORTEM_STATUS,
  RUNBOOK_STEP_STATUS,
  WEBHOOK_STATUS,
} = require('./src/config/constants');

const SEED_PASSWORD = 'password123';

const seed = async () => {
  try {
    console.log('🌱 Starting Pulse seed...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulse';
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB at ${mongoUri}`);

    // Drop existing data
    console.log('🧹 Dropping existing database collections...');
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.drop();
      console.log(`   - Dropped collection: ${collection.collectionName}`);
    }
    console.log('✅ All collections dropped');

    // Create organization
    console.log('🏢 Creating organization...');
    const org = await Organization.create({
      name: 'Acme Engineering',
      slug: 'acme-engineering',
      settings: {
        sla: {
          p1AcknowledgeMinutes: 5,
          p2AcknowledgeMinutes: 15,
          p3AcknowledgeMinutes: 60,
          p4AcknowledgeMinutes: 240,
        },
      },
    });
    console.log(`✅ Created organization: ${org.name} (${org._id})`);

    // Create users
    console.log('👥 Creating users with pre-hashed credentials...');
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    const [adminUser, commanderUser, responderUser, viewerUser] = await User.create([
      {
        orgId: org._id,
        email: 'admin@acme.dev',
        name: 'Sarah Chen',
        passwordHash,
        role: ROLES.ADMIN,
        activeIncidentCount: 0,
      },
      {
        orgId: org._id,
        email: 'commander@acme.dev',
        name: 'Alex Rivera',
        passwordHash,
        role: ROLES.INCIDENT_COMMANDER,
        activeIncidentCount: 2,
      },
      {
        orgId: org._id,
        email: 'responder@acme.dev',
        name: 'Marcus Vance',
        passwordHash,
        role: ROLES.RESPONDER,
        activeIncidentCount: 3,
      },
      {
        orgId: org._id,
        email: 'viewer@acme.dev',
        name: 'Elena Rostova',
        passwordHash,
        role: ROLES.VIEWER,
        activeIncidentCount: 0,
      },
    ]);
    console.log('✅ Created 4 users (Admin, Incident Commander, Responder, Viewer)');

    // Create Runbook templates
    console.log('📖 Creating runbook playbooks...');
    const [runbookApiGateway, runbookDatabase, runbookPayments] = await Runbook.create([
      {
        orgId: org._id,
        name: 'API Gateway 5xx Spike Playbook',
        description: 'Standard operating procedure for diagnosing and mitigating elevated HTTP 5xx error rates across API gateway clusters.',
        matchCriteria: {
          keywords: ['5xx', 'gateway', 'api'],
          services: ['api-gateway'],
          severities: [SEVERITY.P1, SEVERITY.P2],
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
        createdBy: adminUser._id,
        isActive: true,
        usageCount: 4,
      },
      {
        orgId: org._id,
        name: 'Database Connection Pool Exhaustion',
        description: 'Emergency runbook for resolving database connection saturation, hung transaction threads, and connection pool starvation.',
        matchCriteria: {
          keywords: ['database', 'connection', 'pool', 'timeout'],
          services: ['database', 'postgres', 'mysql', 'mongodb'],
          severities: [SEVERITY.P1, SEVERITY.P2],
        },
        steps: [
          {
            order: 1,
            title: 'Check Active Connection Count and Pool Saturation',
            description: 'Query database connection telemetry and PgBouncer/ProxySQL pool utilization metrics.',
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
        createdBy: adminUser._id,
        isActive: true,
        usageCount: 2,
      },
      {
        orgId: org._id,
        name: 'Payment Processing Failure',
        description: 'Triage and remediation procedures for payment gateway failures, webhook drops, and checkout transaction disruptions.',
        matchCriteria: {
          keywords: ['payment', 'stripe', 'checkout', 'transaction'],
          services: ['payments', 'stripe'],
          severities: [SEVERITY.P1, SEVERITY.P2, SEVERITY.P3],
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
        createdBy: adminUser._id,
        isActive: true,
        usageCount: 3,
      },
    ]);
    console.log('✅ Created 3 Runbook templates with auto-match criteria and step instructions');

    // Initialize Counter
    console.log('🔢 Initializing incident counter...');
    await Counter.create({
      orgId: org._id,
      name: 'incidentNumber',
      seq: 8,
    });
    console.log('✅ Counter initialized to 8');

    // Timing anchors (spread across last 48 hours)
    const now = new Date();
    const timeTMinus = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);

    // 8 Incidents
    console.log('🚨 Creating realistic incidents across lifecycle states...');

    // 1. FIRED (P1)
    const inc1 = await Incident.create({
      orgId: org._id,
      incidentNumber: 1,
      title: 'API Gateway returning 503 — 5xx rate at 12%',
      description: 'Production edge Envoy proxies are rejecting incoming traffic with HTTP 503 Service Unavailable. Global 5xx error rate has surged past 12%, impacting all inbound client requests across North America and Europe.',
      severity: SEVERITY.P1,
      status: INCIDENT_STATUS.FIRED,
      createdBy: adminUser._id,
      commander: null,
      responders: [],
      alertFingerprint: 'alert-sha256-apigw-503-spike-01',
      runbookId: runbookApiGateway._id,
      runbookProgress: runbookApiGateway.steps.map((s, idx) => ({
        stepIndex: idx,
        status: RUNBOOK_STEP_STATUS.PENDING,
      })),
      createdAt: timeTMinus(4),
      updatedAt: timeTMinus(4),
    });

    // 2. FIRED (P3)
    const inc2 = await Incident.create({
      orgId: org._id,
      incidentNumber: 2,
      title: 'CSS assets 404 on production /settings page',
      description: 'Static stylesheet chunk settings.chunk.38dfa1.css is returning HTTP 404 Not Found after the latest asset CDN purge. UI layout on user settings page appears unstyled for ~3% of active sessions.',
      severity: SEVERITY.P3,
      status: INCIDENT_STATUS.FIRED,
      createdBy: viewerUser._id,
      commander: null,
      responders: [],
      alertFingerprint: 'alert-sha256-static-asset-404-02',
      createdAt: timeTMinus(18),
      updatedAt: timeTMinus(18),
    });

    // 3. ACKNOWLEDGED (P2)
    const inc3 = await Incident.create({
      orgId: org._id,
      incidentNumber: 3,
      title: 'CDN cache invalidation failing for /api/v2/*',
      description: 'Automated cache purge hooks triggering from CI/CD deploy pipeline are timing out against Cloudflare API. Stale cached schema responses are being served for dynamic entity queries.',
      severity: SEVERITY.P2,
      status: INCIDENT_STATUS.ACKNOWLEDGED,
      createdBy: adminUser._id,
      commander: null,
      responders: [responderUser._id],
      acknowledgedAt: timeTMinus(25),
      createdAt: timeTMinus(38),
      updatedAt: timeTMinus(25),
    });

    // 4. INVESTIGATING (P1)
    const inc4 = await Incident.create({
      orgId: org._id,
      incidentNumber: 4,
      title: 'Payment webhook timeout affecting checkout flow',
      description: 'Inbound asynchronous payment fulfillment webhooks are failing with gateway socket timeouts. Customer orders are getting stuck in PENDING_PAYMENT state despite card authorization success.',
      severity: SEVERITY.P1,
      status: INCIDENT_STATUS.INVESTIGATING,
      createdBy: adminUser._id,
      commander: commanderUser._id,
      responders: [responderUser._id],
      acknowledgedAt: timeTMinus(68),
      runbookId: runbookPayments._id,
      runbookProgress: [
        {
          stepIndex: 0,
          status: RUNBOOK_STEP_STATUS.COMPLETED,
          completedBy: commanderUser._id,
          completedAt: timeTMinus(52),
          verificationInput: 'Stripe API reporting elevated latency (> 4200ms) in US-East-1 availability zone; status degraded.',
        },
        {
          stepIndex: 1,
          status: RUNBOOK_STEP_STATUS.COMPLETED,
          completedBy: responderUser._id,
          completedAt: timeTMinus(41),
          verificationInput: 'Edge TLS verification passed. Node worker pool connection queue at 98% capacity.',
        },
        {
          stepIndex: 2,
          status: RUNBOOK_STEP_STATUS.COMPLETED,
          completedBy: responderUser._id,
          completedAt: timeTMinus(22),
          verificationInput: 'Identified retry storm: 1,450 concurrent webhook retries backed up in SQS dead-letter queue.',
        },
        {
          stepIndex: 3,
          status: RUNBOOK_STEP_STATUS.PENDING,
        },
      ],
      createdAt: timeTMinus(75),
      updatedAt: timeTMinus(22),
    });

    // 5. ESCALATED (P1) — SLA breached
    const inc5 = await Incident.create({
      orgId: org._id,
      incidentNumber: 5,
      title: 'User authentication service latency spike (>2s p99)',
      description: 'Auth microservice p99 response time has breached 2,400ms (SLA threshold is 250ms). Session token validation requests are queuing up, cascading latency downstream to API clients.',
      severity: SEVERITY.P1,
      status: INCIDENT_STATUS.ESCALATED,
      createdBy: adminUser._id,
      commander: commanderUser._id,
      responders: [responderUser._id],
      slaBreachedAt: timeTMinus(118),
      acknowledgedAt: null,
      createdAt: timeTMinus(125),
      updatedAt: timeTMinus(118),
    });

    // 6. MITIGATED (P2)
    const inc6 = await Incident.create({
      orgId: org._id,
      incidentNumber: 6,
      title: 'Elasticsearch cluster yellow — disk watermark breach',
      description: 'High storage utilization on Elasticsearch primary data node es-data-02 triggered low disk watermark threshold (>85%). Cluster status turned YELLOW and shard allocation was temporarily disabled.',
      severity: SEVERITY.P2,
      status: INCIDENT_STATUS.MITIGATED,
      createdBy: adminUser._id,
      commander: commanderUser._id,
      responders: [responderUser._id],
      mitigationSummary: 'Purged raw debug logs older than 14 days and expanded AWS EBS data volume from 500GB to 1TB. Cluster health transitioned to green; shard rebalancing active.',
      acknowledgedAt: timeTMinus(340),
      mitigatedAt: timeTMinus(260),
      createdAt: timeTMinus(360),
      updatedAt: timeTMinus(260),
    });

    // 7. RESOLVED (P1)
    const inc7 = await Incident.create({
      orgId: org._id,
      incidentNumber: 7,
      title: 'Database connection pool exhaustion — primary replica',
      description: 'Backend PostgreSQL connection pool reached 100% capacity (500/500 connections). Application servers received "remaining connection slots are reserved for non-replication superuser connections" errors.',
      severity: SEVERITY.P1,
      status: INCIDENT_STATUS.RESOLVED,
      createdBy: adminUser._id,
      commander: commanderUser._id,
      responders: [responderUser._id],
      runbookId: runbookDatabase._id,
      runbookProgress: runbookDatabase.steps.map((s, idx) => ({
        stepIndex: idx,
        status: RUNBOOK_STEP_STATUS.COMPLETED,
        completedBy: idx % 2 === 0 ? commanderUser._id : responderUser._id,
        completedAt: timeTMinus(1050 - idx * 30),
        verificationInput: `Step ${idx + 1} verified: parameters in normal operating bounds.`,
      })),
      mitigationSummary: 'Terminated 84 idle zombie sessions, doubled PgBouncer max pool connections to 200, and deployed hotfix patch backend-v2.14.1 resetting connection idle timeout to 60s.',
      rootCause: {
        category: 'CONFIG',
        description: 'Misconfigured connection pool idle timeout in backend ORM config caused leaking client connections to accumulate indefinitely during marketing email push.',
      },
      acknowledgedAt: timeTMinus(1120),
      mitigatedAt: timeTMinus(980),
      resolvedAt: timeTMinus(910),
      createdAt: timeTMinus(1140),
      updatedAt: timeTMinus(910),
    });

    // 8. CLOSED (P2)
    const inc8 = await Incident.create({
      orgId: org._id,
      incidentNumber: 8,
      title: 'Kubernetes pod CrashLoopBackOff in payment-service',
      description: 'Worker pods running payment-service crashed repeatedly due to uncaught null reference exceptions during international currency conversion initialization.',
      severity: SEVERITY.P2,
      status: INCIDENT_STATUS.CLOSED,
      createdBy: adminUser._id,
      commander: commanderUser._id,
      responders: [responderUser._id],
      mitigationSummary: 'Rolled back deployment to payment-service:v3.8.1 and added input fallback validation guard for ISO-4217 currency codes.',
      rootCause: {
        category: 'CODE',
        description: 'Null pointer exception thrown on unexpected currency format in international merchant payload caused immediate pod crash during boot sequence.',
      },
      acknowledgedAt: timeTMinus(2340),
      mitigatedAt: timeTMinus(2150),
      resolvedAt: timeTMinus(1980),
      closedAt: timeTMinus(1420),
      createdAt: timeTMinus(2400),
      updatedAt: timeTMinus(1420),
    });

    console.log('✅ Created 8 realistic incidents across all lifecycle states');

    // Create Timeline events
    console.log('⏱️ Generating chronological incident timeline events...');
    const timelineEvents = [
      // Incident 1 (FIRED)
      {
        incidentId: inc1._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Prometheus Alertmanager',
        content: 'Alert fired: ApiGatewayHigh5xxRate exceeded threshold with 12.4% error rate across edge Envoy nodes.',
        createdAt: timeTMinus(4),
      },

      // Incident 2 (FIRED)
      {
        incidentId: inc2._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: viewerUser._id,
        actorName: viewerUser.name,
        content: 'Manual incident filed: CSS assets returning 404 on production /settings view.',
        createdAt: timeTMinus(18),
      },

      // Incident 3 (ACKNOWLEDGED)
      {
        incidentId: inc3._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Datadog Alert Ingestion',
        content: 'Alert fired: Invalidation latency exceeded 45s for Cloudflare edge worker zones.',
        createdAt: timeTMinus(38),
      },
      {
        incidentId: inc3._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.ASSIGNMENT,
        actor: adminUser._id,
        actorName: adminUser.name,
        content: 'Assigned Marcus Vance as primary on-call responder.',
        metadata: {
          assignedUsers: [responderUser._id],
        },
        createdAt: timeTMinus(30),
      },
      {
        incidentId: inc3._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Incident acknowledged by Marcus Vance. Investigating cache purge API keys and webhook tokens.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ACKNOWLEDGED,
        },
        createdAt: timeTMinus(25),
      },

      // Incident 4 (INVESTIGATING)
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'PagerDuty Webhook',
        content: 'Alert fired: Stripe Webhook Delivery Failure rate exceeded 8% over 5-minute sampling interval.',
        createdAt: timeTMinus(75),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Incident acknowledged by Alex Rivera within SLA window.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ACKNOWLEDGED,
        },
        createdAt: timeTMinus(68),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.ASSIGNMENT,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Alex Rivera claimed Incident Commander role and dispatched Marcus Vance to checkout worker queues.',
        metadata: {
          assignedUsers: [responderUser._id],
        },
        createdAt: timeTMinus(65),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_ATTACHED,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Attached runbook playbook: "Payment Processing Failure".',
        createdAt: timeTMinus(60),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Status advanced to INVESTIGATING. War room established on Slack #inc-004-payments.',
        metadata: {
          fromStatus: INCIDENT_STATUS.ACKNOWLEDGED,
          toStatus: INCIDENT_STATUS.INVESTIGATING,
        },
        createdAt: timeTMinus(58),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_STEP_EXECUTED,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Completed step 1: Check Payment Gateway Provider Status.',
        metadata: {
          runbookStepIndex: 0,
          runbookStepTitle: 'Check Payment Gateway Provider Status',
          runbookStepStatus: RUNBOOK_STEP_STATUS.COMPLETED,
        },
        createdAt: timeTMinus(52),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_STEP_EXECUTED,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Completed step 2: Verify Webhook Ingestion Endpoint Latency.',
        metadata: {
          runbookStepIndex: 1,
          runbookStepTitle: 'Verify Webhook Ingestion Endpoint Latency',
          runbookStepStatus: RUNBOOK_STEP_STATUS.COMPLETED,
        },
        createdAt: timeTMinus(41),
      },
      {
        incidentId: inc4._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_STEP_EXECUTED,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Completed step 3: Inspect Recent Payment Failure Logs. Dead-letter queue backing up.',
        metadata: {
          runbookStepIndex: 2,
          runbookStepTitle: 'Inspect Recent Payment Failure Logs',
          runbookStepStatus: RUNBOOK_STEP_STATUS.COMPLETED,
        },
        createdAt: timeTMinus(22),
      },

      // Incident 5 (ESCALATED)
      {
        incidentId: inc5._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Prometheus Alertmanager',
        content: 'Alert fired: Auth p99 latency > 2400ms across auth-cluster-us-east.',
        createdAt: timeTMinus(125),
      },
      {
        incidentId: inc5._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Pulse SLA Monitor Worker',
        content: '⚠️ SLA Warning: P1 incident has remained unacknowledged for 4 minutes (SLA budget: 5m).',
        createdAt: timeTMinus(121),
      },
      {
        incidentId: inc5._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.ESCALATION,
        actor: null,
        actorName: 'Pulse SLA Monitor Worker',
        content: '🚨 SLA BREACH: P1 incident acknowledgment exceeded 5-minute threshold. Automatically escalated to secondary engineering leadership.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ESCALATED,
          escalationReason: 'SLA Acknowledge target breached (5 minutes elapsed without on-call claim)',
        },
        createdAt: timeTMinus(118),
      },
      {
        incidentId: inc5._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.COMMENT,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Emergency triage in progress. Redis master node redis-auth-01 experiencing high memory fragmentation and CPU pinning at 99%.',
        createdAt: timeTMinus(105),
      },

      // Incident 6 (MITIGATED)
      {
        incidentId: inc6._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Datadog Ingestion',
        content: 'Alert fired: Elasticsearch node es-data-02 disk usage exceeded 85%.',
        createdAt: timeTMinus(360),
      },
      {
        incidentId: inc6._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Acknowledged by Alex Rivera. Assigned Marcus Vance to execute disk retention policy.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ACKNOWLEDGED,
        },
        createdAt: timeTMinus(340),
      },
      {
        incidentId: inc6._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Transitioned to INVESTIGATING.',
        metadata: {
          fromStatus: INCIDENT_STATUS.ACKNOWLEDGED,
          toStatus: INCIDENT_STATUS.INVESTIGATING,
        },
        createdAt: timeTMinus(330),
      },
      {
        incidentId: inc6._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.COMMENT,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Identified 280GB of raw uncompressed trace logs in debug-trace-2026.* index indices. Initiated deletion.',
        createdAt: timeTMinus(300),
      },
      {
        incidentId: inc6._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Incident MITIGATED. EBS volume resized to 1TB and disk saturation decreased to 41%. Cluster status returned to GREEN.',
        metadata: {
          fromStatus: INCIDENT_STATUS.INVESTIGATING,
          toStatus: INCIDENT_STATUS.MITIGATED,
        },
        createdAt: timeTMinus(260),
      },

      // Incident 7 (RESOLVED)
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'PostgreSQL CloudWatch Alarm',
        content: 'Alert fired: DatabaseConnectionSaturation at 99.8% on primary db cluster.',
        createdAt: timeTMinus(1140),
      },
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Acknowledged by Alex Rivera within 3 minutes of alert trigger.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ACKNOWLEDGED,
        },
        createdAt: timeTMinus(1120),
      },
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.RUNBOOK_ATTACHED,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Attached runbook: "Database Connection Pool Exhaustion".',
        createdAt: timeTMinus(1110),
      },
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Transitioned to INVESTIGATING. Terminating idle transactions via pg_terminate_backend.',
        metadata: {
          fromStatus: INCIDENT_STATUS.ACKNOWLEDGED,
          toStatus: INCIDENT_STATUS.INVESTIGATING,
        },
        createdAt: timeTMinus(1100),
      },
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Incident MITIGATED. PgBouncer pool scaling applied and 84 zombie queries killed.',
        metadata: {
          fromStatus: INCIDENT_STATUS.INVESTIGATING,
          toStatus: INCIDENT_STATUS.MITIGATED,
        },
        createdAt: timeTMinus(980),
      },
      {
        incidentId: inc7._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Incident RESOLVED. Permanent ORM pool configuration patch verified in production.',
        metadata: {
          fromStatus: INCIDENT_STATUS.MITIGATED,
          toStatus: INCIDENT_STATUS.RESOLVED,
        },
        createdAt: timeTMinus(910),
      },

      // Incident 8 (CLOSED)
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: null,
        actorName: 'Kubernetes Ingress Monitor',
        content: 'Alert fired: PodCrashLoopBackOff detected for payment-service in namespace production.',
        createdAt: timeTMinus(2400),
      },
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Acknowledged by Alex Rivera.',
        metadata: {
          fromStatus: INCIDENT_STATUS.FIRED,
          toStatus: INCIDENT_STATUS.ACKNOWLEDGED,
        },
        createdAt: timeTMinus(2340),
      },
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Transitioned to INVESTIGATING. Crash logs isolate null pointer exception in currency helper.',
        metadata: {
          fromStatus: INCIDENT_STATUS.ACKNOWLEDGED,
          toStatus: INCIDENT_STATUS.INVESTIGATING,
        },
        createdAt: timeTMinus(2300),
      },
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: responderUser._id,
        actorName: responderUser.name,
        content: 'Incident MITIGATED. Rolled back payment-service deployment to image tag v3.8.1.',
        metadata: {
          fromStatus: INCIDENT_STATUS.INVESTIGATING,
          toStatus: INCIDENT_STATUS.MITIGATED,
        },
        createdAt: timeTMinus(2150),
      },
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: commanderUser._id,
        actorName: commanderUser.name,
        content: 'Incident RESOLVED. Validated zero checkout errors for 30 consecutive minutes.',
        metadata: {
          fromStatus: INCIDENT_STATUS.MITIGATED,
          toStatus: INCIDENT_STATUS.RESOLVED,
        },
        createdAt: timeTMinus(1980),
      },
      {
        incidentId: inc8._id,
        orgId: org._id,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: adminUser._id,
        actorName: adminUser.name,
        content: 'Incident CLOSED after postmortem review and sign-off.',
        metadata: {
          fromStatus: INCIDENT_STATUS.RESOLVED,
          toStatus: INCIDENT_STATUS.CLOSED,
        },
        createdAt: timeTMinus(1420),
      },
    ];

    await TimelineEvent.insertMany(timelineEvents);
    console.log(`✅ Created ${timelineEvents.length} timeline events across incidents`);

    // Create Published Postmortem for Incident 8
    console.log('📝 Creating published postmortem for Incident #8...');
    const postmortem = await Postmortem.create({
      orgId: org._id,
      incidentId: inc8._id,
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
          assignee: responderUser._id,
          dueDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
          completed: true,
        },
        {
          description: 'Implement defensive fallback error handler in microservice bootloader to reject malformed merchant payloads with HTTP 400 instead of crashing service process',
          assignee: commanderUser._id,
          dueDate: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
          completed: false,
        },
        {
          description: 'Upgrade Kubernetes liveness and readiness probe tolerances to prevent cascading ingress pod eviction during transient restart cycles',
          assignee: adminUser._id,
          dueDate: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
          completed: false,
        },
      ],
      lessonsLearned: '1. Staging integration tests must run against multi-currency synthetic transaction datasets prior to production rollouts.\n2. Canary rollouts with 5% traffic slice would have isolated the crash before reaching 100% production traffic.\n3. Runbooks enabled rapid diagnosis within 15 minutes of escalation.',
      status: POSTMORTEM_STATUS.PUBLISHED,
      authorId: commanderUser._id,
      createdAt: timeTMinus(1500),
      updatedAt: timeTMinus(1420),
    });

    // Link postmortem to Incident 8
    inc8.postmortemId = postmortem._id;
    await inc8.save();
    console.log(`✅ Postmortem linked to Incident #8 (${postmortem._id})`);

    // Create 2 WebhookDelivery records
    console.log('📡 Creating webhook delivery audit records...');
    await WebhookDelivery.create([
      {
        orgId: org._id,
        source: 'prometheus',
        fingerprint: 'alert-sha256-apigw-503-spike-01',
        rawPayload: {
          receiver: 'pulse-webhook-receiver',
          status: 'firing',
          alerts: [
            {
              status: 'firing',
              labels: {
                alertname: 'ApiGatewayHigh5xxRate',
                severity: 'critical',
                service: 'api-gateway',
                environment: 'production',
                cluster: 'us-east-prod-k8s',
              },
              annotations: {
                summary: 'API Gateway returning 503 — 5xx rate at 12%',
                description: 'Edge envoy proxies reporting HTTP 503 error rate exceeded 5% threshold over 3m window.',
              },
              startsAt: timeTMinus(4).toISOString(),
            },
          ],
        },
        normalizedAlert: {
          title: 'API Gateway returning 503 — 5xx rate at 12%',
          description: 'Edge envoy proxies reporting HTTP 503 error rate exceeded 5% threshold over 3m window.',
          severity: SEVERITY.P1,
          service: 'api-gateway',
          source: 'prometheus',
        },
        status: WEBHOOK_STATUS.PROCESSED,
        incidentId: inc1._id,
        deduplicatedToIncidentId: null,
        processedAt: timeTMinus(4),
        createdAt: timeTMinus(4),
      },
      {
        orgId: org._id,
        source: 'prometheus',
        fingerprint: 'alert-sha256-apigw-503-spike-01',
        rawPayload: {
          receiver: 'pulse-webhook-receiver',
          status: 'firing',
          alerts: [
            {
              status: 'firing',
              labels: {
                alertname: 'ApiGatewayHigh5xxRate',
                severity: 'critical',
                service: 'api-gateway',
                environment: 'production',
                cluster: 'us-east-prod-k8s',
              },
              annotations: {
                summary: 'API Gateway returning 503 — 5xx rate at 12%',
                description: 'Duplicate alert firing from secondary Prometheus scraper agent in secondary zone.',
              },
              startsAt: timeTMinus(2).toISOString(),
            },
          ],
        },
        normalizedAlert: {
          title: 'API Gateway returning 503 — 5xx rate at 12%',
          description: 'Duplicate alert firing from secondary Prometheus scraper agent in secondary zone.',
          severity: SEVERITY.P1,
          service: 'api-gateway',
          source: 'prometheus',
        },
        status: WEBHOOK_STATUS.DEDUPLICATED,
        incidentId: null,
        deduplicatedToIncidentId: inc1._id,
        processedAt: timeTMinus(2),
        createdAt: timeTMinus(2),
      },
    ]);
    console.log('✅ Created 2 WebhookDelivery records (1 PROCESSED, 1 DEDUPLICATED)');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('   Admin:     admin@acme.dev / password123');
    console.log('   Commander: commander@acme.dev / password123');
    console.log('   Responder: responder@acme.dev / password123');
    console.log('   Viewer:    viewer@acme.dev / password123');
    console.log('\n✨ Database is ready for Pulse.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
