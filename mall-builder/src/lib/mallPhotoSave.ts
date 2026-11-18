// 메이커 M2(2026-11-19, Master msg_c506ba34f9a0) — 바나나 합성 결과 1건을 쇼핑몰 「사진 제안」으로 저장하는 순서.
// DB 계약은 0106(a7423ed90): begin → (upload일 때만) 비공개 제안 버킷 업로드 → commit. 권한·상태는 모두 DB(회원 세션 RLS·함수)가 판정.
// 순수 함수(rpc·업로드·지우기·JPEG 변환·해시를 주입) — 화면·네트워크 없이 단위 시험한다.
// 원칙:
//  - ok:true(= "done")는 DB가 done이라고 답했을 때만.
//  - 결과를 알 수 없는 경우(네트워크 예외·commit 응답 유실·서버 5xx)는 자동 재시도·포기·삭제를 하지 않고 "unknown"(확인 안내)으로 끝낸다.
//  - 파일 지우기는 「본인 예약을 abandon하는 데 성공한 뒤」에만(DB 정책도 abandoned 파일만 허용) — 확정(proposed)된 파일은 건드리지 않는다.
//  - 원본 힌트(SHA-256)와 저장소 지문은 「같은 결과인가」 힌트일 뿐 권한·무결성 판정이 아니다.

export const PROPOSAL_BUCKET = "mall-builder-proposals";
export const PROPOSAL_MAX_BYTES = 5 * 1024 * 1024;
export const PROPOSAL_MAX_SIDE = 6000;
export const JPEG_QUALITIES = [0.92, 0.85, 0.75] as const;

export type SaveCode = "done" | "busy" | "conflict" | "forbidden" | "invalid" | "too_large" | "failed" | "unknown";
/** 바나나에 보내는 고정 문구(번호·경로·원문 오류 없음) */
export const SAVE_TEXT: Record<SaveCode, string> = {
  done: "",
  busy: "다른 사람이 같은 결과를 저장하는 중입니다.",
  conflict: "같은 결과 번호에 다른 사진이 왔습니다.",
  forbidden: "이 상품의 사진을 저장할 권한이 없습니다.",
  invalid: "바나나를 새로고침한 뒤 다시 보내 주세요.",
  too_large: "사진이 커서 저장하지 못했습니다.",
  failed: "저장하지 못했습니다. 다시 보내 주세요.",
  unknown: "저장 결과를 확인하지 못했습니다. 쇼핑몰 「사진 제안」 목록에서 확인해 주세요(자동으로 다시 보내지 않음).",
};
/** 쇼핑몰 화면 상태 줄 */
export const SAVE_STATUS: Record<SaveCode, string> = {
  done: "사진 제안으로 저장됨", busy: "다른 사람이 저장 중", conflict: "같은 번호에 다른 사진 — 저장 안 함",
  forbidden: "권한 없음 — 저장 안 함", invalid: "바나나 새로고침 필요", too_large: "사진이 커서 저장 안 함",
  failed: "저장 실패 — 다시 보내 주세요", unknown: "결과 확인 필요 — 사진 제안 목록을 확인하세요",
};

type RpcResult = { data?: unknown; error?: unknown } | null | undefined;
type StorageError = { statusCode?: string | number; status?: number; code?: string; message?: string } | null | undefined;

export interface SaveDeps {
  begin(a: { store: string; product: string; job: string; result: string; settings: string; baseRevision: string; hint: string }): Promise<RpcResult>;
  commit(id: string): Promise<RpcResult>;
  abandon(id: string): Promise<RpcResult>;
  upload(path: string, file: Blob): Promise<{ error?: StorageError }>;
  remove(path: string): Promise<unknown>;
  /** 5MB 이하 JPEG로(이미 그렇다면 그대로). 못 하면 null */
  toJpeg(file: Blob): Promise<Blob | null>;
  sha256(file: Blob): Promise<string>;
}
export interface SaveInput { storeId: string; productId: string; jobId: string; resultId: string | null; settingsVersion: string; baseRevision: string; file: Blob }

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

