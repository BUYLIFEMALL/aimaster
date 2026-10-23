import { MAX_UPLOAD_BYTES } from "./types";

const EXT_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const FORMAT_HELP = "JPG · PNG · WEBP, 15MB 이하";

export function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** 파일명·MIME으로 지원 이미지인지 판별한다. 아니면 null */
export function detectImage(name: string, mime: string): { mime: string; ext: string } | null {
  const ext = extOf(name);
  const m = (mime || "").toLowerCase().split(";")[0].trim();
  const resolved = Object.values(EXT_MIME).includes(m) ? m : EXT_MIME[ext];
  if (!resolved) return null;
  return { mime: resolved, ext: resolved === "image/jpeg" ? "jpg" : resolved.split("/")[1] };
}

export function sizeError(bytes: number): string | null {
  if (!Number.isFinite(bytes) || bytes <= 0) return "빈 파일은 사용할 수 없습니다.";
  if (bytes > MAX_UPLOAD_BYTES) {
    return `${Math.round(MAX_UPLOAD_BYTES / 1048576)}MB 이하 이미지만 사용할 수 있습니다(현재 ${(bytes / 1048576).toFixed(1)}MB). 해상도를 줄이거나 압축해서 다시 올려 주세요.`;
  }
  return null;
}

export function inPath(userId: string, uuid: string, ext: string): string {
  return `${userId}/in/${uuid}.${/^[a-z0-9]{1,5}$/.test(ext) ? ext : "png"}`;
}
export function outPath(userId: string, uuid: string, ext: string): string {
  return `${userId}/out/${uuid}.${/^[a-z0-9]{1,5}$/.test(ext) ? ext : "png"}`;
}

/** 본인 폴더의 in/out 이미지 경로인지(다른 회원 파일 접근 차단) */
export function isOwnPath(userId: string, path: unknown): path is string {
  if (typeof path !== "string" || path.length > 140) return false;
  return new RegExp(`^${userId}/(in|out)/${UUID}\\.(jpg|png|webp)$`, "i").test(path);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && new RegExp(`^${UUID}$`, "i").test(v);
}

export function fileBase(name: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  return (base || "banana").slice(0, 40);
}
