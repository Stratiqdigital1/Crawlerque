"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import {
  normalizeAuditData,
  buildSmartRecommendations,
} from "@/lib/audit-normalizer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Brain,
  Globe,
  Search,
  Users,
} from "lucide-react";

export default function WebsiteAuditDashboardPage() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
const [auditSeconds, setAuditSeconds] = useState(0);
const [auditJobId, setAuditJobId] = useState<string | null>(null);
const [auditProgress, setAuditProgress] = useState(0);
const [auditCurrentModule, setAuditCurrentModule] = useState("");
const [auditModuleStatus, setAuditModuleStatus] = useState<any>({});
const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([
  "seo",
  "technical",
]);
useEffect(() => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const freeMode = params.get("free");
  const urlFromHome = params.get("url");
  const reportId = params.get("reportId");

  if (freeMode === "true") {
    setSelectedReportTypes(["seo", "technical"]);
  }

  if (urlFromHome) {
    setUrl(urlFromHome);
  }

  if (reportId) {
    loadSavedReport(reportId);
  }
}, []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [compareA, setCompareA] = useState<any>(null);
const [compareB, setCompareB] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
const pollOnPage = async (taskId: string) => {
  if (!taskId) return;

  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 15000));

    try {
      const res = await fetch(
        `/api/dataforseo/onpage/status?taskId=${taskId}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();
      const onPage = json?.onPage;

      if (onPage) {
  setData((prev: any) => {
    const updatedReport = {
      ...prev,
      onPage,
      moduleStatus: {
        ...prev?.moduleStatus,
        onPage:
          onPage?.pages?.length > 0
            ? "available"
            : "pending_or_not_available",
      },
      unifiedOverview: {
        ...prev?.unifiedOverview,
        keyMetrics: {
          ...prev?.unifiedOverview?.keyMetrics,
          pagesCrawled: onPage?.crawledPages ?? prev?.unifiedOverview?.keyMetrics?.pagesCrawled,
        },
      },
    };

    loadReportHistory();

    return updatedReport;
  });
}

      if (
        onPage?.pages?.length > 0 ||
        onPage?.crawlStatus === "completed"
      ) {
        break;
      }
    } catch (error) {
      console.error("OnPage polling failed:", error);
    }
  }
};

const reportOptions = [
  ["seo", "SEO"],
  ["technical", "Technical"],
  ["traffic", "Traffic"],
  ["keywords", "Keywords"],
  ["competitors", "Competitors"],
  ["ai", "AI Visibility"],
  ["backlinks", "Backlinks"],
  ["recommendations", "Recommendations"],
  ["localSeo", "Local SEO"],
  ["content", "Content"],
];

const toggleReportType = (type: string) => {
  setSelectedReportTypes((prev) =>
    prev.includes(type)
      ? prev.filter((item) => item !== type)
      : [...prev, type]
  );
};

const pollAuditJobStatus = (jobId: string) => {
  const interval = window.setInterval(async () => {
    try {
      const res = await fetch(`/api/audit-jobs/${jobId}/status`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json?.success || !json?.job) return;

      const job = json.job;

      setAuditProgress(Number(job.progress || 0));
      setAuditCurrentModule(job.currentModule || "");
      setAuditModuleStatus(job.moduleStatus || {});

      if (
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        window.clearInterval(interval);
      }
    } catch (error) {
      console.error("Audit progress polling failed:", error);
    }
  }, 2000);

  return interval;
};

const runAudit = async () => {
  if (!url) return;

  const userRes = await fetch("/api/user/me", {
    cache: "no-store",
  });

  if (!userRes.ok) {
    setError("Please login first.");
    return;
  }

  const userJson = await userRes.json();
  const currentUser = userJson?.user;

  if (
    currentUser?.role !== "admin" &&
    currentUser?.auditsUsed >= currentUser?.package?.monthlyAudits
  ) {
    setError(
  `Your monthly audit limit has been reached. Current plan: ${
    currentUser?.package?.name || "Unknown"
  }. Please upgrade to run more audits.`
);
    return;
  }

setLoading(true);
setError("");
setAuditSeconds(0);
setAuditJobId(null);
setAuditProgress(0);
setAuditCurrentModule("Starting audit");
setAuditModuleStatus({});
setActiveTab("overview");

const timer = setInterval(() => {
  setAuditSeconds((prev) => prev + 1);
}, 1000);
const controller = new AbortController();
setAbortController(controller);

try {
      const startRes = await fetch("/api/audit-jobs/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          reportTypes: selectedReportTypes,
        }),
      });

      const startJson = await startRes.json();

      if (!startRes.ok || !startJson?.success) {
        throw new Error(startJson?.error || "Failed to start audit job.");
      }

      const startedJobId = startJson.auditJobId;
      setAuditJobId(startedJobId);

      const progressInterval = pollAuditJobStatus(startedJobId);

      const res = await fetch("/api/audit", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  url,
  reportTypes: selectedReportTypes,
  auditJobId: startedJobId,
}),
      });

      const json = await res.json();

if (!res.ok || json?.success === false) {
  throw new Error(json?.error || "Audit failed");
}

let report = {
  ...(json?.report || json),
  reportTypes: selectedReportTypes,
};

if (
  selectedReportTypes.includes("ai") ||
  selectedReportTypes.includes("recommendations")
) {
try {
  const recRes = await fetch("/api/dataforseo/ai-recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: report?.domain || url,
      seedKeyword:
        report?.keywordResearch?.seedKeyword ||
        report?.businessData?.keyword ||
        report?.dataforseo?.topKeywords?.[0]?.keyword ||
        report?.dataforseo?.keywordGap?.missingKeywords?.[0]?.keyword,
      seoScore: report?.seoScore,
      uxScore: report?.uxScore,
      aiVisibilityScore:
        report?.aiOptimization?.visibilityScore ||
        report?.aiVisibility?.score,
monthlyTraffic:
  report?.traffic?.rawMonthly ||
  report?.traffic?.monthly ||
  report?.domainAnalytics?.organicTraffic,
      organicKeywords:
        report?.dataforseo?.organicKeywords ||
        report?.domainAnalytics?.organicKeywords,
      competitors:
  report?.competitors?.length
    ? report.competitors
    : report?.dataforseo?.competitors || [],
      keywordGaps:
  report?.keywordGap?.missingKeywords ||
  report?.dataforseo?.keywordGap?.missingKeywords ||
  report?.dataforseo?.keywordGap?.opportunities ||
  [],
      issues: report?.issues || [],
      serpData: report?.serpData || {},
      backlinks: report?.backlinks || {},
      contentAnalysis: report?.contentAnalysis || {},
    }),
  });

  const recJson = await recRes.json();

  if (recJson?.success) {
    report = {
      ...report,
      recommendations:
        recJson?.aiRecommendations?.recommendations ||
        report?.recommendations ||
        [],
      aiRecommendations: recJson?.aiRecommendations,
      moduleStatus: {
        ...report?.moduleStatus,
        aiRecommendations: "available",
      },
    };
  }
} catch (recError) {
  console.error("AI recommendations failed:", recError);

    report = {
    ...report,
    moduleStatus: {
      ...report?.moduleStatus,
      aiRecommendations: "not_available",
    },
  };
}
}

setData(report);

if (report?.onPage?.taskId) {
  pollOnPage(report.onPage.taskId);
}

await loadReportHistory();

if (progressInterval) {
  window.clearInterval(progressInterval);
}

setAuditProgress(100);
setAuditCurrentModule("Completed");
    } catch (e: any) {
  console.error(e);
  setError(e?.message || "Something went wrong while running the audit.");
  setAuditCurrentModule("Failed");
}

clearInterval(timer);
setAbortController(null);
setLoading(false);
  };
  const cancelAudit = () => {
  if (abortController) {
    abortController.abort();
  }

  setAbortController(null);
  setLoading(false);
  setError("Audit cancelled.");
};
  const chartData =
  data?.aiOptimization?.models?.map((m: any) => ({
    name: m.model,
    mentioned: m.mentioned ? 1 : 0,
  })) || [];
  const seoCompetitorChartData =
  data?.competitors?.slice(0, 8).map((c: any) => ({
    name: c.domain,
    sharedKeywords: c.sharedKeywords || c.intersections || 0,
    threatScore: c.threatScore || 0,
    traffic: Math.round(
  Number(c.traffic || data?.traffic?.rawMonthly || data?.traffic?.monthly || 0)
),
  })) || [];
  const competitorChartData = [
  {
    name: "Your Brand",
    mentions: data?.aiOptimization?.totalMentions ?? 0,
  },
  {
    name: "Competitors",
    mentions: Math.max(
  (data?.aiVisibility?.totalMentions ?? 0) -
    (data?.aiOptimization?.totalMentions ?? 0),
  0
),
  },
];
const loadReportHistory = async () => {
  try {
    const res = await fetch("/api/reports", {
      cache: "no-store",
    });

    const json = await res.json();

    if (!json?.success) return;

    const formattedHistory = json.reports.map((item: any) => ({
  id: item.id,
  domain: item.domain,
  normalizedDomain: item.normalizedDomain,
  reportTypes: item.reportTypes || [],
  overallScore: item.overallScore,
  seoScore: item.seoScore,
  uxScore: item.uxScore,
  aiScore: item.aiScore,
  traffic: item.estimatedTraffic,
  keywordCount: item.keywordCount,
  pdfGenerated: item.pdfGenerated,
  createdAt: new Date(item.createdAt).toLocaleString(),
}));

    setHistory(formattedHistory);
  } catch (error) {
    console.error("Failed to load report history:", error);
  }
};

const loadCurrentUser = async () => {
  try {
    const res = await fetch("/api/user/me");

    const json = await res.json();

    if (!json?.success) {
      window.location.href = "/login";
      return;
    }

    setCurrentUser(json.user);
  } catch (error) {
    window.location.href = "/login";
  }
};

useEffect(() => {
  loadCurrentUser();
  loadReportHistory();
}, []);
const clearHistory = async () => {
  setError("Bulk history clear is disabled. Delete reports one by one from the database.");
};
const loadSavedReport = async (id: string) => {
  try {
    const res = await fetch(`/api/reports/${id}`, {
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      throw new Error(json?.error || "Failed to load report.");
    }

    const fullReport = json.report?.reportData;

    if (!fullReport) {
      throw new Error("Saved report data is not available.");
    }

    setData(fullReport);
setUrl(fullReport?.url || fullReport?.domain || json.report?.domain || "");
setSelectedReportTypes(
  fullReport?.reportTypes || json.report?.reportTypes || selectedReportTypes
);
setActiveTab("overview");
  } catch (error: any) {
    console.error("Saved report load failed:", error);
    setError(error?.message || "Failed to load saved report.");
  }
};

const deleteReport = async (id: string) => {
  const confirmDelete = window.confirm(
    "Delete this saved audit report? This cannot be undone."
  );

  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/reports/${id}`, {
      method: "DELETE",
    });

    const json = await res.json();

    if (!res.ok || !json?.success) {
      throw new Error(json?.error || "Failed to delete report.");
    }

    setHistory((prev) => prev.filter((item) => item.id !== id));

    if (compareA?.id === id) setCompareA(null);
    if (compareB?.id === id) setCompareB(null);
  } catch (error: any) {
    console.error("Report delete failed:", error);
    setError(error?.message || "Failed to delete report.");
  }
};
const exportComparisonPDF = async () => {
  if (!compareA || !compareB) {
    setError("Please select two reports to compare.");
    return;
  }

  let comparisonA: any = compareA;
  let comparisonB: any = compareB;

  try {
    if (compareA?.id && compareB?.id) {
      const res = await fetch("/api/reports/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportAId: compareA.id,
          reportBId: compareB.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load comparison reports.");
      }

      comparisonA = {
        ...compareA,
        report: json.reportA?.reportData,
      };

      comparisonB = {
        ...compareB,
        report: json.reportB?.reportData,
      };
    }
  } catch (error: any) {
    console.error("Comparison load failed:", error);
    setError(error?.message || "Failed to load comparison reports.");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");
  let y = 20;

const canWhiteLabel =
  currentUser?.canUseWhiteLabel === true &&
  currentUser?.whiteLabelEnabled === true;

const comparisonBrandName = canWhiteLabel
  ? currentUser?.agencyName ||
    currentUser?.companyName ||
    "Your Agency"
  : "Crawler Que by Strat IQ Digital";

  const comparisonFilePrefix = comparisonBrandName
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-");

  const line = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(String(text || "N/A"), 14, y);
    y += 7;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`${comparisonBrandName} Audit Comparison`, 14, y);
  y += 12;

  line(`Audit A: ${comparisonA.domain}`, 12, true);
  line(`Date: ${comparisonA.createdAt}`);
  y += 4;

  line(`Audit B: ${comparisonB.domain}`, 12, true);
  line(`Date: ${comparisonB.createdAt}`);
  y += 8;

  line("Score Comparison", 14, true);

  const rows = [
    ["Overall", comparisonA.overallScore, comparisonB.overallScore],
    ["SEO", comparisonA.seoScore, comparisonB.seoScore],
    ["AI Visibility", comparisonA.aiScore, comparisonB.aiScore],
    [
      "Estimated Monthly Organic Visits",
      comparisonA.traffic,
      comparisonB.traffic,
    ],
  ];

  rows.forEach(([label, a, b]: any) => {
    const change = Number(b || 0) - Number(a || 0);

    line(
      `${label}: ${a ?? "N/A"} → ${b ?? "N/A"} | Change: ${
        change > 0 ? "+" : ""
      }${change}`
    );
  });

  doc.save(
    `${comparisonFilePrefix}-Comparison-${comparisonA.domain}-vs-${comparisonB.domain}.pdf`
  );
};
// =============================================================================
// CRAWLER QUE — COMPLETE PDF EXPORT  (drop-in replacement for exportPDF)
// =============================================================================
// HOW TO INSTALL:
//   1. In page.tsx find:   const exportPDF = async () => {
//   2. Delete from that line down to the closing };  (ends just before
//      the line:  const totalMentions = )
//   3. Paste this entire file in that spot.
//   No other changes needed — all helpers are self-contained inside the function.
// =============================================================================

