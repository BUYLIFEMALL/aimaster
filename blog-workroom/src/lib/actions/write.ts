import "server-only";
import { UserError } from "@/lib/errors";
import { generateJson } from "@/lib/ai";
import { aiConfig } from "@/lib/route";
import { joinSections, quoteInText } from "@/lib/logic";
import { SYS_JSON, outlinePrompt, reviewPrompt, sectionPrompt } from "@/lib/prompts";
import { createItem, getItem, updateItem } from "@/lib/store";
import { objArr, str, strArr } from "@/lib/util";
import type { BlogData, DraftData, FinalData, ResearchData, ReviewIssue } from "@/lib/types";
import { need, s, type Handler } from "./common";
import { createHash } from "node:crypto";

const hash = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);

const TYPES = ["정보형", "후기형", "비교형", "방법(how-to)형", "목록형"];
const LENGTHS = ["짧게(1500자 내외)", "보통(2500자 내외)", "길게(4000자 이상)"];
const EXPERIENCE = ["쓰지 않음", "확인 표시와 함께 사용"];

async function styleOf(userId: string, blogItemId: string | null) {
  return blogItemId ? (await getItem<BlogData>(userId, blogItemId, "blog"))?.data.style ?? null : null;
}

/** 승인된 자료로 제목 후보·소제목 구성 → 새 초안 */
export const outline: Handler = async ({ userId, body }) => {
  const research = await need<ResearchData>(userId, body.researchId, "research");
  if (!research.data.approved) throw new UserError(400, "글 작성 준비에서 사전 자료를 먼저 승인해 주세요.");
  const o = body.options as Record<string, unknown> | undefined;
  const options = { type: TYPES.find((x) => x === o?.type) ?? TYPES[0], length: LENGTHS.find((x) => x === o?.length) ?? LENGTHS[1], experience: EXPERIENCE.find((x) => x === o?.experience) ?? EXPERIENCE[0], request: s(o?.request, 500) };
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("네이버 블로그 글 기획자"), prompt: outlinePrompt(research.data, await styleOf(userId, research.data.blogItemId), options), maxTokens: 4000 });
  const titles = strArr(r.titles, 3, 80);
  const sections = objArr(r.sections, 9).map((x) => ({ heading: str(x.heading, 80), goal: str(x.goal, 200), body: "" }));
  if (!titles.length || sections.length < 2) throw new UserError(502, "글 구성을 만들지 못했습니다. 다시 시도해 주세요.");
  const data: DraftData = { researchId: research.id, blogItemId: research.data.blogItemId, keyword: research.data.query, options, title: titles[0], titles, sections, text: "", review: null, status: "outline" };
  return createItem(userId, "draft", titles[0], data, research.id);
};

/** 구간 하나 쓰기(화면이 순서대로 호출 — 중지해도 쓴 구간은 저장됨) */
export const section: Handler = async ({ userId, body }) => {
  const draft = await need<DraftData>(userId, body.id, "draft");
  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= draft.data.sections.length) throw new UserError(400, "작성할 구간을 확인해 주세요.");
  const research = await getItem<ResearchData>(userId, draft.data.researchId, "research");
  if (!research?.data.approved) throw new UserError(400, "연결된 사전 자료가 승인 상태가 아닙니다. 글 작성 준비에서 다시 승인해 주세요.");
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("네이버 블로그 작가"), prompt: sectionPrompt(research.data, await styleOf(userId, draft.data.blogItemId), draft.data.options, draft.data.title, draft.data.sections, index), maxTokens: 6000 });
  const text = str(r.body, 6000).replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
  if (text.length < 50) throw new UserError(502, "본문이 충분히 만들어지지 않았습니다. 이 구간을 다시 시도해 주세요.");
  // 저장 직전 최신 상태를 다시 읽어 다른 구간 수정분을 덮어쓰지 않는다
  const latest = await need<DraftData>(userId, draft.id, "draft");
  const sections = latest.data.sections.map((sec, i) => (i === index ? { ...sec, body: text } : sec));
  const done = sections.every((x) => x.body.trim());
  return updateItem(userId, draft.id, { data: { ...latest.data, sections, text: done ? joinSections(latest.data.title, sections) : latest.data.text, status: done ? "written" : "writing", review: null } });
};

/** 최종 검수: 지적한 문장이 실제 본문에 없으면 버린다 */
export const review: Handler = async ({ userId, body }) => {
  const draft = await need<DraftData>(userId, body.id, "draft");
  if (!draft.data.text.trim()) throw new UserError(400, "모든 구간이 작성된 초안을 선택해 주세요.");
  const research = await getItem<ResearchData>(userId, draft.data.researchId, "research");
  const ai = await aiConfig(userId);
  const r = await generateJson(ai, { system: SYS_JSON("블로그 글 검수 편집자"), prompt: reviewPrompt(draft.data.title, draft.data.text, await styleOf(userId, draft.data.blogItemId), research?.data.points.filter((p) => p.kept).map((p) => p.text) ?? []), maxTokens: 8000 });
  const latest = await need<DraftData>(userId, draft.id, "draft");
  if (latest.data.text !== draft.data.text) throw new UserError(409, "검수 도중 글이 바뀌어 결과를 적용하지 않았습니다. 다시 검수해 주세요.");
  const issues: ReviewIssue[] = objArr(r.issues, 40).map((x) => ({ area: str(x.area, 30), level: (x.level === "필수" ? "필수" : "권장") as ReviewIssue["level"], quote: str(x.quote, 200), reason: str(x.reason, 400), suggestion: str(x.suggestion, 600) }))
    .filter((x) => x.quote && quoteInText(x.quote, latest.data.text));
  return updateItem(userId, draft.id, { data: { ...latest.data, review: { issues, summary: str(r.summary, 800), at: new Date().toISOString(), textHash: hash(latest.data.text) }, status: "reviewed" } });
};

/** 최종본 저장: 검수 후 글이 바뀌지 않았고 필수 수정이 남지 않았을 때만 */
export const finalize: Handler = async ({ userId, body }) => {
  const draft = await need<DraftData>(userId, body.id, "draft");
  const rv = draft.data.review;
  if (!rv || rv.textHash !== hash(draft.data.text)) throw new UserError(400, "현재 수정본을 다시 검수한 뒤 저장해 주세요.");
  if (rv.issues.some((x) => x.level === "필수")) throw new UserError(400, "필수 수정 사항을 해결하고 다시 검수한 후 최종본으로 저장해 주세요.");
  if (body.confirmed !== true) throw new UserError(400, "글·출처·검수 결과 확인란을 선택해 주세요.");
  const data: FinalData = { draftId: draft.id, title: draft.data.title, text: draft.data.text, at: new Date().toISOString() };
  return createItem(userId, "final", draft.data.title, data, draft.id);
};
