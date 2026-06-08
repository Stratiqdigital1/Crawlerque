import { chromium } from "playwright";

export async function crawlHomepage(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const data = await page.evaluate(() => {
    const title = document.title;

    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

    const links = Array.from(document.querySelectorAll("a"))
      .map((a) => a.href)
      .filter((href) => href.startsWith(window.location.origin));

    return {
      title,
      metaDescription,
      links: Array.from(new Set(links)).slice(0, 20),
    };
  });

  await browser.close();

  return data;
}