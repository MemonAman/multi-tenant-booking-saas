const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const scheduleRoutes = require('./routes/schedule');
const publicRoutes = require('./routes/public');
const bookingsRoutes = require('./routes/bookings');
const clientsRoutes = require('./routes/clients');
const jobsRoutes = require('./routes/jobs');
const billingRoutes = require('./routes/billing');

const app = express();

// Middleware
app.use(cors({
  origin: [env.appUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Raw body parser for webhook signature verification (configured per route later)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/billing/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', healthRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/billing', billingRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.originalUrl} not found`,
      code: 'NOT_FOUND'
    }
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      ...(env.nodeEnv === 'development' ? { stack: err.stack } : {})
    }
  });
});

module.exports = app;
