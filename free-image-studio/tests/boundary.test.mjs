// 린트 오류 11건 보완(Master msg_ee7b28acb9b7): 회원별 저장·복원과 그리는 경계. 회원 전환·늦은 복원·비활성 초기화 보호.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClientRegistry } from "../src/lib/studio/clientRegistry.ts";
import { createEngineClient } from "../src/lib/engine.ts";
import { loadCompose, saveCompose } from "../src/lib/studio/batch.ts";
import { loadConvertSettings, saveConvertSettings } from "../src/lib/convert/client.ts";
import { createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const read = (rel) => readFile(new URL(`../src/${rel}`, import.meta.url), "utf8");

/** 만들어진 것과 정리된 것을 세는 등록부 */
function tracked() {
  const made = [];
  const registry = createClientRegistry((memberId) => {
    const item = { memberId, disposed: 0, dispose() { item.disposed += 1; } };
    made.push(item);
    return item;
  });
  return { made, registry };
}

test("회원 전환 — 앞 회원의 연결은 정리되고 다음 회원의 것만 남는다. 정리된 것은 다시 돌려주지 않는다", () => {
  const { made, registry } = tracked();
  assert.equal(registry.get(A), null, "쓰기 시작하기 전에는 없다(서버에서 그릴 때·화면이 붙기 전)");
  const offA = registry.subscribe(A);
  assert.equal(registry.get(A), made[0]);
  assert.equal(registry.get(B), null, "다른 회원의 것은 보이지 않는다");
  // 회원이 바뀌었다: 앞 회원을 놓고 새 회원을 잡는다(React가 사용 등록을 바꾸는 순서)
  offA();
  const offB = registry.subscribe(B);
  assert.equal(made[0].disposed, 1, "앞 회원의 연결은 정리됐다");
  assert.equal(registry.get(A), null, "정리된 것을 돌려주지 않는다");
  assert.equal(registry.get(B), made[1]);
  assert.equal(made[1].memberId, B);
  // 다시 앞 회원으로 돌아오면 새로 만든다(정리된 것을 되살리지 않는다)
  offB();
  const offA2 = registry.subscribe(A);
  assert.equal(made.length, 3);
  assert.notEqual(registry.get(A), made[0]);
  assert.equal(made[0].disposed, 1, "한 번만 정리된다");
  offA2();
  assert.equal(registry.size, 0);
  assert.deepEqual(made.map((m) => m.disposed), [1, 1, 1]);
});

test("비활성 초기화 보호 — 놓았다가 곧바로 다시 잡아도(개발 모드의 두 번 실행) 정리된 연결을 쓰지 않는다. 같은 것을 두 번 놓아도 한 번만", () => {
  const { made, registry } = tracked();
  // 개발 모드는 화면을 붙였다 뗐다 다시 붙인다
  const off1 = registry.subscribe(A);
  off1();
  const off2 = registry.subscribe(A);
  assert.equal(made.length, 2);
  assert.equal(made[0].disposed, 1);
  assert.equal(made[1].disposed, 0, "지금 쓰는 것은 살아 있다");
  assert.equal(registry.get(A), made[1]);
  // 늦게 도착한 앞 화면의 정리(같은 것을 또 놓음)는 지금 것에 영향이 없다
  off1();
  off1();
  assert.equal(made[1].disposed, 0);
  assert.equal(registry.get(A), made[1]);
  // 같은 회원을 두 화면이 함께 쓰면 하나를 나눠 쓰고, 마지막이 놓을 때 정리된다
  const off3 = registry.subscribe(A);
  assert.equal(made.length, 2, "새로 만들지 않는다");
  off2();
  assert.equal(made[1].disposed, 0, "아직 쓰는 화면이 있다");
  assert.equal(registry.get(A), made[1]);
  off3();
  assert.equal(made[1].disposed, 1);
  assert.equal(registry.get(A), null);
  // 만들다 실패하면 등록되지 않는다(반쯤 만든 것이 남지 않는다)
  let fail = true;
  const flaky = createClientRegistry(() => { if (fail) throw new Error("no storage"); return { dispose() {} }; });
  assert.throws(() => flaky.subscribe(A));
  assert.equal(flaky.get(A), null);
  assert.equal(flaky.size, 0);
  fail = false;
  flaky.subscribe(A);
  assert.notEqual(flaky.get(A), null);
});

test("늦은 응답 — 정리된 회원의 연결이 보낸 요청은 그 뒤 도착해도 버려지고, 다음 회원의 것은 정상으로 돈다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const registry = createClientRegistry((memberId) => createEngineClient({ memberId, storage, fetch: engine.fetch }));
  const offA = registry.subscribe(A);
  const a = registry.get(A);
  await a.pair(engine.st.codes[0]);
  // 앞 회원 화면이 상태를 묻는 사이 회원이 바뀐다
  let open;
  const gate = new Promise((res) => (open = res));
  engine.st.hold = () => gate;
  const late = a.getStatus().then((v) => ["ok", v], (e) => ["err", e.kind]);
  await new Promise((res) => setTimeout(res, 5));
  offA();
  const offB = registry.subscribe(B);
  const b = registry.get(B);
  open();
  engine.st.hold = null;
  assert.deepEqual(await late, ["err", "stale"], "떠난 화면의 응답은 쓰지 않는다");
  // 다음 회원은 앞 회원의 연결·접수 기록을 보지 못하고, 자기 것은 정상으로 쓴다
  assert.equal(b.isPaired(), false);
  assert.deepEqual(b.submissions(), []);
  await b.pair(engine.st.codes[0]);
  assert.equal((await b.submit({ title: "t", prompt: "a red apple on a table" })).state, "accepted");
  assert.equal(JSON.parse(storage.map.get(`fis.submissions.v1:${B}`)).length, 1);
  assert.equal(storage.map.has(`fis.submissions.v1:${A}`), false);
  offB();
});