/** 공식 Storage 오류표의 「객체가 이미 있음」 코드(HTTP 409) — https://supabase.com/docs/guides/storage/debugging/error-codes */
export const OBJECT_EXISTS_CODES = new Set(["ResourceAlreadyExists", "KeyAlreadyExists"]);

/**
 * 업로드 오류 분류(Mac msg_3c336c319413·Master msg_4ba128209829). 근거: 설치된 @supabase/storage-js 2.118 `common/fetch.ts` —
 * StorageApiError(message, status = HTTP 숫자, statusCode = 본문 statusCode || 본문 code || HTTP 숫자 글자, code = 본문 code).
 * 결과를 알 수 없음이 가장 먼저:
 *  - HTTP 상태 숫자가 없거나(네트워크 = StorageUnknownError) 5xx → "unknown"(문구에 duplicate가 있어도)
 *  - **HTTP 409이고 서비스 코드(code 또는 statusCode)가 객체 중복 코드일 때만** "exists"(= 내가 앞서 올린 같은 예약 경로)
 *  - 409인데 코드가 없거나 다른 코드(BucketAlreadyExists 등), 또는 409가 아닌데 중복 코드·「409」 글자가 붙은 경우(옛 형식 등 불일치) → "unknown"
 *  - 그 밖 4xx → "reject"
 */
export function classifyUploadError(e: StorageError): "exists" | "reject" | "unknown" {
  if (!e) return "unknown";
  const status = typeof e.status === "number" ? e.status : Number.NaN;
  if (!Number.isInteger(status) || status >= 500) return "unknown";
  const code = typeof e.code === "string" ? e.code : "";
  const sc = e.statusCode === undefined || e.statusCode === null ? "" : String(e.statusCode);
  const dup = OBJECT_EXISTS_CODES.has(code) || OBJECT_EXISTS_CODES.has(sc);
  if (status === 409) return dup ? "exists" : "unknown";
  if (dup || sc === "409" || /^5\d\d$/.test(sc) || /AlreadyExists$/.test(code) || /AlreadyExists$/.test(sc)) return "unknown"; // 코드·상태 불일치
  return status >= 400 && status < 500 ? "reject" : "unknown";
}
export const isAlreadyExists = (e: StorageError) => classifyUploadError(e) === "exists";
export const isDefiniteReject = (e: StorageError) => classifyUploadError(e) === "reject";

export async function saveResultAsProposal(input: SaveInput, d: SaveDeps): Promise<SaveCode> {
  if (!input.resultId) return "invalid"; // 번호 없는 옛 바나나 결과는 저장하지 않음
  let hint: string;
  try { hint = await d.sha256(input.file); } catch { return "failed"; } // DB 호출 전 — 저장 0
  if (!/^[0-9a-f]{64}$/.test(hint)) return "failed";

  let b: RpcResult;
  try {
    b = await d.begin({ store: input.storeId, product: input.productId, job: input.jobId, result: input.resultId,
      settings: input.settingsVersion, baseRevision: input.baseRevision, hint });
  } catch { return "unknown"; }
  if (!b || b.error) return "unknown"; // 예약이 생겼는지 알 수 없음 — 그대로 둔다(기한 만료로 정리)
  const bd = rec(b.data);
  if (!bd) return "unknown";
  if (bd.ok !== true) {
    const r = bd.reason;
    return r === "busy" || r === "conflict" || r === "forbidden" || r === "invalid" ? r : "failed";
  }
  if (bd.state === "done") return "done";
  if (bd.state !== "upload" || typeof bd.id !== "string" || typeof bd.path !== "string") return "unknown";
  const id = bd.id, path = bd.path;

  // 변환(업로드 전) 실패 → 파일이 없으니 예약만 포기
  let jpeg: Blob | null = null;
  try { jpeg = await d.toJpeg(input.file); } catch { jpeg = null; }
  if (!jpeg || jpeg.type !== "image/jpeg" || jpeg.size < 1 || jpeg.size > PROPOSAL_MAX_BYTES) {
    try { await d.abandon(id); } catch { /* 포기 응답을 몰라도 예약은 기한 만료로 정리됨 */ }
    return "too_large";
  }

  let up: { error?: StorageError };
  try { up = await d.upload(path, jpeg); } catch { return "unknown"; } // 올라갔는지 알 수 없음 — 포기·삭제 0
  if (up?.error) {
    const kind = classifyUploadError(up.error);
    if (kind === "unknown") return "unknown"; // 올라갔는지 알 수 없음 — commit·abandon·remove 0
    if (kind === "reject") {
      try { await d.abandon(id); } catch { /* 위와 같음 */ }
      return "failed"; // 확정적 거절 → 파일 없음, 예약만 포기
    }
    // "exists" → 앞서 올린 본인 예약 경로 → commit으로
  }

  let c: RpcResult;
  try { c = await d.commit(id); } catch { return "unknown"; } // 응답 유실 — 확정됐을 수 있음: 재시도·포기·삭제 0
  if (!c || c.error) return "unknown";
  const cd = rec(c.data);
  if (!cd) return "unknown";
  if (cd.ok === true && cd.state === "done") return "done";
  if (cd.reason === "no_file") {
    // 본인 예약을 포기하는 데 성공했을 때만 그 경로 파일을 지운다(DB 정책도 abandoned만 허용)
    let a: RpcResult = null;
    try { a = await d.abandon(id); } catch { return "failed"; }
    const ad = rec(a?.data);
    // 오류가 없고(error와 data가 함께 와도 금지) 「포기됨」이 확실할 때만 지운다
    if (a && !a.error && ad && ad.ok === true && ad.state === "abandoned") { try { await d.remove(path); } catch { /* 남으면 정리 목록 */ } }
    return "failed";
  }
  if (cd.reason === "gone" || cd.reason === "forbidden") return "failed"; // 파일 손대지 않음
  return "unknown";
}

