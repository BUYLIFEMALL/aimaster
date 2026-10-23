import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { generateJson } from "@/lib/gemini";
import { getProfile, latestPerTest, saveProfile } from "@/lib/results";
import { normalizeProfile, normalizeWeights, profilePrompt, profileSchema, WEIGHT_LABELS } from "@/lib/tests/ai";
import { describeForAi } from "@/lib/tests/report";
import { getTest, isSensitive } from "@/lib/tests/registry";

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
  const all = (await latestPerTest(g.userId)).filter((r) => !isSensitive(r.test_id));
  const weights = normalizeWeights(g.body.weights, all.map((r) => r.test_id));
  // 제외(0) 검사는 빼고, 비중이 높은 검사를 앞에 둔다(같으면 최근 순 유지)
  const latest = all.filter((r) => weights[r.test_id] > 0).sort((a, b) => weights[b.test_id] - weights[a.test_id]).slice(0, 8);
  const texts: string[] = [];
  const basedOn: { testId: string; headline: string; weight: number }[] = [];
  for (const r of latest) {
    const t = getTest(r.test_id);
    if (!t) continue;
    const prev = r.previous
      ? `\n이전 결과(${new Date(r.previous.created_at).toLocaleDateString("ko-KR")}): ${describeForAi(t, r.previous.result).split("\n").slice(1).join(" / ")}`
      : "";
    const w = weights[r.test_id] as 1 | 2 | 3;
    texts.push(`중요도: ${WEIGHT_LABELS[w]}\n` + describeForAi(t, r.result) + prev);
    basedOn.push({ testId: r.test_id, headline: r.headline, weight: w });
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
