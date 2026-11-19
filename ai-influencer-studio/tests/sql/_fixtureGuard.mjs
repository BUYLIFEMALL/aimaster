// 격리 SQL 시험의 실행 대상 가드 (2026-11-19, CC-SNS-01, Master msg_af7821e3d106·msg_4a1e08e7b950 · Mac 검수 P2).
// 왜: 컨테이너 이름과 Running만 보면, 도커 접속 지점이 원격 엔진으로 바뀌어 있을 때 같은 이름의 남의 컨테이너에 DB를 만들고 지울 수 있다.
// 순서(앞 단계가 통과해야 다음 단계의 명령을 보낸다. 어긋나면 **건너뛰지 않고 오류로 멈춘다**)
//   0) 환경 변수만 보고 거른다 — 도커 명령을 하나도 실행하지 않는다:
//      DOCKER_HOST와 DOCKER_CONTEXT가 함께 있으면 거부(무엇이 적용되는지 헷갈리는 상태), DOCKER_HOST가 이 PC의 것(npipe://·unix://)이 아니면 거부.
//   1) 접속 지점을 **확정**한다: DOCKER_HOST가 있으면 그것, 없으면 컨텍스트(DOCKER_CONTEXT 또는 현재 컨텍스트)의 것.
//      컨텍스트 조회는 도커 CLI의 설정 읽기이고, 이 단계까지는 엔진에 어떤 명령도 보내지 않는다. 이 PC의 것이 아니면 거부.
//   2) 그 뒤의 **모든** 도커 명령은 \`--host <확정한 접속 지점>\`을 붙이고, 자식 환경에서 DOCKER_HOST·DOCKER_CONTEXT를 지운 채로 보낸다.
//      → 시험이 도는 중에 누가 컨텍스트를 바꾸거나 환경 변수가 달라도 같은 엔진으로만 간다.
//   3) 고정된 접속 지점으로 컨테이너를 확인한다: 이름·이미지 postgres 17 계열·실행 중·연 포트가 전부 127.0.0.1/::1·호스트 네트워크를 쓰지 않음.
//      이때 받은 **컨테이너 ID**(64자)를 기억하고, 그 뒤의 명령은 이름이 아니라 그 ID로 보낸다(도중에 같은 이름의 다른 컨테이너로 바뀌어도 가지 않는다).
//   4) 여기까지 통과한 뒤에만 컨테이너 안에서 명령을 실행한다. psql은 컨테이너 **안의 소켓**(/var/run/postgresql, 포트 5432)에 고정하고,
//      `env -i`로 컨테이너의 환경 변수(PGHOST·PGHOSTADDR·PGPORT·PGSERVICE·PGDATABASE 등)를 비운 채 실행한다. 첫 명령에서 서버 버전 17·유닉스 소켓 접속·포트 5432를 확인한다.
//   건너뜀과 중단을 가른다: 「도커가 설치되지 않음」「그 컨테이너가 없음」「기대한 컨테이너가 멈춰 있음」만 건너뛴다.
//      컨텍스트를 읽지 못함·엔진에 닿지 못함·권한 오류처럼 **알 수 없는 실패는 건너뛰지 않고 오류로 멈춘다**.
// ★ 한계: 이 컨테이너에는 「시험 전용」을 뜻하는 라벨이 없다(다른 작업이 만든 컨테이너 — 바꾸지 않는다). 위 확인은 **지문**이지 소유 증명이 아니다.
//   이 PC의 같은 엔진에 같은 이름·같은 이미지의 다른 컨테이너가 떠 있으면 구분하지 못한다. 그래서 각 시험의
//   「새 DB 이름 · 이미 있으면 중단 · 만든 DB의 oid 일치 확인 뒤 그 DB만 삭제」는 그대로 유지한다.
//   「--host가 두 환경 변수보다 우선한다」는 2026-11-19 이 PC의 도커 CLI에서 직접 확인한 동작이다(다른 버전은 확인하지 않음 — 그래서 환경 변수도 지운다).
import { spawnSync as realSpawnSync, spawn as realSpawn } from "node:child_process";