/**
 * 대기열 한 칸(Mac msg_3c336c319413): 시작 직전에 「지금 작업 + 원래 창」이 그대로인지 확인 — 아니면 저장 0("skipped").
 * 이미 시작한 저장은 계약대로 끝내되, 끝난 뒤 다시 확인해 바뀌었으면 상태 표시·응답 0("stale").
 */
export async function runQueuedSave(t: { isActive: () => boolean; save: () => Promise<SaveCode>; onDone: (code: SaveCode) => void }):
  Promise<SaveCode | "skipped" | "stale"> {
  if (!t.isActive()) return "skipped";
  let code: SaveCode;
  try { code = await t.save(); } catch { code = "unknown"; }
  if (!t.isActive()) return "stale";
  t.onDone(code);
  return code;
}

/** 받은 파일 → 5MB 이하 JPEG 계획(순수): 그대로 쓸지, 변환할지 */
export function jpegPlan(type: string, size: number): "reuse" | "convert" {
  return type === "image/jpeg" && size >= 1 && size <= PROPOSAL_MAX_BYTES ? "reuse" : "convert";
}

// ── 브라우저 전용(화면에서만 부름 — 시험은 위 순수 함수를 모의 deps로)
/**
 * 5MB 이하 JPEG로. 먼저 항상 디코딩해 가로세로(1~6000px)를 확인한다 — 원본을 그대로 쓰는 경우(이미 5MB 이하 JPEG)에도.
 * 통과하면: 그대로 쓸 수 있으면 원본 바이트 그대로, 아니면 같은 크기 캔버스(흰 배경)에 그려 품질 0.92→0.85→0.75. 실패면 null.
 * (이 확인은 브라우저 단계의 메모리·크기 보호일 뿐 — 공개 전 JPEG 바이트 검증은 M3 서버 경로가 따로 한다)
 */
export async function browserToJpeg(file: Blob): Promise<Blob | null> {
  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
    if (bmp.width < 1 || bmp.height < 1 || bmp.width > PROPOSAL_MAX_SIDE || bmp.height > PROPOSAL_MAX_SIDE) return null;
    if (jpegPlan(file.type, file.size) === "reuse") return file;
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width; canvas.height = bmp.height;
    const g = canvas.getContext("2d");
    if (!g) return null;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(bmp, 0, 0);
    for (const q of JPEG_QUALITIES) {
      const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
      if (out && out.size >= 1 && out.size <= PROPOSAL_MAX_BYTES) return out;
    }
    return null;
  } catch {
    return null;
  } finally {
    bmp?.close();
  }
}
export async function browserSha256(file: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
