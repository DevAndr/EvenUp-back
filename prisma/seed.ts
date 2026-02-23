import { PrismaClient } from '../src/generated';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Очистка ──────────────────────────────────────────────────────────────────
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // ── Пользователи ─────────────────────────────────────────────────────────────
  const alice = await prisma.user.create({
    data: {
      telegramId: BigInt(100001),
      name: 'Alice Ivanova',
      username: 'alice_iv',
    },
  });
  const bob = await prisma.user.create({
    data: { telegramId: BigInt(100002), name: 'Bob Petrov', username: 'bob_p' },
  });
  const charlie = await prisma.user.create({
    data: {
      telegramId: BigInt(100003),
      name: 'Charlie Sidorov',
      username: 'charlie_s',
    },
  });
  const diana = await prisma.user.create({
    data: {
      telegramId: BigInt(100004),
      name: 'Diana Kozlova',
      username: 'diana_k',
    },
  });

  // ── Группа 1: Сочи (EQUAL) ───────────────────────────────────────────────────
  // Участники: Alice, Bob, Charlie
  // Балансы итого: Alice +6800, Bob +800, Charlie -7600
  // Долги: Charlie → Alice 6800 (CONFIRMED), Charlie → Bob 800 (PENDING)
  const sochi = await prisma.group.create({
    data: {
      name: 'Путешествие в Сочи',
      emoji: '🏖️',
      description: 'Поездка на море, июль',
      splitType: 'EQUAL',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Авиабилеты',
      amount: 15000,
      category: 'PLANE',
      date: new Date('2024-07-01'),
      paidById: alice.id,
      groupId: sochi.id,
      splits: {
        create: [
          { userId: alice.id, amount: 5000 },
          { userId: bob.id, amount: 5000 },
          { userId: charlie.id, amount: 5000 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Отель (3 ночи)',
      amount: 9000,
      category: 'HOME',
      date: new Date('2024-07-02'),
      paidById: bob.id,
      groupId: sochi.id,
      splits: {
        create: [
          { userId: alice.id, amount: 3000 },
          { userId: bob.id, amount: 3000 },
          { userId: charlie.id, amount: 3000 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Такси в аэропорт',
      amount: 600,
      category: 'TAXI',
      date: new Date('2024-07-05'),
      paidById: charlie.id,
      groupId: sochi.id,
      splits: {
        create: [
          { userId: alice.id, amount: 200 },
          { userId: bob.id, amount: 200 },
          { userId: charlie.id, amount: 200 },
        ],
      },
    },
  });

  await prisma.settlement.create({
    data: {
      groupId: sochi.id,
      fromUserId: charlie.id,
      toUserId: alice.id,
      amount: 6800,
      status: 'CONFIRMED',
      settledAt: new Date('2024-07-10'),
      note: 'Перевёл через Сбер',
    },
  });

  await prisma.settlement.create({
    data: {
      groupId: sochi.id,
      fromUserId: charlie.id,
      toUserId: bob.id,
      amount: 800,
      status: 'PENDING',
    },
  });

  // ── Группа 2: Квартира (CUSTOM) ───────────────────────────────────────────────
  // Участники: Alice, Bob, Diana
  // Балансы итого: Alice +28600, Bob -15800, Diana -12800
  // Долги: Bob → Alice 15800 (PENDING), Diana → Alice 12800 (PENDING)
  const apartment = await prisma.group.create({
    data: {
      name: 'Квартира',
      emoji: '🏠',
      description: 'Совместная аренда',
      splitType: 'CUSTOM',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: diana.id },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Аренда — июнь',
      amount: 45000,
      category: 'HOME',
      date: new Date('2024-06-01'),
      paidById: alice.id,
      groupId: apartment.id,
      splits: {
        create: [
          { userId: alice.id, amount: 15000 },
          { userId: bob.id, amount: 15000 },
          { userId: diana.id, amount: 15000 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Продукты',
      amount: 3600,
      category: 'GROCERY',
      date: new Date('2024-06-15'),
      paidById: diana.id,
      groupId: apartment.id,
      splits: {
        create: [
          { userId: alice.id, amount: 1200 },
          { userId: bob.id, amount: 1200 },
          { userId: diana.id, amount: 1200 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Интернет',
      amount: 600,
      category: 'HOME',
      date: new Date('2024-06-10'),
      paidById: bob.id,
      groupId: apartment.id,
      splits: {
        create: [
          { userId: alice.id, amount: 200 },
          { userId: bob.id, amount: 200 },
          { userId: diana.id, amount: 200 },
        ],
      },
    },
  });

  // ── Вывод результатов ─────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET;

  console.log('✅ Seed complete!\n');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│                    USERS                        │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Alice   id: ${alice.id.padEnd(28)} │`);
  console.log(`│ Bob     id: ${bob.id.padEnd(28)} │`);
  console.log(`│ Charlie id: ${charlie.id.padEnd(28)} │`);
  console.log(`│ Diana   id: ${diana.id.padEnd(28)} │`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│                    GROUPS                       │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Сочи     id: ${sochi.id.padEnd(27)} │`);
  console.log(`│ Квартира id: ${apartment.id.padEnd(27)} │`);
  console.log('└─────────────────────────────────────────────────┘');

  if (jwtSecret) {
    const expiresIn = '7d';
    const tokens = {
      alice: jwt.sign({ sub: alice.id }, jwtSecret, { expiresIn }),
      bob: jwt.sign({ sub: bob.id }, jwtSecret, { expiresIn }),
      charlie: jwt.sign({ sub: charlie.id }, jwtSecret, { expiresIn }),
      diana: jwt.sign({ sub: diana.id }, jwtSecret, { expiresIn }),
    };

    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│               JWT TOKENS (7d)                   │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│ Alice:\n│   ${tokens.alice}`);
    console.log(`│ Bob:\n│   ${tokens.bob}`);
    console.log(`│ Charlie:\n│   ${tokens.charlie}`);
    console.log(`│ Diana:\n│   ${tokens.diana}`);
    console.log('└─────────────────────────────────────────────────┘');
    console.log('\nИспользование: Authorization: Bearer <token>\n');
  } else {
    console.log('\n⚠️  JWT_SECRET не найден в .env — токены не сгенерированы');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
