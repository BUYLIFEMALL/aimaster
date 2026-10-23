import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { topicPrompt } from "@/lib/prompts";
import { CATEGORIES, isFormat } from "@/lib/script";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 주제 추천: 회원 본인 키로 1회 호출(주제 8개)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const category = String(g.body.category ?? "");
    if (!(CATEGORIES as readonly string[]).includes(category)) throw new UserError(400, "분야를 골라 주세요.");
    const seed = String(g.body.seed ?? "").trim().slice(0, 200);
    const reference = String(g.body.reference ?? "").trim().slice(0, 12000);
    const guideline = String(g.body.guideline ?? "").trim().slice(0, 3000);
    const cfg = await aiConfig(g.userId);
    const raw = await generateJson(cfg, { ...topicPrompt({ category, seed, reference, count: 8, guideline }), maxTokens: 2500 });
    const topics = (Array.isArray(raw.topics) ? raw.topics : [])
      .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
      .map((t) => ({ title: String(t.title ?? "").trim().slice(0, 60), hook: String(t.hook ?? "").trim().slice(0, 40), format: isFormat(t.format) ? t.format : null }))
      .filter((t) => t.title.length >= 4)
      .slice(0, 8);
    if (!topics.length) throw new UserError(502, "AI가 주제를 만들지 못했습니다. 다시 시도해 주세요.");
    return json({ topics, model: cfg.model });
  } catch (e) { return fail(e); }
}
