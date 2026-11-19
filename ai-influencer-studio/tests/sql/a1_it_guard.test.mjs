// 격리 시험 실행 대상 가드의 시험 (2026-11-19, CC-SNS-01). 도커·DB를 쓰지 않는다 — 가짜 사실만 넣어 판정을 본다.
// 실행: node --test tests/sql/a1_it_guard.test.mjs
// 「원격·정체 불명은 거부한다」를 로컬 대역(가짜 입력)으로 증명한다. 실제 원격 엔진에는 접속하지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFixtureTarget, requireLocalFixtureTarget, EXPECTED } from "./_fixtureGuard.mjs";

// 2026-11-19 이 PC에서 실제로 읽은 모양(값은 접속 지점 종류·이미지 이름·포트 묶음뿐)
const GOOD = Object.freeze({
  dockerHostEnv: "",
  contextHost: "npipe:////./pipe/dockerDesktopLinuxEngine",
  inspect: { name: "/aww-pg-test", image: "postgres:17-alpine", running: true, portBindings: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } },
  serverVersion: "17.11",
});
const withFacts = (patch) => ({ ...GOOD, ...patch, inspect: patch.inspect === undefined ? GOOD.inspect : patch.inspect });
const ins = (patch) => ({ inspect: { ...GOOD.inspect, ...patch } });

test("받는 것: 이 PC의 접속 지점 + postgres 17 + 포트가 PC 안에만", () => {
  assert.deepEqual(evaluateFixtureTarget(GOOD), { ok: true, reasons: [] });
  assert.equal(evaluateFixtureTarget(withFacts({ contextHost: "unix:///var/run/docker.sock" })).ok, true, "맥·리눅스의 로컬 소켓");
  assert.equal(evaluateFixtureTarget(withFacts({ dockerHostEnv: "unix:///Users/x/.docker/run/docker.sock" })).ok, true);
  assert.equal(evaluateFixtureTarget(withFacts(ins({ image: "postgres:17" }))).ok, true);
  assert.equal(evaluateFixtureTarget(withFacts(ins({ image: "postgres:17.11-alpine" }))).ok, true);
  assert.equal(evaluateFixtureTarget(withFacts(ins({ portBindings: {} }))).ok, true, "포트를 열지 않은 컨테이너");
  assert.equal(evaluateFixtureTarget(withFacts(ins({ portBindings: null }))).ok, true);
  assert.equal(evaluateFixtureTarget(withFacts(ins({ portBindings: { "5432/tcp": [{ HostIp: "::1", HostPort: "5432" }] } }))).ok, true);
});

test("거부: 원격 도커 접속 지점(환경 변수·컨텍스트 어느 쪽이든)", () => {
  for (const host of ["tcp://10.0.0.5:2376", "tcp://127.0.0.1:2375", "ssh://user@build-host", "https://docker.example.com", "http://localhost:2375", "npipe-remote://x", " "]) {
    const byEnv = evaluateFixtureTarget(withFacts({ dockerHostEnv: host, contextHost: "" }));
    assert.equal(byEnv.ok, false, `DOCKER_HOST=${host}`);
    const byCtx = evaluateFixtureTarget(withFacts({ contextHost: host }));
    assert.equal(byCtx.ok, false, `컨텍스트=${host}`);
  }
  // DOCKER_HOST가 컨텍스트보다 먼저 적용된다: 컨텍스트가 로컬이어도 환경 변수가 원격이면 거부
  assert.equal(evaluateFixtureTarget(withFacts({ dockerHostEnv: "tcp://10.0.0.5:2376" })).ok, false);
  // 환경 변수가 로컬이어도 컨텍스트가 원격이면 거부(무엇이 적용되는지 헷갈리는 상태)
  assert.equal(evaluateFixtureTarget(withFacts({ dockerHostEnv: "npipe:////./pipe/docker_engine", contextHost: "ssh://user@host" })).ok, false);
  assert.match(evaluateFixtureTarget(withFacts({ contextHost: "" })).reasons.join(), /알 수 없음/);
});

test("거부: 정체가 다른 컨테이너", () => {
  const bad = [
    ["다른 이름", ins({ name: "/aww-pg-test-2" })],
    ["다른 DB 제품", ins({ image: "mysql:8" })],
    ["다른 주 버전", ins({ image: "postgres:16-alpine" })],
    ["태그 없는 이미지", ins({ image: "postgres" })],
    ["비슷한 이름의 이미지", ins({ image: "evil/postgres:17" })],
    ["앞부분만 같은 태그", ins({ image: "postgres:170" })],
    ["이미지 값이 글자가 아님", ins({ image: null })],
    ["멈춘 컨테이너", ins({ running: false })],
    ["실행 여부가 글자", ins({ running: "true" })],
    ["포트가 모든 주소로 열림", ins({ portBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "5432" }] } })],
    ["포트 주소가 비어 있음(=모든 주소)", ins({ portBindings: { "5432/tcp": [{ HostIp: "", HostPort: "5432" }] } })],
    ["여러 묶음 중 하나가 밖으로", ins({ portBindings: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "1" }, { HostIp: "192.168.0.7", HostPort: "2" }] } })],
    ["포트 정보가 배열", ins({ portBindings: [] })],
    ["컨테이너 정보 없음", { inspect: null }],
    ["서버 버전 16", { serverVersion: "16.4" }],
    ["서버 버전 170", { serverVersion: "170.1" }],
    ["서버 버전을 읽지 못함", { serverVersion: null }],
  ];
  for (const [name, patch] of bad) {
    const v = evaluateFixtureTarget(withFacts(patch));
    assert.equal(v.ok, false, name);
    assert.ok(v.reasons.length >= 1, name);
  }
  assert.equal(evaluateFixtureTarget(null).ok, false);
  assert.equal(evaluateFixtureTarget({}).ok, false);
});

test("이유 글에 접속 지점 주소·이미지 이름 같은 값이 그대로 실리지 않는다", () => {
  const v = evaluateFixtureTarget(withFacts({ dockerHostEnv: "tcp://secret-host.internal:2376", ...ins({ image: "registry.internal/pg:1" }) }));
  assert.equal(/secret-host|registry\.internal/.test(v.reasons.join(" ")), false);
});

test("입구 함수: 없는 컨테이너 이름이면 DB에 닿지 않고 「없음」으로 건너뛴다", () => {
  const r = requireLocalFixtureTarget({ ...EXPECTED, container: "aif-no-such-container-20261119" });
  assert.equal(r.available, false);
});
