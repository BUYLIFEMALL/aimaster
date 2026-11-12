// D27 몰 대표 본인 키 암호화(서버 전용) — AES-256-GCM, 푸는 열쇠는 Lab 서버 환경변수 MALL_SECRET_KEY(32바이트 base64)
// 형식: "v1:" + base64(iv 12바이트 | 인증 태그 16바이트 | 암호문). 몰 id를 추가 인증 데이터로 묶어 다른 몰로 옮겨 붙이면 풀리지 않는다.
// DB·브라우저는 원래 키를 모른다(DB 함수 mall_builder_ai_key_enc는 이 암호문만 돌려줌).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function masterKey(secretB64: string | undefined): Buffer {
  const key = Buffer.from(String(secretB64 ?? "").trim(), "base64");
  if (key.length !== 32) throw new Error("서버 암호화 열쇠(MALL_SECRET_KEY)가 설정되지 않았습니다. 운영자에게 알려 주세요.");
  return key;
}

export function sealSecret(plain: string, aad: string, secretB64 = process.env.MALL_SECRET_KEY): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", masterKey(secretB64), iv);
  c.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")}`;
}

export function openSecret(sealed: string, aad: string, secretB64 = process.env.MALL_SECRET_KEY): string {
  if (!sealed.startsWith("v1:")) throw new Error("저장된 키 형식을 읽지 못했습니다. 키를 다시 등록해 주세요.");
  const raw = Buffer.from(sealed.slice(3), "base64");
  if (raw.length < 29) throw new Error("저장된 키 형식을 읽지 못했습니다. 키를 다시 등록해 주세요.");
  const d = createDecipheriv("aes-256-gcm", masterKey(secretB64), raw.subarray(0, 12));
  d.setAAD(Buffer.from(aad, "utf8"));
  d.setAuthTag(raw.subarray(12, 28));
  try {
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    throw new Error("저장된 키를 풀지 못했습니다. 키를 다시 등록해 주세요.");
  }
}

/** Anthropic 키 모양 검사(sk-ant-로 시작) — 실제 유효성은 첫 호출에서 확인 */
export function looksLikeAnthropicKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(key.trim());
}

/** 제공자별 키 모양 검사(2026-11-12) — OpenAI sk-…, Claude sk-ant-…, Gemini AIza… */
export function looksLikeProviderKey(provider: "openai" | "anthropic" | "gemini", key: string): boolean {
  const k = key.trim();
  if (provider === "anthropic") return looksLikeAnthropicKey(k);
  if (provider === "openai") return /^sk-(?!ant-)[A-Za-z0-9_-]{20,300}$/.test(k);
  return /^AIza[A-Za-z0-9_-]{30,60}$/.test(k);
}
