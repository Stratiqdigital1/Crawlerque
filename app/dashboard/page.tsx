"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import {
  normalizeAuditData,
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
import {
  trackAnalyticsEvent,
} from "@/lib/client-analytics";
import {
  AUDIT_COUNTRY_OPTIONS,
  AUDIT_CRAWL_LIMIT_OPTIONS,
  AUDIT_LANGUAGE_OPTIONS,
} from "@/lib/audit-scope";
import {
  formatCompactNumber,
  formatCurrency,
  formatPercentage,
} from "@/lib/report-format";
import {
  getPublicErrorMessage,
} from "@/lib/public-error";

const PROMO_REPORT_TYPES = [
  "seo",
  "technical",
  "traffic",
  "keywords",
  "competitors",
  "ai",
  "backlinks",
  "recommendations",
  "localSeo",
  "content",
  "serp",
];

type OnPagePollIdentity = {
  taskId: string;
  auditJobId: string;
  inputHash: string;
  normalizedDomain: string;
};

type DashboardAuditConfig = {
  countryName: string;
  countryCode?: string;
  locationCode?: number;
  languageName: string;
  languageCode?: string;
  device: "mobile" | "desktop";
  searchEngine: "google";
  maxCrawlPages: number;
  contentPageLimit: number;
};

export default function WebsiteAuditDashboardPage() {
  const [url, setUrl] = useState(() => {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("url") || "";
});
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
const [auditSeconds, setAuditSeconds] = useState(0);
const [auditJobId, setAuditJobId] = useState<string | null>(null);
const [auditTraceId, setAuditTraceId] = useState("");
const [auditProgress, setAuditProgress] = useState(0);
const [auditCurrentModule, setAuditCurrentModule] = useState("");
const [auditModuleStatus, setAuditModuleStatus] = useState<any>({});
const [abortController, setAbortController] = useState<AbortController | null>(null);
const [error, setError] = useState("");
  const [customPrompts, setCustomPrompts] = useState("");
  const [auditCountry, setAuditCountry] = useState("auto");
  const [auditLanguage, setAuditLanguage] = useState("English");
  const [auditDevice, setAuditDevice] = useState<"mobile" | "desktop">("mobile");
  const [auditSearchEngine] = useState<"google">("google");
  const [auditCrawlLimit, setAuditCrawlLimit] = useState(100);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedReportTypes, setSelectedReportTypes] = useState<string[]>([
  "seo",
  "technical",
]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [compareA, setCompareA] = useState<any>(null);
const [compareB, setCompareB] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [reportReview, setReportReview] = useState<any>(null);
  const [reviewDraft, setReviewDraft] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const activeAuditJobIdRef =
  useRef<string | null>(null);

const activeAuditIdentityRef =
  useRef<OnPagePollIdentity | null>(
    null
  );
const pollOnPage = async (
  identity: OnPagePollIdentity
) => {
  const {
    taskId,
    auditJobId: pollingAuditJobId,
    inputHash,
    normalizedDomain,
  } = identity;

  if (
    !taskId ||
    !pollingAuditJobId ||
    !inputHash ||
    !normalizedDomain
  ) {
    return;
  }

  for (
    let attempt = 1;
    attempt <= 20;
    attempt++
  ) {
    /*
     * Stop silently when another audit has
     * replaced this audit in the dashboard.
     */
    if (
      activeAuditJobIdRef.current !==
        pollingAuditJobId ||
      activeAuditIdentityRef.current
        ?.inputHash !== inputHash
    ) {
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 15000)
    );

    try {
      const params =
        new URLSearchParams({
          taskId,
          auditJobId:
            pollingAuditJobId,
          inputHash,
          normalizedDomain,

          finalAttempt:
            attempt === 20
              ? "true"
              : "false",
        });

      const res = await fetch(
        `/api/dataforseo/onpage/status?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const json =
        await res.json();

      if (
        !res.ok ||
        !json?.success
      ) {
        throw new Error(
          getPublicErrorMessage(
            json,
            "Technical crawl status could not be loaded."
          )
        );
      }

      /*
       * Recheck identity after the network
       * request. The user may have started
       * another audit while this was loading.
       */
      if (
        activeAuditJobIdRef.current !==
          pollingAuditJobId ||
        activeAuditIdentityRef.current
          ?.inputHash !== inputHash
      ) {
        return;
      }

      const onPage =
        json?.onPage;

      const technicalState =
        String(
          json?.technicalState ||
            onPage?.crawlStatus ||
            "running"
        );

      /*
       * Backend has finalized the canonical
       * saved report. Replace the dashboard
       * only when the audit identity matches.
       */
      if (
        json?.finalized === true &&
        json?.report
      ) {
        setData((previous: any) => {
          if (
            !previous ||
            previous?.auditJobId !==
              pollingAuditJobId ||
            previous?.inputHash !==
              inputHash ||
            previous
              ?.normalizedDomain !==
              normalizedDomain
          ) {
            return previous;
          }

return {
  ...json.report,

  reportId:
    json.report?.reportId ||
    json?.reportId ||
    previous?.reportId ||
    null,

  auditJobId:
    json.report?.auditJobId ||
    json?.auditJobId ||
    previous?.auditJobId ||
    pollingAuditJobId,

  inputHash:
    json.report?.inputHash ||
    previous?.inputHash ||
    inputHash,

  normalizedDomain:
    json.report?.normalizedDomain ||
    previous?.normalizedDomain ||
    normalizedDomain,

  reportTypes:
    json.report?.reportTypes ||
    previous?.reportTypes ||
    [],

  renderReady: true,
};
        });

        setAuditProgress(100);

        setAuditCurrentModule(
          technicalState ===
            "completed"
            ? "Completed"
            : `Completed with technical crawl ${technicalState}`
        );

        setAuditModuleStatus(
          json?.report
            ?.moduleStatus || {}
        );

        activeAuditIdentityRef.current =
          null;

        activeAuditJobIdRef.current =
          null;

        await loadReportHistory();
        await loadCurrentUser();

        trackAnalyticsEvent(
          "audit_completed",
          {
            account_type:
              currentUser?.trial
                ?.isTrialing
                ? "trial"
                : currentUser
                      ?.isPromoAccess
                  ? "promo"
                  : "paid",

            plan_name:
              currentUser?.package
                ?.name ||
              currentUser
                ?.packageName ||
              "unknown",

            module_count:
              Array.isArray(
                json?.report
                  ?.reportTypes
              )
                ? json.report
                    .reportTypes
                    .length
                : 0,

            technical_state:
              technicalState,
          }
        );

        break;
      }

      /*
       * Crawl is still running. Show partial
       * technical data but keep PDF locked.
       */
      if (onPage) {
        setData(
          (previous: any) => {
            if (
              !previous ||
              previous?.auditJobId !==
                pollingAuditJobId ||
              previous?.inputHash !==
                inputHash ||
              previous
                ?.normalizedDomain !==
                normalizedDomain
            ) {
              return previous;
            }

            return {
              ...previous,

              onPage,

              renderReady: false,

              moduleStatus: {
                ...previous
                  ?.moduleStatus,

                technical:
                  technicalState,

                onPage:
                  technicalState,
              },

              unifiedOverview: {
                ...previous
                  ?.unifiedOverview,

                keyMetrics: {
                  ...previous
                    ?.unifiedOverview
                    ?.keyMetrics,

                  pagesCrawled:
                    onPage
                      ?.crawledPages ??
                    previous
                      ?.unifiedOverview
                      ?.keyMetrics
                      ?.pagesCrawled,
                },
              },
            };
          }
        );

        setAuditProgress(92);

        setAuditCurrentModule(
          "Waiting for technical crawl"
        );

        setAuditModuleStatus(
          (previous: any) => ({
            ...previous,

            technical:
              technicalState,

            onPage:
              technicalState,
          })
        );
      }
    } catch (pollError) {
      console.error(
        "OnPage polling failed:",
        pollError
      );

      if (attempt === 20) {
        setError(
          pollError instanceof Error
            ? pollError.message
            : "The technical crawl could not be finalized."
        );

        setAuditCurrentModule(
          "Technical crawl finalization failed"
        );

        activeAuditIdentityRef.current =
          null;

        activeAuditJobIdRef.current =
          null;

        await loadCurrentUser();
        await loadReportHistory();
      }
    }
  }
};

const reportOptions = [
  ["seo", "SEO Intelligence"],
  ["technical", "Technical SEO"],
  ["traffic", "Traffic Intelligence"],
  ["keywords", "Keyword Research"],
  ["competitors", "Competitor Intelligence"],
  ["ai", "AI Search Visibility"],
  ["backlinks", "Backlink Authority"],
  ["recommendations", "Recommendations"],
  ["localSeo", "Local SEO"],
  ["content", "Content Quality"],
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
    if (
  activeAuditJobIdRef.current !==
  jobId
) {
  window.clearInterval(interval);
  return;
}
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
        [
          "completed",
          "completed_with_limitation",
          "failed",
          "cancelled",
        ].includes(
          String(job.status)
        )
      ) {
        window.clearInterval(
          interval
        );

        if (
          [
            "failed",
            "cancelled",
          ].includes(
            String(job.status)
          )
        ) {
          const reference =
            job.traceId
              ? ` Reference: ${job.traceId}.`
              : "";

          const creditMessage =
            job.creditRestored
              ? " Your audit credit was restored."
              : "";

          setError(
            `${job.userMessage || job.error || "The audit did not complete."}${creditMessage}${reference}`
          );

          setLoading(false);
          setAbortController(
            null
          );

          activeAuditJobIdRef.current =
            null;

          activeAuditIdentityRef.current =
            null;

          void loadCurrentUser();
          void loadReportHistory();
        }
      }
    } catch (error) {
      console.error("Audit progress polling failed:", error);
    }
  }, 2000);

  return interval;
};

const runAudit = async (
  options?: {
    url?: string;
    reportTypes?: string[];
    retryOfJobId?: string | null;
    auditConfig?: Partial<DashboardAuditConfig> | null;
  }
) => {
  const requestedUrl =
    options?.url || url;

  if (!requestedUrl) return;

  // Normalize URL before anything else
  let normalizedUrl =
    requestedUrl.trim();
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  setUrl(normalizedUrl);

  if (
    options?.reportTypes?.length
  ) {
    setSelectedReportTypes([
      ...options.reportTypes,
    ]);
  }

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
    currentUser?.isPromoAccess &&
    Number(
      currentUser?.promoAccess
        ?.auditsRemaining || 0
    ) <= 0
  ) {
    setError(
      "This promotional link has used all available audits."
    );
    return;
  }

  if (
    currentUser?.role !== "admin" &&
    !currentUser?.isPromoAccess &&
    currentUser?.auditsUsed >= currentUser?.package?.monthlyAudits
  ) {
    setError(
  `Your monthly audit limit has been reached. Current plan: ${
    currentUser?.package?.name || "Unknown"
  }. Please upgrade to run more audits.`
);
    return;
  }

const effectiveReportTypes =
  currentUser?.isPromoAccess
    ? [...PROMO_REPORT_TYPES]
    : options?.reportTypes?.length
      ? [...options.reportTypes]
      : selectedReportTypes;

const effectiveAuditConfig: DashboardAuditConfig = {
  countryName:
    options?.auditConfig?.countryName ||
    (auditCountry === "auto"
      ? ""
      : auditCountry),
  countryCode:
    options?.auditConfig?.countryCode,
  locationCode:
    options?.auditConfig?.locationCode,
  languageName:
    options?.auditConfig?.languageName ||
    auditLanguage,
  languageCode:
    options?.auditConfig?.languageCode,
  device:
    options?.auditConfig?.device ||
    auditDevice,
  searchEngine: "google",
  maxCrawlPages:
    Number(
      options?.auditConfig?.maxCrawlPages ||
      auditCrawlLimit
    ),
  contentPageLimit:
    Number(
      options?.auditConfig?.contentPageLimit ||
      10
    ),
};

setData(null);
setCompareA(null);
setCompareB(null);
setReportReview(null);
setReviewDraft(null);

activeAuditJobIdRef.current =
  null;

activeAuditIdentityRef.current =
  null;

setLoading(true);
setError("");
setAuditSeconds(0);
setAuditJobId(null);
setAuditTraceId("");
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
          url: normalizedUrl,
          reportTypes:
            effectiveReportTypes,
          retryOfJobId:
            options?.retryOfJobId ||
            null,
          auditConfig:
            effectiveAuditConfig,
        }),
      });

      const startJson = await startRes.json();

if (!startRes.ok || !startJson?.success) {
        throw new Error(
          getPublicErrorMessage(
            startJson,
            "Failed to start the audit. Please try again."
          )
        );
      }

const startedJobId =
  String(
    startJson.auditJobId || ""
  );

if (!startedJobId) {
  throw new Error(
    "Audit job identity was not returned."
  );
}

setAuditJobId(startedJobId);

setAuditTraceId(
  String(
    startJson.traceId ||
      startJson?.job
        ?.traceId ||
      ""
  )
);

const reservedAuditConfig =
  startJson?.auditConfig ||
  startJson?.job?.auditConfig ||
  effectiveAuditConfig;

activeAuditJobIdRef.current =
  startedJobId;

      trackAnalyticsEvent("audit_started", {
        account_type: currentUser?.trial?.isTrialing
          ? "trial"
          : currentUser?.isPromoAccess
            ? "promo"
            : "paid",
        plan_name:
          currentUser?.package?.name ||
          currentUser?.packageName ||
          "unknown",
        module_count: effectiveReportTypes.length,
      });

      const progressInterval = pollAuditJobStatus(startedJobId);

      const res = await fetch("/api/audit", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
body: JSON.stringify({
  url: normalizedUrl,
  reportTypes: effectiveReportTypes,
  auditJobId: startedJobId,
  auditConfig:
    reservedAuditConfig,
  customPrompts: customPrompts.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5),
}),
      });

      const json = await res.json();

if (!res.ok || json?.success === false) {
  throw new Error(
    getPublicErrorMessage(
      json,
      "The audit could not be completed. Please try again."
    )
  );
}

if (
  json?.traceId &&
  !auditTraceId
) {
  setAuditTraceId(
    String(json.traceId)
  );
}

const reportSource =
  json?.report || json;

const report = {
  ...reportSource,

  reportId:
    reportSource?.reportId ||
    json?.reportId ||
    null,

  auditJobId:
    reportSource?.auditJobId ||
    json?.auditJobId ||
    startedJobId,

  reportTypes:
    effectiveReportTypes,

  auditConfig:
    reportSource?.auditConfig ||
    reservedAuditConfig,
};

/* Recommendations are generated and saved server-side. The dashboard never
 * runs a second client-side recommendation request, so History, PDF, and the
 * live report all use the same reconciled recommendation set. */

setData(report);

/*
 * Audit is fully ready immediately when no
 * asynchronous technical crawl is pending.
 */
if (
  report?.renderReady === true
) {
  activeAuditIdentityRef.current =
    null;

  activeAuditJobIdRef.current =
    null;

  trackAnalyticsEvent(
    "audit_completed",
    {
      account_type:
        currentUser?.trial
          ?.isTrialing
          ? "trial"
          : currentUser
                ?.isPromoAccess
            ? "promo"
            : "paid",

      plan_name:
        currentUser?.package
          ?.name ||
        currentUser
          ?.packageName ||
        "unknown",

      module_count:
        effectiveReportTypes.length,

      cached_result:
        Boolean(json?.cached),

      technical_state:
        report?.moduleStatus
          ?.technical ||
        "not_required",
    }
  );

  await loadReportHistory();

  if (progressInterval) {
    window.clearInterval(
      progressInterval
    );
  }

  setAuditProgress(100);

  setAuditCurrentModule(
    "Completed"
  );
} else {
  const pollIdentity:
    OnPagePollIdentity | null =
    report?.onPage?.taskId &&
    report?.auditJobId &&
    report?.inputHash &&
    report?.normalizedDomain
      ? {
          taskId: String(
            report.onPage.taskId
          ),

          auditJobId: String(
            report.auditJobId
          ),

          inputHash: String(
            report.inputHash
          ),

          normalizedDomain:
            String(
              report.normalizedDomain
            ),
        }
      : null;

  if (!pollIdentity) {
    throw new Error(
      "The technical crawl identity is missing from the audit response."
    );
  }

  activeAuditJobIdRef.current =
    pollIdentity.auditJobId;

  activeAuditIdentityRef.current =
    pollIdentity;

  setAuditProgress(92);

  setAuditCurrentModule(
    "Waiting for technical crawl"
  );

  void pollOnPage(
    pollIdentity
  );

}

await loadCurrentUser();
} catch (e: any) {
  console.error(e);
  setError(
    getPublicErrorMessage(
      e,
      "Something went wrong while running the audit. Please try again."
    )
  );
  setAuditCurrentModule("Failed");

  trackAnalyticsEvent("audit_failed", {
    account_type: currentUser?.trial?.isTrialing
      ? "trial"
      : currentUser?.isPromoAccess
        ? "promo"
        : "paid",
    plan_name:
      currentUser?.package?.name ||
      currentUser?.packageName ||
      "unknown",
    module_count: effectiveReportTypes.length,
  });
}

clearInterval(timer);
setAbortController(null);
setLoading(false);
  };
const cancelAudit = async () => {
  if (abortController) {
    abortController.abort();
  }

  const jobIdToCancel =
    auditJobId ||
    activeAuditJobIdRef.current;

  activeAuditJobIdRef.current =
    null;

  activeAuditIdentityRef.current =
    null;

  setAbortController(null);
  setLoading(false);

  if (jobIdToCancel) {
    try {
      const res = await fetch(
        `/api/audit-jobs/${jobIdToCancel}/cancel`,
        {
          method: "POST",
        }
      );

      const json =
        await res.json();

      if (
        !res.ok ||
        !json?.success
      ) {
        throw new Error(
          getPublicErrorMessage(
            json,
            "The audit could not be cancelled."
          )
        );
      }

      const reference =
        json?.traceId
          ? ` Reference: ${json.traceId}.`
          : auditTraceId
            ? ` Reference: ${auditTraceId}.`
            : "";

      setError(
        `Audit cancelled.${
          json?.creditRestored
            ? " Your audit credit was restored."
            : ""
        }${reference}`
      );
    } catch (cancelError) {
      console.error(
        "Audit cancellation failed:",
        cancelError
      );

      setError(
        getPublicErrorMessage(
          cancelError,
          "The audit could not be cancelled."
        )
      );
    }
  } else {
    setError(
      "Audit cancelled."
    );
  }

  setAuditCurrentModule(
    "Cancelled"
  );

  await loadCurrentUser();
  await loadReportHistory();
};
  const chartData = Object.entries(
    data?.aiSearchVisibility?.modelBreakdown || {}
  ).map(([model, visibility]) => ({
    name:
      model === "chatgpt"
        ? "ChatGPT"
        : model === "claude"
          ? "Claude"
          : model === "gemini"
            ? "Gemini"
            : model,
    mentioned: Number(visibility || 0),
  }));
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
      mentions:
        data?.aiSearchVisibility?.brandMentionCount ??
        0,
    },
    {
      name: "Competitors",
      mentions:
        data?.aiSearchVisibility?.competitorMentionCount ??
        0,
    },
  ];

const normalizeHistoryDomain = (
  item: any
) => {
  const raw = String(
    item?.normalizedDomain ||
      item?.domain ||
      ""
  )
    .trim()
    .toLowerCase();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`
    );

    return parsed.hostname
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/)[0]
      .replace(/\.$/, "");
  }
};

const historyReportTypesKey = (
  item: any
) => {
  const reportTypes: string[] = (
    Array.isArray(item?.reportTypes)
      ? item.reportTypes
      : []
  )
    .map((type: unknown) =>
      String(type || "").trim()
    )
    .filter(
      (type: string) =>
        Boolean(type)
    );

  return Array.from(
    new Set<string>(reportTypes)
  )
    .sort(
      (a: string, b: string) =>
        a.localeCompare(b)
    )
    .join("|");
};

const historyAuditScopeKey = (
  item: any
) => {
  const config =
    item?.auditConfig ||
    item?.searchContext ||
    null;

  if (!config) {
    return "";
  }

  return [
    config?.countryCode ||
      config?.countryName ||
      config?.country ||
      "",
    config?.locationCode || "",
    config?.languageCode ||
      config?.languageName ||
      config?.language ||
      "",
    config?.device || "",
    config?.searchEngine || "google",
    config?.maxCrawlPages ||
      config?.crawlPageLimit ||
      "",
    config?.contentPageLimit || "",
  ].join("|");
};

const reportsAreComparable = (
  reportA: any,
  reportB: any
) => {
  if (
    !reportA ||
    !reportB
  ) {
    return false;
  }

  const domainA =
    normalizeHistoryDomain(
      reportA
    );

  const domainB =
    normalizeHistoryDomain(
      reportB
    );

  return (
    Boolean(domainA) &&
    domainA === domainB &&
    historyReportTypesKey(
      reportA
    ) ===
      historyReportTypesKey(
        reportB
      ) &&
    Boolean(
      historyAuditScopeKey(reportA)
    ) &&
    historyAuditScopeKey(reportA) ===
      historyAuditScopeKey(reportB) &&
    reportA?.renderReady ===
      true &&
    reportB?.renderReady ===
      true
  );
};

const selectComparisonReport = (
  slot: "A" | "B",
  item: any
) => {
  if (
    item?.renderReady !== true
  ) {
    setError(
      "Only completed, export-ready reports can be compared."
    );
    return;
  }

  const otherReport =
    slot === "A"
      ? compareB
      : compareA;

  if (
    otherReport &&
    !reportsAreComparable(
      item,
      otherReport
    )
  ) {
    setError(
      "Select another completed audit for the same domain, modules, country, language, device, search engine, and crawl scope."
    );
    return;
  }

  setError("");

  if (slot === "A") {
    setCompareA(item);
  } else {
    setCompareB(item);
  }
};

const loadReportHistory = async () => {
  try {
    const res = await fetch("/api/reports", {
      cache: "no-store",
    });

    const json = await res.json();

    if (!json?.success) return;

const formattedReports =
  (json.reports || []).map(
    (item: any) => ({
      recordType:
        "report",
      id: item.id,

      auditJobId:
        item.auditJobId ||
        null,

      domain:
        item.domain,

      normalizedDomain:
        item.normalizedDomain,

      url:
        item.domain,

      reportTypes:
        item.reportTypes ||
        [],

      auditConfig:
        item.auditConfig ||
        null,

      status:
        item.status,

      renderReady:
        item.renderReady ===
        true,

      overallScore:
        item.overallScore,

      seoScore:
        item.seoScore,

      uxScore:
        item.uxScore,

      aiScore:
        item.aiScore,

      traffic:
        item.estimatedTraffic,

      keywordCount:
        item.keywordCount,

      pdfGenerated:
        item.pdfGenerated,

      reviewStatus:
        item.reviewStatus ||
        item.review?.status ||
        "draft",

      reviewVersion:
        item.reviewVersion ||
        item.review?.version ||
        null,

      approvedAt:
        item.approvedAt ||
        item.review?.approvedAt ||
        null,

      approvedBy:
        item.approvedBy ||
        item.review?.approvedBy ||
        null,

      completedAt:
        item.completedAt
          ? new Date(
              item.completedAt
            ).toLocaleString()
          : null,

      createdAtRaw:
        item.createdAt,

      createdAt:
        new Date(
          item.createdAt
        ).toLocaleString(),
    })
  );

const formattedAttempts =
  (json.attempts || []).map(
    (item: any) => ({
      recordType:
        "attempt",
      id: null,

      auditJobId:
        item.id,

      traceId:
        item.traceId,

      domain:
        item.domain,

      normalizedDomain:
        item.normalizedDomain,

      url:
        item.url,

      reportTypes:
        item.reportTypes ||
        [],

      auditConfig:
        item.auditConfig ||
        null,

      status:
        item.status,

      renderReady:
        false,

      overallScore:
        null,

      seoScore:
        null,

      uxScore:
        null,

      aiScore:
        null,

      traffic:
        null,

      keywordCount:
        null,

      failureCode:
        item.failureCode,

      userMessage:
        item.userMessage,

      error:
        item.error,

      usageState:
        item.usageState,

      creditRestored:
        item.creditRestored ===
        true,

      createdAtRaw:
        item.createdAt,

      createdAt:
        new Date(
          item.createdAt
        ).toLocaleString(),
    })
  );

const formattedHistory = [
  ...formattedReports,
  ...formattedAttempts,
].sort(
  (a: any, b: any) =>
    new Date(
      b.createdAtRaw
    ).getTime() -
    new Date(
      a.createdAtRaw
    ).getTime()
);

    setHistory(formattedHistory);
  } catch (error) {
    console.error("Failed to load report history:", error);
  }
};

