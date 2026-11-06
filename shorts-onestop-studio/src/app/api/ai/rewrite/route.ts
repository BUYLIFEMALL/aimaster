import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { aiConfig } from "@/lib/aiConfig";
import { generateJson } from "@/lib/ai";
import { UserError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";
import { isRewriteLevel, parseRewrite, readLines, rewritePrompt } from "@/lib/rewrite";
import { MIN_CARDS } from "@/lib/script";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// V2 각색 강도(2026-11-06): 내 대본을 회원 본인 키로 1회 다듬기(재시도 없음). 실행은 usage 기록으로 남는다
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const level = isRewriteLevel(g.body.level) ? g.body.level : "medium";
    const lines = readLines(g.body.lines);
    if (lines.length < MIN_CARDS) throw new UserError(400, `대본이 ${MIN_CARDS}줄 이상 필요합니다. 한 줄에 한 장면씩 적어 주세요.`);
    if (g.body.own !== true) throw new UserError(400, "직접 쓴 대본인지 먼저 확인해 주세요.");
    const topic = String(g.body.topic ?? "").trim().slice(0, 120);
    const cfg = await aiConfig(g.userId);
    const raw = await generateJson(cfg, { ...rewritePrompt(level, lines, topic), maxTokens: 3000 });
    const out = parseRewrite(raw, lines.length);
    if (!out) throw new UserError(502, "AI가 줄 수를 맞추지 못했습니다. 다시 눌러 주세요(원문은 그대로입니다).");
    await recordUsage(g.userId, "script_rewrite", { level, lines: lines.length, model: cfg.model });
    return json({ lines: out, model: cfg.model, level });
  } catch (e) { return fail(e); }
}
