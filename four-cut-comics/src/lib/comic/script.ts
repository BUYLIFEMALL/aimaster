import { NO_SPEAKER, THOUGHT_SPEAKER, isPanelCount } from "./options";

// 대본 데이터 타입과 순수 함수(서버·클라이언트 공용, 테스트 대상).

export interface Character { name: string; description: string }
export interface Panel { panel: number; character: string; description: string; dialogue: string }
export interface Script { characters: Character[]; panels: Panel[] }

export const PANEL_COUNT = 4;
export const MAX_TOPIC = 2000;
export const MAX_FIELD = 1200;

function clip(v: unknown, max = MAX_FIELD): string {
  return String(v ?? "").replace(/\u0000/g, "").slice(0, max);
}

/** 모델 응답 문자열에서 JSON 객체를 꺼낸다(코드펜스·앞뒤 설명 허용). 실패하면 null. */
export function extractJson(text: string): unknown {
  const candidates: string[] = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidates.push(fence[1]);
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a !== -1 && b > a) candidates.push(text.slice(a, b + 1));
  for (const c of candidates) {
    try { return JSON.parse(c.trim()); } catch { /* 다음 후보 */ }
  }
  return null;
}

/** 대본 JSON 검증·정규화. 컷이 정확히 count개(3·4·6 중)가 아니면 null. */
export function normalizeScript(raw: unknown, count: number = PANEL_COUNT): Script | null {
  if (!isPanelCount(count)) return null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { characters?: unknown; panels?: unknown };
  if (!Array.isArray(r.characters) || !Array.isArray(r.panels) || r.panels.length !== count) return null;
  const characters = r.characters.slice(0, 4).map((c) => {
    const o = (c ?? {}) as Record<string, unknown>;
    return { name: clip(o.name, 40).trim(), description: clip(o.description) };
  }).filter((c) => c.name);
  if (characters.length === 0) return null;
  const panels = r.panels.map((p, i) => {
    const o = (p ?? {}) as Record<string, unknown>;
    return {
      panel: i + 1,
      character: clip(o.character, 40).trim() || NO_SPEAKER,
      description: clip(o.description),
      dialogue: clip(o.dialogue),
    };
  });
  return { characters, panels };
}

export function normalizeIdeas(raw: unknown): string[] | null {
  if (!raw || typeof raw !== "object") return null;
  const ideas = (raw as { ideas?: unknown }).ideas;
  if (!Array.isArray(ideas)) return null;
  const out = ideas.map((x) => clip(x, 200).trim()).filter(Boolean).slice(0, 5);
  return out.length ? out : null;
}

/** 등장인물 이름을 바꿀 때 컷의 화자와 대사 속 이름도 함께 바꾼다. 빈 이름·중복 이름은 거부(null). */
export function renameCharacter(script: Script, index: number, nextName: string): Script | null {
  const name = nextName.trim();
  const cur = script.characters[index];
  if (!cur || !name || name === cur.name || name.length > 40) return null;
  if (script.characters.some((c, i) => i !== index && c.name === name)) return null;
  if (name === NO_SPEAKER || name === THOUGHT_SPEAKER) return null;
  const characters = script.characters.map((c, i) => (i === index ? { ...c, name } : c));
  const panels = script.panels.map((p) => ({
    ...p,
    character: p.character === cur.name ? name : p.character,
    dialogue: p.dialogue.split(cur.name).join(name),
  }));
  return { characters, panels };
}

/** 컷에 실제 말이 있는지(없으면 그림만 저장) */
export function hasDialogue(p: Pick<Panel, "dialogue">): boolean {
  return p.dialogue.trim().length > 0;
}

/** 화자 표시가 필요한 컷인지(없음·생각은 이름을 붙이지 않는다) */
export function showsSpeaker(p: Pick<Panel, "character">): boolean {
  return !!p.character && p.character !== NO_SPEAKER && p.character !== THOUGHT_SPEAKER;
}

/** 대사 한 줄 문자열(화자 이름 접두어 포함 여부) */
export function lineFor(p: Panel): string {
  return showsSpeaker(p) ? `${p.character}: ${p.dialogue.trim()}` : p.dialogue.trim();
}

/** 캔버스 너비에 맞춘 줄바꿈. 공백 단위로 채우고, 한 단어가 너무 길면 글자 단위로 자른다. */
export function wrapText(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(" ")) {
      const cand = cur ? `${cur} ${word}` : word;
      if (measure(cand) <= maxWidth) { cur = cand; continue; }
      if (cur) lines.push(cur);
      if (measure(word) <= maxWidth) { cur = word; continue; }
      cur = "";
      for (const ch of word) {
        if (cur && measure(cur + ch) > maxWidth) { lines.push(cur); cur = ch; } else cur += ch;
      }
    }
    lines.push(cur);
  }
  return lines;
}
