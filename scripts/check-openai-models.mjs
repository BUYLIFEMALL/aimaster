#!/usr/bin/env node
// OpenAI 글 모델 시험 호출 점검 (2026-10-20) — 프로그램 모델 목록에 새 세대 모델을 넣으면 회원보다 먼저 1회 호출해 400 같은 거부를 찾는다.
//   node scripts/check-openai-models.mjs            모델 목록·보낼 옵션·마지막 시험 결과만 표시(호출·비용 없음)
//   node scripts/check-openai-models.mjs --live     아직 시험하지 않은 모델만 1회씩 호출(본인 키: 환경변수 OPENAI_API_KEY)
//   node scripts/check-openai-models.mjs --live --all   모든 모델을 다시 호출
//   --no-handoff   --live 결과를 docs/HANDOFF.md 맨 위에 한 줄로 남기지 않음(기본은 남김 — 커밋은 실행한 사람이 직접)
// 요청 옵션은 공용 기준 코드 openai-request-params(naver-blog-seo-studio/lib/ai/openaiRequestParams.ts)로 만든다 — 회원 요청과 같은 규칙.
// 키는 저장·출력하지 않는다. 결과는 scripts/data/openai-model-check.json(모델·날짜·성공 여부·거부 이유)에만 남는다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// .ts 기준 코드를 Node로 바로 불러올 때 나오는 「모듈 형식」 경고는 숨긴다
process.removeAllListeners("warning");
const { openAIGenerationParams, isOpenAIReasoningModel } = await import("../naver-blog-seo-studio/lib/ai/openaiRequestParams.ts");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const stateFile = path.join(root, "scripts", "data", "openai-model-check.json");
const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const all = args.has("--all");
const writeHandoff = !args.has("--no-handoff");

