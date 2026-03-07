import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  await prisma.moltbotConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      dailyQuotaBRL: 10.0,
      currentUsageBRL: 0.0,
      activeMode: 'HYBRID',
    },
  });
  console.log('Moltbot configuration initialized.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
