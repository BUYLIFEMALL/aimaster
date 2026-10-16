import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { visualsPrompt } from "@/lib/prompts";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/script";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 장면별 스톡 검색어·AI 이미지 묘사를 한 번에(텍스트 모델 1회, 회원 본인 키)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const topic = String(g.body.topic ?? "").slice(0, 120);
    const scenes = (Array.isArray(g.body.scenes) ? g.body.scenes : []).map((s) => String(s ?? "").slice(0, 300)).filter(Boolean).slice(0, 10);
    if (!topic || scenes.length < 2) throw new UserError(400, "대본을 먼저 불러와 주세요.");
    const styleKey = (String(g.body.style ?? "photo") in IMAGE_STYLES ? String(g.body.style) : "photo") as ImageStyle;
    const character = String(g.body.character ?? "").slice(0, 300);
    const cfg = await aiConfig(g.userId);
    const raw = await generateJson(cfg, { ...visualsPrompt({ topic, scenes, style: IMAGE_STYLES[styleKey].prompt, character }), maxTokens: 3000 });
    const list = (Array.isArray(raw.scenes) ? raw.scenes : []).map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
      .map((x) => ({ query: String(x.query ?? "").slice(0, 80), prompt: String(x.prompt ?? "").slice(0, 900) }));
    if (list.length < scenes.length) throw new UserError(502, "장면 설명을 다 만들지 못했습니다. 다시 시도해 주세요.");
    return json({ scenes: list.slice(0, scenes.length) });
  } catch (e) { return fail(e); }
}
