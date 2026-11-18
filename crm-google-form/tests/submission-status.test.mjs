// CRM-20261118-03 — 접수 상태 분류 순수 함수 시험(DB·네트워크 0, 새 패키지 0).
// 실행: node --test crm-google-form/tests/submission-status.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUBMISSION_STATUSES,
  REVIEW_STATUSES,
  STATUS_FILTERS,
  statusMeta,
  countSubmissionStatuses,
  matchesStatusFilter,
  showsErrorMessage,
  REVIEW_STATUS_NOT_IN,
  reviewCountView,
  listLoadFailed,
  countView,
} from "../lib/crm/submissionStatus.ts";

const rows = (list) => list.map((status, i) => ({ id: String(i), status }));

test("상태 6개: 기존 3개 + 새 3개, 순서 고정", () => {
  assert.deepEqual(SUBMISSION_STATUSES, ["received", "notified", "failed", "dispatching", "partial", "unknown"]);
  assert.deepEqual(REVIEW_STATUSES, ["dispatching", "partial", "unknown"]);
});

test("기존 3개 라벨·색은 그대로(회귀 0)", () => {
  assert.deepEqual(statusMeta("received"), { label: "접수됨", chip: "mx-chip", review: false });
  assert.deepEqual(statusMeta("notified"), { label: "발송 완료", chip: "mx-chip-green", review: false });
  assert.deepEqual(statusMeta("failed"), { label: "발송 실패", chip: "mx-chip-red", review: false });
});

test("새 3개: 결과 미확정·확인 필요 라벨, 자동 재시도 안내 0", () => {
  const d = statusMeta("dispatching");
  const p = statusMeta("partial");
  const u = statusMeta("unknown");
  assert.equal(d.label, "발송 처리 중");
  assert.equal(p.label, "일부만 전송");
  assert.equal(u.label, "결과 확인 필요");
  for (const m of [d, p, u]) {
    assert.equal(m.review, true);
    assert.equal(m.chip, "mx-chip-amber");
    assert.ok(m.hint && m.hint.length > 0);
    assert.doesNotMatch(m.hint, /자동으로 다시 보냅|재시도합니다|다시 발송합니다/);
  }
  assert.match(u.hint, /자동으로 다시 보내지 않/);
});

test("목록 밖 값도 숨기지 않고 확인 필요로 분류(누락 방지)", () => {
  const m = statusMeta("sent");
  assert.equal(m.review, true);
  assert.equal(m.chip, "mx-chip-amber");
  assert.match(m.label, /sent/);
  for (const v of ["", "UNKNOWN", "Failed", " failed"]) assert.equal(statusMeta(v).review, true, JSON.stringify(v));
});

test("개수: 6상태 각각 + 확인 필요 합계, 합이 전체와 같다", () => {
  const c = countSubmissionStatuses(rows(["received", "notified", "notified", "failed", "dispatching", "partial", "partial", "unknown", "weird"]));
  assert.deepEqual(c, { total: 9, received: 1, notified: 2, failed: 1, dispatching: 1, partial: 2, unknown: 1, other: 1, review: 5 });
  assert.equal(c.received + c.notified + c.failed + c.review, c.total);
});

test("기존 자료만 있으면 확인 필요 0, 기존 개수 그대로(회귀)", () => {
  const c = countSubmissionStatuses(rows(["received", "notified", "failed", "failed"]));
  assert.deepEqual(c, { total: 4, received: 1, notified: 1, failed: 2, dispatching: 0, partial: 0, unknown: 0, other: 0, review: 0 });
});

test("실패 개수에 새 상태를 섞지 않는다(실패 0으로 숨기지도 않음)", () => {
  const c = countSubmissionStatuses(rows(["partial", "unknown", "dispatching"]));
  assert.equal(c.failed, 0);
  assert.equal(c.review, 3);
});

