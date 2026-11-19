// 메이커 M3 서버 적용 경로 로컬 후보(2026-11-19, Master msg_1984d921b251) — 서버 전용(브라우저 import 금지).
// DB 계약은 0107(cbe48e7d9): photo_apply_begin(슬롯) → [읽기 → 디코드·재인코딩 → 서명 경로 쓰기 → 되읽기 검증] → photo_apply_commit(최종 서명).
// 순수 함수: RPC·Storage·디코더·해시·시계를 모두 주입받아 합성 파일·가짜 Storage로 단위 시험한다(실 Storage·DB·sharp 0).
// 원칙:
//  - 게시되는 바이트는 항상 「서버가 디코드·재인코딩한 바이트」뿐. 헤더만 검사해 원본을 그대로 게시하는 경로는 없다(decode 주입이 필수).
//  - 서명 경로·최종 서명은 재인코딩 바이트의 SHA-256·크기로 만든다. 업로드 뒤 같은 경로를 다시 내려받아 SHA-256·크기가 같을 때만 commit.
//  - 실패(권한·열쇠·크기·디코드·업로드·되읽기)는 commit을 부르지 않아 상품 변경 0. 결과를 알 수 없는 경우는 자동 재시도 없이 unknown.
//  - 열쇠(keyB64)·게시 경로·원문 오류는 반환값·문구에 넣지 않는다(고정 문구만).
import { appliedPath, appliedPublicUrl, applyFinalSignature, PUBLIC_URL_RE } from "./applySignature.ts";
import { classifyUploadError } from "./mallPhotoSave.ts";

export const APPLY_MAX_BYTES = 5 * 1024 * 1024;
export const APPLY_MAX_SIDE = 6000;
export const APPLY_EXP_SECONDS = 300;

export type ApplyCode =
  | "done" | "forbidden" | "not_proposed" | "stale" | "busy" | "gone" | "bad_image" | "too_large"
  | "config" | "compromised" | "failed" | "unknown";
export const APPLY_TEXT: Record<ApplyCode, string> = {
  done: "",
  forbidden: "이 상품의 사진을 적용할 권한이 없습니다.",
  not_proposed: "이미 처리된 제안입니다.",
  stale: "그사이 상품이 바뀌었습니다. 확인한 뒤 다시 적용해 주세요.",
  busy: "다른 사람이 같은 제안을 적용하는 중입니다.",
  gone: "적용 시간이 지났거나 제안이 더 이상 유효하지 않습니다. 다시 시도해 주세요.",
  bad_image: "사진을 확인하지 못했습니다.",
  too_large: "사진이 커서 적용하지 못했습니다.",
  config: "서버 설정이 준비되지 않았습니다.",
  compromised: "게시된 파일이 검사한 사진과 다릅니다. 적용하지 않았습니다.",
  failed: "적용하지 못했습니다. 다시 시도해 주세요.",
  unknown: "적용 결과를 확인하지 못했습니다. 상품 사진을 다시 확인해 주세요(자동으로 다시 시도하지 않음).",
};

type RpcResult = { data?: unknown; error?: unknown } | null | undefined;
type StorageError = { statusCode?: string | number; status?: number; code?: string; message?: string } | null | undefined;

export interface DecodedImage { bytes: Uint8Array; width: number; height: number }

export interface ApplyDeps {
  /** 회원 세션으로 제안 행을 읽음(RLS). 권한 없음·없음 = null */
  loadProposal(id: string): Promise<{ storeId: string; productId: string; filePath: string } | null>;
  begin(proposalId: string, force: boolean): Promise<RpcResult>;
  /** 제안 버킷 파일 내려받기. maxBytes를 넘으면 중단하고 "too_large", 실패는 null */
  downloadProposal(filePath: string, maxBytes: number): Promise<Uint8Array | "too_large" | null>;
  /** 디코드 + 메타데이터 제거 + JPEG 재인코딩. 디코드 불가·폭탄 = null. 이 함수가 유일한 게시 바이트 출처 */
  decode(bytes: Uint8Array): Promise<DecodedImage | null>;
  sha256(bytes: Uint8Array): Promise<string>;
  /** 변경 불가 공개 버킷에 upsert false로 올림 */
  upload(path: string, bytes: Uint8Array): Promise<{ error?: StorageError }>;
  /** 올린 경로를 다시 내려받음(같은 경로, 서버 세션) */
  downloadApplied(path: string, maxBytes: number): Promise<Uint8Array | null>;
  commit(a: { apply: string; kid: string; sha: string; size: number; exp: number; sig: string; publicUrl: string }): Promise<RpcResult>;
  nowSeconds(): number;
}
export interface ApplyInput {
  proposalId: string; force: boolean; uid: string;
  /** 서버 설정 */ kid: string; keyB64: string; origin: string;
}

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** JPEG 출력 방어 확인(디코더 결과가 정말 JPEG 모양인가) — 보조 검사일 뿐, 이것만으로 게시하지 않는다(게시 바이트는 항상 decode 출력) */
export function looksLikeJpeg(b: Uint8Array): boolean {
  return b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
}
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

function mapBeginReason(reason: unknown): ApplyCode {
  switch (reason) {
    case "forbidden": return "forbidden";
    case "not_proposed": return "not_proposed";
    case "stale": return "stale";
    case "busy": return "busy";
    default: return "failed";
  }
}
function mapCommitReason(reason: unknown): ApplyCode {
  switch (reason) {
    case "forbidden": return "forbidden";
    case "stale": return "stale";
    case "gone": return "gone";
    case "conflict": return "compromised";
    case "bad_sig": case "no_file": case "invalid": return "failed";
    default: return "failed";
  }
}

