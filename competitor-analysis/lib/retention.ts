/** Generated content expires 30 days after creation; reads never extend its lifetime. */
export const RETENTION_DAYS = 30;
export function retentionCutoff(now = Date.now()): string {
  return new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Queries return newest first. Keep one version per domain without sharing across owners. */
export function latestProfiles<T extends { domain: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    if (seen.has(row.domain)) return false;
    seen.add(row.domain);
    return true;
  });
}
