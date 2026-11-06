// 웹 화면 → ncr_dispatch 로 가는 요청의 입력 검사(서버 함수도 다시 검사하지만, 잘못된 요청은 여기서 먼저 막는다).
// 웹에서 넣는 대상은 「B. 아는 사람」만이다. 「A. 카페 활동 회원」은 회원 PC 확장이 회원 로그인 세션에서 모아 따로 넣는다.
export type Payload = Record<string, unknown>;
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const minute = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < 1440;
export const NAVER_ID = /^[a-z0-9_-]{3,30}$/;

/** 붙여 넣은 글(줄바꿈·쉼표·공백 구분)에서 네이버 아이디만 골라낸다. 블로그 주소·@가 붙어 있어도 아이디만 남긴다. */
export function parseNaverIds(text: string): { ids: string[]; invalid: string[] } {
  const ids: string[] = [], invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    if (!raw) continue;
    const m = /(?:blog\.naver\.com\/|m\.blog\.naver\.com\/)([A-Za-z0-9_-]+)/.exec(raw);
    const id = (m ? m[1] : raw.replace(/^@/, "").replace(/@naver\.com$/i, "")).toLowerCase();
    if (NAVER_ID.test(id)) { if (!ids.includes(id)) ids.push(id); } else invalid.push(raw);
  }
  return { ids: ids.slice(0, 200), invalid };
}

export const OPERATIONS: Record<string, (p: Payload) => boolean> = {
  settings_get: p => Object.keys(p).length === 0,
  settings_save: p => Object.keys(p).every(k => ["mode_known", "mode_promo", "mode_extract", "consent", "daily_cap", "active_start_minute", "active_end_minute"].includes(k))
    && ["mode_known", "mode_promo", "mode_extract"].every(k => typeof p[k] === "boolean")
    && (p.consent === undefined || typeof p.consent === "boolean")
    && Number.isInteger(p.daily_cap) && Number(p.daily_cap) >= 1 && Number(p.daily_cap) <= 25
    && minute(p.active_start_minute) && minute(p.active_end_minute),
  targets_add: p => Object.keys(p).every(k => ["source_mode", "rows"].includes(k)) && p.source_mode === "known" && Array.isArray(p.rows) && p.rows.length >= 1 && p.rows.length <= 200
    && p.rows.every(r => !!r && typeof r === "object" && Object.keys(r).every(k => k === "naver_id") && NAVER_ID.test(String((r as Payload).naver_id))),
  targets_list: p => Object.keys(p).length === 0,
  target_review: p => Object.keys(p).length === 1 && uuid(p.id),
  target_skip: p => Object.keys(p).length === 1 && uuid(p.id),
  targets_review_all: p => Object.keys(p).length === 0,
  sent_list: p => Object.keys(p).length === 0,
  // 모드 A-1(2026-11-06): 카페 활동 회원 명단 보기 · 내 카페 초대링크 저장 → ncr_member_dispatch
  members_list: p => Object.keys(p).length === 0,
  invite_link_save: p => Object.keys(p).length === 1 && typeof p.invite_link === "string"
    && (p.invite_link === "" || INVITE_LINK.test(p.invite_link)),
};

export const INVITE_LINK = /^https:\/\/(cafe\.naver\.com|naver\.me|m\.cafe\.naver\.com)\/\S{0,280}$/;
/** 명단·초대링크 작업은 새 함수(ncr_member_dispatch)로, 나머지는 기존 ncr_dispatch로. */
export const MEMBER_OPERATIONS = new Set(["members_add", "members_list", "invite_link_save"]);
export const rpcFor = (operation: string) => (MEMBER_OPERATIONS.has(operation) ? "ncr_member_dispatch" : "ncr_dispatch");

const MESSAGES: Record<string, [number, string]> = {
  NCR_EXTRACT_CONSENT_REQUIRED: [409, "「카페 활동 회원」 방식을 켜려면 책임 고지에 동의해 주세요."],
  NCR_EXTRACT_NOT_ENABLED: [409, "「카페 활동 회원」 방식이 꺼져 있습니다."],
  NCR_MODE_OFF: [409, "「아는 사람」 방식이 꺼져 있습니다. 설정에서 켜 주세요."],
  NCR_NOT_FOUND: [404, "대상을 찾지 못했습니다. 목록을 다시 불러와 주세요."],
  NCR_INPUT: [400, "입력값을 확인해 주세요."],
};
export function errorReply(message: string | undefined): [number, string] {
  const code = Object.keys(MESSAGES).find(k => message?.includes(k));
  return code ? MESSAGES[code] : [503, "저장 상태를 확인하지 못했습니다. 자동으로 다시 요청하지 않습니다. 목록을 다시 불러와 주세요."];
}
