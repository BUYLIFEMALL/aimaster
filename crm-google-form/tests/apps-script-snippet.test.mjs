// CRM U3 — 구글폼 연결 Apps Script(v2) 스니펫을 모의 Apps Script 환경에서 실제로 실행하고, 보낸 본문을 서버 파서로 판정한다.
// 실행: node --test crm-google-form/tests/apps-script-snippet.test.mjs   (새 패키지 0, 실제 Google·네트워크 0)
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = [
  `import { createRequire } from "node:module";`,
  `import { readFileSync } from "node:fs";`,
  `import { pathToFileURL, fileURLToPath } from "node:url";`,
  `const ROOT = ${JSON.stringify(PROJECT.replace(/\\/g, "/"))};`,
  `const ts = createRequire(pathToFileURL(ROOT + "/package.json"))("typescript");`,
  `export async function load(url, ctx, next) {`,
  `  const clean = url.split("?")[0];`,
  `  if (clean.startsWith("file:") && clean.endsWith(".ts") && !clean.includes("/node_modules/")) {`,
  `    const file = fileURLToPath(clean);`,
  `    const out = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true }, fileName: file });`,
  `    return { format: "module", source: out.outputText, shortCircuit: true };`,
  `  }`,
  `  return next(url, ctx);`,
  `}`,
].join("\n");
register("data:text/javascript," + encodeURIComponent(HOOKS));

const { appsScriptSnippet } = await import(pathToFileURL(join(PROJECT, "lib/crm/appsScriptSnippet.ts")).href);
const { classifyWebhookBody } = await import(pathToFileURL(join(PROJECT, "lib/crm/dedupe.ts")).href);

const URL_ = "https://crm-google-form.buylife.xyz/api/webhooks/form-submit/11111111-2222-4333-8444-555555555555";
const SRC_A = "aaaaaaaa-1111-4111-8111-000000000001";
const SRC_B = "bbbbbbbb-1111-4111-8111-000000000002";
const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab";
const T = new Date(Date.UTC(2026, 10, 18, 1, 2, 3, 456)); // 13자리 ms

/** 생성된 스크립트를 모의 Apps Script 전역과 함께 실행하고 UrlFetchApp 호출을 돌려준다. */
function runSnippet(e, url = URL_) {
  const calls = [];
  const logs = [];
  const UrlFetchApp = { fetch: (u, o) => { calls.push({ url: u, opts: o }); } };
  const Logger = { log: (...a) => logs.push(a) };
  const consoleSpy = { log: (...a) => logs.push(a), error: (...a) => logs.push(a), warn: (...a) => logs.push(a) };
  const fn = new Function("UrlFetchApp", "Logger", "console", "e", appsScriptSnippet(url) + "\nonFormSubmit(e);");
  fn(UrlFetchApp, Logger, consoleSpy, e);
  assert.equal(calls.length, 1, "UrlFetchApp.fetch 정확히 1번");
  assert.deepEqual(logs, [], "로그 0");
  const { url: u, opts } = calls[0];
  assert.equal(u, url);
  assert.equal(opts.method, "post");
  assert.equal(opts.contentType, "application/json");
  assert.equal(opts.muteHttpExceptions, true);
  return JSON.parse(opts.payload);
}
const NV = { 타임스탬프: ["2026. 11. 18 오전 10:02:03"], 이름: ["홍길동"], 연락처: ["010-1111-2222"] };
function sheetEvent({ fileId = FILE, sheetId = 0, row = 5, first = T, namedValues = NV, throwAt = null } = {}) {
  const sheet = {
    getParent: () => { if (throwAt === "parent") throw new Error("x"); return { getId: () => fileId }; },
    getSheetId: () => sheetId,
    getRange: (r, c) => { if (throwAt === "range") throw new Error("x"); assert.deepEqual([r, c], [row, 1]); return { getValue: () => first }; },
  };
  return { namedValues, range: { getRow: () => row, getSheet: () => sheet } };
}
function formEvent(id, items = [["이름", "홍길동"], ["연락처", "010-1111-2222"], ["관심", ["A", "B"]]]) {
  return {
    response: {
      getId: () => id,
      getItemResponses: () => items.map(([t, v]) => ({ getItem: () => ({ getTitle: () => t }), getResponse: () => v })),
    },
  };
}

test("시트 + 첫 칸 Date → v2 sheet, 서버 파서가 v2로 판정(키 = 문서:시트:행:ms)", () => {
  const p = runSnippet(sheetEvent());
  assert.equal(p.v, 2);
  assert.equal(p.kind, "sheet");
  assert.deepEqual(p.values, NV);
  const c = classifyWebhookBody(SRC_A, p);
  assert.deepEqual(c, { type: "v2", formSourceId: SRC_A, kind: "sheet", dedupeKey: `v2:sheet:${FILE}:0:5:${T.getTime()}` });
});

