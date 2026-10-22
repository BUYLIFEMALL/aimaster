import "server-only";

// v1.54 Gemini 파일 업로드(Files API) — 수집한 릴스 영상을 회원 본인 Gemini 키로 잠깐 올려 분석에 쓰고 바로 지운다.
// 우리 저장소에는 저장하지 않는다. Gemini 쪽 파일도 48시간 뒤 자동 삭제되지만 분석이 끝나면 즉시 지운다.
// 키는 헤더(x-goog-api-key)로만 보내고 오류 문구에 남기지 않는다.
const BASE = "https://generativelanguage.googleapis.com";

export interface GeminiFileRef { name: string; uri: string; mimeType: string }

export class GeminiFileError extends Error {}

export async function uploadToGemini(apiKey: string, bytes: Uint8Array, mimeType: string, displayName: string): Promise<GeminiFileRef> {
  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 100) } }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) {
    if (start.status === 400 || start.status === 401 || start.status === 403) throw new GeminiFileError("Gemini API 키가 올바르지 않거나 파일 업로드 권한이 없습니다. 본인 Gemini 키를 확인해 주세요.");
    throw new GeminiFileError(`Gemini에 영상을 올리지 못했습니다(${start.status}).`);
  }
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Length": String(bytes.byteLength), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: bytes as unknown as BodyInit,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  const d = (await up.json().catch(() => ({}))) as { file?: { name?: string; uri?: string; mimeType?: string; state?: string } };
  if (!up.ok || !d.file?.name || !d.file.uri) throw new GeminiFileError(`Gemini에 영상을 올리지 못했습니다(${up.status}).`);
  const ref = { name: d.file.name, uri: d.file.uri, mimeType: d.file.mimeType || mimeType };
  if (d.file.state !== "ACTIVE") await waitActive(apiKey, ref.name);
  return ref;
}

/** 영상 처리(PROCESSING)가 끝날 때까지 기다린다(최대 약 90초) */
async function waitActive(apiKey: string, name: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${BASE}/v1beta/${name}`, { headers: { "x-goog-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const d = (await res.json().catch(() => ({}))) as { state?: string };
    if (d.state === "ACTIVE") return;
    if (d.state === "FAILED") { await deleteGeminiFile(apiKey, name); throw new GeminiFileError("Gemini가 이 영상을 처리하지 못했습니다. 다른 게시물로 시도해 주세요."); }
  }
  await deleteGeminiFile(apiKey, name);
  throw new GeminiFileError("Gemini 영상 처리가 오래 걸려 중단했습니다. 잠시 뒤 다시 시도해 주세요.");
}

/** 분석이 끝나면 지운다(실패해도 48시간 뒤 자동 삭제되므로 오류를 던지지 않음) */
export async function deleteGeminiFile(apiKey: string, name: string): Promise<void> {
  try {
    await fetch(`${BASE}/v1beta/${name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch { /* 자동 삭제에 맡김 */ }
}
