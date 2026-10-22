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

// v1.11 「SEO 전략」 대본 → 「썸네일 제작」 참고 문서(A/B 문구를 만들 때 AI가 함께 읽음) — 새 프로젝트 하나에만 1회 전달
const DOC_KEY = (projectId: string) => `thumbnail-seo-doc:${projectId}`;

export type SeoDoc = { name: string; text: string };

export function stashSeoDoc(projectId: string, doc: SeoDoc): void {
  if (!doc.text.trim()) return;
  try {
    sessionStorage.setItem(DOC_KEY(projectId), JSON.stringify(doc));
  } catch {
    /* 저장소를 못 쓰면 참고 문서 없이 진행 */
  }
}

/** 썸네일 제작 화면: 이 프로젝트로 보관된 대본(꺼내면 지움) */
export function takeSeoDoc(projectId: string): SeoDoc | null {
  try {
    const raw = sessionStorage.getItem(DOC_KEY(projectId));
    if (!raw) return null;
    sessionStorage.removeItem(DOC_KEY(projectId));
    const v = JSON.parse(raw) as Partial<SeoDoc>;
    return typeof v?.text === "string" && v.text.trim() ? { name: typeof v.name === "string" ? v.name : "SEO 전략 대본", text: v.text } : null;
  } catch {
    return null;
  }
}