test("같은 이벤트가 두 번(트리거 중복·재실행) → 같은 키, 다른 행 → 다른 키, 같은 키·다른 폼 연결 → 범위 분리", () => {
  const k1 = classifyWebhookBody(SRC_A, runSnippet(sheetEvent())).dedupeKey;
  const k2 = classifyWebhookBody(SRC_A, runSnippet(sheetEvent())).dedupeKey;
  const k3 = classifyWebhookBody(SRC_A, runSnippet(sheetEvent({ row: 6 }))).dedupeKey;
  const b = classifyWebhookBody(SRC_B, runSnippet(sheetEvent()));
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
  assert.equal(b.dedupeKey, k1);
  assert.equal(b.formSourceId, SRC_B);
});

for (const [name, opts] of [
  ["첫 칸이 문자열(Date 아님)", { first: "2026. 11. 18 오전 10:02:03" }],
  ["첫 칸이 빈 값", { first: "" }],
  ["첫 칸이 숫자", { first: 1794969285544 }],
  ["첫 칸 Date가 무효", { first: new Date("not a date") }],
  ["첫 칸 Date가 13자리 ms가 아님", { first: new Date(1000) }],
  ["문서 ID가 짧음", { fileId: "short" }],
  ["문서 ID에 금지 문자", { fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz/0123456789" }],
  ["시트 ID 음수", { sheetId: -1 }],
  ["시트 ID 소수", { sheetId: 1.5 }],
  ["행 0", { row: 0 }],
  ["행 소수", { row: 2.5 }],
  ["문서 조회 오류", { throwAt: "parent" }],
  ["첫 칸 조회 오류", { throwAt: "range" }],
]) {
  test(`시트 조건 불충족(${name}) → 구버전 본문(v 없음·키 없음·임의 ID 없음), 보호 없음`, () => {
    const p = runSnippet(sheetEvent(opts));
    assert.deepEqual(Object.keys(p), ["values"]);
    assert.deepEqual(p.values, NV);
    assert.deepEqual(classifyWebhookBody(SRC_A, p), { type: "legacy", formSourceId: SRC_A, dedupeKey: null });
  });
}

test("폼에 붙인 스크립트 + 실제 응답 ID → v2 form, 값은 응답 항목에서(체크박스는 쉼표로)", () => {
  const p = runSnippet(formEvent("2_ABaOnudR-x_y9Z"));
  assert.deepEqual(p, { v: 2, kind: "form", eventKey: "2_ABaOnudR-x_y9Z", values: { 이름: ["홍길동"], 연락처: ["010-1111-2222"], 관심: ["A,B"] } });
  assert.deepEqual(classifyWebhookBody(SRC_A, p), { type: "v2", formSourceId: SRC_A, kind: "form", dedupeKey: "v2:form:2_ABaOnudR-x_y9Z" });
});

for (const [name, id] of [["빈 응답 ID", ""], ["응답 ID 금지 문자", "a b"], ["응답 ID null", null], ["응답 ID 201자", "a".repeat(201)]]) {
  test(`폼 응답 ID 이상(${name}) → 구버전 본문(값은 응답 항목), 보호 없음`, () => {
    const p = runSnippet(formEvent(id));
    assert.deepEqual(Object.keys(p), ["values"]);
    assert.equal(classifyWebhookBody(SRC_A, p).type, "legacy");
  });
}

test("폼 응답 항목 읽기 오류 → 구버전 본문(빈 값), 이벤트 없음·모르는 이벤트 → 구버전 본문", () => {
  const broken = { response: { getId: () => "abc", getItemResponses: () => { throw new Error("x"); } } };
  assert.deepEqual(runSnippet(broken), { values: {} });
  assert.deepEqual(runSnippet(undefined), { values: {} });
  assert.deepEqual(runSnippet({ namedValues: NV }), { values: NV });
});

test("웹훅 주소는 문자열로 안전하게 들어간다(따옴표·역슬래시가 있어도 실행·전송 주소 그대로)", () => {
  const weird = 'https://x.test/api/webhooks/form-submit/a"b\\c';
  runSnippet(sheetEvent(), weird);
});

test("스니펫 원문: 임의 UUID·로그 호출 없음, onFormSubmit 하나", () => {
  const code = appsScriptSnippet(URL_);
  assert.doesNotMatch(code, /Utilities\.getUuid|Logger\.|console\./);
  assert.equal((code.match(/function onFormSubmit\(/g) ?? []).length, 1);
});

test("화면(SourceCard)이 이 생성 함수를 쓰고 예전 내장 스니펫이 없다", async () => {
  const src = (await import("node:fs")).readFileSync(join(PROJECT, "components/sources/SourceCard.tsx"), "utf8");
  assert.match(src, /from "@\/lib\/crm\/appsScriptSnippet"/);
  assert.doesNotMatch(src, /Utilities\.getUuid/);
});
