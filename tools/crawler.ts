import { chromium } from "playwright";

type PageAuditData = {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2Count: number;
  wordCount: number;
  totalImages: number;
  imagesWithoutAlt: number;
  internalLinks: string[];
  canonical: string;
};

type SiteAuditData = {
  pages: PageAuditData[];
};

async function auditSinglePage(page: any, url: string): Promise<PageAuditData> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const data = await page.evaluate(() => {
    const title = document.title;

    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

    const h1 = document.querySelector("h1")?.textContent?.trim() || "";

    const h2s = Array.from(document.querySelectorAll("h2")).map(
      (h) => h.textContent?.trim() || ""
    );

    const images = Array.from(document.querySelectorAll("img"));
    const imagesWithoutAlt = images.filter((img) => !img.getAttribute("alt"));

    const links = Array.from(document.querySelectorAll("a"))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => href.startsWith(window.location.origin));

    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

    const wordCount = document.body.innerText.split(/\s+/).filter(Boolean).length;

    return {
      title,
      metaDescription,
      h1,
      h2Count: h2s.length,
      wordCount,
      totalImages: images.length,
      imagesWithoutAlt: imagesWithoutAlt.length,
      internalLinks: Array.from(new Set(links)),
      canonical,
    };
  });

  return {
    url,
    ...data,
    internalLinks: data.internalLinks.slice(0, 20),
  };
}

export async function crawlHomepage(url: string): Promise<SiteAuditData> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const homepageData = await auditSinglePage(page, url);

    const priorityKeywords = [
      "/collections",
      "/products",
      "/services",
      "/service",
      "/pages",
      "/blog",
      "/blogs",
      "/about",
      "/contact",
    ];

    const extraLinks = homepageData.internalLinks
      .filter((link) => link !== url && !link.includes("/cart") && !link.includes("/account"))
      .sort((a, b) => {
        const aScore = priorityKeywords.some((k) => a.includes(k)) ? 0 : 1;
        const bScore = priorityKeywords.some((k) => b.includes(k)) ? 0 : 1;
        return aScore - bScore;
      })
      .slice(0, 3);

    const pages: PageAuditData[] = [homepageData];

    for (const link of extraLinks) {
      try {
        const newPage = await browser.newPage();
        const pageData = await auditSinglePage(newPage, link);
        pages.push(pageData);
        await newPage.close();
      } catch (error) {
        console.error(`Failed to audit page: ${link}`, error);
      }
    }

    return { pages };
  } finally {
    await browser.close();
  }
}