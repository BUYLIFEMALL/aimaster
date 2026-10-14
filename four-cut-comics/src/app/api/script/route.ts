import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { AiError, generateText } from "@/lib/gemini";
import { genreById } from "@/lib/comic/options";
import { buildFollowupPrompt, buildIdeasPrompt, buildScriptPrompt } from "@/lib/comic/prompt";
import { extractJson, normalizeIdeas, normalizeScript } from "@/lib/comic/script";
import { parseScriptRequest } from "@/lib/comic/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** 컷 수(3·4·6)에 맞춘 대본 JSON 스키마 */
const scriptSchema = (n: number) => ({
  type: "OBJECT",
  properties: {
    characters: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" } }, required: ["name", "description"] } },
    panels: {
      type: "ARRAY", minItems: n, maxItems: n,
      items: { type: "OBJECT", properties: { panel: { type: "NUMBER" }, character: { type: "STRING" }, description: { type: "STRING" }, dialogue: { type: "STRING" } }, required: ["panel", "character", "description", "dialogue"] },
    },
  },
  required: ["characters", "panels"],
});
const IDEAS_SCHEMA = { type: "OBJECT", properties: { ideas: { type: "ARRAY", minItems: 5, maxItems: 5, items: { type: "STRING" } } }, required: ["ideas"] };

/** 대본 생성·주제 아이디어 추천·후속편 대본. 회원 본인 Gemini 키 1회 호출. 입력은 서버에 저장하지 않는다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, 60_000);
  if (g instanceof NextResponse) return g;
  const parsed = parseScriptRequest(g.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const req = parsed.value;
  const year = new Date().getFullYear();
  try {
    if (req.kind === "ideas") {
      const prompt = buildIdeasPrompt(req.genreId, year);
      if (!prompt) return json({ error: "장르가 올바르지 않습니다." }, 400);
      const text = await generateText({ apiKey: g.apiKey, prompt, json: true, schema: IDEAS_SCHEMA });
      const ideas = normalizeIdeas(extractJson(text));
      if (!ideas) throw new AiError("badjson");
      return json({ ideas });
    }
    const genre = genreById(req.genreId);
    if (!genre) return json({ error: "장르가 올바르지 않습니다." }, 400);
    const prompt = req.kind === "script"
      ? buildScriptPrompt({ topic: req.topic, genreId: req.genreId, format: req.format, year, panelCount: req.panelCount })
      : buildFollowupPrompt({ topic: req.topic, script: req.script, nextTopic: req.nextTopic, ending: req.ending, genreId: req.genreId, year });
    if (!prompt) return json({ error: "장르가 올바르지 않습니다." }, 400);
    // 검색 근거(시사 풍자)는 JSON 스키마와 함께 쓸 수 없어 텍스트에서 JSON을 꺼내고, 실패하면 한 번 더 요청한다
    const useSearch = !!genre.search && req.kind === "script";
    const count = req.kind === "script" ? req.panelCount : req.script.panels.length;
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await generateText({ apiKey: g.apiKey, prompt, json: !useSearch, search: useSearch, schema: scriptSchema(count) });
      const script = normalizeScript(extractJson(text), count);
      if (script) return json({ script });
      if (!useSearch) break;
    }
    throw new AiError("badjson");
  } catch (e) {
    return fail(e);
  }
}