export async function applyProposal(input: ApplyInput, d: ApplyDeps): Promise<ApplyCode> {
  // 0. 입력·서버 설정 검사(열쇠 없음·형식 오류 = DB 호출 전에 config로 끝)
  if (!UUID.test(input.proposalId) || !UUID.test(input.uid)) return "failed";
  if (!input.keyB64 || !input.kid || !input.origin) return "config";
  try { appliedPublicUrl(input.origin, `${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}/${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}.k1.${"0".repeat(64)}.${"0".repeat(32)}.jpg`); } catch { return "config"; }
  if (Buffer.from(input.keyB64, "base64").length !== 32 || !/^[a-z0-9]{1,16}$/.test(input.kid)) return "config";

  // 1. 제안 읽기(권한 없음 = forbidden, 내용 노출 0)
  let proposal: Awaited<ReturnType<ApplyDeps["loadProposal"]>>;
  try { proposal = await d.loadProposal(input.proposalId); } catch { return "unknown"; }
  if (!proposal) return "forbidden";

  // 2. 1단계: 슬롯
  let slot: { apply: string; role: string };
  try {
    const r = await d.begin(input.proposalId, input.force === true);
    if (r?.error) return "failed";
    const o = rec(r?.data);
    if (!o) return "failed";
    if (o.ok !== true) return mapBeginReason(o.reason);
    if (typeof o.apply_id !== "string" || !UUID.test(o.apply_id) || (o.role !== "operator" && o.role !== "supplier")) return "failed";
    slot = { apply: o.apply_id, role: o.role };
  } catch { return "unknown"; }

  // 3. 읽기(5MB 상한) — 이 뒤 실패는 commit을 부르지 않으므로 상품 변경 0(슬롯은 5분 뒤 만료)
  let original: Uint8Array;
  try {
    const got = await d.downloadProposal(proposal.filePath, APPLY_MAX_BYTES);
    if (got === "too_large") return "too_large";
    if (!got || got.length === 0) return "failed";
    original = got;
  } catch { return "failed"; }

  // 4. 정제: 서버 디코드 + 재인코딩. 헤더만 보고 원본을 게시하는 길은 없다
  let clean: DecodedImage | null;
  try { clean = await d.decode(original); } catch { clean = null; }
  if (!clean || !(clean.bytes instanceof Uint8Array)) return "bad_image";
  if (!Number.isInteger(clean.width) || !Number.isInteger(clean.height) || clean.width < 1 || clean.height < 1
      || clean.width > APPLY_MAX_SIDE || clean.height > APPLY_MAX_SIDE) return "bad_image";
  if (!looksLikeJpeg(clean.bytes)) return "bad_image";
  if (clean.bytes.length > APPLY_MAX_BYTES) return "too_large";

  // 5. 정제 바이트의 지문으로 서명 경로
  let sha: string; let path: string; let publicUrl: string;
  const fields = { kid: input.kid, storeId: proposal.storeId, productId: proposal.productId, proposalId: input.proposalId, applyId: slot.apply, uid: input.uid, role: slot.role, sha256: "" };
  try {
    sha = await d.sha256(clean.bytes);
    fields.sha256 = sha;
    path = appliedPath(input.keyB64, fields);
    publicUrl = appliedPublicUrl(input.origin, path);
  } catch { return "config"; }

  // 6. 쓰기(upsert false). 「이미 있음」(409+객체 중복 코드)은 같은 슬롯의 앞선 시도 → 되읽기로 판정. 그 밖 실패는 commit 0
  try {
    const up = await d.upload(path, clean.bytes);
    if (up?.error) {
      const kind = classifyUploadError(up.error);
      if (kind === "unknown") return "unknown";
      if (kind === "reject") return "failed";
      // exists → 되읽기 검증으로 진행
    }
  } catch { return "unknown"; }

  // 7. 되읽기 검증: 변경 불가 위치에 놓인 바이트가 내가 만든 바이트와 같아야 한다(다르면 commit 0)
  try {
    const back = await d.downloadApplied(path, APPLY_MAX_BYTES);
    if (!back) return "unknown";
    if (back.length !== clean.bytes.length || !same(back, clean.bytes) || (await d.sha256(back)) !== sha) return "compromised";
  } catch { return "unknown"; }

  // 8. 확정(2단계): 정제 바이트의 sha·크기·만료·정규화 공개 주소를 묶은 최종 서명
  try {
    const exp = d.nowSeconds() + APPLY_EXP_SECONDS;
    if (!PUBLIC_URL_RE.test(publicUrl)) return "config";
    const sig = applyFinalSignature(input.keyB64, { ...fields, size: clean.bytes.length, exp, publicUrl });
    const r = await d.commit({ apply: slot.apply, kid: input.kid, sha, size: clean.bytes.length, exp, sig, publicUrl });
    if (r?.error) return "unknown"; // 응답 오류 = DB 반영 여부 모름 → 자동 재시도 0, 화면은 상품을 다시 읽어 판정
    const o = rec(r?.data);
    if (!o) return "unknown";
    if (o.ok === true && o.state === "done") return "done";
    if (o.ok === false) return mapCommitReason(o.reason);
    return "unknown";
  } catch { return "unknown"; }
}
