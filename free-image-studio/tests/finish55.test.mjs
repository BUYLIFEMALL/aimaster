// 5-5 마무리: 확정된 8GB 안내, 접수 기록 손상 안내와 복구, 연동 메뉴·매뉴얼, 좁은 화면·키보드 상태(소스·모의 검사).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EngineError, createEngineClient } from "../src/lib/engine.ts";
import { API_SETTINGS_PATH, KEY_GUIDES, LEDGER_BROKEN, MANUAL_CAUTIONS, MANUAL_FAQ, MANUAL_STEPS, MANUAL_TIPS, MEMORY_FAIL_NOTICE, SPEC_NOTICE_8GB, guidePath, mainSiteUrl } from "../src/lib/studio/notices.ts";
import { CONVERT_PROVIDER_ORDER } from "../src/lib/convert/models.ts";
import { localLock } from "../src/lib/studio/lock.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const LEDGER = `fis.submissions.v1:${A}`;
const BROKEN = `fis.submissions.broken.v1:${A}`;
const read = (rel) => readFile(new URL(`../src/${rel}`, import.meta.url), "utf8");
const isPost = (call) => call.method === "POST" && call.path === "/queue";
const OK = { title: "t", prompt: "a red apple on a table" };
async function paired(engine, storage = memoryStorage(), extra = {}) {
  const c = createEngineClient({ memberId: A, storage, fetch: engine.fetch, ...extra });
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}

test("8GB 안내 — 주인님이 확정한 문구 그대로, 한 곳에만 두고 시작 화면과 매뉴얼이 가져다 쓴다", async () => {
  assert.equal(SPEC_NOTICE_8GB, "8GB 그래픽카드에서 동작을 확인했습니다. 다른 프로그램이 그래픽 메모리를 많이 쓰고 있으면 실패할 수 있으니, 그릴 때는 게임·영상 편집 프로그램을 닫아 주세요.");
  assert.equal(MEMORY_FAIL_NOTICE, "그래픽 메모리가 부족했습니다. 다른 프로그램을 닫고 다시 시도하거나, 한 단계 가벼운 구성으로 바꿔 주세요.");
  // 화면에 넣지 않기로 한 말·확정되지 않은 표현이 없다
  for (const t of [SPEC_NOTICE_8GB, MEMORY_FAIL_NOTICE, ...MANUAL_CAUTIONS, ...MANUAL_TIPS, ...MANUAL_FAQ.flatMap((f) => [f.q, f.a])]) {
    assert.ok(!/한 대|1대|지원합니다|보장|권장 사양|최소 사양/.test(t), t.slice(0, 40));
    assert.ok(!/\b(10|12|16|24)\s?GB\b/.test(t), t.slice(0, 40));
  }
  const start = await read("components/studio/StartScreen.tsx");
  assert.ok(start.includes('import { SPEC_NOTICE_8GB } from "@/lib/studio/notices";') && start.includes("{SPEC_NOTICE_8GB}"));
  assert.ok(!/\b8\s?GB\b/.test(start), "시작 화면은 숫자를 직접 적지 않는다(값 이름은 제외)");
  assert.ok(MANUAL_CAUTIONS.includes(SPEC_NOTICE_8GB));
  assert.ok(MANUAL_FAQ.some((f) => f.a.includes(SPEC_NOTICE_8GB)) && MANUAL_FAQ.some((f) => f.a.includes(MEMORY_FAIL_NOTICE)));
});

