"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildSmartRecommendations,
  normalizeAuditData,
} from "@/lib/audit-normalizer";
import {
  formatCompactNumber,
} from "@/lib/report-format";
import {
  getPublicErrorMessage,
} from "@/lib/public-error";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [report, setReport] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [clientReportData, setClientReportData] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await fetch(`/api/reports/${id}`, {
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok || !json?.success) {
          throw new Error(
            json?.error ||
              "Failed to load report. It may have been deleted or you may not have access."
          );
        }

        setReport(json.report);
        setReportData(json.report?.reportData || null);
        setClientReportData(json.report?.clientReportData || null);
        setReview(json.report?.review || null);
      } catch (loadError) {
        setError(
          getPublicErrorMessage(
            loadError,
            "The report could not be loaded. Please check your connection and try again."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [id]);

  const displayReportData =
    clientReportData || reportData;

  const normalized = useMemo(
    () =>
      displayReportData
        ? normalizeAuditData(
            displayReportData
          )
        : null,
    [displayReportData]
  );

  const recommendations = useMemo(() => {
    if (!normalized) return [];

    const saved = Array.isArray(displayReportData?.recommendations)
      ? displayReportData.recommendations
      : [];

    if (clientReportData) {
      return saved;
    }

    return saved.length > 0
      ? saved
      : buildSmartRecommendations(normalized);
  }, [normalized, displayReportData, clientReportData]);

  if (loading) {
    return (
      <main aria-busy="true" className="min-h-screen bg-[#0A0A0A] p-8 text-white">
        Loading report...
      </main>
    );
  }

  if (error || !report || !displayReportData || !normalized) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
        <p className="text-red-400">
          {error || "Saved report data is unavailable."}
        </p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-[#C5FF3D]"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  const finalReady = report?.renderReady === true && displayReportData?.renderReady === true;
  const reportStatus = String(report?.status || displayReportData?.reportStatus || "processing");
  const technical = normalized.technicalCrawl;
  const ai = displayReportData?.aiSearchVisibility || null;
  const providerSignal =
    displayReportData?.providerSignals?.domainAnalytics ||
    displayReportData?.domainAnalytics ||
    null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] p-5 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-[#222] pb-7 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#C5FF3D]">
              Crawler Que Reconciled Report v{displayReportData?.reportVersion || "2.0"}
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              {report?.domain || normalized.domain || "Audit Report"}
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#8A8A8A]">
              <span>
                Created: {new Date(report.createdAt).toLocaleString()}
              </span>
              <span>
                Status: <StatusText status={reportStatus} />
              </span>
              <span>
                Technical confidence: {technical?.confidence || "unknown"}
              </span>
              <span>
                Client review: <StatusText status={review?.status || "draft"} />
              </span>
              {review?.approvedBy && (
                <span>
                  Approved by: {review.approvedBy.name || review.approvedBy.email || "Reviewer"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#2A2A2A] px-4 py-2 text-sm font-semibold text-[#EDEDED] hover:border-[#C5FF3D]/50"
            >
              Back to Dashboard
            </Link>

            <Link
              href={`/dashboard?reportId=${report?.id}`}
              className="rounded-xl bg-[#C5FF3D] px-4 py-2 text-sm font-bold text-black hover:bg-[#D9FF7A]"
            >
              Open Full Dashboard
            </Link>
          </div>
        </header>

        {review?.status === "approved" ? (
          <Notice tone="green" title="Client-facing report approved">
            This page is showing the approved client snapshot. Suppressed findings are hidden, while the original automated evidence remains preserved in the account dashboard.
            {review?.approvedAt
              ? ` Approved ${new Date(review.approvedAt).toLocaleString()}.`
              : ""}
          </Notice>
        ) : clientReportData ? (
          <Notice tone="amber" title="Draft changes are pending approval">
            This page continues to show the last approved client snapshot. New agency edits will not appear here until the current draft is approved.
          </Notice>
        ) : (
          <Notice tone="amber" title="Automated report — client approval pending">
            This page is showing the reconciled automated audit. Agency edits and suppression rules will appear here after the first client-facing snapshot is approved.
          </Notice>
        )}

        {!finalReady && (
          <Notice tone="amber" title="Report is still being finalized">
            Scores and evidence can change until every selected module reaches a final state.
            PDF export remains locked in the dashboard.
          </Notice>
        )}

        {technical?.limitation && (
          <Notice tone="amber" title="Technical coverage limitation">
            {technical.limitation}
          </Notice>
        )}

        {clientReportData && displayReportData?.clientReview?.clientNote && (
          <section className="mb-6">
            <Panel title="Client Note">
              <p className="text-sm leading-7 text-[#D4D4D4]">
                {displayReportData.clientReview.clientNote}
              </p>
            </Panel>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Overall" value={normalized.scores.overall} suffix="/100" />
          <Metric label="SEO" value={normalized.scores.seo} suffix="/100" />
          <Metric label="UX" value={normalized.scores.ux} suffix="/100" />
          <Metric label="AI Visibility" value={normalized.scores.ai} suffix="/100" />
          <Metric
            label="Est. Organic Visits"
            value={formatNumber(normalized.traffic.monthly)}
          />
          <Metric
            label="Pages Crawled"
            value={formatNumber(technical?.pagesCrawled)}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Executive Summary">
            <SummaryRow
              label="Biggest Issue"
              value={normalized.summary.biggestIssue}
            />
            <SummaryRow
              label="Biggest Opportunity"
              value={normalized.summary.biggestOpportunity}
            />

            <div className="mt-5 rounded-xl border border-[#252525] bg-[#171717] p-4 text-sm leading-6 text-[#AFAFAF]">
              Executive metrics use the reconciled homepage, the finalized OnPage crawl,
              canonical Traffic Intelligence, and the saved audit scope. Domain
              Analytics traffic remains a separate provider signal.
            </div>
          </Panel>

          <Panel title="Audit Scope & Sources">
            <KeyValue label="Submitted URL" value={displayReportData?.submittedUrl} />
            <KeyValue label="Resolved URL" value={displayReportData?.resolvedUrl} />
            <KeyValue label="Canonical URL" value={displayReportData?.canonicalUrl} />
            <KeyValue
              label="Redirect count"
              value={String(displayReportData?.redirectCount ?? 0)}
            />
            <KeyValue
              label="Market"
              value={
                displayReportData?.auditConfig?.countryName ||
                displayReportData?.searchContext?.country ||
                displayReportData?.traffic?.country
              }
            />
            <KeyValue
              label="Language"
              value={
                displayReportData?.auditConfig?.languageName ||
                displayReportData?.searchContext?.language ||
                "English"
              }
            />
            <KeyValue
              label="Primary device"
              value={
                displayReportData?.auditConfig?.device ||
                displayReportData?.searchContext?.device
              }
            />
            <KeyValue
              label="Search engine"
              value={
                displayReportData?.auditConfig?.searchEngine ||
                displayReportData?.searchContext?.searchEngine ||
                "google"
              }
            />
            <KeyValue
              label="Technical crawl limit"
              value={
                displayReportData?.auditConfig?.maxCrawlPages
                  ? `${displayReportData.auditConfig.maxCrawlPages} pages`
                  : displayReportData?.onPage?.pageLimit
                    ? `${displayReportData.onPage.pageLimit} pages`
                    : null
              }
            />
            <KeyValue
              label="Traffic source"
              value="Traffic Intelligence only"
            />
            <KeyValue
              label="AI source"
              value="ChatGPT, Claude & Gemini — unbranded prompts"
            />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Resolved Homepage SEO">
            <KeyValue label="Source" value={displayReportData?.canonicalSeo?.source} />
            <KeyValue label="Title" value={normalized.seo.title} multiline />
            <KeyValue
              label="Meta description"
              value={normalized.seo.metaDescription}
              multiline
            />
            <KeyValue label="H1" value={normalized.seo.h1} multiline />
            <KeyValue
              label="Images missing ALT"
              value={formatNumber(normalized.seo.missingAlt)}
            />
          </Panel>

          <Panel title="Technical Crawl">
            <KeyValue label="Status" value={technical?.status} />
            <KeyValue label="Confidence" value={technical?.confidence} />
            <KeyValue
              label="Pages crawled"
              value={formatNumber(technical?.pagesCrawled)}
            />
            <KeyValue
              label="Issues found"
              value={formatNumber(technical?.issuesFound)}
            />
            <KeyValue
              label="Discovered pages"
              value={formatNumber(displayReportData?.onPage?.discoveredPages)}
            />
            <KeyValue
              label="Remaining pages"
              value={formatNumber(displayReportData?.onPage?.remainingPages)}
            />
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Canonical Traffic Intelligence">
            <KeyValue
              label="Estimated monthly organic visits"
              value={formatNumber(normalized.traffic.monthly)}
            />
            <KeyValue
              label="Ranked keyword footprint"
              value={formatNumber(normalized.traffic.keywordCount)}
            />
            <KeyValue label="Confidence" value={normalized.traffic.confidence} />
            <KeyValue
              label="Method"
              value={displayReportData?.traffic?.method || "clickstream / CTR fallback"}
            />
            <p className="mt-4 text-xs leading-5 text-[#777]">
              This is directional modeled traffic, not first-party analytics.
            </p>
          </Panel>

          <Panel title="Domain Analytics — Provider Signal">
            <KeyValue
              label="Organic traffic signal"
              value={formatNumber(providerSignal?.organicTrafficSignal ?? providerSignal?.organicTraffic)}
            />
            <KeyValue
              label="Similarweb visits signal"
              value={formatNumber(providerSignal?.similarwebVisitsSignal ?? providerSignal?.similarwebVisits)}
            />
            <KeyValue
              label="Organic keywords signal"
              value={formatNumber(providerSignal?.organicKeywords)}
            />
            <KeyValue
              label="Role"
              value={providerSignal?.metricRole || "provider-signal-only"}
            />
            <p className="mt-4 text-xs leading-5 text-[#777]">
              These figures are shown for context and are excluded from the executive traffic score.
            </p>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="AI Search Visibility — Methodology v2">
            {!ai ? (
              <p className="text-sm text-[#8A8A8A]">
                AI visibility data was not available for this report.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <MiniMetric label="Score" value={`${ai.overallScore ?? 0}/100`} />
                  <MiniMetric label="Visibility Rate" value={`${ai.visibilityRate ?? 0}%`} />
                  <MiniMetric
                    label="Average Position"
                    value={ai.avgPosition == null ? "N/A" : `${ai.avgPosition}/5`}
                  />
                  <MiniMetric label="Share of Voice" value={`${ai.shareOfVoice ?? 0}%`} />
                  <MiniMetric label="Confidence" value={ai.confidence || "low"} />
                </div>

                <div className="mt-5 rounded-xl border border-[#252525] bg-[#171717] p-4 text-sm leading-6 text-[#AFAFAF]">
                  {ai?.methodology?.scoredPromptRule ||
                    "Only unbranded category prompts are included in the standard score."}
                  {" "}
                  Brand-named knowledge checks and branded custom prompts are evidence only.
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-[#777]">
                      <tr className="border-b border-[#252525]">
                        <th className="px-3 py-3">Prompt</th>
                        <th className="px-3 py-3">ChatGPT</th>
                        <th className="px-3 py-3">Claude</th>
                        <th className="px-3 py-3">Gemini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ai.promptResults || []).slice(0, 5).map((row: any, index: number) => (
                        <tr key={`${row.prompt}-${index}`} className="border-b border-[#202020]">
                          <td className="px-3 py-4 text-[#D5D5D5]">{row.prompt}</td>
                          <td className="px-3 py-4"><AiResult result={row?.models?.ChatGPT} /></td>
                          <td className="px-3 py-4"><AiResult result={row?.models?.Claude} /></td>
                          <td className="px-3 py-4"><AiResult result={row?.models?.Gemini} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Priority Issues">
            {normalized.issues.length === 0 ? (
              <EmptyText text="No reconciled priority issues were returned." />
            ) : (
              <div className="space-y-3">
                {normalized.issues.slice(0, 10).map((issue: any, index: number) => (
                  <FindingCard
                    key={`${issue?.title || issue?.issue}-${index}`}
                    title={issue?.title || issue?.issue || `Issue ${index + 1}`}
                    badge={issue?.severity || issue?.impact || "Medium"}
                    detail={
                      issue?.description ||
                      issue?.detail ||
                      issue?.impact ||
                      issue?.fix ||
                      issue?.recommendation ||
                      "Review this reconciled issue."
                    }
                    footer={
                      [
                        issue?.owner && `Owner: ${issue.owner}`,
                        issue?.effort && `Effort: ${issue.effort}`,
                        issue?.timeline && `Timeline: ${issue.timeline}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Prioritized Recommendations">
            {recommendations.length === 0 ? (
              <EmptyText text="No evidence-backed recommendations were returned." />
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 10).map((recommendation: any, index: number) => {
                  const isString = typeof recommendation === "string";
                  return (
                    <FindingCard
                      key={`${isString ? recommendation : recommendation?.title}-${index}`}
                      title={
                        isString
                          ? `Recommendation ${index + 1}`
                          : recommendation?.title || `Recommendation ${index + 1}`
                      }
                      badge={isString ? "Review" : recommendation?.impact || "Medium"}
                      detail={
                        isString
                          ? recommendation
                          : recommendation?.detail ||
                            recommendation?.description ||
                            recommendation?.recommendation ||
                            "Review this recommendation."
                      }
                      footer={
                        isString
                          ? undefined
                          : [
                              recommendation?.owner && `Owner: ${recommendation.owner}`,
                              recommendation?.effort && `Effort: ${recommendation.effort}`,
                              recommendation?.timeline && `Timeline: ${recommendation.timeline}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                      }
                    />
                  );
                })}
              </div>
            )}
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="Module Execution Status">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {normalized.moduleStatus.map((item: any) => (
                <div
                  key={item.module}
                  className="rounded-xl border border-[#252525] bg-[#171717] p-4"
                >
                  <p className="font-semibold text-white">{item.module}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#C5FF3D]">
                    {item.status}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#888]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#222] bg-[#111] p-5 md:p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: any;
  suffix?: string;
}) {
  const display = value === null || value === undefined || value === ""
    ? "N/A"
    : `${value}${suffix}`;

  return (
    <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
      <p className="text-sm text-[#8A8A8A]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#C5FF3D]">{display}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-[#252525] bg-[#171717] p-4">
      <p className="text-xs uppercase tracking-wide text-[#777]">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#C5FF3D]">
        {value ?? "N/A"}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="border-b border-[#222] py-4 first:pt-0 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#777]">
        {label}
      </p>
      <p className="mt-2 text-base leading-7 text-[#D4D4D4]">
        {value || "Not available"}
      </p>
    </div>
  );
}

function KeyValue({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: any;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-2 border-b border-[#222] py-3 last:border-b-0 md:grid-cols-[170px_1fr]">
      <p className="text-sm text-[#777]">{label}</p>
      <p
        className={`text-sm text-[#D1D1D1] ${
          multiline ? "leading-6" : "break-all"
        }`}
      >
        {value === null || value === undefined || value === ""
          ? "Not available"
          : String(value)}
      </p>
    </div>
  );
}

function FindingCard({
  title,
  badge,
  detail,
  footer,
}: {
  title: string;
  badge: string;
  detail: string;
  footer?: string;
}) {
  return (
    <div className="rounded-xl border border-[#252525] bg-[#171717] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-6 text-white">{title}</p>
        <span className="shrink-0 rounded-full border border-[#C5FF3D]/30 bg-[#C5FF3D]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#C5FF3D]">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#999]">{detail}</p>
      {footer && (
        <p className="mt-3 text-xs text-[#666]">{footer}</p>
      )}
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "amber" | "green";
  title: string;
  children: React.ReactNode;
}) {
  const classes =
    tone === "green"
      ? {
          wrap: "border-emerald-400/30 bg-emerald-400/10",
          title: "text-emerald-300",
          body: "text-emerald-100/80",
        }
      : {
          wrap: "border-amber-400/30 bg-amber-400/10",
          title: "text-amber-300",
          body: "text-amber-100/80",
        };

  return (
    <div role="status" aria-live="polite" className={`mb-6 rounded-2xl border p-5 ${classes.wrap}`}>
      <p className={`font-semibold ${classes.title}`}>{title}</p>
      <p className={`mt-2 text-sm leading-6 ${classes.body}`}>{children}</p>
    </div>
  );
}

function AiResult({ result }: { result: any }) {
  if (!result || result?.available === false) {
    return <span className="text-[#666]">Unavailable</span>;
  }

  if (!result?.mentioned) {
    return <span className="text-[#999]">Not mentioned</span>;
  }

  return (
    <span className="font-semibold text-[#C5FF3D]">
      Mentioned{result?.position ? ` #${result.position}` : ""}
    </span>
  );
}

function StatusText({ status }: { status: string }) {
  const normalized = status.replace(/_/g, " ");
  return <span className="capitalize text-[#C5FF3D]">{normalized}</span>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-[#777]">{text}</p>;
}

function formatNumber(value: any) {
  return formatCompactNumber(value, "N/A");
}
