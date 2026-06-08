"use client";

import { useState } from "react";
import jsPDF from "jspdf";

type PageData = {
  url: string;
  title: string;
  h1: string;
  wordCount: number;
  totalImages: number;
  imagesWithoutAlt: number;
};

type AuditResponse =
  | {
      success: true;
      report: any;
      crawlData?: {
        pages: PageData[];
      };
    }
  | {
      success: false;
      error: string;
    };

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string>("");

  const agencyName = "Crawler Que by Strat IQ Digital";
  const agencyTagline = "Strategy | Intelligence | Digital";

  const handleChoosePlan = async (priceId: string, planName: string) => {
    if (!priceId) {
      setCheckoutError("This plan is not available yet. Please contact support.");
      return;
    }
    setCheckoutLoading(planName);
    setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, packageName: planName }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setCheckoutError(json.error || "Failed to start checkout. Please try again.");
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const plans = [
  {
    name: "Starter",
    price: "$49",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || "",
    description:
      "Freelancers auditing client sites. Core intelligence included.",
    features: [
      "10 full audits/month",
      "All modules",
      "PDF export",
      "30-day history",
    ],
    popular: false,
  },
  {
    name: "Agency",
    price: "$99",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || "",
    description:
      "Small agencies producing client deliverables regularly.",
    features: [
      "40 full audits/month",
      "White-label PDF",
      "Comparison reports",
      "90-day history",
      "Multi-user (3 seats)",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$299",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    description:
      "High-volume agencies and consultancies with multiple clients.",
    features: [
      "150 audits/month",
      "White-label PDF",
      "Priority support",
      "Unlimited history",
      "10 seats",
    ],
    popular: false,
  },
];

  const handleAudit = async () => {
    if (!url.trim()) {
      setResult({
        success: false,
        error: "Please enter a website URL.",
      });
      return;
    }

    let auditUrl = url.trim();

if (!auditUrl.startsWith("http://") && !auditUrl.startsWith("https://")) {
  auditUrl = `https://${auditUrl}`;
  setUrl(auditUrl);
}

    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  url: auditUrl,
  reportTypes: ["seo", "technical"],
  auditMode: "free",
}),
      });

      const data: AuditResponse = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        success: false,
        error: "Something went wrong while generating the audit.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result || !result.success) return;

    try {
      setDownloadingPdf(true);

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 15;
      const topMargin = 20;
      const bottomMargin = 15;
      const usableWidth = pageWidth - marginX * 2;

      let y = topMargin;
      let currentPage = 1;

      const safeDomain = url
        .replace(/^https?:\/\//, "")
        .replace(/[^\w.-]+/g, "_");

      const domainDisplay = url.replace(/^https?:\/\//, "");

      const drawHeader = () => {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, 22, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.text(agencyName, marginX, 14);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.text(agencyTagline, pageWidth - marginX, 14, {
          align: "right",
        });

        pdf.setTextColor(0, 0, 0);
        y = 30;
      };

      const drawFooter = () => {
        pdf.setDrawColor(220, 220, 220);
        pdf.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${currentPage}`, pageWidth - marginX, pageHeight - 6, {
          align: "right",
        });
        pdf.text(agencyName, marginX, pageHeight - 6);
        pdf.setTextColor(0, 0, 0);
      };

      const addPage = () => {
        drawFooter();
        pdf.addPage();
        currentPage += 1;
        drawHeader();
      };

      const ensureSpace = (needed = 8) => {
        if (y + needed > pageHeight - bottomMargin - 12) {
          addPage();
        }
      };

      const addText = (
        text: string,
        options?: {
          fontSize?: number;
          bold?: boolean;
          color?: [number, number, number];
          gapAfter?: number;
          align?: "left" | "center" | "right";
        }
      ) => {
        const fontSize = options?.fontSize ?? 11;
        const bold = options?.bold ?? false;
        const color = options?.color ?? [0, 0, 0];
        const gapAfter = options?.gapAfter ?? 4;
        const align = options?.align ?? "left";

        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(color[0], color[1], color[2]);

        const lines = pdf.splitTextToSize(text, usableWidth);

        for (const line of lines) {
          ensureSpace(7);

          if (align === "center") {
            pdf.text(line, pageWidth / 2, y, { align: "center" });
          } else if (align === "right") {
            pdf.text(line, pageWidth - marginX, y, { align: "right" });
          } else {
            pdf.text(line, marginX, y);
          }

          y += 6.2;
        }

        y += gapAfter;
        pdf.setTextColor(0, 0, 0);
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(14);
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(marginX, y - 5, usableWidth, 10, 2, 2, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, marginX + 3, y + 1.5);

        y += 11;
        pdf.setTextColor(0, 0, 0);
      };

      const addInfoRow = (label: string, value: string) => {
        ensureSpace(8);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(`${label}:`, marginX, y);

        pdf.setFont("helvetica", "normal");
        const labelWidth = pdf.getTextWidth(`${label}: `);
        const wrapped = pdf.splitTextToSize(value, usableWidth - labelWidth - 2);

        if (wrapped.length > 0) {
          pdf.text(wrapped[0], marginX + labelWidth + 2, y);
          y += 6;
          for (let i = 1; i < wrapped.length; i++) {
            ensureSpace(7);
            pdf.text(wrapped[i], marginX, y);
            y += 6;
          }
        } else {
          y += 6;
        }

        y += 1;
      };

      const addBullet = (text: string) => {
        ensureSpace(8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);

        const wrapped = pdf.splitTextToSize(text, usableWidth - 6);
        pdf.text("•", marginX, y);

        if (wrapped.length > 0) {
          pdf.text(wrapped[0], marginX + 5, y);
          y += 6;
          for (let i = 1; i < wrapped.length; i++) {
            ensureSpace(7);
            pdf.text(wrapped[i], marginX + 5, y);
            y += 6;
          }
        } else {
          y += 6;
        }

        y += 1;
      };

      const addCoverPage = () => {
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");

        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 12, "F");

        pdf.setTextColor(255, 255, 255);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(26);
        pdf.text(agencyName, pageWidth / 2, 70, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(agencyTagline, pageWidth / 2, 80, { align: "center" });

        pdf.setDrawColor(255, 255, 255);
        pdf.line(45, 95, 165, 95);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text("Website Audit Report", pageWidth / 2, 120, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(13);
        pdf.text(domainDisplay, pageWidth / 2, 135, { align: "center" });

        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(35, 160, 140, 58, 4, 4, "F");

        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("Prepared For", 105, 174, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(domainDisplay, 105, 186, { align: "center" });

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("Prepared By", 105, 200, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(agencyName, 105, 212, { align: "center" });

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, 260, {
          align: "center",
        });
      };

      addCoverPage();

      pdf.addPage();
      currentPage = 1;
      drawHeader();

      addText("Executive Summary", {
        fontSize: 18,
        bold: true,
        color: [15, 23, 42],
        gapAfter: 2,
      });

      addText(
        "This report provides an AI-generated review of the website's SEO, technical health, content structure, and conversion-focused opportunities.",
        {
          fontSize: 11,
          color: [71, 85, 105],
          gapAfter: 8,
        }
      );

      addSectionTitle("Audit Details");
      addInfoRow("Website", url);
      addInfoRow("Prepared By", agencyName);
      addInfoRow("Generated", new Date().toLocaleString());
      addInfoRow("Pages Analyzed", String(result.crawlData?.pages?.length || 0));

      addSectionTitle("AI Audit Report");

const report = result.report;

addInfoRow("Domain", report?.domain || report?.url || "Data not available");
addInfoRow("Overall Score", String(report?.overallScore ?? "Data not available"));
addInfoRow("SEO Score", String(report?.seoScore ?? "Data not available"));
addInfoRow("Mobile Performance", String(report?.mobilePerformance ?? "Data not available"));
addInfoRow("Desktop Performance", String(report?.desktopPerformance ?? "Data not available"));

if (report?.summary?.biggestIssue) {
  addText(
    `Biggest Issue: ${
      typeof report.summary.biggestIssue === "object"
        ? report.summary.biggestIssue?.title || "Issue data available"
        : report.summary.biggestIssue
    }`,
    { fontSize: 10.5, gapAfter: 3 }
  );
}

if (report?.summary?.biggestOpportunity) {
  addText(
    `Biggest Opportunity: ${
      typeof report.summary.biggestOpportunity === "object"
        ? report.summary.biggestOpportunity?.title || "Opportunity data available"
        : report.summary.biggestOpportunity
    }`,
    { fontSize: 10.5, gapAfter: 3 }
  );
}

if (Array.isArray(report?.recommendations) && report.recommendations.length > 0) {
  addSectionTitle("Recommendations");

  report.recommendations.slice(0, 8).forEach((rec: any) => {
    addBullet(String(rec));
  });
}

      addSectionTitle("Pages Analyzed");

      (result.crawlData?.pages || []).forEach((page, index) => {
        ensureSpace(42);

        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(marginX, y - 2, usableWidth, 36, 2, 2, "S");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`Page ${index + 1}`, marginX + 3, y + 4);

        y += 10;

        addInfoRow("URL", page.url);
        addInfoRow("Title", page.title || "Missing");
        addInfoRow("H1", page.h1 || "Missing");
        addInfoRow("Word Count", String(page.wordCount));
        addInfoRow("Images", String(page.totalImages));
        addInfoRow("Missing ALT", String(page.imagesWithoutAlt));

        y += 3;
      });

      drawFooter();
      pdf.save(`${safeDomain}-Crawler-Que-audit-report.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed. Check console for details.");
    } finally {
      setDownloadingPdf(false);
    }
  };

return (
  <main className="min-h-screen bg-[#0A0A0A] text-white">
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-[#C5FF3D] px-6 py-2 text-center font-mono text-xs uppercase tracking-[0.18em] text-black">
      <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
      Agency-first audit platform · PDF deliverables + AI visibility
      <span className="rounded bg-black px-3 py-1 text-[10px] text-[#C5FF3D]">
        Free Trial
      </span>
    </div>

    <nav className="sticky top-[36px] z-40 flex h-[60px] items-center justify-between border-b border-[#222] bg-[#0A0A0A]/90 px-6 backdrop-blur md:px-12">
      <a href="/" className="text-lg font-bold tracking-tight">
        Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
      </a>

      <div className="hidden rounded border border-[#222] px-4 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A8A] md:block">
        ▮ AI Website Growth Intelligence
      </div>

      <div className="flex items-center gap-4">
        <a href="/services" className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] hover:text-white">
  Services
</a>

<a href="#pricing" className="font-mono text-xs uppercase tracking-wider text-[#8A8A8A] hover:text-white">
  Pricing
</a>
        <a href="/login" className="rounded-md bg-[#C5FF3D] px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black">
          Login →
        </a>
      </div>
    </nav>

    <section className="relative overflow-hidden border-b border-[#222] px-6 py-20 md:px-12">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(#222_1px,transparent_1px),linear-gradient(90deg,#222_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute -right-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#C5FF3D]/10 blur-3xl" />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-7 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#C5FF3D]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#C5FF3D]" />
            ▮ Crawler Que by Strat IQ Digital
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] md:text-7xl">
            Other tools give you data.
            <br />
            <span className="text-[#C5FF3D]">Crawler Que gives a growth plan.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#8A8A8A]">
Crawler Que by Strat IQ Digital is an AI Website Growth Intelligence platform built for agencies and consultants who need client-ready deliverables, AI visibility insights, white-label reporting, and modular audits — all in one place.
          </p>

          <div className="mt-9 flex flex-wrap gap-2">
            {["Agency-First", "PDF Deliverable", "AI Visibility", "White-Label", "Modular Audits"].map((item) => (
              <span
                key={item}
                className="rounded border border-[#C5FF3D]/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#C5FF3D]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-12 flex gap-10 border-t border-[#222] pt-10">
            <div>
              <div className="text-3xl font-extrabold">14<span className="text-[#C5FF3D]">K+</span></div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A8A8A]">Keywords Tracked</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold">8<span className="text-[#C5FF3D]">+</span></div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A8A8A]">Audit Modules</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold">3<span className="text-[#C5FF3D]">×</span></div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8A8A8A]">Faster Reporting</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-8 shadow-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded bg-[#C5FF3D]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#C5FF3D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C5FF3D]" />
            Free Audit · No Signup
          </div>

          <h2 className="text-2xl font-bold">Run a free audit now</h2>
          <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">
            Enter any URL to get your growth intelligence report instantly.
          </p>

          <div className="mt-6 space-y-3">
            <input
              type="text"
              placeholder="https://yourdomain.com"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAudit();
              }}
            />

            <button
              onClick={handleAudit}
              disabled={loading}
              className="w-full rounded-lg bg-[#C5FF3D] px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Running Audit..." : "Run Audit →"}
            </button>

            {loading && (
              <div className="h-[2px] animate-pulse rounded bg-[#C5FF3D]" />
            )}
          </div>

          {result && (
            <div className="mt-5">
              {result.success ? (
                <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#161616]">
                  <div className="flex items-center gap-2 border-b border-[#2a2a2a] bg-[#1e1e1e] px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                    <span className="ml-2 font-mono text-[11px] text-[#8A8A8A]">
                      audit.result
                    </span>
                  </div>

                  <div className="p-5">
                    {[
                      ["Overall Score", result.report?.overallScore ?? "—"],
                      ["SEO Score", result.report?.seoScore ?? "—"],
                      ["Mobile Perf", result.report?.mobilePerformance ?? "—"],
                      ["Desktop Perf", result.report?.desktopPerformance ?? "—"],
                      ["Traffic Est.", result.report?.traffic?.monthly ? `${result.report.traffic.monthly.toLocaleString()} visits/mo` : "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between border-b border-[#222] py-2 last:border-b-0">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
                          {label}
                        </span>
                        <span className="font-bold text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {result.error}
                </div>
              )}

              {result.success && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="mt-3 w-full rounded-lg border border-[#C5FF3D]/40 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#C5FF3D] disabled:opacity-40"
                >
                  {downloadingPdf ? "Generating..." : "↓ Download Branded PDF Report"}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-[#222] pt-5">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">
              What's Included
            </div>
            <div className="space-y-2 text-sm text-[#ccc]">
              {[
                "Technical SEO + Core Web Vitals",
                "AI search visibility tracking",
                "Competitor intelligence",
                "White-label PDF deliverable",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-1 w-1 rounded-full bg-[#C5FF3D]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-b border-[#222] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
          ▮ Audit Modules
        </div>
        <h2 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Every intelligence layer your client needs.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#8A8A8A]">
          Modular by design. Run a full audit or go deep on a single signal.
          Every module outputs to the same white-label PDF.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["/module/seo", "SEO Intelligence", "Title, H1, meta, crawlability, keyword density and structured data.", ["ON-PAGE", "TECHNICAL", "CRAWL"]],
            ["/module/traffic", "Traffic Modeling", "CTR-curve traffic estimation across ranked keywords.", ["CTR-CURVE", "KEYWORDS"]],
            ["/module/performance", "Core Web Vitals", "Google PageSpeed mobile and desktop scores with fix priorities.", ["LCP", "CLS", "PAGESPEED"]],
            ["/module/ai-visibility", "AI Visibility", "Track how your client appears in AI-generated search results.", ["AI SEARCH", "LLM RANK"]],
            ["/module/competitors", "Competitor Intel", "Benchmark against competitors and find gaps worth closing.", ["BENCHMARK", "GAP ANALYSIS"]],
            ["/module/authority", "Authority Analysis", "Backlink profile, referring domains, and authority gap signals.", ["BACKLINKS", "AUTHORITY"]],
          ].map(([path, name, desc, tags]: any) => (
            <div key={name} className="rounded-xl border border-[#222] bg-[#111] p-6 transition hover:border-[#C5FF3D]/30">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#C5FF3D]">{path}</div>
              <h3 className="mt-3 text-lg font-bold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#8A8A8A]">{desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span key={tag} className="rounded border border-[#2a2a2a] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#666]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {result && result.success && result.crawlData?.pages?.length > 0 && (
      <section className="border-b border-[#222] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold">Pages Analyzed</h2>
          <div className="mt-6 space-y-3">
            {result.crawlData.pages.map((page, index) => (
              <div key={index} className="rounded-xl border border-[#222] bg-[#111] p-5">
                <p className="break-all font-mono text-sm text-[#C5FF3D]">{page.url}</p>
                <div className="mt-3 grid gap-2 text-sm text-[#ccc] md:grid-cols-2">
                  <p><strong>Title:</strong> {page.title || "Missing"}</p>
                  <p><strong>H1:</strong> {page.h1 || "Missing"}</p>
                  <p><strong>Word Count:</strong> {page.wordCount}</p>
                  <p><strong>Images:</strong> {page.totalImages}</p>
                  <p><strong>Missing ALT:</strong> {page.imagesWithoutAlt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )}

    <section id="pricing" className="border-b border-[#222] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
          ▮ Pricing
        </div>
        <h2 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
          The PDF is the product.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#8A8A8A]">
          Agency-first pricing built around white-label PDF deliverables.
          Pick the volume that fits your workflow.
        </p>

{checkoutError && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {checkoutError}
          </div>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition hover:-translate-y-1 ${
                plan.popular
                  ? "border-[#C5FF3D]/40 bg-[#0d1500]"
                  : "border-[#222] bg-[#111]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-8 rounded bg-[#C5FF3D] px-4 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-black">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[#8A8A8A]">{plan.description}</p>

              <div className="mt-7 flex items-end gap-1">
                <span className={`text-5xl font-extrabold ${plan.popular ? "text-[#C5FF3D]" : "text-white"}`}>
                  {plan.price}
                </span>
                <span className="mb-2 font-mono text-xs text-[#8A8A8A]">/ month</span>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-[#ccc]">
                    <span className="mt-2 h-1 w-1 rounded-full bg-[#C5FF3D]" />
                    {feature}
                  </li>
                ))}
              </ul>

<button
                onClick={() => handleChoosePlan(plan.priceId, plan.name)}
                disabled={checkoutLoading === plan.name}
                className={`mt-8 w-full rounded-lg px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
                  plan.popular
                    ? "bg-[#C5FF3D] text-black"
                    : "border border-[#2a2a2a] text-white hover:bg-[#181818]"
                }`}
              >
                {checkoutLoading === plan.name
                  ? "Redirecting to checkout..."
                  : `Choose ${plan.name} →`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="relative overflow-hidden px-6 py-24 text-center md:px-12">
      <div className="absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#C5FF3D]/10 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]">
          ▮ Get Started
        </div>
        <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Stop explaining SEO.
          <br />
          <span className="text-[#C5FF3D]">Start showing results.</span>
        </h2>
        <p className="mt-5 text-base leading-7 text-[#8A8A8A]">
          Run your first audit free. No signup needed. When you're ready to deliver it to a client, pick a plan.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.scrollTo({ top: 90, behavior: "smooth" })}
            className="rounded-lg bg-[#C5FF3D] px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black"
          >
            Run a Free Audit →
          </button>
          <a
            href="#pricing"
            className="rounded-lg border border-[#2a2a2a] px-8 py-4 font-mono text-sm uppercase tracking-wider text-[#8A8A8A] hover:text-white"
          >
            See Plans
          </a>
        </div>
      </div>
    </section>

    <footer className="flex flex-col items-center justify-between gap-5 border-t border-[#222] px-6 py-10 md:flex-row md:px-12">
      <a href="/" className="font-bold">
        Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
      </a>
      <div className="flex flex-wrap justify-center gap-6 font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">
        <a href="#pricing">Pricing</a>
        <a href="/dashboard">Dashboard</a>
        <a href="#">Support</a>
        <a href="#">Refund Policy</a>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-[#444]">
        © 2026 Crawler Que by Strat IQ Digital · /platform/v2.0
      </div>
    </footer>
  </main>
);
}