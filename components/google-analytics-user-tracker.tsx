"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  clearAnalyticsIdentity,
  identifyAnalyticsUser,
  trackAnalyticsEvent,
} from "@/lib/client-analytics";

type AnalyticsIdentity = {
  enabled?: boolean;
  userId?: string;
  accountType?: "trial" | "paid";
  planName?: string;
};

export default function GoogleAnalyticsUserTracker() {
  const pathname = usePathname();
  const lastIdentityRef = useRef<string>("");
  const lastDashboardPathRef = useRef<string>("");

  useEffect(() => {
    const controller = new AbortController();

    async function syncIdentity() {
      try {
        const response = await fetch("/api/user/me", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (lastIdentityRef.current !== "cleared") {
            clearAnalyticsIdentity();
            lastIdentityRef.current = "cleared";
          }

          return;
        }

        const json = await response.json();
        const analytics: AnalyticsIdentity | undefined =
          json?.user?.analytics;

        if (
          !analytics?.enabled ||
          !analytics.userId ||
          !analytics.accountType ||
          !analytics.planName
        ) {
          if (lastIdentityRef.current !== "cleared") {
            clearAnalyticsIdentity();
            lastIdentityRef.current = "cleared";
          }

          return;
        }

        const signature = [
          analytics.userId,
          analytics.accountType,
          analytics.planName,
        ].join("|");

        if (lastIdentityRef.current !== signature) {
          identifyAnalyticsUser({
            userId: analytics.userId,
            accountType: analytics.accountType,
            planName: analytics.planName,
          });

          lastIdentityRef.current = signature;
        }

        if (
          pathname?.startsWith("/dashboard") &&
          lastDashboardPathRef.current !== pathname
        ) {
          trackAnalyticsEvent("dashboard_opened", {
            account_type: analytics.accountType,
            plan_name: analytics.planName,
            page_path: pathname,
          });

          lastDashboardPathRef.current = pathname;
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Google Analytics identity sync failed:",
          error
        );
      }
    }

    syncIdentity();

    return () => {
      controller.abort();
    };
  }, [pathname]);

  return null;
}
