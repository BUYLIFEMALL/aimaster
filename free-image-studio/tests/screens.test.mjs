// 화면 파일의 연결 계약 — 설치 없이(실행 없이) 소스로 확인할 수 있는 것만 본다. 실제 화면 모양은 설치 뒤 실제 창에서 검수한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const read = (p) => readFile(new URL(`../src/${p}`, import.meta.url), "utf8");
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)])))).flat();

test("세 화면은 작업 화면 묶음 안에 있고, 회원 번호를 서버에서 받아 넘긴다", async () => {
  for (const [route, comp] of [["start", "StartScreen"], ["create", "CreateScreen"], ["jobs", "JobsScreen"]]) {
    const page = await read(`app/(dashboard)/${route}/page.tsx`);
    assert.match(page, /const user = await requireProgramAccess\(\);/, route);
    assert.match(page, new RegExp(`<${comp} memberId=\\{user\\.id\\} />`), route);
    assert.ok(!/"use client"/.test(page), "페이지는 서버 컴포넌트");
    const screen = await read(`components/studio/${comp}.tsx`);
    assert.match(screen, /^"use client";/);
    assert.match(screen, /const engine = useEngine\(memberId\);/, "엔진 연결은 회원 번호로 만든 연결 계층 하나로만");
  }
  assert.match(await read("app/(dashboard)/page.tsx"), /redirect\("\/start"\)/);
});

test("화면은 엔진 주소를 직접 부르지 않고, 회원 전환 때 연결 계층을 버린다", async () => {
  for (const file of await walk(new URL("../src/components/", import.meta.url))) {
    const text = await readFile(file, "utf8");
    assert.ok(!/\bfetch\(/.test(text), `${file.pathname}: 화면에서 fetch를 직접 쓰지 않는다`);
    assert.ok(!/127\.0\.0\.1|localhost|ENGINE_URL/.test(text), `${file.pathname}: 엔진 주소를 화면에 적지 않는다`);
  }
  const hook = await read("components/studio/useEngine.ts");
  assert.match(hook, /createEngineClient\(\{ memberId, storage: window\.localStorage \}\)/);
  assert.match(hook, /c\.dispose\(\);/);
  assert.match(hook, /\}, \[memberId\]\);/, "회원 번호가 바뀌면 새로 만든다");
});