export const EXPECTED = { container: "aww-pg-test", imagePattern: /^postgres:17([.-][A-Za-z0-9.-]*)?$/, major: "17" };
// 이 PC의 접속 지점만: 윈도우는 점(.) 서버의 이름 있는 파이프(npipe:////./pipe/<이름>), 그 밖은 절대 경로의 유닉스 소켓(unix:///…).
// npipe://다른서버/pipe/… 처럼 서버 자리가 점이 아닌 것은 다른 PC의 파이프다 — 받지 않는다.
const LOCAL_ENDPOINT = /^(npipe:\/\/\/\/\.\/pipe\/[A-Za-z0-9_.-]+|unix:\/\/\/[A-Za-z0-9_.\/-]+)$/;
export const PG_SOCKET_DIR = "/var/run/postgresql";
export const PG_PORT = "5432";
const CONTAINER_ID = /^[0-9a-f]{64}$/;
const LOCAL_IPS = new Set(["127.0.0.1", "::1"]);
const str = (v) => (typeof v === "string" ? v.trim() : "");

/** 0단계 — 환경 변수만으로 판정(도커 명령 0). { ok, endpoint: 확정됐으면 값 / 아직이면 null, needContext, contextName, reasons } */
export function precheckEnv(env) {
  const host = str(env?.DOCKER_HOST), ctx = str(env?.DOCKER_CONTEXT);
  if (host && ctx) return { ok: false, endpoint: null, needContext: false, contextName: "", reasons: ["DOCKER_HOST와 DOCKER_CONTEXT가 함께 설정됨(환경 충돌)"] };
  if (host) {
    if (!LOCAL_ENDPOINT.test(host)) return { ok: false, endpoint: null, needContext: false, contextName: "", reasons: ["DOCKER_HOST가 이 PC의 접속 지점이 아님"] };
    return { ok: true, endpoint: host, needContext: false, contextName: "", reasons: [] };
  }
  if (ctx && !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(ctx)) return { ok: false, endpoint: null, needContext: false, contextName: "", reasons: ["DOCKER_CONTEXT 값의 모양이 이상함"] };
  return { ok: true, endpoint: null, needContext: true, contextName: ctx, reasons: [] };
}

/** 1단계 — 컨텍스트가 알려 준 접속 지점 판정 */
export function resolveContextEndpoint(contextHost) {
  const h = str(contextHost);
  if (!h) return { ok: false, endpoint: null, reasons: ["도커 컨텍스트의 접속 지점을 알 수 없음"] };
  if (!LOCAL_ENDPOINT.test(h)) return { ok: false, endpoint: null, reasons: ["도커 컨텍스트가 이 PC의 접속 지점이 아님"] };
  return { ok: true, endpoint: h, reasons: [] };
}

/** 3단계 — 컨테이너 정보 판정. inspect = { id, name, image, running, portBindings, networkMode } */
export function evaluateContainer(inspect, expected = EXPECTED) {
  const reasons = [];
  const i = inspect && typeof inspect === "object" ? inspect : null;
  if (!i) return { ok: false, reasons: ["컨테이너 정보를 읽지 못함"] };
  if (i.name !== `/${expected.container}`) reasons.push("컨테이너 이름이 기대와 다름");
  if (typeof i.image !== "string" || !expected.imagePattern.test(i.image)) reasons.push("컨테이너 이미지가 postgres 17 계열이 아님");
  if (i.running !== true) reasons.push("컨테이너가 실행 중이 아님");
  if (typeof i.id !== "string" || !CONTAINER_ID.test(i.id)) reasons.push("컨테이너 ID를 읽지 못함");
  if (typeof i.networkMode !== "string" || i.networkMode === "" || i.networkMode === "host" || i.networkMode.startsWith("container:")) reasons.push("컨테이너 네트워크 방식이 예상과 다름");
  const pb = i.portBindings;
  if (pb !== null && pb !== undefined && (typeof pb !== "object" || Array.isArray(pb))) reasons.push("포트 정보 모양이 예상과 다름");
  else for (const list of Object.values(pb ?? {})) {
    if (list === null) continue;
    if (!Array.isArray(list)) { reasons.push("포트 정보 모양이 예상과 다름"); break; }
    if (list.some((b) => !b || !LOCAL_IPS.has(b.HostIp))) { reasons.push("컨테이너 포트가 이 PC 밖으로 열려 있음"); break; }
  }
  return { ok: reasons.length === 0, reasons };
}

