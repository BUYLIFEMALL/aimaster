// 격리 시험 실행 대상 가드의 시험 (2026-11-19, CC-SNS-01). 실제 도커·DB를 쓰지 않는다 — 가짜 사실과 가짜 실행 함수만 넣는다.
// 실행: node --test tests/sql/a1_it_guard.test.mjs
// 「원격·정체 불명은 거부한다」와 「거부는 엔진 명령을 보내기 전에 일어난다」「통과 뒤의 모든 명령은 확정한 접속 지점에 고정된다」를 로컬 대역으로 증명한다.
// 실제 원격 엔진에는 접속하지 않는다. 맨 아래 정적 확인만 시험 파일의 글자를 읽는다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateFixtureTarget, evaluateContainer, evaluateServerVersion, precheckEnv, resolveContextEndpoint, pinnedEnv, requireLocalFixtureTarget, EXPECTED } from "./_fixtureGuard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// 2026-11-19 이 PC에서 실제로 읽은 모양(접속 지점 종류·이미지 이름·포트 묶음)
const EP = "npipe:////./pipe/dockerDesktopLinuxEngine";
const ID = "5b".repeat(32);
const LIVE = Object.freeze({ "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] });
const GOOD_INSPECT = Object.freeze({ id: ID, networkMode: "bridge", publishAllPorts: false, publishedPorts: LIVE, name: "/aww-pg-test", image: "postgres:17-alpine", running: true, portBindings: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } });
const GOOD = Object.freeze({ env: {}, contextHost: EP, inspect: GOOD_INSPECT, serverVersion: "17.11|unix|5432" });
const ins = (patch) => ({ ...GOOD_INSPECT, ...patch });
const inspectLine = (i) => [i.id, i.name, i.image, i.running, i.networkMode, i.publishAllPorts, i.portBindings ?? null, i.publishedPorts ?? null].map((v) => JSON.stringify(v ?? null)).join("\n") + "\n";

/** 가짜 실행 함수: 부른 명령을 전부 적고, 종류별로 정해 둔 답을 준다 */
function fakeDocker({ contextHost = EP, contextStatus = 0, contextError = null, inspectError = null, inspect = GOOD_INSPECT, inspectStatus = 0, inspectStderr = "", version = "17.11|unix|5432", versionStatus = 0 } = {}) {
  const calls = [];
  const spawnSyncFn = (cmd, args, opts) => {
    calls.push({ cmd, args: args.slice(), env: opts?.env ?? null });
    const rest = args[0] === "--host" ? args.slice(2) : args;
    if (rest[0] === "context") return contextError ? { status: null, error: contextError, stdout: "", stderr: "" } : { status: contextStatus, stdout: contextHost + "\n", stderr: "" };
    if (rest[0] === "inspect") return inspectError ? { status: null, error: inspectError, stdout: "", stderr: "" } : { status: inspectStatus, stdout: inspect ? inspectLine(inspect) : "", stderr: inspectStderr };
    if (rest[0] === "exec") return { status: versionStatus, stdout: version + "\n", stderr: "" };
    return { status: 1, stdout: "", stderr: "unexpected" };
  };
  const spawnFn = (cmd, args, opts) => { calls.push({ cmd, args: args.slice(), env: opts?.env ?? null, async: true }); return {}; };
  return { calls, spawnSyncFn, spawnFn };
}
const kinds = (calls) => calls.map((c) => (c.args[0] === "--host" ? "고정:" + c.args[2] : "미고정:" + c.args[0]));

test("받는 것: 이 PC의 접속 지점 + postgres 17 + 포트가 PC 안에만", () => {
  assert.deepEqual(evaluateFixtureTarget(GOOD), { ok: true, endpoint: EP, reasons: [] });
  assert.equal(evaluateFixtureTarget({ ...GOOD, contextHost: "unix:///var/run/docker.sock" }).ok, true, "맥·리눅스의 로컬 소켓");
  assert.equal(evaluateFixtureTarget({ ...GOOD, env: { DOCKER_HOST: "unix:///Users/x/.docker/run/docker.sock" }, contextHost: "" }).endpoint, "unix:///Users/x/.docker/run/docker.sock", "DOCKER_HOST가 있으면 컨텍스트를 보지 않고 그것으로 확정");
  for (const image of ["postgres:17", "postgres:17.11-alpine"]) assert.equal(evaluateContainer(ins({ image })).ok, true, image);
  for (const portBindings of [{}, null, undefined, { "5432/tcp": [{ HostIp: "::1", HostPort: "5432" }] }, { "5432/tcp": null }]) assert.equal(evaluateContainer(ins({ portBindings })).ok, true);
  for (const publishedPorts of [{}, null, { "5432/tcp": null }, { "5432/tcp": [{ HostIp: "::1", HostPort: "5432" }] }]) assert.equal(evaluateContainer(ins({ publishedPorts })).ok, true, "실제로 열린 포트가 없거나 PC 안에만");
  const noLive = { ...GOOD_INSPECT }; delete noLive.publishedPorts;
  assert.equal(evaluateContainer(noLive).ok, false, "실제 포트 정보를 아예 받지 못하면 통과시키지 않는다");
});

test("거부(0단계 — 환경 변수만): 원격 DOCKER_HOST, 두 변수 충돌, 이상한 컨텍스트 이름", () => {
  for (const host of ["tcp://10.0.0.5:2376", "tcp://127.0.0.1:2375", "ssh://user@build-host", "https://docker.example.com", "http://localhost:2375", "npipe-remote://x", "npipe://", "unix://a b",
    "npipe://buildhost/pipe/docker_engine", "npipe:////buildhost/pipe/docker_engine", "npipe:////./pipe/", "npipe:////./pipe/a/b", "npipe:////./mailslot/x", "unix://relative/docker.sock", "unix://host/var/run/docker.sock", "unix:///var/run/docker.sock\ntcp://10.0.0.5:2376"]) {
    assert.equal(precheckEnv({ DOCKER_HOST: host }).ok, false, `DOCKER_HOST=${host}`);
  }
  // 둘 다 로컬이어도 함께 있으면 거부(환경 충돌)
  assert.match(precheckEnv({ DOCKER_HOST: EP, DOCKER_CONTEXT: "desktop-linux" }).reasons.join(), /환경 충돌/);
  assert.equal(precheckEnv({ DOCKER_HOST: "tcp://10.0.0.5:2376", DOCKER_CONTEXT: "default" }).ok, false);
  assert.equal(precheckEnv({ DOCKER_CONTEXT: "a b; rm" }).ok, false);
  assert.deepEqual(precheckEnv({ DOCKER_CONTEXT: "desktop-linux" }), { ok: true, endpoint: null, needContext: true, contextName: "desktop-linux", reasons: [] });
  assert.deepEqual(precheckEnv({}), { ok: true, endpoint: null, needContext: true, contextName: "", reasons: [] });
});

test("거부(1단계 — 컨텍스트): 원격·빈 값·여러 줄", () => {
  for (const host of ["tcp://10.0.0.5:2376", "ssh://user@host", "https://x", "", "  ", `${EP}\ntcp://10.0.0.5:2376`, "npipe:////otherpc/pipe/dockerDesktopLinuxEngine", "npipe://otherpc/pipe/x", "unix://var/run/docker.sock"]) assert.equal(resolveContextEndpoint(host).ok, false, JSON.stringify(host));
  assert.equal(resolveContextEndpoint("npipe:////./pipe/docker_engine").ok, true);
  assert.equal(resolveContextEndpoint("unix:///var/run/docker.sock").ok, true);
  assert.deepEqual(resolveContextEndpoint(EP + "\n"), { ok: true, endpoint: EP, reasons: [] });
});

test("거부(3·4단계): 정체가 다른 컨테이너·서버", () => {
  const bad = [
    ["다른 이름", ins({ name: "/aww-pg-test-2" })], ["다른 DB 제품", ins({ image: "mysql:8" })], ["다른 주 버전", ins({ image: "postgres:16-alpine" })],
    ["태그 없는 이미지", ins({ image: "postgres" })], ["비슷한 이름의 이미지", ins({ image: "evil/postgres:17" })], ["앞부분만 같은 태그", ins({ image: "postgres:170" })],
    ["이미지 값이 글자가 아님", ins({ image: null })], ["멈춘 컨테이너", ins({ running: false })], ["실행 여부가 글자", ins({ running: "true" })],
    ["포트가 모든 주소로 열림", ins({ portBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] } })],
    ["포트 주소가 비어 있음(=모든 주소)", ins({ portBindings: { "5432/tcp": [{ HostIp: "", HostPort: "5432" }] } })],
    ["여러 묶음 중 하나가 밖으로", ins({ portBindings: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "1" }, { HostIp: "192.168.0.7", HostPort: "2" }] } })],
    ["포트 정보가 배열", ins({ portBindings: [] })], ["컨테이너 정보 없음", null],
    ["ID 없음", ins({ id: null })], ["짧은 ID", ins({ id: "5b3272f2e063" })], ["ID 자리에 이름", ins({ id: "aww-pg-test" })],
    ["호스트 네트워크", ins({ networkMode: "host" })],
    ["모든 포트 자동 게시 켜짐", ins({ publishAllPorts: true })], ["자동 게시 여부를 읽지 못함", ins({ publishAllPorts: null })],
    ["설정은 비었는데 실제로는 모든 주소로 열림", ins({ portBindings: {}, publishedPorts: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "32768" }] } })],
    ["설정은 로컬인데 실제로는 IPv6 전체로도 열림", ins({ publishedPorts: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }, { HostIp: "::", HostPort: "55432" }] } })],
    ["실제 포트 정보가 배열", ins({ publishedPorts: [] })], ["다른 컨테이너의 네트워크", ins({ networkMode: "container:abc" })], ["네트워크 방식 없음", ins({ networkMode: "" })],
  ];
  for (const [name, i] of bad) assert.equal(evaluateContainer(i).ok, false, name);
  for (const v of ["16.4|unix|5432", "170.1|unix|5432", "17.11|172.17.0.2|5432", "17.11|unix|6543", "17.11", "17.11|unix", "", null, undefined, 17]) assert.equal(evaluateServerVersion(v).ok, false, String(v));
  assert.equal(evaluateServerVersion("17.11|unix|5432\n").ok, true);
  assert.equal(evaluateFixtureTarget(null).ok, false);
  assert.equal(evaluateFixtureTarget({}).ok, false);
});

