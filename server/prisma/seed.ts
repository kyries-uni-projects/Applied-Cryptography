import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashSync } from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashSync("admin123", 10),
        role: "ADMIN",
      },
    });
    console.log("✅ Admin account created: admin / admin123");
  } else {
    console.log("ℹ️  Admin account already exists");
  }

  // Check if CA config exists
  const existingConfig = await prisma.caConfig.findFirst();
  if (!existingConfig) {
    await prisma.caConfig.create({
      data: {
        algorithm: "RSA",
        hashAlgorithm: "SHA-256",
        keyLength: 2048,
        validityDays: 365,
      },
    });
    console.log("✅ Default CA config created");
  } else {
    console.log("ℹ️  CA config already exists");
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
