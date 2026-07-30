export const REPORT_REVIEW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "changes_required",
] as const;

export type ReportReviewStatus =
  (typeof REPORT_REVIEW_STATUSES)[number];

export type ReviewItemKind =
  | "issue"
  | "recommendation";

export type ReviewItemContent = {
  title: string;
  detail: string;
  impact: string;
  effort: string;
  owner: string;
  timeline: string;
  sourceModule: string;
  validationStatus: string;
  affectedUrls: string[];
  evidence: string[];
};

export type ReportReviewItem = {
  id: string;
  kind: ReviewItemKind;
  order: number;
  visible: boolean;
  original: ReviewItemContent;
  client: ReviewItemContent;
};

export type ReportReviewSnapshot = {
  schemaVersion: "1.0";
  clientNote: string;
  internalNote: string;
  issues: ReportReviewItem[];
  recommendations: ReportReviewItem[];
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function cleanText(
  value: unknown,
  fallback = "",
  maxLength = 4000
) {
  const text = String(
    value ?? fallback
  )
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€¦/g, "…")
    .replace(/â†’/g, "→")
    .replace(/Â·/g, "·")
    .trim();

  return text.slice(0, maxLength);
}

function cleanList(
  value: unknown,
  maxItems = 20,
  maxLength = 800
) {
  return asArray(value)
    .map((item) =>
      cleanText(item, "", maxLength)
    )
    .filter(Boolean)
    .slice(0, maxItems);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function normalizeSourceItem(
  rawValue: unknown,
  kind: ReviewItemKind,
  index: number
): ReviewItemContent {
  const raw = isRecord(rawValue)
    ? rawValue
    : {
        detail: rawValue,
      };

  const fallbackTitle =
    kind === "issue"
      ? `Issue ${index + 1}`
      : `Recommendation ${index + 1}`;

  const title = cleanText(
    raw.title ||
      raw.issue ||
      raw.keyword ||
      fallbackTitle,
    fallbackTitle,
    240
  );

  const detail = cleanText(
    raw.detail ||
      raw.description ||
      raw.recommendation ||
      raw.fix ||
      raw.impact ||
      "Review this item against the attached evidence.",
    "Review this item against the attached evidence.",
    5000
  );

  return {
    title,
    detail,
    impact: cleanText(
      raw.impact ||
        raw.severity ||
        "Medium",
      "Medium",
      60
    ),
    effort: cleanText(
      raw.effort ||
        raw.difficulty ||
        "Medium",
      "Medium",
      60
    ),
    owner: cleanText(
      raw.owner ||
        (kind === "issue"
          ? "SEO / Development"
          : "Growth Team"),
      "Growth Team",
      120
    ),
    timeline: cleanText(
      raw.timeline ||
        "31–60 days",
      "31–60 days",
      120
    ),
    sourceModule: cleanText(
      raw.sourceModule ||
        raw.source ||
        (kind === "issue"
          ? "Audit Findings"
          : "Recommendations"),
      kind === "issue"
        ? "Audit Findings"
        : "Recommendations",
      120
    ),
    validationStatus: cleanText(
      raw.validationStatus ||
        raw.confidence ||
        "directional",
      "directional",
      80
    ),
    affectedUrls: cleanList(
      raw.affectedUrls ||
        (raw.affectedUrl
          ? [raw.affectedUrl]
          : raw.url
            ? [raw.url]
            : []),
      20,
      1000
    ),
    evidence: cleanList(
      raw.evidence,
      20,
      1500
    ),
  };
}

function buildItems(
  values: unknown,
  kind: ReviewItemKind
): ReportReviewItem[] {
  return asArray(values)
    .slice(0, 100)
    .map((raw, index) => {
      const original =
        normalizeSourceItem(
          raw,
          kind,
          index
        );

      const rawRecord = isRecord(raw)
        ? raw
        : {};

      const suppliedId = cleanText(
        rawRecord.id,
        "",
        120
      );

      const id =
        suppliedId ||
        `${kind}-${slugify(original.title) || index + 1}-${index + 1}`;

      return {
        id,
        kind,
        order: index,
        visible: true,
        original,
        client: {
          ...original,
          affectedUrls: [
            ...original.affectedUrls,
          ],
          evidence: [
            ...original.evidence,
          ],
        },
      };
    });
}

export function buildInitialReportReviewSnapshot(
  reportData: unknown
): ReportReviewSnapshot {
  const report = isRecord(reportData)
    ? reportData
    : {};

  return {
    schemaVersion: "1.0",
    clientNote: "",
    internalNote: "",
    issues: buildItems(
      report.issues ||
        report.topIssues,
      "issue"
    ),
    recommendations: buildItems(
      report.recommendations ||
        (isRecord(
          report.aiRecommendations
        )
          ? report.aiRecommendations
              .recommendations
          : []),
      "recommendation"
    ),
  };
}

function sanitizeClientContent(
  incoming: unknown,
  fallback: ReviewItemContent
): ReviewItemContent {
  const value = isRecord(incoming)
    ? incoming
    : {};

  return {
    title: cleanText(
      value.title,
      fallback.title,
      240
    ),
    detail: cleanText(
      value.detail,
      fallback.detail,
      5000
    ),
    impact: cleanText(
      value.impact,
      fallback.impact,
      60
    ),
    effort: cleanText(
      value.effort,
      fallback.effort,
      60
    ),
    owner: cleanText(
      value.owner,
      fallback.owner,
      120
    ),
    timeline: cleanText(
      value.timeline,
      fallback.timeline,
      120
    ),
    sourceModule:
      fallback.sourceModule,
    validationStatus:
      fallback.validationStatus,
    affectedUrls: [
      ...fallback.affectedUrls,
    ],
    evidence: [
      ...fallback.evidence,
    ],
  };
}

function sanitizeItems(
  incomingValues: unknown,
  fallbackItems: ReportReviewItem[]
): ReportReviewItem[] {
  const incomingById = new Map<
    string,
    Record<string, unknown>
  >();

  asArray(incomingValues)
    .filter(isRecord)
    .forEach((item) => {
      const id = cleanText(
        item.id,
        "",
        120
      );

      if (id) {
        incomingById.set(
          id,
          item
        );
      }
    });

  return fallbackItems
    .map((fallback, index) => {
      const incoming =
        incomingById.get(
          fallback.id
        );

      return {
        id: fallback.id,
        kind: fallback.kind,
        order: Number.isFinite(
          Number(incoming?.order)
        )
          ? Math.max(
              0,
              Math.min(
                999,
                Number(incoming?.order)
              )
            )
          : index,
        visible:
          incoming?.visible !== false,
        original: {
          ...fallback.original,
          affectedUrls: [
            ...fallback.original
              .affectedUrls,
          ],
          evidence: [
            ...fallback.original
              .evidence,
          ],
        },
        client: sanitizeClientContent(
          incoming?.client,
          fallback.original
        ),
      };
    })
    .sort((a, b) =>
      a.order - b.order
    )
    .map((item, index) => ({
      ...item,
      order: index,
    }));
}

export function sanitizeReportReviewSnapshot(
  incoming: unknown,
  sourceReportData: unknown
): ReportReviewSnapshot {
  const fallback =
    buildInitialReportReviewSnapshot(
      sourceReportData
    );

  const value = isRecord(incoming)
    ? incoming
    : {};

  return {
    schemaVersion: "1.0",
    clientNote: cleanText(
      value.clientNote,
      "",
      5000
    ),
    internalNote: cleanText(
      value.internalNote,
      "",
      5000
    ),
    issues: sanitizeItems(
      value.issues,
      fallback.issues
    ),
    recommendations: sanitizeItems(
      value.recommendations,
      fallback.recommendations
    ),
  };
}

function clientFacingItem(
  item: ReportReviewItem
) {
  return {
    id: item.id,
    ...item.client,
    reviewOrder: item.order,
    reviewEdited: true,
    originalTitle:
      item.original.title,
  };
}

function buildRoadmap(
  recommendations: ReturnType<
    typeof clientFacingItem
  >[]
) {
  const first30Days: unknown[] = [];
  const next30Days: unknown[] = [];
  const final30Days: unknown[] = [];

  recommendations.forEach(
    (item) => {
      const timeline =
        item.timeline.toLowerCase();

      if (
        /0\s*[–-]\s*30|first|immediate|14 day/.test(
          timeline
        )
      ) {
        first30Days.push(item);
        return;
      }

      if (
        /61\s*[–-]\s*90|final|90 day/.test(
          timeline
        )
      ) {
        final30Days.push(item);
        return;
      }

      next30Days.push(item);
    }
  );

  return {
    first30Days,
    next30Days,
    final30Days,
  };
}

export function applyApprovedReviewSnapshot(
  reportData: unknown,
  snapshotValue: unknown,
  meta?: {
    status?: string;
    version?: number | null;
    approvedVersion?: number | null;
    approvedAt?: Date | string | null;
    approvedBy?: {
      id?: string;
      name?: string | null;
      email?: string | null;
    } | null;
  }
) {
  const source = isRecord(reportData)
    ? JSON.parse(
        JSON.stringify(reportData)
      )
    : {};

  const snapshot =
    sanitizeReportReviewSnapshot(
      snapshotValue,
      source
    );

  const issues = snapshot.issues
    .filter((item) => item.visible)
    .sort((a, b) =>
      a.order - b.order
    )
    .map(clientFacingItem);

  const recommendations =
    snapshot.recommendations
      .filter((item) => item.visible)
      .sort((a, b) =>
        a.order - b.order
      )
      .map(clientFacingItem);

  const actionRoadmap =
    buildRoadmap(
      recommendations
    );

  const sourceAiRecommendations =
    isRecord(
      source.aiRecommendations
    )
      ? source.aiRecommendations
      : {};

  return {
    ...source,
    issues,
    topIssues: issues,
    recommendations,
    actionPlan: recommendations,
    aiRecommendations: {
      ...sourceAiRecommendations,
      recommendations,
      roadmap: actionRoadmap,
      clientReviewed: true,
    },
    actionRoadmap,
    clientReview: {
      status:
        meta?.status ||
        "approved",
      version:
        meta?.version || null,
      approvedVersion:
        meta?.approvedVersion ||
        null,
      approvedAt:
        meta?.approvedAt || null,
      approvedBy:
        meta?.approvedBy || null,
      clientNote:
        snapshot.clientNote,
      hiddenIssueCount:
        snapshot.issues.filter(
          (item) => !item.visible
        ).length,
      hiddenRecommendationCount:
        snapshot.recommendations.filter(
          (item) => !item.visible
        ).length,
    },
  };
}

export function reviewStatusLabel(
  status: unknown
) {
  switch (
    String(status || "draft")
      .toLowerCase()
  ) {
    case "in_review":
      return "In Review";
    case "approved":
      return "Approved";
    case "changes_required":
      return "Changes Required";
    default:
      return "Draft";
  }
}
