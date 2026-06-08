export function getCTR(position: number): number {
  if (position === 1) return 0.284;
  if (position === 2) return 0.152;
  if (position === 3) return 0.11;
  if (position === 4) return 0.082;
  if (position === 5) return 0.066;
  if (position === 6) return 0.052;
  if (position === 7) return 0.041;
  if (position === 8) return 0.034;
  if (position === 9) return 0.027;
  if (position === 10) return 0.022;
  if (position >= 11 && position <= 15) return 0.008;
  if (position >= 16 && position <= 20) return 0.004;
  return 0;
}

export function getCTRCommercial(position: number): number {
  if (position === 1) return 0.198;
  if (position === 2) return 0.112;
  if (position === 3) return 0.085;
  if (position === 4) return 0.067;
  if (position === 5) return 0.053;
  if (position === 6) return 0.042;
  if (position === 7) return 0.033;
  if (position === 8) return 0.025;
  if (position === 9) return 0.02;
  if (position === 10) return 0.015;
  if (position >= 11 && position <= 20) return 0.004;
  return 0;
}