const loadCurrentUser = async () => {
  try {
    const res = await fetch(
      "/api/user/me",
      {
        cache: "no-store",
      }
    );

    const json = await res.json();

    if (
      !res.ok ||
      !json?.success
    ) {
      window.location.replace(
        "/login"
      );
      return;
    }

    setCurrentUser(json.user);

    if (
      json.user?.isPromoAccess
    ) {
      setSelectedReportTypes([
        ...PROMO_REPORT_TYPES,
      ]);
    }
  } catch (error) {
    console.error(
      "Current user load failed:",
      error
    );

    window.location.replace(
      "/login"
    );
  }
};

const loadReportReview = async (
  reportId: string
) => {
  if (!reportId) return;

  setReviewLoading(true);

  try {
    const res = await fetch(
      `/api/reports/${reportId}/review`,
      {
        cache: "no-store",
      }
    );

    const json = await res.json();

    if (!res.ok || !json?.success) {
      throw new Error(
        json?.error ||
          "Failed to load client review."
      );
    }

    setReportReview(
      json?.review || null
    );

    setReviewDraft(
      json?.review?.draftData ||
        json?.review?.approvedData ||
        null
    );
  } catch (reviewError) {
    console.error(
      "Report review load failed:",
      reviewError
    );

    setError(
      reviewError instanceof Error
        ? reviewError.message
        : "Failed to load client review."
    );
  } finally {
    setReviewLoading(false);
  }
};

const updateReviewItem = (
  group: "issues" | "recommendations",
  itemId: string,
  updater: (item: any) => any
) => {
  setReviewDraft((previous: any) => {
    if (!previous) return previous;

    const items = Array.isArray(
      previous?.[group]
    )
      ? previous[group]
      : [];

    return {
      ...previous,
      [group]: items.map(
        (item: any) =>
          item?.id === itemId
            ? updater(item)
            : item
      ),
    };
  });
};

const moveReviewItem = (
  group: "issues" | "recommendations",
  itemId: string,
  direction: -1 | 1
) => {
  setReviewDraft((previous: any) => {
    if (!previous) return previous;

    const items = [
      ...(Array.isArray(
        previous?.[group]
      )
        ? previous[group]
        : []),
    ].sort(
      (a: any, b: any) =>
        Number(a?.order || 0) -
        Number(b?.order || 0)
    );

    const index = items.findIndex(
      (item: any) =>
        item?.id === itemId
    );

    const targetIndex =
      index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return previous;
    }

    const [moved] = items.splice(
      index,
      1
    );

    items.splice(
      targetIndex,
      0,
      moved
    );

    return {
      ...previous,
      [group]: items.map(
        (item: any, order: number) => ({
          ...item,
          order,
        })
      ),
    };
  });
};

const saveReportReview = async (
  action:
    | "save"
    | "submit"
    | "approve"
    | "request_changes"
) => {
  const reportId =
    data?.reportId;

  if (!reportId) {
    setError(
      "Open a saved report before starting client review."
    );
    return;
  }

  if (
    currentUser?.canReviewReports !==
    true
  ) {
    setError(
      "Client review editing is available on Agency and Enterprise access."
    );
    return;
  }

  setReviewSaving(true);
  setError("");

  try {
    const res = await fetch(
      `/api/reports/${reportId}/review`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action,
          reviewData:
            reviewDraft,
        }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json?.success) {
      throw new Error(
        json?.error ||
          "Failed to update client review."
      );
    }

    setReportReview(
      json.review || null
    );

    setReviewDraft(
      json?.review?.draftData ||
        reviewDraft
    );

    setData((previous: any) =>
      previous
        ? {
            ...previous,
            clientReview:
              json?.review || null,
          }
        : previous
    );

    await loadReportHistory();
  } catch (reviewError) {
    console.error(
      "Report review update failed:",
      reviewError
    );

    setError(
      reviewError instanceof Error
        ? reviewError.message
        : "Failed to update client review."
    );
  } finally {
    setReviewSaving(false);
  }
};

useEffect(() => {
  loadCurrentUser();
  loadReportHistory();
}, []);

useEffect(() => {
  if (
    activeTab !== "review" ||
    !data?.reportId
  ) {
    return;
  }

  const reportId =
    String(data.reportId);

  const timer =
    window.setTimeout(() => {
      void loadReportReview(
        reportId
      );
    }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [activeTab, data?.reportId]);
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
      throw new Error(
        getPublicErrorMessage(
          json,
          "The saved report could not be loaded."
        )
      );
    }

    const fullReport =
      json.report?.reportData;

    if (
      !fullReport ||
      typeof fullReport !== "object" ||
      Array.isArray(fullReport)
    ) {
      throw new Error(
        "Saved report data is not available."
      );
    }

    const reportRenderReady =
      json.report?.renderReady === true ||
      fullReport?.renderReady === true;

    const hydratedReport = {
      ...fullReport,

      reportId:
        fullReport?.reportId ||
        json.report?.id,

      auditJobId:
        fullReport?.auditJobId ||
        json.report?.auditJobId ||
        null,

      inputHash:
        fullReport?.inputHash ||
        json.report?.inputHash ||
        null,

      normalizedDomain:
        fullReport?.normalizedDomain ||
        json.report?.normalizedDomain ||
        null,

      renderReady:
        reportRenderReady,

      reportStatus:
        json.report?.status ||
        fullReport?.reportStatus ||
        "processing",

      auditConfig:
        fullReport?.auditConfig ||
        json.report?.auditConfig ||
        null,
    };

    setData(hydratedReport);
    setReportReview(
      json.report?.review || null
    );
    setReviewDraft(null);

    const savedAuditConfig =
      hydratedReport?.auditConfig ||
      hydratedReport?.searchContext ||
      null;

    if (savedAuditConfig) {
      setAuditCountry(
        savedAuditConfig?.countryName ||
        savedAuditConfig?.country ||
        "auto"
      );
      setAuditLanguage(
        savedAuditConfig?.languageName ||
        savedAuditConfig?.language ||
        "English"
      );
      setAuditDevice(
        savedAuditConfig?.device ===
          "desktop"
          ? "desktop"
          : "mobile"
      );
      setAuditCrawlLimit(
        Number(
          savedAuditConfig?.maxCrawlPages ||
          savedAuditConfig?.crawlPageLimit ||
          100
        )
      );
    }

    setAuditJobId(
      hydratedReport?.auditJobId ||
        null
    );

    setUrl(
      hydratedReport?.url ||
        hydratedReport?.domain ||
        json.report?.domain ||
        ""
    );

    setSelectedReportTypes(
      hydratedReport?.reportTypes ||
        json.report?.reportTypes ||
        selectedReportTypes
    );

    setActiveTab("overview");

    if (
      !reportRenderReady &&
      hydratedReport?.onPage?.taskId &&
      hydratedReport?.auditJobId &&
      hydratedReport?.inputHash &&
      hydratedReport?.normalizedDomain
    ) {
      const pollIdentity:
        OnPagePollIdentity = {
          taskId: String(
            hydratedReport.onPage.taskId
          ),

          auditJobId: String(
            hydratedReport.auditJobId
          ),

          inputHash: String(
            hydratedReport.inputHash
          ),

          normalizedDomain: String(
            hydratedReport.normalizedDomain
          ),
        };

      activeAuditJobIdRef.current =
        pollIdentity.auditJobId;

      activeAuditIdentityRef.current =
        pollIdentity;

      setAuditCurrentModule(
        "Waiting for technical crawl"
      );

      setAuditProgress(92);

      void pollOnPage(
        pollIdentity
      );
    } else {
      activeAuditJobIdRef.current =
        null;

      activeAuditIdentityRef.current =
        null;
    }

    trackAnalyticsEvent(
      "report_opened",
      {
        account_type:
          currentUser?.trial?.isTrialing
            ? "trial"
            : currentUser?.isPromoAccess
              ? "promo"
              : "paid",

        plan_name:
          currentUser?.package?.name ||
          currentUser?.packageName ||
          "unknown",

        render_ready:
          reportRenderReady,
      }
    );
  } catch (error: any) {
    console.error(
      "Saved report load failed:",
      error
    );

    setError(
      getPublicErrorMessage(
        error,
        "The saved report could not be loaded."
      )
    );
  }
};

useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(
    window.location.search
  );

  const reportId = params.get("reportId");

  if (!reportId) {
    return;
  }

  const timer = window.setTimeout(() => {
    void loadSavedReport(reportId);
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };

}, []);

