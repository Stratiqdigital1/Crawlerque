import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@stratiq.com";
  const password = "Admin123456!";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
  passwordHash,
  role: "admin",
  packageName: "Enterprise",
},
    create: {
  email,
  name: "Admin",
  passwordHash,
      role: "admin",
      packageName: "Enterprise",
      monthlyAudits: 9999,
      allowPdf: true,
      allowAi: true,
      allowTraffic: true,
      allowKeywords: true,
      allowBacklinks: true,
      allowLocalSeo: true,
      allowWhiteLabel: true,
    },
  });

  console.log("Admin created:", email, password);
}

main().finally(() => prisma.$disconnect());