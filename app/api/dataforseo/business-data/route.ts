import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) return null;

  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function dataForSeoPost(endpoint: string, payload: any[]) {
  const auth = getAuthHeader();

  if (!auth) {
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  }

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.status_message || "Business Data request failed");
  }

  return json;
}

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDomain(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";

  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .toLowerCase();
  }
}

function brandFromDomain(domain: string) {
  return domain
    .split(".")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function compact(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBrandMatch(item: any, brandName: string, domain: string) {
  const title = compact(item?.title);
  const website = normalizeDomain(item?.website || item?.url);
  const brand = compact(brandName);
  const domainRoot = compact(domain.split(".")[0]);

  return Boolean(
    (brand.length >= 4 && title.includes(brand)) ||
      (domainRoot.length >= 4 && title.includes(domainRoot)) ||
      (website && website === domain)
  );
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message:
      "Local Business Data API is working. Use POST with brand, service, and location context.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const domain = normalizeDomain(body?.url || body?.domain);
    const brandName = clean(body?.brandName) || brandFromDomain(domain);
    const serviceKeyword = clean(
      body?.serviceKeyword || body?.keyword || body?.seedKeyword
    );
    const locationName = clean(body?.locationName) || "United States";
    const languageName = clean(body?.languageName) || "English";
    const languageCode = clean(body?.languageCode) || "en";
    const locationCode = Number(body?.locationCode || 0) || null;

    if (!brandName && !domain) {
      return NextResponse.json(
        { success: false, error: "Brand or domain is required" },
        { status: 400 }
      );
    }

    const queryParts = [
      brandName,
      serviceKeyword && compact(serviceKeyword) !== compact(brandName)
        ? serviceKeyword
        : "",
      locationName,
    ].filter(Boolean);
    const query = Array.from(new Set(queryParts)).join(" ");

    const res = await dataForSeoPost(
      "business_data/google/my_business_info/live",
      [
        {
          keyword: query,
          location_name: locationName,
          language_name: languageName,
        },
      ]
    );

    const rawItems = res?.tasks?.[0]?.result?.[0]?.items || [];
    const marketListings = rawItems.slice(0, 10).map((item: any) => ({
      title: item.title || "",
      category: item.category || "",
      address: item.address || "",
      phone: item.phone || "",
      rating: item.rating?.value || item.rating || null,
      reviews: item.rating?.votes_count || item.reviews_count || null,
      url: item.url || "",
      website: item.website || "",
      isBrandMatch: isBrandMatch(item, brandName, domain),
    }));

    const listings = marketListings.filter((item: any) => item.isBrandMatch);

    return NextResponse.json({
      success: true,
      businessData: {
        domain,
        brandName,
        serviceKeyword,
        query,
        keyword: query,
        location: locationName,
        language: languageName,
        languageCode,
        locationCode,
        searchEngine: "google",
        listings,
        marketListings,
        matchStatus: listings.length > 0 ? "brand-listing-found" : "brand-listing-not-found",
        source: "DataForSEO Business Data API",
        note:
          listings.length > 0
            ? "Brand-matched listings are shown separately from wider local market results."
            : "No exact brand listing was verified. Wider market results are not presented as the audited brand's listings.",
      },
    });
  } catch (error) {
    console.error("Business Data route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Business Data API failed",
      },
      { status: 500 }
    );
  }
}
