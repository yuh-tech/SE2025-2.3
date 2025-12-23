import { PrismaClient } from '@prisma/client';

let prisma;

/**
 * Create/reuse a single Prisma client (avoids "Too many connections").
 * Logs only errors by default to keep noise low.
 */
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.PRISMA_LOG?.split(',') || ['error'],
    });
  }
  return prisma;
}

/**
 * Ensure DB connectivity early; useful at startup/health-check.
 */
export async function assertDbConnection() {
  const client = getPrisma();
  await client.$queryRaw`SELECT 1`;
  return true;
}

/**
 * Graceful shutdown helper.
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

