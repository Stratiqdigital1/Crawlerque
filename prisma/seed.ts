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
  stripePriceId?: string | null;
  stripePriceIdAnnual?: string | null;
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
    name: "Trial",
    priceMonthly: 0,
    description:
      "7-day free trial with full access to all audit modules. 3 audits included.",
    monthlyAudits: 3,
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRIAL || null,
    stripePriceIdAnnual: null,
  });
  
await upsertPackage({
    name: "Starter",
    priceMonthly: 30,
    description:
      "Starter plan for basic SEO and technical audits with Crawler Que branding.",
    monthlyAudits: 7,
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || null,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || null,
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || null,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL || null,
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || null,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || null,
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