test("이유 글에 접속 지점 주소·이미지 이름 같은 값이 그대로 실리지 않는다", () => {
  const texts = [
    ...precheckEnv({ DOCKER_HOST: "tcp://secret-host.internal:2376" }).reasons,
    ...resolveContextEndpoint("ssh://admin@secret-host.internal").reasons,
    ...evaluateContainer(ins({ image: "registry.internal/pg:1" })).reasons,
  ].join(" ");
  assert.equal(/secret-host|registry\.internal|admin@/.test(texts), false);
});

test("순서: 환경 변수에서 거부되면 도커 명령을 **하나도** 실행하지 않는다", () => {
  for (const env of [{ DOCKER_HOST: "tcp://10.0.0.5:2376" }, { DOCKER_HOST: EP, DOCKER_CONTEXT: "desktop-linux" }, { DOCKER_HOST: "ssh://u@h" }, { DOCKER_CONTEXT: "x y" }]) {
    const d = fakeDocker();
    assert.throws(() => requireLocalFixtureTarget({ env, spawnSyncFn: d.spawnSyncFn, spawnFn: d.spawnFn }), /격리 시험 중단/);
    assert.deepEqual(d.calls, [], JSON.stringify(env));
  }
});

test("순서: 컨텍스트가 원격이면 설정 읽기 한 번 뒤에 멈춘다 — 엔진으로 가는 명령(inspect·exec) 0", () => {
  for (const contextHost of ["tcp://10.0.0.5:2376", "ssh://user@host", ""]) {
    const d = fakeDocker({ contextHost });
    assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: d.spawnSyncFn, spawnFn: d.spawnFn }), /격리 시험 중단/);
    assert.deepEqual(kinds(d.calls), ["미고정:context"], JSON.stringify(contextHost));
  }
  // DOCKER_CONTEXT로 다른 컨텍스트를 고른 경우: 그 이름으로 조회하고, 원격이면 같은 자리에서 멈춘다
  const d = fakeDocker({ contextHost: "tcp://10.0.0.5:2376" });
  assert.throws(() => requireLocalFixtureTarget({ env: { DOCKER_CONTEXT: "remote-build" }, spawnSyncFn: d.spawnSyncFn, spawnFn: d.spawnFn }), /격리 시험 중단/);
  assert.deepEqual(d.calls.map((c) => c.args.slice(0, 3)), [["context", "inspect", "remote-build"]]);
});

