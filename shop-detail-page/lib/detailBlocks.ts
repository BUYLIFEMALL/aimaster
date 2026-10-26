// v1.37(E3, 2026-10-26): 상세페이지 편집 보강 — 배송·교환·환불 안내 블록과 문구 말투 5종의 순수 함수(브라우저·서버 공용, 시험 scripts/test-e3.mts).
// 배송 안내 값은 회원이 입력한 것만 쓴다(「무료 반품」「당일 출고」를 기본값으로 채우지 않음). 저장은 회원 브라우저(localStorage)에만.

export interface ShippingNotice {
  courier: string; // 택배사
  shipDays: string; // 출고 안내(예: 결제 후 1~2일 안에 출고)
  shipFee: string; // 배송비(예: 3,000원 / 3만원 이상 무료)
  exchangeDays: string; // 교환·반품 신청 기간
  returnFee: string; // 반품 배송비
  returnAddress: string; // 반품지
  contact: string; // 문의처
  extra: string; // 기타(교환·반품이 안 되는 경우 등)
}

export const NOTICE_FIELDS: { key: keyof ShippingNotice; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "courier", label: "택배사", placeholder: "예: CJ대한통운" },
  { key: "shipDays", label: "출고 안내", placeholder: "예: 결제 확인 후 1~2일 안에 출고(주말·공휴일 제외)" },
  { key: "shipFee", label: "배송비", placeholder: "예: 3,000원 (3만 원 이상 구매 시 무료)" },
  { key: "exchangeDays", label: "교환·반품 신청 기간", placeholder: "예: 상품을 받은 날부터 7일 이내" },
  { key: "returnFee", label: "반품 배송비", placeholder: "예: 단순 변심 왕복 6,000원 / 상품 불량은 판매자 부담" },
  { key: "returnAddress", label: "반품지", placeholder: "예: 서울시 ○○구 ○○로 00, 0층" },
  { key: "contact", label: "문의처", placeholder: "예: 스토어 톡톡 · 평일 10시~17시" },
  { key: "extra", label: "기타 안내", placeholder: "예: 포장을 뜯어 상품 가치가 떨어진 경우 교환·반품이 어렵습니다.", multiline: true },
];

export const EMPTY_NOTICE: ShippingNotice = { courier: "", shipDays: "", shipFee: "", exchangeDays: "", returnFee: "", returnAddress: "", contact: "", extra: "" };
export const NOTICE_STORE_KEY = "sdp-shipping-notice-v1";
const MAX_FIELD = 300;

/** 저장분·입력값 정리: 알려진 칸만, 문자열만, 300자 안 */
export function normalizeNotice(raw: unknown): ShippingNotice {
  const src = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_NOTICE };
  for (const f of NOTICE_FIELDS) { const v = src[f.key]; if (typeof v === "string") out[f.key] = v.slice(0, MAX_FIELD); }
  return out;
}

/** 채운 칸만 [이름, 값] 목록 */
export function noticeRows(n: ShippingNotice): [string, string][] {
  return NOTICE_FIELDS.filter((f) => n[f.key].trim()).map((f) => [f.label, n[f.key].trim()]);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** HTML 상세페이지 끝에 넣는 안내 표(인라인 스타일만 — 마켓 편집기가 <style>을 지워도 모양 유지). 채운 칸이 없으면 빈 문자열 */
export function noticeHtml(n: ShippingNotice): string {
  const rows = noticeRows(n);
  if (!rows.length) return "";
  const tr = rows.map(([k, v]) => `<tr><th style="width:30%;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;text-align:left;font-size:15px;color:#334155;vertical-align:top">${escapeHtml(k)}</th><td style="padding:12px 14px;border:1px solid #e2e8f0;font-size:15px;color:#1e293b;line-height:1.6;white-space:pre-line">${escapeHtml(v)}</td></tr>`).join("");
  return `<section data-block="shipping-notice" style="max-width:860px;margin:40px auto 0;padding:0 16px;font-family:'Noto Sans KR',sans-serif"><h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 14px">🚚 배송 · 교환 · 환불 안내</h2><table style="width:100%;border-collapse:collapse">${tr}</table></section>`;
}

/** 캔버스 글 줄 나누기(글자 단위 — 한글은 띄어쓰기가 없어도 넘치지 않게). measure는 폭을 재는 함수 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (line && measure(line + ch) > maxWidth) { out.push(line); line = ch.trimStart(); } else line += ch;
    }
    out.push(line);
  }
  return out;
}

/* ───────── 문구 말투 5종 ───────── */
export type CopyTone = "premium" | "friendly" | "trust" | "value" | "info";
export const COPY_TONES: Record<CopyTone, { label: string; hint: string }> = {
  premium: { label: "프리미엄", hint: "고급스럽고 절제된 어휘, 소재·디테일 중심" },
  friendly: { label: "친근한", hint: "말 걸듯 편안하게, 생활 속 쓰임 중심" },
  trust: { label: "신뢰(사실만)", hint: "입력된 스펙·특징만 담백하게, 꾸밈말 최소" },
  value: { label: "가성비", hint: "쓰임새 대비 실속 강조 — 할인가가 있을 때만 가격 언급" },
  info: { label: "정보형", hint: "스펙·사용법을 항목처럼 또렷하게, 입력된 수치만" },
};
export const toCopyTone = (v: unknown): CopyTone => (typeof v === "string" && v in COPY_TONES ? (v as CopyTone) : "friendly");

export interface CopyResult { names: string[]; oneLine: string; body: string; sns: string[] }

/** 근거 없이 쓰면 기만 광고가 되는 표현(원본 「데이터형·긴급」 톤의 위험 문구) — 상품 정보에 없으면 그 문장을 뺀다 */
const RISKY = /(누적\s*판매|판매량|만족도|재구매율|후기|리뷰|별점|임상|인증|특허|1위|베스트셀러|한정\s*수량|한정판|오늘만|마감\s*임박|품절\s*임박|재입고|[0-9][0-9,.]*\s*%\s*(만족|개선|효과)|[0-9][0-9,]*\s*명이?\s*(선택|구매))/;

/** 문장 단위로 나눠 위험 표현이 있는 문장을 뺀다. allowed에 든 낱말(상품 정보에 실제로 있는 말)은 허용 */
export function stripRiskyClaims(text: string, allowed: string): string {
  const sentences = text.split(/(?<=[.!?。]|\n)/);
  return sentences.filter((s) => {
    const m = s.match(RISKY);
    return !m || allowed.includes(m[0].replace(/\s+/g, ""));
  }).join("").trim();
}

/** 모델 결과 정리: 모양 맞추기·개수 자르기·위험 문장 빼기. 이름은 3개, SNS는 2개까지 */
export function cleanCopy(raw: unknown, allowed: string): CopyResult {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? stripRiskyClaims(v, allowed).slice(0, max) : "");
  const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
  return { names: list(r.names, 3, 100), oneLine: str(r.oneLine, 200), body: str(r.body, 1500), sns: list(r.sns, 2, 600) };
}

/** 「묶음 복사」 글 */
export function copyBundleText(c: CopyResult): string {
  return [
    "[상품명 후보]", ...c.names.map((n, i) => `${i + 1}. ${n}`), "",
    "[한 줄 소개]", c.oneLine, "",
    "[상세 본문]", c.body, "",
    ...c.sns.flatMap((s, i) => [`[SNS 문구 ${i + 1}]`, s, ""]),
  ].join("\n").trim();
}