test("필터: 기존 4개 + 확인 필요, 각 필터 결과", () => {
  assert.deepEqual(STATUS_FILTERS.map((f) => f.value), ["all", "received", "notified", "failed", "review"]);
  const all = ["received", "notified", "failed", "dispatching", "partial", "unknown", "weird"];
  const pick = (f) => all.filter((s) => matchesStatusFilter(s, f));
  assert.deepEqual(pick("all"), all);
  assert.deepEqual(pick("received"), ["received"]);
  assert.deepEqual(pick("notified"), ["notified"]);
  assert.deepEqual(pick("failed"), ["failed"]);
  assert.deepEqual(pick("review"), ["dispatching", "partial", "unknown", "weird"]);
  // 모든 상태가 「전체」가 아닌 필터 중 정확히 하나에 들어간다(누락·중복 0)
  for (const s of all) assert.equal(["received", "notified", "failed", "review"].filter((f) => matchesStatusFilter(s, f)).length, 1, s);
});

test("오류 원문 표시는 기존처럼 failed만(확대 0)", () => {
  assert.equal(showsErrorMessage("failed"), true);
  for (const s of ["received", "notified", "dispatching", "partial", "unknown", "weird"]) assert.equal(showsErrorMessage(s), false, s);
});

test("대시보드 확인 필요 개수용 조건: 기존 3개가 아닌 모든 값", () => {
  assert.equal(REVIEW_STATUS_NOT_IN, "(received,notified,failed)");
});

// ── 실제 페이지 서버 렌더 시험(CRM-20261118-03 P2) ─────────────────────────────────────────────
// 새 패키지 0: 이미 설치된 typescript로 .ts/.tsx를 바꾸고, 로그인(@/lib/access)·DB(@/lib/supabase/server)·
// next/link·server-only만 가짜로 갈아 끼운 뒤 실제 page.tsx를 react-dom/server로 그린다. 실DB·API 0.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname as __dn, join as __jn } from "node:path";
import { fileURLToPath as __f2p } from "node:url";

const PROJECT = __jn(__dn(__f2p(import.meta.url)), "..");
const HOOKS = [
  `import { createRequire } from "node:module";`,
  `import { existsSync, readFileSync } from "node:fs";`,
  `import { pathToFileURL, fileURLToPath } from "node:url";`,
  `const ROOT = ${JSON.stringify(PROJECT.replace(/\\/g, "/"))};`,
  `const req = createRequire(pathToFileURL(ROOT + "/package.json"));`,
  `const ts = req("typescript");`,
  `const FAKES = ${JSON.stringify({
    "@/lib/access": "export async function requireProgramAccess(){ return { id: \"user-1\" }; }",
    "@/lib/supabase/server": "export async function createClient(){ return globalThis.__crmFake.client(); }",
    "next/link": "import { createElement } from \"react\"; export default function Link({ href, className, children }) { return createElement(\"a\", { href, className }, children); }",
    "server-only": "export {};",
  })};`,
  `export async function resolve(spec, ctx, next) {`,
  `  if (ctx.parentURL && ctx.parentURL.startsWith("crmfake:")) return next(spec, { ...ctx, parentURL: pathToFileURL(ROOT + "/package.json").href });`,
  `  if (spec in FAKES) return { url: "crmfake:///" + encodeURIComponent(spec), shortCircuit: true };`,
  `  if (spec.startsWith("@/")) {`,
  `    const base = ROOT + "/" + spec.slice(2);`,
  `    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {`,
  `      if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true };`,
  `    }`,
  `  }`,
  `  return next(spec, ctx);`,
  `}`,
  `export async function load(url, ctx, next) {`,
  `  if (url.startsWith("crmfake:")) return { format: "module", source: FAKES[decodeURIComponent(url.slice(11))], shortCircuit: true };`,
  `  const clean = url.split("?")[0];`,
  `  if (clean.startsWith("file:") && (clean.endsWith(".ts") || clean.endsWith(".tsx")) && !clean.includes("/node_modules/")) {`,
  `    const file = fileURLToPath(clean);`,
  `    const out = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true }, fileName: file });`,
  `    return { format: "module", source: out.outputText, shortCircuit: true };`,
  `  }`,
  `  return next(url, ctx);`,
  `}`,
].join("\n");
register("data:text/javascript," + encodeURIComponent(HOOKS));

