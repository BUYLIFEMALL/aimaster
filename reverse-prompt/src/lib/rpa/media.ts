import type { MediaType } from "./types";

const MB = 1024 * 1024;
export const SIZE_LIMIT: Record<MediaType, number> = { image: 20 * MB, audio: 50 * MB, video: 50 * MB };
export const BUCKET = "reverse-prompt-tmp";
/** 임시 파일은 이 시간이 지나면 다음 업로드/분석 때 정리한다 */
export const TEMP_TTL_MS = 60 * 60 * 1000;

// 확장자 → MIME (브라우저가 type을 비워 주는 경우를 위한 보정). Gemini가 받는 형식만 둔다.
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif",
  mp4: "video/mp4", mpeg: "video/mpeg", mpg: "video/mpg", mov: "video/quicktime", avi: "video/avi", webm: "video/webm",
  wmv: "video/wmv", flv: "video/x-flv", "3gp": "video/3gpp",
  mp3: "audio/mp3", wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", aiff: "audio/aiff", aif: "audio/aiff",
};
const ALLOWED_MIME = new Set(Object.values(EXT_MIME));
const MIME_ALIAS: Record<string, string> = {
  "audio/mpeg": "audio/mp3", "audio/x-wav": "audio/wav", "audio/wave": "audio/wav", "audio/x-aiff": "audio/aiff",
  "video/x-msvideo": "video/avi", "video/x-ms-wmv": "video/wmv", "audio/x-flac": "audio/flac", "audio/x-aac": "audio/aac",
};

export const ACCEPT_ATTR = Object.keys(EXT_MIME).map((e) => `.${e}`).join(",");
export const FORMAT_HELP = "이미지(JPG·PNG·WEBP·HEIC), 동영상(MP4·MOV·WEBM·AVI 등), 오디오(MP3·WAV·AAC·OGG·FLAC)";

export function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

export interface Detected { media: MediaType; mime: string; ext: string }

/** 파일명과 MIME으로 종류를 판별한다. 지원하지 않는 형식이면 null */
export function detectMedia(name: string, mime: string): Detected | null {
  const ext = extOf(name);
  let m = (mime || "").toLowerCase().split(";")[0].trim();
  m = MIME_ALIAS[m] ?? m;
  if (!ALLOWED_MIME.has(m)) m = EXT_MIME[ext] ?? "";
  if (!m || !ALLOWED_MIME.has(m)) return null;
  const media = m.split("/")[0] as MediaType;
  if (media !== "image" && media !== "video" && media !== "audio") return null;
  return { media, mime: m, ext: ext || m.split("/")[1].replace("quicktime", "mov").replace("mpeg", "mp3") };
}

export function sizeError(media: MediaType, bytes: number): string | null {
  if (!Number.isFinite(bytes) || bytes <= 0) return "빈 파일은 분석할 수 없습니다.";
  const limit = SIZE_LIMIT[media];
  if (bytes > limit) {
    const tip = media === "video" ? "짧게 잘라 내거나 해상도를 낮춰 다시 올려 주세요." : media === "audio" ? "구간을 잘라 내거나 비트레이트를 낮춰 다시 올려 주세요." : "해상도를 줄이거나 압축해서 다시 올려 주세요.";
    return `${Math.round(limit / MB)}MB 이하 파일만 분석할 수 있습니다(현재 ${(bytes / MB).toFixed(1)}MB). ${tip}`;
  }
  return null;
}

const SAFE_EXT = /^[a-z0-9]{1,5}$/;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function tempPath(userId: string, uuid: string, ext: string): string {
  return `${userId}/${uuid}.${SAFE_EXT.test(ext) ? ext : "bin"}`;
}

/** 임시 파일 경로가 본인 폴더 안의 올바른 형식인지(다른 회원 파일 접근 차단) */
export function isOwnTempPath(userId: string, path: unknown): path is string {
  if (typeof path !== "string" || path.length > 120) return false;
  return new RegExp(`^${userId}/${UUID}\\.[a-z0-9]{1,5}$`, "i").test(path);
}

export function fileBase(name: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  return (base || "analysis").slice(0, 50);
}

/** 저장 가능한 작은 미리보기(JPEG data URL, 20KB 이하)인지 */
export function cleanThumb(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (v.length > 20_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v)) return null;
  return v;
}
