const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { env } = require('./config/env');
const { connectDB } = require('./config/db');
const { initializeSocket } = require('./socket');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
  });
});

// API Routes (will be added in subsequent milestones)
// app.use('/api/auth', require('./modules/auth/auth.routes'));
// app.use('/api/org', require('./modules/org/org.routes'));
// app.use('/api/invites', require('./modules/invite/invite.routes'));
// app.use('/api/incidents', require('./modules/incident/incident.routes'));
// app.use('/api/postmortems', require('./modules/postmortem/postmortem.routes'));
// app.use('/api/analytics', require('./modules/analytics/analytics.routes'));
// app.use('/api/webhooks', require('./modules/webhook/webhook.routes'));

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      console.log(`\n🚀 Pulse API server running on port ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Health: http://localhost:${env.PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

module.exports = { app, server };
