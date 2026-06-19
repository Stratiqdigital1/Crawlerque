// lib/ai-visibility-parser.ts  (V2 — adds citation detection + brand-knowledge)
export interface ParsedResponse {
  promptText: string;
  model: string;
  brandMentioned: boolean;
  brandPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitorsMentioned: string[];
  sourcesCited: string[];
  brandCitations: string[]; // brand's own URLs/domain found in the AI answer
  rawSnippet: string;
}

const STOP_WORDS = new Set([
  "the","a","an","best","top","this","that","these","those","it","its","however","overall",
  "for","with","and","or","but","you","your","they","their","what","which","when","where","why",
  "how","here","there","small","businesses","business","companies","company","startups","teams",
  "free","plan","plans","we","our","us","one","two","three","also","some","many","most","more",
  "less","good","great","popular","options","pros","cons","note","tip","key","gps","while","known",
]);
const IGNORE_BRANDS = ["google","youtube","facebook","wikipedia","reddit","amazon","gmail","linkedin"];

function brandVariations(brandName: string): string[] {
  const b = String(brandName || "").toLowerCase().trim();
  return Array.from(new Set([
    b, b.replace(/\s+/g,""), b.replace(/-/g," "), b.replace(/\s+/g,"-"),
    b.replace(/\.(com|net|org|io|co|ai|us|pk)$/i,""),
  ].filter(Boolean)));
}
function brandTokens(brandName: string): string[] {
  return String(brandName || "").toLowerCase().split(/[\s.-]+/).filter((t) => t.length >= 4);
}
function splitSentences(text: string): string[] {
  return String(text||"").replace(/\n+/g," ").split(/(?<=[.!?])\s+/).map((s)=>s.trim()).filter(Boolean);
}
function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }

export function extractBrandLikeNames(text: string): string[] {
  const found = new Set<string>();
  const t = String(text||"");
  (t.match(/\b([a-z0-9-]+\.(com|net|org|io|co|ai|us|pk))\b/gi)||[]).forEach((d)=>found.add(d.toLowerCase()));
  (t.match(/\b([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+){0,2})\b/g)||[]).forEach((w)=>{
    if (!STOP_WORDS.has(w.toLowerCase())) found.add(w.trim());
  });
  return Array.from(found);
}

export function detectBrand(response: string, brandName: string) {
  const lower = String(response||"").toLowerCase();
  const variations = brandVariations(brandName);
  const tokens = brandTokens(brandName);
  const mentioned = variations.some((v)=>v&&lower.includes(v)) ||
    (tokens.length>0 && tokens.every((t)=>lower.includes(t)));
  if (!mentioned) return { mentioned:false, position:null as number|null, snippet:null as string|null };
  let brandIndex = Infinity;
  for (const v of [...variations, ...tokens]) { const i = lower.indexOf(v); if (i>=0 && i<brandIndex) brandIndex=i; }
  const namesBefore = extractBrandLikeNames(response.slice(0, brandIndex===Infinity?0:brandIndex));
  const sentences = splitSentences(response);
  const snippet = sentences.find((s)=> variations.some((v)=>v&&s.toLowerCase().includes(v)) ||
    (tokens.length>0 && tokens.every((t)=>s.toLowerCase().includes(t)))) || null;
  return { mentioned:true, position: namesBefore.length+1, snippet };
}

// Brand's OWN urls/domain cited in the AI answer (the "which page" signal).
export function extractBrandCitations(response: string, domain: string): string[] {
  const out = new Set<string>();
  const d = String(domain||"").toLowerCase().replace(/^www\./,"");
  if (!d) return [];
  (response.match(/https?:\/\/[^\s)]+/gi)||[]).forEach((u)=>{ if (u.toLowerCase().includes(d)) out.add(u.replace(/[).,]+$/,"")); });
  const re = new RegExp(`\\b(?:www\\.)?${escapeRe(d)}(?:/[\\w\\-/]*)?`, "gi");
  (response.match(re)||[]).forEach((m)=>out.add(m.replace(/[).,]+$/,"")));
  return Array.from(out).slice(0,5);
}

// Does the AI actually KNOW this brand (vs disclaim)?
export function knowsBrand(response: string, brandName: string, domain: string): boolean {
  const r = String(response||"").toLowerCase();
  if (r.length < 50) return false;
  const disclaimers = ["i couldn't find","i could not find","i don't have","i do not have",
    "not aware of","no information","unable to find","i'm not familiar","i am not familiar",
    "doesn't appear to be","does not appear","i cannot find","no specific information","i'm unable"];
  const mentioned = brandVariations(brandName).some((v)=>v&&r.includes(v)) || r.includes(domain.toLowerCase());
  const disclaimed = disclaimers.some((d)=>r.includes(d));
  return mentioned && !disclaimed;
}

export function extractCompetitors(response: string, brandName: string, knownCompetitors: string[]=[]): string[] {
  const out = new Set<string>();
  const brandVars = brandVariations(brandName);
  const tokens = brandTokens(brandName);
  const isBrand = (s:string)=>{ const ls=s.toLowerCase(); return brandVars.some((v)=>v&&ls.includes(v))||tokens.some((t)=>ls.includes(t)); };
  const lowerResp = String(response||"").toLowerCase();
  knownCompetitors.forEach((c)=>{ if (c && lowerResp.includes(String(c).toLowerCase()) && !isBrand(c)) out.add(String(c)); });
  extractBrandLikeNames(response).forEach((n)=>{ const ln=n.toLowerCase(); if (!isBrand(n) && !IGNORE_BRANDS.some((g)=>ln.includes(g)) && n.length>2) out.add(n); });
  return Array.from(out).slice(0,15);
}

export function extractSources(response: string): string[] {
  const urls = String(response||"").match(/https?:\/\/[^\s)]+/g)||[];
  const domains = String(response||"").match(/\b([a-z0-9-]+\.(com|net|org|io|co|ai|gov|edu|pk))\b/gi)||[];
  return Array.from(new Set([...urls, ...domains.map((d)=>d.toLowerCase())])).slice(0,10);
}

const POSITIVE=["best","leading","top","excellent","great","popular","recommended","trusted","powerful","reliable","strong","favorite","ideal","robust","affordable","versatile","quality","value"];
const NEGATIVE=["worst","poor","weak","expensive","limited","lacking","outdated","difficult","unreliable","buggy","slow","avoid","drawback","downside"];
export function detectSentiment(snippet: string|null): "positive"|"neutral"|"negative"|null {
  if (!snippet) return null; const s=snippet.toLowerCase(); let sc=0;
  POSITIVE.forEach((w)=>{ if (s.includes(w)) sc++; }); NEGATIVE.forEach((w)=>{ if (s.includes(w)) sc--; });
  return sc>0?"positive":sc<0?"negative":"neutral";
}

export function parseResponse(rawResponse: string, promptText: string, model: string, brandName: string, domain: string, knownCompetitors: string[]=[]): ParsedResponse {
  const { mentioned, position, snippet } = detectBrand(rawResponse, brandName);
  return {
    promptText, model,
    brandMentioned: mentioned,
    brandPosition: position,
    sentiment: mentioned ? detectSentiment(snippet) : null,
    competitorsMentioned: extractCompetitors(rawResponse, brandName, knownCompetitors),
    sourcesCited: extractSources(rawResponse),
    brandCitations: extractBrandCitations(rawResponse, domain),
    rawSnippet: snippet || "",
  };
}