test("순서: 컨테이너가 기대와 다르면 컨테이너 **안에서는** 아무것도 실행하지 않는다(exec 0)", () => {
  for (const inspect of [ins({ image: "mysql:8" }), ins({ name: "/other" }), ins({ portBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] } }), ins({ image: "postgres:16" })]) {
    const d = fakeDocker({ inspect });
    assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: d.spawnSyncFn, spawnFn: d.spawnFn }), /격리 시험 중단/);
    assert.deepEqual(kinds(d.calls), ["미고정:context", "고정:inspect"]);
  }
  const v = fakeDocker({ version: "16.4|unix|5432" });
  assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: v.spawnSyncFn, spawnFn: v.spawnFn }), /서버 버전/);
  const tcp = fakeDocker({ version: "17.11|10.0.0.9|5432" });
  assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: tcp.spawnSyncFn, spawnFn: tcp.spawnFn }), /소켓이 아닌 길/);
  // 문구: 서버 확인 조회를 이미 보낸 뒤의 중단은 「아무 명령도 보내지 않았다」고 쓰지 않는다
  let late = null, early = null;
  try { const x = fakeDocker({ version: "16.4|unix|5432" }); requireLocalFixtureTarget({ env: {}, spawnSyncFn: x.spawnSyncFn, spawnFn: x.spawnFn }); } catch (e) { late = e.message; }
  try { const x = fakeDocker({ inspect: ins({ image: "mysql:8" }) }); requireLocalFixtureTarget({ env: {}, spawnSyncFn: x.spawnSyncFn, spawnFn: x.spawnFn }); } catch (e) { early = e.message; }
  assert.match(late, /시험 SQL은 실행하지 않았습니다/);
  assert.equal(/아무 명령도 보내지 않았습니다/.test(late), false);
  assert.match(early, /DB에 아무 명령도 보내지 않았습니다/);
  // 실제로 열린 포트가 밖으로 나가 있으면 컨테이너 안 명령 0
  const pub = fakeDocker({ inspect: ins({ portBindings: {}, publishedPorts: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "32768" }] } }) });
  assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: pub.spawnSyncFn, spawnFn: pub.spawnFn }), /실제로 열린 포트/);
  assert.deepEqual(kinds(pub.calls), ["미고정:context", "고정:inspect"]);
});

