// v1.56 광고 고지·AI 제작 표기·게시 전 확인(메이커 v0.3.3 후속 M3-①). 순수 함수 — 렌더(scene.ts)·업로드(browserUpload.ts)·화면이 같이 쓴다.
// 문구는 공정위 「추천·보증 등에 관한 표시·광고 심사지침」을 기준으로 우리가 새로 썼다(외부 프로그램 문구·화면을 옮기지 않음).
// 쿠팡 파트너스 설명란 문장은 쿠팡 파트너스가 회원에게 요구하는 고지 문장 형식을 따른다.
import type { ShortsScript, Voice } from "./script";

export const AD_KINDS = {
  off: { label: "광고 아님", band: "", desc: "" },
  coupang: { label: "쿠팡 파트너스", band: "광고 · 쿠팡 파트너스 활동으로 수수료를 받습니다", desc: "[광고] 이 영상은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." },
  affiliate: { label: "제휴 링크 수수료", band: "광고 · 링크로 구매하면 수수료를 받습니다", desc: "[광고] 이 영상의 링크로 구매하시면 판매처로부터 일정액의 수수료를 받을 수 있습니다." },
  sponsored: { label: "협찬·제품 제공", band: "광고 · 제품을 제공받아 만든 영상입니다", desc: "[광고] 이 영상은 업체로부터 제품(또는 대가)을 제공받아 만들었습니다." },
  custom: { label: "직접 입력", band: "", desc: "" },
} as const;
export type AdKind = keyof typeof AD_KINDS;
export const CUSTOM_MAX = 40;

/** 게시 전 확인 4가지 — 모두 체크해야 유튜브에 올릴 수 있다 */
export const CHECKS = {
  facts: "가격·효능·후기 등 영상 속 사실을 상품 정보와 대조했습니다",
  rights: "사진·영상·음악을 쓸 권리가 있습니다",
  ai: "AI로 만든 부분(대본·음성·이미지)을 숨기지 않았습니다",
  ad: "광고·제휴·협찬이면 광고 표시를 켰습니다",
} as const;
export type CheckKey = keyof typeof CHECKS;
export const CHECK_KEYS = Object.keys(CHECKS) as CheckKey[];

export interface Disclosure { ad: AdKind; custom?: string; aiMark: boolean; checked?: Partial<Record<CheckKey, boolean>> }

const isKind = (v: unknown): v is AdKind => typeof v === "string" && v in AD_KINDS;

/** 쿠팡 주소(쿠팡·쿠팡 파트너스 단축 링크)인가 */
export function isCoupangUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try { const h = new URL(url).hostname.toLowerCase(); return h === "coupa.ng" || h === "coupang.com" || h.endsWith(".coupang.com"); } catch { return false; }
}

/** 처음 값: 상품 주소가 쿠팡이면 쿠팡 파트너스, 다른 상품 주소면 제휴 링크, 없으면 광고 아님. AI 표기는 켬 */
export function defaultDisclosure(s: ShortsScript): Disclosure {
  const url = s.product?.url;
  return { ad: isCoupangUrl(url) ? "coupang" : url ? "affiliate" : "off", aiMark: true };
}

/** 저장된 값을 읽는다(없으면 처음 값). 직접 입력이 비어 있으면 광고 아님으로 보지 않고 그대로 두되 문구는 기본 「광고」 */
export function normalizeDisclosure(s: ShortsScript): Disclosure {
  const d = s.disclosure;
  if (!d || !isKind(d.ad)) return { ...defaultDisclosure(s), checked: d?.checked };
  return {
    ad: d.ad, custom: typeof d.custom === "string" ? d.custom.replace(/[<>]/g, "").slice(0, CUSTOM_MAX) : undefined,
    aiMark: d.aiMark !== false,
    checked: d.checked && typeof d.checked === "object" ? Object.fromEntries(CHECK_KEYS.map((k) => [k, d.checked?.[k] === true])) : undefined,
  };
}

/** AI 음성(유료 TTS·무료 음성)을 쓴 장면이 있으면 AI 표기를 끄지 못한다(무료 음성 OpenRAIL-M 조건 포함) */
export function usesAiVoice(s: ShortsScript): boolean {
  // script.ts sceneVoices와 같은 기준(음성이 지금 내레이션과 같고 길이가 있을 때만) — 시험에서 바로 읽히도록 형식만 가져온다
  const all: { text: string; voice?: Voice }[] = [{ text: s.intro.narration, voice: s.intro.voice }, ...s.cards.map((c) => ({ text: c.narration, voice: c.voice })), { text: s.outro.narration, voice: s.outro.voice }];
  return all.some((x) => !!x.voice && x.voice.text === x.text && x.voice.dur > 0);
}
export const aiMarkLocked = usesAiVoice;
export function aiMarkOn(s: ShortsScript): boolean { return normalizeDisclosure(s).aiMark || aiMarkLocked(s); }

/** 영상 위쪽 띠 문구(광고 고지). 광고 아님이면 "" */
export function adBand(s: ShortsScript): string {
  const d = normalizeDisclosure(s);
  if (d.ad === "custom") return `광고 · ${(d.custom ?? "").trim() || "유료 광고 포함"}`;
  return AD_KINDS[d.ad].band;
}
/** 띠 아래 작은 AI 표기. 끄면 "" */
export function aiBand(s: ShortsScript): string {
  if (!aiMarkOn(s)) return "";
  return usesAiVoice(s) ? "AI로 만든 영상 · AI 음성" : "AI로 만든 영상";
}

/** 유튜브 설명란 맨 첫 줄(광고 고지). 광고 아님이면 "" */
export function adDescLine(s: ShortsScript): string {
  const d = normalizeDisclosure(s);
  if (d.ad === "custom") return `[광고] ${(d.custom ?? "").trim() || "이 영상에는 유료 광고가 포함되어 있습니다."}`;
  return AD_KINDS[d.ad].desc;
}
/** 설명란 AI 표기 한 줄 */
export function aiDescLine(s: ShortsScript): string {
  if (!aiMarkOn(s)) return "";
  return usesAiVoice(s) ? "🤖 이 영상은 AI 도구로 대본·장면·음성을 만들었습니다." : "🤖 이 영상은 AI 도구로 대본·장면을 만들었습니다.";
}

/** 설명란이 광고 고지 문장으로 시작하지 않으면 맨 앞에 붙인다(회원이 설명란을 고쳐도 고지는 첫 줄에 남게) */
export function ensureAdLead(description: string, s: ShortsScript): string {
  const lead = adDescLine(s);
  if (!lead) return description;
  const body = description.split(lead).join("").replace(/\n{3,}/g, "\n\n").trim();
  return [lead, body].filter(Boolean).join("\n\n").slice(0, 5000);
}

export function allChecked(s: ShortsScript): boolean {
  const c = normalizeDisclosure(s).checked;
  return CHECK_KEYS.every((k) => c?.[k] === true);
}
