import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || "admin@jbc.com.au";
  const password = process.env.SEED_PASSWORD || "changeme123";
  const name = process.env.SEED_NAME || "Anthony Sandy";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping seed.`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hash, name },
  });

  console.log(`Created user: ${user.email} (${user.name})`);
  console.log(`Password: ${password}`);
  console.log(`\nChange the password after first login!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
