type PromptSeedInput = {
  domain: string;
  brandName: string;
};

export type GeneratedPrompt = {
  text: string;
  type:
    | "BRAND_DISCOVERY"
    | "COMMERCIAL"
    | "COMPARISON"
    | "CATEGORY"
    | "ALTERNATIVE"
    | "REVIEW";
  order: number;
};

export function generatePrompts({
  domain,
  brandName,
}: PromptSeedInput): GeneratedPrompt[] {
  return [
    {
      order: 1,
      type: "BRAND_DISCOVERY",
      text: `What do you know about ${brandName}?`,
    },
    {
      order: 2,
      type: "COMMERCIAL",
      text: `What are the best brands or companies like ${brandName} in this space?`,
    },
    {
      order: 3,
      type: "COMPARISON",
      text: `Compare ${brandName} with its top competitors.`,
    },
    {
      order: 4,
      type: "CATEGORY",
      text: `Which companies would you recommend if I am evaluating solutions similar to ${brandName}?`,
    },
    {
      order: 5,
      type: "ALTERNATIVE",
      text: `What are the top alternatives to ${brandName}?`,
    },
    {
      order: 6,
      type: "REVIEW",
      text: `Is ${brandName} considered a strong brand in its category? Why or why not?`,
    },
  ];
}