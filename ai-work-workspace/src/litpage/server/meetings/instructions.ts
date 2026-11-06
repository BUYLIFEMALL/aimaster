// AI Meeting Notes summary instructions: "Auto" (the default), built-in instructions by
// meeting type, and custom instruction pages (a page marked as AI meeting instructions — page ••• › Use with AI › Use
// as AI meeting instruction, or "+ Add custom instructions"). Each person keeps their own menu and default in
// user_settings.settings.meeting_instructions / meeting_default_instructions; a custom page is read with the
// summarizing person's permissions (no access → it falls back to Auto).
//
// The summary is shared with everyone who can open the meeting note, and the block's choice is client-writable (any
// editor sets it), so a custom page someone else chose is used only when that person AND everyone who can open the
// meeting note can read it — otherwise an editor could make another person's summary pull in a page only that person
// can read. The summarizer's own choice (their default, a key they send that isn't the block's, or the block's choice
// when they made it) needs only their own access: custom instructions are private by default and meant for shared
// meetings. Who chose the block's instructions is server-owned (format.meeting_instructions_by, set on every write).
import type { BlockRecord, CollectionRecord, SpaceRecord, UserSettingsRecord } from '#shared/records.ts';
import { getRecord } from '../db.ts';
import { blockRole, onBeforePersist } from '../records.ts';
import { mdSource } from '../ai/context.ts';
import { pageToMarkdown } from '../ai/prompts.ts';
import { MEETING_TYPES } from './model.ts';

export interface BuiltinInstructions {
  key: string;
  name: string;
  icon: string;
  prompt: string;
}

export const AUTO = 'auto';

const AUTO_PROMPT = `Pick the structure that fits the conversation. Usually:
### 할 일 — "- [ ] task @owner (when)" for every follow-up that was agreed
### 핵심 결론 — the decisions and conclusions
### 논의 내용 — short bullets per topic, in the order they came up
Skip a section when it would be empty.`;

export const BUILTINS: BuiltinInstructions[] = [
  { key: 'sales_call', name: '영업 미팅', icon: '💼', prompt: `Sections: ### 고객 상황 (company, people, current setup), ### 고객의 어려움, ### 요구 사항, ### 우려·반대 의견, ### 가격·일정, ### 다음 할 일 ("- [ ] …" with owners). Keep the customer's own words for important quotes.` },
  { key: 'standup', name: '데일리 스탠드업', icon: '🧍', prompt: `One section per person (### Name) with three bullets: 어제, 오늘, 막힌 점. End with ### 할 일 ("- [ ] …") for blockers that need follow-up.` },
  { key: 'team_meeting', name: '팀 회의', icon: '👥', prompt: `Sections: ### 진행 상황, ### 결정 사항, ### 남은 질문, ### 할 일 ("- [ ] task @owner"). Group updates by project.` },
  { key: 'one_on_one', name: '1:1 면담', icon: '🤝', prompt: `Sections: ### 잘한 점, ### 어려운 점, ### 피드백, ### 성장·진로, ### 할 일 ("- [ ] …" with owners). Keep the tone personal and supportive.` },
  { key: 'interview', name: '면접', icon: '🎙', prompt: `Sections: ### 지원자 배경, ### 강점, ### 우려 사항, ### 주요 답변 (question → answer summary), ### 추천 의견 (hire signal with reasons). Be factual; don't invent ratings.` },
  { key: 'brainstorm', name: '브레인스토밍', icon: '💡', prompt: `Sections: ### 아이디어 (grouped by theme, one bullet each), ### 가장 유망한 안, ### 남은 질문, ### 다음 할 일 ("- [ ] …").` },
  { key: 'lecture', name: '강의', icon: '🎓', prompt: `Sections: ### 핵심 개념 (with short explanations), ### 예시, ### 주요 용어, ### 복습 질문. Write it as study notes.` },
];

export function autoPrompt(): string {
  return AUTO_PROMPT;
}

export function userMeetingPrefs(userId: string): { pages: string[]; defaultKey: string; sttEngine: 'auto' | 'openai' } {
  const s = (getRecord<UserSettingsRecord>('user_settings', userId)?.settings ?? {}) as Record<string, unknown>;
  const pages = Array.isArray(s.meeting_instructions) ? (s.meeting_instructions as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 50) : [];
  const def = typeof s.meeting_default_instructions === 'string' ? s.meeting_default_instructions : AUTO;
  // 2026-11-06: 음성 파일 받아쓰기 엔진 선택(화면 설정 메뉴 savePref('meeting_stt_engine')) — 'openai'만 뜻이 있고 나머지는 자동(Gemini 우선)
  const sttEngine = s.meeting_stt_engine === 'openai' ? 'openai' : 'auto';
  return { pages, defaultKey: def, sttEngine };
}

export interface ResolvedInstructions {
  key: string;
  name: string;
  prompt: string;
  /** a custom page that the person can't read any more (shown as Auto) */
  unavailable?: boolean;
}

