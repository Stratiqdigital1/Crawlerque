import { NextResponse } from "next/server";

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

  return res.json();
}

export async function GET() {
  return runBusinessData({
    keyword: "los angeles multifamily realtor",
    locationName: "United States",
    languageName: "English",
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return runBusinessData({
    keyword: body?.keyword || body?.brandName || body?.domain || "business services",
    locationName: body?.locationName || "United States",
    languageName: body?.languageName || "English",
  });
}

async function runBusinessData({
  keyword,
  locationName,
  languageName,
}: {
  keyword: string;
  locationName: string;
  languageName: string;
}) {
  try {
    const res = await dataForSeoPost("business_data/google/my_business_info/live", [
      {
        keyword,
        location_name: locationName,
        language_name: languageName,
      },
    ]);

    const items = res?.tasks?.[0]?.result?.[0]?.items || [];

    return NextResponse.json({
      success: true,
      businessData: {
        keyword,
        location: locationName,
        listings: items.slice(0, 10).map((item: any) => ({
          title: item.title || "",
          category: item.category || "",
          address: item.address || "",
          phone: item.phone || "",
          rating: item.rating?.value || item.rating || null,
          reviews: item.rating?.votes_count || item.reviews_count || null,
          url: item.url || "",
          website: item.website || "",
        })),
        source: "DataForSEO Business Data API",
      },
    });
  } catch (error) {
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