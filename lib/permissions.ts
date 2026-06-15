export function canUseModule(user: any, module: string) {
  const pkg = user?.package;

  if (!pkg) return false;
  if (user.role === "admin") return true;

  const permissions: Record<string, boolean> = {
    pdf: pkg.allowPdf,
    ai: pkg.allowAi,
    traffic: pkg.allowTraffic,
    keywords: pkg.allowKeywords,
    backlinks: pkg.allowBacklinks,
    localSeo: pkg.allowLocalSeo,
    whiteLabel: pkg.allowWhiteLabel,
  };

  return Boolean(permissions[module]);
}

export function hasAuditLimit(user: any) {
  if (user.role === "admin") return true;

  // Trialing users are capped at 3 audits total, regardless of plan size.
  if (user?.stripeStatus === "trialing") {
    const TRIAL_AUDIT_LIMIT = 3;
    return Number(user?.trialAuditsUsed || 0) < TRIAL_AUDIT_LIMIT;
  }

  const limit = user?.package?.monthlyAudits || 0;
  return Number(user?.auditsUsed || 0) < limit;
}