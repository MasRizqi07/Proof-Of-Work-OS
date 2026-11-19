const { URL } = require('node:url');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../src/app');
const {
  createAuthMiddleware,
  defaultProvisionUser,
} = require('../src/middleware/auth');

const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/proof_of_work_os_test';
process.env.DATABASE_URL = dbUrl;

const dbName = new URL(dbUrl).pathname.slice(1);
if (!dbName.endsWith('_test')) {
  console.error(
    `Refusing to run: database name "${dbName}" must end with _test`,
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function makeAuthMiddleware({ provisionUser } = {}) {
  return createAuthMiddleware({
    verifyToken: async (token) => {
      if (token === 'user-a') {
        return {
          sub: USER_A,
          email: 'user-a@example.com',
          user_metadata: { full_name: 'User A' },
          role: 'authenticated',
        };
      }
      if (token === 'user-b') {
        return {
          sub: USER_B,
          email: 'user-b@example.com',
          user_metadata: { full_name: 'User B' },
          role: 'authenticated',
        };
      }
      throw new Error('invalid token');
    },
    provisionUser: provisionUser || defaultProvisionUser,
  });
}

function buildTestApp(options = {}) {
  const authMiddleware = options.authMiddleware || makeAuthMiddleware(options);
  return createApp({ db: prisma, authMiddleware });
}

async function cleanDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "ActivityEvent","Evidence","Task","Project","Profile","User" CASCADE;',
  );
}

module.exports = {
  prisma,
  USER_A,
  USER_B,
  buildTestApp,
  cleanDatabase,
};
