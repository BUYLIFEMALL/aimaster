import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { sendToWorkInbox } from "@/lib/workInbox";
import { LANGUAGES } from "@/lib/translation/model";
import { PROGRAM_SLUG } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";
const MAX_TEXT = 199_000;

// U9-C: 번역문을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다(번역본 페이지로 만들 수 있음).
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  try {
    const body = (await req.json()) as { title?: unknown; text?: unknown; targetLanguage?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "보낼 번역문이 없습니다." }, { status: 400 });
    if (text.length > MAX_TEXT) return NextResponse.json({ error: "번역문이 너무 깁니다(최대 19만 9천 자)." }, { status: 413 });
    const baseTitle = (typeof body.title === "string" ? body.title : "").replace(/\s+/g, " ").trim().slice(0, 120) || "번역 문서";
    const language = LANGUAGES.find((l) => l.id === body.targetLanguage)?.name;
    const title = `(번역) ${baseTitle}${language ? ` — ${language}` : ""}`.slice(0, 200);
    await sendToWorkInbox({
      userId: access.user.id,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title,
      bodyMd: text,
      sourceUrl: "https://document-translator.buylife.xyz",
    });
    return NextResponse.json({ ok: true, title, inboxUrl: INBOX_URL });
  } catch (e) {
    const message = e instanceof SyntaxError ? "입력 형식을 확인해 주세요." : e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
