// 서버 코드에서만 불러온다(관리자 클라이언트를 받는다).
// 생성 이미지 저장소(비공개, 2026-10-21 v1.23). 화면에는 서명 주소만 내보낸다.
// 기록(usage_logs.metadata)에는 파일 경로 image_path를 남기고, v1.22 이전 기록은 공개 주소(image_url)에서 경로를 꺼낸다.
export const BUCKET = "ai-image-generations";
export const SIGN_SECONDS = 24 * 60 * 60;

type Meta = { image_path?: unknown; image_url?: unknown } | null | undefined;

/** 기록의 저장소 파일 경로(외부 주소로만 남은 기록은 null) */
export function storagePathOf(meta: Meta): string | null {
  if (typeof meta?.image_path === "string" && meta.image_path) return meta.image_path;
  const url = meta?.image_url;
  if (typeof url !== "string" || !url.includes(`/${BUCKET}/`)) return null;
  return decodeURIComponent(url.split(`/${BUCKET}/`).pop()!.split("?")[0]) || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function signPaths(admin: any, paths: string[], seconds = SIGN_SECONDS): Promise<Record<string, string>> {
  const list = Array.from(new Set(paths.filter(Boolean)));
  const out: Record<string, string> = {};
  for (let i = 0; i < list.length; i += 100) {
    const { data } = await admin.storage.from(BUCKET).createSignedUrls(list.slice(i, i + 100), seconds);
    for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  }
  return out;
}

/** 기록 하나를 화면에 보여 줄 주소(저장소 파일이면 서명 주소, 아니면 남아 있는 외부 주소) */
export function displayUrlOf(meta: Meta, signed: Record<string, string>): string {
  const path = storagePathOf(meta);
  if (path) return signed[path] ?? "";
  return typeof meta?.image_url === "string" ? meta.image_url : "";
}
