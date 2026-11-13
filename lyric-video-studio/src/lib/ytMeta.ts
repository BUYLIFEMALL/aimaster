// v1.14 유튜브 제목·설명 AI 제안 — 프롬프트 만들기와 응답 해석(순수 함수, 시험 tests/ytMeta.test.ts). 호출은 서버 src/lib/llm.ts.
// 프롬프트는 가사 영상용으로 새로 썼다(다른 프로그램 프롬프트를 옮기지 않음).

export interface YtMetaInput { title: string; artist: string; lyrics: string; portrait: boolean }
export interface YtMeta { titles: string[]; description: string; hashtags: string[] }

/** 가사 앞부분만 보낸다(회원 키 비용을 줄이고, 분위기를 알기에는 충분) */
export const LYRICS_LIMIT = 1200;

export function buildYtMetaPrompt(input: YtMetaInput, year = new Date().getFullYear()): { system: string; user: string } {
  const system = [
    "당신은 유튜브 음악 채널의 가사 영상(리릭 비디오) 제목과 설명을 쓰는 편집자입니다.",
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 연도를 쓸 때는 반드시 ${year}년을 기준으로 하고, 과거 연도를 현재처럼 쓰지 마세요.]`,
    "규칙:",
    "- 한국어로 씁니다(곡 제목·가수 이름은 받은 그대로 둡니다).",
    "- 제목 후보는 정확히 3개, 각 60자 이내. 곡 제목과 가수 이름을 넣고 「가사」 또는 「Lyrics」를 포함합니다. 과장·낚시 표현, 사실이 아닌 수식어(공식·1위·최초 등)는 쓰지 않습니다.",
    input.portrait ? "- 세로 쇼츠 영상입니다. 제목은 짧게 쓰고 해시태그에 #Shorts를 넣습니다." : "- 가로 영상입니다.",
    "- 설명은 2~4문장으로 곡의 분위기와 듣기 좋은 상황을 담습니다. 가사 전문을 옮기지 않습니다. 받은 정보에 없는 사실(발매일·앨범·수상 등)을 지어내지 않습니다.",
    "- 해시태그는 정확히 5개, 각각 #으로 시작하고 띄어쓰기가 없습니다.",
    '- 다른 말 없이 JSON만 출력합니다: {"titles":["","",""],"description":"","hashtags":["","","","",""]}',
  ].join("\n");
  const user = [
    `곡 제목: ${input.title.trim() || "(제목 없음)"}`,
    `가수: ${input.artist.trim() || "(알 수 없음)"}`,
    "가사 앞부분:",
    input.lyrics.trim().slice(0, LYRICS_LIMIT) || "(가사 없음 — 연주곡)",
  ].join("\n");
  return { system, user };
}

/** AI 응답(코드 울타리·앞뒤 말 포함 가능)에서 결과를 꺼낸다. 쓸 수 없으면 null */
export function parseYtMeta(text: string): YtMeta | null {
  const s = String(text ?? ""), a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let v: unknown;
  try { v = JSON.parse(s.slice(a, b + 1)); } catch { return null; }
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const strs = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string").map((i) => i.replace(/\s+/g, " ").trim()).filter(Boolean) : []);
  const titles = strs(o.titles).map((t) => t.slice(0, 100)).slice(0, 3);
  const description = typeof o.description === "string" ? o.description.trim().slice(0, 1500) : "";
  const hashtags = Array.from(new Set(strs(o.hashtags).map((h) => `#${h.replace(/^#+/, "").replace(/\s+/g, "")}`).filter((h) => h.length > 1 && h.length <= 40))).slice(0, 5);
  if (!titles.length || !description) return null;
  return { titles, description, hashtags };
}
