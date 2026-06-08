import { NextResponse } from "next/server";

async function fetchHTML(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.text();
  } catch {
    return "";
  }
}

function extractText(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractKeywords(text: string) {
  const words = text.split(" ");

  const stopWords = new Set([
    "the",
    "is",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "a",
    "an",
    "by",
    "at",
    "from",
    "as",
    "it",
    "this",
    "that",
    "are",
    "be",
    "was",
    "were",
    "will",
    "can",
    "your",
    "you",
    "our",
    "not",
    "all",
    "more",
    "home",
    "about",
    "contact",
  ]);

  const freq: Record<string, number> = {};

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i]?.replace(/[^a-z0-9]/g, "");
    const w2 = words[i + 1]?.replace(/[^a-z0-9]/g, "");

    if (
      w1 &&
      w2 &&
      w1.length > 3 &&
      w2.length > 3 &&
      !stopWords.has(w1) &&
      !stopWords.has(w2)
    ) {
      const phrase = `${w1} ${w2}`;
      freq[phrase] = (freq[phrase] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([keyword]) => keyword);
}

function normalizeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
  }
}

function hashString(str: string) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getCTR(position: number) {
  const ctrMap: Record<number, number> = {
    1: 0.28,
    2: 0.15,
    3: 0.1,
    4: 0.07,
    5: 0.05,
    6: 0.04,
    7: 0.03,
    8: 0.025,
    9: 0.02,
    10: 0.015,
  };

  return ctrMap[position] || 0.01;
}

export async function POST(req: Request) {
  try {
    const { url, seoScore = 50, aiVisibility = 10 } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const domain = normalizeDomain(url);

const country =
  domain.endsWith(".pk")
    ? "Pakistan"
    : domain.endsWith(".uk")
    ? "United Kingdom"
    : domain.endsWith(".ca")
    ? "Canada"
    : domain.endsWith(".au")
    ? "Australia"
    : "United States";

const html = await fetchHTML(url);
    const text = extractText(html);
    const realKeywords = extractKeywords(text);

    const authority =
      (Number(seoScore) / 100) * 0.7 + (Number(aiVisibility) / 100) * 0.3;

    let keywords = realKeywords.slice(0, 50).map((keyword, index) => {
      const volume = 50 + (hashString(keyword) % 1200);

      const position = Math.min(
        10,
        Math.max(1, Math.round(11 - authority * 10 + (index % 3)))
      );

      const ctr = getCTR(position);
      const traffic = Math.round(volume * ctr);

      return {
        keyword,
        volume,
        position,
        ctr,
        traffic,
      };
    });

    if (!keywords.length) {
      const fallbackKeyword = domain.split(".")[0]?.replace(/[-_]/g, " ") || "brand";

      keywords = [
        {
          keyword: fallbackKeyword,
          volume: 500,
          position: 10,
          ctr: 0.015,
          traffic: 8,
        },
      ];
    }

    const totalTraffic = keywords.reduce((sum, item) => sum + item.traffic, 0);

    const monthlyTraffic = Math.max(50, Math.min(totalTraffic, 50000));
    const dailyTraffic = Math.round(monthlyTraffic / 30);

    const trafficScore =
  monthlyTraffic > 25000
    ? "High"
    : monthlyTraffic > 5000
    ? "Medium"
    : "Low";

    return NextResponse.json({
      success: true,
      traffic: {
  country,
  monthly: monthlyTraffic,
  daily: dailyTraffic,
  score: trafficScore,
  keywords,
  model: "Keyword Extraction + CTR Estimate",
},
    });
  } catch (error) {
    console.error("Traffic simulation failed:", error);

    return NextResponse.json(
      { success: false, error: "Traffic simulation failed" },
      { status: 500 }
    );
  }
}