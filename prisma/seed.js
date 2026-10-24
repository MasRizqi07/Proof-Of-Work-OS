const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) return;

  await prisma.user.upsert({
    where: { id: ownerId },
    update: {},
    create: {
      id: ownerId,
      externalAuthId: ownerId,
      email: null,
      name: 'Seed User',
    },
  });

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

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
