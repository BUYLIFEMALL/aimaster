// 관리자 「개발 문서 관리」 — 공개 저장소(BUYLIFEMALL/aimaster) master의 문서를 서버에서 읽는다.
// 메인 사이트는 docs/만 바뀐 푸시로는 다시 빌드하지 않으므로(scripts/vercel-ignore-build.sh) 빌드에 묶지 않고 최신본을 읽는다.
// 주소는 raw.githubusercontent.com 한 곳으로 고정하고, 경로는 저장소 안 .md만 허용한다(다른 주소 요청 악용 방지).
import "server-only";

const RAW_BASE = "https://raw.githubusercontent.com/BUYLIFEMALL/aimaster/master/";
export const GITHUB_BLOB_BASE = "https://github.com/BUYLIFEMALL/aimaster/blob/master/";

/** 저장소 안 .md 상대 경로만 허용 (`..`·절대 경로·주소 금지) */
export function isAllowedDocPath(path: string): boolean {
  if (!path || path.length > 300) return false;
  if (path.startsWith("/") || path.includes("..") || path.includes("\\") || /^[a-z]+:/i.test(path)) return false;
  return /\.md$/i.test(path) || path === "docs/dev-docs/manifest.json";
}

/** 문서 원문(없거나 실패하면 null). revalidate 초 동안 캐시 — 푸시 후 최대 그만큼 늦게 반영된다. */
export async function fetchRepoText(path: string, revalidate = 300): Promise<string | null> {
  if (!isAllowedDocPath(path)) return null;
  const url = RAW_BASE + path.split("/").map(encodeURIComponent).join("/");
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export type ManifestEntry = { path: string; size: number; editable: boolean; title?: string };
export type DevDocsManifest = {
  generatedAt: string;
  editLimit: number;
  root: ManifestEntry[];
  guidelines: ManifestEntry[];
  roles: ManifestEntry[];
  docs: ManifestEntry[];
  analyses: ManifestEntry[];
  programs: { folder: string; files: ManifestEntry[] }[];
};

export async function fetchManifest(): Promise<DevDocsManifest | null> {
  const text = await fetchRepoText("docs/dev-docs/manifest.json", 600);
  if (!text) return null;
  try {
    return JSON.parse(text) as DevDocsManifest;
  } catch {
    return null;
  }
}
