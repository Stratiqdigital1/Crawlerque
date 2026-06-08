import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateAuditReport(data: any) {
  const prompt = `
You are a senior SEO, CRO, and technical website auditor.

Analyze the following multi-page website data and generate a professional, client-ready audit.

Website data:
${JSON.stringify(data, null, 2)}

Rules:
- Be clear and concise
- Avoid fluff
- Focus on actionable insights
- Prioritize high-impact issues
- Look for patterns across pages, not just one page
- Mention page-specific issues when relevant

Format EXACTLY like this:

## Executive Summary
Short overview of the website condition and biggest opportunities.

## SEO Issues
- Issue:
- Impact:
- Fix:

## Technical Issues
- Issue:
- Impact:
- Fix:

## UX / Conversion Issues
- Issue:
- Impact:
- Fix:

## Priority Action Plan
- High Priority:
- Medium Priority:
- Low Priority:
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const firstBlock = response.content[0];
  return firstBlock.type === "text" ? firstBlock.text : "No report generated.";
}