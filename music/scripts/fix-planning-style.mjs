// 일회성 복구 스크립트: 보컬 성별을 수정했지만 style_description 텍스트에는 예전 성별
// 문구("male vocals" 등)가 그대로 남아있던 기획 레코드를 GPT로 다시 스타일을 만들어 고친다.
// (lib/ai/musicPrompts.ts의 generateStyleAndExclude()와 동일한 프롬프트를 그대로 씀)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PLANNING_ID = process.argv[2];
if (!PLANNING_ID) {
  console.error("Usage: node scripts/fix-planning-style.mjs <planningId>");
  process.exit(1);
}

const { data: planning, error: planningError } = await supabase
  .from("music_plannings")
  .select("id, user_id, song_description, vocal_gender, style_description")
  .eq("id", PLANNING_ID)
  .single();
if (planningError || !planning) {
  console.error("기획을 찾을 수 없습니다:", planningError?.message);
  process.exit(1);
}
console.log("현재 vocal_gender:", planning.vocal_gender);
console.log("현재 style_description:", planning.style_description);

const { data: keyRow, error: keyError } = await supabase
  .from("user_api_keys")
  .select("api_key")
  .eq("user_id", planning.user_id)
  .eq("provider", "openai")
  .maybeSingle();
if (keyError || !keyRow) {
  console.error("OpenAI API 키를 찾을 수 없습니다:", keyError?.message);
  process.exit(1);
}

const GENRE_REFERENCE_LIST =
  "acoustic chicago blues, cape verdean, afro-jazz, ambient house, k-pop, jazz, lo-fi, city pop, trot, ballad, hip hop, r&b, edm, house, techno, trance, dubstep, drill, trap, dance pop, disco, funk, soul, folk, indie, rock, metal, punk, blues, country, gospel, classical, opera, orchestral, cinematic, ambient, new age";

const STYLE_SYSTEM_PROMPT = `# 역할 및 목표

사용자의 요구에 따라 창의적이고 매력적인 음악 콘텐츠를 기획하는 역할을 수행합니다. 사용자가 제시한 키워드나 주제에 맞추어 최적의 음악 장르와 구체적인 스타일을 제안하여 사용자의 기획 의도를 효과적으로 구현합니다.

# 지침

* 사용자의 요청에 맞춰 음악 기획을 위해 다음의 사항을 구체적으로 작성합니다:
* **스타일 설명**: 음악적 특징을 명확히 전달하는 구체적이고 세부적인 표현 사용 (악기, 사운드 효과, 템포, 분위기, 보컬 스타일 포함)
* **제외할 스타일**: 사용자가 원하지 않는 음악적 요소를 명확하게 정의하여 제외할 것
* 사용자가 보컬 성별을 지정했다면 스타일 설명에 "male vocals"/"female vocals"처럼 반영할 것. 지정하지 않았다면 보컬 성별을 명시하지 말 것.
* 반드시 영어로만 작성할 것.

# 참고할 음악적 스타일 및 특징
${GENRE_REFERENCE_LIST}

# 출력 형식
다음 JSON 형식으로만 출력하라 (다른 설명/마크다운 금지):
{"styleDescription": "음악적 스타일 및 특징 (영어)", "excludeStyles": "제외할 음악적 스타일 및 요소 (영어)"}`;

const vocalLine = planning.vocal_gender ? `\n보컬: ${planning.vocal_gender}` : "";
const userPrompt = `# 요청\n${planning.song_description}${vocalLine}`;

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyRow.api_key}` },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: STYLE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 1,
  }),
});
if (!res.ok) {
  console.error("OpenAI 요청 실패:", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
const result = JSON.parse(data.choices[0].message.content);
console.log("새 style_description:", result.styleDescription);
console.log("새 excludeStyles:", result.excludeStyles);

const { error: updateError } = await supabase
  .from("music_plannings")
  .update({ style_description: result.styleDescription, exclude_styles: result.excludeStyles })
  .eq("id", PLANNING_ID);
if (updateError) {
  console.error("저장 실패:", updateError.message);
  process.exit(1);
}
console.log("완료: 기획의 style_description/exclude_styles를 현재 vocal_gender에 맞게 갱신했습니다.");
