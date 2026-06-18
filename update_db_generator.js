const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  const generators = await prisma.generator.findMany();
  console.log(`Found ${generators.length} generators.`);

  for (const gen of generators) {
    console.log(`Generator ID: ${gen.id}, Name: "${gen.name}", Owner: "${gen.ownerName}"`);
    if (gen.name === 'مولدتي') {
      console.log(`Updating Generator name from "مولدتي" to "أمبيري"...`);
      await prisma.generator.update({
        where: { id: gen.id },
        data: { name: 'أمبيري' }
      });
      console.log("Updated name successfully.");
    }
  }

  // Also check if any other table fields contain the word "مولدتي" (like subscribers or board names)
  const boards = await prisma.board.findMany({
    where: {
      name: { contains: 'مولدتي' }
    }
  });
  console.log(`Found ${boards.length} boards containing 'مولدتي'.`);
  for (const board of boards) {
    const newName = board.name.replace(/مولدتي/g, 'أمبيري');
    console.log(`Updating Board name: "${board.name}" -> "${newName}"`);
    await prisma.board.update({
      where: { id: board.id },
      data: { name: newName }
    });
  }

  console.log("Database update completed successfully.");
}

main()
  .catch(err => {
    console.error("Error updating database:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
