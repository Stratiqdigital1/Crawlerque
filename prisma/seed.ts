import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function upsertPackage(data: {
  name: string;
  priceMonthly: number;
  description: string;
  monthlyAudits: number;
  allowPdf: boolean;
  allowAi: boolean;
  allowTraffic: boolean;
  allowKeywords: boolean;
  allowBacklinks: boolean;
  allowLocalSeo: boolean;
  allowWhiteLabel: boolean;
  allowComparisonReports: boolean;
  historyDays: number;
  seatLimit: number;
  prioritySupport: boolean;
}) {
  return prisma.package.upsert({
    where: { name: data.name },
    update: data,
    create: data,
  });
}

async function main() {
  const adminEmail = "admin@stratiqdigital.com";
  const adminPassword = "Admin@12345";

  await upsertPackage({
    name: "Starter",
    priceMonthly: 49,
    description:
      "Starter plan for basic SEO and technical audits with Crawler Que branding.",
    monthlyAudits: 10,
    allowPdf: true,
allowAi: true,
allowTraffic: true,
allowKeywords: true,
allowBacklinks: true,
allowLocalSeo: true,
allowWhiteLabel: false,
allowComparisonReports: false,
    historyDays: 30,
    seatLimit: 1,
    prioritySupport: false,
  });

  const agencyPackage = await upsertPackage({
    name: "Agency",
    priceMonthly: 99,
    description:
      "Agency plan with all audit modules, comparison reports, and white-label reporting.",
    monthlyAudits: 40,
    allowPdf: true,
    allowAi: true,
    allowTraffic: true,
    allowKeywords: true,
    allowBacklinks: true,
    allowLocalSeo: true,
    allowWhiteLabel: true,
    allowComparisonReports: true,
    historyDays: 90,
    seatLimit: 3,
    prioritySupport: false,
  });

  await upsertPackage({
    name: "Enterprise",
    priceMonthly: 299,
    description:
      "High-volume agencies and consultancies with multiple clients.",
    monthlyAudits: 150,
    allowPdf: true,
    allowAi: true,
    allowTraffic: true,
    allowKeywords: true,
    allowBacklinks: true,
    allowLocalSeo: true,
    allowWhiteLabel: true,
    allowComparisonReports: true,
    historyDays: 3650,
    seatLimit: 10,
    prioritySupport: true,
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: "admin",
        status: "active",
        mustChangePassword: false,
        packageId: agencyPackage.id,
      },
    });
  }

  console.log("Packages ready: Starter, Agency, Enterprise");
  console.log("Admin user ready:");
  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });