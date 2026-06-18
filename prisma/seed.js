const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 1. Create Super Admin
  const adminUsername = 'admin';
  const adminHash = await bcrypt.hash('admin123', 10);
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'مدير النظام العام',
        username: adminUsername,
        passwordHash: adminHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log('Super Admin user seeded.');
  }

  // 2. Create Generator and Owner "أبو لينا"
  const ownerUsername = 'abolina';
  const ownerHash = await bcrypt.hash('1234', 10);
  const existingOwner = await prisma.user.findUnique({
    where: { username: ownerUsername }
  });

  if (!existingOwner) {
    // Create generator
    const generator = await prisma.generator.create({
      data: {
        name: 'مولدة أبو لينا الأهلية',
        ownerName: 'أبو لينا',
        phone: '07701234567',
        area: 'الكرادة / زقاق 12',
        subscriptionType: 'شهري',
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        paymentDueDay: 10,
        status: 'ACTIVE'
      }
    });

    // Create owner user linked to generator
    const owner = await prisma.user.create({
      data: {
        name: 'أبو لينا',
        username: ownerUsername,
        passwordHash: ownerHash,
        role: 'OWNER',
        generatorId: generator.id,
        status: 'ACTIVE'
      }
    });

    console.log('Owner "abolina" and Generator seeded.');

    // Create a Board
    const board = await prisma.board.create({
      data: {
        generatorId: generator.id,
        name: 'بورد الزقاق 12',
        area: 'الكرادة',
        address: 'شارع الصناعة - قرب مكتبة الصباح',
        defaultAmpPrice: 12000,
        status: 'ACTIVE',
        notes: 'بورد رئيسي يغذي المحلة 906'
      }
    });
    console.log('Default Board seeded.');

    // Create Subscribers
    await prisma.subscriber.create({
      data: {
        generatorId: generator.id,
        boardId: board.id,
        name: 'أحمد جبار كريم',
        phone: '07801112223',
        address: 'محلة 906 - زقاق 12 - دار 15',
        amps: 5,
        ampPrice: 12000,
        oldDebt: 25000,
        status: 'ACTIVE'
      }
    });

    await prisma.subscriber.create({
      data: {
        generatorId: generator.id,
        boardId: board.id,
        name: 'محمد عبد الله جاسم',
        phone: '07709998887',
        address: 'محلة 906 - زقاق 12 - دار 22',
        amps: 10,
        ampPrice: 11000,
        oldDebt: 0,
        status: 'ACTIVE'
      }
    });
    console.log('Default Subscribers seeded.');

    // Create Employee User
    const employeeUsername = 'ali_gaby';
    const employeeHash = await bcrypt.hash('1234', 10);
    const employee = await prisma.user.create({
      data: {
        name: 'علي الجابي',
        username: employeeUsername,
        passwordHash: employeeHash,
        role: 'EMPLOYEE',
        generatorId: generator.id,
        boardId: board.id,
        status: 'ACTIVE'
      }
    });

    // Create permissions for employee
    const permissions = ['add_subscriber', 'edit_subscriber', 'collect_payment'];
    await prisma.permission.createMany({
      data: permissions.map(key => ({
        userId: employee.id,
        permissionKey: key,
        value: true
      }))
    });

    console.log('Employee "ali_gaby" and permissions seeded.');
  } else {
    console.log('Owner user "abolina" already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
