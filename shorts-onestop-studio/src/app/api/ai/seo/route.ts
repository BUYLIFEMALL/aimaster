import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { seoPrompt } from "@/lib/prompts";
import { normalizeSeo } from "@/lib/plan";
import type { ShortsScript } from "@/lib/script";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 업로드 문구: 대본 요약으로 회원 본인 키 1회(형식이 깨지면 1회 재요청). 저장은 화면에서 프로젝트와 함께
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const s = g.body.script as ShortsScript | undefined;
    if (!s?.intro?.title || !Array.isArray(s.cards)) throw new UserError(400, "대본이 없습니다.");
    const outline = [`인트로: ${s.intro.title} — ${s.intro.narration ?? ""}`, ...s.cards.slice(0, 8).map((c, i) => `${i + 1}. ${c.title}: ${c.narration ?? ""}`), `아웃트로: ${s.outro?.title ?? ""}`].join("\n").slice(0, 4000);
    const cfg = await aiConfig(g.userId);
    for (let attempt = 0; attempt < 2; attempt++) {
      const seo = normalizeSeo(await generateJson(cfg, { ...seoPrompt({ topic: String(s.topic ?? s.intro.title).slice(0, 120), category: String(s.category ?? "").slice(0, 30), outline }), maxTokens: 2000 }), cfg.model);
      if (seo) return json({ seo });
    }
    throw new UserError(502, "AI가 업로드 문구를 완성하지 못했습니다. 다시 시도해 주세요.");
  } catch (e) { return fail(e); }
}