test("접수 기록 손상 — 확인한 경우에만 옆 칸으로 옮기고 빈 기록으로 다시 시작한다. 엔진에는 아무것도 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await c.submit(OK);
  const good = storage.map.get(LEDGER);
  // 멀쩡한 기록은 건드리지 않는다
  assert.equal(c.ledgerBroken(), false);
  assert.equal(await c.setAsideBrokenLedger(true), false);
  assert.equal(storage.map.get(LEDGER), good);
  assert.equal(storage.map.has(BROKEN), false);
  // 확인 없이는 하지 않는다
  for (const ack of [false, undefined, "yes", 1]) await assert.rejects(c.setAsideBrokenLedger(ack), (e) => e instanceof EngineError && e.kind === "invalid");
  // 손상: 새 접수가 막히고, 옮긴 뒤에는 다시 된다
  const raw = '[{"requestId":"bad-request-00001","task":null}';
  storage.map.set(LEDGER, raw);
  assert.equal(c.ledgerBroken(), true);
  const calls = engine.st.calls.length;
  const blocked = await c.submit({ title: "t2", prompt: "a blue bird on a branch" }).then(() => null, (e) => e);
  assert.ok(blocked instanceof EngineError && blocked.kind === "storage" && blocked.beforeSend === true);
  assert.equal(await c.setAsideBrokenLedger(true), true);
  assert.equal(storage.map.get(LEDGER), "[]");
  const kept = JSON.parse(storage.map.get(BROKEN));
  assert.equal(kept.raw, raw, "손상된 내용은 버리지 않고 옆 칸에 둔다");
  assert.ok(typeof kept.at === "number");
  assert.equal(engine.st.calls.length, calls, "엔진에는 아무것도 보내지 않았다");
  assert.equal(c.ledgerBroken(), false);
  assert.equal((await c.submit({ title: "t2", prompt: "a blue bird on a branch" })).state, "accepted");
  assert.equal(engine.st.calls.filter(isPost).length, 2);
  // 옮기지 못하면(저장 실패) 원래 칸을 건드리지 않는다
  storage.map.set(LEDGER, raw);
  storage.failSet = (k) => k === BROKEN;
  await assert.rejects(c.setAsideBrokenLedger(true), (e) => e instanceof EngineError && e.kind === "storage");
  assert.equal(storage.map.get(LEDGER), raw);
  storage.failSet = null;
  // 읽기조차 안 되면 옮기지 않는다
  const fl = { getItem: (k) => { if (k === LEDGER) throw new Error("read"); return storage.getItem(k); }, setItem: (k, v) => storage.setItem(k, v), removeItem: (k) => storage.removeItem(k) };
  const c2 = createEngineClient({ memberId: A, storage: fl, fetch: engine.fetch });
  assert.equal(c2.ledgerBroken(), true);
  await assert.rejects(c2.setAsideBrokenLedger(true), (e) => e instanceof EngineError && e.kind === "storage");
  assert.equal(storage.map.get(LEDGER), raw);
  // 다시 들어갈 수 없는 잠금으로도 끝난다
  const { c: c3, storage: s3 } = await paired(createMockEngine(), memoryStorage(), { lock: localLock });
  s3.map.set(LEDGER, "{broken");
  assert.equal(await c3.setAsideBrokenLedger(true), true);
});

