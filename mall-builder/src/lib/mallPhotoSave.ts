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
type StorageError = { statusCode?: string | number; status?: number; message?: string } | null | undefined;

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

/** 업로드 오류가 「같은 경로에 이미 있음」(= 내가 앞서 올린 같은 예약 경로)인지 */
export function isAlreadyExists(e: StorageError): boolean {
  if (!e) return false;
  const code = String(e.statusCode ?? e.status ?? "");
  return code === "409" || /already exists|duplicate/i.test(e.message ?? "");
}
/** 업로드 오류가 확정적인 거절(4xx)인지 — 아니면(5xx·상태 없음) 결과를 알 수 없음 */
export function isDefiniteReject(e: StorageError): boolean {
  if (!e) return false;
  const n = Number(e.statusCode ?? e.status);
  return Number.isInteger(n) && n >= 400 && n < 500 && n !== 409;
}

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
  if (up?.error && !isAlreadyExists(up.error)) {
    if (!isDefiniteReject(up.error)) return "unknown";
    try { await d.abandon(id); } catch { /* 위와 같음 */ }
    return "failed"; // 확정적 거절 → 파일 없음, 예약만 포기
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
    if (ad && ad.ok === true && ad.state === "abandoned") { try { await d.remove(path); } catch { /* 남으면 정리 목록 */ } }
    return "failed";
  }
  if (cd.reason === "gone" || cd.reason === "forbidden") return "failed"; // 파일 손대지 않음
  return "unknown";
}

/** 받은 파일 → 5MB 이하 JPEG 계획(순수): 그대로 쓸지, 변환할지 */
export function jpegPlan(type: string, size: number): "reuse" | "convert" {
  return type === "image/jpeg" && size >= 1 && size <= PROPOSAL_MAX_BYTES ? "reuse" : "convert";
}

// ── 브라우저 전용(화면에서만 부름 — 시험은 위 순수 함수를 모의 deps로)
/** 5MB 이하 JPEG로: 이미 그렇다면 그대로, 아니면 같은 크기 캔버스(흰 배경)에 그려 품질 0.92→0.85→0.75. 가로세로 6000px 초과·디코딩 실패면 null */
export async function browserToJpeg(file: Blob): Promise<Blob | null> {
  if (jpegPlan(file.type, file.size) === "reuse") return file;
  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
    if (bmp.width < 1 || bmp.height < 1 || bmp.width > PROPOSAL_MAX_SIDE || bmp.height > PROPOSAL_MAX_SIDE) return null;
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
