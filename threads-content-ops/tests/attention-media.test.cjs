// 2026-10-23 v2.15 기획 앱 기능 합치기: 글 생성에 사진·영상 캡처를 함께 보내는지(3사 요청 모양)와
// 「보이는 것만 쓰기」 안내가 붙는지 시험한다. 실제 AI 호출 없음(fetch를 가짜로 바꿈).
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../lib/attention.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

const content = "가".repeat(460);
const planJson = JSON.stringify({ hook: "첫 줄", hookType: "반전형", whyHookWorks: "이유", content, cta: "어떻게 생각해?", followUpIdeas: ["다음"], hookVariants: ["자책형", "부정 명령형", "리얼 썰형", "논쟁형", "반전형"].map((type) => ({ type, hook: "h", whyItWorks: "w", content })) });

function load() {
  const calls = [];
  const fetchMock = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    const text = planJson;
    const json = String(url).includes("anthropic") ? { content: [{ type: "text", text }] }
      : String(url).includes("generativelanguage") ? { candidates: [{ content: { parts: [{ text }] } }] }
      : { choices: [{ message: { content: text } }] };
    return { ok: true, status: 200, json: async () => json };
  };
  const module = { exports: {} };
  const requireMock = (id) => {
    if (id === "server-only") return {};
    if (id === "./yearRule") return { withYearRule: (value) => value };
    if (id === "./openaiRequestParams") return { openAIGenerationParams: () => ({}) };
    if (id === "@/threads-content-ops/lib/postImage") return { extractJson: (value) => value, parsePromptsJson: () => [], promptSystem: "" };
    if (id === "@/threads-content-ops/lib/personas") return { REWRITE_MODES: [] };
    if (id === "@/threads-content-ops/lib/productPost") return {};
    throw new Error(`예상하지 못한 모듈: ${id}`);
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: requireMock, fetch: fetchMock, AbortSignal, console }, { filename: "attention.ts" });
  return { lib: module.exports, calls };
}

const media = { type: "image", base64List: ["AAAA", "BBBB"] };

test("OpenAI: 사진을 image_url로 본문 앞에 붙이고 안내를 넣는다", async () => {
  const { lib, calls } = load();
  await lib.generateAttentionPlan({ topic: "세탁조", engine: { provider: "openai", model: "gpt-4.1", apiKey: "k" }, media });
  const [system, user] = calls[0].body.messages;
  assert.equal(user.content.length, 3);
  assert.equal(user.content[0].image_url.url, "data:image/jpeg;base64,AAAA");
  assert.equal(user.content[2].type, "text");
  assert.match(system.content, /실제로 보이는 것/);
  assert.match(system.content, /회원이 직접 올린 사진 2장/);
});

test("Claude: base64 image 블록", async () => {
  const { lib, calls } = load();
  await lib.generateAttentionPlan({ topic: "세탁조", engine: { provider: "anthropic", model: "claude-sonnet-5", apiKey: "k" }, media: { type: "video", base64List: ["CCCC"] } });
  const user = calls[0].body.messages[0];
  assert.equal(user.content[0].type, "image");
  assert.equal(user.content[0].source.data, "CCCC");
  assert.match(calls[0].body.system, /영상에서 순서대로 캡처한 장면 1장/);
});

test("Gemini: inlineData 조각", async () => {
  const { lib, calls } = load();
  await lib.generateAttentionPlan({ topic: "세탁조", engine: { provider: "gemini", model: "gemini-3.7-flash", apiKey: "k" }, media });
  const parts = calls[0].body.contents[0].parts;
  assert.equal(parts[0].inlineData.data, "AAAA");
  assert.equal(parts[2].text.includes("세탁조"), true);
});

test("첨부가 없으면 예전과 같은 요청(문자열 본문, 안내 없음)", async () => {
  const { lib, calls } = load();
  await lib.generateAttentionPlan({ topic: "세탁조", engine: { provider: "openai", model: "gpt-4.1", apiKey: "k" } });
  const [system, user] = calls[0].body.messages;
  assert.equal(typeof user.content, "string");
  assert.doesNotMatch(system.content, /첨부한 시각 자료/);
});