// 1) 저장소(추적 중인 파일)에서 OpenAI 글 모델 이름 모으기 — 테스트·문서·이미지 모델·lab·분석용 폴더 제외
const MODEL_RE = /["'`]((?:gpt-[3-9](?:\.\d+)?[a-z]?(?:-[a-z0-9.]+)*)|(?:o[1-9](?:-[a-z0-9]+)*))["'`]/g;
const files = execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx", "*.js", "*.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => f && !/(^|\/)(tests?|scripts|docs|labs|scratch|node_modules|\.next|public|KIT|clone-kit)\//.test(f) && !/\.test\.|\.spec\./.test(f) && !f.startsWith(".") && f.includes("/"));
const models = new Map(); // model -> Set(program)
for (const file of files) {
  let text;
  try { text = fs.readFileSync(path.join(root, file), "utf8"); } catch { continue; }
  if (!/openai|gpt-/i.test(text)) continue;
  for (const m of text.matchAll(MODEL_RE)) {
    const model = m[1];
    if (/image|tts|whisper|embedding|audio|realtime|transcribe|dall/.test(model)) continue;
    if (!models.has(model)) models.set(model, new Set());
    models.get(model).add(file.split("/")[0]);
  }
}

const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
const sorted = [...models.keys()].sort();

// 2) 표시
console.log(`OpenAI 글 모델 ${sorted.length}개 (프로그램 코드에서 찾음)\n`);
for (const model of sorted) {
  const params = openAIGenerationParams(model, { temperature: 0.7, maxTokens: 16 });
  const last = state[model];
  const lastText = last ? `${last.ok ? "OK" : "실패"} ${last.checkedAt.slice(0, 10)}${last.ok ? "" : ` — ${last.reason}`}` : "시험 안 함";
  const programs = [...models.get(model)];
  console.log(`${model.padEnd(18)} ${isOpenAIReasoningModel(model) ? "추론" : "일반"}  보낼 옵션 ${JSON.stringify(params).padEnd(34)} 마지막: ${lastText}`);
  console.log(`${"".padEnd(18)}       사용 프로그램 ${programs.length}개: ${programs.slice(0, 6).join(", ")}${programs.length > 6 ? " …" : ""}`);
}

if (!live) {
  const untested = sorted.filter((model) => !state[model]?.ok);
  console.log(`\n시험 안 했거나 실패한 모델 ${untested.length}개${untested.length ? `: ${untested.join(", ")}` : ""}`);
  console.log("실제 호출은 --live (본인 키 환경변수 OPENAI_API_KEY 필요, 모델마다 아주 짧은 호출 1회).");
  process.exit(0);
}

// 3) 실제 호출
const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
if (!apiKey) {
  console.error("\nOPENAI_API_KEY 환경변수가 없습니다. 본인 키로 실행해 주세요(키는 저장·출력하지 않습니다).");
  process.exit(2);
}
const targets = sorted.filter((model) => all || !state[model]?.ok);
console.log(`\n실제 호출 ${targets.length}개 시작`);
let failed = 0;
for (const model of targets) {
  const body = { model, messages: [{ role: "user", content: "OK라고만 답하세요." }], ...openAIGenerationParams(model, { temperature: 0.7, maxTokens: 16 }) };
  let ok = false, reason = "", status = 0;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    status = response.status;
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      ok = typeof data.choices?.[0]?.message?.content === "string";
      if (!ok) reason = "응답에 글이 없음";
    } else {
      // OpenAI 오류 문구에 키 앞뒤 일부가 섞여 오므로 저장 전에 가린다
      reason = String(data.error?.message ?? `HTTP ${status}`).replace(/sk-[A-Za-z0-9_*.-]+/g, "sk-***").slice(0, 200);
    }
    if (status === 401) {
      console.error("\n키 오류(401) — 모델 문제가 아니라 키 문제라 결과를 기록하지 않고 멈춥니다. 본인 키를 확인해 주세요.");
      process.exit(2);
    }
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }
  if (!ok) failed += 1;
  state[model] = { ok, status, reason, params: Object.keys(body).filter((key) => key !== "model" && key !== "messages"), checkedAt: new Date().toISOString() };
  console.log(`${ok ? "OK  " : "실패"} ${model} (${status || "-"})${ok ? "" : ` — ${reason}`}`);
}
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.writeFileSync(stateFile, JSON.stringify(Object.fromEntries(Object.entries(state).sort()), null, 2) + "\n");
console.log(`\n결과 저장: scripts/data/openai-model-check.json · 실패 ${failed}개`);

// 4) 다른 CLI도 바로 알 수 있게 docs/HANDOFF.md 맨 위에 결과 한 줄(파일만 고침 — 커밋은 실행한 사람이 내 줄만)
if (writeHandoff && targets.length) {
  const handoff = path.join(root, "docs", "HANDOFF.md");
  const text = fs.readFileSync(handoff, "utf8");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const failures = targets.filter((model) => !state[model].ok).map((model) => `${model}(${state[model].reason.slice(0, 80)})`);
  const kst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
  const entry = `## ${kst} KST — OpenAI 모델 시험 호출(\`scripts/check-openai-models.mjs --live\`) 결과${nl}`
    + `- 호출 ${targets.length}개 · 성공 ${targets.length - failed}개 · 실패 ${failed}개${failures.length ? ` — ${failures.join(", ")}` : ""}. `
    + `상세 \`scripts/data/openai-model-check.json\`. 실패 모델은 공용 기준 코드(\`naver-blog-seo-studio/lib/ai/openaiRequestParams.ts\`) 규칙이나 각 프로그램 모델 목록을 확인.${nl}${nl}`;
  const at = text.indexOf(nl + "## ");
  fs.writeFileSync(handoff, at < 0 ? text + nl + entry : text.slice(0, at + nl.length) + entry + text.slice(at + nl.length));
  console.log("docs/HANDOFF.md 맨 위에 결과 한 줄을 남겼습니다(커밋은 직접).");
}
if (failed) {
  console.log("실패한 모델은 기준 코드(naver-blog-seo-studio/lib/ai/openaiRequestParams.ts) 규칙을 고치거나 모델 목록에서 빼세요. 「모델이 없음」이면 이름 오타·미출시입니다.");
  process.exit(1);
}
