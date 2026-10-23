// 큰 오디오를 Vercel 함수 본문 한도(4.5MB)에 걸리지 않게 올리는 도우미.
// 서버가 회원 본인 키로 Gemini Files API 이어 올리기(resumable) 세션을 시작하고(사이트 Origin을 함께 보내야
// Google이 그 올림 주소에 브라우저 직접 업로드(CORS)를 허용한다), 브라우저가 그 주소로 파일을 직접 올린다.
// 키는 서버에만 있고, 브라우저에는 Google이 준 올림 주소(키 없음)만 전달된다. 분석은 파일 주소(fileUri)로 한다.
// (2026-10-21: 우리 서버를 거쳐 조각으로 보내는 방식은 Google 조각 단위가 8MB라 4.5MB 한도와 맞지 않아 쓰지 않는다.)

const API_ORIGIN = "https://generativelanguage.googleapis.com";
const UPLOAD_URL_PREFIX = `${API_ORIGIN}/upload/`;
const FILE_URI_PREFIX = `${API_ORIGIN}/v1beta/files/`;

/** 회원이 올릴 수 있는 최대 크기(화면·가이드와 같은 값). */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export interface GeminiFileRef {
  name: string; // "files/abc123"
  uri: string;
  mimeType: string;
  state?: string;
}

/** 다른 주소로 요청을 보내지 못하게, Google 올림 주소만 받는다. */
export function isAllowedUploadUrl(url: string): boolean {
  return url.startsWith(UPLOAD_URL_PREFIX);
}

export function isAllowedFileRef(name: string, uri: string): boolean {
  return /^files\/[a-z0-9-]+$/.test(name) && uri === `${API_ORIGIN}/v1beta/${name}` && uri.startsWith(FILE_URI_PREFIX);
}

function googleError(prefix: string, status: number, body: string): Error {
  const detail = body.replace(/AIza[0-9A-Za-z_-]{20,}/g, "***").slice(0, 300);
  if (status === 400 || status === 403) {
    return new Error(`${prefix}: Gemini API 키 또는 파일 형식을 확인해 주세요. (${status}) ${detail}`);
  }
  return new Error(`${prefix} (${status}) ${detail}`);
}

export async function startResumableUpload(
  apiKey: string,
  input: { displayName: string; mimeType: string; size: number; origin: string },
): Promise<string> {
  const res = await fetch(`${UPLOAD_URL_PREFIX}v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      Origin: input.origin,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(input.size),
      "X-Goog-Upload-Header-Content-Type": input.mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: input.displayName.slice(0, 120) } }),
  });
  if (!res.ok) throw googleError("파일 올리기를 시작하지 못했습니다", res.status, await res.text());
  const uploadUrl = res.headers.get("x-goog-upload-url");
  if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
    throw new Error("파일 올리기 주소를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  return uploadUrl;
}

/** Google이 파일 처리를 끝낼 때까지 기다린다(오디오는 보통 몇 초). */
export async function waitUntilActive(apiKey: string, name: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const res = await fetch(`${API_ORIGIN}/v1beta/${name}`, { headers: { "x-goog-api-key": apiKey } });
    if (!res.ok) throw googleError("올린 파일을 확인하지 못했습니다", res.status, await res.text());
    const file = (await res.json()) as { state?: string };
    if (file.state === "ACTIVE") return;
    if (file.state === "FAILED") throw new Error("Google에서 오디오 파일을 처리하지 못했습니다. 다른 형식(mp3·wav)으로 다시 시도해 주세요.");
    if (Date.now() > deadline) throw new Error("오디오 파일 준비가 오래 걸립니다. 잠시 뒤 다시 시도해 주세요.");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** 분석이 끝난 파일을 지운다. 실패해도 Google이 48시간 뒤 자동 삭제하므로 오류는 무시한다. */
export async function deleteGeminiFile(apiKey: string, name: string): Promise<void> {
  try {
    await fetch(`${API_ORIGIN}/v1beta/${name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey } });
  } catch {
    // 무시
  }
}