test("접수 기록 손상 안내 화면 — 만들기·작업 기록에 붙고, 새로 시작은 확인 창을 거친다", async () => {
  for (const key of ["title", "body", "retry", "reset", "confirmTitle", "confirmBody", "confirm", "cancel", "done"]) assert.ok(typeof LEDGER_BROKEN[key] === "string" && LEDGER_BROKEN[key].length > 0, key);
  assert.ok(LEDGER_BROKEN.body.includes("두 번 그리지 않기") && LEDGER_BROKEN.body.includes("엔진 창"));
  assert.ok(LEDGER_BROKEN.confirmBody.includes("따로 옮겨") && LEDGER_BROKEN.confirmBody.includes("엔진 창"));
  const notice = await read("components/studio/LedgerNotice.tsx");
  assert.ok(notice.includes("engine.ledgerBroken()"));
  assert.equal(notice.split("setAsideBrokenLedger(true)").length - 1, 1);
  assert.ok(/role="alertdialog" aria-labelledby="ledger-ask-title" aria-describedby="ledger-ask-desc"/.test(notice));
  assert.ok(notice.indexOf("setAsking(true)") > 0 && notice.includes("onClick={() => void reset()}"), "바로 지우는 버튼이 아니라 확인 창을 먼저 연다");
  assert.ok(notice.includes('if (e.key === "Escape") setAsking(false);') && notice.includes("cancelRef.current?.focus()"), "Esc로 닫고, 열리면 그만두기에 초점");
  assert.ok(!/submitRemaining|\.submit\(|\.resend\(|fetch\(/.test(notice), "안내 화면은 엔진·AI를 부르지 않는다");
  for (const screen of ["CreateScreen", "JobsScreen"]) {
    const s = await read(`components/studio/${screen}.tsx`);
    assert.ok(s.includes('import { LedgerNotice } from "./LedgerNotice";') && s.includes("<LedgerNotice engine={engine}"), screen);
  }
});

test("연동 메뉴 — 키 입력 칸 없이 등록 여부만, 등록은 메인 사이트 한 곳, 하단 연동 매뉴얼", async () => {
  assert.equal(API_SETTINGS_PATH, "/api-settings");
  assert.equal(mainSiteUrl(undefined, API_SETTINGS_PATH), "https://www.buylife.xyz/api-settings");
  assert.equal(mainSiteUrl("https://example.test/", "/guides"), "https://example.test/guides");
  assert.deepEqual(KEY_GUIDES.map((g) => g.provider), CONVERT_PROVIDER_ORDER, "선택 칸과 같은 순서");
  for (const g of KEY_GUIDES) assert.ok(g.guideId === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(g.guideId), g.label);
  assert.equal(guidePath(null), "/guides");
  assert.equal(guidePath(KEY_GUIDES[0].guideId), `/guides/${KEY_GUIDES[0].guideId}`);
  const s = await read("components/studio/SettingsScreen.tsx");
  assert.ok(s.includes("⚙ API키등록·플랫폼연동") && s.includes("📖 연동 매뉴얼"));
  assert.ok(s.includes('"platform-guide-popup"') && s.includes("width=720,height=860"), "매뉴얼은 옆에 띄우는 팝업창");
  assert.ok(!/<input|<textarea|type="password"/.test(s), "키를 적는 칸이 없다");
  assert.ok(s.includes("fetchConvertStatus(fetch)") && !/requestConversion|api_key|getUserApiKey/.test(s), "등록 여부만 읽고 AI를 부르지 않는다");
  assert.ok(s.includes("mainSiteUrl(MAIN, API_SETTINGS_PATH)") && s.includes('target="_blank"'));
  assert.ok(s.includes('aria-live="polite"') && s.includes('role="alert"'));
  // 페이지는 이용 권한 판정 뒤에만 그린다
  for (const page of ["settings", "guide"]) {
    const p = await read(`app/(dashboard)/${page}/page.tsx`);
    assert.ok(p.includes("await requireProgramAccess();"), page);
  }
  const layout = await read("app/(dashboard)/layout.tsx");
  assert.ok(layout.includes('export const dynamic = "force-dynamic"') && layout.includes('export const fetchCache = "force-no-store"'));
});

test("사용 매뉴얼 — 네 단계 카드·팁·주의·자주 묻는 질문, 실제 메뉴로 이어진다", async () => {
  assert.deepEqual(MANUAL_STEPS.map((s) => s.no), [1, 2, 3, 4]);
  assert.deepEqual(MANUAL_STEPS.map((s) => s.href), ["/start", "/start", "/create", "/jobs"]);
  for (const s of MANUAL_STEPS) assert.ok(s.emoji && s.title && s.minutes && s.lines.length >= 2 && s.action, s.title);
  assert.ok(MANUAL_TIPS.length >= 3 && MANUAL_CAUTIONS.length >= 3 && MANUAL_FAQ.length >= 6);
  assert.equal(new Set(MANUAL_FAQ.map((f) => f.q)).size, MANUAL_FAQ.length);
  const topics = MANUAL_FAQ.map((f) => f.q).join(" ");
  for (const word of ["엔진", "PC", "메모리", "한글", "보관"]) assert.ok(topics.includes(word), word);
  assert.ok(MANUAL_FAQ.find((f) => f.q.includes("한글")).a.includes("유료") , "비용이 드는 기능임을 밝힌다");
  assert.ok(MANUAL_FAQ.find((f) => f.q.includes("보관")).a.includes("서버에는 저장하지 않습니다"));
  const g = await read("components/studio/GuideScreen.tsx");
  for (const part of ["MANUAL_STEPS.map", "MANUAL_TIPS.map", "MANUAL_CAUTIONS.map", "MANUAL_FAQ.map", "💡", "⚠️", "<details", "<summary"]) assert.ok(g.includes(part), part);
  assert.ok(g.includes("grid-cols-1 gap-3 md:grid-cols-2"), "좁은 화면에서는 한 줄에 하나");
  assert.ok(!g.includes('"use client"'), "움직이는 부분이 없어 서버에서 그린다");
  // 다른 화면과 같은 배경·같은 테마 값만 쓴다
  for (const file of ["GuideScreen", "SettingsScreen", "LedgerNotice"]) {
    const src = await read(`components/studio/${file}.tsx`);
    assert.ok(src.includes("var(--surface)") && src.includes("var(--line)"), file);
    assert.ok(!/bg-white|bg-black|bg-neutral-|bg-slate-|#[0-9a-fA-F]{6}/.test(src), `${file}: 다른 배경색을 쓰지 않는다`);
  }
});

test("좁은 화면·키보드 — 위쪽 접는 메뉴, 초점 표시, 눌림·펼침 상태 알림, 누르는 높이", async () => {
  const css = await read("app/globals.css");
  assert.ok(/:focus-visible \{\s*outline: 2px solid var\(--accent\);/.test(css), "키보드 초점이 보인다");
  assert.ok(/@media \(max-width: 767px\) \{[\s\S]*?\.app-shell \{\s*display: block;/.test(css));
  assert.ok(/@media \(max-width: 767px\) \{[\s\S]*?min-height: 40px;/.test(css), "손가락으로 누르는 높이");
  assert.ok(css.includes("overflow-wrap: anywhere;") && css.includes("prefers-reduced-motion: reduce"));
  assert.ok(!/outline:\s*(none|0)\b/.test(css), "초점 표시를 끄지 않는다");
  const sidebar = await read("components/Sidebar.tsx");
  assert.ok(sidebar.includes('aria-expanded={open} aria-controls="top-menu"') && sidebar.includes('id="top-menu"'));
  assert.ok(sidebar.includes('aria-current={pathname === m.href ? "page" : undefined}'));
  assert.ok(sidebar.includes('if (e.key === "Escape") setOpen(false);'), "Esc로 메뉴를 닫는다");
  assert.ok(sidebar.includes("max-h-[calc(100vh-3.5rem)] overflow-y-auto"), "메뉴가 길어도 화면 안에서 굴린다");
  assert.ok(sidebar.includes("h-10 w-10"), "메뉴 버튼 40px");
  // 화면마다: 고르는 버튼은 눌림 상태를, 오류는 알림을, 확인 창은 제목·설명을 알린다
  const create = await read("components/studio/CreateScreen.tsx");
  assert.ok((create.match(/aria-pressed=/g) ?? []).length >= 4);
  assert.ok((create.match(/role="alertdialog" aria-labelledby=/g) ?? []).length >= 2);
  assert.ok(create.includes('htmlFor="lines"') && create.includes('id="lines"') && create.includes('htmlFor="seed"'));
  assert.ok(create.includes("grid-cols-2 gap-2 md:grid-cols-4"), "용도 카드: 좁은 화면 두 열");
  const panel = await read("components/studio/ConvertPanel.tsx");
  assert.ok(panel.includes('htmlFor="convert-model"') && panel.includes('role="alertdialog"') && panel.includes('aria-live="polite"'));
  const jobs = await read("components/studio/JobsScreen.tsx");
  assert.ok(/role="alert"|aria-live=/.test(jobs));
  const start = await read("components/studio/StartScreen.tsx");
  assert.ok(start.includes('aria-label="연결 코드 6자리"') && start.includes('aria-describedby="not-ready"'));
  // 꺼진 동작은 링크가 아니라 꺼진 버튼으로(키보드로 넘어가지 못하게) — 화면 전체에서 클릭만 되는 div·span 버튼이 없다
  for (const file of ["CreateScreen", "JobsScreen", "StartScreen", "ConvertPanel", "SettingsScreen", "LedgerNotice"]) {
    const src = await read(`components/studio/${file}.tsx`);
    assert.ok(!/<(div|span|p|li)[^>]*\sonClick=/.test(src), `${file}: 누를 수 있는 것은 button·a만`);
    assert.ok(!/tabIndex=\{?-1/.test(src), `${file}: 키보드에서 빠진 조작이 없다`);
    for (const m of src.matchAll(/<button(?![^>]*type=)[^>]*>/g)) assert.fail(`${file}: type 없는 button ${m[0].slice(0, 60)}`);
  }
});
