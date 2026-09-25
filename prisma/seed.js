const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) return;
  await prisma.project.upsert({
    where: {
      id: process.env.SEED_PROJECT_ID || '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: process.env.SEED_PROJECT_ID || '00000000-0000-0000-0000-000000000001',
      ownerId,
      name: 'Getting started',
      description: 'Seed project',
    },
  });
}
main().finally(() => prisma.$disconnect());