const retryAuditAttempt = (
  item: any
) => {
  const retryUrl =
    item?.url ||
    item?.domain ||
    "";

  const retryTypes =
    Array.isArray(
      item?.reportTypes
    )
      ? item.reportTypes
      : selectedReportTypes;

  setActiveTab("overview");
  setData(null);
  setError("");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  void runAudit({
    url: retryUrl,
    reportTypes:
      retryTypes,
    retryOfJobId:
      item?.auditJobId ||
      null,
    auditConfig:
      item?.auditConfig ||
      null,
  });
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
      throw new Error(
        getPublicErrorMessage(
          json,
          "The report could not be deleted."
        )
      );
    }

    setHistory((prev) => prev.filter((item) => item.id !== id));

    if (compareA?.id === id) setCompareA(null);
    if (compareB?.id === id) setCompareB(null);
  } catch (error: any) {
    console.error("Report delete failed:", error);
    setError(
      getPublicErrorMessage(
        error,
        "The report could not be deleted."
      )
    );
  }
};
const exportComparisonPDF = async () => {
  if (!compareA || !compareB) {
    setError("Please select two reports to compare.");
    return;
  }
  if (
  !reportsAreComparable(
    compareA,
    compareB
  )
) {
  setError(
    "Comparison is allowed only for completed audits of the same domain using the same modules and audit scope."
  );

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
        throw new Error(
          getPublicErrorMessage(
            json,
            "The comparison reports could not be loaded."
          )
        );
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
    setError(
      getPublicErrorMessage(
        error,
        "The comparison reports could not be loaded."
      )
    );
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
  : "Crawler Que";

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
const exportPDF = async () => {
  if (!data) return;

  let pdfData: any = data;

  if (
    pdfData?.renderReady !== true
  ) {
    setError(
      "The report is still being finalized. PDF export will unlock after every selected module reaches a final status."
    );

    return;
  }

  const userRes = await fetch("/api/user/me", { cache: "no-store" });
  if (!userRes.ok) { setError("Please login first."); return; }
  const userJson = await userRes.json();
  const pdfUser  = userJson?.user;

  if (pdfUser?.role !== "admin" && !pdfUser?.package?.allowPdf) {
    setError("PDF export is not available in your current package.");
    return;
  }

  if (pdfUser?.canReviewReports === true) {
    const reportId = String(
      pdfData?.reportId || ""
    );

    if (!reportId) {
      setError(
        "Save and open the completed report before exporting an agency PDF."
      );
      return;
    }

    const reviewRes = await fetch(
      `/api/reports/${reportId}`,
      {
        cache: "no-store",
      }
    );

    const reviewJson =
      await reviewRes.json();

    if (
      !reviewRes.ok ||
      !reviewJson?.success
    ) {
      setError(
        reviewJson?.error ||
          "The approved client report could not be loaded."
      );
      return;
    }

    if (
      reviewJson?.report?.review?.status !==
        "approved" ||
      !reviewJson?.report
        ?.clientReportData
    ) {
      setError(
        "Approve the current client-facing review before exporting the PDF."
      );
      setActiveTab("review");
      return;
    }

    pdfData =
      reviewJson.report
        .clientReportData;

    setReportReview(
      reviewJson.report.review
    );
  }

  const doc    = new jsPDF("p", "mm", "a4");
  const PW     = doc.internal.pageSize.getWidth();
  const PH     = doc.internal.pageSize.getHeight();

  // ── BRAND ─────────────────────────────────────────────────────────────
  const canWL     = pdfUser?.canUseWhiteLabel === true && pdfUser?.whiteLabelEnabled === true;
const brandName = canWL ? (pdfUser?.agencyName || pdfUser?.companyName || "Your Agency") : "Crawler Que";
const tagline   = canWL ? (pdfUser?.pdfFooterText || "Website Growth Intelligence Report") : "Powered By Strat IQ Digital";
    const accentHex = canWL && pdfUser?.brandColor ? pdfUser.brandColor : "#00D4AA";

  // ── DATA ──────────────────────────────────────────────────────────────
  const normalized         = normalizeAuditData(pdfData);
  const domain             = normalized.domain || pdfData?.domain || "—";
  const generatedDate      = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const selectedModules    = pdfData?.reportTypes?.length > 0 ? pdfData.reportTypes : selectedReportTypes;

  // parse hex accent → RGB
  const hexToRgb = (h: string): [number,number,number] => {
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
    return [r,g,b];
  };

  // ── PALETTE ───────────────────────────────────────────────────────────
  type RGB = [number,number,number];
  const C = {
bg:      [11, 25, 41] as RGB,
    card:    [14, 36, 64] as RGB,
    card2:   [18, 43, 78] as RGB,
    border:  [30, 58, 95] as RGB,
    accent:  hexToRgb(accentHex),
    dimAcc:  [0,  90, 74] as RGB,
    white:   [255,255,255] as RGB,
    soft:    [226,232,240] as RGB,
    muted:   [148,163,184] as RGB,
    faint:   [51, 65, 85 ] as RGB,
    red:     [239, 68, 68] as RGB,
    amber:   [245,158, 11] as RGB,
    blue:    [99, 179,237] as RGB,
    green:   [0, 212, 170] as RGB,
  };

  const ML  = 14;
  const MR  = 14;
  const CW  = PW - ML - MR;
  const BOT = PH - 18;
  let y     = 0;
  let pageNum = 0;

// =============================================================================
// CRAWLER QUE — PDF RENDERING ENGINE v2  (overflow-proof, professional layout)
// =============================================================================
// HOW TO INSTALL — in app/dashboard/page.tsx, inside the exportPDF function:
//
//   1. Find the line:      // ── UTILS ─────────────────────────────────────
//   2. Select from that line DOWN TO (and including) the entire simpleList
//      function — i.e. everything up to, but NOT including, the line:
//      //  PAGE 1 — COVER
//   3. Delete that selection and paste this entire file in its place.
//
// Every helper keeps its original name and signature, so all section content
// code below it continues to work unchanged.
//
// WHAT v2 FIXES:
//   • Text can NEVER overflow a card, box, or table cell (auto-fit + ellipsis)
//   • Cards and boxes auto-size their height to their content
//   • Correct page numbers ("Page 4 of 33", not "Page 33" everywhere)
//   • Emoji / unicode mojibake removed (the "Ø=Ý4" and "!'" garbage)
//   • Raw floats formatted ($75.2K instead of 75198.56722317677)
//   • Markdown stripped from AI response snippets (**bold** → bold)
//   • Larger, more readable type scale with higher contrast
// =============================================================================

  // ── UTILS ─────────────────────────────────────────────────────────────

  // Characters outside jsPDF's WinAnsi encoding render as garbage in
  // Helvetica. Map the common ones to safe equivalents, drop the rest.
  const sanitize = (s: string): string =>
    String(s)
      .replace(/\*\*|__|`/g, "")            // strip markdown bold/code
      .replace(/→/g, "->")
      .replace(/⚠|❗|🔴/g, "!")
      .replace(/✦|★|⭐|🟡|🔵|🟢/g, "*")
      .replace(/✓|✔|✅/g, "OK")
      .replace(/❌|✖/g, "X")
      // keep printable ASCII + the WinAnsi punctuation jsPDF supports
      .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026·]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const cl = (v: any, fb = "—"): string => {
    if (v === null || v === undefined || v === "") return fb;
    if (typeof v === "object") return fb;
    const s = sanitize(String(v));
    return s || fb;
  };

  const n = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

  const hasMetricValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    const normalizedValue = String(value).trim().toLowerCase();
    return !["", "--", "—", "n/a", "na", "null", "undefined"].includes(normalizedValue);
  };

  const hasPageSpeedEvidence = (snapshot: any): boolean => {
    if (!snapshot || typeof snapshot !== "object") return false;

    const hasReturnedMetric = [
      snapshot?.lcp,
      snapshot?.fcp,
      snapshot?.cls,
      snapshot?.tbt,
      snapshot?.speedIndex,
    ].some(hasMetricValue);

    const score = n(snapshot?.score);
    return hasReturnedMetric || (score !== null && score > 0);
  };

  const mobileSnapshot = pdfData?.pageSpeed?.mobile || {};
  const desktopSnapshot = pdfData?.pageSpeed?.desktop || {};
  const mobilePageSpeedAvailable = hasPageSpeedEvidence(mobileSnapshot);
  const desktopPageSpeedAvailable = hasPageSpeedEvidence(desktopSnapshot);
  const mobilePerformanceScore = mobilePageSpeedAvailable
    ? n(mobileSnapshot?.score)
    : null;
  const desktopPerformanceScore = desktopPageSpeedAvailable
    ? n(desktopSnapshot?.score)
    : null;
  const configuredPrimaryDevice =
    String(
      pdfData?.auditConfig?.device ||
        pdfData?.searchContext?.device ||
        "mobile"
    ).toLowerCase() === "desktop"
      ? "desktop"
      : "mobile";
  const primaryPerformanceDevice =
    configuredPrimaryDevice === "desktop" && desktopPerformanceScore !== null
      ? "desktop"
      : configuredPrimaryDevice === "mobile" && mobilePerformanceScore !== null
        ? "mobile"
        : desktopPerformanceScore !== null
          ? "desktop"
          : mobilePerformanceScore !== null
            ? "mobile"
            : null;
  const primaryPerformanceScore =
    primaryPerformanceDevice === "desktop"
      ? desktopPerformanceScore
      : primaryPerformanceDevice === "mobile"
        ? mobilePerformanceScore
        : null;
  const primaryPerformanceLabel = primaryPerformanceDevice
    ? `${primaryPerformanceDevice === "desktop" ? "Desktop" : "Mobile"} Performance`
    : "Performance";

  const getPdfActionText = (item: any): string => {
    if (typeof item === "string") return item;

    return [
      item?.title,
      item?.detail,
      item?.description,
      item?.recommendation,
      item?.action,
      ...(Array.isArray(item?.evidence) ? item.evidence : []),
    ]
      .filter(Boolean)
      .join(" ");
  };

  const isValidPdfAction = (item: any): boolean => {
    const actionText = getPdfActionText(item);
    const isMobilePerformanceAction =
      /mobile/i.test(actionText) &&
      /(pagespeed|performance|loading|lcp|core web vitals)/i.test(actionText);

    return mobilePageSpeedAvailable || !isMobilePerformanceAction;
  };

  const fmt = (v: any): string =>
    formatCompactNumber(v, "—");

  // "$75.2K" instead of "75198.56722317677"
  const fmtMoney = (v: any): string =>
    formatCurrency(v, "USD", "—");

  // Competition arrives as 0.0099999997-style floats on a 0–1 scale
  const fmtCompetition = (v: any): string => {
    const x = n(v); if (x === null) return "—";
    if (x <= 1) {
      const pct = Math.round(x * 100);
      const lvl = pct >= 67 ? "High" : pct >= 34 ? "Medium" : "Low";
      return `${lvl} (${formatPercentage(pct, 0, "—")})`;
    }
    return String(Math.round(x));
  };

  // Catch raw float junk no matter where it slips in: if a string looks like
  // a long decimal number, round it sensibly.
  const fmtSmart = (v: any): string => {
    const s = cl(v);
    if (/^-?\d+\.\d{5,}$/.test(s)) {
      const x = Number(s);
      return x >= 1000 ? fmt(x) : String(Math.round(x * 100) / 100);
    }
    return s;
  };

  // Human labels for module execution statuses
  const statusLabel = (s: any): string => {
    const k = String(s || "").toLowerCase();
    if (k === "completed") return "Completed";
    if (k === "partial") return "Partial";
    if (k === "failed") return "Failed";
    if (k === "available") return "No data";
    if (k === "not_available" || k === "pending_or_not_available") return "Not in plan";
    if (k === "skipped") return "Skipped";
    return cl(s);
  };
  const statusMeaning = (s: any): string => {
    const k = String(s || "").toLowerCase();
    if (k === "completed") return "Data returned successfully";
    if (k === "partial") return "Some data returned, some unavailable";
    if (k === "failed") return "Module failed — see logs";
    if (k === "available") return "Module ran but the API returned no data";
    if (k === "not_available" || k === "pending_or_not_available") return "Not included in current plan";
    if (k === "skipped") return "Not selected for this audit";
    return "—";
  };
  const statusColor = (s: any): RGB => {
    const k = String(s || "").toLowerCase();
    if (k === "completed") return C.accent;
    if (k === "partial") return C.amber;
    if (k === "failed") return C.red;
    return C.muted;
  };

  const sCol = (s: any): RGB => { const x = n(s); if (x === null) return C.muted; if (x >= 75) return C.accent; if (x >= 55) return C.amber; return C.red; };
  const sLbl = (s: any): string => { const x = n(s); if (x === null) return "No Data"; if (x >= 90) return "Excellent"; if (x >= 75) return "Strong"; if (x >= 60) return "Moderate"; return "Needs Work"; };

  // ── OVERFLOW GUARDS (the heart of v2) ─────────────────────────────────

  // Truncate with an ellipsis so text NEVER exceeds maxW at current font.
  const ell = (text: string, maxW: number): string => {
    const t = cl(text, "");
    if (!t) return "—";
    if (doc.getTextWidth(t) <= maxW) return t;
    let lo = 0, hi = t.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (doc.getTextWidth(t.slice(0, mid) + "…") <= maxW) lo = mid; else hi = mid - 1;
    }
    return t.slice(0, Math.max(1, lo)).trimEnd() + "…";
  };

  // For URLs: keep the start and end, drop the middle.
  const ellMid = (text: string, maxW: number): string => {
    const t = cl(text, "");
    if (!t || doc.getTextWidth(t) <= maxW) return t || "—";
    let keep = Math.floor(t.length / 2);
    while (keep > 4) {
      const head = t.slice(0, Math.ceil(keep * 0.65));
      const tail = t.slice(t.length - Math.floor(keep * 0.35));
      const cand = head + "…" + tail;
      if (doc.getTextWidth(cand) <= maxW) return cand;
      keep -= 2;
    }
    return ell(t, maxW);
  };

  // Shrink the font until the text fits maxW (down to minSize), then
  // ellipsize whatever still doesn't fit. Returns the size to use.
  const fitSize = (text: string, maxW: number, maxSize: number, minSize: number, style: "bold" | "normal" = "bold"): number => {
    const t = cl(text, "");
    for (let s = maxSize; s >= minSize; s -= 0.5) {
      doc.setFont("helvetica", style); doc.setFontSize(s);
      if (doc.getTextWidth(t) <= maxW) return s;
    }
    return minSize;
  };

  // ── PAGE OPS ──────────────────────────────────────────────────────────
  const drawBg = () => { doc.setFillColor(...C.bg); doc.rect(0, 0, PW, PH, "F"); doc.setFillColor(...C.accent); doc.rect(0, 0, PW, 0.5, "F"); };

  // v2: takes the real page index and total — fixes the "Page 33 everywhere" bug
  const drawFooter = (pageIdx: number, total: number) => {
    const fp = PH - 10;
    doc.setDrawColor(...C.border); doc.setLineWidth(0.25); doc.line(ML, fp - 3, PW - MR, fp - 3);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text(ell(brandName, 70), ML, fp);
    doc.text(`Page ${pageIdx} of ${total}`, PW / 2, fp, { align: "center" });
    doc.text(generatedDate, PW - MR, fp, { align: "right" });
  };

  const newPage = () => { doc.addPage(); pageNum++; y = 20; drawBg(); };
  const ensure  = (needed = 30) => { if (y + needed > BOT) newPage(); };
  const gap     = (mm = 5) => { y += mm; };

  // ── TYPOGRAPHY (larger, higher contrast than v1) ──────────────────────
  const h1 = (t: string) => { ensure(14); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...C.white); doc.text(ell(t, CW), ML, y); y += 8; };
  const h2 = (t: string) => { ensure(10); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...C.white); doc.text(ell(t, CW), ML, y); y += 6; };
  const sub = (t: string) => { ensure(8); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...C.muted); const ls = doc.splitTextToSize(cl(t, ""), CW); doc.text(ls, ML, y); y += ls.length * 4.6 + 2; };
  const body_ = (t: string, x = ML, w = CW) => { ensure(8); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...C.soft); const ls = doc.splitTextToSize(cl(t, ""), w); doc.text(ls, x, y); y += ls.length * 5 + 2; };
  const lbl = (t: string, col: RGB = C.muted) => { doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...col); doc.text(ell(cl(t, "").toUpperCase(), CW), ML, y); y += 4; };
  const divLine = () => { ensure(4); doc.setDrawColor(...C.faint); doc.setLineWidth(0.2); doc.line(ML, y, PW - MR, y); y += 5; };

// ── SECTION HEADERS (v2.1: flow with the document, auto-numbered) ─────
  let secCounter = 0;
  const nextSec = () => String(++secCounter).padStart(2, "0");

  const secHdr = (num: string, title: string, subtitle?: string) => {
    // Start on the current page if there's room for the header plus a
    // meaningful amount of content; otherwise break to a fresh page.
    if (y > BOT - 75) { newPage(); } else { y += 8; }
    const bandH = 14;
    doc.setFillColor(...C.card); doc.roundedRect(ML, y, CW, bandH, 2, 2, "F");
    doc.setFillColor(...C.accent); doc.rect(ML, y, 3, bandH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.accent);
    doc.text(`SECTION ${num}`, ML + 7, y + 5.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.setTextColor(...C.white);
    doc.text(ell(cl(title), CW - 14), ML + 7, y + 11.5);
    y += bandH + 5;
    if (subtitle) { sub(subtitle); gap(1); }
  };

  const secTitle = (title: string, s?: string) => {
    ensure(20); gap(3);
    doc.setFillColor(...C.accent); doc.rect(ML, y - 1, 2.5, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...C.white); doc.text(ell(cl(title), CW - 10), ML + 6, y + 5.5);
    y += 11; if (s) { sub(s); } gap(2);
  };

  // ── KPI CARD ROW (auto-fit values — nothing can overflow) ─────────────
  const kpiRow = (cards: { label: string; value: any; sub?: string; col?: RGB }[]) => {
    const H = 28;
    ensure(H + 4);
    const count = cards.length, g3 = 3, w = (CW - g3 * (count - 1)) / count;
    cards.forEach((c, i) => {
      const x = ML + i * (w + g3), yy = y;
      const inner = w - 8; // 4mm padding each side
      doc.setFillColor(...C.card); doc.setDrawColor(...C.border); doc.roundedRect(x, yy, w, H, 2, 2, "FD");
      const col = c.col || sCol(c.value);
      doc.setFillColor(...col); doc.roundedRect(x, yy, w, 1.5, 0.5, 0.5, "F");

      // label — single line, ellipsized
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted);
      doc.text(ell(cl(c.label, "").toUpperCase(), inner), x + 4, yy + 7);

      // value — shrink to fit (15pt → 8pt), then ellipsize; floats formatted
      const valText = fmtSmart(c.value ?? "—");
      const vs = fitSize(valText, inner, 15, 8, "bold");
      doc.setFont("helvetica", "bold"); doc.setFontSize(vs); doc.setTextColor(...col);
      doc.text(ell(valText, inner), x + 4, yy + 17);

      // sub — single line, ellipsized
      if (c.sub) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted);
        doc.text(ell(cl(c.sub, ""), inner), x + 4, yy + 23.5);
      }
    });
    y += H + 4;
  };

  // ── SCORE BAR ─────────────────────────────────────────────────────────
  const scoreBar = (lbl_: string, score: any, note = "") => {
    ensure(19); const s = clamp(n(score) ?? 0), col = sCol(score), fw = (CW * s) / 100;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...C.soft); doc.text(ell(cl(lbl_), CW - 50), ML, y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...col); doc.text(`${s}/100  ${sLbl(score)}`, PW - MR, y, { align: "right" });
    y += 4;
    doc.setFillColor(18, 43, 78); doc.roundedRect(ML, y, CW, 6.5, 2, 2, "F");
    if (fw > 0) { doc.setFillColor(...col); doc.roundedRect(ML, y, fw, 6.5, 2, 2, "F"); }
    if (note) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(ell(cl(note), CW), PW - MR, y + 10.5, { align: "right" }); }
    y += 15;
  };

  // ── HIGHLIGHT BOX (auto-height — text always fits inside) ─────────────
  type BoxType = "green" | "amber" | "red" | "blue" | "muted";
  const hiBox = (title: string, body: string, type: BoxType = "green") => {
    const cmap: Record<BoxType, RGB> = { green: C.accent, amber: C.amber, red: C.red, blue: C.blue, muted: C.muted };
    const col = cmap[type];
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const lines = doc.splitTextToSize(cl(body, ""), CW - 14).slice(0, 4); // up to 4 lines
    const h = 12 + lines.length * 4.3;
    ensure(h + 5);
    doc.setFillColor(...C.card2); doc.setDrawColor(...C.border); doc.roundedRect(ML, y, CW, h, 2, 2, "FD");
    doc.setFillColor(...col); doc.roundedRect(ML, y, 2.5, h, 1, 1, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...col); doc.text(ell(cl(title), CW - 14), ML + 7, y + 7);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.soft);
    doc.text(lines, ML + 7, y + 13);
    y += h + 4;
  };

  // ── DATA TABLE (per-cell ellipsis, URL-aware, wrapping first column) ──
  type TR = { col1: string; col2: string; col3?: string; col4?: string; col5?: string; col6?: string; col7?: string };
  const tbl = (headers: string[], rows: TR[], colW?: number[]) => {
    if (!rows.length) { body_("No data available."); return; }
    const nc = headers.length;
    const def = colW || (
      nc === 2 ? [70, CW - 70] :
      nc === 3 ? [55, 55, CW - 110] :
      nc === 4 ? [40, 55, 48, CW - 143] :
      Array(nc).fill(CW / nc)
    );
    const keys = (["col1", "col2", "col3", "col4", "col5", "col6", "col7"] as (keyof TR)[]).slice(0, nc);

    // header
    ensure(14);
    doc.setFillColor(24, 24, 24); doc.setDrawColor(...C.border); doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, "FD");
    let cx = ML;
    headers.forEach((h_, i) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.accent);
      doc.text(ell(cl(h_).toUpperCase(), def[i] - 6), cx + 4, y + 6);
      cx += def[i];
    });
    y += 9;

    rows.forEach((row, ri) => {
      // First column may wrap to two lines; measure first
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      const firstVal = fmtSmart(row.col1 ?? "");
      const firstLines = doc.splitTextToSize(firstVal, def[0] - 6).slice(0, 2);
      const rh = firstLines.length > 1 ? 12.5 : 9;
      ensure(rh + 2);

      doc.setFillColor(...(ri % 2 === 0 ? C.card : C.card2)); doc.setDrawColor(...C.faint); doc.rect(ML, y, CW, rh, "FD");
      cx = ML;
      keys.forEach((k, ci) => {
        const raw = fmtSmart(row[k] ?? "");
        const cellW = def[ci] - 6;
        if (ci === 0) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.soft);
          const ls = firstLines.map((l: string, li: number) => li === firstLines.length - 1 ? ell(l, cellW) : l);
          doc.text(ls, cx + 4, y + 5.8);
        } else {
          const looksUrl = /^https?:\/\//.test(raw) || raw.length > 45;
          doc.setFont("helvetica", "normal"); doc.setFontSize(looksUrl ? 6.5 : 7.5); doc.setTextColor(...C.muted);
          doc.text(looksUrl ? ellMid(raw, cellW) : ell(raw, cellW), cx + 4, y + 5.8);
        }
        cx += def[ci];
      });
y += rh;
    });
    y += 5;
  };

  // ── WRAPPING TABLE — last column wraps to multiple lines instead of
  // being ellipsized. Use for tables where the final column is the most
  // important content (e.g. AI response snippets). ─────────────────────
  const tblWrap = (headers: string[], rows: TR[], colW: number[], maxLines = 4) => {
    if (!rows.length) { body_("No data available."); return; }
    const nc = headers.length;
    const def = colW;
    const keys = (["col1", "col2", "col3", "col4", "col5", "col6", "col7"] as (keyof TR)[]).slice(0, nc);
    const lastIdx = nc - 1;

    // header
    ensure(14);
    doc.setFillColor(24, 24, 24); doc.setDrawColor(...C.border); doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, "FD");
    let cx = ML;
    headers.forEach((h_, i) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.accent);
      doc.text(ell(cl(h_).toUpperCase(), def[i] - 6), cx + 4, y + 6);
      cx += def[i];
    });
    y += 9;

    rows.forEach((row, ri) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      const lastVal = fmtSmart(row[keys[lastIdx]] ?? "");
      const lastLines = doc.splitTextToSize(lastVal, def[lastIdx] - 6).slice(0, maxLines);
      const lineH = 4.2;
      const rh = Math.max(9, lastLines.length * lineH + 4);
      ensure(rh + 2);

      doc.setFillColor(...(ri % 2 === 0 ? C.card : C.card2)); doc.setDrawColor(...C.faint); doc.rect(ML, y, CW, rh, "FD");
      cx = ML;
      keys.forEach((k, ci) => {
        const raw = fmtSmart(row[k] ?? "");
        const cellW = def[ci] - 6;
        const cellY = y + 5.8; // first line baseline, regardless of row height
        if (ci === lastIdx) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
          doc.text(lastLines, cx + 4, cellY);
        } else if (ci === 0) {
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...C.soft);
          doc.text(ell(raw, cellW), cx + 4, cellY);
        } else {
          doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
          doc.text(ell(raw, cellW), cx + 4, cellY);
        }
        cx += def[ci];
      });
      y += rh;
    });
    y += 5;
  };

  // ── ACTION CARD (auto-height; title never collides with the badge) ────
  const actCard = (title: string, impact: string, timeline: string, detail: string, pri?: "high" | "medium" | "low") => {
    const pc: RGB = pri === "high" ? C.red : pri === "low" ? C.blue : C.amber;

    // measure badge
    const badgeText = `${cl(impact, "Medium")}  ·  ${cl(timeline, "30 days")}`;
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
    const badgeW = Math.min(60, doc.getTextWidth(badgeText) + 8);

    // measure detail
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const detailLines = doc.splitTextToSize(cl(detail, ""), CW - 18).slice(0, 3);
    const h = 14 + detailLines.length * 4.3;
    ensure(h + 5);

    doc.setFillColor(...C.card); doc.setDrawColor(...C.border); doc.roundedRect(ML, y, CW, h, 2, 2, "FD");
    doc.setFillColor(...pc); doc.roundedRect(ML, y, 3, h, 1, 1, "F");

    const bx = PW - MR - badgeW - 3;
    doc.setFillColor(28, 28, 28); doc.roundedRect(bx, y + 3.5, badgeW, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...pc);
    doc.text(ell(badgeText, badgeW - 6), bx + 3, y + 8);

    // title gets only the space LEFT of the badge — overlap is impossible
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...C.white);
    doc.text(ell(cl(title), bx - ML - 14), ML + 8, y + 9);

    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text(detailLines, ML + 8, y + 15.5);
    y += h + 4;
  };

  // ── PILL ──────────────────────────────────────────────────────────────
  const pill_ = (text: string, x: number, yy: number): number => {
    const t = ell(cl(text), 40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(6);
    const w = Math.max(20, doc.getTextWidth(t.toUpperCase()) + 10);
    doc.setFillColor(20, 20, 20); doc.setDrawColor(...C.border); doc.roundedRect(x, yy, w, 7, 2, 2, "FD");
    doc.setTextColor(...C.accent); doc.text(t.toUpperCase(), x + 5, yy + 4.8);
    return w + 3;
  };

  // ── MINI GAUGE ────────────────────────────────────────────────────────
  const gauge = (cx: number, cy: number, r: number, score: number, col: RGB) => {
    doc.setFillColor(24, 24, 24); doc.circle(cx, cy, r, "F");
    const pct = clamp(score) / 100, steps = 48, sa = -Math.PI / 2, ea = sa + pct * 2 * Math.PI;
    doc.setDrawColor(...col); doc.setLineWidth(2);
    for (let i = 0; i < steps; i++) {
      const t1 = sa + (i / steps) * (ea - sa), t2 = sa + ((i + 1) / steps) * (ea - sa);
      doc.line(cx + (r - 1.5) * Math.cos(t1), cy + (r - 1.5) * Math.sin(t1), cx + (r - 1.5) * Math.cos(t2), cy + (r - 1.5) * Math.sin(t2));
    }
    doc.setFillColor(...C.bg); doc.circle(cx, cy, r - 3.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...col); doc.text(String(score), cx, cy + 2.8, { align: "center" });
  };

  // ── pdfShouldShow ─────────────────────────────────────────────────────
  const pdfShow = (sec: string): boolean => {
    if (!selectedModules || !selectedModules.length) return true;
    if (selectedModules.includes("full")) return true;
    const map: Record<string, string[]> = { seo: ["seo", "technical"], technical: ["seo", "technical"], traffic: ["traffic"], competitors: ["competitors"], keywords: ["keywords"], backlinks: ["backlinks"], ai: ["ai"], recommendations: ["recommendations"], local: ["local", "localSeo"], content: ["content"], serp: ["seo", "technical", "keywords"], domainAnalytics: ["traffic"], labs: ["keywords", "competitors"] };
    return (map[sec] || []).some(m => selectedModules.includes(m));
  };

  const pdfSections = {
    traffic: pdfShow("traffic"),
    domainAnalytics: pdfShow("domainAnalytics"),
    seo: pdfShow("seo"),
    technical: pdfShow("technical"),
    technicalCrawl:
      pdfShow("technical") &&
      Boolean(pdfData?.onPage),
    ai:
      pdfShow("ai") &&
      Boolean(
        pdfData?.aiSearchVisibility ||
        pdfData?.aiVisibility
      ),
    competitors:
      pdfShow("competitors") &&
      Array.isArray(pdfData?.competitors) &&
      pdfData.competitors.length > 0,
    keywords: pdfShow("keywords") || pdfShow("labs"),
    keywordResearch:
      pdfShow("keywords") &&
      Array.isArray(pdfData?.keywordResearch?.suggestions) &&
      pdfData.keywordResearch.suggestions.length > 0,
    serp: pdfShow("serp") && Boolean(pdfData?.serpData),
    backlinks: pdfShow("backlinks") && Boolean(pdfData?.backlinks),
    content: pdfShow("content"),
    local:
      pdfShow("local") &&
      Array.isArray(pdfData?.businessData?.listings) &&
      pdfData.businessData.listings.length > 0,
    recommendations: pdfShow("recommendations"),
  };

  // ── simpleList ────────────────────────────────────────────────────────
  const simpleList = (items: any[], empty = "No items available.") => {
    const safe = Array.isArray(items) ? items : [];
    if (!safe.length) { body_(empty); return; }

    safe.slice(0, 10).forEach((item: any, i: number) => {
      const title = cl(
        item?.title ||
          item?.issue ||
          item?.keyword ||
          item?.domain ||
          `Item ${i + 1}`
      );

      const rawImpact = String(
        item?.severity ||
          item?.priority ||
          item?.impact ||
          "Medium"
      ).trim();

      const impactLabel = /critical|high/i.test(rawImpact)
        ? "High"
        : /low/i.test(rawImpact)
          ? "Low"
          : "Medium";

      const descriptiveImpact =
        item?.impact &&
        !/^(critical|high|medium|low)$/i.test(String(item.impact).trim())
          ? item.impact
          : null;

      const detailParts = [
        item?.detail,
        item?.description,
        descriptiveImpact,
        item?.fix,
        item?.recommendation,
        item?.action,
        item?.summary,
      ]
        .filter(Boolean)
        .map((value: any) => cl(value, ""))
        .filter(Boolean);

      const detail = detailParts.length
        ? Array.from(new Set(detailParts)).join(" Recommended action: ")
        : "Review this item and validate the affected page.";

      actCard(
        title,
        impactLabel,
        item?.timeline || "0–30 days",
        detail,
        impactLabel === "High"
          ? "high"
          : impactLabel === "Low"
            ? "low"
            : "medium"
      );
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
  // pills — wrap every selected module instead of clipping the final pill
  const coverModuleLabels: Record<string, string> = {
    seo: "SEO",
    technical: "Technical SEO",
    traffic: "Traffic",
    keywords: "Keywords",
    competitors: "Competitors",
    ai: "AI Visibility",
    backlinks: "Backlinks",
    recommendations: "Recommendations",
    localSeo: "Local SEO",
    content: "Content",
    serp: "SERP",
  };
  const coverModules = Array.from(
    new Set(
      selectedModules.length
        ? selectedModules
        : ["seo", "traffic", "ai", "competitors"]
    )
  );
  let px = ML + 8;
  let py = 138;
  coverModules.forEach((moduleKey: string) => {
    const moduleLabel = coverModuleLabels[moduleKey] || moduleKey;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    const safeLabel = ell(cl(moduleLabel), 40);
    const estimatedAdvance =
      Math.max(20, doc.getTextWidth(safeLabel.toUpperCase()) + 10) + 5;

    if (px + estimatedAdvance > PW - MR - 4) {
      px = ML + 8;
      py += 9;
    }

    px += pill_(moduleLabel, px, py) + 2;
  });

  // gauges — use verified PageSpeed for the configured primary device
  const gscores = [
    { l: "Overall", v: n(normalized.scores.overall) },
    { l: "SEO", v: n(normalized.scores.seo) },
    {
      l: primaryPerformanceDevice === "desktop"
        ? "Desktop Speed"
        : primaryPerformanceDevice === "mobile"
          ? "Mobile Speed"
          : "Speed",
      v: primaryPerformanceScore,
    },
    { l: "AI", v: n(normalized.scores.ai) },
  ];
  const gyY = py + 22;
  const ggap = CW / 4;
  gscores.forEach((gs, i) => {
    const gx = ML + i * ggap + ggap / 2;
    const score = n(gs.v);

    if (score === null) {
      doc.setFillColor(24, 24, 24);
      doc.circle(gx, gyY + 10, 11, "F");
      doc.setFillColor(...C.bg);
      doc.circle(gx, gyY + 10, 7.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.muted);
      doc.text("N/A", gx, gyY + 12, { align: "center" });
    } else {
      gauge(gx, gyY + 10, 11, score, sCol(score));
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text(gs.l.toUpperCase(), gx, gyY + 25, { align: "center" });
  });

  // tagline
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
  doc.text(doc.splitTextToSize("This report translates technical audit data into clear business intelligence — what is working, what is at risk, and what to prioritise first.",CW),ML,gyY + 40);
  // bottom bar
  doc.setFillColor(...C.card); doc.rect(0,PH-20,PW,20,"F"); doc.setFillColor(...C.accent); doc.rect(0,PH-1.5,PW,1.5,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text(`${brandName}  ·  ${tagline}`,ML,PH-8); doc.setTextColor(...C.accent); doc.text("Page 1",PW-MR,PH-8,{align:"right"});

  // ════════════════════════════════════════════════════════════════════
  //  PAGE 2 — TABLE OF CONTENTS
  // ════════════════════════════════════════════════════════════════════
  newPage(); lbl("REPORT CONTENTS",C.accent); gap(4); h1("Table of Contents");
sub("From executive summary to action roadmap — everything your team needs to turn this audit into growth.");
  divLine();
  let tocNo = 0;
  const tocN = () => String(++tocNo).padStart(2,"0");
  const toc = [
    [tocN(),"Executive Snapshot","Reconciled scores, risks, opportunities, and confidence"],
    [tocN(),"Audit Methodology & Scope","URLs, market, language, device, search engine, and crawl limits"],
    ...(pdfSections.traffic
      ? [[tocN(),"Organic Traffic Intelligence","Canonical modeled traffic and keyword footprint"]]
      : []),
    ...(pdfSections.domainAnalytics
      ? [[tocN(),"Domain Analytics — Provider Signals","Separate provider metrics excluded from executive traffic"]]
      : []),
    ...(pdfSections.seo
      ? [[tocN(),"SEO Foundation","Resolved homepage metadata, headings, and ALT signals"]]
      : []),
    ...(pdfSections.technical
      ? [[tocN(),"Performance & Core Web Vitals","PageSpeed scores, LCP, CLS, FCP, and TBT"]]
      : []),
    ...(pdfSections.ai
      ? [[tocN(),"AI Search Visibility","Unbranded prompts across ChatGPT, Claude, and Gemini"]]
      : []),
    ...(pdfSections.competitors
      ? [[tocN(),"Competitor Intelligence","Threat scores, shared keywords, and evidence"]]
      : []),
    ...(pdfSections.keywords
      ? [[tocN(),"Keyword Gap & Labs","Non-branded gaps, opportunities, and content ideas"]]
      : []),
    ...(pdfSections.keywordResearch
      ? [[tocN(),"Keyword Research","Seed keyword suggestions and intent signals"]]
      : []),
    ...(pdfSections.serp
      ? [[tocN(),"SERP Rankings","Live Google rank positions per keyword"]]
      : []),
    ...(pdfSections.backlinks
      ? [[tocN(),"Backlink Authority","Referring domains and backlink evidence"]]
      : []),
    ...(pdfSections.technicalCrawl
      ? [[tocN(),"Technical SEO Audit","Final crawl state, coverage, and page-level evidence"]]
      : []),
    ...(pdfSections.content
      ? [[tocN(),"Content Quality","Audited-site content signals and evidence"]]
      : []),
    ...(pdfSections.local
      ? [[tocN(),"Local SEO","Business listings, ratings, and reviews"]]
      : []),
    ...(pdfSections.recommendations
      ? [[tocN(),"Recommendations","Prioritised actions from reconciled evidence"]]
      : []),
    [tocN(),"Action Roadmap","Issue-driven 30/60/90 day execution plan"],
    [tocN(),"Benchmark Reference","What each score means and what to aim for"],
  ];
  toc.forEach(([num,t,d],i)=>{
    ensure(10); const ry=y;
    if(i%2===0){doc.setFillColor(14,14,14);doc.rect(ML,ry-1,CW,9,"F");}
    doc.setFillColor(...C.card2); doc.circle(ML+4,ry+3,3.5,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(6); doc.setTextColor(...C.accent); doc.text(num,ML+4,ry+4.5,{align:"center"});

    const titleText = ell(cl(t), 78);
    const descriptionText = ell(cl(d), 78);

    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...C.soft); doc.text(titleText,ML+12,ry+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(...C.muted); doc.text(descriptionText,PW-MR,ry+5,{align:"right"});

    const tx=ML+12+doc.getTextWidth(titleText)+2;
    const rx=PW-MR-doc.getTextWidth(descriptionText)-2;
    doc.setFillColor(...C.faint); if(rx>tx+4){for(let dx=tx;dx<rx;dx+=3)doc.circle(dx,ry+4,0.25,"F");}
    y+=9;
  });
  gap(5); divLine();
  body_("Traffic, keyword, and AI visibility estimates are directional intelligence derived from keyword visibility and CTR modelling. They should not be read as exact analytics data.");

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 01 — EXECUTIVE SNAPSHOT
  // ════════════════════════════════════════════════════════════════════
  secHdr(nextSec(),"Executive Snapshot","High-level digital health, benchmark scores, and primary business risks at a glance.");
  kpiRow([
    {label:"Overall Score",value:`${cl(String(normalized.scores.overall??"—"))}/100`,sub:sLbl(normalized.scores.overall),col:sCol(normalized.scores.overall)},
    {label:"SEO Foundation",value:`${cl(String(normalized.scores.seo??"—"))}/100`,sub:sLbl(normalized.scores.seo),col:sCol(normalized.scores.seo)},
    {
      label: primaryPerformanceLabel,
      value: primaryPerformanceScore !== null
        ? `${cl(String(primaryPerformanceScore))}/100`
        : "Unavailable",
      sub: primaryPerformanceScore !== null
        ? sLbl(primaryPerformanceScore)
        : "No verified PageSpeed result",
      col: primaryPerformanceScore !== null
        ? sCol(primaryPerformanceScore)
        : C.muted,
    },
    {label:"AI Visibility",value:`${cl(String(normalized.scores.ai??"—"))}/100`,sub:sLbl(normalized.scores.ai),col:sCol(normalized.scores.ai)},
  ]);
  kpiRow([
    {label:"Share of Voice",value:`${Number(pdfData?.aiSearchVisibility?.shareOfVoice ?? 0)}%`,sub:"Brand vs competitor mentions",col:C.blue},
    {label:"Est. Monthly Traffic",value:fmt(pdfData?.traffic?.rawMonthly??pdfData?.traffic?.monthly),sub:`Confidence: ${cl(normalized.traffic.confidence)}`,col:C.accent},
    {label:"Organic Keywords",value:fmt(pdfData?.dataforseo?.organicKeywords),sub:"Ranking keywords",col:C.amber},
    {label:"Referring Domains",value:fmt(pdfData?.backlinks?.referringDomains),sub:"Link authority",col:C.blue},
  ]);
  secTitle("Visual Score Breakdown");
  scoreBar("Overall Growth Score",normalized.scores.overall,"Benchmark: 80+ recommended");
  scoreBar("SEO Foundation",normalized.scores.seo,"Benchmark: 80+ recommended");
  if (primaryPerformanceScore !== null) {
    scoreBar(primaryPerformanceLabel, primaryPerformanceScore, "Benchmark: 75+ recommended");
  } else {
    hiBox(
      "Performance Data Unavailable",
      "No verified PageSpeed score was returned for the tested device, so the PDF does not convert the missing result into a zero score.",
      "muted"
    );
  }
  scoreBar("AI Visibility",normalized.scores.ai,"Benchmark: 70+ recommended");
  gap(3); divLine();
  secTitle("Key Business Insights");
  normalized.executiveCards?.forEach((card:any)=>{ const imp=String(card.impact||"medium").toLowerCase(); hiBox(card.title,card.detail,imp.includes("high")?"red":imp.includes("low")?"blue":"amber"); });
  ensure(50); secTitle("Biggest Risk & Opportunity");
hiBox("Biggest Risk",cl(normalized.summary.biggestIssue),"red");
  hiBox("Biggest Opportunity",cl(normalized.summary.biggestOpportunity),"green");
  if (pdfData?.clientReview?.clientNote) {
    hiBox(
      "Client Note",
      cl(pdfData.clientReview.clientNote),
      "blue"
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  AUDIT METHODOLOGY & SCOPE
  // ════════════════════════════════════════════════════════════════════
  secHdr(
    nextSec(),
    "Audit Methodology & Scope",
    "The exact market and crawl settings used for this audit. These settings are part of the audit identity and comparison rules."
  );
  tbl(
    ["Setting", "Value", "Meaning"],
    [
      { col1: "Submitted URL", col2: cl(pdfData?.submittedUrl || pdfData?.url), col3: "The URL entered when the audit started" },
      { col1: "Resolved URL", col2: cl(pdfData?.resolvedUrl), col3: "The final URL after HTTP redirects" },
      { col1: "Canonical URL", col2: cl(pdfData?.canonicalUrl), col3: "The canonical page declared by the resolved page" },
      { col1: "Redirect Count", col2: cl(String(pdfData?.redirectCount ?? 0)), col3: "Redirect hops followed before analysis" },
      { col1: "Country", col2: cl(pdfData?.auditConfig?.countryName || pdfData?.searchContext?.country), col3: "Market used for keyword, SERP, local, and AI context" },
      { col1: "Language", col2: cl(pdfData?.auditConfig?.languageName || pdfData?.searchContext?.language), col3: "Language used for search and prompt context" },
      { col1: "Primary Device", col2: cl(pdfData?.auditConfig?.device || pdfData?.searchContext?.device), col3: "Device used for SERP and primary scope interpretation" },
      { col1: "Search Engine", col2: cl(pdfData?.auditConfig?.searchEngine || "google"), col3: "Primary search engine used by supported search modules" },
      { col1: "Crawl Limit", col2: `${fmt(pdfData?.auditConfig?.maxCrawlPages || pdfData?.onPage?.pageLimit || 100)} pages`, col3: "Maximum pages requested from the technical crawler" },
    ],
    [42, 72, CW - 114]
  );

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 03 — ORGANIC TRAFFIC
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.traffic){
    secHdr(nextSec(),"Organic Traffic Intelligence","Modelled from ranked keyword visibility and CTR curves. Treat as directional organic visibility, not exact analytics data.");
    kpiRow([
      {label:"Est. Monthly Visits",value:fmt(pdfData?.traffic?.rawMonthly??pdfData?.traffic?.monthly),sub:`Confidence: ${cl(normalized.traffic.confidence)}`,col:C.accent},
      {label:"Daily Visits",value:fmt(normalized.traffic.daily),sub:"Monthly ÷ 30",col:C.blue},
      {label:"Keyword Footprint",value:fmt(normalized.traffic.keywordCount),sub:"Ranked keywords",col:C.amber},
      {label:"Traffic Score",value:cl(String(pdfData?.traffic?.score??"—")),sub:"High / Medium / Low",col:sCol(pdfData?.traffic?.score==="High"?85:pdfData?.traffic?.score==="Medium"?60:30)},
    ]);
    if(pdfData?.traffic?.confidence==="insufficient-data"){
      hiBox("Insufficient Traffic Data","Fewer than 50 ranked keywords found. Increase keyword visibility to improve confidence.","amber");
    }
    secTitle("Traffic Intelligence Summary");
    tblWrap(["Metric","Value","Notes"],[
      {col1:"Est. Monthly Visits",col2:fmt(pdfData?.traffic?.rawMonthly??pdfData?.traffic?.monthly),col3:"Organic visibility estimate"},
      {col1:"Est. Daily Visits",col2:fmt(normalized.traffic.daily),col3:"Monthly ÷ 30"},
      {col1:"Keyword Footprint",col2:fmt(normalized.traffic.keywordCount),col3:"500+ moderate, 2,000+ strong"},
      {col1:"Filtered Keywords",col2:fmt(pdfData?.traffic?.filteredKeywordCount),col3:"Low-volume (<10) removed"},
      {col1:"Confidence",col2:cl(normalized.traffic.confidence),col3:"High requires 2,000+ ranked keywords"},
      {col1:"Data Method",col2:cl(pdfData?.traffic?.method??"CTR curve"),col3:"Clickstream ETV -> CTR fallback"},
      {col1:"Traffic Note",col2:"Disclosure",col3:cl(pdfData?.traffic?.note??"Modelled estimate; this is directional intelligence rather than verified analytics data.")},
    ],[45,35,CW-80],3);
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
}

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 04 — DOMAIN ANALYTICS
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.domainAnalytics){
    secHdr(nextSec(),"Domain Analytics — Provider Signals","Separate organic and paid provider signals. These figures do not replace the canonical Traffic Intelligence estimate.");
    kpiRow([
      {label:"Organic Keywords",value:fmt(pdfData?.domainAnalytics?.organicKeywords),col:C.accent},
      {label:"Organic Traffic Signal",value:fmt(pdfData?.domainAnalytics?.organicTrafficSignal??pdfData?.domainAnalytics?.organicTraffic),col:C.green},
      {label:"Organic Cost",value:fmtMoney(pdfData?.domainAnalytics?.organicCost),col:C.muted},
      {label:"Paid Keywords",value:fmt(pdfData?.domainAnalytics?.paidKeywords),col:C.blue},
    ]);
    tbl(["Metric","Organic","Paid"],[
      {col1:"Keywords",col2:fmt(pdfData?.domainAnalytics?.organicKeywords),col3:fmt(pdfData?.domainAnalytics?.paidKeywords)},
      {col1:"Traffic Signal",col2:fmt(pdfData?.domainAnalytics?.organicTrafficSignal??pdfData?.domainAnalytics?.organicTraffic),col3:fmt(pdfData?.domainAnalytics?.paidTraffic)},
      {col1:"Cost",col2:fmtMoney(pdfData?.domainAnalytics?.organicCost),col3:fmtMoney(pdfData?.domainAnalytics?.paidCost)},
    ],[40,50,CW-90]);
    body_("Use this section to understand whether the domain relies more on organic discovery or paid acquisition for its current visibility.");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 05 — SEO FOUNDATION
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.seo){
    secHdr(nextSec(),"SEO Foundation Audit","Core SEO elements: metadata, heading structure, alt text, and basic on-page signals.");
    kpiRow([
      {label:"SEO Score",value:`${cl(String(pdfData?.seoScore??"—"))}/100`,sub:sLbl(pdfData?.seoScore),col:sCol(pdfData?.seoScore)},
      {label:"UX Score",value:`${cl(String(pdfData?.uxScore??"—"))}/100`,sub:sLbl(pdfData?.uxScore),col:sCol(pdfData?.uxScore)},
      {label:"Page Title",value:normalized.seo.title?"Found":"Missing",sub:normalized.seo.title?"Detected":"Not detected",col:normalized.seo.title?C.accent:C.red},
      {label:"Meta Description",value:normalized.seo.metaDescription?"Found":"Missing",sub:normalized.seo.metaDescription?"Detected":"Not detected",col:normalized.seo.metaDescription?C.accent:C.red},
    ]);
    secTitle("On-Page SEO Check");
    tbl(["Element","Status","Recommendation"],[
      {col1:"Page Title",col2:cl(normalized.seo.title,"Not detected"),col3:"Unique, 50–60 chars, includes primary keyword"},
      {col1:"Meta Description",col2:cl(normalized.seo.metaDescription,"Not detected"),col3:"Unique, 140–160 chars, includes CTA"},
      {col1:"H1 Heading",col2:cl(normalized.seo.h1,"Not detected"),col3:"One clear H1 defining main topic or offer"},
      {col1:"Image ALT Text",col2:cl(normalized.seo.missingAlt,"Not checked"),col3:"Descriptive ALT on all important images"},
    ],[38,60,CW-98]);
    if(normalized.seo.title){
      secTitle("Detected Page Title");
      hiBox("Page Title",cl(normalized.seo.title),"blue");
    }
    if(normalized.seo.metaDescription){
      secTitle("Detected Meta Description");
      hiBox("Meta Description",cl(normalized.seo.metaDescription),"blue");
    }
    if(pdfData?.issues?.length){


      secTitle("Priority SEO Issues");
      simpleList(pdfData.issues.slice(0,8),"No SEO issues returned.");
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 06 — PERFORMANCE & CORE WEB VITALS
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.technical){
    secHdr(nextSec(),"Performance & Core Web Vitals","PageSpeed scores and Core Web Vitals from Google PageSpeed Insights API.");
    const mob = mobileSnapshot;
    const dsk = desktopSnapshot;

    kpiRow([
      {
        label:"Mobile Score",
        value:mobilePerformanceScore !== null ? `${mobilePerformanceScore}/100` : "Unavailable",
        sub:mobilePerformanceScore !== null ? sLbl(mobilePerformanceScore) : "No verified mobile result",
        col:mobilePerformanceScore !== null ? sCol(mobilePerformanceScore) : C.muted,
      },
      {
        label:"Desktop Score",
        value:desktopPerformanceScore !== null ? `${desktopPerformanceScore}/100` : "Unavailable",
        sub:desktopPerformanceScore !== null ? sLbl(desktopPerformanceScore) : "No verified desktop result",
        col:desktopPerformanceScore !== null ? sCol(desktopPerformanceScore) : C.muted,
      },
      {
        label:"LCP (Mobile)",
        value:mobilePageSpeedAvailable ? cl(mob.lcp,"—") : "Unavailable",
        sub:"Target: < 2.5s",
        col:mobilePageSpeedAvailable ? C.blue : C.muted,
      },
      {
        label:"CLS (Mobile)",
        value:mobilePageSpeedAvailable ? cl(mob.cls,"—") : "Unavailable",
        sub:"Target: < 0.1",
        col:mobilePageSpeedAvailable ? C.blue : C.muted,
      },
    ]);

    if (mobilePerformanceScore !== null) {
      scoreBar("Mobile Performance",mobilePerformanceScore,"Target 75+ for ranking advantage");
    } else {
      hiBox(
        "Mobile PageSpeed Unavailable",
        "Google PageSpeed did not return a usable mobile score or mobile Core Web Vitals for this run. Missing data is shown as unavailable rather than 0/100.",
        "muted"
      );
    }

    if (desktopPerformanceScore !== null) {
      scoreBar("Desktop Performance",desktopPerformanceScore,"Target 90+ for premium experience");
    } else {
      hiBox(
        "Desktop PageSpeed Unavailable",
        "Google PageSpeed did not return a usable desktop score for this run.",
        "muted"
      );
    }

    secTitle("Core Web Vitals — Mobile vs Desktop");
    tbl(["Metric","Mobile","Desktop","Target"],[
      {
        col1:"Performance Score",
        col2:mobilePerformanceScore !== null ? String(mobilePerformanceScore) : "Unavailable",
        col3:desktopPerformanceScore !== null ? String(desktopPerformanceScore) : "Unavailable",
        col4:"75+ good, 90+ excellent",
      },
      {col1:"LCP",col2:mobilePageSpeedAvailable?cl(mob.lcp,"—"):"Unavailable",col3:desktopPageSpeedAvailable?cl(dsk.lcp,"—"):"Unavailable",col4:"Under 2.5 seconds"},
      {col1:"FCP",col2:mobilePageSpeedAvailable?cl(mob.fcp,"—"):"Unavailable",col3:desktopPageSpeedAvailable?cl(dsk.fcp,"—"):"Unavailable",col4:"Under 1.8 seconds"},
      {col1:"CLS",col2:mobilePageSpeedAvailable?cl(mob.cls,"—"):"Unavailable",col3:desktopPageSpeedAvailable?cl(dsk.cls,"—"):"Unavailable",col4:"Under 0.1"},
      {col1:"TBT",col2:mobilePageSpeedAvailable?cl(mob.tbt,"—"):"Unavailable",col3:desktopPageSpeedAvailable?cl(dsk.tbt,"—"):"Unavailable",col4:"Under 200ms"},
      {col1:"Speed Index",col2:mobilePageSpeedAvailable?cl(mob.speedIndex,"—"):"Unavailable",col3:desktopPageSpeedAvailable?cl(dsk.speedIndex,"—"):"Unavailable",col4:"Under 3.4 seconds"},
    ],[40,33,33,CW-106]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 07 — AI VISIBILITY
  // ════════════════════════════════════════════════════════════════════
    if(pdfSections.ai){
    secHdr(nextSec(),"AI Search Visibility & GEO Readiness","Brand discoverability in AI-generated responses, generative search, and answer engines.");
    // 🆕 LIVE AI MODEL VISIBILITY (ChatGPT, Claude, Gemini)
    if (pdfData?.aiSearchVisibility) {
      const av = pdfData.aiSearchVisibility;
      secTitle("Live AI Model Visibility", `Market: ${cl(av.country, "US")} · Models: ${cl((av.modelsCalled||[]).join(", "), "—")}`);
      kpiRow([
        { label: "AI Awareness", value: `${av.brandKnowledge?.score ?? 0}/100`, sub: "Do AI models know you?", col: C.accent },
        { label: "Competitive", value: `${av.overallScore ?? 0}/100`, sub: "Recommended for best X?" },
        { label: "Visibility", value: `${av.visibilityRate ?? 0}%`, sub: "Prompts appeared in" },
        { label: "Sentiment", value: `${av.sentimentScore ?? 0}/100`, sub: "Tone of mentions" },
      ]);
      if (av.brandKnowledge) {
        const knownByModels = Array.isArray(av.brandKnowledge?.knownBy)
          ? av.brandKnowledge.knownBy.filter(Boolean)
          : [];
        hiBox(
          "AI Brand Awareness vs Category Visibility",
          `Brand-name awareness probes recognised the brand in: ${knownByModels.join(", ") || "none of the tested models"}. This is separate from unbranded category visibility, where the brand appeared in ${av.visibilityRate ?? 0}% of tested prompts.`,
          ((av.brandKnowledge.score ?? 0) >= 50 ? "green" : "amber")
        );
      }
      if (av.promptResults?.length) {
        secTitle("Category Prompt Results");
        const yn = (m: any) => !m ? "—" : (m.mentioned ? `Yes${m.position ? ` #${m.position}` : ""}` : "No");
        tbl(["Prompt", "ChatGPT", "Claude", "Gemini"],
          av.promptResults.slice(0, 6).map((r: any) => ({ col1: cl(r.prompt), col2: yn(r.models?.ChatGPT), col3: yn(r.models?.Claude), col4: yn(r.models?.Gemini) })),
          [CW - 75, 25, 25, 25]);
      }
      if (av.citations?.length) {
        secTitle("Pages AI Cited");
        tbl(["URL", "Cited by"], av.citations.slice(0, 6).map((c: any) => ({ col1: cl(c.url), col2: cl((c.models||[]).join(", ")) })), [CW - 50, 50]);
      }
      if (av.rankedPages?.length) {
        secTitle("Your Pages & The Keywords They Rank For");
        tbl(["Page", "Top Keywords", "Vol"], av.rankedPages.slice(0, 8).map((p: any) => ({ col1: cl(p.path || p.url), col2: cl((p.keywords||[]).slice(0,4).map((k:any)=>k.keyword).join(", ")), col3: fmt(p.totalVolume) })), [CW - 95, 70, 25]);
      }
      const blockedAiCompetitorTokens = /^(strong|tools?|software|platforms?|solutions?|best|top|it's|its|their|they)$/i;
      const cleanAiCompetitors = Array.from(
        new Set(
          (Array.isArray(av.topCompetitors) ? av.topCompetitors : [])
            .map((value: any) => cl(value, "").trim())
            .filter((value: string) => value.length >= 3 && !blockedAiCompetitorTokens.test(value))
        )
      ).slice(0, 8);

      if (cleanAiCompetitors.length) {
        hiBox("Top Competitors in AI Answers", cleanAiCompetitors.join(", "), "blue");
      }
      if (av.missedPrompts?.length) hiBox("Missed Opportunities (Content Ideas)", (av.missedPrompts||[]).slice(0,3).join("  -  "), "amber");
    }
    const aiScore=n(normalized.scores.ai)??0;
    const aiConf=cl(pdfData?.aiSearchVisibility?.confidence,"Low");
    const aiMent=n(pdfData?.aiSearchVisibility?.brandMentionCount)??0;
    const aiMods=Array.isArray(pdfData?.aiSearchVisibility?.modelsCalled)
      ? pdfData.aiSearchVisibility.modelsCalled.length
      : 0;
    const sov=n(pdfData?.aiSearchVisibility?.shareOfVoice)??0;
    kpiRow([
      {label:"AI Visibility Score",value:`${aiScore}/100`,sub:sLbl(aiScore),col:sCol(aiScore)},
      {label:"Brand Mentions",value:fmt(aiMent),sub:"In AI responses",col:aiMent>0?C.accent:C.red},
      {label:"Models Checked",value:fmt(aiMods),sub:"AI models tested",col:C.blue},
      {label:"Share of Voice",value:`${sov}%`,sub:"AI share of voice",col:C.amber},
    ]);
    scoreBar("AI Visibility Score",aiScore,"Benchmark: 70+ good, 85+ strong");
// ════════════════════════════════════════════════════════════════════
// PDF — LIVE AI MODEL VISIBILITY block
// Paste this RIGHT BEFORE the line:   secTitle("AI Visibility Summary");
// (inside the exportPDF function, in the if(pdfShow("ai")...) section)
// It uses the existing PDF helpers: secTitle, tbl, tblWrap, fmt, cl.
// ═══════════════════════════════════════════════════════════════════

    secTitle("AI Visibility Summary");
    tblWrap(["Signal","Status","Implication"],[
      {col1:"AI Visibility Score",col2:`${aiScore}/100`,col3:aiScore>=70?"Brand has detectable AI presence":"Brand is weak or absent in unbranded category results"},
      {col1:"Brand Mentions",col2:fmt(aiMent),col3:aiMent>0?"Brand appears in AI-generated category responses":"Brand not detected in the scored unbranded responses"},
      {col1:"Model Coverage",col2:fmt(aiMods),col3:"Number of AI models tested for category visibility"},
      {col1:"Confidence",col2:aiConf,col3:"Reliability of the unbranded category visibility measurement"},
      {col1:"Methodology",col2:"Unbranded category prompts",col3:"Separate brand-name awareness probes are evidence only and are excluded from the competitive visibility score"},
    ],[42,40,CW-82],3);
const opportunity=pdfData?.aiSearchVisibility
      ? aiMent===0
        ? "The brand was not mentioned across the scored unbranded category prompts. Improve entity signals, trusted citations, category content, and topical authority."
        : aiConf.toLowerCase()==="low"
          ? "The brand appeared in a limited valid model sample. Expand evidence and model coverage before treating the score as a stable benchmark."
          : "The brand appeared in at least one unbranded category result. Expand prompt coverage and cited authority to improve consistency."
      : "Canonical AI visibility data was not available.";
hiBox("AI Opportunity Insight",opportunity,aiScore>=70?"green":"amber");

    if(pdfData?.aiVisibility?.pageGeoReadiness){
      const geo=pdfData.aiVisibility.pageGeoReadiness;
      secTitle("AI Citation Readiness — Audited Page");
      kpiRow([{label:"Readiness Score",value:`${geo.score}/100`,sub:geo.grade,col:sCol(geo.score)}]);
      tbl(["Factor","Status"],geo.factors.map((f:any)=>({col1:cl(f.label),col2:f.pass?"Pass":"Needs work"})));
      if(geo.topIssue) hiBox("Top Fix for AI Visibility",cl(geo.topIssue),"amber");
    }
    hiBox("Generative Engine Optimisation (GEO) Readiness",aiScore>=70?`${domain} shows detectable AI visibility. Strengthen with: entity signals, FAQ schema, third-party citations, and topical authority.`:`${domain} has weak AI visibility. Add: company entity signals, structured data, FAQ content, and external brand citations.`,aiScore>=70?"green":"amber");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 08 — COMPETITOR INTELLIGENCE
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.competitors){
    secHdr(nextSec(),"Competitor Threat Intelligence","Domains capturing organic visibility through stronger content, authority, or keyword coverage.");
    kpiRow([
      {label:"Competitors Found",value:String(pdfData.competitors.length),sub:"Organic overlap",col:C.accent},
      {label:"Top Competitor",value:cl(pdfData.competitors[0]?.domain),sub:"Highest overlap",col:C.amber},
      {label:"Top Shared Keywords",value:fmt(Math.max(...pdfData.competitors.map((c:any)=>Number(c.sharedKeywords||c.intersections||0)))),sub:"With top competitor",col:C.blue},
      {label:"Top Threat Score",value:cl(String(pdfData.competitors[0]?.threatScore??"—")),sub:"Risk level",col:sCol(100-(n(pdfData.competitors[0]?.threatScore)??50))},
    ]);
    secTitle("Competitor Overview Table");
    tbl(["Domain","Traffic","Shared KWs","Threat","Winning Factor"],
      pdfData.competitors.slice(0,12).map((c:any)=>({
        col1:cl(c.domain),col2:fmt(c.traffic),col3:fmt(c.sharedKeywords??c.intersections),
        col4:cl(String(c.threatScore??"—")),col5:cl(c.likelyWinningFactor??c.winningFactor,"—"),
      })),[48,28,25,20,CW-121]);
    secTitle("Competitor Intelligence Details");
    pdfData.competitors.slice(0,6).forEach((c:any)=>{
      hiBox(cl(c.domain),`Shared KWs: ${fmt(c.sharedKeywords??c.intersections)}  ·  Traffic: ${fmt(c.traffic)}  ·  Threat: ${cl(String(c.threatScore??"—"))}  ·  Strength: ${cl(c.competitiveStrength,"—")}  ·  AI Risk: ${cl(c.aiRisk,"—")}  ·  Winning: ${cl(c.likelyWinningFactor??c.winningFactor,"—")}`,"amber");
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 09 — KEYWORD GAP & LABS
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.keywords){
    secHdr(nextSec(),"Keyword Gap & SEO Labs Intelligence","Missing keywords competitors rank for, plus ranked keyword intelligence from Crawler Que Labs.");
    if(pdfData?.dataforseo?.keywordGap){
      kpiRow([
        {label:"Own Keywords",value:fmt(pdfData?.dataforseo?.keywordGap?.ownKeywords),col:C.accent},
        {label:"Competitors Checked",value:fmt(pdfData?.dataforseo?.keywordGap?.competitorCount),col:C.blue},
        {label:"Missing Keywords",value:fmt(pdfData?.dataforseo?.keywordGap?.missingKeywords?.length),col:C.amber},
        {label:"Gap Quality",value:cl(pdfData?.dataforseo?.keywordGap?.quality==="available"?"Verified":"Limited"),col:pdfData?.dataforseo?.keywordGap?.quality==="available"?C.accent:C.amber},
      ]);
    }
    if(pdfData?.dataforseo?.keywordGap?.missingKeywords?.length){
      secTitle("Missing Keyword Opportunities");
      tbl(["Keyword","Volume","Intent","Page Type","Opportunity","Priority"],
        pdfData.dataforseo.keywordGap.missingKeywords.slice(0,15).map((k:any)=>({
          col1:cl(k.keyword),col2:fmt(k.volume??k.search_volume),
          col3:cl(k.intent,"general"),col4:cl(k.recommendedPageType,"Supporting Content"),
          col5:cl(String(k.opportunityScore??"—")),col6:cl(k.priority,"Low"),
        })),[55,22,20,38,20,CW-155]);
      secTitle("Keyword Gap — Action Guidance");
      pdfData.dataforseo.keywordGap.missingKeywords.slice(0,8).forEach((k:any)=>{
        actCard(cl(k.keyword),cl(k.priority,"Medium"),cl(k.action,"Add to content roadmap"),`Volume: ${fmt(k.volume)}  |  Intent: ${cl(k.intent)}  |  Competitors: ${Array.isArray(k.competitors)?k.competitors.join(", "):cl(k.competitors)}`,cl(k.priority,"medium").toLowerCase().includes("high")?"high":"medium");
      });
    }
    if(pdfData?.dataforseo?.keywordGap?.contentIdeas?.length){
      secTitle("AI Content Cluster Ideas");
      tbl(["Cluster","Headline","Keywords"],
        pdfData.dataforseo.keywordGap.contentIdeas.slice(0,8).map((idea:any)=>({
          col1:cl(idea.cluster),col2:cl(idea.headline),
          col3:idea.keywords?.slice(0,4).map((kk:any)=>kk.keyword).join(", ")||"—",
        })),[35,70,CW-105]);
    }
    if(pdfData?.dataforseo?.topKeywords?.length){
      secTitle("Crawler Que Labs — Ranked Keywords");
      kpiRow([
        {label:"Organic Keywords",value:fmt(pdfData?.dataforseo?.organicKeywords),col:C.accent},
        {label:"Top Keywords Fetched",value:fmt(pdfData?.dataforseo?.topKeywords?.length),col:C.blue},
        {label:"Competitors Found",value:fmt(pdfData?.dataforseo?.competitors?.length),col:C.amber},
        {label:"Fetch Iterations",value:cl(String(pdfData?.dataforseo?.keywordFetchIterations??"—")),col:C.muted},
      ]);
      tbl(["Keyword","Position","Volume","CPC","Intent","KD","Opportunity"],
        pdfData.dataforseo.topKeywords.slice(0,15).map((k:any)=>({
          col1:cl(k.keyword),col2:cl(String(k.position??"—")),col3:fmt(k.volume),
          col4:cl(k.cpc?`$${Number(k.cpc).toFixed(2)}`:"—"),col5:cl(k.intent,"—"),
          col6:cl(String(k.difficulty??"—")),col7:cl(String(k.opportunity??"—")),
        })),[55,18,22,18,18,12,CW-143]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 10 — KEYWORD RESEARCH
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.keywordResearch){
    secHdr(nextSec(),"Keyword Research","Seed keyword suggestions from Crawler Que Keyword Suggestions API with intent and CPC signals.");
    kpiRow([
      {label:"Seed Keyword",value:cl(pdfData?.keywordResearch?.seedKeyword),col:C.accent},
      {label:"Suggestions Found",value:fmt(pdfData?.keywordResearch?.suggestions?.length),col:C.blue},
      {label:"Source",value:cl(pdfData?.keywordResearch?.source,"Crawler Que"),col:C.muted},
      {label:"Location",value:cl(pdfData?.traffic?.country,"—"),col:C.muted},
    ]);
    tbl(["Keyword","Volume","CPC","Competition","Intent","KD"],
      pdfData.keywordResearch.suggestions.slice(0,20).map((k:any)=>({
        col1:cl(k.keyword),col2:fmt(k.volume),col3:cl(k.cpc?`$${Number(k.cpc).toFixed(2)}`:"—"),
        col4:fmtCompetition(k.competition),col5:cl(k.intent,"—"),col6:cl(String(k.difficulty??"—")),
      })),[65,22,18,22,18,CW-145]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 11 — SERP RANKINGS
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.serp){
    secHdr(nextSec(),"Live SERP Rankings","Google rank positions checked by Crawler Que SERP API for tracked keywords.");
    kpiRow([
      {label:"Keywords Checked",value:cl(String(pdfData?.serpData?.checkedKeywords??"—")),col:C.accent},
      {label:"Keywords Found",value:cl(String(pdfData?.serpData?.foundCount??"—")),col:C.green},
      {label:"Keywords Not Found",value:cl(String(Math.max(0,(pdfData?.serpData?.checkedKeywords??0)-(pdfData?.serpData?.foundCount??0)))),col:C.red},
      {label:"Average Rank",value:cl(String(pdfData?.serpData?.avgRank??"—")),col:C.blue},
    ]);
    if(pdfData?.serpData?.results?.length){
      secTitle("Keyword Rank Results");
      tbl(["Keyword","Found","Google Rank","Ranking URL"],
        pdfData.serpData.results.map((r:any)=>({
          col1:cl(r.keyword),col2:r.found?"Yes":"No",
          col3:r.found?`#${cl(String(r.rank),"—")}`:"Not found",col4:r.found?cl(r.url,"—"):"Not in top 100",
        })),[55,14,18,CW-87]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 12 — BACKLINK AUTHORITY
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.backlinks){
    secHdr(nextSec(),"Backlink Authority & Trust Signals","Domain trust, referring domains, and top backlink sources from Crawler Que Backlinks API.");
    const backlinkRankValue = n(
      pdfData?.dataforseo?.backlinkRank ??
        normalized.backlinks.rank
    );
    kpiRow([
      {label:"Backlink Rank",value:backlinkRankValue !== null ? String(backlinkRankValue) : "—",sub:"Authority signal",col:sCol(backlinkRankValue)},
      {label:"Total Backlinks",value:fmt(pdfData?.backlinks?.backlinks??normalized.backlinks.total),col:C.accent},
      {label:"Referring Domains",value:fmt(pdfData?.backlinks?.referringDomains??normalized.backlinks.referringDomains),col:C.blue},
      {label:"Referring Pages",value:fmt(pdfData?.backlinks?.referringPages??normalized.backlinks.referringDomains),col:C.amber},
    ]);
    if (backlinkRankValue !== null) {
      scoreBar("Backlink Authority Signal",backlinkRankValue,"50+ referring domains = moderate authority");
    }
    tbl(["Metric","Value","Benchmark"],[
      {col1:"Backlink Rank",col2:backlinkRankValue !== null ? String(backlinkRankValue) : "—",col3:"Higher = better; compare vs direct competitors"},
      {col1:"Total Backlinks",col2:fmt(pdfData?.backlinks?.backlinks),col3:"Quality matters more than raw count"},
      {col1:"Referring Domains",col2:fmt(pdfData?.backlinks?.referringDomains),col3:"50+ moderate, 200+ strong authority"},
      {col1:"Referring Pages",col2:fmt(pdfData?.backlinks?.referringPages),col3:"More pages = broader link surface"},
    ],[45,35,CW-80]);
    if(pdfData?.backlinks?.topBacklinks?.length){
      secTitle("Top Backlinks");
      tbl(["Domain","Anchor","Rank","Source URL"],
        pdfData.backlinks.topBacklinks.slice(0,12).map((b:any)=>({
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
    hiBox("Authority Insight",pdfData?.backlinks?.referringDomains?`${domain} has ${cl(String(pdfData.backlinks.referringDomains))} referring domains and ${cl(String(pdfData.backlinks.backlinks??"unknown"))} total backlinks. Focus on earning quality industry mentions and relevant authority links.`:"No verified backlink data was returned for this audit.","blue");
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 13 — TECHNICAL SEO AUDIT
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.technicalCrawl){
    secHdr(nextSec(),"Technical SEO Audit","OnPage crawl status, page-level issues, broken links, and crawl signals from Crawler Que OnPage API.");
    kpiRow([
      {label:"Pages Discovered",value:fmt(pdfData?.onPage?.discoveredPages),col:C.blue},
      {label:"Pages Crawled",value:fmt(pdfData?.onPage?.crawledPages),col:C.accent},
      {label:"Coverage",value:pdfData?.onPage?.coveragePercent!==null&&pdfData?.onPage?.coveragePercent!==undefined?`${fmt(pdfData.onPage.coveragePercent)}%`:"—",col:(n(pdfData?.onPage?.coveragePercent)??0)>=90?C.green:C.amber},
      {label:"Crawl Page Limit",value:fmt(pdfData?.onPage?.pageLimit),col:C.muted},
    ]);
    kpiRow([
      {label:"Completed Pages",value:fmt(pdfData?.onPage?.completedPages),col:C.green},
      {label:"Failed Pages",value:fmt(pdfData?.onPage?.failedPages),col:(n(pdfData?.onPage?.failedPages)??0)>0?C.red:C.green},
      {label:"Remaining Pages",value:fmt(pdfData?.onPage?.remainingPages),col:(n(pdfData?.onPage?.remainingPages)??0)>0?C.amber:C.green},
      {label:"Crawl Confidence",value:cl(pdfData?.onPage?.confidence??pdfData?.reconciliation?.technical?.confidence,"Unknown"),col:pdfData?.onPage?.confidence==="high"?C.green:C.amber},
    ]);
    if(pdfData?.onPage?.limitation||pdfData?.reconciliation?.technical?.limitation){
      hiBox("Technical Coverage Limitation",cl(pdfData?.onPage?.limitation??pdfData?.reconciliation?.technical?.limitation),"amber");
    }
    tbl(["Check","Result","Notes"],[
      {col1:"Crawl Status",col2:cl(pdfData?.onPage?.crawlStatus,"—"),col3:"Final status from the saved OnPage task"},
      {col1:"Confidence",col2:cl(pdfData?.onPage?.confidence??pdfData?.reconciliation?.technical?.confidence,"—"),col3:"Limited when the crawl times out or returns partial coverage"},
      {col1:"Pages Discovered",col2:fmt(pdfData?.onPage?.discoveredPages),col3:"Pages identified by the crawl"},
      {col1:"Pages Crawled",col2:fmt(pdfData?.onPage?.crawledPages),col3:"Pages with returned technical evidence"},
      {col1:"Pages Remaining",col2:fmt(pdfData?.onPage?.remainingPages),col3:"Unprocessed in-scope pages at finalization"},
      {col1:"Crawl Page Limit",col2:fmt(pdfData?.onPage?.pageLimit),col3:"Maximum pages requested for this audit"},
      {col1:"Outside Crawl Limit",col2:fmt(pdfData?.onPage?.outsideLimitPages),col3:"Discovered pages excluded by the visible crawl cap"},
      {col1:"Coverage",col2:pdfData?.onPage?.coveragePercent!==null&&pdfData?.onPage?.coveragePercent!==undefined?`${fmt(pdfData.onPage.coveragePercent)}%`:"—",col3:"Returned pages divided by in-scope discovered pages"},
      {col1:"Broken Links",col2:fmt(pdfData?.onPage?.brokenLinks),col3:"All evidenced broken links should be fixed or redirected"},
      {col1:"Missing Titles",col2:fmt(pdfData?.onPage?.missingTitle),col3:"Every important page needs a unique title"},
      {col1:"Missing Descriptions",col2:fmt(pdfData?.onPage?.missingDescription),col3:"Descriptions improve search CTR"},
      {col1:"Duplicate Titles",col2:fmt(pdfData?.onPage?.duplicateTitle),col3:"Duplicate titles reduce topical clarity"},
    ],[42,30,CW-72]);
    if(pdfData?.onPage?.pages?.length){
      secTitle("Sample Crawled Pages");
      tbl(["Title","URL","Status","Load Time"],
        pdfData.onPage.pages.slice(0,12).map((p:any)=>({
          col1:cl(p.title,"Untitled"),col2:cl(p.url,"—"),
          col3:cl(String(p.statusCode??"—")),col4:cl(p.loadTime?`${p.loadTime}ms`:"—"),
        })),[55,65,14,CW-134]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 14 — CONTENT QUALITY
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.content){
    secHdr(nextSec(),"First-Party Content Quality","Only pages from the audited domain are scored. External pages are excluded from this module.");
    kpiRow([
      {label:"Pages Requested",value:fmt(pdfData?.contentAnalysis?.requestedPages),col:C.blue},
      {label:"Pages Analyzed",value:fmt(pdfData?.contentAnalysis?.analyzedPages??pdfData?.contentAnalysis?.results?.length),col:C.accent},
      {label:"Failed Pages",value:fmt(pdfData?.contentAnalysis?.failedPages),col:(n(pdfData?.contentAnalysis?.failedPages)??0)>0?C.amber:C.green},
      {label:"Average Score",value:pdfData?.contentAnalysis?.averageScore!==null&&pdfData?.contentAnalysis?.averageScore!==undefined?`${fmt(pdfData.contentAnalysis.averageScore)}/100`:"—",col:sCol(pdfData?.contentAnalysis?.averageScore)},
    ]);
    if(pdfData?.dataforseo?.keywordGap?.opportunities?.length){
      secTitle("Content Opportunities");
      tbl(["Keyword","Volume","Competitor Domains"],
        pdfData.dataforseo.keywordGap.opportunities.slice(0,10).map((k:any)=>({
          col1:cl(k.keyword),col2:fmt(k.volume),col3:Array.isArray(k.competitors)?k.competitors.join(", "):cl(k.competitors,"—"),
        })),[60,25,CW-85]);
    }
    if(pdfData?.contentAnalysis?.results?.length){
      secTitle("Audited-Site Content Results");
      tbl(["Page","Score","Words","Top Issue","URL"],
        pdfData.contentAnalysis.results.slice(0,10).map((item:any)=>({
          col1:cl(item.title??item.mainTopic,"Untitled"),
          col2:item.score!==null&&item.score!==undefined?`${cl(String(item.score))}/100`:"—",
          col3:fmt(item.wordCount??item.contentLength),
          col4:Array.isArray(item.issues)&&item.issues.length?cl(item.issues[0]):"No major issue",
          col5:cl(item.url,"—"),
        })),[45,18,18,40,CW-121]);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 15 — LOCAL SEO
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.local){
    secHdr(nextSec(),"Local SEO & Business Listings","Business listing visibility, ratings, and review signals from Crawler Que Business Data API.");
    kpiRow([
      {label:"Listings Found",value:fmt(pdfData?.businessData?.listings?.length),col:C.accent},
      {label:"Search Query",value:cl(pdfData?.businessData?.keyword),col:C.blue},
      {label:"Location",value:cl(pdfData?.businessData?.location),col:C.muted},
      {label:"Top Rating",value:cl(String(Math.max(...(pdfData.businessData.listings||[]).map((l:any)=>Number(l.rating||0)))||"—")),col:C.amber},
    ]);
    tbl(["Business","Category","Rating","Reviews","Address"],
      pdfData.businessData.listings.slice(0,10).map((item:any)=>({
        col1:cl(item.title,"Unknown"),col2:cl(item.category,"—"),
        col3:cl(String(item.rating??"—")),col4:cl(String(item.reviews??"—")),col5:cl(item.address,"—"),
      })),[40,30,14,16,CW-100]);
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 16 — RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════
  if(pdfSections.recommendations){
    secHdr(nextSec(),"Evidence-Backed Recommendations","Prioritised actions tied to source modules, affected URLs, validation status, and supporting evidence.");
    const canonicalRecommendations = Array.isArray(pdfData?.recommendations)
      ? pdfData.recommendations.filter(isValidPdfAction).slice(0, 10)
      : [];
    kpiRow([
      {label:"Recommendations",value:fmt(canonicalRecommendations.length),col:C.accent},
      {label:"Source",value:cl(pdfData?.aiRecommendations?.source,"Evidence Engine"),col:C.muted},
      {label:"Primary Opportunity",value:cl(pdfData?.unifiedOverview?.primaryOpportunity),col:C.amber},
      {label:"Suppressed Branded Gaps",value:fmt(pdfData?.aiRecommendations?.suppressedCompetitorBrandedKeywords),col:C.blue},
    ]);
    if(canonicalRecommendations.length){
      secTitle("Priority Recommendations");
      canonicalRecommendations.forEach((rawRec:any,i:number)=>{
        const rec = typeof rawRec === "string"
          ? { title: String(rawRec).split(".")[0], detail: rawRec }
          : rawRec || {};
        const evidence = Array.isArray(rec.evidence)
          ? rec.evidence.slice(0, 3).join(" | ")
          : "";
        const urls = Array.isArray(rec.affectedUrls)
          ? rec.affectedUrls.slice(0, 2).join(", ")
          : "";
        const meta = [
          `Owner: ${cl(rec.owner,"Growth Team")}`,
          `Effort: ${cl(rec.effort,"Medium")}`,
          `Source: ${cl(rec.sourceModule,"Recommendations")}`,
          `Validation: ${cl(rec.validationStatus,"directional")}`,
          urls ? `URLs: ${urls}` : "",
          evidence ? `Evidence: ${evidence}` : "",
        ].filter(Boolean).join("  |  ");
        actCard(
          cl(rec.title,`Recommendation ${i+1}`),
          cl(rec.impact,"Medium"),
          cl(rec.timeline,"31–60 days"),
          `${cl(rec.detail,"Review this recommendation against the supplied evidence.")}  |  ${meta}`,
          String(rec.impact||"").toLowerCase().includes("high")?"high":String(rec.impact||"").toLowerCase().includes("low")?"low":"medium"
        );
      });
    } else {
      body_("No evidence-backed recommendations were generated for this report.");
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 17 — ACTION ROADMAP
  // ════════════════════════════════════════════════════════════════════
  secHdr(nextSec(),"30 / 60 / 90 Day Action Roadmap","An execution sequence generated from the validated recommendations in this report.");
  const roadmap = pdfData?.actionRoadmap || pdfData?.aiRecommendations?.roadmap || normalized?.actionRoadmap || {};
  const roadmapPhase = (
    title:string,
    timeline:string,
    items:any[],
    priority:"high"|"medium"|"low"
  ) => {
    secTitle(title);
    const safeItems = Array.isArray(items)
      ? items.filter(isValidPdfAction)
      : [];
    if(safeItems.length===0){
      body_("No validated actions were assigned to this phase.");
      return;
    }
    safeItems.slice(0,5).forEach((raw:any,index:number)=>{
      const rec = typeof raw === "string" ? {title:String(raw).split(".")[0],detail:raw} : raw || {};
      const evidence = Array.isArray(rec.evidence) ? rec.evidence.slice(0,2).join(" | ") : "";
      actCard(
        cl(rec.title,`Action ${index+1}`),
        cl(rec.impact,priority==="high"?"High":"Medium"),
        cl(rec.timeline,timeline),
        `${cl(rec.detail,"Execute this evidence-backed action.")}  |  Owner: ${cl(rec.owner,"Growth Team")}${evidence?`  |  Evidence: ${evidence}`:""}`,
        priority
      );
    });
  };
  roadmapPhase("First 30 Days — Fix Validated Foundations","0–30 days",roadmap?.first30Days,"high");
  roadmapPhase("Next 30 Days — Expand Qualified Visibility","31–60 days",roadmap?.next30Days,"medium");
  roadmapPhase("Final 30 Days — Build Authority and Coverage","61–90 days",roadmap?.final30Days,"low");

  // ════════════════════════════════════════════════════════════════════
  //  APPENDIX — EVIDENCE
  // ════════════════════════════════════════════════════════════════════
// Benchmark guide
  secHdr(nextSec(),"Benchmark & Metric Reference","What each score in this report means and the target to aim for.");
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
  for(let i=2;i<=total;i++){ doc.setPage(i); drawFooter(i,total); }

  // ════════════════════════════════════════════════════════════════════
  //  SAVE
  // ════════════════════════════════════════════════════════════════════
  const safeDomain=String(domain).replace(/[^a-z0-9.-]/gi,"-");

  trackAnalyticsEvent("pdf_exported", {
    account_type: pdfUser?.trial?.isTrialing
      ? "trial"
      : pdfUser?.isPromoAccess
        ? "promo"
        : "paid",
    plan_name:
      pdfUser?.package?.name ||
      pdfUser?.packageName ||
      "unknown",
    module_count: selectedModules.length,
    white_label: canWL,
  });

  doc.save(`Crawler-Que-Growth-Intelligence-${safeDomain}.pdf`);
};
const brandMentions = Number(
  data?.aiSearchVisibility?.brandMentionCount ??
    0
);

const competitorMentions = Number(
  data?.aiSearchVisibility?.competitorMentionCount ??
    0
);

const totalMentions =
  brandMentions + competitorMentions;

const shareOfVoice = Number(
  data?.aiSearchVisibility?.shareOfVoice ??
    0
);

const currentReportTypes =
  data?.reportTypes || selectedReportTypes || [];

const shouldShowSection = (section: string) => {
  if (
  section === "overview" ||
  section === "history" ||
  section === "billing" ||
  section === "account" ||
  (section === "review" && Boolean(data?.reportId))
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

const reviewStatusClass = (
  status: string
) => {
  const value = String(
    status || "draft"
  ).toLowerCase();

  if (value === "approved") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-300";
  }

  if (value === "in_review") {
    return "border-blue-300/20 bg-blue-300/10 text-blue-300";
  }

  if (value === "changes_required") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-300";
  }

  return "border-[#C5FF3D]/20 bg-[#C5FF3D]/10 text-[#C5FF3D]";
};

const reviewStatusLabel = (
  status: string
) =>
  String(status || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

const renderReviewItems = (
  group:
    | "issues"
    | "recommendations",
  title: string
) => {
  const items = Array.isArray(
    reviewDraft?.[group]
  )
    ? [...reviewDraft[group]].sort(
        (a: any, b: any) =>
          Number(a?.order || 0) -
          Number(b?.order || 0)
      )
    : [];

  const canEdit =
    currentUser?.canReviewReports ===
    true;

  return (
    <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs text-[#777]">
            Original automated evidence is locked. Client-facing fields can be edited, reordered, or suppressed.
          </p>
        </div>

        <span className="rounded-full border border-[#2A2A2A] bg-[#151515] px-3 py-1 text-xs text-[#A0A0A0]">
          {items.filter((item: any) => item?.visible !== false).length} visible / {items.length} total
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[#777]">
          No items are available in this section.
        </p>
      ) : (
        <div className="space-y-5">
          {items.map((item: any, index: number) => {
            const original =
              item?.original || {};
            const client =
              item?.client || {};

            return (
              <div
                key={item?.id || index}
                className={`rounded-2xl border p-5 ${
                  item?.visible === false
                    ? "border-red-300/20 bg-red-300/5 opacity-75"
                    : "border-[#252525] bg-[#151515]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-[#8A8A8A]">
                      {group === "issues" ? "Finding" : "Recommendation"} {index + 1}
                    </span>

                    <span className="rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/10 px-3 py-1 text-[10px] font-semibold text-[#C5FF3D]">
                      {original?.sourceModule || "Automated evidence"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canEdit || index === 0}
                      onClick={() =>
                        moveReviewItem(
                          group,
                          item.id,
                          -1
                        )
                      }
                      className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#CCCCCC] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Move Up
                    </button>

                    <button
                      type="button"
                      disabled={!canEdit || index === items.length - 1}
                      onClick={() =>
                        moveReviewItem(
                          group,
                          item.id,
                          1
                        )
                      }
                      className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#CCCCCC] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Move Down
                    </button>

                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        updateReviewItem(
                          group,
                          item.id,
                          (current: any) => ({
                            ...current,
                            visible:
                              current?.visible ===
                              false,
                          })
                        )
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                        item?.visible === false
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
                          : "border-red-300/20 bg-red-300/10 text-red-300"
                      }`}
                    >
                      {item?.visible === false ? "Restore" : "Suppress"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#252525] bg-[#0D0D0D] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#777]">
                      Original automated version — locked
                    </p>
                    <p className="mt-3 font-semibold text-white">
                      {original?.title || "Untitled item"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#999]">
                      {original?.detail || "No detail available."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#777]">
                      <span>Impact: {original?.impact || "Medium"}</span>
                      <span>Effort: {original?.effort || "Medium"}</span>
                      <span>Owner: {original?.owner || "Growth Team"}</span>
                      <span>Timeline: {original?.timeline || "31–60 days"}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#C5FF3D]/15 bg-[#C5FF3D]/5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#C5FF3D]">
                      Client-facing version
                    </p>

                    <label className="mt-3 block text-xs text-[#8A8A8A]">
                      Title
                    </label>
                    <input
                      value={client?.title || ""}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateReviewItem(
                          group,
                          item.id,
                          (current: any) => ({
                            ...current,
                            client: {
                              ...current.client,
                              title:
                                event.target.value,
                            },
                          })
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/50 disabled:opacity-70"
                    />

                    <label className="mt-3 block text-xs text-[#8A8A8A]">
                      Client-facing detail
                    </label>
                    <textarea
                      value={client?.detail || ""}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateReviewItem(
                          group,
                          item.id,
                          (current: any) => ({
                            ...current,
                            client: {
                              ...current.client,
                              detail:
                                event.target.value,
                            },
                          })
                        )
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#C5FF3D]/50 disabled:opacity-70"
                    />

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["impact", "Impact"],
                        ["effort", "Effort"],
                        ["owner", "Owner"],
                        ["timeline", "Timeline"],
                      ].map(([field, label]) => (
                        <label
                          key={field}
                          className="block text-xs text-[#8A8A8A]"
                        >
                          {label}
                          <input
                            value={client?.[field] || ""}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateReviewItem(
                                group,
                                item.id,
                                (current: any) => ({
                                  ...current,
                                  client: {
                                    ...current.client,
                                    [field]:
                                      event.target.value,
                                  },
                                })
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#C5FF3D]/50 disabled:opacity-70"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

  return (
<div className="si-dashboard flex min-h-screen bg-[#0A0A0A] text-white [&_.bg-white]:bg-[#111111] [&_.bg-slate-50]:bg-[#181818] [&_.bg-slate-100]:bg-[#181818] [&_.bg-slate-200]:bg-[#222222] [&_.bg-slate-950]:bg-[#0d0d0d] [&_.border-slate-200]:border-[#222222] [&_.border-slate-100]:border-[#222222] [&_.text-slate-950]:text-white [&_.text-slate-900]:text-white [&_.text-slate-800]:text-[#EEEEEE] [&_.text-slate-700]:text-[#CCCCCC] [&_.text-slate-600]:text-[#A0A0A0] [&_.text-slate-500]:text-[#8A8A8A] [&_.text-slate-400]:text-[#666666] [&_.text-slate-300]:text-[#AAAAAA] [&_.text-blue-600]:text-[#C5FF3D] [&_.text-blue-700]:text-[#C5FF3D] [&_.bg-blue-600]:bg-[#C5FF3D] [&_.bg-blue-100]:bg-[#C5FF3D]/10 [&_.text-blue-700]:text-[#C5FF3D] [&_.bg-green-100]:bg-[#C5FF3D]/10 [&_.text-green-700]:text-[#C5FF3D] [&_.bg-green-600]:bg-[#C5FF3D] [&_.text-green-600]:text-[#C5FF3D] [&_.shadow-sm]:shadow-none [&_.text-white]:text-white">
      {/* Sidebar */}
      <div className="sticky top-0 h-screen w-72 overflow-y-auto border-r border-[#222] bg-[#0A0A0A] p-5">
<div className="mb-6 flex items-center gap-3">
<img src="/logo-icon.png" alt="Crawler Que" className="h-9 w-9 shrink-0 object-contain" />
    <div>
      <h1 className="text-lg font-bold tracking-tight text-[var(--cq-text)]">
        Crawler Que
      </h1>
      <p className="cq-eyebrow mt-0.5">
        Growth Intelligence
      </p>
    </div>
  </div>

        {[
  ["overview", "Overview", BarChart3, true],
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
  ["review", "Client Review", Brain, Boolean(data?.reportId)],
  ["history", "History", BarChart3, true],
["billing", "Subscription", BarChart3, !currentUser?.isPromoAccess],
["account", "Account Settings", Brain, !currentUser?.isPromoAccess],
  ["serp", "SERP Rankings", BarChart3, currentUser?.role === "admin" || currentUser?.package?.allowKeywords],
]
  .filter((item: any) => item[3] && shouldShowSection(item[0]))
        .map(([key, label, Icon]: any) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`group mb-1 flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-[15px] font-medium transition ${
  activeTab === key
    ? "border-l-[var(--cq-signal)] bg-[var(--cq-surface-2)] text-[var(--cq-text)]"
    : "border-l-transparent text-[var(--cq-text-2)] hover:bg-[var(--cq-surface)] hover:text-[var(--cq-text)]"
}`}
          >
<span
  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
    activeTab === key
      ? "bg-[var(--cq-signal)]/15 text-[var(--cq-signal)]"
      : "bg-[var(--cq-surface)] text-[var(--cq-text-3)] group-hover:text-[var(--cq-signal)]"
  }`}
>
  <Icon className="h-4 w-4" />
</span>
            {label}
          </button>
))}

        {/* Logout at bottom of sidebar */}
        <div className="mt-6 border-t border-[#222] pt-4">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#8A8A8A] transition-all duration-200 hover:bg-white/5 hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-wider">Log Out</span>
          </button>
        </div>
      </div>

{/* Main */}
      <div className="flex-1 bg-[#0A0A0A] p-8">

{currentUser?.trial?.isTrialing && (
  <TrialBanner currentUser={currentUser} />
)}

{currentUser?.package && activeTab === "overview" && (
  <div className="cq-card cq-frame mb-6 !rounded-none p-5">
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
          {Number(
            currentUser?.auditsReserved ||
              0
          ) > 0
            ? ` ${currentUser.auditsReserved} audit(s) currently processing.`
            : ""}
        </p>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#222]">
          <div
            className="h-full rounded-full bg-[#C5FF3D]"
            style={{ width: `${currentUser.usagePercent || 0}%` }}
          />
        </div>
      </div>

      {!currentUser?.isPromoAccess && (
        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className="rounded-xl bg-[#C5FF3D] px-4 py-2 text-sm font-bold text-black hover:opacity-90"
        >
          View Plans
        </button>
      )}
    </div>
  </div>
)}

{/* Top Input — only show on overview tab */}
{(activeTab === "overview" || activeTab === "unified") && (
<div className="cq-card cq-frame mb-6 !rounded-none p-6">
  <div className="mb-4 flex items-center justify-between gap-4">
    <div>
<p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
        Website Intelligence Report
      </p>
      <h1 className="mt-1 text-2xl font-bold text-white">
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
    aria-label="Website URL to audit"
    inputMode="url"
    autoComplete="url"
    value={url}
    disabled={loading}
    onChange={(e) => setUrl(e.target.value)}
    placeholder="Enter website URL"
    className="h-12 w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
  />

<div className="rounded-2xl border border-[#222] bg-[#111] p-4">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
      Report Modules
    </p>

    {!currentUser?.isPromoAccess && (
      <button
        type="button"
        onClick={() =>
          setSelectedReportTypes(
            reportOptions.map(([value]) => value)
          )
        }
        className="text-xs font-semibold text-[#C5FF3D] hover:text-white"
      >
        Select All
      </button>
    )}
  </div>

  <div className="flex flex-wrap gap-2">
    {reportOptions.map(([value, label]) => {
      const active = selectedReportTypes.includes(value);

      return (
        <button
          key={value}
          type="button"
          disabled={
            loading ||
            currentUser?.isPromoAccess
          }
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

  {currentUser?.isPromoAccess && (
    <p className="mt-3 text-xs leading-5 text-[#C5FF3D]">
      Promotional full access is active. All
      audit modules are included automatically.
    </p>
  )}
</div>

{selectedReportTypes.includes("ai") && (
  <div className="rounded-2xl border border-[#222] bg-[#111] p-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
      Custom AI Prompts (optional) — One per line, maximum 5.
    </p>
    <textarea
      aria-label="Custom AI prompts"
      value={customPrompts}
      onChange={(e) => setCustomPrompts(e.target.value)}
      disabled={loading}
      rows={3}
      placeholder={"best digital marketing agency in Pakistan?\nwho offers white-label SEO services?"}
      className="w-full rounded-xl border border-[#2a2a2a] bg-[#0A0A0A] px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-[#444] focus:border-[#C5FF3D]/60"
    />
  </div>
)}

  <button
    type="button"
    aria-label="Run the selected website audit modules"
    onClick={() => {
      void runAudit();
    }}
    disabled={loading || !url || selectedReportTypes.length === 0}
    className="h-12 rounded-xl bg-[#C5FF3D] px-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-black shadow-sm transition hover:opacity-90 disabled:opacity-40"
  >
    {loading ? "Running Audit..." : "Run Audit"}
  </button>

<button
  type="button"
  aria-label="Export the finalized report as PDF"
  onClick={exportPDF}
  disabled={
    !data ||
    loading ||
    data?.renderReady !== true
  }
      className="h-12 min-w-[170px] rounded-xl border border-[#C5FF3D]/35 bg-transparent px-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-[#C5FF3D] transition hover:bg-[#C5FF3D]/10 disabled:opacity-40"
    >
      {data &&
data?.renderReady !== true
  ? "Preparing PDF..."
  : "Export PDF"}
    </button>

  </div>

  <div className="mt-5 rounded-2xl border border-[#222] bg-[#111] p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
          Audit Market & Scope
        </p>
        <p className="mt-1 text-xs leading-5 text-[#777]">
          These settings are bound to the audit identity, cache, history, comparison, and final report.
        </p>
      </div>
      <span className="rounded-full border border-[#2A2A2A] px-3 py-1 text-xs text-[#8A8A8A]">
        Search engine: Google
      </span>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-xs text-[#8A8A8A]">
        Country
        <select
          value={auditCountry}
          onChange={(event) =>
            setAuditCountry(event.target.value)
          }
          disabled={loading}
          className="mt-2 h-11 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
        >
          <option value="auto">Auto-detect from domain</option>
          {AUDIT_COUNTRY_OPTIONS.map((option) => (
            <option
              key={option.countryCode}
              value={option.countryName}
            >
              {option.countryName}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-[#8A8A8A]">
        Language
        <select
          value={auditLanguage}
          onChange={(event) =>
            setAuditLanguage(event.target.value)
          }
          disabled={loading}
          className="mt-2 h-11 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
        >
          {AUDIT_LANGUAGE_OPTIONS.map((option) => (
            <option
              key={option.languageCode}
              value={option.languageName}
            >
              {option.languageName}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-[#8A8A8A]">
        Primary device
        <select
          value={auditDevice}
          onChange={(event) =>
            setAuditDevice(
              event.target.value === "desktop"
                ? "desktop"
                : "mobile"
            )
          }
          disabled={loading}
          className="mt-2 h-11 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
        >
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
      </label>

      <label className="text-xs text-[#8A8A8A]">
        Crawl limit
        <select
          value={auditCrawlLimit}
          onChange={(event) =>
            setAuditCrawlLimit(
              Number(event.target.value)
            )
          }
          disabled={loading}
          className="mt-2 h-11 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-white outline-none focus:border-[#C5FF3D]/60"
        >
          {AUDIT_CRAWL_LIMIT_OPTIONS.map((limit) => (
            <option key={limit} value={limit}>
              {limit} pages
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-[#8A8A8A]">
        Search engine
        <select
          value={auditSearchEngine}
          disabled
          className="mt-2 h-11 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-3 text-sm text-white opacity-80"
        >
          <option value="google">Google</option>
        </select>
      </label>
    </div>
  </div>
</div>
)}

{data && (
  <div className="cq-card cq-frame mb-6 !rounded-none p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
      Audit Methodology & Scope
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ScopeValue label="Submitted URL" value={data?.submittedUrl || data?.url} />
      <ScopeValue label="Resolved URL" value={data?.resolvedUrl} />
      <ScopeValue label="Canonical URL" value={data?.canonicalUrl} />
      <ScopeValue label="Redirects" value={String(data?.redirectCount ?? 0)} />
      <ScopeValue label="Country" value={data?.auditConfig?.countryName || data?.searchContext?.country} />
      <ScopeValue label="Language" value={data?.auditConfig?.languageName || data?.searchContext?.language} />
      <ScopeValue label="Primary Device" value={data?.auditConfig?.device || data?.searchContext?.device} />
      <ScopeValue label="Crawl Limit" value={`${data?.auditConfig?.maxCrawlPages || data?.onPage?.pageLimit || 100} pages`} />
    </div>
  </div>
)}

{data?.onPage?.taskId &&
  data?.renderReady !== true && (
    <div className="cq-card mb-6 border-l-2 border-l-amber-400 p-5">
      <p className="font-semibold text-[var(--cq-text)]">
        Technical crawl is being finalized
      </p>

      <p className="mt-1 text-sm text-[var(--cq-text-2)]">
        The main audit findings are available,
        but PDF export remains locked until
        the technical module completes, fails,
        or reaches its timeout safely.
      </p>

      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-amber-300">
        Current status:{" "}
        {data?.moduleStatus
          ?.technical ||
          data?.onPage
            ?.crawlStatus ||
          "running"}
      </p>
    </div>
  )}
{error && (
<div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/8 p-5">
    <p className="font-semibold text-red-400">Audit failed</p>
    <p className="mt-1 text-sm text-red-400/70">
      {typeof error === "string" ? error : "An unexpected error occurred. Please try again."}
    </p>
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

{!data && !loading &&
          activeTab !== "billing" &&
          activeTab !== "account" &&
          activeTab !== "history" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4AA]/20 bg-[#00D4AA]/8">
              <img src="/logo-icon.png" alt="Crawler Que" className="h-9 w-9 object-contain" />
            </div>
            <h3 className="text-lg font-bold text-white">Run your first audit</h3>
            <p className="mt-2 max-w-sm text-sm text-[#8A8A8A]">
              Enter a URL above, select your report modules, and click Run Audit to generate your growth intelligence report.
            </p>
          </div>
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
          {Number(
            currentUser?.auditsReserved ||
              0
          ) > 0
            ? ` ${currentUser.auditsReserved} audit(s) currently processing.`
            : ""}
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

      <PlanSwitcher currentUser={currentUser} />
    </div>
  </Section>
)}

{activeTab === "account" && (
  <AccountSettingsTab currentUser={currentUser} />
)}

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
const previous =
  history
    .slice(i + 1)
    .find((candidate) =>
      reportsAreComparable(
        item,
        candidate
      )
    );

const scoreChange =
  previous?.overallScore != null &&
  item?.overallScore != null
    ? item.overallScore -
      previous.overallScore
    : null;

if (
  item.recordType ===
  "attempt"
) {
  return (
    <div
      key={`attempt-${item.auditJobId}`}
      className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-white">
            {item.domain}
          </p>

          <p className="mt-1 text-xs text-[#8A8A8A]">
            {item.createdAt}
          </p>
        </div>

        <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300">
          {item.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#CCCCCC]">
        {item.userMessage ||
          "The audit did not complete."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        {item.traceId && (
          <span className="rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2 font-mono text-[#A0A0A0]">
            Reference: {item.traceId}
          </span>
        )}

        {item.creditRestored && (
          <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 font-semibold text-emerald-300">
            Audit credit restored
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            retryAuditAttempt(
              item
            );
          }}
          className="rounded-lg bg-[#C5FF3D] px-4 py-2 font-semibold text-black hover:opacity-90"
        >
          Retry Audit
        </button>
      </div>
    </div>
  );
}

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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${reviewStatusClass(item.reviewStatus || "draft")}`}>
                      {reviewStatusLabel(item.reviewStatus || "draft")}
                    </span>
                    {item?.approvedBy && (
                      <span className="text-[10px] text-slate-500">
                        Approved by {item.approvedBy.name || item.approvedBy.email || "Reviewer"}
                      </span>
                    )}
                  </div>
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

    selectComparisonReport(
      "A",
      item
    );
  }}
  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600"
>
  Compare A
</button>

<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();

    selectComparisonReport(
      "B",
      item
    );
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

        {data && (
  <>
{data?.renderReady === true ? (
  <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          Audit Status
        </p>

        <h3 className="mt-1 text-lg font-bold text-white">
          {[
            "failed",
            "timed_out",
          ].includes(
            String(
              data?.moduleStatus
                ?.technical ||
                data?.moduleStatus
                  ?.onPage ||
                ""
            )
          )
            ? "Audit Ready With a Technical Limitation"
            : "Audit Completed Successfully"}
        </h3>

        <p className="mt-1 text-sm text-[#A0A0A0]">
          Every selected module has reached
          a final status. The report is now
          safe to review, save, and export.
        </p>
      </div>

      <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-300">
        Report Ready
      </div>
    </div>
  </div>
) : (
  <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/8 p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Audit Status
        </p>

        <h3 className="mt-1 text-lg font-bold text-white">
          Finalizing Audit
        </h3>

        <p className="mt-1 text-sm text-[#A0A0A0]">
          Technical crawl processing is still
          active. PDF export will unlock
          automatically after finalization.
        </p>
      </div>

      <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-300">
        Processing
      </div>
    </div>
  </div>
)}
{/* CLIENT REVIEW */}
{activeTab === "review" && (
  <Section title="Agency Review & Client Approval">
    {!data?.reportId ? (
      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
        Open a completed saved report before starting client review.
      </div>
    ) : reviewLoading ? (
      <div className="rounded-2xl border border-[#222] bg-[#111] p-6 text-sm text-[#A0A0A0]">
        Loading client review...
      </div>
    ) : !reportReview || !reviewDraft ? (
      <div className="rounded-2xl border border-[#222] bg-[#111] p-6 text-sm text-[#A0A0A0]">
        Review data is not available yet. The audit must be completed and export-ready first.
      </div>
    ) : (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
                Client-facing report workflow
              </p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Preserve the automated evidence, then control what the client sees.
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8A8A8A]">
                The original audit is never overwritten. Agency edits are stored as a separate versioned review snapshot with a complete revision log.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${reviewStatusClass(reportReview?.status)}`}>
                {reviewStatusLabel(reportReview?.status)}
              </span>

              <span className="rounded-full border border-[#2A2A2A] bg-[#151515] px-4 py-2 text-xs text-[#A0A0A0]">
                Version {reportReview?.version || 1}
              </span>
            </div>
          </div>

          {reportReview?.approvedBy && (
            <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              Last approved by {reportReview.approvedBy.name || reportReview.approvedBy.email || "Reviewer"}
              {reportReview?.approvedAt
                ? ` on ${new Date(reportReview.approvedAt).toLocaleString()}`
                : ""}.
            </div>
          )}

          {currentUser?.canReviewReports !== true && (
            <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              Read-only access. Editing and approval are available on Agency and Enterprise access.
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm text-[#A0A0A0]">
              Client-facing note
              <textarea
                value={reviewDraft?.clientNote || ""}
                disabled={currentUser?.canReviewReports !== true}
                onChange={(event) =>
                  setReviewDraft((previous: any) => ({
                    ...previous,
                    clientNote: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Add context that should appear in the approved client report."
                className="mt-2 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-[#C5FF3D]/50 disabled:opacity-70"
              />
            </label>

            <label className="block text-sm text-[#A0A0A0]">
              Internal agency note
              <textarea
                value={reviewDraft?.internalNote || ""}
                disabled={currentUser?.canReviewReports !== true}
                onChange={(event) =>
                  setReviewDraft((previous: any) => ({
                    ...previous,
                    internalNote: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Private note for your team. This never appears in the client report or PDF."
                className="mt-2 w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-[#C5FF3D]/50 disabled:opacity-70"
              />
            </label>
          </div>

          {currentUser?.canReviewReports === true && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => void saveReportReview("save")}
                className="rounded-xl border border-[#2A2A2A] bg-[#151515] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#C5FF3D]/40 disabled:opacity-50"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => void saveReportReview("submit")}
                className="rounded-xl border border-blue-300/20 bg-blue-300/10 px-4 py-2.5 text-sm font-semibold text-blue-200 disabled:opacity-50"
              >
                Submit for Review
              </button>

              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => void saveReportReview("request_changes")}
                className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-200 disabled:opacity-50"
              >
                Request Changes
              </button>

              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => void saveReportReview("approve")}
                className="rounded-xl bg-[#C5FF3D] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
              >
                Approve Client Report
              </button>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-[#777]">
            Editing an approved report automatically creates a new Draft version. PDF export for Agency and Enterprise accounts remains locked until the current version is approved.
          </p>
        </div>

        {renderReviewItems(
          "issues",
          "Client-Facing Findings"
        )}

        {renderReviewItems(
          "recommendations",
          "Client-Facing Recommendations"
        )}

        {Array.isArray(reportReview?.revisions) && reportReview.revisions.length > 0 && (
          <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
            <h3 className="text-lg font-bold text-white">
              Review Audit Log
            </h3>
            <div className="mt-4 space-y-3">
              {reportReview.revisions.slice(0, 10).map((revision: any) => (
                <div
                  key={revision.id || revision.version}
                  className="flex flex-col justify-between gap-2 rounded-xl border border-[#252525] bg-[#151515] p-4 text-sm md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-semibold text-white">
                      Version {revision.version} · {reviewStatusLabel(revision.action)}
                    </p>
                    <p className="mt-1 text-xs text-[#777]">
                      {revision.actorName || revision.actorEmail || "Reviewer"}
                    </p>
                  </div>
                  <p className="text-xs text-[#8A8A8A]">
                    {revision.createdAt
                      ? new Date(revision.createdAt).toLocaleString()
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </Section>
)}


{/* UNIFIED OVERVIEW — merged into Overview tab */}
{activeTab === "overview" && data && (
<Section title="Intelligence Summary">
    <p className="mb-5 text-sm text-[#8A8A8A]">
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
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${moduleStatusUI(status).cls}`}
        >
          {moduleStatusUI(status).label}
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
              className="rounded-full border border-[#C5FF3D]/20 bg-[#C5FF3D]/8 px-3 py-1 font-mono text-[11px] font-semibold text-[#C5FF3D]"
            >
              {source}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8A8A8A]">
          No verified source data was returned for this section.
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
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  available
                    ? "border-[var(--cq-signal)]/40 bg-[var(--cq-signal)]/10 text-[var(--cq-signal)]"
                    : "border-[var(--cq-line)] bg-[var(--cq-surface-2)] text-[var(--cq-text-2)]"
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
{/* OVERVIEW */}
{activeTab === "overview" && (
  <>
    {data && (
      <>
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            ["SEO & Traffic Data", data?.moduleStatus?.dataforseo],
            ["AI Search Visibility", data?.moduleStatus?.aiOptimization],
            ["SERP API", data?.moduleStatus?.serp],
            ["OnPage API", data?.moduleStatus?.onPage],
            ["Backlinks API", data?.backlinks ? "available" : "not_available"],
            ["Keyword Research", data?.moduleStatus?.keywordResearch],
            ["Content Analysis", data?.moduleStatus?.contentAnalysis],
            ["Business Data", data?.moduleStatus?.businessData],
          ]
          .filter(([name]: any) => {
            const keyMap: any = {
              "SEO & Traffic Data": "traffic",
              "AI Search Visibility": "ai",
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
            const isOk      = status === "available" || status === "completed";
            const isPartial = status === "partial";
            const isSkipped = status === "skipped" || status === "not_selected";
            const isPending = status === "pending_or_not_available" || status === "pending";

            const dotColor = isOk
              ? "bg-[#C5FF3D]"
              : isPartial
              ? "bg-amber-400"
              : isSkipped
              ? "bg-[#444]"
              : isPending
              ? "bg-amber-400"
              : "bg-red-500";

            const statusText = isOk
              ? "Completed"
              : isPartial
              ? "Partial data returned"
              : isSkipped
              ? "Not selected for this audit"
              : isPending
              ? "Pending"
              : "No verified data returned";

            const borderColor = isOk
              ? "border-[#C5FF3D]/15"
              : isSkipped
              ? "border-[#1a1a1a]"
              : "border-[#222]";

            return (
              <div key={i} className={`rounded-2xl border ${borderColor} bg-[#111] p-4`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <div aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                </div>
                <p className={`mt-2 text-xs ${isSkipped ? "text-[#555]" : "text-[#8A8A8A]"}`}>
                  {statusText}
                </p>
              </div>
            );
          })}
        </div>

        {data?.moduleStatus && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
            <p className="font-semibold text-amber-400">Data Quality Notice</p>
            <p className="mt-1 text-sm text-amber-300/70">
              This report only shows data returned by connected APIs. If a module is marked unavailable, no fake or estimated replacement data is used.
            </p>
          </div>
        )}
      </>
    )}

<div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-[#C5FF3D]/15 bg-[#0d1500] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">
          Website Health
        </p>
        <h2 className="mt-3 text-3xl font-extrabold text-white">
          {data.overallScore == null
            ? "No data"
            : data.overallScore >= 80
            ? "Strong"
            : data.overallScore >= 60
            ? "Moderate"
            : "Needs Attention"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#8A8A8A]">
          Based on SEO, AI visibility, traffic, keyword gaps, backlinks, and technical signals.
        </p>
      </div>

      <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400/70">
          Biggest Issue
        </p>
        <p className="mt-3 text-xl font-bold text-white">
          {typeof data?.summary?.biggestIssue === "object"
            ? data?.summary?.biggestIssue?.title ||
              data?.summary?.biggestIssue?.label ||
              "Review audit issues"
            : data?.summary?.biggestIssue ||
              data?.issues?.[0]?.title ||
              "No issues detected"}
        </p>
      </div>

      <div className="rounded-2xl border border-[#C5FF3D]/15 bg-[#C5FF3D]/4 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C5FF3D]/60">
          Biggest Opportunity
        </p>
        <p className="mt-3 text-xl font-bold text-white">
          {typeof data?.summary?.biggestOpportunity === "object"
            ? data?.summary?.biggestOpportunity?.title ||
              data?.summary?.biggestOpportunity?.label ||
              "Review opportunities"
            : data?.summary?.biggestOpportunity || "No opportunities detected"}
        </p>
      </div>
    </div>

    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
      <MetricCard label="Overall" value={data.overallScore ?? "Data not available"} score={Number(data.overallScore || 0)} />
<MetricCard label="Share of Voice" value={`${shareOfVoice}%`} score={shareOfVoice} />
<MetricCard label="SEO" value={data.seoScore ?? "Data not available"} score={Number(data.seoScore || 0)} />
<MetricCard label="UX" value={data.uxScore ?? "Data not available"} score={Number(data.uxScore || 0)} />
<MetricCard
  label="AI"
  value={data?.aiSearchVisibility?.overallScore ?? "Data not available"}
  score={Number(data?.aiSearchVisibility?.overallScore || 0)}
/>
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
  <Section title="First-Party Content Quality">
    <p className="mb-5 text-sm text-slate-500">
      Only pages from the audited domain are included. External SERP pages are excluded from the Content Quality score and may be used only as separate competitive evidence.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Pages Requested"
        value={data?.contentAnalysis?.requestedPages ?? "Data not available"}
      />
      <MetricCard
        label="Pages Analyzed"
        value={data?.contentAnalysis?.analyzedPages ?? data?.contentAnalysis?.results?.length ?? "Data not available"}
      />
      <MetricCard
        label="Failed Pages"
        value={data?.contentAnalysis?.failedPages ?? 0}
      />
      <MetricCard
        label="Average Content Score"
        value={
          data?.contentAnalysis?.averageScore !== null &&
          data?.contentAnalysis?.averageScore !== undefined
            ? `${data.contentAnalysis.averageScore}/100`
            : "Data not available"
        }
      />
    </div>

    <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
      <p className="text-sm font-semibold text-blue-900">
        Scope: {data?.contentAnalysis?.scope || "first-party"}
      </p>
      <p className="mt-2 text-sm leading-6 text-blue-800">
        {data?.contentAnalysis?.note ||
          "Only URLs from the audited domain are included in this module."}
      </p>
    </div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Validated Non-Branded Content Opportunities
      </h3>

      {data?.dataforseo?.keywordGap?.opportunities?.length > 0 ? (
        <div className="grid gap-3">
          {data.dataforseo.keywordGap.opportunities.slice(0, 8).map((k: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                {i + 1}. {k.keyword}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Volume: {k.volume || "Data not available"} · Page type: {k.recommendedPageType || "Data not available"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No validated non-branded content opportunities are available.
        </p>
      )}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-950">
        Audited-Site Content Results
      </h3>

      {data?.contentAnalysis?.results?.length > 0 ? (
        <div className="grid gap-3">
          {data.contentAnalysis.results.slice(0, 10).map((item: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {i + 1}. {item.title || item.mainTopic || "Untitled page"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {item.url || "Data not available"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {item.score ?? "N/A"}/100 · {item.grade || "Unknown"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-4">
                <p>Words: {item.wordCount ?? "N/A"}</p>
                <p>H2s: {item.h2Count ?? "N/A"}</p>
                <p>Media: {item.mediaCount ?? "N/A"}</p>
                <p>Missing ALT: {item.imagesMissingAlt ?? "N/A"}</p>
              </div>

              {Array.isArray(item.issues) && item.issues.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.issues.slice(0, 4).map((issue: string, issueIndex: number) => (
                    <span key={issueIndex} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No first-party content pages could be analyzed.
        </p>
      )}
    </div>
  </Section>
)}
{/* LOCAL SEO */}
{activeTab === "localSeo" && (
  <Section title="Local SEO & Business Listings">
<p className="mb-5 text-sm text-slate-500">
  The query combines the audited brand, service/category, and selected location. Only verified brand matches are presented as the audited business&apos;s listings; wider market results remain separate.
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

    {data?.businessData?.note && (
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        {data.businessData.note}
      </div>
    )}

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
          No exact brand listing was verified for this brand + service + location query. Wider market results are not being mislabelled as the audited business.
        </p>
      )}
    </div>
  </Section>
)}
{/* SEO LABS */}
{activeTab === "labs" && (
  <Section title="Crawler Que Labs Intelligence">
    <p className="mb-5 text-sm text-slate-500">
      Shows ranked keywords, keyword gaps, organic competitors, and visibility signals from Crawler Que Labs.
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
          <p className="text-sm text-slate-500">No verified SEO Labs data was returned for this audit.</p>
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
  <Section title="Domain Analytics — Provider Signals">
    <p className="mb-5 text-sm text-slate-500">
      Separate provider signals for context. These figures do not replace the canonical Traffic Intelligence estimate used in the overview, history, or PDF.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Organic Keywords"
        value={data?.domainAnalytics?.organicKeywords ?? "Data not available"}
      />
<MetricCard
  label="Organic Traffic Signal"
  value={
    data?.domainAnalytics?.organicTrafficSignal != null ||
    data?.domainAnalytics?.organicTraffic != null
      ? Math.round(
          Number(
            data?.domainAnalytics?.organicTrafficSignal ??
              data?.domainAnalytics?.organicTraffic ??
              0
          )
        ).toLocaleString()
      : "Data not available"
  }
  tooltip="Provider signal only. It is excluded from the canonical executive traffic estimate."
/>
      <MetricCard
        label="Organic Cost"
        value={
          data?.domainAnalytics?.organicCost != null
            ? `$${Number(data.domainAnalytics.organicCost).toFixed(2)}`
            : "Data not available"
        }
      />
      <MetricCard
        label="Paid Keywords"
        value={data?.domainAnalytics?.paidKeywords ?? "0"}
      />
      <MetricCard
        label="Paid Traffic"
        value={
          data?.domainAnalytics?.paidTraffic != null
            ? Math.round(Number(data.domainAnalytics.paidTraffic)).toLocaleString()
            : "0"
        }
      />
      <MetricCard
        label="Paid Cost"
        value={
          data?.domainAnalytics?.paidCost != null && Number(data.domainAnalytics.paidCost) > 0
            ? `$${Number(data.domainAnalytics.paidCost).toFixed(2)}`
            : "$0.00"
        }
      />
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
<div className="rounded-2xl border border-[#222] bg-[#111] p-5">
        <h3 className="mb-4 font-semibold text-white">
          Provider Organic vs Paid Traffic Signals
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  type: "Organic",
                  traffic: Math.round(
                    Number(
                      data?.domainAnalytics?.organicTrafficSignal ??
                        data?.domainAnalytics?.organicTraffic ??
                        0
                    )
                  ),
                },
                {
                  type: "Paid",
                  traffic: Math.round(Number(data?.domainAnalytics?.paidTraffic || 0)),
                },
              ]}
            >
              <XAxis dataKey="type" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="traffic" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
        <h3 className="mb-4 font-semibold text-white">
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
              <XAxis dataKey="type" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="keywords" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-950">Domain Insight</h3>
      <p className="text-sm leading-6 text-slate-600">
        {data?.domainAnalytics
          ? "This section shows the domain’s organic and paid visibility signals from Crawler Que. Use this to compare whether the website is relying more on organic discovery or paid acquisition."
          : "No verified domain analytics signal was returned for this audit."}
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

{Array.isArray(data?.recommendations) &&
data.recommendations.length > 0 ? (
  <ul className="list-disc space-y-3 pl-5 text-sm text-slate-600">
    {data.recommendations
      .slice(0, 8)
      .map((rawRec: any, i: number) => {
        const rec =
          typeof rawRec === "string"
            ? {
                title:
                  String(rawRec).split(".")[0] ||
                  `Recommendation ${i + 1}`,
                detail: rawRec,
              }
            : rawRec || {};

        const title =
          rec?.title ||
          rec?.label ||
          `Recommendation ${i + 1}`;

        const detail =
          rec?.detail ||
          rec?.description ||
          rec?.recommendation ||
          rec?.action ||
          "";

        return (
          <li
            key={rec?.id || i}
            className="leading-6"
          >
            <span className="font-semibold text-slate-950">
              {String(title)}
            </span>

            {detail &&
            String(detail) !== String(title) ? (
              <span className="block text-slate-600">
                {String(detail)}
              </span>
            ) : null}
          </li>
        );
      })}
  </ul>
) : (
  <p className="text-sm text-slate-500">
    No evidence-backed recommendations were returned for this audit.
  </p>
)}
    </div>
  </Section>
)}

{/* AI */}
{activeTab === "ai" && (
data?.aiSearchVisibility || data?.aiOptimization || data?.aiVisibility ? (
  <Section title="AI Search Visibility™">
    {/* ════════════════════════════════════════════════════════════════════ */}
{/* 🆕 LIVE AI MODEL VISIBILITY — ChatGPT · Claude · Gemini (PRIMARY)     */}
{/* Paste this block RIGHT AFTER the line: <Section title="AI Search Visibility™"> */}
{/* ════════════════════════════════════════════════════════════════════ */}

{/* ════════════════════════════════════════════════════════════════════ */}
{/* 🆕 LIVE AI MODEL VISIBILITY (V2) — paste RIGHT AFTER:                  */}
{/*    <Section title="AI Search Visibility™">                            */}
{/* ════════════════════════════════════════════════════════════════════ */}
{data?.aiSearchVisibility ? (
  <div className="mb-8">
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex h-2 w-2 rounded-full bg-[#00D4AA]" />
      <span className="text-xs font-semibold uppercase tracking-wide text-[#00D4AA]">
        Live AI Models · {(data.aiSearchVisibility.modelsCalled || []).join(" · ") || "ChatGPT · Claude · Gemini"}
      </span>
      {data.aiSearchVisibility.country && (
        <span className="rounded-full border border-[#1e3a5f] bg-[#122B4E] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#94A3B8]">
          Market: {data.aiSearchVisibility.country}
        </span>
      )}
    </div>

    {/* 🆕 headline: Awareness vs Competitive Visibility */}
    {data.aiSearchVisibility.brandKnowledge && (
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] rounded-2xl border border-[#00D4AA]/30 bg-[#00D4AA]/5 p-4">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">AI Awareness</p>
          <p className="text-2xl font-extrabold text-[#00D4AA]">{data.aiSearchVisibility.brandKnowledge.score}/100</p>
          <p className="text-[11px] text-[#94A3B8]">Do AI models know your brand exists?</p>
        </div>
        <div className="flex-1 min-w-[200px] rounded-2xl border border-[#1e3a5f] bg-[#0E2440] p-4">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Competitive Visibility</p>
          <p className="text-2xl font-extrabold text-white">{data.aiSearchVisibility.overallScore}/100</p>
          <p className="text-[11px] text-[#94A3B8]">
  Does AI recommend you for generic &quot;best X&quot; searches?
</p>
        </div>
      </div>
    )}

    {/* 4 metric cards */}
    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard label="Overall AI Score" value={`${data.aiSearchVisibility.overallScore}/100`} score={Number(data.aiSearchVisibility.overallScore || 0)} tooltip="Spontaneous visibility: does AI recommend you for category questions?" />
      <MetricCard label="Visibility Rate" value={`${data.aiSearchVisibility.visibilityRate}%`} score={Number(data.aiSearchVisibility.visibilityRate || 0)} tooltip="Share of category prompts where your brand appeared." />
      <MetricCard label="Avg Position" value={data.aiSearchVisibility.avgPosition ? `${data.aiSearchVisibility.avgPosition} / 5` : "—"} tooltip="Average rank when mentioned (1 = first)." />
      <MetricCard label="Sentiment Score" value={`${data.aiSearchVisibility.sentimentScore}/100`} score={Number(data.aiSearchVisibility.sentimentScore || 0)} tooltip="How positive the mentions of your brand are." />
    </div>

    {/* per-model visibility */}
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {[["ChatGPT", data.aiSearchVisibility.modelBreakdown?.chatgpt], ["Claude", data.aiSearchVisibility.modelBreakdown?.claude], ["Gemini", data.aiSearchVisibility.modelBreakdown?.gemini]].map(([name, pct]: any) => (
        <div key={name} className="rounded-2xl border border-[#1e3a5f] bg-[#0E2440] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{name}</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{pct ?? 0}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#0B1929]"><div className="h-1.5 rounded-full bg-[#00D4AA]" style={{ width: `${pct ?? 0}%` }} /></div>
        </div>
      ))}
    </div>

    {/* 🆕 BRAND KNOWLEDGE — does AI actually know you? (Feature A) */}
    {data.aiSearchVisibility.brandKnowledge && (
      <div className="mb-6 rounded-2xl border border-[#00D4AA]/30 bg-[#00D4AA]/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Does AI Know Your Brand?</h3>
          <span className="text-2xl font-extrabold text-[#00D4AA]">{data.aiSearchVisibility.brandKnowledge.score}/100</span>
        </div>
        <p className="mb-3 text-xs text-[#94A3B8]">
          Recognised by:{" "}
          {(data.aiSearchVisibility.brandKnowledge.knownBy || []).length > 0
            ? (data.aiSearchVisibility.brandKnowledge.knownBy || []).join(", ")
            : "none of the models recognise this brand yet"}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {["ChatGPT", "Claude", "Gemini"].map((m) => {
            const k = data.aiSearchVisibility.brandKnowledge.models?.[m];
            if (!k) return null;
            return (
              <div key={m} className="rounded-xl border border-[#1e3a5f] bg-[#0E2440] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-[#64748B]">{m}</span>
                  <span className={k.knows ? "text-[#00D4AA] text-xs font-semibold" : "text-[#64748B] text-xs"}>{k.knows ? "Knows ✓" : "Unknown"}</span>
                </div>
                {k.snippet && <p className="text-[11px] leading-snug text-[#94A3B8]">{k.snippet}…</p>}
                {k.citedPage && <p className="mt-1 truncate text-[11px] text-[#00D4AA]">cited: {k.citedPage}</p>}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* prompt results table (with cited page) */}
    {data.aiSearchVisibility.promptResults?.length > 0 && (
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#1e3a5f] bg-[#0E2440]">
        <div className="border-b border-[#1e3a5f] px-5 py-3">
          <h3 className="font-semibold text-white">Category Prompt Results</h3>
          <p className="text-xs text-[#64748B]">Does AI recommend you for what you rank for? ✅ mentioned, ❌ missing.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-[#64748B]">
              <th className="px-5 py-3">Prompt</th><th className="px-3 py-3 text-center">ChatGPT</th><th className="px-3 py-3 text-center">Claude</th><th className="px-3 py-3 text-center">Gemini</th><th className="px-3 py-3 text-center">Avg Pos</th>
            </tr></thead>
            <tbody>
              {data.aiSearchVisibility.promptResults.map((row: any, i: number) => {
                const cell = (m: any) => !m ? <span className="text-[#475569]">—</span> : m.mentioned
                  ? <span className="text-[#00D4AA]">✅{m.position ? ` #${m.position}` : ""}{m.citedPage ? " 🔗" : ""}</span>
                  : <span className="text-[#64748B]">❌</span>;
                return (
                  <tr key={i} className="border-t border-[#13294a]">
                    <td className="px-5 py-3 text-white">{row.prompt}</td>
                    <td className="px-3 py-3 text-center">{cell(row.models?.ChatGPT)}</td>
                    <td className="px-3 py-3 text-center">{cell(row.models?.Claude)}</td>
                    <td className="px-3 py-3 text-center">{cell(row.models?.Gemini)}</td>
                    <td className="px-3 py-3 text-center text-[#94A3B8]">{row.avgPosition ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* 🆕 AI CITATIONS — which of your pages AI referenced */}
    {data.aiSearchVisibility.citations?.length > 0 && (
      <div className="mb-6 rounded-2xl border border-[#1e3a5f] bg-[#0E2440] p-5">
        <h3 className="mb-1 font-semibold text-white">Pages AI Cited</h3>
        <p className="mb-3 text-xs text-[#64748B]">Your URLs that AI models referenced in their answers.</p>
        <div className="space-y-2">
          {data.aiSearchVisibility.citations.map((c: any, i: number) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#13294a] bg-[#0B1929] px-3 py-2">
              <span className="truncate text-sm text-[#E2E8F0]">{c.url}</span>
              <span className="text-[11px] text-[#00D4AA]">{(c.models || []).join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 🆕 PAGES & KEYWORDS — which keyword makes which page rank (Crawler Que) */}
    {data.aiSearchVisibility.rankedPages?.length > 0 && (
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#1e3a5f] bg-[#0E2440]">
        <div className="border-b border-[#1e3a5f] px-5 py-3">
          <h3 className="font-semibold text-white">Your Pages & The Keywords They Rank For</h3>
          <p className="text-xs text-[#64748B]">Real ranking data — the keywords driving each page (basis for AI prompts).</p>
        </div>
        <div className="divide-y divide-[#13294a]">
          {data.aiSearchVisibility.rankedPages.map((p: any, i: number) => (
            <div key={i} className="px-5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-white">{p.path || p.url}</span>
                <span className="shrink-0 text-[11px] text-[#64748B]">{p.totalVolume?.toLocaleString?.() || p.totalVolume} vol</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(p.keywords || []).slice(0, 6).map((k: any, j: number) => (
                  <span key={j} className="rounded-full border border-[#1e3a5f] bg-[#122B4E] px-2.5 py-0.5 text-[11px] text-[#E2E8F0]">
                    {k.keyword}{k.position ? <span className="text-[#64748B]"> · #{k.position}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* top competitors + missed opportunities */}
    <div className="mb-8 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#1e3a5f] bg-[#0E2440] p-5">
        <h3 className="mb-3 font-semibold text-white">Top Competitors in AI Answers</h3>
        {data.aiSearchVisibility.topCompetitors?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.aiSearchVisibility.topCompetitors.map((c: string, i: number) => (
              <span key={i} className="rounded-full border border-[#1e3a5f] bg-[#122B4E] px-3 py-1 text-xs text-[#E2E8F0]">{c}</span>
            ))}
          </div>
        ) : <p className="text-sm text-[#64748B]">No competitors detected.</p>}
      </div>
      <div className="rounded-2xl border border-[#00D4AA]/30 bg-[#00D4AA]/5 p-5">
        <h3 className="mb-2 font-semibold text-white">Missed Opportunities</h3>
        <p className="mb-3 text-xs text-[#94A3B8]">Prompts where your brand was not mentioned — turn these into content.</p>
        {data.aiSearchVisibility.missedPrompts?.length > 0 ? (
          <ul className="space-y-2">
            {data.aiSearchVisibility.missedPrompts.slice(0, 5).map((p: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-[#E2E8F0]"><span className="text-[#00D4AA]">→</span><span>{p}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-[#00D4AA]">Your brand appeared in every tested prompt. 🎉</p>}
      </div>
    </div>

    <div className="mb-2 border-t border-[#1e3a5f] pt-6">
<p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Detailed Model Analysis</p>
    </div>
  </div>
) : null}
{/* ════════════════════ END V2 BLOCK ════════════════════ */}

    <p className="mb-5 text-sm text-slate-500">
      Deeper per-model breakdown and competitor share, expanding on the live results above.
    </p>

<div className="mb-6 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Brand Mentions"
        value={
          data?.aiSearchVisibility?.brandMentionCount ??
          "Data not available"
        }
      />
      <MetricCard
        label="Models Checked"
        value={
          Array.isArray(data?.aiSearchVisibility?.modelsCalled)
            ? data.aiSearchVisibility.modelsCalled.length
            : "Data not available"
        }
      />
      <MetricCard
  label="Share of Voice"
  value={`${shareOfVoice}%`}
  score={shareOfVoice}
/>
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
<div className="rounded-2xl border border-[#222] bg-[#111] p-5">
        <h3 className="mb-4 font-semibold text-white">
          Brand vs Competitor Mentions
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={competitorChartData}>
              <XAxis dataKey="name" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="mentions" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
        <h3 className="mb-4 font-semibold text-white">
          Model Mention Coverage
        </h3>

        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="mentioned" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

<div className="mb-6 rounded-2xl border border-[#222] bg-[#111] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
        Scoring Methodology
      </p>
      <p className="mt-2 text-sm leading-6 text-white">
        Only unbranded category prompts are scored. Brand-named knowledge checks and branded custom prompts are evidence only.
      </p>
    </div>

    {data?.aiVisibility?.pageGeoReadiness && (
      <div className="mb-6 rounded-2xl border border-[#222] bg-[#111] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">AI Citation Readiness — Audited Page</h3>
          <span className="rounded-full bg-[#C5FF3D]/10 px-3 py-1 text-xs font-semibold text-[#C5FF3D]">
            {data.aiVisibility.pageGeoReadiness.score}/100 · {data.aiVisibility.pageGeoReadiness.grade}
          </span>
        </div>
        <p className="mb-4 text-sm text-[#8A8A8A]">
          How well the audited page is structured for AI assistants to read, summarize, and cite — based on
          headings, content depth, structured data, and accessibility signals from this page.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.aiVisibility.pageGeoReadiness.factors.map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[#222] px-3 py-2 text-sm">
              <span className={f.pass ? "text-[#C5FF3D]" : "text-[#777]"}>{f.pass ? "✓" : "○"}</span>
              <span className={f.pass ? "text-white" : "text-[#8A8A8A]"}>{f.label}</span>
            </div>
          ))}
        </div>
        {data.aiVisibility.pageGeoReadiness.topIssue && (
          <p className="mt-4 text-sm text-[#8A8A8A]">
            <span className="font-semibold text-[#C5FF3D]">Top fix: </span>
            {data.aiVisibility.pageGeoReadiness.topIssue}
          </p>
        )}
      </div>
    )}

    <div className="mb-6 rounded-2xl border border-[#C5FF3D]/25 bg-[#0d1500] p-5">
      <h3 className="font-semibold text-white">AI Opportunity Insight</h3>
      <p className="mt-2 text-sm leading-6 text-[#B7C59A]">
        {data?.aiSearchVisibility
          ? Number(data.aiSearchVisibility.brandMentionCount || 0) === 0
            ? "The brand was not mentioned across the scored unbranded category prompts. Build stronger entity signals, trusted citations, category content, and topical authority."
            : data.aiSearchVisibility.confidence === "low"
              ? "The brand appeared in a limited valid model sample. Treat this as directional until prompt and model response coverage improves."
              : "The brand appeared in at least one unbranded category result. Expand coverage, citations, and consistency across prompts."
          : "Canonical AI visibility data was not available."}
      </p>
    </div>

    <div className="rounded-2xl border border-[#222] bg-[#111] p-5 text-sm leading-6 text-[#A0A0A0]">
      Model-level evidence is shown from the canonical AI Search Visibility results above. Legacy AI Optimization responses are excluded from the report.
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
      Powered by Crawler Que Labs competitor keyword overlap. Shows keywords competitors rank for where this domain has weak or no visibility.
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
          No verified keyword-gap opportunities were returned for this audit.
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
  <Section title="Evidence-Backed Recommendations">
    <p className="mb-5 text-sm text-slate-500">
      Every action is tied to a source module, evidence, affected URLs, validation status, owner, effort, and timeline. Competitor-branded keyword gaps are excluded from the standard roadmap.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Recommendations"
        value={data?.recommendations?.length ?? "Data not available"}
      />
      <MetricCard
        label="Source"
        value={data?.aiRecommendations?.source || "Evidence-Backed Recommendation Engine"}
      />
      <MetricCard
        label="Primary Opportunity"
        value={data?.unifiedOverview?.primaryOpportunity || "Data not available"}
      />
      <MetricCard
        label="Branded Gaps Suppressed"
        value={data?.aiRecommendations?.suppressedCompetitorBrandedKeywords ?? 0}
      />
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      {data?.recommendations?.length > 0 ? (
        data.recommendations.slice(0, 10).map((rawRec: any, i: number) => {
          const rec = typeof rawRec === "string"
            ? {
                title: String(rawRec).split(".")[0],
                detail: rawRec,
                impact: "Medium",
                effort: "Medium",
                owner: "Growth Team",
                timeline: "31–60 days",
                sourceModule: "Recommendations",
                validationStatus: "directional",
                evidence: [],
                affectedUrls: [],
              }
            : rawRec || {};

          const impact = String(rec?.impact || "Medium");
          const impactClass = impact.toLowerCase().includes("high")
            ? "bg-red-50 text-red-600"
            : impact.toLowerCase().includes("low")
              ? "bg-green-50 text-green-600"
              : "bg-amber-50 text-amber-600";

          return (
            <div
              key={rec?.id || i}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Priority {i + 1} · {rec?.sourceModule || "Recommendations"}
                </p>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${impactClass}`}>
                  {impact} Impact
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-950">
                {rec?.title || `Recommendation ${i + 1}`}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {rec?.detail || "Review this recommendation against the attached evidence."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Timeline</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {rec?.timeline || "31–60 days"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Owner</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {rec?.owner || "Growth Team"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Effort / Validation</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">
                    {rec?.effort || "Medium"} · {rec?.validationStatus || "directional"}
                  </p>
                </div>
              </div>

              {Array.isArray(rec?.affectedUrls) && rec.affectedUrls.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-blue-700">Affected URLs</p>
                  <div className="mt-2 space-y-1">
                    {rec.affectedUrls.slice(0, 3).map((affectedUrl: string, urlIndex: number) => (
                      <p key={urlIndex} className="break-all text-xs text-blue-700">
                        {affectedUrl}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(rec?.evidence) && rec.evidence.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Evidence</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {rec.evidence.slice(0, 4).map((evidence: string, evidenceIndex: number) => (
                      <li key={evidenceIndex}>• {evidence}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            No evidence-backed recommendations were generated for the available data.
          </p>
        </div>
      )}
    </div>

    <div className="mt-8 grid gap-5 lg:grid-cols-3">
      {[
        ["First 30 Days", data?.actionRoadmap?.first30Days, "0–30 days"],
        ["Next 30 Days", data?.actionRoadmap?.next30Days, "31–60 days"],
        ["Final 30 Days", data?.actionRoadmap?.final30Days, "61–90 days"],
      ].map(([label, items, timeline]: any) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{timeline}</p>
          <h3 className="mt-2 font-bold text-slate-950">{label}</h3>
          {Array.isArray(items) && items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {items.slice(0, 4).map((item: any, index: number) => (
                <div key={item?.id || index} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {item?.title || `Action ${index + 1}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item?.owner || "Growth Team"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No validated actions assigned to this phase.</p>
          )}
        </div>
      ))}
    </div>
  </Section>
)}
{/* KEYWORD RESEARCH */}
{activeTab === "keywordResearch" && (
  <Section title="Keyword Research">
    <p className="mb-5 text-sm text-slate-500">
      Powered by Crawler Que Keyword Suggestions API. Shows real keyword ideas from the selected seed keyword.
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
                      CPC: {formatCurrency(k.cpc, "USD", "Not available")} | Competition:{" "}
{Number.isFinite(Number(k.competition))
  ? formatPercentage(Math.round(Number(k.competition) * 100), 0, "Not available")
  : "Not available"} | Intent:{" "}
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
          No verified keyword suggestions were returned for this audit.
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
      Powered by Crawler Que Backlinks API. Shows authority signals, referring domains, and top backlink sources.
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
          : "No verified backlink data was returned for this audit."}
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
          No verified backlink data was returned for this audit.
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
      Powered by Crawler Que SERP API. Shows if the audited domain appears in Google’s top results for tracked keywords.
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

<div className="mb-6 rounded-2xl border border-[#222] bg-[#111] p-5">
      <h3 className="mb-4 font-semibold text-white">
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
            <XAxis dataKey="keyword" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 10 }} />
            <YAxis allowDecimals={false} reversed stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
              labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: any) => [`#${value}`, "Rank Position"]}
            />
            <Bar dataKey="rank" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
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
          No verified SERP ranking data was returned for this audit.
        </p>
      )}
    </div>
  </Section>
)}
{/* TECHNICAL AUDIT */}
{activeTab === "technical" && (
  <Section title="Technical SEO Audit">
    <p className="mb-5 text-sm text-slate-500">
      Powered by Crawler Que OnPage API. The crawl cap, discovered pages, completed pages, failures, remaining pages, coverage, and confidence are shown separately so partial crawls are never presented as complete.
    </p>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Pages Discovered"
        value={data?.onPage?.discoveredPages ?? "Data not available"}
      />
      <MetricCard
        label="Pages Crawled"
        value={data?.onPage?.crawledPages ?? "Data not available"}
      />
      <MetricCard
        label="Coverage"
        value={
          data?.onPage?.coveragePercent !== null &&
          data?.onPage?.coveragePercent !== undefined
            ? `${data.onPage.coveragePercent}%`
            : "Data not available"
        }
      />
      <MetricCard
        label="Crawl Page Limit"
        value={data?.onPage?.pageLimit ?? 100}
      />
    </div>

    <div className="mb-6 grid gap-4 md:grid-cols-4">
      <MetricCard
        label="Completed Pages"
        value={data?.onPage?.completedPages ?? "Data not available"}
      />
      <MetricCard
        label="Failed Pages"
        value={data?.onPage?.failedPages ?? "Data not available"}
      />
      <MetricCard
        label="Remaining Pages"
        value={data?.onPage?.remainingPages ?? "Data not available"}
      />
      <MetricCard
        label="Outside Crawl Limit"
        value={data?.onPage?.outsideLimitPages ?? 0}
      />
    </div>

    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-950">Crawl Status</h3>
        <p className="text-sm leading-6 text-slate-600">
          {data?.onPage?.crawlStatus || "No finalized technical crawl data was returned for this audit."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Confidence: {data?.onPage?.confidence || data?.reconciliation?.technical?.confidence || "unknown"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-950">Coverage Meaning</h3>
        <p className="text-sm leading-6 text-slate-600">
          {data?.onPage?.isPartial
            ? "This is a partial technical result. Recommendations are limited to the pages and issues that were actually inspected."
            : "The requested in-scope crawl completed without a recorded coverage limitation."}
        </p>
      </div>
    </div>

    {(data?.onPage?.limitation || data?.reconciliation?.technical?.limitation) && (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">Technical coverage limitation</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          {data?.onPage?.limitation || data?.reconciliation?.technical?.limitation}
        </p>
      </div>
    )}

    <div className="mb-6 grid gap-4 md:grid-cols-4">
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
      <MetricCard
        label="Duplicate Titles"
        value={data?.onPage?.duplicateTitle ?? "Data not available"}
      />
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
          No page-level technical evidence is available yet. The server-side finalizer will continue checking the crawl after the browser is closed.
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
                <span>CPC: {formatCurrency(k.cpc, "USD", "Not available")}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No verified organic keyword data was returned for this audit.
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
      Organic competitors are identified using Crawler Que keyword overlap and ranking visibility.
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

<div className="mb-6 rounded-2xl border border-[#222] bg-[#111] p-5">
      <h3 className="mb-4 font-semibold text-white">
        Shared Keyword Overlap
      </h3>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seoCompetitorChartData}>
            <XAxis dataKey="name" stroke="#555" tick={{ fill: "#8A8A8A", fontSize: 10 }} />
            <YAxis allowDecimals={false} stroke="#333" tick={{ fill: "#8A8A8A", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
              labelStyle={{ color: "#C5FF3D", fontWeight: "bold" }}
              itemStyle={{ color: "#fff" }}
            />
            <Bar dataKey="threatScore" fill="#C5FF3D" radius={[4, 4, 0, 0]} />
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
          No verified competitor data was returned for this audit.
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

const MODULE_STATUS_UI: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "border-[var(--cq-signal)]/40 bg-[var(--cq-signal)]/10 text-[var(--cq-signal)]" },
  partial:   { label: "Partial",   cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  failed:    { label: "Failed",    cls: "border-red-400/40 bg-red-400/10 text-red-300" },
  available: { label: "No data",   cls: "border-[var(--cq-line)] bg-[var(--cq-surface-2)] text-[var(--cq-text-2)]" },
  pending_or_not_available: { label: "Unavailable", cls: "border-[var(--cq-line)] bg-[var(--cq-surface-2)] text-[var(--cq-text-2)]" },
};
const moduleStatusUI = (s: any) =>
  MODULE_STATUS_UI[String(s || "").toLowerCase()] ??
  { label: String(s || "—"), cls: "border-[var(--cq-line)] bg-[var(--cq-surface-2)] text-[var(--cq-text-2)]" };

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

  return null;
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Reset white-label branding to Crawler Que defaults? This will clear your agency name, logo, colour, and footer text.")) {
                      setForm({
                        ...form,
                        agencyName:        "",
                        brandColor:        "#C5FF3D",
                        brandLogoUrl:      "",
                        pdfFooterText:     "",
                        whiteLabelEnabled: false,
                      });
                    }
                  }}
                  className="rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-red-400 transition hover:border-red-500/50 hover:bg-red-500/15"
                >
                  Reset to Default
                </button>
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
<Link
  href="/#pricing"
  className="mt-4 inline-block rounded-xl border border-[#C5FF3D]/30 px-4 py-2 text-sm font-semibold text-[#C5FF3D]"
>
  View plans &#8594;
</Link>
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

        <p className="text-xs text-[#555]">
          Changes take effect on the next PDF export. Use <span className="text-[#8A8A8A]">Reset to Default</span> to switch back to Crawler Que branding at any time. Reset only clears the form — click Save Settings to save the reset to your account.
        </p>
      </div>
    </Section>
  );
}

const ALL_PLANS = [
  { name: "Starter",    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!,    price: 30,  audits: 7 },
  { name: "Agency",     priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY!,     price: 99,  audits: 40 },
  { name: "Enterprise", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!, price: 299, audits: 150 },
];

const TRIAL_CONVERT_PLANS = [
  { name: "Starter",    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!,    price: 30,  audits: 7 },
  { name: "Agency",     priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY!,     price: 99,  audits: 40 },
  { name: "Enterprise", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!, price: 299, audits: 150 },
];

function TrialBanner({ currentUser }: { currentUser: any }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const trial = currentUser?.trial;

  const choosePlan = async (priceId: string, planName: string) => {
    if (!confirm(`Continue with the ${planName} plan? Your trial will end and billing will start now.`)) return;
    setLoading(planName);
    setError("");
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to switch plan");
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const daysLeft = trial?.daysRemaining ?? 0;
  const auditsLeft = trial?.auditsRemaining ?? 0;
  const urgent = daysLeft <= 2 || auditsLeft === 0;

  return (
    <div className={`cq-card cq-frame mb-6 !rounded-none p-6 ${urgent ? "border-amber-400/50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`cq-eyebrow ${urgent ? "text-amber-300" : "cq-eyebrow--signal"}`}>
            {urgent ? "Trial ending soon" : "Free trial"}
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">
            {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial` : "Your trial has ended"}
          </h3>
          <p className="mt-1 text-sm text-[#8A8A8A]">
            {auditsLeft} of {trial?.auditsLimit ?? 3} trial audits remaining.{" "}
            {auditsLeft === 0 || daysLeft === 0
              ? "Choose a plan below to keep using Crawler Que."
              : "Choose a plan anytime to continue without interruption."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {TRIAL_CONVERT_PLANS.map(plan => (
          <div key={plan.name} className="rounded-xl border border-[#222] bg-[#0A0A0A] p-4">
            <h4 className="text-base font-bold text-white">{plan.name}</h4>
            <p className="mt-1 font-mono text-2xl font-bold text-white">
              ${plan.price}<span className="text-xs text-[#8A8A8A]">/mo</span>
            </p>
            <p className="mt-1 text-xs text-[#8A8A8A]">{plan.audits} audits / month</p>
            <button
              onClick={() => choosePlan(plan.priceId, plan.name)}
              disabled={loading === plan.name}
              className="mt-4 w-full rounded-lg bg-[#C5FF3D] px-3 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
            >
              {loading === plan.name ? "Switching…" : "Choose this plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSwitcher({ currentUser }: { currentUser: any }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentPrice = ALL_PLANS.find(p => p.name === currentUser?.package?.name)?.price || 0;

  const changePlan = async (priceId: string, planName: string) => {
    if (planName === currentUser?.package?.name) return;
    const action = ALL_PLANS.find(p => p.name === planName)!.price > currentPrice ? "upgrade" : "downgrade";
    if (!confirm(`${action === "upgrade" ? "Upgrade" : "Downgrade"} to the ${planName} plan? Billing will be adjusted automatically.`)) return;

    setLoading(planName);
    setError("");
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to change plan");
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#222] bg-[#111] p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
        Change Plan
      </p>
      <p className="mt-2 text-sm text-[#ccc]">
        Switch plans instantly. Upgrades apply immediately with prorated billing; downgrades take effect at your next billing date.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {ALL_PLANS.map(plan => {
          const isCurrent = plan.name === currentUser?.package?.name;
          const action = plan.price > currentPrice ? "Upgrade" : plan.price < currentPrice ? "Downgrade" : "Current";
          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-4 ${
                isCurrent ? "border-[#C5FF3D]/40 bg-[#C5FF3D]/5" : "border-[#222] bg-[#0A0A0A]"
              }`}
            >
              {isCurrent && (
                <span className="mb-2 inline-block rounded-full bg-[#C5FF3D] px-2.5 py-0.5 text-xs font-bold text-black">
                  Current
                </span>
              )}
              <h4 className="text-base font-bold text-white">{plan.name}</h4>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                ${plan.price}<span className="text-xs text-[#8A8A8A]">/mo</span>
              </p>
              <p className="mt-1 text-xs text-[#8A8A8A]">{plan.audits} audits / month</p>
              <button
                onClick={() => changePlan(plan.priceId, plan.name)}
                disabled={isCurrent || loading === plan.name}
                className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-bold transition ${
                  isCurrent
                    ? "cursor-default bg-[#222] text-[#8A8A8A]"
                    : "bg-[#C5FF3D] text-black hover:opacity-90"
                }`}
              >
                {loading === plan.name ? "Updating…" : isCurrent ? "Current Plan" : `${action} →`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
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

function ScopeValue({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] p-4">
      <p className="text-xs uppercase tracking-wide text-[#777]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not available"
          : String(value)}
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
        "Verified data available"
      : typeof value === "number"
        ? formatCompactNumber(value, "--")
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
            <p className="cq-eyebrow">
              {label}
            </p>

            {tooltip && (
              <span
                role="note"
                tabIndex={0}
                aria-label={tooltip}
                title={tooltip}
                className="cursor-help rounded-full border border-[var(--cq-line)] bg-[var(--cq-surface-2)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--cq-text-2)]"
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

      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="cq-card mb-6 p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-[var(--cq-text)]">
            {title}
          </h2>
          <span className="h-1 w-6 bg-[var(--cq-signal)]" />
        </div>
        <div className="cq-scanline mt-3" />
      </div>

      {children}
    </div>
  );
}

function IssueCard({ issue }: any) {
  const safeIssue =
    typeof issue === "string"
      ? {
          title: issue,
          impact:
            "Review this issue and validate the affected page.",
          fix: "",
        }
      : issue || {};

  const getIssueText = (
    value: any,
    fallback: string
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return String(value);
    }

    if (typeof value === "object") {
      return String(
        value?.title ||
          value?.label ||
          value?.detail ||
          value?.description ||
          value?.message ||
          fallback
      );
    }

    return fallback;
  };

  const issueTitle = getIssueText(
    safeIssue?.title ||
      safeIssue?.issue ||
      safeIssue?.label,
    "Audit issue"
  );

  const issueImpact = getIssueText(
    safeIssue?.impact ||
      safeIssue?.detail ||
      safeIssue?.description,
    "Review this issue and validate the affected page."
  );

  const issueFix = getIssueText(
    safeIssue?.fix ||
      safeIssue?.recommendation ||
      safeIssue?.action,
    ""
  );

  return (
    <div className="cq-card mb-3 border-l-2 border-l-[var(--cq-signal)] p-5">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-[var(--cq-text)]">
          {issueTitle}
        </p>

        <span className="shrink-0 border border-[var(--cq-signal)]/30 px-3 py-1 font-mono text-xs text-[var(--cq-signal)]">
          ISSUE
        </span>
      </div>

      <p className="text-sm leading-6 text-[#A0A0A0]">
        {issueImpact}
      </p>

      {issueFix ? (
        <div className="mt-3 rounded-xl border border-[#222] bg-[#111] p-3 text-sm text-[#CCCCCC]">
          <span className="font-semibold text-[#C5FF3D]">
            Recommendation:
          </span>{" "}
          {issueFix}
        </div>
      ) : null}
    </div>
  );
}