test("회원별 보관 — 적던 내용과 변환 설정은 그 회원 칸에서만 읽고 쓴다. 한 회원의 것이 다른 회원 화면의 시작값이 되지 않는다", () => {
  const storage = memoryStorage();
  saveCompose(storage, A, { text: "a red apple on a table x2", presetId: "product", sizeId: "square" });
  saveConvertSettings(storage, A, { enabled: true, consent: true, model: "claude-haiku-5-5" });
  // 다음 회원의 화면이 만들어질 때 읽는 값: 비어 있다
  assert.equal(loadCompose(storage, B), null);
  assert.deepEqual(loadConvertSettings(storage, B), { enabled: false, consent: false, model: null });
  // 다음 회원이 적어도 앞 회원 칸은 그대로다
  saveCompose(storage, B, { text: "a blue bird", presetId: "photo", sizeId: "wide" });
  saveConvertSettings(storage, B, { enabled: false, consent: false, model: null });
  assert.equal(loadCompose(storage, A).text, "a red apple on a table x2");
  assert.equal(loadCompose(storage, A).presetId, "product");
  assert.deepEqual(loadConvertSettings(storage, A), { enabled: true, consent: true, model: "claude-haiku-5-5" });
  assert.equal(loadCompose(storage, B).text, "a blue bird");
});

