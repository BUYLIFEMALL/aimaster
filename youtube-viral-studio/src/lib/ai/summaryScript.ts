// v1.23 「영상 요약」이 쇼츠를 직접 볼 때 받는 실제 대사 절 — 프롬프트(prompts.ts)와 결과 화면(AiPanels)이 같은 이름을 쓴다

/** 대사를 받는 최대 영상 길이(초) — 긴 영상은 대사가 길어 비용이 커지므로 제외 */
export const SUMMARY_SCRIPT_MAX_SEC = 180;
export const SUMMARY_SCRIPT_HEADING = "## 영상 대사(받아쓰기)";

/** 요약 글에서 대사 절만 꺼낸다(없거나 「없음」이면 빈 문자열) */
export function summaryScriptOf(markdown: string): string {
  const at = markdown.indexOf(SUMMARY_SCRIPT_HEADING);
  if (at < 0) return "";
  const rest = markdown.slice(at + SUMMARY_SCRIPT_HEADING.length);
  const next = rest.search(/\n#{1,6} /);
  const body = plainScript((next < 0 ? rest : rest.slice(0, next)).trim());
  return /^[(（]?없음[)）]?\.?$/.test(body) ? "" : body.slice(0, 12000);
}

/** v1.24 줄 앞 목록 기호(- · * · •)와 굵게 표시(** · __)만 걷어 낸다 — 화자 이름(「진행자:」)과 대사는 그대로 */
export function plainScript(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s+/, "").replace(/\*\*|__/g, "").trimEnd())
    .join("\n")
    .trim();
}