/** 가짜 Supabase: 표·필터를 기록하고, 응답은 시험이 정한 함수가 돌려준다. */
function fakeClient(answer) {
  return {
    from(table) {
      const q = { table, ops: [] };
      const b = new Proxy({}, {
        get(_, k) {
          if (k === "then") return (res, rej) => Promise.resolve(answer(q)).then(res, rej);
          if (k === "maybeSingle") return () => Promise.resolve(answer({ ...q, single: true }));
          return (...args) => { q.ops.push([k, ...args]); return b; };
        },
      });
      return b;
    },
  };
}
const isReviewCount = (q) => q.table === "crm_submissions" && q.ops.some((o) => o[0] === "not");
const isFailedCount = (q) => q.table === "crm_submissions" && q.ops.some((o) => o[0] === "eq" && o[1] === "status");
const isList = (q) => q.table === "crm_submissions" && q.ops.some((o) => o[0] === "order");
const isCount = (q) => q.table === "crm_submissions" && q.ops.some((o) => o[0] === "select" && o[2] && o[2].head);

async function renderPage(path, answer) {
  globalThis.__crmFake = { client: () => fakeClient(answer) };
  const server = await import("react-dom/server");
  const render = server.renderToStaticMarkup ?? server.default.renderToStaticMarkup;
  const mod = await import(pathToFileURL(__jn(PROJECT, path)).href);
  return render(await mod.default());
}
const DASH = "app/(dashboard)/dashboard/page.tsx";
const SUBS = "app/(dashboard)/submissions/page.tsx";
const okRow = (id, status) => ({ id, form_source_id: "s1", name: `이름${id}`, phone: null, email: null, status, error_message: status === "failed" ? "SMTP 오류 원문" : null, raw_values: {}, created_at: "2026-11-18T00:00:00Z" });

/** 대시보드 응답: 확인 필요 개수·최근 목록만 시험값, 나머지는 정상 */
const isWeekCount = (q) => q.table === "crm_submissions" && q.ops.some((o) => o[0] === "gte");
const OKC = (n) => ({ data: null, count: n, error: null });
const dashAnswer = ({ review, list, total = OKC(3), week = OKC(2), failed = OKC(1) }) => (q) => {
  if (q.single) return { data: null, error: null };
  if (q.table === "crm_form_sources") return { data: [{ id: "s1", name: "폼1", is_active: true }], error: null };
  if (isReviewCount(q)) return review;
  if (isList(q)) return list;
  if (isFailedCount(q)) return failed;
  if (isWeekCount(q)) return week;
  if (isCount(q)) return total;
  return { data: [], error: null };
};
/** KPI 카드 숫자 칸 글자 */
const kpi = (html, label) => {
  const m = html.match(new RegExp(label + '</p><p class="mx-kpi-value">([^<]*)<'));
  return m ? m[1] : null;
};
const LIST_OK = { data: [okRow("1", "notified"), okRow("2", "failed")], error: null };

test("대시보드: 확인 필요 개수 조회 오류 → 0으로 숨기지 않고 「확인 불가」, 오류 원문 0", async () => {
  const html = await renderPage(DASH, dashAnswer({ review: { data: null, count: null, error: { message: "permission denied for table x" } }, list: LIST_OK }));
  assert.match(html, /확인 필요/);
  assert.match(html, /확인 불가/);
  assert.doesNotMatch(html, /permission denied/);
});

