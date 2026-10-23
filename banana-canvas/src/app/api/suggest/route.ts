import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { isOwnPath } from "@/lib/bnc/paths";
import { SUGGEST_DISH_PROMPT, SUGGEST_STORY_PROMPT, suggestEditPrompt, suggestGeneratePrompt, suggestSynthesisPrompt } from "@/lib/bnc/prompts";
import { processById, styleById } from "@/lib/bnc/styles";
import { ASPECTS, type Aspect, type AspectOrOriginal } from "@/lib/bnc/types";
import { textModel, type Part } from "@/lib/gemini";
import { download, isBackgroundEmpty } from "@/lib/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

const mimeOf = (path: string) => (path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg");

/** 프롬프트·아이디어·요리명 제안(텍스트 모델). 이미지는 서버가 Storage에서 읽는다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const { userId, apiKey, body: b } = g;
  const type = b.type;
  const text = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

  async function img(path: unknown): Promise<Part | null> {
    if (!isOwnPath(userId, path)) return null;
    const bytes = await download(path);
    return bytes ? { image: { mime: mimeOf(path), data: bytes } } : null;
  }

  try {
    if (type === "generate") {
      const idea = text(b.prompt, 600);
      if (!idea) return json({ error: "먼저 아이디어를 입력해 주세요." }, 400);
      return json({ text: await textModel(apiKey, [{ text: suggestGeneratePrompt(idea, text(b.category, 20)) }], { temperature: 0.8 }) });
    }
    if (type === "edit") {
      const base = await img(b.base);
      if (!base) return json({ error: "원본 이미지를 찾을 수 없습니다. 다시 올려 주세요." }, 400);
      const procs = (Array.isArray(b.processes) ? b.processes : []).map((x) => processById(String(x))).filter((x): x is NonNullable<typeof x> => !!x && x.id !== "upscale");
      const style = typeof b.style === "string" ? styleById(b.style) : undefined;
      const bg = await isBackgroundEmpty(base.image!.data);
      const prompt = suggestEditPrompt({ processes: procs.map((x) => x.name), style: style?.name ?? null, custom: text(b.prompt, 600), bgEmpty: bg, styleId: style?.id });
      return json({ text: await textModel(apiKey, [base, { text: prompt }], { temperature: 0.8 }) });
    }
    if (type === "synthesis") {
      const base = await img(b.base);
      if (!base) return json({ error: "원본 이미지를 찾을 수 없습니다. 다시 올려 주세요." }, 400);
      const srcPaths = Array.isArray(b.sources) ? b.sources.slice(0, 5) : [];
      const parts: Part[] = [base];
      for (const s of srcPaths) { const p = await img(s); if (p) parts.push(p); }
      if (parts.length < 2) return json({ error: "합성 소스 이미지를 먼저 추가해 주세요." }, 400);
      const aspect: AspectOrOriginal = b.aspect === "original" ? "original" : ASPECTS.includes(b.aspect as Aspect) ? (b.aspect as Aspect) : "original";
      const bg = await isBackgroundEmpty(base.image!.data);
      const notes = (Array.isArray(b.sourceNotes) ? b.sourceNotes : []).slice(0, parts.length - 1).map((n) => text(n, 300));
      // 소스별 지시·배경 선택을 제안에도 반영(포토 리메이크에서 옮김, v1.12)
      const prefs = notes.some(Boolean) ? `\n\n[PER-SOURCE PREFERENCES] Mention each source by order (첫 번째 소스, 두 번째 소스...) and respect these preferences: ${notes.map((n, i) => `${i + 1}: ${n || "미지정"}`).join(" / ")}` : "";
      const bgPref = b.background === "keep" ? "\n[BACKGROUND PREFERENCE] Keep the original background; never suggest a different place."
        : b.background === "change" ? "\n[BACKGROUND PREFERENCE] Suggest a suitable new background." : "";
      parts.push({ text: suggestSynthesisPrompt(bg, aspect) + prefs + bgPref });
      return json({ text: await textModel(apiKey, parts, { temperature: 0.7 }) });
    }
    if (type === "story" || type === "recipe") {
      const base = await img(b.base);
      if (!base) return json({ error: "먼저 원본 이미지를 올려 주세요." }, 400);
      return json({ text: await textModel(apiKey, [base, { text: type === "story" ? SUGGEST_STORY_PROMPT : SUGGEST_DISH_PROMPT }], { temperature: type === "story" ? 0.8 : 0.2 }) });
    }
    return json({ error: "제안 종류가 올바르지 않습니다." }, 400);
  } catch (e) { return fail(e); }
}
