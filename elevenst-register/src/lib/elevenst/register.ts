import { findNonEucKr, pickTag } from "./xml.ts";

// 4단계 「11번가에 보내기」 순수 함수(화면·서버 공용, 시험 가능). 명세 정리: docs/API_SPEC_NOTES.md §9
// - 등록 응답: <ClientMessage><message>…</message><productNo>N</productNo><resultCode>200</resultCode></ClientMessage>
//   200 = 성공, 210 = 신규상품으로 신청했으나 일반상품으로 성공. 그 밖은 실패(message에 사유).
// - 전시중지 응답: <message>판매상태가 수정되었습니다. [STAT : 105]</message><resultCode>200</resultCode>

export type SendStatus = "sending" | "registered" | "stopped" | "failed" | "unknown";

export type RegisterResult = { ok: true; productNo: string; code: string; message: string } | { ok: false; code: string; message: string };

/** 등록 응답 읽기. 상품번호가 없으면 성공 코드여도 성공으로 보지 않는다 */
export function parseRegisterResponse(xml: string): RegisterResult {
  const code = pickTag(xml, "resultCode");
  const productNo = pickTag(xml, "productNo").replace(/\D/g, "");
  const message = pickTag(xml, "message").slice(0, 300);
  if ((code === "200" || code === "210") && productNo) return { ok: true, productNo, code, message };
  return { ok: false, code, message: message || "11번가가 등록을 받아들이지 않았습니다." };
}

/** 전시중지 응답 읽기 */
export function parseStopDisplayResponse(xml: string): { ok: boolean; message: string } {
  const code = pickTag(xml, "resultCode");
  const message = pickTag(xml, "message").slice(0, 300);
  return { ok: code === "200", message };
}

/**
 * 등록 요청이 예외로 끝났을 때 상태 고르기.
 * - 연결 실패·시간 초과(status 0), XML이 아닌 5xx 응답 → unknown: 11번가가 이미 상품을 만들었을 수도 있어 자동으로 다시 보내지 않는다.
 * - 11번가가 XML로 사유를 돌려준 오류 → failed: 상품이 만들어지지 않은 것으로 본다.
 */
export function classifySendError(status: number, body: string): "failed" | "unknown" {
  if (status === 0) return "unknown";
  const isXml = body.trimStart().startsWith("<");
  if (!isXml && status >= 500) return "unknown";
  return "failed";
}

/** 같은 상품을 다시 보내도 되는가 — 보내는 중·확인 필요·이미 등록된 상품은 막는다(중복 상품 방지) */
export function sendBlockReason(last: SendStatus | null | undefined): string {
  if (last === "sending") return "이 상품은 지금 11번가로 보내는 중입니다. 잠시 뒤 등록 기록을 확인해 주세요.";
  if (last === "unknown") return "지난번 보내기 결과를 확인하지 못했습니다. 11번가 셀러오피스에서 상품이 생겼는지 먼저 확인해 주세요(중복 등록 방지).";
  if (last === "registered" || last === "stopped") return "이미 11번가에 등록된 상품입니다. 수정은 11번가 셀러오피스에서 해 주세요.";
  return "";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 11번가(EUC-KR)가 받을 수 없는 글자(이모지 등)를 뺀다 */
export function stripNonEucKr(s: string): string {
  const bad = new Set(findNonEucKr(s));
  return bad.size ? [...s].filter((ch) => !bad.has(ch)).join("") : s;
}

const lines = (s: string | null | undefined) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•·*\d.)]+\s*/, "").trim())
    .filter(Boolean);

export interface DetailTextSource {
  name: string;
  key_features?: string | null;
  specs?: string | null;
  how_to_use?: string | null;
  target_customer?: string | null;
}

/**
 * 글로 된 상세설명 HTML(이미지 없음) — 상세페이지 자동화가 저장한 핵심 특징·상품 정보·사용법·추천 대상.
 * 이미지 주소를 넣지 않으므로 30일 정리 뒤에도 깨지지 않는다(4단계 플랜 §3 1안).
 */
export function detailTextHtml(p: DetailTextSource): string {
  const h = (t: string) => `<h3 style="font-size:18px;margin:28px 0 10px;color:#222">${t}</h3>`;
  const parts: string[] = [`<h2 style="font-size:22px;margin:0 0 16px;color:#111">${esc(p.name)}</h2>`];
  const feats = lines(p.key_features);
  if (feats.length) parts.push(h("핵심 특징"), `<ul style="padding-left:20px;line-height:1.8">${feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`);
  // 「이름: 값」 줄만 표로(prefill.ts parseSpecs와 같은 규칙)
  const specs = (p.specs ?? "")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-•·*]?\s*([^:：]{1,20}?)\s*[:：]\s*(.+?)\s*$/))
    .filter((m): m is RegExpMatchArray => Boolean(m));
  if (specs.length) {
    parts.push(
      h("상품 정보"),
      `<table style="width:100%;border-collapse:collapse;font-size:14px">${specs
        .map((m) => `<tr><th style="width:30%;text-align:left;background:#f5f5f5;border:1px solid #ddd;padding:8px">${esc(m[1])}</th><td style="border:1px solid #ddd;padding:8px">${esc(m[2])}</td></tr>`)
        .join("")}</table>`,
    );
  }
  const how = lines(p.how_to_use);
  if (how.length) parts.push(h("사용 방법"), `<ol style="padding-left:20px;line-height:1.8">${how.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`);
  const target = lines(p.target_customer);
  if (target.length) parts.push(h("이런 분께 추천합니다"), `<ul style="padding-left:20px;line-height:1.8">${target.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  return stripNonEucKr(`<div style="max-width:860px;margin:0 auto;font-family:sans-serif;color:#333">${parts.join("")}</div>`);
}
