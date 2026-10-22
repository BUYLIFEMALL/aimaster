// v1.33 다른 프로그램이 넘긴 레퍼런스 대사(주소 # 뒤)를 로그인 화면을 거쳐도 잃지 않게 — 이 탭 저장소(sessionStorage)에 잠깐 보관
import { readRefHandoff } from "./reference";

const KEY = "onestop-ref-handoff";

/** 로그인 화면: 주소 # 뒤에 대사가 있으면 보관(있었으면 true) */
export function stashRefHandoff(hash: string): boolean {
  const text = readRefHandoff(hash);
  if (!text) return false;
  try {
    sessionStorage.setItem(KEY, text);
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

/** 주제 화면: 주소 # 뒤 대사를 먼저, 없으면 보관한 대사 — 꺼낸 보관분은 바로 지움 */
export function takeRefHandoff(hash: string): string {
  let stored = "";
  try {
    stored = sessionStorage.getItem(KEY) ?? "";
    sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
  return readRefHandoff(hash) || stored;
}
