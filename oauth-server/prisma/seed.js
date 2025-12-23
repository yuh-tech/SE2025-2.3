import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedUsers = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
    name: 'Administrator',
    roles: ['admin'],
    permissions: ['*'],
    emailVerified: true,
  },
  {
    username: 'user',
    password: 'user123',
    email: 'user@example.com',
    name: 'User Demo',
    roles: ['user'],
    permissions: [],
    emailVerified: true,
  },
  {
    username: 'demo',
    password: 'demo123',
    email: 'demo@example.com',
    name: 'Demo Account',
    roles: ['demo'],
    permissions: [],
    emailVerified: true,
  },
];

async function upsertUser(u) {
  const passwordHash = await bcrypt.hash(u.password, 10);

  return prisma.user.upsert({
    where: { username: u.username },
    update: {
      passwordHash,
      email: u.email,
      name: u.name,
      emailVerified: !!u.emailVerified,
      roles: u.roles || [],
      permissions: u.permissions || [],
      nickname: u.username,
    },
    create: {
      username: u.username,
      passwordHash,
      email: u.email,
      name: u.name,
      emailVerified: !!u.emailVerified,
      roles: u.roles || [],
      permissions: u.permissions || [],
      nickname: u.username,
    },
  });
}

async function main() {
  console.log('🌱 Seeding demo users...');
  for (const user of seedUsers) {
    const result = await upsertUser(user);
    console.log(`  - ${result.username} seeded`);
  }
  console.log('✅ Done.');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