test("대시보드: count null(오류 없음)도 「확인 불가」", async () => {
  const html = await renderPage(DASH, dashAnswer({ review: { data: null, count: null, error: null }, list: LIST_OK }));
  assert.match(html, /확인 불가/);
});

test("대시보드: 정상 0이면 확인 필요 카드 숨김(기존 배치), 양수면 그 숫자", async () => {
  const zero = await renderPage(DASH, dashAnswer({ review: { data: null, count: 0, error: null }, list: LIST_OK }));
  assert.doesNotMatch(zero, /확인 필요/);
  assert.match(zero, /발송 실패/);
  const two = await renderPage(DASH, dashAnswer({ review: { data: null, count: 2, error: null }, list: LIST_OK }));
  assert.match(two, /확인 필요<\/p><p class="mx-kpi-value">2</);
});

test("대시보드: 최근 접수 조회 실패 → 「없어요」 대신 조회 실패·새로고침 안내, 오류 원문 0", async () => {
  const html = await renderPage(DASH, dashAnswer({ review: { data: null, count: 0, error: null }, list: { data: null, error: { message: "relation does not exist" } } }));
  assert.doesNotMatch(html, /아직 접수된 신청이 없어요/);
  assert.match(html, /불러오지 못했습니다/);
  assert.match(html, /새로고침/);
  assert.doesNotMatch(html, /relation does not exist/);
});

test("대시보드: 정상 목록은 기존처럼 표·상태 라벨", async () => {
  const html = await renderPage(DASH, dashAnswer({ review: { data: null, count: 0, error: null }, list: LIST_OK }));
  assert.match(html, /이름1/);
  assert.match(html, /발송 완료/);
  assert.doesNotMatch(html, /불러오지 못했습니다/);
});

/** 접수 내역 응답 */
const subsAnswer = (list) => (q) => (q.table === "crm_form_sources" ? { data: [{ id: "s1", name: "폼1" }], error: null } : list);

test("접수 내역: 목록 조회 실패 → 빈 목록·0 KPI 대신 조회 실패 안내, 오류 원문 0", async () => {
  const html = await renderPage(SUBS, subsAnswer({ data: null, error: { message: "JWT expired secret-detail" } }));
  assert.doesNotMatch(html, /아직 접수된 신청이 없습니다/);
  assert.doesNotMatch(html, /표시된 접수/);
  assert.match(html, /불러오지 못했습니다/);
  assert.match(html, /새로고침/);
  assert.doesNotMatch(html, /JWT expired|secret-detail/);
});

test("접수 내역: 정상 빈 목록은 기존 첫 접수 안내 그대로", async () => {
  const html = await renderPage(SUBS, subsAnswer({ data: [], error: null }));
  assert.match(html, /아직 접수된 신청이 없습니다/);
  assert.doesNotMatch(html, /불러오지 못했습니다/);
});

test("접수 내역: 6상태 + 미래 값 → KPI·확인 필요 개수, 실패 원문은 failed 1건만", async () => {
  const rows = ["received", "notified", "failed", "dispatching", "partial", "unknown", "future_value"].map((s, i) => okRow(String(i), s));
  const html = await renderPage(SUBS, subsAnswer({ data: rows, error: null }));
  assert.match(html, /확인 필요<\/p><p class="mx-kpi-value">4</);
  assert.match(html, /발송 실패<\/p><p class="mx-kpi-value">1</);
  assert.match(html, /확인 필요\(future_value\)/);
  assert.equal((html.match(/SMTP 오류 원문/g) ?? []).length, 1);
});

test("판정 함수: 개수·목록", () => {
  assert.deepEqual(reviewCountView({ count: null, error: null }), { kind: "unavailable" });
  assert.deepEqual(reviewCountView({ count: 3, error: { message: "x" } }), { kind: "unavailable" });
  assert.deepEqual(reviewCountView({ count: 0, error: null }), { kind: "hidden" });
  assert.deepEqual(reviewCountView({ count: 2, error: null }), { kind: "value", value: 2 });
  assert.equal(listLoadFailed({ data: [], error: null }), false);
  assert.equal(listLoadFailed({ data: null, error: null }), true);
  assert.equal(listLoadFailed({ data: [], error: { message: "x" } }), true);
});


