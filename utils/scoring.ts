export function calculateOverallScore(data: {
  seo: number;
  backlinks: number;
  performance: number;
  ux: number;
  ai: number;
}) {
  return Math.round(
    data.seo * 0.25 +
    data.backlinks * 0.15 +
    data.performance * 0.20 +
    data.ux * 0.15 +
    data.ai * 0.25
  );
}