/** 4단계 — 서버가 답한 「버전|접속 방식|포트」 판정. 접속 방식은 유닉스 소켓이어야 한다(서버 주소가 비어 있음 = 'unix') */
export function evaluateServerVersion(v, expected = EXPECTED) {
  const parts = typeof v === "string" ? v.trim().split("|") : [];
  const reasons = [];
  if (parts.length !== 3) return { ok: false, reasons: ["서버 확인 응답을 읽지 못함"] };
  if (!new RegExp(`^${expected.major}(\\.|$)`).test(parts[0])) reasons.push("서버 버전이 17이 아님");
  if (parts[1] !== "unix") reasons.push("컨테이너 안 소켓이 아닌 길로 접속됨");
  if (parts[2] !== PG_PORT) reasons.push("서버 포트가 예상과 다름");
  return { ok: reasons.length === 0, reasons };
}

/** 컨테이너 안에서 psql을 부르는 인자 — 컨테이너 ID·안쪽 소켓·포트에 고정하고 컨테이너의 환경 변수를 비운다 */
export function psqlExecArgs(containerId, db, extra = ["-f", "-"]) {
  if (!CONTAINER_ID.test(containerId)) throw new Error("컨테이너 ID가 올바르지 않습니다");
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(db)) throw new Error("DB 이름이 올바르지 않습니다");
  return ["exec", "-i", containerId, "env", "-i", "PATH=/usr/local/bin:/usr/bin:/bin", "psql", "-h", PG_SOCKET_DIR, "-p", PG_PORT, "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-At", ...extra];
}

/** 한 번에 보는 순수 판정(시험·기록용). facts = { env, contextHost, inspect, serverVersion } */
export function evaluateFixtureTarget(facts, expected = EXPECTED) {
  const f = facts && typeof facts === "object" ? facts : {};
  const pre = precheckEnv(f.env ?? {});
  if (!pre.ok) return { ok: false, endpoint: null, reasons: pre.reasons };
  const ep = pre.needContext ? resolveContextEndpoint(f.contextHost) : { ok: true, endpoint: pre.endpoint, reasons: [] };
  if (!ep.ok) return { ok: false, endpoint: null, reasons: ep.reasons };
  const c = evaluateContainer(f.inspect, expected);
  const v = evaluateServerVersion(f.serverVersion, expected);
  const reasons = [...c.reasons, ...v.reasons];
  return { ok: reasons.length === 0, endpoint: ep.endpoint, reasons };
}

/** 자식 환경에서 도커의 접속 대상을 바꾸는 변수를 지운다 */
export function pinnedEnv(env) {
  const out = { ...env };
  for (const k of Object.keys(out)) if (/^DOCKER_(HOST|CONTEXT|TLS_VERIFY|CERT_PATH|TLS|API_VERSION)$/i.test(k)) delete out[k];
  return out;
}
export const pinnedArgs = (endpoint, args) => ["--host", endpoint, ...args];

const STOP = (reasons) => new Error(`[격리 시험 중단] 실행 대상이 기대한 로컬 시험용 PostgreSQL이 아닙니다 — DB에 아무 명령도 보내지 않았습니다: ${reasons.join(" / ")}`);

/** 시험 파일이 쓰는 입구.
 *  { available:false, reason } = 도커 미설치·컨테이너 없음·멈춤으로 건너뜀 / { available:true, endpoint, containerId, docker } = 통과 / 그 밖 = 오류로 멈춤
 *  docker.runSync(args, opts)·docker.spawn(args) 는 확정한 접속 지점에 고정된 도커 호출, docker.psqlArgs(db)는 확인한 컨테이너 ID·안쪽 소켓에 고정된 psql 인자다 — 시험은 이것만 쓴다. */
