const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 Multi-Tenant Booking SaaS API running on port ${PORT}`);
  console.log(`🌍 Environment: ${env.nodeEnv}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`================================================`);
});