test("그리는 경계 — 브라우저 저장소는 화면이 붙은 뒤, 회원별로 새로 만든 화면이 만들 때 한 번 읽는다. 효과 안에서 되돌리지 않는다", async () => {
  const create = await read("components/studio/CreateScreen.tsx");
  // 붙기 전에는 저장소를 읽는 본문을 그리지 않는다
  assert.match(create, /const hydrated = useHydrated\(\);\s*if \(!hydrated\) return <p [^>]*>화면을 준비하는 중입니다…<\/p>;\s*return <CreateBody key=\{memberId\} memberId=\{memberId\} \/>;/);
  const body = create.slice(create.indexOf("function CreateBody("));
  assert.match(body, /const \[initial\] = useState\(\(\) => loadCompose\(window\.localStorage, memberId\)\);/);
  assert.ok(!create.slice(0, create.indexOf("function CreateBody(")).includes("window.localStorage"), "붙기 전 단계는 저장소를 건드리지 않는다");
  // 되돌리기용 효과와 「어느 회원 것을 되돌렸는지」 상태가 없다
  assert.ok(!/setRestoredFor|restoredFor|setLoadedFor|loadedFor/.test(create + (await read("components/studio/ConvertPanel.tsx"))));
  assert.ok(!/useEffect\(\(\) => \{\s*const c = loadCompose/.test(create));
  // 남은 장 상태는 따로 들고 있지 않고 그때그때 읽는다
  assert.match(body, /const pending = useMemo<DraftStatus>\(\(\) => \(leftTick >= 0 && engine \? draftStatus\(engine, window\.localStorage\) : NOTHING_LEFT\), \[engine, leftTick\]\);/);
  assert.match(body, /const readLeft = useCallback\(\(\) => setLeftTick\(\(n\) => n \+ 1\), \[\]\);/);
  // 회원이 바뀌면 안쪽 칸들도 새로 만든다
  assert.ok(body.includes("<ConvertPanel key={memberId} memberId={memberId}") && body.includes("<LedgerNotice key={memberId} engine={engine}"));
  const panel = await read("components/studio/ConvertPanel.tsx");
  assert.match(panel, /useState<ConvertSettings>\(\(\) => loadConvertSettings\(window\.localStorage, memberId\)\);/);
  assert.match(panel, /const update = \(next: ConvertSettings\) => \{\s*setSettings\(next\);\s*saveConvertSettings\(window\.localStorage, memberId, next\);\s*\};/);
  // 변환 칸은 만들기 본문 안에서만 쓰인다(붙은 뒤에만 그려진다)
  for (const other of ["StartScreen", "JobsScreen", "SettingsScreen", "GuideScreen", "LedgerNotice"]) assert.ok(!(await read(`components/studio/${other}.tsx`)).includes("<ConvertPanel"), other);
  // 등록 상태 읽기: 화면이 닫힌 뒤에 온 응답은 버린다(늦은 복원 방지), 이미 읽었으면 다시 읽지 않는다
  assert.match(panel, /if \(!enabled \|\| status\) return;[^\n]*\n\s*let gone = false;/);
  assert.ok(panel.includes("if (!gone) setStatus(s);") && panel.includes("gone = true;"));
  const settings = await read("components/studio/SettingsScreen.tsx");
  assert.ok(settings.includes("let gone = false;") && settings.includes("if (gone) return;") && settings.includes("gone = true;"));
  // 손상 안내: 손상 여부를 상태로 들고 있지 않고 엔진에 물어 정한다
  const notice = await read("components/studio/LedgerNotice.tsx");
  assert.match(notice, /const broken = useMemo\(\(\) => \(tick >= 0 && engine \? engine\.ledgerBroken\(\) : false\), \[engine, tick\]\);/);
  assert.ok(!/setBroken/.test(notice));
  // 시작하기: 떠난 화면의 확인은 시작하지 않는다
  const start = await read("components/studio/StartScreen.tsx");
  assert.match(start, /const t = window\.setTimeout\(\(\) => void refresh\(\), 0\);\s*return \(\) => window\.clearTimeout\(t\);/);
  // 그리는 도중 ref에 값을 쓰지 않는다(그린 뒤 효과에서 바꾼다)
  const dismiss = await read("components/studio/useDismiss.ts");
  assert.match(dismiss, /useEffect\(\(\) => \{\s*closeRef\.current = close;\s*\}\);/);
  assert.ok(!/latest\.current/.test(panel), "그릴 때의 글을 따로 기억해 두지 않는다 — 응답 때 지금 글을 읽는다(tests/lateConvert.test.mjs)");
  for (const file of ["useDismiss.ts", "ConvertPanel.tsx"]) {
    const src = await read(`components/studio/${file}`);
    assert.ok(!/^\s{2}[a-zA-Z]+\.current = [^;]+;\s*$/m.test(src), `${file}: 컴포넌트 본문 바로 아래에서 ref에 쓰지 않는다`);
  }
  // 훅: 붙었는지와 엔진 연결은 외부 저장소 읽기로(효과에서 상태를 넣지 않는다)
  const hook = await read("components/studio/useEngine.ts");
  assert.ok(!/useState|useEffect/.test(hook), "useEngine은 상태·효과를 쓰지 않는다");
  assert.match(hook, /export function useHydrated\(\): boolean \{\s*return useSyncExternalStore\(\s*noSubscribe,\s*\(\) => true,\s*\(\) => false,\s*\);/);
});
