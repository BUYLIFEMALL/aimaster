import type { BlogViralCandidate } from "@/types/collector";

export interface SourceBundle {
  id: string;
  ownerId: string;
  kind: "http" | "rss" | "perplexity" | "shorts";
  collectedAt: string;
  expiresAt: string;
  label: string;
  urls: string[];
  text: string;
}
export const SOURCE_LIFETIME_MS = 30 * 86400000;
export function sourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function sourceBundle(id: string, ownerId: string, candidate: BlogViralCandidate, urls: string[], now = Date.now()): SourceBundle {
  const text = String(candidate.source_text || "").trim().slice(0, 4000);
  if (!text) throw new Error("원문을 확인하지 못해 글감을 저장하지 않았습니다.");
  return {id, ownerId, kind: candidate.method, collectedAt: new Date(now).toISOString(), expiresAt: new Date(now + SOURCE_LIFETIME_MS).toISOString(),
    label: candidate.source_input.slice(0, 2000), urls: [...new Set(urls.map(sourceUrl).filter((url): url is string => Boolean(url)))].slice(0, 10), text};
}
export function validSource(bundle: SourceBundle | undefined, ownerId: string, now = Date.now()): bundle is SourceBundle {
  if (!bundle || bundle.ownerId !== ownerId || !bundle.text?.trim()) return false;
  const start = Date.parse(bundle.collectedAt), end = Date.parse(bundle.expiresAt);
  return Number.isFinite(start) && start <= now && end > now && end - start === SOURCE_LIFETIME_MS;
}