test("고정: 통과 뒤의 모든 명령은 확정한 접속 지점으로만 가고, 자식 환경에 접속 대상을 바꾸는 변수가 없다", () => {
  const env = { PATH: "x", DOCKER_CONTEXT: "desktop-linux", DOCKER_TLS_VERIFY: "1", docker_cert_path: "c", OTHER: "keep" };
  const d = fakeDocker();
  const t = requireLocalFixtureTarget({ env, spawnSyncFn: d.spawnSyncFn, spawnFn: d.spawnFn });
  assert.equal(t.available, true);
  assert.equal(t.endpoint, EP);
  assert.equal(t.containerId, ID);
  // 컨테이너 안 명령은 이름이 아니라 확인한 ID로, 안쪽 소켓·포트에 고정하고 컨테이너의 환경 변수를 비운 채 보낸다
  const pa = t.docker.psqlArgs("qa_x");
  assert.deepEqual(pa.slice(0, 13), ["exec", "-i", ID, "env", "-i", "PATH=/usr/local/bin:/usr/bin:/bin", "psql", "-h", "/var/run/postgresql", "-p", "5432", "-U", "postgres"]);
  assert.equal(pa.includes("aww-pg-test"), false, "이름으로 보내지 않는다");
  assert.throws(() => t.docker.psqlArgs("qa_x; drop"), /DB 이름/);
  assert.deepEqual(d.calls[2].args.slice(2, 5), ["exec", "-i", ID], "가드 자신의 첫 컨테이너 안 명령도 ID로 간다");
  t.docker.runSync(pa, { input: "select 1" });
  t.docker.spawn(pa);
  const after = d.calls.slice(1);   // 첫 호출(컨텍스트 조회)만 고정 전이다
  assert.equal(after.length, 4);
  for (const c of after) {
    assert.deepEqual(c.args.slice(0, 2), ["--host", EP]);
    assert.deepEqual(Object.keys(c.env).filter((k) => /^docker_/i.test(k)), [], "DOCKER_* 변수가 지워졌다");
    assert.equal(c.env.OTHER, "keep");
  }
  // 시험 도중 「컨텍스트가 바뀐 것」을 흉내: 실행 함수가 이제 다른 접속 지점을 답해도, 이미 받은 docker는 다시 묻지 않고 같은 곳으로 보낸다
  const n = d.calls.length;
  t.docker.runSync(t.docker.psqlArgs("postgres"));
  assert.deepEqual(d.calls[n].args.slice(0, 5), ["--host", EP, "exec", "-i", ID]);
  assert.equal(d.calls.filter((c) => c.args[0] === "context").length, 1, "컨텍스트는 처음 한 번만 읽는다");
  assert.deepEqual(pinnedEnv({ DOCKER_HOST: "a", DOCKER_CONTEXT: "b", A: "1" }), { A: "1" });
});