test("좌측 메뉴: 세 화면 + 다른 프로그램 보기 고정 주소, 데스크톱·모바일이 같은 목록", async () => {
  const sidebar = await read("components/Sidebar.tsx");
  assert.deepEqual([...sidebar.matchAll(/\{ href: "(\/[a-z]+)", label: "([^"]+)" \}/g)].map((m) => [m[1], m[2]]), [["/start", "🚀 시작하기"], ["/create", "🎨 만들기"], ["/jobs", "📋 작업 기록"]]);
  assert.match(sidebar, /href="https:\/\/www\.buylife\.xyz\/programs"/);
  assert.match(sidebar, /hidden h-screen[^"]*md:flex/);
  assert.match(sidebar, /md:hidden/);
  assert.equal((sidebar.match(/\{nav\}/g) ?? []).length, 2, "같은 메뉴 묶음을 두 곳에서 쓴다");
});

test("만들기: 계획에 문제가 있거나 맡기다 만 장이 있으면 일괄 시작을 막는다", async () => {
  const s = await read("components/studio/CreateScreen.tsx");
  assert.ok(s.includes("const canStart = !!engine && !running && left === 0 && stuck === 0 && pending.uncertain === 0 && plan.items.length > 0;"), "이어 맡길 장·확인이 필요한 장·받았는지 모르는 장이 남아 있으면 새 묶음을 시작하지 못한다");
  // 받았는지 모르는 장은 확인 창을 거쳐야만 목록에서 지운다
  assert.ok(s.includes("discardUncertain(engine, window.localStorage, true);") && s.split("discardUncertain(").length - 1 === 1 && s.includes("onClick={() => setDropAsk(true)}") && s.includes('<button type="button" onClick={dropUncertain}'));
  // 멈춘 이유(잠금 수단 없음 포함)를 화면에 보여 준다
  assert.ok(s.includes("중간에 멈췄습니다 — ${result.stopped.message}"));
  // 연결이 바뀐 장·예전 형식의 장은 확인 창을 거쳐야만 새로 맡긴다
  assert.ok(s.includes("adoptDraft(engine, window.localStorage, true);"));
  assert.equal(s.split("adoptDraft(").length - 1, 1);
  assert.ok(s.indexOf("const adopt = () =>") < s.indexOf("adoptDraft(engine") && s.includes("onClick={() => setAdoptAsk(true)}") && s.includes('<button type="button" onClick={adopt}'), "버튼 → 확인 창 → 확인했을 때만");
  assert.match(s, /disabled=\{!canStart\}/);
  assert.match(s, /if \(plan\.errors\.length \|\| !plan\.items\.length\) return;/, "버튼을 우회해도 문제 있는 계획은 맡기지 않는다");
  assert.match(s, /saveDraft\(window\.localStorage, memberId, plan\.items\);/);
  assert.match(s, /submitRemaining\(engine, window\.localStorage,/);
  assert.match(s, /지금 \{plan\.total\}장 · \{BATCH_MAX\}장까지/);
  assert.ok(!/client\.submit|engine\.submit/.test(s), "화면이 한 장씩 직접 맡기지 않는다(묶음 로직만 쓴다)");
});

test("작업 기록: 목록 갱신은 읽기만, 새 접수가 생기는 동작은 버튼에서만, 새로 맡기기는 확인 창을 거친다", async () => {
  const s = await read("components/studio/JobsScreen.tsx");
  const refresh = s.slice(s.indexOf("const refresh = useCallback"), s.indexOf("// 화면이 보이는 동안만"));
  assert.match(refresh, /engine\.listJobs\(\)/);
  assert.ok(!/submit|resend|replace\(|restart\(|again\(|confirm\(|cancel|dismiss|forget/.test(refresh), "자동 갱신에서는 엔진에 쓰는 동작이 없다");
  const effects = s.slice(s.indexOf("useEffect(() => {\n    void refresh();"), s.indexOf("const withRow"));
  assert.ok(!/submit|resend|replace\(|restart\(|again\(|engine\.confirm|cancel/.test(effects), "화면이 스스로 다시 맡기거나 취소하지 않는다");
  assert.match(effects, /engine\s*\.fetchArt\(r\.jobId\)/, "미리보기는 완료된 그림을 읽기만");
  // 새로 맡기기: 버튼 → 확인 창 → 확인했을 때만 replace(…, true)
  const replaceBranch = s.slice(s.indexOf('if (action === "replace") {'), s.indexOf("void withRow(id, async () => {"));
  assert.match(replaceBranch, /return setConfirmReplace\(id\);/, "새로 맡기기 버튼은 확인 창만 연다");
  assert.ok(!/replace\(engine|submit/.test(replaceBranch), "버튼을 누른 것만으로는 맡기지 않는다");
  assert.equal((s.match(/replace\(engine, id, true\)/g) ?? []).length, 1);
  assert.match(s, /const doReplace = /);
  assert.match(s, /role="alertdialog"/);
  assert.match(s, /같은 그림이 두 번 나올 수 있습니다/);
  // 저장은 중복 방지 저장 기록을 거친다
  assert.match(s, /saves\.saveOnce\(row, \(\) => engine\.fetchArt\(jobId\), write, \{ force \}\)/);
  assert.ok(!/a\.download[^;]*;[^]*saveOnce/.test(s.slice(s.indexOf("const act"))), "저장 버튼이 중복 방지를 건너뛰지 않는다");
  // 다시 시작은 목록에서 확인된 작업만(목록을 넘겨 준다)
  assert.ok(s.includes("await restart(engine, id)") && s.includes("await again(engine, id)") && s.includes("await cancelRow(engine, id)") && s.includes("await dismissRow(engine, id)") && s.includes("await cancelAll(engine)"), "화면이 갖고 있던 목록·작업 번호를 넘기지 않는다(실행 직전에 새로 읽는다)");
  assert.ok(!/engine\.cancel\(|engine\.dismiss\(/.test(s), "화면이 작업 번호로 직접 취소·지우기를 부르지 않는다");
  // 기록을 지우거나 새로 맡길 때 맡기다 만 묶음에서도 뺀다
  assert.equal(s.split("dropFromDraft(window.localStorage, memberId, id)").length - 1, 2, "접수 번호로만 뺀다(내용으로 찾지 않는다)");
  // 처리 중인 줄은 버튼을 막는다
  assert.match(s, /disabled=\{working\.has\(r\.requestId\)\}/);
});

test("화면 문구: 결정 전 항목이 없다 — 사양 지원 문구·요금. 한글 변환·AI 키 문구는 변환 칸과 변환 경로에만 있다", async () => {
  for (const file of [...(await walk(new URL("../src/components/", import.meta.url))), ...(await walk(new URL("../src/lib/studio/", import.meta.url))), ...(await walk(new URL("../src/app/", import.meta.url)))]) {
    const text = await readFile(file, "utf8");
    assert.ok(!/\b\d+\s?GB\b|그래픽 메모리 \d|권장 사양|최소 사양/.test(text.replace(/수 GB/g, "")), `${file.pathname}: 사양 지원 문구`);
    // 한글 변환(5-4)은 변환 칸(ConvertPanel)과 변환 경로(api/convert)에만 둔다. 그 밖의 화면·로직에는 여전히 없어야 한다.
    const convertFile = /\/components\/studio\/ConvertPanel\.tsx$|\/app\/api\/convert\//.test(file.pathname);
    assert.ok(!/gpt-|claude-|gemini-/.test(text), `${file.pathname}: 글 모델 이름`);
    if (!convertFile) assert.ok(!/OpenAI|Anthropic|한글.{0,6}변환|번역/.test(text), `${file.pathname}: 한글 변환`);
    assert.ok(!/무료 배지|요금|결제|구독/.test(text), `${file.pathname}: 요금`);
    if (!convertFile) assert.ok(!/user_api_keys|API 키/.test(text), `${file.pathname}: 키 입력`);
    // 이 프로그램에는 키를 적는 칸을 만들지 않는다(등록은 메인 사이트 한 곳).
    assert.ok(!/name="api_?key"|id="api_?key"|placeholder="sk-/i.test(text), `${file.pathname}: 키 입력 칸`);
  }
});
