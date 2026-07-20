"use client";

type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | undefined;

type AnalyticsPayload = Record<
  string,
  AnalyticsValue
>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function pushToDataLayer(
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function identifyAnalyticsUser(input: {
  userId: string;
  accountType: "trial" | "paid";
  planName: string;
}) {
  pushToDataLayer({
    event: "cq_user_identified",
    user_id: input.userId,
    cq_account_type: input.accountType,
    cq_plan_name: input.planName,
  });
}

export function clearAnalyticsIdentity() {
  pushToDataLayer({
    event: "cq_user_identity_cleared",
    user_id: null,
    cq_account_type: null,
    cq_plan_name: null,
  });
}

export function trackAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsPayload = {}
) {
  const normalizedEventName = String(
    eventName || ""
  ).trim();

  if (!normalizedEventName) {
    return;
  }

  pushToDataLayer({
    event: normalizedEventName,
    ...parameters,
  });
}
