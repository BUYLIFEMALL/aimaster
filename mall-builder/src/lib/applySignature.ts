// 메이커 M3 1차(2026-11-19, Master msg_617ae29305b4) — 「제안 → 적용」 서명 형식(서버 전용, 브라우저에서 import 금지).
// 두 가지 서명은 목적 글자로 분리한다(같은 열쇠라도 한 서명을 다른 용도로 쓸 수 없음):
//   upload-path : 변경 불가 공개 버킷 mall-builder-applied의 게시 경로 이름에 들어가는 HMAC(앞 32자) — 버킷 올리기 정책이 DB에서 다시 계산
//   apply-final : 최종 적용 함수(mall_builder_photo_apply_commit)에 넘기는 HMAC(64자) — 바이트 수·만료 시각·정규화한 전체 공개 주소까지 묶음
//                 (출처는 서버 설정에서만 오고 appliedPublicUrl로 정규화 — 호출자가 출처를 바꾸면 서명이 맞지 않음)
// 원문 = 필드를 「|」로 이은 글자. 모든 필드를 엄격한 형식으로 먼저 검사하므로 「|」가 끼어들 수 없어 모호하지 않다.
// DB 쪽(0107 mall_builder_private.apply_upload_msg·apply_final_msg)도 같은 순서·같은 글자를 만든다(시험이 서로 대조).
// 경로는 업로드가 끝나기 전에는 브라우저·로그·응답에 내보내지 않는다(이 모듈은 서버 경로에서만 쓴다 — 시험이 client 파일 import 0을 확인).
import { createHmac } from "node:crypto";

export const SIG_VERSION = "v1";
export const APPLIED_BUCKET = "mall-builder-applied";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KID = /^[a-z0-9]{1,16}$/;
const SHA = /^[0-9a-f]{64}$/;
const ROLE = /^(operator|supplier)$/;
const ORIGIN = /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$/;
export const PUBLIC_URL_RE = new RegExp("^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?/storage/v1/object/public/mall-builder-applied/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z0-9]{1,16}\\.[0-9a-f]{64}\\.[0-9a-f]{32}\\.jpg$");

export interface ApplyFields { kid: string; storeId: string; productId: string; proposalId: string; applyId: string; uid: string; role: string; sha256: string }
export interface FinalFields extends ApplyFields { size: number; exp: number; publicUrl: string }

function check(f: ApplyFields) {
  if (!KID.test(f.kid)) throw new Error("kid 형식");
  for (const [k, v] of [["storeId", f.storeId], ["productId", f.productId], ["proposalId", f.proposalId], ["applyId", f.applyId], ["uid", f.uid]] as const) {
    if (!UUID.test(v)) throw new Error(`${k} 형식`);
  }
  if (!ROLE.test(f.role)) throw new Error("role 형식");
  if (!SHA.test(f.sha256)) throw new Error("sha256 형식");
}

export function uploadPathMessage(f: ApplyFields): string {
  check(f);
  return [SIG_VERSION, "upload-path", f.kid, f.storeId, f.productId, f.proposalId, f.applyId, f.uid, f.role, f.sha256].join("|");
}
export function applyFinalMessage(f: FinalFields): string {
  check(f);
  if (!Number.isInteger(f.size) || f.size < 1 || f.size > 5 * 1024 * 1024) throw new Error("size 범위");
  if (!Number.isInteger(f.exp) || f.exp < 1 || f.exp > 9_999_999_999) throw new Error("exp 형식");
  if (typeof f.publicUrl !== "string" || f.publicUrl.length > 400 || !PUBLIC_URL_RE.test(f.publicUrl)) throw new Error("publicUrl 형식");
  return [SIG_VERSION, "apply-final", f.kid, f.storeId, f.productId, f.proposalId, f.applyId, f.uid, f.role, f.sha256, String(f.size), String(f.exp), f.publicUrl].join("|");
}

const keyBytes = (keyB64: string) => {
  const k = Buffer.from(keyB64, "base64");
  if (k.length !== 32) throw new Error("서명 열쇠는 32바이트여야 합니다");
  return k;
};
const hmacHex = (keyB64: string, msg: string) => createHmac("sha256", keyBytes(keyB64)).update(msg, "utf8").digest("hex");

/** 게시 경로: <몰>/<apply_id>.<kid>.<sha256>.<HMAC 앞 32자>.jpg */
export function appliedPath(keyB64: string, f: ApplyFields): string {
  const sig = hmacHex(keyB64, uploadPathMessage(f)).slice(0, 32);
  return `${f.storeId}/${f.applyId}.${f.kid}.${f.sha256}.${sig}.jpg`;
}
/** 서버 설정의 출처(예: Supabase 프로젝트 주소)와 게시 경로로 정규화한 전체 공개 주소. 출처는 소문자·끝 / 제거, https만 */
export function appliedPublicUrl(origin: string, path: string): string {
  // 표준 URL 파서로 검증(Master msg_8aaff84db217): https만, 사용자·비밀번호·경로·질의·조각 없음, 포트는 1~65535(99999 같은 값은 파서가 거절).
  // 파서가 조용히 떼어 내는 값(사용자 정보·?·#)도 원문에서 직접 거절. 끝의 / 는 허용(설정값 관례), 기본 포트 :443은 표준 출처로 빠짐.
  const raw = String(origin).trim().replace(/\/+$/, "");
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("origin 형식"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || raw.includes("?") || raw.includes("#") || raw.includes("@")
      || (parsed.pathname !== "/" && parsed.pathname !== "") || (parsed.port !== "" && (Number(parsed.port) < 1 || Number(parsed.port) > 65535))) {
    throw new Error("origin 형식");
  }
  const o = parsed.origin;
  if (!ORIGIN.test(o)) throw new Error("origin 형식");
  const u = `${o}/storage/v1/object/public/${APPLIED_BUCKET}/${path}`;
  if (!PUBLIC_URL_RE.test(u)) throw new Error("path 형식");
  return u;
}
/** 최종 적용 서명(64자) */
export function applyFinalSignature(keyB64: string, f: FinalFields): string {
  return hmacHex(keyB64, applyFinalMessage(f));
}
