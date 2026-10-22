// v1.10 다른 프로그램(AI 쇼츠 원스톱)이 넘긴 대본(주소 # 뒤)을 로그인 화면을 거쳐도 잃지 않게 — 이 탭 저장소(sessionStorage)에 잠깐 보관
// 원스톱 src/lib/refHandoff.ts와 같은 방식(넘기기 형식은 공용 reference-copy-guard 사본 src/lib/reference.ts)
import { readRefHandoff, readRefHandoffFrom } from "./reference";

const KEY = "thumbnail-ref-handoff";

export type RefHandoff = { text: string; from: string };

/** 로그인 화면: 주소 # 뒤에 대본이 있으면 보관(있었으면 true) */
export function stashRefHandoff(hash: string): boolean {
  const text = readRefHandoff(hash);
  if (!text) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ text, from: readRefHandoffFrom(hash) }));
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 이 경우 대본은 넘어가지 않음 */
  }
  return true;
}

/** 로그인 직후 SEO 전략 화면으로 보낼지 */
export function hasStashedRefHandoff(): boolean {
  try {
    return !!sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** SEO 전략 화면: 주소 # 뒤 대본을 먼저, 없으면 보관한 대본 — 꺼낸 보관분은 바로 지움 */
export function takeRefHandoff(hash: string): RefHandoff {
  let stored = "";
  try {
    stored = sessionStorage.getItem(KEY) ?? "";
    sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
  const text = readRefHandoff(hash);
  if (text) return { text, from: readRefHandoffFrom(hash) };
  try {
    const v = JSON.parse(stored) as Partial<RefHandoff>;
    if (typeof v?.text === "string") return { text: v.text, from: typeof v.from === "string" ? v.from : "" };
  } catch {
    /* 보관분 없음 */
  }
  return { text: "", from: "" };
}