/** User ids in rich text / property values (person values, user mentions: ["u", id] annotations). */
function collectUserIds(v: unknown, out: Set<string>, depth = 0) {
  if (!Array.isArray(v) || depth > 6) return;
  if (v[0] === 'u' && typeof v[1] === 'string') out.add(v[1]);
  for (const x of v) collectUserIds(x, out, depth + 1);
}

/**
 * Can everyone who can open the meeting note also read `pageId`? People who may open it: the workspace's people,
 * everyone it is shared with up its page chain (guests included), people a database row it lives in names (page-level
 * access rules), and anyone with the link when it is shared to the web.
 */
export function readableByMeetingAudience(meeting: BlockRecord, pageId: string): boolean {
  if (blockRole(meeting.id, null) !== 'none' && blockRole(pageId, null) === 'none') return false;
  const people = new Set<string>();
  for (const p of getRecord<SpaceRecord>('space', meeting.space_id)?.permissions ?? []) if (p.user_id) people.add(p.user_id);
  let cur: BlockRecord | undefined = meeting;
  for (let i = 0; i < 200 && cur; i++) {
    for (const p of cur.permissions ?? []) if (p.user_id) people.add(p.user_id);
    if (cur.parent_table === 'collection') {
      if (cur.created_by_id) people.add(cur.created_by_id);
      collectUserIds(Object.values(cur.properties ?? {}), people);
      const col: CollectionRecord | undefined = getRecord<CollectionRecord>('collection', cur.parent_id);
      cur = col ? getRecord<BlockRecord>('block', col.parent_id) : undefined;
    } else if (cur.parent_table === 'block') cur = getRecord<BlockRecord>('block', cur.parent_id);
    else break;
  }
  if (people.size > 5000) return false;
  for (const u of people) if (blockRole(meeting.id, u) !== 'none' && blockRole(pageId, u) === 'none') return false;
  return true;
}

/** The instructions a summary uses: the block's choice, else the person's default, else Auto. */
export function resolveInstructions(block: BlockRecord, userId: string, override?: unknown): ResolvedInstructions {
  const fmt = (block.format ?? {}) as Record<string, unknown>;
  const onBlock = typeof fmt.meeting_instructions === 'string' ? fmt.meeting_instructions : '';
  // "Retry summary" sends the block's current choice along: that is still the block's (its chooser's) choice
  let chosen: string;
  let chooser: string | null;
  if (typeof override === 'string' && override && override !== onBlock) {
    chosen = override;
    chooser = userId;
  } else if (onBlock) {
    chosen = onBlock;
    chooser = typeof fmt.meeting_instructions_by === 'string' ? fmt.meeting_instructions_by : null;
  } else {
    chosen = userMeetingPrefs(userId).defaultKey;
    chooser = userId;
  }
  const auto: ResolvedInstructions = { key: AUTO, name: 'Auto', prompt: AUTO_PROMPT };
  if (!chosen || chosen === AUTO) return auto;
  const builtin = BUILTINS.find((b) => b.key === chosen);
  if (builtin) return { key: builtin.key, name: builtin.name, prompt: builtin.prompt };
  const page = getRecord<BlockRecord>('block', chosen);
  if (!page || page.alive === false || blockRole(chosen, userId) === 'none') return { ...auto, unavailable: true };
  // someone else's choice (or nobody known): they and the whole audience of the summary must be able to read it
  if (chooser !== userId && ((chooser && blockRole(chosen, chooser) === 'none') || !readableByMeetingAudience(block, chosen))) return { ...auto, unavailable: true };
  const md = pageToMarkdown(chosen, mdSource(userId), { maxChars: 8000 });
  return { key: chosen, name: md.title || 'Untitled', prompt: md.markdown };
}

// format.meeting_instructions_by: who made the block's current choice — the writer of the change, whatever the client
// sends (copies of a block count as the copier's choice)
onBeforePersist((changed, userId) => {
  for (const ch of changed.values()) {
    if (ch.table !== 'block') continue;
    const b = ch.record as BlockRecord;
    if (!MEETING_TYPES.has(b.type)) continue;
    const f = (b.format ?? {}) as Record<string, unknown>;
    const prev = getRecord<BlockRecord>('block', b.id);
    const pf = (prev?.format ?? {}) as Record<string, unknown>;
    const choice = typeof f.meeting_instructions === 'string' && f.meeting_instructions ? f.meeting_instructions : undefined;
    const by = !choice ? undefined : prev && choice === pf.meeting_instructions ? (pf.meeting_instructions_by as string | undefined) : userId;
    if (f.meeting_instructions_by === by) continue;
    const format = { ...f };
    if (by) format.meeting_instructions_by = by;
    else delete format.meeting_instructions_by;
    b.format = format as BlockRecord['format'];
  }
});

/** Template of "+ Add custom instructions" (a page the person edits). */
export const CUSTOM_TEMPLATE = `Use these instructions to shape your AI meeting summaries. Edit the sections, tone and length below.

## Sections
- Action items — who does what, by when
- Decisions
- Discussion highlights

## Tone
Concise and neutral. Use bullet points.

## Team context
Add names, projects or terms AI 비서 should know about.`;
