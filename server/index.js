require('dotenv').config();

const { createApp } = require('./src/app');
const { env } = require('./src/config/env');
const { disconnect } = require('./src/db');

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(
    `Proof of Work OS backend listening on http://localhost:${env.PORT}`,
  );
});

function shutdown() {
  server.close(() => {
    disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
