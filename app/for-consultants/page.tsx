// app/for-consultants/page.tsx
import { PersonaPage } from "@/components/site-shell";

export const metadata = { title: "Crawler Que for Consultants" };

export default function ForConsultantsPage() {
  return (
    <PersonaPage
      eyebrow="For consultants & freelancers"
      title="Look enterprise-level. Pay freelancer prices."
      sub="Deliver branded intelligence reports that justify premium rates — starting at $49/month for ten full audits."
      pains={[
        { t: "Big-tool prices, solo budget", d: "Mainstream SEO suites start at $199+/month — hard to justify with five clients." },
        { t: "Deliverables decide your rate", d: "A polished report is the difference between charging $150 and $500 for the same expertise." },
        { t: "Every prospect wants proof", d: "Closing new clients means showing them something concrete about their site — fast." },
      ]}
      features={[
        { t: "Starter plan at $49", d: "Ten full audits per month, all eight modules, branded PDF export. Pays for itself with one report." },
        { t: "The free-audit close", d: "Run a free audit on a prospect's site before the call. Walking in with their scores wins the room." },
        { t: "Reports clients keep", d: "Executive snapshot, plain-language insights, and a roadmap — a deliverable that gets forwarded, with your name on it." },
        { t: "Grow into white-label", d: "When you scale, the Agency plan adds full white-labelling and three seats. Your brand on everything." },
      ]}
      proof="Consultant math: charge $150 per audit report at just 5 clients per month and the Starter plan returns $701 in profit. Most consultants we see charge more and deliver the report as the opening of a retainer conversation."
    />
  );
}