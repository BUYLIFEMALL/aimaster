// 격리 SQL 시험의 실행 대상 가드 (2026-11-19, CC-SNS-01, Master msg_af7821e3d106 · Mac 검수 P2).
// 왜: 컨테이너 이름과 Running만 보면, 도커 접속 지점이 원격 엔진으로 바뀌어 있을 때 같은 이름의 남의 컨테이너에 DB를 만들고 지울 수 있다.
// 하는 일: DB에 어떤 명령도 보내기 전에 아래를 모두 확인한다. 하나라도 어긋나면 **건너뛰지 않고 오류로 멈춘다**(조용한 통과 금지).
//   1) 실제로 적용되는 도커 접속 지점이 이 PC의 것(npipe:// 또는 unix://)이다. DOCKER_HOST가 있으면 그것이, 없으면 현재 컨텍스트의 것이 적용된다.
//   2) 컨테이너 이미지가 postgres 17 계열이고, 실행 중이며, 이름이 기대한 것과 같다.
//   3) 컨테이너가 연 포트는 전부 이 PC 안(127.0.0.1·::1)에만 묶여 있다.
//   4) 서버가 스스로 말하는 버전이 17이다.
// ★ 한계: 이 컨테이너에는 「시험 전용」을 뜻하는 라벨이 없다(다른 작업이 만든 컨테이너라 붙이지 않았다). 위 네 가지는 **지문**이지 소유 증명이 아니다 —
//   이 PC에 같은 이름·같은 이미지의 다른 컨테이너를 누가 띄우면 구분하지 못한다. 그래서 각 시험의 「새 DB 이름 · 이미 있으면 중단 · 만든 DB의 oid 일치 확인 뒤 그 DB만 삭제」는 그대로 유지한다.
import { spawnSync } from "node:child_process";

export const EXPECTED = { container: "aww-pg-test", imagePattern: /^postgres:17([.-][A-Za-z0-9.-]*)?$/, major: "17" };
const LOCAL_ENDPOINT = /^(npipe|unix):\/\//;
const LOCAL_IPS = new Set(["127.0.0.1", "::1"]);

/** 순수 판정. facts = { dockerHostEnv, contextHost, inspect: { name, image, running, portBindings }, serverVersion } */
export function evaluateFixtureTarget(facts, expected = EXPECTED) {
  const reasons = [];
  const f = facts && typeof facts === "object" ? facts : {};
  const envHost = typeof f.dockerHostEnv === "string" ? f.dockerHostEnv.trim() : "";
  const ctxHost = typeof f.contextHost === "string" ? f.contextHost.trim() : "";
  const effective = envHost || ctxHost;
  if (!effective) reasons.push("도커 접속 지점을 알 수 없음");
  else if (!LOCAL_ENDPOINT.test(effective)) reasons.push(`도커 접속 지점이 이 PC의 것이 아님(${envHost ? "DOCKER_HOST" : "컨텍스트"})`);
  // DOCKER_HOST가 로컬이어도 컨텍스트가 원격이면 무엇이 적용되는지 헷갈리는 상태다 — 받지 않는다
  if (envHost && ctxHost && !LOCAL_ENDPOINT.test(ctxHost)) reasons.push("현재 도커 컨텍스트가 이 PC의 것이 아님");
  const i = f.inspect && typeof f.inspect === "object" ? f.inspect : null;
  if (!i) reasons.push("컨테이너 정보를 읽지 못함");
  else {
    if (i.name !== `/${expected.container}`) reasons.push("컨테이너 이름이 기대와 다름");
    if (typeof i.image !== "string" || !expected.imagePattern.test(i.image)) reasons.push("컨테이너 이미지가 postgres 17 계열이 아님");
    if (i.running !== true) reasons.push("컨테이너가 실행 중이 아님");
    const pb = i.portBindings;
    if (pb !== null && pb !== undefined && (typeof pb !== "object" || Array.isArray(pb))) reasons.push("포트 정보 모양이 예상과 다름");
    else for (const list of Object.values(pb ?? {})) {
      if (list === null) continue;
      if (!Array.isArray(list)) { reasons.push("포트 정보 모양이 예상과 다름"); break; }
      if (list.some((b) => !b || !LOCAL_IPS.has(b.HostIp))) { reasons.push("컨테이너 포트가 이 PC 밖으로 열려 있음"); break; }
    }
  }
  if (typeof f.serverVersion !== "string" || !new RegExp(`^${expected.major}(\\.|$)`).test(f.serverVersion.trim())) reasons.push("서버 버전이 17이 아님(또는 읽지 못함)");
  return { ok: reasons.length === 0, reasons };
}

const sh = (args) => { const r = spawnSync("docker", args, { encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout ?? "").trim() }; };

/** 실제 사실을 모은다(읽기만). 도커가 없거나 컨테이너가 없으면 present=false */
export function probeFixtureTarget(expected = EXPECTED, env = process.env) {
  const ctx = sh(["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"]);
  const ins = sh(["inspect", "-f", "{{json .Name}}|{{json .Config.Image}}|{{json .State.Running}}|{{json .HostConfig.PortBindings}}", expected.container]);
  if (!ctx.ok || !ins.ok) return { present: false, facts: null };
  let inspect = null;
  try {
    const [name, image, running, ...rest] = ins.out.split("|");
    inspect = { name: JSON.parse(name), image: JSON.parse(image), running: JSON.parse(running), portBindings: JSON.parse(rest.join("|")) };
  } catch { inspect = null; }
  // 서버 버전은 접속 지점·컨테이너 판정이 끝난 뒤에만 묻는다(그 전에는 컨테이너 안에서 아무것도 실행하지 않는다)
  const base = { dockerHostEnv: env.DOCKER_HOST ?? "", contextHost: ctx.out, inspect, serverVersion: `${expected.major}.0` };
  if (!evaluateFixtureTarget(base, expected).ok) return { present: true, facts: { ...base, serverVersion: null } };
  const ver = sh(["exec", "-i", expected.container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-At", "-c", "show server_version"]);
  return { present: true, facts: { ...base, serverVersion: ver.ok ? ver.out : null } };
}

/** 시험 파일이 쓰는 입구. { available:false, reason } = 도커·컨테이너가 없어 건너뜀 / { available:true } = 통과 / 그 밖 = 오류로 멈춤 */
export function requireLocalFixtureTarget(expected = EXPECTED) {
  const p = probeFixtureTarget(expected);
  if (!p.present) return { available: false, reason: `도커 또는 컨테이너 ${expected.container}를 찾지 못함` };
  if (p.facts.inspect && p.facts.inspect.running === false) return { available: false, reason: `컨테이너 ${expected.container}가 떠 있지 않음` };
  const v = evaluateFixtureTarget(p.facts, expected);
  if (!v.ok) throw new Error(`[격리 시험 중단] 실행 대상이 기대한 로컬 시험용 PostgreSQL이 아닙니다 — DB에 아무 명령도 보내지 않았습니다: ${v.reasons.join(" / ")}`);
  return { available: true, reason: "" };
}
