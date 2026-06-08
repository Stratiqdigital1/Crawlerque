import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runAIQuery } from "@/lib/ai";
import { normalizeDomain } from "@/lib/ai/domain";
import { detectBrandName } from "@/lib/ai/brand";
import { runWithConcurrency } from "@/lib/ai/run-batch";

function buildDefaultPrompts(brandName: string) {
  return [
    `What do you know about ${brandName}?`,
    `What are the best brands or companies like ${brandName} in this space?`,
    `Compare ${brandName} with its top competitors.`,
    `Which companies would you recommend if I am evaluating solutions similar to ${brandName}?`,
    `What are the top alternatives to ${brandName}?`,
    `Is ${brandName} considered a strong brand in its category? Why or why not?`,
  ];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function brandMentionedInResponse(brandName: string, responseText: string) {
  return normalizeText(responseText).includes(normalizeText(brandName));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawDomain = body.domain;

    if (!rawDomain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    const normalizedDomain = normalizeDomain(rawDomain);
    const brandName = await detectBrandName(normalizedDomain);

    const existingProject = await prisma.project.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    const generatedPrompts = buildDefaultPrompts(brandName);

    const project = existingProject
      ? await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            prompts: generatedPrompts,
          },
        })
      : await prisma.project.create({
          data: {
            prompts: generatedPrompts,
          },
        });

    const settled = await runWithConcurrency(
      generatedPrompts,
      async (promptText: string) => {
        try {
          const rawResponse = await runAIQuery(promptText);

          const responseText =
            typeof rawResponse === "string"
              ? rawResponse
              : JSON.stringify(rawResponse);

          const brandFound = brandMentionedInResponse(
            brandName,
            responseText
          );

          return {
            ok: true,
            prompt: promptText,
            response: responseText,
            brandFound,
            engine: "ChatGPT",
          };
        } catch (error: any) {
          return {
            ok: false,
            prompt: promptText,
            error: error?.message || "Prompt failed",
          };
        }
      },
      2
    );

    const results = settled.filter((r: any) => r?.ok);
    const totalPrompts = results.length;
    const brandMentions = results.filter((r: any) => r.brandFound).length;

    const visibilityScore =
      totalPrompts > 0
        ? Math.round((brandMentions / totalPrompts) * 100)
        : 0;

    const shareOfVoice =
      totalPrompts > 0
        ? Number(((brandMentions / totalPrompts) * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      success: true,
      projectId: project.id,
      brandName,
      domain: normalizedDomain,
      stats: {
        totalPrompts,
        brandMentions,
        visibilityScore,
        shareOfVoice,
        averageRank: null,
      },
      results,
      settled,
    });
  } catch (error: any) {
    console.error("RUN_AI_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Run failed",
      },
      { status: 500 }
    );
  }
}