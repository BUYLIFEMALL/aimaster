import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateJson } from "@/lib/gemini";
import { getProfile, latestPerTest, saveProfile } from "@/lib/results";
import { normalizeProfile, profilePrompt, profileSchema } from "@/lib/tests/ai";
import { describeForAi } from "@/lib/tests/report";
import { getTest } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  return NextResponse.json({ stored: await getProfile(access.user.id) }, { headers: NO_STORE });
}

/** 검사별 최신 결과 2개 이상을 묶어 종합 프로필을 만든다(회원 본인 Gemini 키). */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if (g instanceof NextResponse) return g;
  const latest = (await latestPerTest(g.userId)).slice(0, 8);
  const texts: string[] = [];
  const basedOn: { testId: string; headline: string }[] = [];
  for (const r of latest) {
    const t = getTest(r.test_id);
    if (!t) continue;
    texts.push(describeForAi(t, r.result));
    basedOn.push({ testId: r.test_id, headline: r.headline });
  }
  if (texts.length < 2) return json({ error: "종합 프로필은 서로 다른 검사 2개 이상을 마친 뒤 만들 수 있습니다." }, 400);
  try {
    const { system, user } = profilePrompt(texts);
    const { data } = await generateJson({ apiKey: g.apiKey, system, user, schema: profileSchema, temperature: 0.6, maxOutputTokens: 8192 });
    const profile = normalizeProfile(data);
    if (!profile) return json({ error: "AI가 올바른 형식으로 응답하지 못했습니다. 한 번 더 눌러 주세요.", code: "parse" }, 502);
    await saveProfile(g.userId, profile, basedOn);
    return json({ stored: { profile, basedOn, updatedAt: new Date().toISOString() } });
  } catch (e) {
    return fail(e);
  }
}
