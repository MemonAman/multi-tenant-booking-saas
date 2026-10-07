const express = require('express');
const router = express.Router();
const env = require('../config/env');

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Multi-Tenant Booking SaaS API',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    version: '1.0.0'
  });
});

module.exports = router;
