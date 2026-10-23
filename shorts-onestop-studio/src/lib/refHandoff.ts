// v1.33 다른 프로그램이 넘긴 레퍼런스 대사(주소 # 뒤)를 로그인 화면을 거쳐도 잃지 않게 — 이 탭 저장소(sessionStorage)에 잠깐 보관
// v1.34 보낸 프로그램 이름도 함께 보관
import { readRefHandoff, readRefHandoffFrom } from "./reference";

const KEY = "onestop-ref-handoff";

export type RefHandoff = { text: string; from: string };

/** 로그인 화면: 주소 # 뒤에 대사가 있으면 보관(있었으면 true) */
export function stashRefHandoff(hash: string): boolean {
  const text = readRefHandoff(hash);
  if (!text) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ text, from: readRefHandoffFrom(hash) }));
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 이 경우 대사는 넘어가지 않음 */
  }
  return true;
}

/** 로그인 직후 주제 화면으로 보낼지 */
export function hasStashedRefHandoff(): boolean {
  try {
    return !!sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

function parseStored(raw: string): RefHandoff {
  try {
    const v = JSON.parse(raw) as Partial<RefHandoff>;
    if (typeof v?.text === "string") return { text: v.text, from: typeof v.from === "string" ? v.from : "" };
  } catch {
    /* v1.33 때 보관한 글자 그대로의 대사 */
  }
  return { text: raw, from: "" };
}

/** 주제 화면: 주소 # 뒤 대사를 먼저, 없으면 보관한 대사 — 꺼낸 보관분은 바로 지움 */
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
  return stored ? parseStored(stored) : { text: "", from: "" };
}
