process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10000';

const {
  buildTestApp,
  cleanDatabase,
  prisma,
} = require('../server/integration/helpers');

const PORT = Number(process.env.PORT) || 4000;
const app = buildTestApp();

// Test-only reset endpoint mounted outside /api to bypass auth middleware
app.post('/test-reset', async (req, res) => {
  try {
    await cleanDatabase();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`E2E test backend running on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    prisma.$disconnect().then(() => {
      process.exit(0);
    });
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