test("건너뜀은 세 가지뿐: 도커 미설치·그 컨테이너 없음·기대한 컨테이너가 멈춤. 알 수 없는 실패는 건너뛰지 않고 멈춘다", () => {
  const a = fakeDocker({ contextError: Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" }) });
  assert.equal(requireLocalFixtureTarget({ env: {}, spawnSyncFn: a.spawnSyncFn, spawnFn: a.spawnFn }).available, false);
  const b = fakeDocker({ inspectStatus: 1, inspectStderr: "error: no such object: aww-pg-test" });
  assert.equal(requireLocalFixtureTarget({ env: {}, spawnSyncFn: b.spawnSyncFn, spawnFn: b.spawnFn }).available, false);
  // 접속 지점을 DOCKER_HOST(로컬)로 준 경우: 도커 CLI가 없다는 것은 첫 컨테이너 조회에서 드러난다 — 컨텍스트 경우와 똑같이 건너뛴다
  const enoent = Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" });
  const h = fakeDocker({ inspectError: enoent });
  assert.deepEqual(requireLocalFixtureTarget({ env: { DOCKER_HOST: EP }, spawnSyncFn: h.spawnSyncFn, spawnFn: h.spawnFn }), { available: false, reason: "도커 CLI가 설치되어 있지 않음" });
  assert.deepEqual(kinds(h.calls), ["고정:inspect"], "컨텍스트 조회 없이 바로 고정 호출");
  // 같은 입구에서도 접근 실패는 건너뜀이 아니다
  const h2 = fakeDocker({ inspectStatus: 1, inspectStderr: "failed to connect to the docker API" });
  assert.throws(() => requireLocalFixtureTarget({ env: { DOCKER_HOST: EP }, spawnSyncFn: h2.spawnSyncFn, spawnFn: h2.spawnFn }), /접근 실패/);
  const eacces = fakeDocker({ inspectError: Object.assign(new Error("spawn docker EACCES"), { code: "EACCES" }) });
  assert.throws(() => requireLocalFixtureTarget({ env: { DOCKER_HOST: EP }, spawnSyncFn: eacces.spawnSyncFn, spawnFn: eacces.spawnFn }), /접근 실패/, "실행 권한 오류는 미설치가 아니다");
  // 접근 실패는 건너뜀이 아니다
  const a2 = fakeDocker({ contextStatus: 1 });
  assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: a2.spawnSyncFn, spawnFn: a2.spawnFn }), /컨텍스트를 읽지 못함/);
  assert.deepEqual(kinds(a2.calls), ["미고정:context"]);
  for (const inspectStderr of ["failed to connect to the docker API at npipe:////./pipe/x", "permission denied while trying to connect", "", "Error response from daemon: 500"]) {
    const b2 = fakeDocker({ inspectStatus: 1, inspectStderr });
    assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: b2.spawnSyncFn, spawnFn: b2.spawnFn }), /접근 실패/, inspectStderr);
    assert.deepEqual(kinds(b2.calls), ["미고정:context", "고정:inspect"]);
  }
  const c = fakeDocker({ inspect: ins({ running: false }) });
  assert.equal(requireLocalFixtureTarget({ env: {}, spawnSyncFn: c.spawnSyncFn, spawnFn: c.spawnFn }).available, false);
  assert.deepEqual(kinds(c.calls), ["미고정:context", "고정:inspect"], "멈춘 컨테이너에는 exec를 보내지 않는다");
  // 멈춰 있으면서 정체도 다르면 건너뛰지 않고 멈춘다
  const e = fakeDocker({ inspect: ins({ running: false, image: "mysql:8" }) });
  assert.throws(() => requireLocalFixtureTarget({ env: {}, spawnSyncFn: e.spawnSyncFn, spawnFn: e.spawnFn }), /격리 시험 중단/);
});

test("정적 확인: 가드를 쓰는 통합 시험 파일에는 고정되지 않은 도커 호출이 없다", () => {
  for (const f of ["a1_it_runtime.test.mjs", "a1_it_policy.test.mjs"]) {
    const text = readFileSync(join(HERE, f), "utf8");
    assert.equal(/spawn(Sync)?\(\s*["']docker["']/.test(text), false, `${f}: 직접 docker를 부르는 곳이 있다`);
    assert.ok(text.includes("requireLocalFixtureTarget("), f);
    assert.ok(/TARGET\.docker\.(runSync|spawn)\(/.test(text), f);
    assert.ok(text.includes("TARGET.docker.psqlArgs("), `${f}: psql 인자는 가드가 만든 것만 쓴다`);
    assert.equal(/["']exec["']\s*,\s*["']-i["']\s*,\s*CONTAINER/.test(text), false, `${f}: 컨테이너 이름으로 exec하는 곳이 있다`);
  }
  assert.equal(EXPECTED.container, "aww-pg-test");
});
