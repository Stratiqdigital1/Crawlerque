// app/for-seo-teams/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = { title: "Crawler Que for SEO Teams" };

export default function ForSeoTeamsPage() {
  return (
    <PersonaPage
      eyebrow="For SEO teams"
      title="One audit. Every signal your team works from."
      sub="Stop juggling five tools to assemble one picture. Crawler Que runs technical, content, keyword, competitor, backlink, and AI visibility analysis in a single pass."
      pains={[
        { t: "Signal scattered across tools", d: "Crawl data here, keywords there, Core Web Vitals somewhere else. Assembling the picture is the job before the job." },
        { t: "Stakeholders need translations", d: "Leadership doesn't want crawl logs — they want scores, trends, and priorities they can read in two minutes." },
        { t: "AI search is a blind spot", d: "Traffic is shifting to AI answers and most teams have zero measurement of where they stand." },
      ]}
      features={[
        { t: "Eight modules, one run", d: "SEO foundation, Core Web Vitals, traffic modelling, keywords, competitors, backlinks, content quality, and AI visibility — one URL, one report." },
        { t: "Executive-ready exports", d: "Score gauges, benchmarks, and a prioritised roadmap that survives being forwarded to a VP." },
        { t: "Honest confidence labels", d: "Traffic estimates carry confidence tiers based on ranked keyword depth. We never dress up thin data as certainty." },
        { t: "Saved history & re-runs", d: "Every audit is stored. Re-run monthly and show movement, not snapshots." },
      ]}
      proof="Teams use Crawler Que as the shared starting point: run the audit Monday, assign the action cards by owner (SEO, content, dev), and track score movement month over month. The 30/60/90 roadmap doubles as your sprint backlog."
    />
  );
}