import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkProgramAccess } from "@/lib/programAccess";
import { createAdminClient } from "@/lib/supabase/admin";

// 2026-10-21 병합 C(v1.06): 이 주소의 브라우저에만 있던 템플릿을 AI Prompt 「📁 내 템플릿」 표(ai_prompt_templates)로 옮긴다.
// 로그인 + 옮겨 갈 프로그램(ai-prompt-studio) 권한을 확인하고, 본인 user_id로만 넣는다(같은 제목+본문은 건너뜀, 300개 한도).
// 표·한도·정리 규칙은 ai-prompt-studio/src/lib/templates.ts와 같게 유지한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TABLE = "ai_prompt_templates";
const MAX_TEMPLATES = 300;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!(await checkProgramAccess(user.id, "ai-prompt-studio"))) {
    return NextResponse.json({ error: "AI Prompt 자동화 이용 권한을 확인할 수 없습니다. 메인 사이트에서 이용 권한을 확인해 주세요." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const items: unknown[] = Array.isArray(body?.items) ? body.items.slice(0, MAX_TEMPLATES) : [];
  const cleaned = items
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return {
        title: clip(r.title, 120),
        description: clip(r.description, 500),
        content: typeof r.content === "string" ? r.content.slice(0, 20000) : "",
        category: clip(r.category, 40) || "Personal",
      };
    })
    .filter((t) => t.title && t.content.trim());

  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin.from(TABLE).select("title, content").eq("user_id", user.id).limit(MAX_TEMPLATES);
  if (readError) return NextResponse.json({ error: "보관함을 확인하지 못했습니다." }, { status: 500 });

  const seen = new Set((existing ?? []).map((t) => `${t.title}\u0000${t.content}`));
  const room = Math.max(0, MAX_TEMPLATES - (existing?.length ?? 0));
  const now = new Date().toISOString();
  const rows = [];
  for (const t of cleaned) {
    const k = `${t.title}\u0000${t.content}`;
    if (seen.has(k) || rows.length >= room) continue;
    seen.add(k);
    rows.push({ ...t, user_id: user.id, created_at: now, updated_at: now });
  }
  if (rows.length) {
    const { error } = await admin.from(TABLE).insert(rows);
    if (error) return NextResponse.json({ error: "옮기지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  return NextResponse.json({ added: rows.length, skipped: items.length - rows.length });
}