// ── CRM-20261118-04: 전체·최근 7일·발송 실패 개수도 조회 오류를 0으로 보이지 않기 ─────────────────
const REVIEW0 = { data: null, count: 0, error: null };
const BAD = [
  ["오류", { data: null, count: null, error: { message: "timeout secret-x" } }],
  ["오류+숫자", { data: null, count: 5, error: { message: "boom" } }],
  ["count null", { data: null, count: null, error: null }],
  ["음수", { data: null, count: -1, error: null }],
  ["NaN", { data: null, count: Number.NaN, error: null }],
  ["Infinity", { data: null, count: Number.POSITIVE_INFINITY, error: null }],
  ["소수", { data: null, count: 1.5, error: null }],
  ["문자열", { data: null, count: "3", error: null }],
];
const CARDS = [
  ["total", "전체 접수"],
  ["week", "최근 7일 접수"],
  ["failed", "발송 실패"],
];

for (const [key, label] of CARDS) {
  for (const [name, res] of BAD) {
    test(`대시보드 ${label}: ${name} → 「확인 불가」, 다른 카드·목록은 정상, 오류 원문 0`, async () => {
      const html = await renderPage(DASH, dashAnswer({ review: REVIEW0, list: LIST_OK, [key]: res }));
      assert.equal(kpi(html, label), "확인 불가");
      for (const [k2, l2] of CARDS) if (k2 !== key) assert.notEqual(kpi(html, l2), "확인 불가", l2);
      assert.match(html, /이름1/); // 최근 목록 그대로
      assert.doesNotMatch(html, /secret-x|boom/);
      assert.doesNotMatch(html, /확인 필요/); // 확인 필요 0은 숨김 그대로
    });
  }
  test(`대시보드 ${label}: 정상 0은 0, 양수는 그 숫자`, async () => {
    assert.equal(kpi(await renderPage(DASH, dashAnswer({ review: REVIEW0, list: LIST_OK, [key]: OKC(0) })), label), "0");
    assert.equal(kpi(await renderPage(DASH, dashAnswer({ review: REVIEW0, list: LIST_OK, [key]: OKC(7) })), label), "7");
  });
}

test("대시보드: 세 개수 모두 정상이면 기존 값 그대로(3·2·1), 확인 필요 양수·목록 오류와 함께여도 각자 표시", async () => {
  const ok = await renderPage(DASH, dashAnswer({ review: REVIEW0, list: LIST_OK }));
  assert.deepEqual([kpi(ok, "전체 접수"), kpi(ok, "최근 7일 접수"), kpi(ok, "발송 실패")], ["3", "2", "1"]);
  const mix = await renderPage(DASH, dashAnswer({ review: OKC(4), list: { data: null, error: { message: "x" } } }));
  assert.equal(kpi(mix, "확인 필요"), "4");
  assert.equal(kpi(mix, "발송 실패"), "1");
  assert.match(mix, /최근 접수를 불러오지 못했습니다/);
});

test("확인 필요 개수도 비정상 숫자(음수·NaN·소수)는 확인 불가", () => {
  for (const c of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    assert.deepEqual(reviewCountView({ count: c, error: null }), { kind: "unavailable" }, String(c));
  }
});

test("countView: 정상 0 이상 정수만 값", () => {
  assert.deepEqual(countView({ count: 0, error: null }), { kind: "value", value: 0 });
  assert.deepEqual(countView({ count: 12, error: null }), { kind: "value", value: 12 });
  for (const [, res] of BAD) assert.deepEqual(countView(res), { kind: "unavailable" });
});
