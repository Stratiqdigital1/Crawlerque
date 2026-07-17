import {
  BlogStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { blogPosts } from "../lib/blogs";

const prisma = new PrismaClient();

function toJson(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonValue;
}

function parsePublishedDate(value: string) {
  const date = new Date(
    `${value}T12:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid publish date: ${value}`
    );
  }

  return date;
}

async function main() {
  console.log(
    `Found ${blogPosts.length} static blogs.`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of blogPosts) {
    try {
      const existingPost =
        await prisma.blogPost.findUnique({
          where: {
            slug: post.slug,
          },
          select: {
            id: true,
          },
        });

      /*
       * Existing database blogs are never
       * overwritten. This protects anything
       * already edited from the admin panel.
       */
      if (existingPost) {
        skipped += 1;

        console.log(
          `SKIPPED: ${post.slug}`
        );

        continue;
      }

      const publishedAt =
        parsePublishedDate(
          post.publishedAt
        );

      const status =
        publishedAt.getTime() > Date.now()
          ? BlogStatus.SCHEDULED
          : BlogStatus.PUBLISHED;

      await prisma.blogPost.create({
        data: {
          slug: post.slug,
          title: post.title,
          metaTitle: post.metaTitle,
          metaDescription:
            post.metaDescription,
          primaryKeyword:
            post.primaryKeyword || null,
          excerpt: post.excerpt,
          category: post.category,
          authorName: "Crawler Que",
          status,
          publishedAt,
          readingTime:
            post.readingTime ||
            "4 min read",
          heroImage: post.heroImage,
          heroAlt:
            post.heroAlt ||
            post.title,
          images: toJson(post.images),
          blocks: toJson(post.blocks),

          /*
           * Preserve the original blog date
           * rather than making every imported
           * article look newly created.
           */
          createdAt: publishedAt,
          updatedAt: publishedAt,
        },
      });

      created += 1;

      console.log(
        `CREATED: ${post.slug}`
      );
    } catch (error) {
      failed += 1;

      console.error(
        `FAILED: ${post.slug}`,
        error
      );
    }
  }

  console.log("");
  console.log("Import complete");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      "Blog import failed:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });