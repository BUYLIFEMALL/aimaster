import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// AI 가사 쓰기 — 회원 본인 Gemini 키(우선) 또는 OpenAI 키로 가사·제목을 만든다(다른 회원·운영자 키 없음).
// 이 프로그램 고유의 가사 지시문이다(다른 프로그램과 공유하지 않음).
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const OPENAI_MODEL = "gpt-4o-mini";

const LANG_KO: Record<string, string> = { auto: "곡 설명과 같은 언어", Korean: "한국어", English: "영어", Japanese: "일본어", Chinese: "중국어", Spanish: "스페인어" };

function systemPrompt(language: string, durationS: number) {
  const lines = durationS <= 45 ? "8~12줄" : durationS <= 120 ? "16~24줄" : "24~36줄";
  return [
    "당신은 대중음악 작사가입니다. 회원이 적은 곡 설명에 맞는 노래 가사와 제목을 씁니다.",
    `가사 언어: ${LANG_KO[language] ?? LANG_KO.auto}. 분량: 구간 표시를 뺀 가사 ${lines}.`,
    "구간 표시는 대괄호 영어로 씁니다: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro] 등. 짧은 곡은 [Verse]·[Chorus]만 써도 됩니다.",
    "후렴은 부르기 쉽게 반복되는 한두 줄을 넣습니다. 실존 가수·곡 이름, 기존 곡 가사 인용, 브랜드 이름은 쓰지 않습니다.",
    '반드시 JSON 한 개만 출력합니다: {"title": "제목(40자 이내)", "lyrics": "가사 전체(줄바꿈은 \\n)"}',
  ].join("\n");
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (prompt.length < 2) return NextResponse.json({ error: "곡 설명을 먼저 적어 주세요." }, { status: 400 });
  const language = typeof body.language === "string" ? body.language : "auto";
  const durationS = typeof body.durationS === "number" ? body.durationS : 120;

  const geminiKey = await getUserApiKey(user.id, "gemini");
  const openaiKey = geminiKey ? null : await getUserApiKey(user.id, "openai");
  if (!geminiKey && !openaiKey) {
    return NextResponse.json({ error: "AI 가사 쓰기에는 본인 Gemini 또는 OpenAI API 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요.", missingKeys: ["Google Gemini"] }, { status: 400 });
  }

  const system = systemPrompt(language, durationS);
  const userText = `곡 설명: ${prompt}`;
  try {
    let text = "";
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096, temperature: 0.9 },
        }),
        signal: AbortSignal.timeout(50_000),
        cache: "no-store",
      });
      if (!res.ok) return NextResponse.json({ error: `Gemini 가사 생성이 실패했습니다. (${res.status}) 본인 키를 확인해 주세요.` }, { status: 502 });
      const json = await res.json();
      text = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userText },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        }),
        signal: AbortSignal.timeout(50_000),
        cache: "no-store",
      });
      if (!res.ok) return NextResponse.json({ error: `OpenAI 가사 생성이 실패했습니다. (${res.status}) 본인 키를 확인해 주세요.` }, { status: 502 });
      const json = await res.json();
      text = json?.choices?.[0]?.message?.content ?? "";
    }
    const parsed = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()) as { title?: string; lyrics?: string };
    const lyrics = String(parsed.lyrics ?? "").replace(/\r\n/g, "\n").trim().slice(0, 5000);
    if (!lyrics) throw new Error("빈 가사");
    await logProgramUsage(user.id, "generate_lyrics", 1, { provider: geminiKey ? "gemini" : "openai" });
    return NextResponse.json({ title: String(parsed.title ?? "").trim().slice(0, 80), lyrics });
  } catch {
    return NextResponse.json({ error: "가사를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
