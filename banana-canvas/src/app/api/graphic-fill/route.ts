import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { templateById } from "@/lib/bnc/graphicTemplates";
import { yearGuard } from "@/lib/bnc/prompts";
import { textModel } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const MAX_CONTENT = 12_000;

/**
 * 템플릿 그래픽 「기획서·메모로 자동 입력」(올인원 그래픽 /api/ai-fill을 옮김, v1.13).
 * 칸 목록은 서버의 템플릿에서 가져오고, 돌려주는 값도 그 칸만 남긴다. 회원 본인 Gemini 키(guardAi: 이용 권한·키 확인).
 */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const tpl = templateById(g.body.templateId);
  if (!tpl) return json({ error: "템플릿을 먼저 골라 주세요." }, 400);
  const content = typeof g.body.content === "string" ? g.body.content.trim().slice(0, MAX_CONTENT) : "";
  if (!content) return json({ error: "분석할 메모를 쓰거나 기획서 파일(.txt·.md·.json)을 올려 주세요." }, 400);

  const fieldList = tpl.fields.map((f) => `- ${f.id} (${f.label})${f.options ? ` [선택 가능: ${f.options.join(", ")}]` : ""}`).join("\n");
  const prompt = `${yearGuard()}
당신은 그래픽 디자인 기획서를 분석하는 도우미입니다. 아래 [참고 문서]를 읽고 「${tpl.title}」 템플릿의 각 칸에 가장 알맞은 값을 한국어로(필요하면 영어로) 짧게 채우세요. 선택지가 있는 칸은 선택지 중 하나만 고르세요. 알 수 없는 칸은 빈 문자열로 두세요.

[칸 목록]
${fieldList}

[참고 문서]
<document>${content.replace(/<\/?document>/g, " ")}</document>

반드시 {"칸id": "값"} 형식의 JSON 객체 하나만 반환하세요.`;

  try {
    const raw = await textModel(g.apiKey, [{ text: prompt }], { json: true, temperature: 0.3 });
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* 빈 결과 */ } }
    }
    const values: Record<string, string> = {};
    for (const f of tpl.fields) {
      const v = parsed[f.id];
      if (typeof v !== "string" || !v.trim()) continue;
      if (f.options && !f.options.includes(v.trim())) continue;
      values[f.id] = v.trim().slice(0, 300);
    }
    return json({ values });
  } catch (e) { return fail(e); }
}
