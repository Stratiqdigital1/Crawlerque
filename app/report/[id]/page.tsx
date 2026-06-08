"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [report, setReport] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await fetch(`/api/reports/${id}`, {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.success) {
  setError(
    json?.error ||
      "Failed to load report. It may have been deleted or you may not have access."
  );
  return;
}

setReport(json.report);
setReportData(json.report?.reportData || null);
      } catch {
  setError("Failed to load report. Please check your connection and try again.");
} finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
        Loading report...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
        <p className="text-red-400">{error}</p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-[#C5FF3D]"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#8A8A8A]">
              Crawler Que Report
            </p>

            <h1 className="text-3xl font-bold text-white">
  {report?.domain || report?.reportData?.domain || "Audit Report"}
</h1>

            <p className="mt-2 text-sm text-[#8A8A8A]">
              Created: {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
    Open in Dashboard
  </Link>
</div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric
  label="Overall Score"
  value={report?.overallScore ?? reportData?.overallScore}
/>

          <Metric
  label="SEO Score"
  value={report?.seoScore ?? reportData?.seoScore}
/>

          <Metric
  label="UX Score"
  value={report?.uxScore ?? reportData?.uxScore}
/>

          <Metric
  label="AI Visibility"
  value={
    report?.aiScore ??
    reportData?.aiScore ??
    reportData?.aiVisibility?.score ??
    reportData?.aiOptimization?.visibilityScore
  }
/>
        </div>

        <section className="mt-6 rounded-2xl border border-[#222] bg-[#111] p-6">
          <h2 className="text-xl font-semibold">
            Executive Summary
          </h2>

          <div className="mt-3 space-y-3 text-sm leading-7 text-[#BDBDBD]">
  {typeof reportData?.executiveSummary === "string" ? (
    <p>{reportData.executiveSummary}</p>
  ) : reportData?.executiveSummary ? (
    <>
      <p>
        <span className="font-semibold text-white">Biggest Issue: </span>
        {reportData.executiveSummary.biggestIssue ||
          "Not available"}
      </p>

      <p>
        <span className="font-semibold text-white">Biggest Opportunity: </span>
        {reportData.executiveSummary.biggestOpportunity ||
          "Not available"}
      </p>
    </>
  ) : (
    <p>
      {typeof reportData?.summary === "string"
        ? reportData.summary
        : "Executive summary is not available for this report."}
    </p>
  )}
</div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#222] bg-[#111] p-6">
          <h2 className="text-xl font-semibold">
            Priority Issues
          </h2>

          <div className="mt-4 space-y-3">
            {(reportData?.issues || reportData?.topIssues || [])
              .slice(0, 10)
              .map((issue: any, index: number) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#222] bg-[#181818] p-4"
                >
                  <p className="font-semibold">
                    {issue?.title ||
                      issue?.issue ||
                      `Issue ${index + 1}`}
                  </p>

                  <p className="mt-2 text-sm text-[#8A8A8A]">
                    {issue?.description ||
                      issue?.recommendation ||
                      "No description available."}
                  </p>
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl border border-[#222] bg-[#111] p-5">
      <p className="text-sm text-[#8A8A8A]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-[#C5FF3D]">
        {value ?? "N/A"}
      </p>
    </div>
  );
}