export function requireLocalFixtureTarget({ expected = EXPECTED, env = process.env, spawnSyncFn = realSpawnSync, spawnFn = realSpawn } = {}) {
  // 0) 환경 변수 — 도커 명령 0
  const pre = precheckEnv(env);
  if (!pre.ok) throw STOP(pre.reasons);
  // 1) 접속 지점 확정 — CLI 설정 읽기(엔진 명령 아님)
  let endpoint = pre.endpoint;
  if (pre.needContext) {
    const r = spawnSyncFn("docker", ["context", "inspect", ...(pre.contextName ? [pre.contextName] : []), "--format", "{{.Endpoints.docker.Host}}"], { encoding: "utf8", env });
    if (r && r.error && r.error.code === "ENOENT") return { available: false, reason: "도커 CLI가 설치되어 있지 않음" };
    if (!r || r.status !== 0) throw STOP(["도커 컨텍스트를 읽지 못함(원인 불명 — 건너뛰지 않는다)"]);
    const ep = resolveContextEndpoint(r.stdout);
    if (!ep.ok) throw STOP(ep.reasons);
    endpoint = ep.endpoint;
  }
  // 2) 이후 모든 호출을 고정
  const childEnv = pinnedEnv(env);
  const docker = {
    runSync: (args, opts = {}) => spawnSyncFn("docker", pinnedArgs(endpoint, args), { encoding: "utf8", ...opts, env: childEnv }),
    spawn: (args, opts = {}) => spawnFn("docker", pinnedArgs(endpoint, args), { ...opts, env: childEnv }),
  };
  // 3) 컨테이너 확인(고정된 접속 지점으로)
  const ins = docker.runSync(["inspect", "--type", "container", "-f", "{{json .Id}}|{{json .Name}}|{{json .Config.Image}}|{{json .State.Running}}|{{json .HostConfig.NetworkMode}}|{{json .HostConfig.PortBindings}}", expected.container]);
  if (!ins || ins.status !== 0) {
    // 「그 컨테이너가 없다」고 엔진이 답한 경우만 건너뛴다. 엔진에 닿지 못함·권한 오류 등은 멈춘다
    if (ins && !ins.error && /no such (object|container)/i.test(String(ins.stderr ?? ""))) return { available: false, reason: `컨테이너 ${expected.container}가 없음` };
    throw STOP(["도커 엔진에서 컨테이너 정보를 받지 못함(접근 실패 — 건너뛰지 않는다)"]);
  }
  let inspect = null;
  try {
    const [id, name, image, running, networkMode, ...rest] = String(ins.stdout ?? "").trim().split("|");
    inspect = { id: JSON.parse(id), name: JSON.parse(name), image: JSON.parse(image), running: JSON.parse(running), networkMode: JSON.parse(networkMode), portBindings: JSON.parse(rest.join("|")) };
  } catch { inspect = null; }
  if (inspect && inspect.running === false && evaluateContainer({ ...inspect, running: true }, expected).ok) return { available: false, reason: `컨테이너 ${expected.container}가 떠 있지 않음` };
  const c = evaluateContainer(inspect, expected);
  if (!c.ok) throw STOP(c.reasons);
  // 4) 컨테이너 안에서의 첫 명령 — 확인한 ID·안쪽 소켓으로만. 서버 버전·접속 방식·포트
  const containerId = inspect.id;
  docker.psqlArgs = (db, extra) => psqlExecArgs(containerId, db, extra);
  const ver = docker.runSync(docker.psqlArgs("postgres", ["-c", "select current_setting('server_version') || '|' || coalesce(inet_server_addr()::text, 'unix') || '|' || current_setting('port')"]));
  const v = evaluateServerVersion(ver && ver.status === 0 ? String(ver.stdout ?? "") : null, expected);
  if (!v.ok) throw STOP(v.reasons);
  return { available: true, reason: "", endpoint, containerId, docker };
}
