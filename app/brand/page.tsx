import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crawler Que by Strat IQ Digital Brand Guidelines | Brand System, UI & Voice",
  description:
    "Official Crawler Que by Strat IQ Digital brand guidelines covering color palette, typography, logo system, UI components, usage rules, voice and tone, and brand applications.",
};

const signal = "#C5FF3D";

export default function BrandPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#222] bg-[#0A0A0A]/95 px-6 backdrop-blur md:px-14">
        <a href="/" className="text-base font-bold">
          Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
        </a>

        <div className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A8A] md:block">
          ▮ Brand Guidelines · 2025 Edition
        </div>

        <div className="rounded border border-[#222] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
          Internal Use
        </div>
      </nav>

      <section className="relative min-h-screen overflow-hidden border-b border-[#222] px-6 py-20 md:px-14">
        <Grid />
        <Glow />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-160px)] max-w-6xl flex-col justify-between">
          <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A8A]">
            <span>Crawler Que · Brand Guidelines</span>
            <span>00 / Cover · 07 Sections</span>
          </div>

          <div>
            <div className="mb-8 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-[#C5FF3D]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5FF3D]" />
              ▮ AI Website Growth Intelligence
            </div>

            <h1 className="text-7xl font-extrabold leading-[0.92] tracking-[-0.05em] md:text-[120px]">
              Crawler Que by Strat IQ Digital
              <br />
              <span className="text-[#C5FF3D]">.digital</span>
            </h1>

            <p className="mt-8 font-mono text-sm uppercase tracking-[0.14em] text-[#8A8A8A]">
              Brand Guidelines · 2025 Edition
            </p>
          </div>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="font-mono text-[11px] leading-7 tracking-wider text-[#444]">
              Crawler Que by Strat IQ Digital
              <br />
              Strategy | Intelligence | Digital
              <br />© 2025 Crawler Que by Strat IQ Digital
            </div>

            <div className="space-y-1 text-right font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
              {[
                "Core Palette",
                "Typography",
                "Logo System",
                "UI Components",
                "Usage Rules",
                "Voice & Tone",
                "Applications",
              ].map((item, i) => (
                <div key={item} className="flex justify-end gap-4">
                  <span className="w-6 text-right text-[#C5FF3D]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[#333]">/</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BrandSection
        index="01"
        eyebrow="Core Palette"
        title={
          <>
            The four colours
            <br />
            the brand lives in.
          </>
        }
        body="Ink Black is the dominant surface. Signal Green is the single accent — used for highlights, CTAs, tags, and key data points. Steel Grey holds secondary text and UI structure. Paper White is reserved for text and small surfaces only."
      >
        <div className="mt-14 grid gap-4 md:grid-cols-4">
          <Swatch
            name="Ink Black"
            role="Primary Surface"
            hex="#0A0A0A"
            color="#0A0A0A"
            text="#444"
            usage="All backgrounds, page surfaces, card bases. Dominant across every digital touchpoint."
          />
          <Swatch
            name="Signal Green"
            role="Primary Accent"
            hex="#C5FF3D"
            color="#C5FF3D"
            text="#333"
            usage='CTAs, highlights, scores, status tags, and the ".digital" in the logo.'
          />
          <Swatch
            name="Paper White"
            role="Text + Light Surfaces"
            hex="#FFFFFF"
            color="#FFFFFF"
            text="#BBB"
            usage="Headings, body text on dark surfaces, light-mode cards and print materials."
          />
          <Swatch
            name="Steel Grey"
            role="Secondary Text"
            hex="#8A8A8A"
            color="#8A8A8A"
            text="#333"
            usage="Body copy, labels, placeholders, metadata, timestamps, and secondary UI details."
          />
        </div>

        <div className="mt-14">
          <SmallLabel>Extended Surfaces</SmallLabel>
          <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
            {[
              ["#111111", "Surface"],
              ["#161616", "Window"],
              ["#181818", "Surface2"],
              ["#1e1e1e", "Titlebar"],
              ["#222222", "Border"],
              ["#2a2a2a", "Border2"],
              ["#0f1a00", "Signal Tint"],
              ["#0d1500", "Signal Deep"],
            ].map(([hex, label]) => (
              <div key={hex} className="overflow-hidden rounded-md border border-[#222]">
                <div className="h-14" style={{ background: hex }} />
                <div className="bg-[#111] p-2 text-center font-mono text-[9px] uppercase tracking-wider text-[#8A8A8A]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrandSection>

      <BrandSection
        index="02"
        eyebrow="Typography"
        title={
          <>
            Three fonts.
            <br />
            Three roles. No overlap.
          </>
        }
        body="Each typeface has a strict role. Space Grotesk is display. Special Elite-style mono is for labels, system paths, and metadata. Inter is for body copy."
      >
        <div className="mt-12 divide-y divide-[#222]">
          <TypeBlock
            role="01 — Display"
            name="Space Grotesk"
            weight="700 · 800"
            description="Headlines, brand name, pricing numbers, section titles, stat figures."
          >
            <div className="text-6xl font-extrabold leading-none tracking-[-0.05em] md:text-7xl">
              Growth
              <br />
              <span className="text-[#C5FF3D]">Intelligence</span>
            </div>
          </TypeBlock>

          <TypeBlock
            role="02 — Mono"
            name="System Mono"
            weight="Labels · Code · Paths"
            description="All labels, system paths, eyebrows, tags, metadata, and navigation markers."
          >
            <div className="font-mono text-2xl uppercase tracking-[0.12em] text-[#C5FF3D]">
              ▮ AI Website Audit
            </div>
            <div className="mt-3 font-mono text-sm tracking-wider text-[#8A8A8A]">
              /module/seo-intelligence/v2.1
            </div>
          </TypeBlock>

          <TypeBlock
            role="03 — Body"
            name="Inter"
            weight="400 · 500"
            description="All prose, descriptions, feature explanations, help text, and long-form content."
          >
            <p className="max-w-xl text-lg leading-8 text-white">
              Other tools give you data. Crawler Que gives your client a growth
              plan. Built for agencies and consultants who need client-ready
              deliverables.
            </p>
          </TypeBlock>
        </div>
      </BrandSection>

      <BrandSection
        index="03"
        eyebrow="Logo System"
        title="Six approved lockups."
        body='Use the appropriate lockup for context. The ".digital" extension always appears in Signal Green on dark surfaces. On light surfaces, the full wordmark renders in Ink Black.'
      >
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <LogoCell label="A — Primary Wordmark">
            Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
          </LogoCell>
          <LogoCell label="B — Wordmark + Descriptor">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
              ▮ AI Growth Intelligence
            </div>
            <div className="mt-1">Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span></div>
          </LogoCell>
          <LogoCell light label="C — Light Version">
            Crawler Que by Strat IQ Digital
          </LogoCell>
          <LogoCell signal label="D — Signal Background">
            Crawler Que by Strat IQ Digital
          </LogoCell>
          <LogoCell label="E — Bracket Mark">
            [ <span className="text-[#C5FF3D]">sq</span> ]
          </LogoCell>
          <LogoCell label="F — Stacked Editorial">
            <div className="text-xl tracking-wider">Crawler Que by Strat IQ Digital</div>
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#C5FF3D]">
              AI Systems
            </div>
          </LogoCell>
        </div>
      </BrandSection>

      <BrandSection
        index="04"
        eyebrow="UI Components"
        title={
          <>
            The design language
            <br />
            in code.
          </>
        }
        body="Every UI element follows the same dark-surface system. macOS-style window chrome is used on product mockups, audit result previews, and marketing demos."
      >
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <MacWindow title="buttons.component — Crawler Que by Strat IQ Digital">
            <SmallLabel>Primary CTA</SmallLabel>
            <button className="mt-2 rounded-lg bg-[#C5FF3D] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
              Run Audit →
            </button>

            <SmallLabel className="mt-6">Secondary</SmallLabel>
            <div className="mt-2 flex flex-wrap gap-3">
              <button className="rounded-lg border border-[#2a2a2a] px-6 py-3 font-mono text-xs uppercase tracking-wider text-white">
                See Plans
              </button>
              <button className="rounded-lg border border-[#C5FF3D]/35 px-6 py-3 font-mono text-xs uppercase tracking-wider text-[#C5FF3D]">
                ↓ Download PDF
              </button>
            </div>
          </MacWindow>

          <MacWindow title="inputs.component — Crawler Que by Strat IQ Digital">
            <SmallLabel>Default</SmallLabel>
            <input
              readOnly
              placeholder="https://yourdomain.com"
              className="mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#444]"
            />

            <SmallLabel className="mt-5">Focused</SmallLabel>
            <input
              readOnly
              value="https://citrusbits.com"
              className="mt-2 w-full rounded-lg border border-[#C5FF3D]/50 bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none"
            />
          </MacWindow>

          <MacWindow title="tags.component — Crawler Que by Strat IQ Digital">
            <SmallLabel>Module Tags</SmallLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {["AI Visibility", "CTR-Curve", "White-Label", "10K Keywords"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[#C5FF3D]/30 bg-[#C5FF3D]/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#C5FF3D]"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </MacWindow>

          <MacWindow title="audit.result — citrusbits.com">
            {[
              ["Overall Score", "82", "green"],
              ["SEO Score", "77", "green"],
              ["Mobile Performance", "54", "yellow"],
              ["Desktop Performance", "91", "green"],
              ["Traffic Est.", "4,820 visits/mo", "white"],
            ].map(([label, value, tone]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-[#1A1A1A] py-3 last:border-b-0"
              >
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
                  {label}
                </span>
                <span
                  className={
                    tone === "yellow"
                      ? "rounded bg-[#FEBC2E]/15 px-3 py-1 font-mono text-xs font-bold text-[#FEBC2E]"
                      : tone === "green"
                      ? "rounded bg-[#C5FF3D]/15 px-3 py-1 font-mono text-xs font-bold text-[#C5FF3D]"
                      : "font-bold text-white"
                  }
                >
                  {value}
                </span>
              </div>
            ))}
          </MacWindow>
        </div>
      </BrandSection>

      <BrandSection
        index="05"
        eyebrow="Usage Rules"
        title={
          <>
            What the brand
            <br />
            will and won't do.
          </>
        }
        body="These rules protect consistency across the website, PDFs, client reports, social posts, and presentations."
      >
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <RuleList
            title="✓ Do"
            tone="do"
            items={[
              ["Colour", "Use Signal Green as the primary accent for buttons, highlights, score badges, and key data."],
              ["Surfaces", "Keep Ink Black as the dominant surface in all digital materials."],
              ["Windows", "Use macOS window frames on product screenshots and UI previews."],
              ["Traffic Data", 'Always label traffic as "modelled estimate" and include confidence tier.'],
            ]}
          />

          <RuleList
            title="✗ Don't"
            tone="dont"
            items={[
              ["Signal as Background", "Never use Signal Green as a large page background. It is an accent only."],
              ["White Backgrounds", "White is for text and small surfaces, not main digital page backgrounds."],
              ["Flat Multipliers", "Never apply arbitrary traffic multipliers. Use CTR curve or clickstream only."],
              ["Generic Chrome", "Never use generic UI frames in product screenshots."],
            ]}
          />
        </div>
      </BrandSection>

      <BrandSection
        index="06"
        eyebrow="Voice & Tone"
        title={
          <>
            Smart. Direct.
            <br />
            No filler.
          </>
        }
        body="Crawler Que speaks like a senior analyst who respects the reader’s intelligence. We never oversell, never pad, and never claim certainty we do not have."
      >
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <VoiceCard
            label="▮ Direct"
            title="Say the thing."
            desc="Get to the point fast. Lead with the insight, not the preamble."
            good="Other tools give you data. Crawler Que gives you a growth plan."
            bad="We leverage cutting-edge AI technology to provide comprehensive insights…"
          />
          <VoiceCard
            label="▮ Honest"
            title="Own the limits."
            desc="Traffic estimates are modelled. We say that clearly."
            good="Estimated Monthly Organic Visits — modelled estimate based on CTR curve."
            bad="Exact traffic data powered by real-time analytics."
          />
          <VoiceCard
            label="▮ Agency-First"
            title="Speak to the pro."
            desc="Use technical language where appropriate. Assume the reader knows what CTR means."
            good="White-label PDF. Modular audits. Client-ready in under 60 seconds."
            bad="Even non-technical users can understand their website score!"
          />
        </div>
      </BrandSection>

      <BrandSection
        index="07"
        eyebrow="Applications"
        title="The brand in the wild."
        body="How the system translates to real touchpoints — business cards, app icons, banners, and white-label PDF report covers."
      >
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div>
            <SmallLabel>Business Card</SmallLabel>
            <div className="mt-3 flex min-h-[130px] items-end justify-between rounded-xl bg-white p-7 text-black">
              <div>
                <div className="text-lg font-bold">Crawler Que by Strat IQ Digital</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#8A8A8A]">
                  A Library of AI Systems
                </div>
              </div>
              <div className="text-right font-mono text-[9px] leading-6 tracking-wider text-[#8A8A8A]">
                hello@stratiq.digital
                <br />
                Crawler Que by Strat IQ Digital
                <br />
                Strategy | Intelligence | Digital
              </div>
            </div>
          </div>

          <div>
            <SmallLabel>Favicon / App Icon</SmallLabel>
            <div className="mt-3 flex items-end gap-5 rounded-xl border border-[#222] bg-[#111] p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#0A0A0A] font-mono text-xl">
                [ <span className="text-[#C5FF3D]">sq</span> ]
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] font-mono text-sm">
                <span className="text-[#C5FF3D]">sq</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C5FF3D] font-mono text-black">
                s
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <SmallLabel>Hero / Email Banner</SmallLabel>
            <div className="relative mt-3 overflow-hidden rounded-xl border border-[#222] bg-[#0A0A0A] p-10">
              <Glow />
              <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
                    ▮ AI Website Growth Intelligence
                  </div>
                  <div className="mt-3 text-5xl font-extrabold tracking-tight">
                    Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
                  </div>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[#8A8A8A]">
                    Ready-to-use audit intelligence for marketing agencies and
                    growth consultants.
                  </p>
                </div>
                <button className="rounded-lg bg-[#C5FF3D] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black">
                  Run Free Audit →
                </button>
              </div>
            </div>
          </div>
        </div>
      </BrandSection>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-[#222] px-6 py-10 md:flex-row md:px-14">
        <div className="font-bold">
          Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
          Brand Guidelines · 2025 Edition · 07 Sections
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#444]">
          © 2025 Crawler Que by Strat IQ Digital · /brand/v1.0
        </div>
      </footer>
    </main>
  );
}

function Grid() {
  return (
    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(#222_1px,transparent_1px),linear-gradient(90deg,#222_1px,transparent_1px)] [background-size:56px_56px]" />
  );
}

function Glow() {
  return (
    <div className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-[#C5FF3D]/10 blur-3xl" />
  );
}

function SmallLabel({
  children,
  className = "",
}: {
  children: any;
  className?: string;
}) {
  return (
    <div
      className={`font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D] ${className}`}
    >
      {children}
    </div>
  );
}

function BrandSection({ index, eyebrow, title, body, children }: any) {
  return (
    <section className="border-b border-[#222] px-6 py-20 md:px-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A8A]">
          <span>Crawler Que by Strat IQ Digital · Brand System</span>
          <span>{index} / {eyebrow} · 07</span>
        </div>

        <SmallLabel>{eyebrow}</SmallLabel>

        <h2 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          {title}
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-8 text-[#8A8A8A]">
          {body}
        </p>

        {children}
      </div>
    </section>
  );
}

function Swatch({ name, role, hex, color, text, usage }: any) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#111]">
      <div
        className="flex h-32 items-end p-4"
        style={{ background: color }}
      >
        <span className="font-mono text-xs" style={{ color: text }}>
          {hex}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white">{name}</h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
          {role}
        </p>
        <p className="mt-2 text-xs leading-6 text-[#555]">{usage}</p>
      </div>
    </div>
  );
}

function TypeBlock({ role, name, weight, description, children }: any) {
  return (
    <div className="grid gap-8 py-10 md:grid-cols-[220px_1fr]">
      <div>
        <SmallLabel>{role}</SmallLabel>
        <p className="mt-2 font-mono text-sm text-white">{name}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#8A8A8A]">
          {weight}
        </p>
        <p className="mt-3 text-xs leading-6 text-[#8A8A8A]">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function LogoCell({ children, label, light, signal }: any) {
  return (
    <div
      className={`flex min-h-[160px] flex-col justify-between rounded-xl border p-7 ${
        signal
          ? "border-[#C5FF3D] bg-[#C5FF3D] text-black"
          : light
          ? "border-[#e0e0d8] bg-[#F5F5F0] text-black"
          : "border-[#2a2a2a] bg-[#111] text-white"
      }`}
    >
      <div className="text-2xl font-bold">{children}</div>
      <div className={`mt-8 font-mono text-[10px] uppercase tracking-wider ${signal || light ? "text-[#666]" : "text-[#8A8A8A]"}`}>
        {label}
      </div>
    </div>
  );
}

function MacWindow({ title, children }: any) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#161616]">
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-[11px] tracking-wider text-[#8A8A8A]">
          {title}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function RuleList({ title, tone, items }: any) {
  return (
    <div>
      <div
        className={`mb-5 font-mono text-xs uppercase tracking-[0.18em] ${
          tone === "do" ? "text-[#C5FF3D]" : "text-[#FF5F57]"
        }`}
      >
        {title}
      </div>

      <div className="space-y-4">
        {items.map(([head, text]: any) => (
          <div
            key={head}
            className={`border-l-2 px-4 py-3 ${
              tone === "do" ? "border-[#C5FF3D]" : "border-[#FF5F57]"
            }`}
          >
            <p
              className={`font-mono text-[10px] uppercase tracking-wider ${
                tone === "do" ? "text-[#C5FF3D]" : "text-[#FF5F57]"
              }`}
            >
              {head}
            </p>
            <p className="mt-2 text-sm leading-7 text-[#CCCCCC]">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceCard({ label, title, desc, good, bad }: any) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] p-6">
      <SmallLabel>{label}</SmallLabel>

      <h3 className="mt-3 text-xl font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#8A8A8A]">{desc}</p>

      <div className="mt-5 rounded-lg border border-[#222] bg-[#0A0A0A] p-4 text-sm italic leading-7 text-[#CCCCCC]">
        “{good}”
      </div>

      <div className="mt-3 rounded-lg border border-[#FF5F57]/20 bg-[#FF5F57]/5 p-4 text-xs leading-6 text-[#666]">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-[#FF5F57]">
          ✗ Not this
        </div>
        “{bad}”
      </div>
    </div>
  );
}