const exportPDF = async () => {
  if (!data) return;

  const userRes = await fetch("/api/user/me", { cache: "no-store" });
  if (!userRes.ok) { setError("Please login first."); return; }
  const userJson = await userRes.json();
  const pdfUser  = userJson?.user;

  if (pdfUser?.role !== "admin" && !pdfUser?.package?.allowPdf) {
    setError("PDF export is not available in your current package.");
    return;
  }

  const doc    = new jsPDF("p", "mm", "a4");
  const PW     = doc.internal.pageSize.getWidth();
  const PH     = doc.internal.pageSize.getHeight();

  // ── BRAND ─────────────────────────────────────────────────────────────
  const canWL     = pdfUser?.canUseWhiteLabel === true && pdfUser?.whiteLabelEnabled === true;
  const brandName = canWL ? (pdfUser?.agencyName || pdfUser?.companyName || "Your Agency") : "Crawler Que by Strat IQ Digital";
  const tagline   = canWL ? (pdfUser?.pdfFooterText || "Website Growth Intelligence Report") : "AI Website Growth Intelligence";
  const accentHex = canWL && pdfUser?.brandColor ? pdfUser.brandColor : "#C5FF3D";

  // ── DATA ──────────────────────────────────────────────────────────────
  const normalized         = normalizeAuditData(data);
  const smartRecs          = buildSmartRecommendations(normalized);
  const domain             = normalized.domain || data?.domain || "—";
  const generatedDate      = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const selectedModules    = data?.reportTypes?.length > 0 ? data.reportTypes : selectedReportTypes;

  // parse hex accent → RGB
  const hexToRgb = (h: string): [number,number,number] => {
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
    return [r,g,b];
  };

  // ── PALETTE ───────────────────────────────────────────────────────────
  type RGB = [number,number,number];
  const C = {
    bg:      [8,  8,  8 ] as RGB,
    card:    [16, 16, 16] as RGB,
    card2:   [22, 22, 22] as RGB,
    border:  [36, 36, 36] as RGB,
    accent:  hexToRgb(accentHex),
    dimAcc:  [80, 110, 10] as RGB,
    white:   [255,255,255] as RGB,
    soft:    [210,210,210] as RGB,
    muted:   [130,130,130] as RGB,
    faint:   [50, 50, 50 ] as RGB,
    red:     [239, 68, 68] as RGB,
    amber:   [245,158, 11] as RGB,
    blue:    [99, 179,237] as RGB,
    green:   [34, 197, 94] as RGB,
  };

  const ML  = 14;
  const MR  = 14;
  const CW  = PW - ML - MR;
  const BOT = PH - 18;
  let y     = 0;
  let pageNum = 0;

  // ── UTILS ─────────────────────────────────────────────────────────────
  const cl = (v: any, fb = "—"): string => {
    if (v === null || v === undefined || v === "") return fb;
    if (typeof v === "object") return fb;
    const s = String(v).trim(); return s || fb;
  };
  const n = (v: any): number | null => { const x = Number(v); return Number.isFinite(x) ? x : null; };
  const clamp = (v: number, lo=0, hi=100) => Math.max(lo, Math.min(hi, v));
  const fmt = (v: any): string => {
    const x = n(v); if (x === null) return "—";
    if (x >= 1_000_000) return `${(x/1_000_000).toFixed(1)}M`;
    if (x >= 1_000)     return `${(x/1_000).toFixed(1)}K`;
    return String(Math.round(x));
  };
  const sCol = (s: any): RGB => { const x = n(s); if (x===null) return C.muted; if (x>=75) return C.accent; if (x>=55) return C.amber; return C.red; };
  const sLbl = (s: any): string => { const x = n(s); if (x===null) return "No Data"; if (x>=90) return "Excellent"; if (x>=75) return "Strong"; if (x>=60) return "Moderate"; return "Needs Work"; };

  // ── PAGE OPS ──────────────────────────────────────────────────────────
  const drawBg = () => { doc.setFillColor(...C.bg); doc.rect(0,0,PW,PH,"F"); doc.setFillColor(...C.accent); doc.rect(0,0,PW,0.5,"F"); };
  const drawFooter = () => {
    const fp = PH-10;
    doc.setDrawColor(...C.border); doc.setLineWidth(0.25); doc.line(ML,fp-3,PW-MR,fp-3);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted);
    doc.text(brandName, ML, fp);
    doc.text(`Page ${pageNum}`, PW/2, fp, {align:"center"});
    doc.text(generatedDate, PW-MR, fp, {align:"right"});
  };
  const newPage = () => { doc.addPage(); pageNum++; y=20; drawBg(); };
  const ensure  = (needed=30) => { if (y+needed > BOT) newPage(); };
  const gap     = (mm=5) => { y+=mm; };

  // ── TYPOGRAPHY ────────────────────────────────────────────────────────
  const h1 = (t: string) => { ensure(14); doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(...C.white); doc.text(cl(t),ML,y); y+=8; };
  const h2 = (t: string) => { ensure(10); doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...C.white); doc.text(cl(t),ML,y); y+=6; };
  const sub = (t: string) => { ensure(8); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted); const ls=doc.splitTextToSize(cl(t,""),CW); doc.text(ls,ML,y); y+=ls.length*4+2; };
  const body_ = (t: string, x=ML, w=CW) => { ensure(8); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.soft); const ls=doc.splitTextToSize(cl(t,""),w); doc.text(ls,x,y); y+=ls.length*4.5+2; };
  const lbl = (t: string, col: RGB=C.muted) => { doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(...col); doc.text(cl(t,"").toUpperCase(),ML,y); y+=4; };
  const divLine = () => { ensure(4); doc.setDrawColor(...C.faint); doc.setLineWidth(0.2); doc.line(ML,y,PW-MR,y); y+=5; };

  // ── SECTION HEADER (new page + header bar) ────────────────────────────
  const secHdr = (num: string, title: string, subtitle?: string) => {
    newPage();
    doc.setFillColor(...C.card); doc.rect(0,0,PW,16,"F");
    doc.setFillColor(...C.accent); doc.rect(0,0,3,16,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(...C.dimAcc); doc.text(`SECTION ${num}`, ML+5, 6);
    doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...C.white); doc.text(cl(title), ML+5, 13);
    y=22; if (subtitle) { sub(subtitle); gap(2); }
  };

  // inline section title (within a page)
  const secTitle = (title: string, s?: string) => {
    ensure(20); gap(3);
    doc.setFillColor(...C.accent); doc.rect(ML,y-1,2.5,8,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...C.white); doc.text(cl(title),ML+6,y+5.5);
    y+=11; if (s) { sub(s); } gap(2);
  };

  // ── KPI CARD ROW ──────────────────────────────────────────────────────
  const kpiRow = (cards: {label:string; value:any; sub?:string; col?:RGB}[]) => {
    ensure(30); const n4=cards.length, g3=3, w=(CW-g3*(n4-1))/n4;
    cards.forEach((c,i)=>{
      const x=ML+i*(w+g3), yy=y, h=28;
      doc.setFillColor(...C.card); doc.setDrawColor(...C.border); doc.roundedRect(x,yy,w,h,2,2,"FD");
      const col=c.col||sCol(c.value);
      doc.setFillColor(...col); doc.roundedRect(x,yy,w,1.5,0.5,0.5,"F");
      doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(...C.muted); doc.text(cl(c.label,"").toUpperCase(),x+4,yy+7);
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...col); doc.text(cl(String(c.value??"—")),x+4,yy+16);
      if(c.sub){doc.setFont("helvetica","normal");doc.setFontSize(6);doc.setTextColor(...C.muted);doc.text(cl(c.sub,""),x+4,yy+22);}
    });
    y+=30+3;
  };

  // ── SCORE BAR ─────────────────────────────────────────────────────────
  const scoreBar = (lbl_: string, score: any, note="") => {
    ensure(18); const s=clamp(n(score)??0), col=sCol(score), fw=(CW*s)/100;
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.soft); doc.text(cl(lbl_),ML,y);
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...col); doc.text(`${s}/100  ${sLbl(score)}`,PW-MR,y,{align:"right"});
    y+=4;
    doc.setFillColor(22,22,22); doc.roundedRect(ML,y,CW,7,2,2,"F");
    if(fw>0){doc.setFillColor(...col); doc.roundedRect(ML,y,fw,7,2,2,"F");}
    if(note){doc.setFont("helvetica","normal");doc.setFontSize(6);doc.setTextColor(...C.faint);doc.text(cl(note),PW-MR,y+10,{align:"right"});}
    y+=14;
  };

  // ── HIGHLIGHT BOX ─────────────────────────────────────────────────────
  type BoxType = "green"|"amber"|"red"|"blue"|"muted";
  const hiBox = (title: string, body: string, type: BoxType="green") => {
    ensure(26); const cmap:Record<BoxType,RGB>={green:C.accent,amber:C.amber,red:C.red,blue:C.blue,muted:C.muted};
    const col=cmap[type], h=22;
    doc.setFillColor(...C.card2); doc.setDrawColor(...C.border); doc.roundedRect(ML,y,CW,h,2,2,"FD");
    doc.setFillColor(...col); doc.roundedRect(ML,y,2.5,h,1,1,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...col); doc.text(cl(title),ML+7,y+7);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.soft);
    const ls=doc.splitTextToSize(cl(body,""),CW-14); doc.text(ls.slice(0,2),ML+7,y+14);
    y+=h+4;
  };

  // ── DATA TABLE ────────────────────────────────────────────────────────
  type TR = {col1:string; col2:string; col3?:string; col4?:string};
  const tbl = (headers: string[], rows: TR[], colW?: number[]) => {
    if(!rows.length){body_("No data available."); return;}
    const nc=headers.length;
    const def=colW||(nc===2?[70,CW-70]:nc===3?[55,55,CW-110]:[40,55,48,CW-143]);
    const keys=(["col1","col2","col3","col4"] as (keyof TR)[]).slice(0,nc);
    ensure(12+rows.length*10);
    doc.setFillColor(24,24,24); doc.setDrawColor(...C.border); doc.roundedRect(ML,y,CW,9,1.5,1.5,"FD");
    let cx=ML;
    headers.forEach((h_,i)=>{doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.setTextColor(...C.accent);doc.text(cl(h_).toUpperCase(),cx+4,y+6);cx+=def[i];});
    y+=9;
    rows.forEach((row,ri)=>{
      ensure(10); const rh=9;
      doc.setFillColor(...(ri%2===0?C.card:C.card2)); doc.setDrawColor(...C.faint); doc.rect(ML,y,CW,rh,"FD");
      cx=ML;
      keys.forEach((k,ci)=>{
        const val=cl(String(row[k]??""),"—"), isMuted=ci>0;
        doc.setFont("helvetica",ci===0?"bold":"normal"); doc.setFontSize(7); doc.setTextColor(...(isMuted?C.muted:C.soft));
        const tr=doc.splitTextToSize(val,def[ci]-6)[0]??val; doc.text(tr,cx+4,y+6.5); cx+=def[ci];
      });
      y+=rh;
    });
    y+=5;
  };

  // ── ACTION CARD ───────────────────────────────────────────────────────
  const actCard = (title: string, impact: string, timeline: string, detail: string, pri?: "high"|"medium"|"low") => {
    ensure(30); const pc:RGB=pri==="high"?C.red:pri==="low"?C.blue:C.amber, h=28;
    doc.setFillColor(...C.card); doc.setDrawColor(...C.border); doc.roundedRect(ML,y,CW,h,2,2,"FD");
    doc.setFillColor(...pc); doc.roundedRect(ML,y,3,h,1,1,"F");
    const bx=PW-MR-38;
    doc.setFillColor(28,28,28); doc.roundedRect(bx,y+4,36,7,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...pc); doc.text(`${impact}  ·  ${timeline}`,bx+3,y+8.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(...C.white); doc.text(cl(title),ML+8,y+9);
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted);
    const ls=doc.splitTextToSize(cl(detail),CW-50); doc.text(ls.slice(0,2),ML+8,y+16);
    y+=h+4;
  };

  // ── PILL ──────────────────────────────────────────────────────────────
  const pill_ = (text: string, x: number, yy: number): number => {
    const w=Math.max(20,doc.getTextWidth(text)+10);
    doc.setFillColor(20,20,20); doc.setDrawColor(...C.border); doc.roundedRect(x,yy,w,7,2,2,"FD");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.accent); doc.text(text.toUpperCase(),x+5,yy+4.8);
    return w+3;
  };

  // ── MINI GAUGE ────────────────────────────────────────────────────────
  const gauge = (cx: number, cy: number, r: number, score: number, col: RGB) => {
    doc.setFillColor(24,24,24); doc.circle(cx,cy,r,"F");
    const pct=clamp(score)/100, steps=48, sa=-Math.PI/2, ea=sa+pct*2*Math.PI;
    doc.setDrawColor(...col); doc.setLineWidth(2);
    for(let i=0;i<steps;i++){
      const t1=sa+(i/steps)*(ea-sa), t2=sa+((i+1)/steps)*(ea-sa);
      doc.line(cx+(r-1.5)*Math.cos(t1),cy+(r-1.5)*Math.sin(t1),cx+(r-1.5)*Math.cos(t2),cy+(r-1.5)*Math.sin(t2));
    }
    doc.setFillColor(...C.bg); doc.circle(cx,cy,r-3.5,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...col); doc.text(String(score),cx,cy+2.8,{align:"center"});
  };

  // ── pdfShouldShow ─────────────────────────────────────────────────────
  const pdfShow = (sec: string): boolean => {
    if(!selectedModules||!selectedModules.length) return true;
    if(selectedModules.includes("full")) return true;
    const map:Record<string,string[]>={seo:["seo","technical"],technical:["seo","technical"],traffic:["traffic"],competitors:["competitors"],keywords:["keywords"],backlinks:["backlinks"],ai:["ai"],recommendations:["recommendations"],local:["local","localSeo"],content:["content"],serp:["seo","technical","keywords"],domainAnalytics:["traffic"],labs:["keywords","competitors"]};
    return (map[sec]||[]).some(m=>selectedModules.includes(m));
  };

  // ── simpleList ────────────────────────────────────────────────────────
  const simpleList = (items: any[], empty="No items available.") => {
    const safe=Array.isArray(items)?items:[];
    if(!safe.length){body_(empty);return;}
    safe.slice(0,10).forEach((item:any,i:number)=>{
      const t=cl(item?.title||item?.issue||item?.keyword||item?.domain||`Item ${i+1}`);
      const d=cl(item?.detail||item?.description||item?.recommendation||item?.action||item?.summary||"Review this item.");
      const imp=String(item?.impact||"Medium").toLowerCase();
      actCard(t,item?.impact||"Medium",item?.timeline||"30 days",d,imp.includes("high")?"high":imp.includes("low")?"low":"medium");
    });
  };

  // ════════════════════════════════════════════════════════════════════
  //  PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════════════
  pageNum=1; drawBg();
  // grid lines
  doc.setDrawColor(18,18,18); doc.setLineWidth(0.15);
  for(let i=0;i<=14;i++) doc.line(i*15,0,i*15,PH);
  for(let i=0;i<=20;i++) doc.line(0,i*15,PW,i*15);
  // top bar
  doc.setFillColor(...C.card); doc.rect(0,0,PW,18,"F");
  doc.setFillColor(...C.accent); doc.rect(0,0,PW,1.5,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.accent); doc.text(brandName,ML,11);
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(tagline,PW-MR,11,{align:"right"});
  // title
  doc.setFont("helvetica","bold"); doc.setFontSize(34); doc.setTextColor(...C.white); doc.text("Website Growth",ML,52); doc.text("Intelligence",ML,67);
  doc.setTextColor(...C.accent); doc.text("Report",ML,82);
  doc.setDrawColor(...C.accent); doc.setLineWidth(0.6); doc.line(ML,88,ML+70,88);
  // domain card
  doc.setFillColor(12,12,12); doc.setDrawColor(...C.border); doc.roundedRect(ML,96,CW,40,3,3,"FD");
  doc.setFillColor(...C.accent); doc.roundedRect(ML,96,3,40,1.5,1.5,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text("AUDITED DOMAIN",ML+8,106);
  doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(...C.white); doc.text(cl(domain),ML+8,118);
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(`Generated: ${generatedDate}`,ML+8,126); doc.text(`Prepared by: ${brandName}`,ML+8,131);
  // pills
  let px=ML+8;
  (selectedModules.length?selectedModules:["seo","traffic","ai","competitors"]).slice(0,7).forEach((m:string)=>{ px+=pill_(m,px,138)+2; });
  // gauges
  const gscores=[{l:"Overall",v:n(normalized.scores.overall)??0},{l:"SEO",v:n(normalized.scores.seo)??0},{l:"Speed",v:n(normalized.scores.ux??normalized.scores.mobile)??0},{l:"AI",v:n(normalized.scores.ai)??0}];
  const gyY=160, ggap=CW/4;
  gscores.forEach((gs,i)=>{ const gx=ML+i*ggap+ggap/2; gauge(gx,gyY+10,11,gs.v,sCol(gs.v)); doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.muted); doc.text(gs.l.toUpperCase(),gx,gyY+25,{align:"center"}); });
  // tagline
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
  doc.text(doc.splitTextToSize("This report translates technical audit data into clear business intelligence — what is working, what is at risk, and what to prioritise first.",CW),ML,200);
  // bottom bar
  doc.setFillColor(...C.card); doc.rect(0,PH-20,PW,20,"F"); doc.setFillColor(...C.accent); doc.rect(0,PH-1.5,PW,1.5,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(`${brandName}  ·  ${tagline}`,ML,PH-8); doc.setTextColor(...C.accent); doc.text("Page 1",PW-MR,PH-8,{align:"right"});

  // ════════════════════════════════════════════════════════════════════
  //  PAGE 2 — TABLE OF CONTENTS
  // ════════════════════════════════════════════════════════════════════
  newPage(); lbl("REPORT CONTENTS",C.accent); gap(4); h1("Table of Contents");
  sub("This report covers every module run in this audit, organised for executive review through to detailed evidence appendices.");
  divLine();
  const toc = [
    ["01","Executive Snapshot","Scores, benchmarks, biggest risk & opportunity"],
    ["02","Unified Overview","Combined intelligence summary across all modules"],
    ["03","Organic Traffic Intelligence","Modelled traffic, keyword footprint, top keywords"],
    ["04","Domain Analytics","Organic vs paid traffic and keyword signals"],
    ["05","SEO Foundation","Metadata, headings, alt text, technical issues"],
    ["06","Performance & Core Web Vitals","Speed scores, LCP, CLS, FCP, TBT"],
    ["07","AI Search Visibility","Brand mentions, model coverage, GEO readiness"],
    ["08","Competitor Intelligence","Threat scores, shared keywords, winning factors"],
    ["09","Keyword Gap & Labs","Missing keywords, opportunities, content ideas"],
    ["10","Keyword Research","Seed keyword suggestions and intent signals"],
    ["11","SERP Rankings","Live Google rank positions per keyword"],
    ["12","Backlink Authority","Domain trust, referring domains, top backlinks"],
    ["13","Technical SEO Audit","OnPage crawl status, pages, broken links"],
    ["14","Content Quality","Page content, content analysis results"],
    ["15","Local SEO","Business listings, ratings, reviews"],
    ["16","Recommendations","Prioritised action cards from AI engine"],
    ["17","Action Roadmap","30/60/90 day execution plan"],
    ["A", "Appendix","Full evidence tables for all modules"],
  ];
  toc.forEach(([num,t,d],i)=>{
    ensure(10); const ry=y;
    if(i%2===0){doc.setFillColor(14,14,14);doc.rect(ML,ry-1,CW,9,"F");}
    doc.setFillColor(...C.card2); doc.circle(ML+4,ry+3,3.5,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.accent); doc.text(num,ML+4,ry+4.5,{align:"center"});
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.soft); doc.text(t,ML+12,ry+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted); doc.text(d,PW-MR,ry+5,{align:"right"});
    const tx=ML+12+doc.getTextWidth(t)+2, rx=PW-MR-doc.getTextWidth(d)-2;
    doc.setFillColor(...C.faint); if(rx>tx+4){for(let dx=tx;dx<rx;dx+=3)doc.circle(dx,ry+4,0.25,"F");}
    y+=9;
  });
  gap(5); divLine();
  body_("Traffic, keyword, and AI visibility estimates are directional intelligence derived from keyword visibility and CTR modelling. They should not be read as exact analytics data.");

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 01 — EXECUTIVE SNAPSHOT
  // ════════════════════════════════════════════════════════════════════
  secHdr("01","Executive Snapshot","High-level digital health, benchmark scores, and primary business risks at a glance.");
  kpiRow([
    {label:"Overall Score",value:`${cl(String(normalized.scores.overall??"—"))}/100`,sub:sLbl(normalized.scores.overall),col:sCol(normalized.scores.overall)},
    {label:"SEO Foundation",value:`${cl(String(normalized.scores.seo??"—"))}/100`,sub:sLbl(normalized.scores.seo),col:sCol(normalized.scores.seo)},
    {label:"Performance",value:`${cl(String(normalized.scores.ux??normalized.scores.mobile??"—"))}/100`,sub:sLbl(normalized.scores.ux??normalized.scores.mobile),col:sCol(normalized.scores.ux??normalized.scores.mobile)},
    {label:"AI Visibility",value:`${cl(String(normalized.scores.ai??"—"))}/100`,sub:sLbl(normalized.scores.ai),col:sCol(normalized.scores.ai)},
  ]);
  kpiRow([
    {label:"Share of Voice",value:fmt(Math.round((Number(data?.aiVisibility?.totalMentions??0))/(Math.max(1,Number(data?.aiOptimization?.totalMentions??1)))*100))+"%",sub:"AI share of voice",col:C.blue},
    {label:"Est. Monthly Traffic",value:fmt(data?.traffic?.rawMonthly??data?.traffic?.monthly),sub:`Confidence: ${cl(normalized.traffic.confidence)}`,col:C.accent},
    {label:"Organic Keywords",value:fmt(data?.dataforseo?.organicKeywords),sub:"Ranking keywords",col:C.amber},
    {label:"Referring Domains",value:fmt(data?.backlinks?.referringDomains),sub:"Link authority",col:C.blue},
  ]);
  secTitle("Visual Score Breakdown");
  scoreBar("Overall Growth Score",normalized.scores.overall,"Benchmark: 80+ recommended");
  scoreBar("SEO Foundation",normalized.scores.seo,"Benchmark: 80+ recommended");
  scoreBar("Performance & UX",normalized.scores.ux??normalized.scores.mobile,"Benchmark: 75+ recommended");
  scoreBar("AI Visibility",normalized.scores.ai,"Benchmark: 70+ recommended");
  gap(3); divLine();
  secTitle("Key Business Insights");
  normalized.executiveCards?.forEach((card:any)=>{ const imp=String(card.impact||"medium").toLowerCase(); hiBox(card.title,card.detail,imp.includes("high")?"red":imp.includes("low")?"blue":"amber"); });
  ensure(50); secTitle("Biggest Risk & Opportunity");
  hiBox("⚠  Biggest Risk",cl(normalized.summary.biggestIssue),"red");
  hiBox("✦  Biggest Opportunity",cl(normalized.summary.biggestOpportunity),"green");

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 02 — UNIFIED OVERVIEW
  // ════════════════════════════════════════════════════════════════════
  secHdr("02","Unified Overview","Combined intelligence summary: status, data coverage, source modules, and module-level execution results.");
  kpiRow([
    {label:"Overall Status",value:cl(data?.unifiedOverview?.overallStatus),col:C.accent},
    {label:"Primary Opportunity",value:cl(data?.unifiedOverview?.primaryOpportunity),col:C.amber},
    {label:"Sources Active",value:cl(String(data?.unifiedOverview?.sourceCoverage?.length??"—")),col:C.blue},
    {label:"Detected Niche",value:cl(data?.dataforseo?.detectedNiche),col:C.muted},
  ]);
  secTitle("Source Coverage");
  if(data?.unifiedOverview?.sourceCoverage?.length){
    tbl(["Data Source"],[...data.unifiedOverview.sourceCoverage.map((s:string)=>({col1:cl(s)}))],[CW]);
  } else { body_("No source coverage data returned."); }
  secTitle("API Module Execution Status");
  if(data?.moduleStatus && Object.keys(data.moduleStatus).length){
    tbl(["Module","Status","Meaning"],
      Object.entries(data.moduleStatus).map(([mod,status]:any)=>({
        col1: mod.replace(/([A-Z])/g," $1"),
        col2: cl(String(status)),
        col3: status==="completed"?"Data returned successfully":status==="partial"?"Partial data returned":status==="skipped"?"Module not selected":"Data unavailable — check API or module limits",
      })),[50,30,CW-80]);
  } else { body_("No module status data."); }
  secTitle("Key Metrics Overview");
  const km=data?.unifiedOverview?.keyMetrics||{};
  tbl(["Metric","Value"],
    [
      {col1:"SEO Score",col2:cl(String(km.seoScore??"—"))},
      {col1:"AI Visibility",col2:cl(String(km.aiVisibility??"—"))},
      {col1:"Est. Monthly Traffic",col2:fmt(km.monthlyTraffic)},
      {col1:"Traffic Confidence",col2:cl(km.trafficConfidence)},
      {col1:"Organic Keywords",col2:fmt(km.organicKeywords)},
      {col1:"Competitors Found",col2:cl(String(km.competitorsFound??"—"))},
      {col1:"Backlinks",col2:fmt(km.backlinks)},
      {col1:"SERP Keywords Checked",col2:cl(String(km.serpKeywordsChecked??"—"))},
      {col1:"SERP Found Count",col2:cl(String(km.serpFoundCount??"—"))},
      {col1:"Pages Crawled",col2:cl(String(km.pagesCrawled??"—"))},
      {col1:"Local Listings",col2:cl(String(km.localListings??"—"))},
      {col1:"Content Results",col2:cl(String(km.contentResultsFound??"—"))},
    ],[70,CW-70]);

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 03 — ORGANIC TRAFFIC
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("traffic")){
    secHdr("03","Organic Traffic Intelligence","Modelled from ranked keyword visibility and CTR curves. Treat as directional organic visibility, not exact analytics data.");
    kpiRow([
      {label:"Est. Monthly Visits",value:fmt(data?.traffic?.rawMonthly??data?.traffic?.monthly),sub:`Confidence: ${cl(normalized.traffic.confidence)}`,col:C.accent},
      {label:"Daily Visits",value:fmt(normalized.traffic.daily),sub:"Monthly ÷ 30",col:C.blue},
      {label:"Keyword Footprint",value:fmt(normalized.traffic.keywordCount),sub:"Ranked keywords",col:C.amber},
      {label:"Traffic Score",value:cl(String(data?.traffic?.score??"—")),sub:"High / Medium / Low",col:sCol(data?.traffic?.score==="High"?85:data?.traffic?.score==="Medium"?60:30)},
    ]);
    if(data?.traffic?.confidence==="insufficient-data"){
      hiBox("Insufficient Traffic Data","Fewer than 50 ranked keywords found. Increase keyword visibility to improve confidence.","amber");
    }
    secTitle("Traffic Intelligence Summary");
    tbl(["Metric","Value","Notes"],[
      {col1:"Est. Monthly Visits",col2:fmt(data?.traffic?.rawMonthly??data?.traffic?.monthly),col3:"Organic visibility estimate"},
      {col1:"Est. Daily Visits",col2:fmt(normalized.traffic.daily),col3:"Monthly ÷ 30"},
      {col1:"Keyword Footprint",col2:fmt(normalized.traffic.keywordCount),col3:"500+ moderate, 2,000+ strong"},
      {col1:"Filtered Keywords",col2:fmt(data?.traffic?.filteredKeywordCount),col3:"Low-volume (<10) removed"},
      {col1:"Confidence",col2:cl(normalized.traffic.confidence),col3:"High requires 2,000+ ranked keywords"},
      {col1:"Data Method",col2:cl(data?.traffic?.method??"CTR curve"),col3:"Clickstream ETV → CTR fallback"},
      {col1:"Traffic Note",col2:cl(data?.traffic?.note??"Modelled estimate").slice(0,80),col3:"Directional, not analytics data"},
    ],[50,35,CW-85]);
    if(normalized.topKeywords?.length){
      secTitle("Top Ranking Keywords");
      tbl(["Keyword","Position","Volume","Est. Traffic"],
        normalized.topKeywords.slice(0,15).map((k:any)=>({col1:cl(k.keyword),col2:cl(String(k.position??"—")),col3:fmt(k.volume),col4:fmt(k.traffic)})),
        [80,22,28,CW-130]);
    }
    if(normalized.topPages?.length){
      secTitle("Top SEO Landing Pages");
      tbl(["URL","Keywords","Traffic Signal"],
        normalized.topPages.slice(0,10).map((p:any)=>({col1:cl(p.url),col2:cl(String(p.keywords??"—")),col3:cl(String(p.traffic??"—"))})),
        [100,28,CW-128]);
    }
    if(data?.traffic?.keywords?.length){
      secTitle("Traffic Debug — Top Keyword Contributions");
      tbl(["Keyword","Position","Volume","CTR","Method"],
        (data.traffic?.debug?.length?data.traffic.debug:data.traffic.keywords).slice(0,12).map((k:any)=>({
          col1:cl(k.keyword),col2:cl(String(k.position??"—")),col3:fmt(k.searchVolume??k.volume),
          col4:cl(k.ctr!=null?`${(Number(k.ctr)*100).toFixed(1)}%`:"—"),
          col5:cl(k.method??"ctr_curve"),
        })),[65,20,25,20,CW-130]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 04 — DOMAIN ANALYTICS
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("domainAnalytics")){
    secHdr("04","Domain Analytics","Organic and paid visibility signals from DataForSEO Domain Analytics API.");
    kpiRow([
      {label:"Organic Keywords",value:fmt(data?.domainAnalytics?.organicKeywords),col:C.accent},
      {label:"Est. Organic Traffic",value:fmt(data?.domainAnalytics?.organicTraffic),col:C.green},
      {label:"Organic Cost",value:cl(String(data?.domainAnalytics?.organicCost??"—")),col:C.muted},
      {label:"Paid Keywords",value:fmt(data?.domainAnalytics?.paidKeywords),col:C.blue},
    ]);
    tbl(["Metric","Organic","Paid"],[
      {col1:"Keywords",col2:fmt(data?.domainAnalytics?.organicKeywords),col3:fmt(data?.domainAnalytics?.paidKeywords)},
      {col1:"Traffic",col2:fmt(data?.domainAnalytics?.organicTraffic),col3:fmt(data?.domainAnalytics?.paidTraffic)},
      {col1:"Cost",col2:cl(String(data?.domainAnalytics?.organicCost??"—")),col3:cl(String(data?.domainAnalytics?.paidCost??"—"))},
    ],[40,50,CW-90]);
    body_("Use this section to understand whether the domain relies more on organic discovery or paid acquisition for its current visibility.");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 05 — SEO FOUNDATION
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("seo")){
    secHdr("05","SEO Foundation Audit","Core SEO elements: metadata, heading structure, alt text, and basic on-page signals.");
    kpiRow([
      {label:"SEO Score",value:`${cl(String(data?.seoScore??"—"))}/100`,sub:sLbl(data?.seoScore),col:sCol(data?.seoScore)},
      {label:"UX Score",value:`${cl(String(data?.uxScore??"—"))}/100`,sub:sLbl(data?.uxScore),col:sCol(data?.uxScore)},
      {label:"Page Title",value:data?.title?"Found":"Missing",sub:data?.title?"Detected":"Not detected",col:data?.title?C.accent:C.red},
      {label:"Meta Description",value:data?.description?"Found":"Missing",sub:data?.description?"Detected":"Not detected",col:data?.description?C.accent:C.red},
    ]);
    secTitle("On-Page SEO Check");
    tbl(["Element","Status","Recommendation"],[
      {col1:"Page Title",col2:cl(normalized.seo.title,"Not detected"),col3:"Unique, 50–60 chars, includes primary keyword"},
      {col1:"Meta Description",col2:cl(normalized.seo.metaDescription,"Not detected"),col3:"Unique, 140–160 chars, includes CTA"},
      {col1:"H1 Heading",col2:cl(normalized.seo.h1,"Not detected"),col3:"One clear H1 defining main topic or offer"},
      {col1:"Image ALT Text",col2:cl(normalized.seo.missingAlt,"Not checked"),col3:"Descriptive ALT on all important images"},
    ],[38,60,CW-98]);
    if(data?.title){
      secTitle("Detected Page Title");
      hiBox("Page Title",cl(data.title),"blue");
    }
    if(data?.description){
      secTitle("Detected Meta Description");
      hiBox("Meta Description",cl(data.description),"blue");
    }
    if(data?.recommendations?.length){
      secTitle("SEO Recommendations");
      data.recommendations.slice(0,8).forEach((rec:string,i:number)=>{
        actCard(`Recommendation ${i+1}`,i<3?"High":i<6?"Medium":"Low Win",i<3?"7–30 days":i<6?"30–60 days":"60–90 days",rec,i<3?"high":i<6?"medium":"low");
      });
    }
    if(data?.issues?.length){
      secTitle("Priority SEO Issues");
      simpleList(data.issues.slice(0,8),"No SEO issues returned.");
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 06 — PERFORMANCE & CORE WEB VITALS
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("technical")){
    secHdr("06","Performance & Core Web Vitals","PageSpeed scores and Core Web Vitals from Google PageSpeed Insights API.");
    const mob=data?.pageSpeed?.mobile||{}, dsk=data?.pageSpeed?.desktop||{};
    kpiRow([
      {label:"Mobile Score",value:`${cl(String(mob.score??"—"))}/100`,sub:sLbl(mob.score),col:sCol(mob.score)},
      {label:"Desktop Score",value:`${cl(String(dsk.score??"—"))}/100`,sub:sLbl(dsk.score),col:sCol(dsk.score)},
      {label:"LCP (Mobile)",value:cl(mob.lcp,"—"),sub:"Target: < 2.5s",col:C.blue},
      {label:"CLS (Mobile)",value:cl(mob.cls,"—"),sub:"Target: < 0.1",col:C.blue},
    ]);
    scoreBar("Mobile Performance",mob.score,"Target 75+ for ranking advantage");
    scoreBar("Desktop Performance",dsk.score,"Target 90+ for premium experience");
    secTitle("Core Web Vitals — Mobile vs Desktop");
    tbl(["Metric","Mobile","Desktop","Target"],[
      {col1:"Performance Score",col2:cl(String(mob.score??"—")),col3:cl(String(dsk.score??"—")),col4:"75+ good, 90+ excellent"},
      {col1:"LCP",col2:cl(mob.lcp,"—"),col3:cl(dsk.lcp,"—"),col4:"Under 2.5 seconds"},
      {col1:"FCP",col2:cl(mob.fcp,"—"),col3:cl(dsk.fcp,"—"),col4:"Under 1.8 seconds"},
      {col1:"CLS",col2:cl(mob.cls,"—"),col3:cl(dsk.cls,"—"),col4:"Under 0.1"},
      {col1:"TBT",col2:cl(mob.tbt,"—"),col3:cl(dsk.tbt,"—"),col4:"Under 200ms"},
      {col1:"Speed Index",col2:cl(mob.speedIndex,"—"),col3:cl(dsk.speedIndex,"—"),col4:"Under 3.4 seconds"},
    ],[40,33,33,CW-106]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 07 — AI VISIBILITY
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("ai")&&(data?.aiOptimization||data?.aiVisibility)){
    secHdr("07","AI Search Visibility & GEO Readiness","Brand discoverability in AI-generated responses, generative search, and answer engines.");
    const aiScore=n(normalized.scores.ai)??0, aiConf=cl(data?.aiVisibility?.confidence??data?.aiOptimization?.confidence,"Low"), aiMent=n(data?.aiOptimization?.totalMentions)??0, aiMods=n(data?.aiOptimization?.totalModels)??0;
    const sov=Math.round((Number(data?.aiVisibility?.totalMentions??0))/(Math.max(1,Number(data?.aiOptimization?.totalMentions??1)))*100);
    kpiRow([
      {label:"AI Visibility Score",value:`${aiScore}/100`,sub:sLbl(aiScore),col:sCol(aiScore)},
      {label:"Brand Mentions",value:fmt(aiMent),sub:"In AI responses",col:aiMent>0?C.accent:C.red},
      {label:"Models Checked",value:fmt(aiMods),sub:"AI models tested",col:C.blue},
      {label:"Share of Voice",value:`${sov}%`,sub:"AI share of voice",col:C.amber},
    ]);
    scoreBar("AI Visibility Score",aiScore,"Benchmark: 70+ good, 85+ strong");
    secTitle("AI Visibility Summary");
    tbl(["Signal","Status","Implication"],[
      {col1:"AI Visibility Score",col2:`${aiScore}/100`,col3:aiScore>=70?"Brand has detectable AI presence":"Brand is weak or absent in AI results"},
      {col1:"Brand Mentions",col2:fmt(aiMent),col3:aiMent>0?"Brand appears in AI-generated responses":"Brand not detected in AI responses"},
      {col1:"Model Coverage",col2:fmt(aiMods),col3:"Number of AI models tested for brand visibility"},
      {col1:"Confidence",col2:aiConf,col3:"Reliability of AI visibility measurement"},
      {col1:"Prompt Used",col2:cl(data?.aiOptimization?.prompt?cl(data.aiOptimization.prompt).slice(0,60):"—"),col3:"The prompt used to test AI visibility"},
    ],[42,35,CW-77]);
    if(data?.aiOptimization?.models?.length){
      secTitle("Model-Level Results");
      tbl(["Model","Mentioned","Response Snippet"],
        data.aiOptimization.models.slice(0,10).map((m:any)=>({
          col1:cl(m.model),
          col2:m.mentioned?"Yes":"No",
          col3:m.responseSnippet&&m.responseSnippet!=="{}"?cl(m.responseSnippet).slice(0,80):"No response",
        })),[40,18,CW-58]);
    }
    const opportunity=data?.aiOptimization?data.aiOptimization.totalMentions===0?"The brand is not currently mentioned in AI recommendations. Build entity signals, trusted citations, FAQ content, and topical authority.":(aiConf==="low"?"Brand appeared in a limited AI model sample. Treat as directional. Expand prompts, entity signals, expert content, and third-party mentions to improve confidence.":"Brand is surfaced in at least one AI result. Expand coverage across more models and prompts."):"Data not available from AI Optimization API.";
    hiBox("AI Opportunity Insight",opportunity,aiScore>=70?"green":"amber");
    hiBox("Generative Engine Optimisation (GEO) Readiness",aiScore>=70?`${domain} shows detectable AI visibility. Strengthen with: entity signals, FAQ schema, third-party citations, and topical authority.`:`${domain} has weak AI visibility. Add: company entity signals, structured data, FAQ content, and external brand citations.`,aiScore>=70?"green":"amber");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 08 — COMPETITOR INTELLIGENCE
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("competitors")&&data?.competitors?.length){
    secHdr("08","Competitor Threat Intelligence","Domains capturing organic visibility through stronger content, authority, or keyword coverage.");
    kpiRow([
      {label:"Competitors Found",value:String(data.competitors.length),sub:"Organic overlap",col:C.accent},
      {label:"Top Competitor",value:cl(data.competitors[0]?.domain),sub:"Highest overlap",col:C.amber},
      {label:"Top Shared Keywords",value:fmt(Math.max(...data.competitors.map((c:any)=>Number(c.sharedKeywords||c.intersections||0)))),sub:"With top competitor",col:C.blue},
      {label:"Top Threat Score",value:cl(String(data.competitors[0]?.threatScore??"—")),sub:"Risk level",col:sCol(100-(n(data.competitors[0]?.threatScore)??50))},
    ]);
    secTitle("Competitor Overview Table");
    tbl(["Domain","Traffic","Shared KWs","Threat","Winning Factor"],
      data.competitors.slice(0,12).map((c:any)=>({
        col1:cl(c.domain),col2:fmt(c.traffic),col3:fmt(c.sharedKeywords??c.intersections),
        col4:cl(String(c.threatScore??"—")),col5:cl(c.likelyWinningFactor??c.winningFactor,"—"),
      })),[48,28,25,20,CW-121]);
    secTitle("Competitor Intelligence Details");
    data.competitors.slice(0,6).forEach((c:any)=>{
      hiBox(cl(c.domain),`Shared KWs: ${fmt(c.sharedKeywords??c.intersections)}  ·  Traffic: ${fmt(c.traffic)}  ·  Threat: ${cl(String(c.threatScore??"—"))}  ·  Strength: ${cl(c.competitiveStrength,"—")}  ·  AI Risk: ${cl(c.aiRisk,"—")}  ·  Winning: ${cl(c.likelyWinningFactor??c.winningFactor,"—")}`,"amber");
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 09 — KEYWORD GAP & LABS
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("keywords")||pdfShow("labs")){
    secHdr("09","Keyword Gap & SEO Labs Intelligence","Missing keywords competitors rank for, plus ranked keyword intelligence from DataForSEO Labs.");
    if(data?.dataforseo?.keywordGap){
      kpiRow([
        {label:"Own Keywords",value:fmt(data?.dataforseo?.keywordGap?.ownKeywords),col:C.accent},
        {label:"Competitors Checked",value:fmt(data?.dataforseo?.keywordGap?.competitorCount),col:C.blue},
        {label:"Missing Keywords",value:fmt(data?.dataforseo?.keywordGap?.missingKeywords?.length),col:C.amber},
        {label:"Gap Quality",value:cl(data?.dataforseo?.keywordGap?.quality==="available"?"Verified":"Limited"),col:data?.dataforseo?.keywordGap?.quality==="available"?C.accent:C.amber},
      ]);
    }
    if(data?.dataforseo?.keywordGap?.missingKeywords?.length){
      secTitle("Missing Keyword Opportunities");
      tbl(["Keyword","Volume","Intent","Page Type","Opportunity","Priority"],
        data.dataforseo.keywordGap.missingKeywords.slice(0,15).map((k:any)=>({
          col1:cl(k.keyword),col2:fmt(k.volume??k.search_volume),
          col3:cl(k.intent,"general"),col4:cl(k.recommendedPageType,"Supporting Content"),
          col5:cl(String(k.opportunityScore??"—")),col6:cl(k.priority,"Low"),
        })),[55,22,20,38,20,CW-155]);
      secTitle("Keyword Gap — Action Guidance");
      data.dataforseo.keywordGap.missingKeywords.slice(0,8).forEach((k:any)=>{
        actCard(cl(k.keyword),cl(k.priority,"Medium"),cl(k.action,"Add to content roadmap"),`Volume: ${fmt(k.volume)}  |  Intent: ${cl(k.intent)}  |  Competitors: ${Array.isArray(k.competitors)?k.competitors.join(", "):cl(k.competitors)}`,cl(k.priority,"medium").toLowerCase().includes("high")?"high":"medium");
      });
    }
    if(data?.dataforseo?.keywordGap?.contentIdeas?.length){
      secTitle("AI Content Cluster Ideas");
      tbl(["Cluster","Headline","Keywords"],
        data.dataforseo.keywordGap.contentIdeas.slice(0,8).map((idea:any)=>({
          col1:cl(idea.cluster),col2:cl(idea.headline),
          col3:idea.keywords?.slice(0,4).map((kk:any)=>kk.keyword).join(", ")||"—",
        })),[35,70,CW-105]);
    }
    if(data?.dataforseo?.topKeywords?.length){
      secTitle("DataForSEO Labs — Ranked Keywords");
      kpiRow([
        {label:"Organic Keywords",value:fmt(data?.dataforseo?.organicKeywords),col:C.accent},
        {label:"Top Keywords Fetched",value:fmt(data?.dataforseo?.topKeywords?.length),col:C.blue},
        {label:"Competitors Found",value:fmt(data?.dataforseo?.competitors?.length),col:C.amber},
        {label:"Fetch Iterations",value:cl(String(data?.dataforseo?.keywordFetchIterations??"—")),col:C.muted},
      ]);
      tbl(["Keyword","Position","Volume","CPC","Intent","KD","Opportunity"],
        data.dataforseo.topKeywords.slice(0,15).map((k:any)=>({
          col1:cl(k.keyword),col2:cl(String(k.position??"—")),col3:fmt(k.volume),
          col4:cl(k.cpc?`$${Number(k.cpc).toFixed(2)}`:"—"),col5:cl(k.intent,"—"),
          col6:cl(String(k.difficulty??"—")),col7:cl(String(k.opportunity??"—")),
        })),[55,18,22,18,18,12,CW-143]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 10 — KEYWORD RESEARCH
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("keywords")&&data?.keywordResearch?.suggestions?.length){
    secHdr("10","Keyword Research","Seed keyword suggestions from DataForSEO Keyword Suggestions API with intent and CPC signals.");
    kpiRow([
      {label:"Seed Keyword",value:cl(data?.keywordResearch?.seedKeyword),col:C.accent},
      {label:"Suggestions Found",value:fmt(data?.keywordResearch?.suggestions?.length),col:C.blue},
      {label:"Source",value:cl(data?.keywordResearch?.source,"DataForSEO"),col:C.muted},
      {label:"Location",value:cl(data?.traffic?.country,"—"),col:C.muted},
    ]);
    tbl(["Keyword","Volume","CPC","Competition","Intent","KD"],
      data.keywordResearch.suggestions.slice(0,20).map((k:any)=>({
        col1:cl(k.keyword),col2:fmt(k.volume),col3:cl(k.cpc?`$${Number(k.cpc).toFixed(2)}`:"—"),
        col4:cl(String(k.competition??"—")),col5:cl(k.intent,"—"),col6:cl(String(k.difficulty??"—")),
      })),[65,22,18,22,18,CW-145]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 11 — SERP RANKINGS
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("serp")&&data?.serpData){
    secHdr("11","Live SERP Rankings","Google rank positions checked by DataForSEO SERP API for tracked keywords.");
    kpiRow([
      {label:"Keywords Checked",value:cl(String(data?.serpData?.checkedKeywords??"—")),col:C.accent},
      {label:"Keywords Found",value:cl(String(data?.serpData?.foundCount??"—")),col:C.green},
      {label:"Keywords Not Found",value:cl(String(Math.max(0,(data?.serpData?.checkedKeywords??0)-(data?.serpData?.foundCount??0)))),col:C.red},
      {label:"Average Rank",value:cl(String(data?.serpData?.avgRank??"—")),col:C.blue},
    ]);
    if(data?.serpData?.results?.length){
      secTitle("Keyword Rank Results");
      tbl(["Keyword","Found","Google Rank","Ranking URL"],
        data.serpData.results.map((r:any)=>({
          col1:cl(r.keyword),col2:r.found?"Yes":"No",
          col3:r.found?`#${cl(String(r.rank),"—")}`:"Not found",col4:r.found?cl(r.url,"—"):"Not in top 100",
        })),[55,14,18,CW-87]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 12 — BACKLINK AUTHORITY
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("backlinks")&&data?.backlinks){
    secHdr("12","Backlink Authority & Trust Signals","Domain trust, referring domains, and top backlink sources from DataForSEO Backlinks API.");
    kpiRow([
      {label:"Backlink Rank",value:cl(String(data?.dataforseo?.backlinkRank??normalized.backlinks.rank??"—")),sub:"Authority signal",col:sCol(n(normalized.backlinks.rank))},
      {label:"Total Backlinks",value:fmt(data?.backlinks?.backlinks??normalized.backlinks.total),col:C.accent},
      {label:"Referring Domains",value:fmt(data?.backlinks?.referringDomains??normalized.backlinks.referringDomains),col:C.blue},
      {label:"Referring Pages",value:fmt(data?.backlinks?.referringPages??normalized.backlinks.referringDomains),col:C.amber},
    ]);
    scoreBar("Backlink Authority Signal",normalized.backlinks.rank,"50+ referring domains = moderate authority");
    tbl(["Metric","Value","Benchmark"],[
      {col1:"Backlink Rank",col2:cl(String(normalized.backlinks.rank??"—")),col3:"Higher = better; compare vs direct competitors"},
      {col1:"Total Backlinks",col2:fmt(data?.backlinks?.backlinks),col3:"Quality matters more than raw count"},
      {col1:"Referring Domains",col2:fmt(data?.backlinks?.referringDomains),col3:"50+ moderate, 200+ strong authority"},
      {col1:"Referring Pages",col2:fmt(data?.backlinks?.referringPages),col3:"More pages = broader link surface"},
    ],[45,35,CW-80]);
    if(data?.backlinks?.topBacklinks?.length){
      secTitle("Top Backlinks");
      tbl(["Domain","Anchor","Rank","Source URL"],
        data.backlinks.topBacklinks.slice(0,12).map((b:any)=>({
          col1:cl(b.domainFrom,"Unknown"),col2:cl(b.anchor,"No anchor"),
          col3:cl(String(b.rank??"—")),col4:cl(b.sourceUrl,"—"),
        })),[42,42,14,CW-98]);
    }
    if(normalized.backlinks.samples?.length){
      secTitle("Backlink Samples");
      tbl(["Anchor","Source","Target"],
        normalized.backlinks.samples.slice(0,10).map((l:any)=>({col1:cl(l.anchor,"No anchor"),col2:cl(l.source,"—"),col3:cl(l.target,"—")})),
        [42,68,CW-110]);
    }
    hiBox("Authority Insight",data?.backlinks?.referringDomains?`${domain} has ${cl(String(data.backlinks.referringDomains))} referring domains and ${cl(String(data.backlinks.backlinks??"unknown"))} total backlinks. Focus on earning quality industry mentions and relevant authority links.`:"Data not available from DataForSEO Backlinks API.","blue");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 13 — TECHNICAL SEO AUDIT
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("technical")&&data?.onPage){
    secHdr("13","Technical SEO Audit","OnPage crawl status, page-level issues, broken links, and crawl signals from DataForSEO OnPage API.");
    kpiRow([
      {label:"Pages Crawled",value:fmt(data?.onPage?.crawledPages),col:C.accent},
      {label:"Broken Links",value:fmt(data?.onPage?.brokenLinks),col:n(data?.onPage?.brokenLinks)&&n(data.onPage.brokenLinks)!==null&&(n(data.onPage.brokenLinks)??0)>0?C.red:C.green},
      {label:"Missing Titles",value:fmt(data?.onPage?.missingTitle),col:(n(data?.onPage?.missingTitle)??0)>0?C.amber:C.green},
      {label:"Missing Descriptions",value:fmt(data?.onPage?.missingDescription),col:(n(data?.onPage?.missingDescription)??0)>0?C.amber:C.green},
    ]);
    tbl(["Check","Result","Notes"],[
      {col1:"Crawl Status",col2:cl(data?.onPage?.crawlStatus,"—"),col3:"Completed crawl preferred"},
      {col1:"Pages Crawled",col2:fmt(data?.onPage?.crawledPages),col3:"More pages = deeper technical inspection"},
      {col1:"Broken Links",col2:fmt(data?.onPage?.brokenLinks),col3:"All broken links should be fixed or redirected"},
      {col1:"Missing Titles",col2:fmt(data?.onPage?.missingTitle),col3:"Every important page needs a unique title"},
      {col1:"Missing Descriptions",col2:fmt(data?.onPage?.missingDescription),col3:"Descriptions improve search CTR"},
      {col1:"Duplicate Titles",col2:fmt(data?.onPage?.duplicateTitle),col3:"Duplicate titles reduce topical clarity"},
    ],[42,30,CW-72]);
    if(data?.onPage?.pages?.length){
      secTitle("Sample Crawled Pages");
      tbl(["Title","URL","Status","Load Time"],
        data.onPage.pages.slice(0,12).map((p:any)=>({
          col1:cl(p.title,"Untitled"),col2:cl(p.url,"—"),
          col3:cl(String(p.statusCode??"—")),col4:cl(p.loadTime?`${p.loadTime}ms`:"—"),
        })),[55,65,14,CW-134]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 14 — CONTENT QUALITY
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("content")){
    secHdr("14","Content Quality & Relevance","On-page content signals and DataForSEO Content Analysis results.");
    kpiRow([
      {label:"Title Found",value:data?.title?"Yes":"Missing",col:data?.title?C.accent:C.red},
      {label:"Meta Description",value:data?.description?"Yes":"Missing",col:data?.description?C.accent:C.red},
      {label:"Content Results",value:fmt(data?.contentAnalysis?.results?.length),col:C.blue},
      {label:"Content Opportunities",value:fmt(data?.dataforseo?.keywordGap?.opportunities?.length),col:C.amber},
    ]);
    if(data?.dataforseo?.keywordGap?.opportunities?.length){
      secTitle("Content Opportunities");
      tbl(["Keyword","Volume","Competitor Domains"],
        data.dataforseo.keywordGap.opportunities.slice(0,10).map((k:any)=>({
          col1:cl(k.keyword),col2:fmt(k.volume),col3:Array.isArray(k.competitors)?k.competitors.join(", "):cl(k.competitors,"—"),
        })),[60,25,CW-85]);
    }
    if(data?.contentAnalysis?.results?.length){
      secTitle("Content Analysis Results");
      tbl(["Domain","Topic","Content Length","URL"],
        data.contentAnalysis.results.slice(0,10).map((item:any)=>({
          col1:cl(item.domain,"Unknown"),col2:cl(item.mainTopic,"—"),
          col3:cl(String(item.contentLength??"—")),col4:cl(item.url,"—"),
        })),[38,40,22,CW-100]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 15 — LOCAL SEO
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("local")&&data?.businessData?.listings?.length){
    secHdr("15","Local SEO & Business Listings","Business listing visibility, ratings, and review signals from DataForSEO Business Data API.");
    kpiRow([
      {label:"Listings Found",value:fmt(data?.businessData?.listings?.length),col:C.accent},
      {label:"Search Query",value:cl(data?.businessData?.keyword),col:C.blue},
      {label:"Location",value:cl(data?.businessData?.location),col:C.muted},
      {label:"Top Rating",value:cl(String(Math.max(...(data.businessData.listings||[]).map((l:any)=>Number(l.rating||0)))||"—")),col:C.amber},
    ]);
    tbl(["Business","Category","Rating","Reviews","Address"],
      data.businessData.listings.slice(0,10).map((item:any)=>({
        col1:cl(item.title,"Unknown"),col2:cl(item.category,"—"),
        col3:cl(String(item.rating??"—")),col4:cl(String(item.reviews??"—")),col5:cl(item.address,"—"),
      })),[40,30,14,16,CW-100]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 16 — RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════
  if(pdfShow("recommendations")){
    secHdr("16","AI Recommendations Engine","Prioritised strategic actions generated from real audit data across all selected modules.");
    kpiRow([
      {label:"Recommendations",value:fmt(data?.recommendations?.length),col:C.accent},
      {label:"Source",value:cl(data?.aiRecommendations?.source,"AI Engine"),col:C.muted},
      {label:"Primary Opportunity",value:cl(data?.unifiedOverview?.primaryOpportunity),col:C.amber},
      {label:"Top Priority",value:"Immediate",col:C.red},
    ]);
    if(data?.recommendations?.length){
      secTitle("Priority Recommendations");
      data.recommendations.slice(0,10).forEach((rec:string,i:number)=>{
        const isHigh=i<3, isMed=i<6;
        const owner=String(rec).toLowerCase().includes("technical")||String(rec).toLowerCase().includes("speed")?"Developer":String(rec).toLowerCase().includes("content")||String(rec).toLowerCase().includes("keyword")?"SEO / Content":"Growth Team";
        actCard(
          `Priority ${i+1}: ${String(rec).split(".")[0]||`Recommendation ${i+1}`}`,
          isHigh?"High Impact":isMed?"Medium Impact":"Quick Win",
          isHigh?"7–30 days":isMed?"30–60 days":"60–90 days",
          `${rec}  |  Owner: ${owner}`,
          isHigh?"high":isMed?"medium":"low"
        );
      });
    } else { body_("No recommendations were returned for this report."); }
    simpleList(smartRecs.slice(0,5),"");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 17 — ACTION ROADMAP
  // ════════════════════════════════════════════════════════════════════
  secHdr("17","30 / 60 / 90 Day Action Roadmap","A practical execution sequence for agencies, consultants, and growth teams.");
  secTitle("Priority Execution Matrix");
  tbl(["Priority","Focus","Timeline","Actions"],[
    {col1:"🔴  Immediate",col2:"High impact / Fast fix",col3:"0–30 days",col4:"Critical SEO, speed, metadata, crawlability, broken links"},
    {col1:"🟡  Growth",col2:"High impact / Medium effort",col3:"30–60 days",col4:"Keyword expansion, AI visibility, content, landing pages"},
    {col1:"🔵  Authority",col2:"Medium–high impact",col3:"60–90 days",col4:"Backlinks, topical authority, competitor coverage"},
    {col1:"🟢  Ongoing",col2:"Continuous optimisation",col3:"Continuous",col4:"A/B testing, CRO, monitoring, structured data"},
  ],[28,40,24,CW-92]);
  secTitle("Roadmap Phases");
  actCard("First 30 Days — Fix the Foundation","High Priority","0–30 days","Resolve critical SEO issues: missing metadata, heading structure, broken links, page speed, and crawl errors. Fast wins that improve indexing, UX, and conversion readiness.","high");
  actCard("Next 30 Days — Expand Visibility","High Priority","31–60 days","Create or optimise pages around keyword gaps, commercial opportunities, competitor content, and AI-search friendly entity signals. Build content that ranks and converts.","medium");
  actCard("Final 30 Days — Build Authority","Medium Priority","61–90 days","Strengthen topical authority, improve internal linking, earn relevant backlinks, and monitor AI visibility improvements against the benchmark scores in this report.","low");

  // ════════════════════════════════════════════════════════════════════
  //  APPENDIX — EVIDENCE
  // ════════════════════════════════════════════════════════════════════
  secHdr("A","Appendix — Supporting Evidence","Full data tables from each audit module for detailed review and client validation.");
  if(data?.issues?.length){ secTitle("Appendix A — All Priority Issues"); simpleList(data.issues.slice(0,15),"No issue evidence available."); }
  if(normalized.topKeywords?.length){ secTitle("Appendix B — Top Keyword Evidence"); tbl(["Keyword","Position","Volume","Traffic Est."],normalized.topKeywords.slice(0,15).map((k:any)=>({col1:cl(k.keyword),col2:cl(String(k.position??"—")),col3:fmt(k.volume),col4:fmt(k.traffic)})),[80,22,28,CW-130]); }
  if(normalized.keywordGaps?.length){ secTitle("Appendix C — Keyword Gap Evidence"); simpleList(normalized.keywordGaps.slice(0,15),"No keyword gap evidence."); }
  if(normalized.competitors?.length){ secTitle("Appendix D — Competitor Evidence"); tbl(["Domain","Traffic","Shared KWs","Winning Factor"],normalized.competitors.slice(0,12).map((c:any)=>({col1:cl(c.domain),col2:fmt(c.traffic),col3:fmt(c.sharedKeywords),col4:cl(c.winningFactor,"—")})),[50,28,25,CW-103]); }
  if(normalized.backlinks?.samples?.length){ secTitle("Appendix E — Backlink Evidence"); tbl(["Anchor","Source","Target"],normalized.backlinks.samples.slice(0,12).map((l:any)=>({col1:cl(l.anchor,"No anchor"),col2:cl(l.source,"—"),col3:cl(l.target,"—")})),[42,68,CW-110]); }
  if(normalized.ai?.prompts?.length){ secTitle("Appendix F — AI Visibility Evidence"); tbl(["Prompt","Mentioned","Result"],normalized.ai.prompts.slice(0,12).map((item:any)=>({col1:cl(item.prompt,"—"),col2:cl(item.mentioned,"—"),col3:cl(item.result,"—")})),[88,18,CW-106]); }
  if(data?.onPage?.pages?.length){ secTitle("Appendix G — Crawled Page Evidence"); tbl(["Status","Title","URL","Load"],data.onPage.pages.slice(0,12).map((p:any)=>({col1:cl(String(p.statusCode??"—")),col2:cl(p.title,"Untitled"),col3:cl(p.url,"—"),col4:cl(p.loadTime?`${p.loadTime}ms`:"—")})),[16,48,80,CW-144]); }
  if(data?.serpData?.results?.length){ secTitle("Appendix H — SERP Evidence"); tbl(["Keyword","Found","Rank","URL"],data.serpData.results.slice(0,12).map((r:any)=>({col1:cl(r.keyword),col2:r.found?"Yes":"No",col3:r.found?`#${cl(String(r.rank),"—")}`:"—",col4:r.found?cl(r.url,"—"):"Not in top 100"})),[55,14,14,CW-83]); }
  if(data?.businessData?.listings?.length){ secTitle("Appendix I — Business Listing Evidence"); tbl(["Business","Rating","Reviews","Address"],data.businessData.listings.slice(0,10).map((item:any)=>({col1:cl(item.title,"Unknown"),col2:cl(String(item.rating??"—")),col3:cl(String(item.reviews??"—")),col4:cl(item.address,"—")})),[50,16,16,CW-82]); }

  // Benchmark guide
  secTitle("Benchmark & Metric Reference");
  tbl(["Metric","Range","Target","What it means"],[
    {col1:"Overall Score",col2:"0–100",col3:"80+",col4:"Combined SEO, tech, visibility, authority, and growth readiness"},
    {col1:"SEO Score",col2:"0–100",col3:"80+",col4:"Title tags, meta, headings, crawlability, and technical foundations"},
    {col1:"Performance",col2:"0–100",col3:"75–90+",col4:"Loading speed and user experience, especially on mobile"},
    {col1:"AI Visibility",col2:"0–100",col3:"70–85+",col4:"Brand readiness for AI-style answers and generative search"},
    {col1:"LCP",col2:"Seconds",col3:"< 2.5s",col4:"Largest Contentful Paint — main content load speed"},
    {col1:"CLS",col2:"Score",col3:"< 0.1",col4:"Cumulative Layout Shift — visual stability"},
    {col1:"TBT",col2:"ms",col3:"< 200ms",col4:"Total Blocking Time — JavaScript interaction delay"},
    {col1:"Traffic Estimate",col2:"Visits",col3:"Directional",col4:"Modelled from keyword visibility and CTR — not analytics"},
  ],[35,18,25,CW-78]);

  // ════════════════════════════════════════════════════════════════════
  //  CLOSING PAGE
  // ════════════════════════════════════════════════════════════════════
  newPage();
  doc.setDrawColor(18,18,18); doc.setLineWidth(0.15);
  for(let i=0;i<=14;i++) doc.line(i*15,0,i*15,PH);
  for(let i=0;i<=20;i++) doc.line(0,i*15,PW,i*15);
  doc.setFont("helvetica","bold"); doc.setFontSize(26); doc.setTextColor(...C.white); doc.text("Growth starts",PW/2,92,{align:"center"});
  doc.setTextColor(...C.accent); doc.text("with clarity.",PW/2,106,{align:"center"});
  doc.setDrawColor(...C.accent); doc.setLineWidth(0.5); doc.line(PW/2-28,113,PW/2+28,113);
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...C.muted);
  doc.text(doc.splitTextToSize(`${domain} should prioritise improvements that increase technical health, search visibility, authority, and AI discoverability. The goal is not just higher scores — it is turning this audit into a measurable growth plan.`,90),PW/2,122,{align:"center"});
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.accent); doc.text(brandName,PW/2,155,{align:"center"});
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(tagline,PW/2,162,{align:"center"}); doc.text(generatedDate,PW/2,168,{align:"center"});

  // ════════════════════════════════════════════════════════════════════
  //  FOOTERS ON ALL PAGES
  // ════════════════════════════════════════════════════════════════════
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){ doc.setPage(i); drawFooter(); }

  // ════════════════════════════════════════════════════════════════════
  //  SAVE
  // ════════════════════════════════════════════════════════════════════
  const safeDomain=String(domain).replace(/[^a-z0-9.-]/gi,"-");
  doc.save(`Crawler-Que-Growth-Intelligence-${safeDomain}.pdf`);
};
const totalMentions =
  (data?.aiVisibility?.totalMentions ?? 0) || 0;

const brandMentions =
  (data?.aiOptimization?.totalMentions ?? 0) || 0;

const shareOfVoice =
  totalMentions > 0
    ? Math.round((brandMentions / totalMentions) * 100)
    : 0;

const currentReportTypes =
  data?.reportTypes || selectedReportTypes || [];

const shouldShowSection = (section: string) => {
  if (
  section === "overview" ||
  section === "unified" ||
  section === "history" ||
  section === "billing" ||
  section === "account"
) {
  return true;
}

  const map: any = {
    seo: ["seo"],
    technical: ["technical"],
    serp: ["seo", "technical", "keywords"],
    traffic: ["traffic"],
    domainAnalytics: ["traffic"],
    keywords: ["keywords"],
    keywordResearch: ["keywords"],
    labs: ["keywords", "competitors"],
    competitors: ["competitors"],
    ai: ["ai"],
    backlinks: ["backlinks"],
    recommendations: ["recommendations", "seo", "technical", "traffic", "keywords", "competitors", "ai", "backlinks"],
    localSeo: ["localSeo"],
    content: ["content"],
  };

  return map[section]?.some((type: string) => currentReportTypes.includes(type));
};

const isLargeSiteWarning =
  Number(data?.traffic?.rankedKeywordCount || 0) >= 10000 &&
  data?.traffic?.confidence !== "insufficient-data";

  return (
    <div className="si-dashboard flex min-h-screen bg-[#0A0A0A] text-white [&_.bg-white]:bg-[#111111] [&_.bg-slate-50]:bg-[#181818] [&_.border-slate-200]:border-[#222222] [&_.border-slate-100]:border-[#222222] [&_.text-slate-950]:text-white [&_.text-slate-700]:text-[#CCCCCC] [&_.text-slate-600]:text-[#A0A0A0] [&_.text-slate-500]:text-[#8A8A8A] [&_.text-blue-600]:text-[#C5FF3D] [&_.bg-blue-600]:bg-[#C5FF3D] [&_.hover\:bg-blue-700:hover]:bg-[#B7EF35] [&_.text-white]:text-white">

      {/* Sidebar */}
      <div className="sticky top-0 h-screen w-72 overflow-y-auto border-r border-[#222] bg-[#0A0A0A] p-5">
  <div className="mb-6">
    <h1 className="text-xl font-extrabold tracking-tight text-white">
  Crawler Que<span className="text-[#C5FF3D]"> by Strat IQ Digital</span>
</h1>
<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">
  AI Website Growth Intelligence
</p>
  </div>

        {[
  ["overview", "Overview", BarChart3, true],
  ["unified", "Unified Overview", BarChart3, true],
  ["domainAnalytics", "Domain Analytics", BarChart3, currentUser?.role === "admin" || currentUser?.package?.allowTraffic],
  ["labs", "SEO Labs", BarChart3, currentUser?.role === "admin" || currentUser?.package?.allowKeywords],
  ["seo", "SEO", Search, true],
  ["ai", "AI", Brain, currentUser?.role === "admin" || currentUser?.package?.allowAi],
  ["traffic", "Traffic", Globe, currentUser?.role === "admin" || currentUser?.package?.allowTraffic],
  ["competitors", "Competitors", Users, currentUser?.role === "admin" || currentUser?.package?.allowTraffic],
  ["keywords", "Keywords", Search, currentUser?.role === "admin" || currentUser?.package?.allowKeywords],
  ["recommendations", "Recommendations", Brain, true],
  ["technical", "Technical Audit", Globe, true],
  ["backlinks", "Backlinks", Globe, currentUser?.role === "admin" || currentUser?.package?.allowBacklinks],
  ["keywordResearch", "Keyword Research", Search, currentUser?.role === "admin" || currentUser?.package?.allowKeywords],
  ["content", "Content Quality", Brain, true],
  ["localSeo", "Local SEO", Globe, currentUser?.role === "admin" || currentUser?.package?.allowLocalSeo],
  ["history", "History", BarChart3, true],
["billing", "Subscription", BarChart3, true],
["account", "Account Settings", Brain, true],
  ["serp", "SERP Rankings", BarChart3, currentUser?.role === "admin" || currentUser?.package?.allowKeywords],
]
  .filter((item: any) => item[3] && shouldShowSection(item[0]))
        .map(([key, label, Icon]: any) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
  activeTab === key
    ? "border-[#C5FF3D]/30 bg-[#C5FF3D]/12 text-[#D9FF7A]"
    : "text-[#8A8A8A] hover:bg-[#111] hover:text-white"
}`}
          >
            <span
  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
    activeTab === key
      ? "bg-black/10 text-black"
      : "bg-[#111] text-[#8A8A8A] group-hover:text-[#C5FF3D]"
  }`}
>
  <Icon className="h-4 w-4" />
</span>
            {label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 bg-[#0A0A0A] p-8">

{currentUser?.package && (
  <div className="mb-6 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-5">
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
          Current Plan
        </p>

        <h3 className="mt-1 text-xl font-bold text-white">
          {currentUser.package.name}
        </h3>

        <p className="mt-1 text-sm text-[#8A8A8A]">
          {currentUser.auditsUsed || 0} of{" "}
          {currentUser.package.monthlyAudits || 0} audits used this month.
          {" "}
          {currentUser.role === "admin"
            ? "Admin access enabled."
            : `${currentUser.auditsRemaining ?? 0} remaining.`}
        </p>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#222]">
          <div
            className="h-full rounded-full bg-[#C5FF3D]"
            style={{ width: `${currentUser.usagePercent || 0}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveTab("billing")}
        className="rounded-xl bg-[#C5FF3D] px-4 py-2 text-sm font-bold text-black hover:opacity-90"
      >
        View Plans
      </button>
    </div>
  </div>
)}

        {/* Top Input */}
<div className="mb-6 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-6 shadow-2xl">
  <div className="mb-4 flex items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        Website Intelligence Report
      </p>
      <h1 className="mt-1 text-2xl font-bold text-slate-950">
        {data?.domain || "Run a new audit"}
      </h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
  Other tools give you data. Crawler Que gives your client a growth plan.
  Built for agencies, consultants, and white-label reporting workflows.
</p>
    </div>

    {data && (
      <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
        <p className="text-xs text-slate-300">Overall Score</p>
        <p className="text-xl font-bold">
          {data?.overallScore ?? "N/A"}
        </p>
      </div>
    )}
  </div>

  <div className="grid gap-4 lg:grid-cols-[1fr_360px_auto_auto] lg:items-stretch">
  <input
    value={url}
    disabled={loading}
    onChange={(e) => setUrl(e.target.value)}
    placeholder="Enter website URL"
    className="h-12 w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
  />

  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Report Modules
    </p>

    <button
      type="button"
      onClick={() =>
        setSelectedReportTypes(
          reportOptions.map(([value]) => value)
        )
      }
      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
    >
      Select All
    </button>
  </div>

  <div className="flex flex-wrap gap-2">
    {reportOptions.map(([value, label]) => {
      const active = selectedReportTypes.includes(value);

      return (
        <button
          key={value}
          type="button"
          disabled={loading}
          onClick={() => {
            toggleReportType(value);
            setActiveTab("overview");
          }}
          className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all duration-200 ${
  active
    ? "border-[#C5FF3D]/40 bg-[#C5FF3D]/10 text-[#D9FF7A] shadow-[0_0_18px_rgba(197,255,61,0.08)]"
    : "border-[#2A2A2A] bg-[#151515] text-[#8A8A8A] hover:border-[#3A3A3A] hover:text-[#CCCCCC]"
}`}
        >
          {label}
        </button>
      );
    })}
  </div>
</div>

  <button
    onClick={runAudit}
    disabled={loading || !url || selectedReportTypes.length === 0}
    className="h-12 rounded-xl bg-[#C5FF3D] px-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black shadow-sm transition hover:opacity-90 disabled:opacity-40"
  >
    {loading ? "Running Audit..." : "Run Audit"}
  </button>

<button
  onClick={exportPDF}
disabled={!data}
      className="h-12 min-w-[170px] rounded-xl border border-[#C5FF3D]/35 bg-transparent px-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-[#C5FF3D] transition hover:bg-[#C5FF3D]/10 disabled:opacity-40"
    >
      Export PDF
    </button>
<button
  onClick={async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }}
  className="rounded-xl border border-[#222] bg-[#111] px-4 py-2 text-sm font-semibold text-[#CCCCCC] hover:border-[#C5FF3D]/30 hover:text-white"
>
  Logout
</button>

  </div>
</div>
{data?.onPage?.taskId &&
  data?.onPage?.crawlStatus !== "completed" && (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <p className="font-semibold text-blue-900">
        OnPage crawl is running in the background
      </p>
      <p className="mt-1 text-sm text-blue-700">
        You can export the PDF now. Technical crawl data will appear if it becomes available before export.
      </p>
    </div>
)}
{error && (
  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
    <p className="font-semibold text-red-700">Audit failed</p>
    <p className="mt-1 text-sm text-red-600">{error}</p>
  </div>
)}
        {loading && (
  <div className="mb-6 rounded-2xl border border-[#C5FF3D]/25 bg-[#111] p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-950">
          Running Enterprise Audit
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {auditCurrentModule || "Collecting live SEO, AI visibility, SERP, backlink, keyword, and technical data."} Time elapsed: {auditSeconds}s
        </p>
      </div>

      <div className="flex items-center gap-4 self-start">
  <button
    type="button"
    onClick={cancelAudit}
    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
  >
    Cancel
  </button>

  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
</div>
    </div>

    <div className="mb-5 h-3 overflow-hidden rounded-full bg-[#222]">
  <div
    className="h-full rounded-full bg-[#C5FF3D] transition-all duration-500"
    style={{ width: `${Math.min(Math.max(auditProgress, 0), 100)}%` }}
  />
</div>

<p className="mb-4 text-sm font-semibold text-[#C5FF3D]">
  {auditProgress}% complete
</p>

<div className="space-y-3">
{Object.entries(auditModuleStatus || {}).length > 0
  ? Object.entries(auditModuleStatus).map(([step, status]: any, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
        >
          <p className="text-sm font-medium text-[#EDEDED]">
            {step}
          </p>

          <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs font-semibold text-[#8A8A8A]">
            {String(status)}
          </span>
        </div>
      ))
  : [
      ["Initializing audit", auditProgress >= 5],
      ["Fetching website HTML", auditProgress >= 15],
      ["Running PageSpeed checks", auditProgress >= 25],
      ["Running SEO intelligence modules", auditProgress >= 35],
      ["Running AI visibility analysis", auditProgress >= 60],
      ["Generating AI recommendations", auditProgress >= 80],
      ["Building final report", auditProgress >= 90],
    ].map(([step, done]: any, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl bg-[#151515] px-4 py-3"
        >
          <p className="text-sm font-medium text-[#EDEDED]">
            {step}
          </p>

          <div
            className={`h-2.5 w-2.5 rounded-full ${
              done ? "bg-[#C5FF3D]" : "animate-pulse bg-[#8A8A8A]"
            }`}
          />
        </div>
      ))}
    </div>
  </div>
)}

        {!data && !loading && activeTab !== "billing" && activeTab !== "account" && (
  <p className="text-slate-500">Run an audit to see data</p>
)}
{/* BILLING */}
{activeTab === "billing" && (
  <Section title="Subscription">
    <div className="grid gap-5 max-w-xl">
      <div className="rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
          Current Plan
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">
          {currentUser?.package?.name || "—"}
        </h3>
        <p className="mt-1 text-sm text-[#8A8A8A]">
          {currentUser?.auditsUsed || 0} of {currentUser?.package?.monthlyAudits || 0} audits used this month.
          {currentUser?.role !== "admin" && ` ${currentUser?.auditsRemaining ?? 0} remaining.`}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#222]">
          <div
            className="h-full rounded-full bg-[#C5FF3D] transition-all"
            style={{ width: `${currentUser?.usagePercent || 0}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#222] bg-[#111] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
          Billing & Subscription Management
        </p>
        <p className="mt-2 text-sm text-[#ccc]">
          Manage your payment method, view invoices, upgrade your plan, or cancel your subscription through the Stripe billing portal.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch("/api/stripe/portal", { method: "POST" });
              const json = await res.json();
              if (json.url) window.location.href = json.url;
              else alert(json.error || "Could not open billing portal.");
            } catch {
              alert("Something went wrong. Please try again.");
            }
          }}
          className="mt-5 rounded-xl bg-[#C5FF3D] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          Manage Subscription &#8594;
        </button>
      </div>

      <div className="rounded-2xl border border-[#222] bg-[#111] p-5 text-sm text-[#8A8A8A]">
        Need to change plans?{" "}
        <a href="/#pricing" className="text-[#C5FF3D] underline">
          View all plans on the homepage
        </a>{" "}
        and choose a new plan. Your subscription will be updated immediately through the billing portal.
      </div>
    </div>
  </Section>
)}

{activeTab === "account" && (
  <AccountSettingsTab currentUser={currentUser} />
)}

        {data && (
  <>
    <div className="mb-6 rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
            Audit Status
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Audit Completed Successfully
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            All connected DataForSEO modules processed successfully.
          </p>
        </div>

        <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
          Live Data
        </div>
      </div>
    </div>
{/* HISTORY */}
{activeTab === "history" && (
  <Section title="Audit History & Comparison">
  <div className="mb-5 flex items-center justify-between gap-4">
    <p className="text-sm text-slate-500">
      Previous audits saved in your database account. Click any audit to reload its full report.
    </p>

  </div>
{compareA && compareB && (
  <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold text-slate-950">
          Audit Comparison
        </h3>

        <p className="text-sm text-slate-500">
          Side-by-side comparison between selected audits.
        </p>
      </div>
<button
  type="button"
  onClick={exportComparisonPDF}
  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
>
  Export Compare PDF
</button>
      <button
        type="button"
        onClick={() => {
          setCompareA(null);
          setCompareB(null);
        }}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
      >
        Clear Compare
      </button>
    </div>
<div className="mb-5 grid gap-3 md:grid-cols-4">
  {[
    [
      "Overall Change",
      (compareB?.overallScore ?? 0) - (compareA?.overallScore ?? 0),
    ],
    [
      "SEO Change",
      (compareB?.seoScore ?? 0) - (compareA?.seoScore ?? 0),
    ],
    [
      "AI Change",
      (compareB?.aiScore ?? 0) - (compareA?.aiScore ?? 0),
    ],
    [
      "Traffic Change",
      (compareB?.traffic ?? 0) - (compareA?.traffic ?? 0),
    ],
  ].map(([label, value]: any) => (
    <div key={label} className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 font-bold ${
          value > 0
            ? "text-green-600"
            : value < 0
            ? "text-red-600"
            : "text-slate-600"
        }`}
      >
        {value > 0 ? "+" : ""}
        {value}
      </p>
    </div>
  ))}
</div>
    <div className="grid gap-4 md:grid-cols-2">
      {[compareA, compareB].map((item: any, idx: number) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {idx === 0 ? "Audit A" : "Audit B"}
          </p>

          <h3 className="mt-2 text-lg font-bold text-slate-950">
            {item.domain}
          </h3>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-slate-500">Overall</p>
              <p className="font-bold">{item.overallScore ?? "N/A"}</p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-slate-500">SEO</p>
              <p className="font-bold">{item.seoScore ?? "N/A"}</p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-slate-500">AI Visibility</p>
              <p className="font-bold">{item.aiScore ?? "N/A"}</p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p
  className="text-xs text-slate-500"
  title="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
>
  Estimated Monthly Organic Visits
</p>
              <p className="font-bold">
                {item.traffic?.toLocaleString?.() ||
                  item.traffic ||
                  "N/A"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
    {history.length > 0 ? (
      <div className="grid gap-4">
        {history.map((item, i) => {
          const previous = history[i + 1];
          const scoreChange =
            previous?.overallScore != null && item?.overallScore != null
              ? item.overallScore - previous.overallScore
              : null;

          return (
            <div
  key={i}
  onClick={() => {
  if (item.id) loadSavedReport(item.id);
}}
  role="button"
  tabIndex={0}
  className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:bg-slate-50"
>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-950">{item.domain}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.createdAt}</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-slate-950">
                    {item.overallScore ?? "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">Overall Score</p>
                </div>
              </div>
<div className="mt-4 flex gap-3">
  <a
  href={`/report/${item.id}`}
  onClick={(e) => e.stopPropagation()}
  className="rounded-lg border border-[#C5FF3D]/30 bg-[#C5FF3D]/10 px-3 py-2 text-xs font-semibold text-[#C5FF3D]"
>
  Open Report
</a>

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setCompareA(item);
  }}
  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600"
>
  Compare A
</button>

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    setCompareB(item);
  }}
  className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600"
>
  Compare B
</button>
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    if (item.id) deleteReport(item.id);
  }}
  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
>
  Delete
</button>
</div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">SEO</p>
                  <p className="font-semibold">{item.seoScore ?? "N/A"}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">AI</p>
                  <p className="font-semibold">{item.aiScore ?? "N/A"}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p
  className="text-xs text-slate-500"
  title="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
>
  Estimated Monthly Organic Visits
</p>
                  <p className="font-semibold">
                    {item.traffic?.toLocaleString?.() || item.traffic || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Change</p>
                  <p
                    className={`font-semibold ${
                      scoreChange == null
                        ? "text-slate-500"
                        : scoreChange >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {scoreChange == null
                      ? "N/A"
                      : `${scoreChange >= 0 ? "+" : ""}${scoreChange}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-sm text-slate-500">No audit history yet.</p>
    )}
  </Section>
)}
{/* UNIFIED OVERVIEW */}
{activeTab === "unified" && (
  <Section title="Unified Overview">
    <p className="mb-5 text-sm text-slate-500">
      Combined executive summary across SEO, AI visibility, SERP, keyword data, backlinks, OnPage, content, and local/business signals.
    </p>

    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <MetricCard
        label="Overall Status"
        value={data?.unifiedOverview?.overallStatus || "Data not available"}
      />
      <MetricCard
        label="Primary Opportunity"
        value={data?.unifiedOverview?.primaryOpportunity || "Data not available"}
      />
      <MetricCard
        label="Sources Active"
        value={data?.unifiedOverview?.sourceCoverage?.length ?? "Data not available"}
      />
      <MetricCard
        label="Domain"
        value={data?.unifiedOverview?.domain || data?.domain || "Data not available"}
      />
      <MetricCard
  label="Detected Niche"
  value={data?.dataforseo?.detectedNiche || "Data not available"}
/>
    </div>

    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <MetricCard
  label="SEO Score"
  value={data?.unifiedOverview?.keyMetrics?.seoScore ?? "Data not available"}
  score={Number(data?.unifiedOverview?.keyMetrics?.seoScore || 0)}
/>

<MetricCard
  label="AI Visibility"
  value={data?.unifiedOverview?.keyMetrics?.aiVisibility ?? "Data not available"}
  score={Number(data?.unifiedOverview?.keyMetrics?.aiVisibility || 0)}
/>
      <MetricCard
  label="Estimated Monthly Organic Visits"
value={
  data?.traffic?.rawMonthly
    ? data.traffic.rawMonthly.toLocaleString()
    : data?.traffic?.monthly
    ? data.traffic.monthly.toLocaleString()
    : data?.traffic?.confidence === "insufficient-data"
    ? "Insufficient data"
    : "Data not available"
}
  tooltip="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
/>
      <MetricCard label="Organic Keywords" value={data?.unifiedOverview?.keyMetrics?.organicKeywords ?? "Data not available"} />
      <MetricCard label="Competitors Found" value={data?.unifiedOverview?.keyMetrics?.competitorsFound ?? "Data not available"} />
      <MetricCard label="Backlinks" value={data?.unifiedOverview?.keyMetrics?.backlinks ?? "Data not available"} />
      <MetricCard label="SERP Keywords Checked" value={data?.unifiedOverview?.keyMetrics?.serpKeywordsChecked ?? "Data not available"} />
      <MetricCard label="SERP Found Count" value={data?.unifiedOverview?.keyMetrics?.serpFoundCount ?? "Data not available"} />
      <MetricCard label="Pages Crawled" value={data?.unifiedOverview?.keyMetrics?.pagesCrawled ?? "Data not available"} />
    </div>

    <div className="rounded-xl border bg-white p-5 mb-6">
      <h3 className="font-semibold mb-3">Source Coverage</h3>
      <div className="rounded-xl border bg-white p-5 mb-6">
  <h3 className="font-semibold mb-3">API Module Status</h3>

  <div className="grid gap-3 md:grid-cols-2">
    {Object.entries(data?.moduleStatus || {}).map(([module, status]: any) => (
      <div
        key={module}
        className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
      >
        <p className="font-medium capitalize">
          {module.replace(/([A-Z])/g, " $1")}
        </p>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "available"
              ? "bg-green-50 text-green-600"
              : status === "pending_or_not_available"
              ? "bg-yellow-50 text-yellow-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>
    ))}
  </div>
</div>

      {data?.unifiedOverview?.sourceCoverage?.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.unifiedOverview.sourceCoverage.map((source: string, i: number) => (
            <span
              key={i}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600"
            >
              {source}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from connected sources.
        </p>
      )}
    </div>

    <div className="rounded-xl border bg-white p-5">
      <h3 className="font-semibold mb-3">Module Availability</h3>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(data?.unifiedOverview?.availableModules || {}).map(
          ([module, available]: any) => (
            <div key={module} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <p className="font-medium capitalize">{module}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  available
                    ? "bg-green-50 text-green-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {available ? "Available" : "Not available"}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  </Section>
)}
<div className="mb-6 grid gap-4 md:grid-cols-4">
  {[
    ["DataForSEO", data?.moduleStatus?.dataforseo],
    ["AI Optimization", data?.moduleStatus?.aiOptimization],
    ["SERP API", data?.moduleStatus?.serp],
    ["OnPage API", data?.moduleStatus?.onPage],
    ["Backlinks API", data?.backlinks ? "available" : "not_available"],
    ["Keyword Research", data?.moduleStatus?.keywordResearch],
    ["Content Analysis", data?.moduleStatus?.contentAnalysis],
    ["Business Data", data?.moduleStatus?.businessData],
  ]
.filter(([name]: any) => {
  const keyMap: any = {
    "DataForSEO": "traffic",
    "AI Optimization": "ai",
    "SERP API": "serp",
    "OnPage API": "technical",
    "Backlinks API": "backlinks",
    "Keyword Research": "keywordResearch",
    "Content Analysis": "content",
    "Business Data": "localSeo",
  };

  return shouldShowSection(keyMap[name]);
})
.map(([name, status]: any, i) => {
    const ok = status === "available";

    return (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {name}
          </p>

          <div
            className={`h-3 w-3 rounded-full ${
              ok ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {status === "available"
            ? "Connected Successfully"
            : status === "pending_or_not_available"
            ? "Pending or not available"
            : "Data not available"}
        </p>
      </div>
    );
  })}
</div>
{/* DATA QUALITY NOTICE */}
{data?.moduleStatus && (
  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p className="font-semibold text-amber-900">Data Quality Notice</p>
    <p className="mt-1 text-sm text-amber-800">
      This report only shows data returned by connected APIs. If a module is marked unavailable, no fake or estimated replacement data is used.
    </p>
  </div>
)}
{/* OVERVIEW */}
{activeTab === "overview" && (
  <>
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Website Health
        </p>
        <h2 className="mt-3 text-3xl font-bold">
          {data.overallScore == null
            ? "Data not available"
            : data.overallScore >= 80
            ? "Strong"
            : data.overallScore >= 60
            ? "Moderate"
            : "Needs Attention"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Based on SEO, AI visibility, traffic, keyword gaps, backlinks, and technical signals.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Biggest Issue
        </p>
        <p className="mt-3 text-xl font-bold text-slate-950">
          {typeof data?.summary?.biggestIssue === "object"
  ? data?.summary?.biggestIssue?.title ||
    data?.summary?.biggestIssue?.label ||
    "Issue data available"
  : data?.summary?.biggestIssue ||
    data?.issues?.[0]?.title ||
    "Data not available"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Biggest Opportunity
        </p>
        <p className="mt-3 text-xl font-bold text-slate-950">
          {typeof data?.summary?.biggestOpportunity === "object"
  ? data?.summary?.biggestOpportunity?.title ||
    data?.summary?.biggestOpportunity?.label ||
    "Opportunity data available"
  : data?.summary?.biggestOpportunity || "Data not available"}
        </p>
      </div>
    </div>

    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
      <MetricCard label="Overall" value={data.overallScore ?? "Data not available"} score={Number(data.overallScore || 0)} />
<MetricCard label="Share of Voice" value={`${shareOfVoice}%`} score={shareOfVoice} />
<MetricCard label="SEO" value={data.seoScore ?? "Data not available"} score={Number(data.seoScore || 0)} />
<MetricCard label="UX" value={data.uxScore ?? "Data not available"} score={Number(data.uxScore || 0)} />
<MetricCard label="AI" value={data.aiVisibility?.score ?? "Data not available"} score={Number(data.aiVisibility?.score || 0)} />
    </div>

        <Section title="Priority Issues">
      {data?.issues?.length > 0 ? (
        data.issues.map((issue: any, i: number) => (
          <IssueCard key={i} issue={issue} />
        ))
      ) : (
        <p className="text-sm text-slate-500">No priority issues found.</p>
      )}
    </Section>

    <Section title="Why This Audit Matters">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InsightCard
          title="Client-Ready Reporting"
          description="Generate executive-ready audit reports in minutes instead of manually compiling SEO screenshots and spreadsheets."
        />

        <InsightCard
          title="AI Visibility Tracking"
          description="Monitor whether your brand appears inside AI-generated search and recommendation systems."
        />

        <InsightCard
          title="White-Label Delivery"
          description="Deliver branded reports using your agency name and positioning."
        />

        <InsightCard
          title="Modular Audit Architecture"
          description="Run only the modules required for each audit to reduce cost and improve scalability."
        />

        <InsightCard
          title="Built For Business Owners"
          description="Clear explanations, prioritized actions, and business-friendly reporting instead of technical SEO jargon."
        />
      </div>
    </Section>
  </>
)}
{/* CONTENT QUALITY */}
{activeTab === "content" && (
  <Section title="Content Quality & Relevance">
    <p className="mb-5 text-sm text-slate-500">
      Powered by on-page crawl signals, DataForSEO keyword data, and Content Analysis API.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Title Found"
        value={data?.title ? "Yes" : "Data not available"}
      />
      <MetricCard
        label="Meta Description"
        value={data?.description ? "Yes" : "Data not available"}
      />
      <MetricCard
        label="Content Results"
        value={data?.contentAnalysis?.results?.length ?? "Data not available"}
      />
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-950">Page Title</h3>
        <p className="text-sm leading-6 text-slate-600">
          {data?.title || "Data not available"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-950">Meta Description</h3>
        <p className="text-sm leading-6 text-slate-600">
          {data?.description || "Data not available"}
        </p>
      </div>
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Content Opportunities
      </h3>

      {data?.dataforseo?.keywordGap?.opportunities?.length > 0 ? (
        <div className="grid gap-3">
          {data.dataforseo.keywordGap.opportunities.slice(0, 8).map((k: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                {i + 1}. {k.keyword}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Volume: {k.volume || "Data not available"} | Competitors:{" "}
                {k.competitors?.join(", ") || "--"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from keyword gap analysis.
        </p>
      )}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Content Analysis Results
      </h3>

      {data?.contentAnalysis?.results?.length > 0 ? (
        <div className="grid gap-3">
          {data.contentAnalysis.results.slice(0, 10).map((item: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                {i + 1}. {item.domain || "Unknown domain"}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                URL: {item.url || "Data not available"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Topic: {item.mainTopic || "Data not available"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Content Length: {item.contentLength || "Data not available"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO Content Analysis API.
        </p>
      )}
    </div>
  </Section>
)}
{/* LOCAL SEO */}
{activeTab === "localSeo" && (
  <Section title="Local SEO & Business Listings">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO Business Data API. Shows Google Business listing visibility, ratings, reviews, and local presence.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Listings Found"
        value={data?.businessData?.listings?.length ?? "Data not available"}
      />
      <MetricCard
        label="Search Query"
        value={data?.businessData?.keyword || "Data not available"}
      />
      <MetricCard
        label="Location"
        value={data?.businessData?.location || "Data not available"}
      />
    </div>

    <div className="grid gap-4">
      {data?.businessData?.listings?.length > 0 ? (
        data.businessData.listings.slice(0, 10).map((item: any, i: number) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600">
                  Listing {i + 1}
                </p>
                <h3 className="mt-1 font-bold text-slate-950">
                  {item.title || "Business listing"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.category || "Category not available"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                <p className="font-bold text-slate-950">
                  {item.rating || "N/A"}
                </p>
                <p className="text-xs text-slate-500">
                  {item.reviews || 0} reviews
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Address: {item.address || "Data not available"}</p>
              <p>Phone: {item.phone || "Data not available"}</p>
              <p className="break-all">
                Website: {item.website || "Data not available"}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO Business Data API.
        </p>
      )}
    </div>
  </Section>
)}
{/* SEO LABS */}
{activeTab === "labs" && (
  <Section title="DataForSEO Labs Intelligence">
    <p className="mb-5 text-sm text-slate-500">
      Shows ranked keywords, keyword gaps, organic competitors, and visibility signals from DataForSEO Labs.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard label="Organic Keywords" value={data?.dataforseo?.organicKeywords ?? "Data not available"} />
      <MetricCard label="Top Keywords" value={data?.dataforseo?.topKeywords?.length ?? "Data not available"} />
      <MetricCard label="Competitors" value={data?.dataforseo?.competitors?.length ?? "Data not available"} />
      <MetricCard label="Missing Keywords" value={data?.dataforseo?.keywordGap?.missingKeywords?.length ?? "Data not available"} />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">Ranked Keywords</h3>

        {data?.dataforseo?.topKeywords?.length > 0 ? (
          <div className="grid gap-3">
            {data.dataforseo.topKeywords.slice(0, 10).map((k: any, i: number) => (
              <div key={i} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{i + 1}. {k.keyword}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Volume: {k.volume || "N/A"} | Position: {k.position || "N/A"} | CPC: {k.cpc || "N/A"} | Intent: {k.intent || "N/A"} | KD: {k.difficulty || "N/A"} | Opportunity: {k.opportunity || "N/A"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Data not available from DataForSEO Labs.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">Keyword Gaps</h3>

        {data?.dataforseo?.keywordGap?.missingKeywords?.length > 0 ? (
          <div className="grid gap-3">
            {data.dataforseo.keywordGap.missingKeywords.slice(0, 10).map((k: any, i: number) => (
  <div key={i} className="rounded-xl bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-slate-950">
          {i + 1}. {k.keyword}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Intent: {k.intent || "general"} | Page Type:{" "}
          {k.recommendedPageType || "Supporting Content"}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Volume: {k.volume || "N/A"} | Competitors:{" "}
          {k.competitors?.join(", ") || "N/A"}
        </p>

        <p className="mt-2 text-xs font-medium text-blue-700">
          Action: {k.action || "Add to content roadmap"}
        </p>
      </div>

      <div className="text-right">
        <p className="font-bold text-slate-950">
          {k.opportunityScore || "N/A"}/100
        </p>
        <p className="text-xs text-slate-500">Opportunity</p>
        <p className="mt-1 text-xs font-semibold text-blue-600">
          {k.priority || "Low"}
        </p>
      </div>
    </div>
  </div>
))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No relevant keyword gaps found.</p>
        )}
      </div>
    </div>
  </Section>
)}
{/* DOMAIN ANALYTICS */}
{activeTab === "domainAnalytics" && (
  <Section title="Domain Analytics">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO Domain Analytics. Shows organic and paid visibility signals for the domain.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Organic Keywords"
        value={data?.domainAnalytics?.organicKeywords ?? "Data not available"}
      />
      <MetricCard
  label="Estimated Organic Traffic"
  value={data?.domainAnalytics?.organicTraffic ?? "Data not available"}
  score={
    Number(data?.domainAnalytics?.organicTraffic || 0) > 10000
      ? 85
      : Number(data?.domainAnalytics?.organicTraffic || 0) > 1000
      ? 65
      : Number(data?.domainAnalytics?.organicTraffic || 0) > 100
      ? 40
      : 15
  }
  tooltip="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
/>
      <MetricCard
        label="Organic Cost"
        value={data?.domainAnalytics?.organicCost ?? "Data not available"}
      />
      <MetricCard
        label="Paid Keywords"
        value={data?.domainAnalytics?.paidKeywords ?? "Data not available"}
      />
      <MetricCard
        label="Paid Traffic"
        value={data?.domainAnalytics?.paidTraffic ?? "Data not available"}
      />
      <MetricCard
        label="Paid Cost"
        value={data?.domainAnalytics?.paidCost ?? "Data not available"}
      />
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Estimated Organic vs Paid Traffic
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  type: "Organic",
                  traffic: Number(data?.domainAnalytics?.organicTraffic || 0),
                },
                {
                  type: "Paid",
                  traffic: Number(data?.domainAnalytics?.paidTraffic || 0),
                },
              ]}
            >
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="traffic" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Organic vs Paid Keywords
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  type: "Organic",
                  keywords: Number(data?.domainAnalytics?.organicKeywords || 0),
                },
                {
                  type: "Paid",
                  keywords: Number(data?.domainAnalytics?.paidKeywords || 0),
                },
              ]}
            >
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="keywords" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-950">Domain Insight</h3>
      <p className="text-sm leading-6 text-slate-600">
        {data?.domainAnalytics
          ? "This section shows the domain’s organic and paid visibility signals from DataForSEO. Use this to compare whether the website is relying more on organic discovery or paid acquisition."
          : "Data not available from DataForSEO Domain Analytics."}
      </p>
    </div>
  </Section>
)}
{/* SEO */}
{activeTab === "seo" && (
  <Section title="SEO & Technical Performance">
    <p className="mb-5 text-sm text-slate-500">
      On-page SEO checks, PageSpeed metrics, technical issues, and crawl signals.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard label="SEO Score" value={data?.seoScore ?? "Data not available"} score={Number(data?.seoScore || 0)} />
<MetricCard label="Mobile Speed" value={data?.mobilePerformance ?? "Data not available"} score={Number(data?.mobilePerformance || 0)} />
<MetricCard label="Desktop Speed" value={data?.desktopPerformance ?? "Data not available"} score={Number(data?.desktopPerformance || 0)} />
<MetricCard label="UX Score" value={data?.uxScore ?? "Data not available"} score={Number(data?.uxScore || 0)} />
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Core Web Vitals
        </h3>

        <div className="grid gap-3 text-sm">
          {[
            ["LCP", data?.pageSpeed?.mobile?.lcp],
            ["FCP", data?.pageSpeed?.mobile?.fcp],
            ["CLS", data?.pageSpeed?.mobile?.cls],
            ["TBT", data?.pageSpeed?.mobile?.tbt],
            ["Speed Index", data?.pageSpeed?.mobile?.speedIndex],
          ].map(([label, value]: any) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
            >
              <span className="font-medium text-slate-700">{label}</span>
              <span className="font-semibold text-slate-950">
                {value || "Data not available"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Technical Issues
        </h3>

        {data?.issues?.length > 0 ? (
          <div className="space-y-3">
            {data.issues.slice(0, 5).map((issue: any, i: number) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No critical SEO issues found.
          </p>
        )}
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        SEO Recommendations
      </h3>

      {data?.recommendations?.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          {data.recommendations.slice(0, 8).map((rec: string, i: number) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from recommendation source.
        </p>
      )}
    </div>
  </Section>
)}

{/* AI */}
{activeTab === "ai" && (
  data?.aiOptimization || data?.aiVisibility ? (
  <Section title="AI Search Visibility™">
    <p className="mb-5 text-sm text-slate-500">
      Powered only by DataForSEO AI Optimization API. Shows whether the brand is surfaced in AI-generated recommendations.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
  label={data?.aiVisibility?.label || data?.aiOptimization?.scoreLabel || "AI Visibility Signal"}
  value={
    data?.aiVisibility?.score != null
      ? `${data.aiVisibility.score}%`
      : data?.aiOptimization?.visibilityScore != null
      ? `${data.aiOptimization.visibilityScore}%`
      : "Data not available"
  }
  score={Number(
    data?.aiVisibility?.score ??
      data?.aiOptimization?.visibilityScore ??
      0
  )}
  tooltip={
    data?.aiVisibility?.confidence === "low" || data?.aiOptimization?.confidence === "low"
      ? "Directional signal based on limited usable AI model responses."
      : "AI visibility based on tested model responses."
  }
/>
      <MetricCard
        label="Brand Mentions"
        value={data?.aiOptimization?.totalMentions ?? "Data not available"}
      />
      <MetricCard
        label="Models Checked"
        value={data?.aiOptimization?.totalModels ?? "Data not available"}
      />
      <MetricCard
  label="Share of Voice"
  value={`${shareOfVoice}%`}
  score={shareOfVoice}
/>
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Brand vs Competitor Mentions
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={competitorChartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="mentions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-950">
          Model Mention Coverage
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="mentioned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Prompt Tested
      </p>
      <p className="mt-2 text-sm text-slate-700">
        {data?.aiOptimization?.prompt || "Data not available"}
      </p>
    </div>

    <div className="mb-6 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-5">
      <h3 className="font-semibold text-slate-950">AI Opportunity Insight</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {data?.aiOptimization
          ? data.aiOptimization.totalMentions === 0
            ? "The brand is not currently being mentioned in AI recommendations for the tested prompt. This indicates an opportunity to build stronger entity signals, trusted mentions, and topical authority."
            : (data?.aiVisibility?.confidence === "low" || data?.aiOptimization?.confidence === "low")
  ? "The brand appeared in the limited AI model sample. Treat this as a directional signal, not complete market-wide AI visibility. Improve confidence by expanding prompts, models, entity signals, expert content, reviews, and trusted third-party mentions."
  : "The brand is being surfaced in at least one AI result. There is still room to improve coverage across more models and prompts."
          : "Data not available from AI Optimization API."}
      </p>
    </div>

    <div className="grid gap-4">
      {data?.aiOptimization?.models?.length > 0 ? (
        data.aiOptimization.models.map((item: any, i: number) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-semibold text-slate-950">{item.model}</p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.mentioned
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {item.mentioned ? "Mentioned" : "Not Mentioned"}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-600 break-words">
              {item.responseSnippet && item.responseSnippet !== "{}"
  ? item.responseSnippet
      .replace(/\\n/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 700)
  : item.error && item.error !== "{}"
  ? item.error
  : "Data not available from DataForSEO AI Optimization API."}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from AI Optimization API.
        </p>
      )}
    </div>
    </Section>
  ) : (
    <LockedCard
      title="AI Visibility Intelligence"
      description="Unlock AI search visibility, brand mentions, model coverage, and AI recommendation signals."
    />
  )
)}
{/* KEYWORDS */}
{activeTab === "keywords" && (
  data?.dataforseo?.keywordGap ? (
  <Section title="Keyword Opportunities & Gap Analysis">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO Labs competitor keyword overlap. Shows keywords competitors rank for where this domain has weak or no visibility.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Own Keywords"
        value={data?.dataforseo?.keywordGap?.ownKeywords ?? "Data not available"}
      />
      <MetricCard
        label="Competitors Checked"
        value={data?.dataforseo?.keywordGap?.competitorCount ?? "Data not available"}
      />
      <MetricCard
        label="Missing Keywords"
        value={data?.dataforseo?.keywordGap?.missingKeywords?.length ?? "Data not available"}
      />
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
<div className="mb-4 flex items-center justify-between gap-4">
  <h3 className="font-semibold text-slate-950">
    Missing Keyword Opportunities
  </h3>

  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      data?.dataforseo?.keywordGap?.quality === "available"
        ? "bg-green-100 text-green-700"
        : "bg-yellow-100 text-yellow-700"
    }`}
  >
    {data?.dataforseo?.keywordGap?.quality === "available"
      ? "Verified Gap Data"
      : "Limited Competitor Data"}
  </span>
</div>

      {data?.dataforseo?.keywordGap?.missingKeywords?.length > 0 ? (
        <div className="grid gap-3">
          {data.dataforseo.keywordGap.missingKeywords.slice(0, 20).map((k: any, i: number) => {
  const volume = Number(k.volume || k.search_volume || 0);
  const opportunityScore = Number(k.opportunityScore || 0);

  return (
    <div
      key={i}
      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-950">
            {i + 1}. {k.keyword || "Unknown keyword"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Intent: {k.intent || "general"} | Page Type:{" "}
            {k.recommendedPageType || "Supporting Content"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Volume: {volume ? volume.toLocaleString() : "Data not available"} | Difficulty:{" "}
            {k.keyword_difficulty || k.difficulty || "N/A"} | Competitors:{" "}
            {k.competitors?.join(", ") || "Data not available"}
          </p>

          <p className="mt-2 text-xs font-medium text-blue-700">
            Action: {k.action || "Add to content roadmap"}
          </p>
        </div>

        <div className="text-right">
          <p className="font-bold text-slate-950">
            {opportunityScore || "N/A"}/100
          </p>
          <p className="text-xs text-slate-500">Opportunity</p>
          <p className="mt-1 text-xs font-semibold text-blue-600">
            {k.priority || "Low"}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Opportunity Score</span>
          <span>{opportunityScore || "N/A"}</span>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-green-600"
            style={{
              width: `${opportunityScore ? Math.min(100, Math.max(5, opportunityScore)) : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
})}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO keyword gap analysis.
        </p>
      )}

      {data?.dataforseo?.keywordGap?.contentIdeas?.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-bold text-slate-950">
            AI Content Opportunities
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {data.dataforseo.keywordGap.contentIdeas.map((idea: any, i: number) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {idea.cluster}
                </p>

                <h4 className="mt-2 text-base font-bold text-slate-950">
                  {idea.headline}
                </h4>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {idea.keywords?.slice(0, 5).map((k: any, idx: number) => (
                    <span
                      key={idx}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {k.keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </Section>
  ) : (
    <LockedCard
      title="Keyword Gap Intelligence"
      description="Unlock missing keywords, competitor gaps, keyword opportunities, and content ideas."
    />
  )
)}

{/* RECOMMENDATIONS */}{activeTab === "recommendations" && (
  <Section title="AI Recommendations Engine">
    <p className="mb-5 text-sm text-slate-500">
      Recommendations generated from real audit data: SEO issues, DataForSEO keywords, SERP rankings, backlinks, content analysis, and AI visibility.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Recommendations"
        value={data?.recommendations?.length ?? "Data not available"}
      />
      <MetricCard
        label="Source"
        value={data?.aiRecommendations?.source || "AI Recommendation Engine"}
      />
      <MetricCard
        label="Primary Opportunity"
        value={data?.unifiedOverview?.primaryOpportunity || "Data not available"}
      />
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      {data?.recommendations?.length > 0 ? (
        data.recommendations.slice(0, 10).map((rec: string, i: number) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Priority {i + 1}
              </p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  i < 3
                    ? "bg-red-50 text-red-600"
                    : i < 6
                    ? "bg-amber-50 text-amber-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {i < 3 ? "High Impact" : i < 6 ? "Medium Impact" : "Quick Win"}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-950">
              {String(rec).split(".")[0] || `Recommendation ${i + 1}`}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {rec}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Timeline
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {i < 3 ? "7–30 days" : i < 6 ? "30–60 days" : "60–90 days"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Owner
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {String(rec).toLowerCase().includes("technical") ||
                  String(rec).toLowerCase().includes("speed")
                    ? "Developer"
                    : String(rec).toLowerCase().includes("content") ||
                      String(rec).toLowerCase().includes("keyword")
                    ? "SEO / Content"
                    : "Growth Team"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Difficulty
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {i < 3 ? "Medium" : "Low–Medium"}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            Data not available from AI Recommendations Engine.
          </p>
        </div>
      )}
    </div>
  </Section>
)}
{/* KEYWORD RESEARCH */}
{activeTab === "keywordResearch" && (
  <Section title="Keyword Research">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO Keyword Suggestions API. Shows real keyword ideas from the selected seed keyword.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Seed Keyword"
        value={data?.keywordResearch?.seedKeyword || "Data not available"}
      />
      <MetricCard
        label="Suggestions Found"
        value={data?.keywordResearch?.suggestions?.length ?? "Data not available"}
      />
      <MetricCard
        label="Source"
        value={data?.keywordResearch?.source || "Data not available"}
      />
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Keyword Suggestions
      </h3>

      {data?.keywordResearch?.suggestions?.length > 0 ? (
        <div className="grid gap-3">
          {data.keywordResearch.suggestions.slice(0, 20).map((k: any, i: number) => {
            const volume = Number(k.volume || 0);
            const competition = Number(k.competition || 0);
            const opportunityScore =
              volume > 0
                ? Math.max(1, Math.round(volume / Math.max(1, competition * 100)))
                : 0;

            return (
              <div
                key={i}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {i + 1}. {k.keyword || "Unknown keyword"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      CPC: {k.cpc || "Data not available"} | Competition:{" "}
{k.competition || "Data not available"} | Intent:{" "}
{k.intent || "N/A"} | KD: {k.difficulty || "N/A"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-950">
                      {k.volume || "Data not available"}
                    </p>
                    <p className="text-xs text-slate-500">Volume</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Opportunity Score</span>
                    <span>{opportunityScore || "N/A"}</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(100, opportunityScore)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO Keyword Suggestions API.
        </p>
      )}
    </div>
  </Section>
)}
{/* BACKLINKS */}
{activeTab === "backlinks" && (
  data?.backlinks ? (
  <Section title="Backlink Authority">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO Backlinks API. Shows authority signals, referring domains, and top backlink sources.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard label="Backlink Rank" value={data?.dataforseo?.backlinkRank ?? "Data not available"} />
      <MetricCard label="Backlinks" value={data?.backlinks?.backlinks ?? "Data not available"} />
      <MetricCard label="Referring Domains" value={data?.backlinks?.referringDomains ?? "Data not available"} />
      <MetricCard label="Referring Pages" value={data?.backlinks?.referringPages ?? "Data not available"} />
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">Authority Insight</h3>
      <p className="text-sm leading-6 text-slate-600">
        {data?.backlinks?.referringDomains
          ? `This domain has ${data.backlinks.referringDomains} referring domains and ${data.backlinks.backlinks} backlinks. Growth should focus on quality industry mentions and relevant authority links.`
          : "Data not available from DataForSEO Backlinks API."}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">Top Backlinks</h3>

      {data?.backlinks?.topBacklinks?.length > 0 ? (
        <div className="grid gap-3">
          {data.backlinks.topBacklinks.slice(0, 12).map((b: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {i + 1}. {b.domainFrom || "Unknown domain"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Anchor: {b.anchor || "Data not available"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-950">
                    {b.rank ?? "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">Rank</p>
                </div>
              </div>

              <p className="mt-3 break-all text-xs text-slate-500">
                Source: {b.sourceUrl || "Data not available"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO Backlinks API.
        </p>
      )}
    </div>
    </Section>
  ) : (
    <LockedCard
      title="Backlink Intelligence"
      description="Unlock backlink authority, referring domains, top backlinks, and trust signals."
    />
  )
)}
{/* SERP RANKINGS */}
{activeTab === "serp" && (
  <Section title="Live SERP Rankings">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO SERP API. Shows if the audited domain appears in Google’s top results for tracked keywords.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Keywords Checked"
        value={data?.serpData?.checkedKeywords ?? "Data not available"}
      />
      <MetricCard
        label="Keywords Found"
        value={data?.serpData?.foundCount ?? "Data not available"}
      />
      <MetricCard
        label="Average Rank"
        value={data?.serpData?.avgRank ?? "Data not available"}
      />
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Keyword Rank Positions
      </h3>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={(data?.serpData?.results || []).map((r: any) => ({
              keyword: r.keyword?.slice(0, 25) || "Keyword",
              rank: r.found ? Number(r.rank || 0) : 0,
            }))}
          >
            <XAxis dataKey="keyword" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="rank" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Ranking Results
      </h3>

      {data?.serpData?.results?.length > 0 ? (
        <div className="grid gap-3">
          {data.serpData.results.map((r: any, i: number) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {i + 1}. {r.keyword}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {r.found
                      ? r.url
                      : "Domain not found in top 100 results"}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold ${
                      r.found ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {r.found ? `#${r.rank}` : "Not Found"}
                  </p>
                  <p className="text-xs text-slate-500">Google Rank</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO SERP API.
        </p>
      )}
    </div>
  </Section>
)}
{/* TECHNICAL AUDIT */}
{activeTab === "technical" && (
  <Section title="Technical SEO Audit">
    <p className="mb-5 text-sm text-slate-500">
      Powered by DataForSEO OnPage API. Shows crawl status, page-level issues, broken links, and technical SEO signals.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Pages Crawled"
        value={data?.onPage?.crawledPages ?? "Data not available"}
      />
      <MetricCard
        label="Broken Links"
        value={data?.onPage?.brokenLinks ?? "Data not available"}
      />
      <MetricCard
        label="Missing Titles"
        value={data?.onPage?.missingTitle ?? "Data not available"}
      />
      <MetricCard
        label="Missing Descriptions"
        value={data?.onPage?.missingDescription ?? "Data not available"}
      />
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-950">Crawl Status</h3>
      <p className="text-sm leading-6 text-slate-600">
        {data?.onPage?.crawlStatus || "Data not available from DataForSEO OnPage API."}
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">Top Crawled Pages</h3>

      {data?.onPage?.pages?.length > 0 ? (
        <div className="grid gap-3">
          {data.onPage.pages.slice(0, 15).map((p: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {i + 1}. {p.title || "Untitled Page"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {p.url || "Data not available"}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-right">
                  <p className="font-bold text-slate-950">
                    {p.statusCode || "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">Status</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                <p>Load: {p.loadTime || "Data not available"}ms</p>
                <p>Size: {p.size || "Data not available"}</p>
                <p>H1: {Array.isArray(p.h1) ? p.h1.length : p.h1 || "Data not available"}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available yet. DataForSEO OnPage crawls can take longer to complete.
        </p>
      )}
    </div>
  </Section>
)}
{/* TRAFFIC */}
{activeTab === "traffic" && (
  data?.traffic ? (
  <Section title={data?.traffic?.label || "Estimated Monthly Organic Visits"}>
  <p className="mb-5 text-sm text-slate-500">
    {data?.traffic?.note ||
      "Modeled estimate based on third-party organic visibility data. Actual analytics traffic may vary."}
  </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
  label="Estimated Monthly Organic Visits"
  value={
    data?.traffic?.rawMonthly
      ? data.traffic.rawMonthly.toLocaleString()
      : data?.traffic?.monthly
      ? data.traffic.monthly.toLocaleString()
      : data?.traffic?.confidence === "insufficient-data"
      ? "Insufficient data"
      : "Data not available"
  }
  score={
    Number(data?.traffic?.rawMonthly || data?.traffic?.monthly || 0) > 10000
      ? 85
      : Number(data?.traffic?.rawMonthly || data?.traffic?.monthly || 0) > 1000
      ? 65
      : Number(data?.traffic?.rawMonthly || data?.traffic?.monthly || 0) > 100
      ? 40
      : 15
  }
/>
      <MetricCard
  label="Estimated Daily Organic Visits"
  value={
    data?.traffic?.daily
      ? data.traffic.daily.toLocaleString()
      : "Data not available"
  }
  score={
    Number(data?.traffic?.daily || 0) > 300
      ? 85
      : Number(data?.traffic?.daily || 0) > 50
      ? 65
      : Number(data?.traffic?.daily || 0) > 10
      ? 40
      : 15
  }
  tooltip="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
/>
      <MetricCard
        label="Organic Keywords"
        value={data?.dataforseo?.organicKeywords ?? "Data not available"}
      />
<MetricCard
  label="Traffic Confidence"
  value={data?.traffic?.confidence || data?.traffic?.score || "Data not available"}
  score={
    data?.traffic?.confidence === "high"
      ? 90
      : data?.traffic?.confidence === "moderate"
      ? 65
      : data?.traffic?.confidence === "low"
      ? 40
      : 10
  }
  tooltip={data?.traffic?.note || "Modeled estimate. Actual analytics traffic may vary."}
/>
    </div>

{isLargeSiteWarning && (
  <p className="mb-6 text-xs text-slate-500">
    Large keyword footprint detected. Estimate is based on the top 10,000 ranked keywords. Actual traffic may vary for very large websites.
  </p>
)}

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-950">Top Organic Keywords</h3>
      </div>

      {data?.traffic?.keywords?.length > 0 ? (
        <div className="grid gap-3">
          {data.traffic.keywords.slice(0, 12).map((k: any, i: number) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    {i + 1}. {k.keyword}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 break-all">
                    URL: {k.url || "Data not available"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-950">
                    {k.volume || "Data not available"}
                  </p>
                  <p className="text-xs text-slate-500">Volume</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 text-xs text-slate-500">
                <span>Position: {k.position || "Data not available"}</span>
                <span>•</span>
                <span>Estimated Traffic: {k.traffic || "Data not available"}</span>
                <span>•</span>
                <span>CPC: {k.cpc || "Data not available"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO organic keyword source.
        </p>
      )}
    </div>
    </Section>
  ) : (
    <LockedCard
      title="Traffic Intelligence"
      description="Unlock estimated organic traffic, keyword traffic signals, and visibility confidence."
    />
  )
)}

{/* COMPETITORS */}
{activeTab === "competitors" && (
  data?.competitors?.length > 0 ? (
  <Section title="Competitor Intelligence">
    <p className="mb-5 text-sm text-slate-500">
      Organic competitors are identified using DataForSEO keyword overlap and ranking visibility.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Competitors Found"
        value={data?.competitors?.length ?? "Data not available"}
      />
      <MetricCard
        label="Top Shared Keywords"
        value={
          data?.competitors?.length > 0
            ? Math.max(
                ...data.competitors.map((c: any) =>
                  Number(c.sharedKeywords || c.intersections || 0)
                )
              )
            : "Data not available"
        }
      />
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Shared Keyword Overlap
      </h3>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seoCompetitorChartData}>
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="threatScore" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="grid gap-4">
      {data?.competitors?.length > 0 ? (
        data.competitors.slice(0, 10).map((c: any, i: number) => {
          const shared = Number(c.sharedKeywords || c.intersections || 0);

          return (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-950">
                    {i + 1}. {c.domain || "Unknown domain"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
  Shared Keywords: {shared || "Data not available"} | Threat:{" "}
  {c.threatScore ? `${c.threatScore}/100` : "N/A"}
</p>

<p className="mt-1 text-xs text-slate-500">
  Strength: {c.competitiveStrength || "N/A"} | AI Risk:{" "}
  {c.aiRisk || "N/A"}
</p>

<p className="mt-2 text-xs font-medium text-blue-700">
  Winning Factor: {c.likelyWinningFactor || "N/A"}
</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-950">
                    {c.traffic
                      ? Math.round(Number(c.traffic)).toLocaleString()
                      : "Data not available"}
                  </p>
                  <p
  className="text-xs text-slate-500"
  title="Modeled estimate based on ranking keywords, clickstream data, and CTR calculations. Actual traffic may vary."
>
  Estimated Traffic Signal
</p>
                </div>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(5, shared * 10)
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-slate-500">
          Data not available from DataForSEO competitor source.
        </p>
      )}
    </div>
    </Section>
  ) : (
    <LockedCard
      title="Competitor Intelligence"
      description="Unlock competitor threat scores, shared keyword overlap, and traffic signals."
    />
  )
)}
          </>
        )}
      </div>
    </div>
  );
}

/* COMPONENTS */

function getScoreExplainer(label: string, score: number) {
  const cleanLabel = String(label || "").toLowerCase();

  if (cleanLabel.includes("overall")) {
    if (score >= 80) return "Strong overall foundation with only minor growth gaps remaining.";
    if (score >= 60) return "Usable foundation, but key SEO, speed, or visibility improvements are still needed.";
    return "Major improvements are needed before the website can perform strongly.";
  }

  if (cleanLabel.includes("seo")) {
    if (score >= 80) return "SEO foundation is strong with only minor optimization gaps.";
    if (score >= 60) return "SEO setup is acceptable, but important improvements are still needed.";
    return "SEO issues may be reducing rankings, crawlability, and organic traffic.";
  }

  if (
    cleanLabel.includes("mobile") ||
    cleanLabel.includes("desktop") ||
    cleanLabel.includes("speed") ||
    cleanLabel.includes("performance")
  ) {
    if (score >= 80) return "Page speed is strong and supports a better user experience.";
    if (score >= 60) return "Speed is usable, but performance improvements can still increase conversions.";
    return "Slow performance may be hurting user experience, rankings, and conversions.";
  }

  if (cleanLabel.includes("ux")) {
    if (score >= 80) return "User experience is strong and supports smoother visitor journeys.";
    if (score >= 60) return "User experience is acceptable, but friction points may still exist.";
    return "UX issues may be creating friction and reducing lead or sales conversion.";
  }

  if (cleanLabel.includes("ai")) {
    if (score >= 70) return "Brand has meaningful visibility inside AI-generated recommendations.";
    if (score >= 40) return "AI visibility is emerging but needs stronger entity authority.";
    return "Brand visibility inside AI-generated results is currently weak.";
  }

  if (
    cleanLabel.includes("traffic") ||
    cleanLabel.includes("visits") ||
    cleanLabel.includes("organic")
  ) {
    if (score >= 70) return "Organic visibility appears strong based on available ranking signals.";
    if (score >= 40) return "Organic visibility is moderate with room for keyword expansion.";
    return "Organic visibility is limited and needs stronger keyword coverage.";
  }

  if (cleanLabel.includes("share of voice")) {
    if (score >= 70) return "Brand visibility is strong compared with detected competitors.";
    if (score >= 40) return "Brand visibility is present but competitors still hold meaningful share.";
    return "Competitors appear to have stronger visibility across detected signals.";
  }

  return "This score summarizes the current strength of this audit area in plain language.";
}

function LockedCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-full bg-[#C5FF3D]/15 px-3 py-1 text-xs font-semibold text-[#C5FF3D]">
          Premium Module
        </div>

        <h3 className="text-lg font-bold text-white">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#A0A0A0]">
          {description}
        </p>

        <button className="mt-5 rounded-xl bg-[#C5FF3D] px-4 py-2 text-sm font-bold text-black hover:opacity-90">
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}

function AccountSettingsTab({ currentUser }: { currentUser: any }) {
  const canWhiteLabel =
    currentUser?.role === "admin" ||
    currentUser?.package?.allowWhiteLabel === true;

  const [form, setForm] = React.useState({
    name:             currentUser?.name || "",
    companyName:      currentUser?.companyName || "",
    agencyName:       currentUser?.agencyName || "",
    brandColor:       currentUser?.brandColor || "#C5FF3D",
    brandLogoUrl:     currentUser?.brandLogoUrl || "",
    pdfFooterText:    currentUser?.pdfFooterText || "",
    whiteLabelEnabled: currentUser?.whiteLabelEnabled || false,
  });
  const [saving,  setSaving]  = React.useState(false);
  const [saved,   setSaved]   = React.useState(false);
  const [error,   setError]   = React.useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Account Settings">
      <div className="grid gap-6 max-w-2xl">
        <div className="rounded-2xl border border-[#222] bg-[#111] p-6">
          <h3 className="mb-4 font-semibold text-white">Profile</h3>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                Display Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                Company Name
              </label>
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
              />
            </div>
          </div>
        </div>

        {canWhiteLabel ? (
          <div className="rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">White-Label PDF Branding</h3>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs text-[#8A8A8A]">Enabled</span>
                <input
                  type="checkbox"
                  checked={form.whiteLabelEnabled}
                  onChange={(e) => setForm({ ...form, whiteLabelEnabled: e.target.checked })}
                  className="h-4 w-4 accent-[#C5FF3D]"
                />
              </label>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  Agency / Brand Name (shown on PDF)
                </label>
                <input
                  value={form.agencyName}
                  onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  placeholder="Your Agency Name"
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  PDF Footer Text
                </label>
                <input
                  value={form.pdfFooterText}
                  onChange={(e) => setForm({ ...form, pdfFooterText: e.target.value })}
                  placeholder="Website Intelligence Report"
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  Brand Accent Colour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-[#2a2a2a] bg-transparent"
                  />
                  <span className="font-mono text-sm text-[#8A8A8A]">{form.brandColor}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  Logo URL (publicly accessible image link)
                </label>
                <input
                  value={form.brandLogoUrl}
                  onChange={(e) => setForm({ ...form, brandLogoUrl: e.target.value })}
                  placeholder="https://your-site.com/logo.png"
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#222] bg-[#111] p-6">
            <h3 className="mb-2 font-semibold text-white">White-Label Branding</h3>
            <p className="text-sm text-[#8A8A8A]">
              White-label PDF branding is available on Agency and Enterprise plans.
            </p>
            <a
              href="/#pricing"
              className="mt-4 inline-block rounded-xl border border-[#C5FF3D]/30 px-4 py-2 text-sm font-semibold text-[#C5FF3D]"
            >
              View plans &#8594;
            </a>
          </div>
          )}

        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[#C5FF3D] px-6 py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>
    </Section>
  );
}

function PricingCard({
  name,
  price,
  priceId,
  audits,
  features,
  active,
  hasSubscription,
}: {
  name: string;
  price: string;
  priceId: string;
  audits: string;
  features: string[];
  active?: boolean;
  hasSubscription?: boolean;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    if (active) {
      // Open customer portal to manage existing subscription
      setLoading(true);
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const json = await res.json();
        if (json.url) window.location.href = json.url;
      } catch {
        alert("Failed to open billing portal. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, packageName: name }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else alert(json.error || "Failed to start checkout.");
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${
        active
          ? "border-[#C5FF3D]/40 bg-[#0d1500]"
          : "border-[#222] bg-[#111]"
      }`}
    >
      {active && (
        <div className="mb-4 inline-flex rounded-full bg-[#C5FF3D] px-3 py-1 text-xs font-semibold text-black">
          Current Plan
        </div>
      )}

      <h3 className="text-xl font-bold text-white">{name}</h3>
      <p className="mt-2 text-3xl font-bold text-[#C5FF3D]">{price}</p>
      <p className="mt-2 text-sm font-medium text-[#8A8A8A]">{audits}</p>

      <div className="mt-5 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex gap-2 text-sm text-[#CCCCCC]">
            <span className="font-bold text-[#C5FF3D]">✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-[#C5FF3D] px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Loading..." : active ? "Manage Subscription" : `Upgrade to ${name}`}
      </button>
    </div>
  );
}

function InsightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#222] bg-[#181818] p-5">
      <div className="mb-3 inline-flex rounded-full bg-[#C5FF3D]/15 px-3 py-1 text-xs font-semibold text-[#C5FF3D]">
        Value Driver
      </div>

      <h3 className="text-base font-bold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#A0A0A0]">
        {description}
      </p>
    </div>
  );
}

function RecommendationCard({
  title,
  priority,
  impact,
  description,
}: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {priority} Priority
          </p>

          <h3 className="mt-1 text-lg font-bold text-slate-950">
            {title}
          </h3>
        </div>

        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          {impact}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tooltip,
  score,
}: any) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "--"
      : typeof value === "object"
      ? value?.label ||
        value?.title ||
        value?.name ||
        value?.value ||
        "Data available"
      : String(value);

  const numericScore =
    typeof score === "number"
      ? score
      : typeof value === "number"
      ? value
      : Number(String(value).replace("%", "")) || 0;

  return (
    <div className="group rounded-2xl border border-[#222] bg-[#111] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C5FF3D]/30">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
              {label}
            </p>

            {tooltip && (
              <span
                title={tooltip}
                className="cursor-help rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500"
              >
                i
              </span>
            )}
          </div>

          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {displayValue}
          </p>

          {getScoreExplainer(label, numericScore) ? (
            <p className="mt-2 max-w-[220px] text-xs leading-5 text-[#8A8A8A]">
              {getScoreExplainer(label, numericScore)}
            </p>
          ) : null}
        </div>

        <div className="h-10 w-10 rounded-xl border border-[#C5FF3D]/20 bg-[#C5FF3D]/10 transition group-hover:bg-[#C5FF3D]/20" />
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="mb-6 rounded-2xl border border-[#222] bg-[#111] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-white">
          {title}
        </h2>

        <div className="h-2 w-2 animate-pulse rounded-full bg-[#C5FF3D]" />
      </div>

      {children}
    </div>
  );
}

function IssueCard({ issue }: any) {
  return (
    <div className="mb-3 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-white">{issue.title}</p>

        <span className="rounded-full bg-[#C5FF3D]/15 px-3 py-1 text-xs font-semibold text-[#C5FF3D]">
          Issue
        </span>
      </div>

      <p className="text-sm leading-6 text-[#A0A0A0]">{issue.impact}</p>

      {issue.fix && (
        <div className="mt-3 rounded-xl border border-[#222] bg-[#111] p-3 text-sm text-[#CCCCCC]">
          <span className="font-semibold text-[#C5FF3D]">Recommendation:</span>{" "}
          {issue.fix}
        </div>
      )}
    </div>
  );
}