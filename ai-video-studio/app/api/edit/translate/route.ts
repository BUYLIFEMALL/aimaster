import { NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage, PROGRAM_SLUG } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { ClipError, askJson } from "@/lib/clip/clipServer";
import { isEditLang } from "@/lib/edit/timeline";
import { parseTranslation, readTranslateItems, translatePrompt } from "@/lib/edit/translate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

/**
 * V2 언어판(2026-11-06): 장면 자막·내레이션을 회원 본인 AI 키로 번역한다(본인 사용판 — 권리 체크 뒤에만).
 * 실행마다 own_content_rights_log(program ai-video-studio, tool lang)에 제목·시각을 남기고(30일 뒤 정리), 기록에 실패하면 번역하지 않는다.
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  if (!isEditLang(body.lang) || body.lang === "ko") return NextResponse.json({ error: "바꿀 언어를 골라 주세요." }, { status: 400 });
  if (body.rights !== true) return NextResponse.json({ error: "내가 만들었거나 권리를 가진 영상인지 먼저 확인해 주세요." }, { status: 400 });
  const items = readTranslateItems(body.items);
  if (!items.length) return NextResponse.json({ error: "옮길 자막이나 내레이션이 있는 장면이 없습니다." }, { status: 400 });
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : "영상 합치기";

  const { error: logError } = await createAdminClient().from("own_content_rights_log").insert({ user_id: user.id, program: PROGRAM_SLUG, tool: "lang", file_name: title });
  if (logError) return NextResponse.json({ error: "실행 기록을 남기지 못해 시작하지 않았습니다. 잠시 뒤 다시 눌러 주세요." }, { status: 500 });

  try {
    const { system, prompt } = translatePrompt(body.lang, items);
    const { json, model } = await askJson(user.id, "언어판 번역", system, prompt, 4000);
    const translated = parseTranslation(json, items);
    if (!translated) return NextResponse.json({ error: "AI가 번역을 돌려주지 않았습니다. 다시 눌러 주세요." }, { status: 502 });
    await logProgramUsage(user.id, "edit_translate", 1, { lang: body.lang, items: items.length, model });
    return NextResponse.json({ items: translated, model }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof ClipError) return NextResponse.json({ error: e.message, needKey: e.needKey }, { status: e.status });
    return NextResponse.json({ error: "번역하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
