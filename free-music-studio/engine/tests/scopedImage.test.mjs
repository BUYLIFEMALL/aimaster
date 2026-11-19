// IMG-P1 PR-A 새 그림 사이트 범위 — 검증 조건 V1~V10 (docs/analysis-free-image-automation-20261119/P1_PROPOSAL.md 2-6)
// 연결 문을 포트 0으로 띄우고 Origin 머리글을 붙여 요청한다. 그림 실행은 가짜(run)로 대신해 그래픽카드·모델을 쓰지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGateway } from "../src/gateway.mjs";
import { createQueue, sharedTurn } from "../src/queue.mjs";
import { createScopedTokens, SCOPED_SITE_ORIGINS } from "../src/security.mjs";
import { IMAGE_SIZES, imageRenderSize, isImageSize, isScopedArtJob } from "../src/imageArt.mjs";

const MUSIC = "https://free-music-studio.buylife.xyz";
const STUDIO = "https://ai-image-studio.buylife.xyz";
const NEW = "https://new-image.test"; // 시험용 새 범위 출처(운영 목록에는 없다)
const NEW2 = "https://other-image.test";
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000004000000040008020000002686aa5d", "hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 4000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) if (await fn()) return true;
  return false;
};
const readOrNull = (f) => readFile(f).catch(() => null);

/** 엔진 한 벌(자료 폴더 dir) — 기존 대기열·새 범위 대기열·연결 문. gate를 주면 실행이 그 약속을 기다린다 */
async function engine(dir, { gate = null, origins = [NEW, NEW2], block = { legacy: false } } = {}) {
  const files = { paired: path.join(dir, "paired.json"), pairedScoped: path.join(dir, "paired-scoped.json"), queue: path.join(dir, "queue.json"), queueScoped: path.join(dir, "queue-scoped.json") };
  let tokens = new Set();
  try {
    tokens = new Set(JSON.parse(await readFile(files.paired, "utf8")).tokens ?? []);
  } catch {}
  const saveTokens = () => writeFile(files.paired, JSON.stringify({ tokens: [...tokens] }, null, 2));
  const resultFile = (id, scoped = false) => path.join(dir, scoped ? "results-scoped" : "results", `${id}.png`);
  const stat = { active: 0, max: 0, ran: [] };
  const run = async (job) => {
    stat.active += 1;
    stat.max = Math.max(stat.max, stat.active);
    stat.ran.push(job.id);
    try {
      if (gate) await gate.promise;
      const f = resultFile(job.id, !!job.site);
      await mkdir(path.dirname(f), { recursive: true });
      await writeFile(f, PNG);
      return { seconds: 0 };
    } finally {
      stat.active -= 1;
    }
  };
  let scopedQueue;
  const queue = createQueue({ file: files.queue, run, canRun: (job) => sharedTurn(job, scopedQueue) && !block.legacy, onFinished: () => void scopedQueue.pump(), onQueuedCancel: () => void scopedQueue.pump() });
  scopedQueue = createQueue({
    file: files.queueScoped,
    failClosed: true,
    validate: isScopedArtJob,
    run,
    canRun: (job) => sharedTurn(job, queue),
    onFinished: () => void queue.pump(),
    onQueuedCancel: () => {
      void queue.pump();
      void scopedQueue.pump();
    },
  });
  await queue.load();
  await scopedQueue.load(); // 깨진 파일이어도 예외 없이 닫혀야 한다(본체는 여기서 예외가 나면 기동이 막힌다)
  const scopedTokens = createScopedTokens({ file: files.pairedScoped });
  await scopedTokens.load();
  let code = "";
  const server = createGateway({
    version: "test",
    getState: () => ({ ready: true }),
    tokens,
    saveTokens,
    queue,
    imageArt: { resultFile, state: async () => ({ variants: [] }) },
    scoped: { origins, tokens: scopedTokens, queue: scopedQueue },
    acestepPort: 1,
    acestepKey: "k",
    onPairCode: (c) => (code = c),
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  /** 요청 — { status, body(JSON 또는 Buffer) } */
  const call = (method, pathname, { origin, token, body } = {}) =>
    new Promise((resolve, reject) => {
      const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
      const req = http.request({ host: "127.0.0.1", port, method, path: pathname, headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { "Content-Type": "application/json", "Content-Length": data.length } : {}) } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          let parsed = buf;
          if (String(res.headers["content-type"] ?? "").includes("json")) parsed = JSON.parse(buf.toString("utf8") || "null");
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  const pair = async (origin, extra = {}) => call("POST", "/pair", { origin, body: { code, ...extra } });
  const close = () => new Promise((r) => server.close(r));
  return { files, call, pair, close, queue, scopedQueue, scopedTokens, stat, resultFile, code: () => code };
}
const artBody = (over = {}, task = {}) => ({ kind: "art", title: "시험 그림", track: { id: randomUUID() }, clientRequestId: `req-${randomUUID()}`, task: { prompt: "a red apple on a wooden table", ...task }, ...over });
const legacyArt = () => ({ kind: "art", title: "기존 그림", track: { id: randomUUID() }, task: { prompt: "a blue cup on a white desk" } });
const tmp = () => mkdtemp(path.join(os.tmpdir(), "fms-scoped-"));

test("운영 출처 목록은 비어 있다 — 새 범위 갈래는 PR-B 전까지 열리지 않는다", () => {
  assert.deepEqual([...SCOPED_SITE_ORIGINS], []);
});

test("V1: 새 범위 토큰·작업을 만들어도 paired.json·queue.json이 바이트 단위로 그대로다", async () => {
  const dir = await tmp();
  const e = await engine(dir);
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const lj = (await e.call("POST", "/queue", { origin: STUDIO, token: legacy, body: legacyArt() })).body.job;
    assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"));
    await sleep(50);
    const before = { paired: await readFile(e.files.paired), queue: await readFile(e.files.queue) };

    const t = await e.pair(NEW);
    assert.equal(t.status, 200);
    const r = await e.call("POST", "/queue", { origin: NEW, token: t.body.token, body: artBody({}, { width: 1280, height: 720, seed: 7 }) });
    assert.equal(r.status, 200);
    assert.ok(await until(() => e.scopedQueue.get(r.body.job.id)?.status === "done"));
    await sleep(50);

    assert.ok(before.paired.equals(await readFile(e.files.paired)), "paired.json이 바뀜");
    assert.ok(before.queue.equals(await readFile(e.files.queue)), "queue.json이 바뀜");
    assert.ok(!before.paired.toString().includes(t.body.token));
    assert.ok((await readFile(e.files.pairedScoped, "utf8")).includes(t.body.token));
    assert.ok(await readOrNull(e.resultFile(r.body.job.id, true)), "새 범위 결과는 results-scoped에");
    assert.equal(await readOrNull(e.resultFile(r.body.job.id, false)), null, "기존 results에는 없어야 함");
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V2: 같은 자료 폴더를 0.8.5 코드로 열면 새 범위가 보이지 않고 기존 연결은 그대로 동작한다", async (t) => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const old = await tmp();
  try {
    const tar = execFileSync("git", ["-C", repo, "archive", "--format=tar", "bc946e04c", "free-music-studio/engine/src"], { maxBuffer: 64 * 1024 * 1024 });
    // 윈도우는 기본 tar(Git에 딸린 tar는 드라이브 문자 경로를 못 읽음), 그 밖은 PATH의 tar
    const tarBin = process.platform === "win32" ? path.join(process.env.SystemRoot || "C:/Windows", "System32", "tar.exe") : "tar";
    execFileSync(tarBin, ["-x", "-C", old], { input: tar });
  } catch (e) {
    await rm(old, { recursive: true, force: true });
    return t.skip(`0.8.5 코드를 꺼내지 못함: ${e.message}`);
  }
  const dir = await tmp();
  const e = await engine(dir);
  let server;
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
    const scopedToken = (await e.pair(NEW)).body.token;
    const sj = (await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).body.job;
    assert.ok(await until(() => e.queue.get(lj.id)?.status === "done" && e.scopedQueue.get(sj.id)?.status === "done"));
    await sleep(50);
    await e.close();

    // 0.8.5 연결 문·대기열을 같은 자료 폴더로
    const oldSrc = path.join(old, "free-music-studio", "engine", "src");
    const { createGateway: oldGateway } = await import(pathToFileURL(path.join(oldSrc, "gateway.mjs")).href);
    const { createQueue: oldQueue } = await import(pathToFileURL(path.join(oldSrc, "queue.mjs")).href);
    const oq = oldQueue({ file: e.files.queue, run: async () => ({}) });
    await oq.load();
    const tokens = new Set(JSON.parse(await readFile(e.files.paired, "utf8")).tokens);
    server = oldGateway({ version: "0.8.5", getState: () => ({ ready: true }), tokens, saveTokens: async () => {}, queue: oq, imageArt: { resultFile: e.resultFile, state: async () => ({}) }, acestepPort: 1, acestepKey: "k" });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    const get = (pathname, origin, token) =>
      new Promise((resolve, reject) => {
        http.get({ host: "127.0.0.1", port, path: pathname, headers: { Origin: origin, Authorization: `Bearer ${token}` } }, (res) => {
          const c = [];
          res.on("data", (d) => c.push(d));
          res.on("end", () => resolve({ status: res.statusCode, text: Buffer.concat(c).toString("utf8") }));
        }).on("error", reject);
      });
    const list = await get("/queue", MUSIC, legacy); // 다시 짝짓지 않고 그대로
    assert.equal(list.status, 200);
    const ids = JSON.parse(list.text).jobs.map((j) => j.id);
    assert.ok(ids.includes(lj.id), "기존 작업이 보여야 함");
    assert.ok(!ids.includes(sj.id), "새 범위 작업이 기존 목록에 섞임");
    assert.equal((await get("/queue", NEW, scopedToken)).status, 403, "0.8.5는 새 출처를 모른다");
    assert.equal((await get("/queue", MUSIC, scopedToken)).status, 401, "새 범위 토큰은 0.8.5에서 통하지 않는다");
    assert.equal((await get(`/image-art/${sj.id}`, STUDIO, legacy)).status, 404, "새 범위 그림은 기존 results에 없다");
  } finally {
    if (server) await new Promise((r) => server.close(r));
    else await e.close().catch(() => {});
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    await rm(old, { recursive: true, force: true });
  }
});

test("V3: 새 범위 토큰 파일이 깨지거나 없어지면 새 사이트만 「연결 필요」, 기존은 정상, 깨진 파일은 그대로", async () => {
  const dir = await tmp();
  let e = await engine(dir);
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const scopedToken = (await e.pair(NEW)).body.token;
    assert.equal((await e.call("GET", "/queue", { origin: NEW, token: scopedToken })).status, 200);
    await e.close();

    const broken = Buffer.from("{ 깨진 파일");
    await writeFile(e.files.pairedScoped, broken);
    e = await engine(dir);
    assert.ok(e.scopedTokens.broken);
    const r = await e.call("GET", "/queue", { origin: NEW, token: scopedToken });
    assert.equal(r.status, 401);
    assert.equal(r.body.needPair, true);
    assert.equal((await e.pair(NEW)).status, 503, "닫힌 동안 새 연결을 만들지 않는다");
    assert.equal((await e.call("GET", "/queue", { origin: MUSIC, token: legacy })).status, 200, "기존 사이트는 정상");
    assert.ok(broken.equals(await readFile(e.files.pairedScoped)), "깨진 파일을 덮어씀");
    await e.close();

    await rm(e.files.pairedScoped);
    e = await engine(dir);
    assert.equal(e.scopedTokens.broken, "");
    assert.equal((await e.call("GET", "/queue", { origin: NEW, token: scopedToken })).status, 401, "파일이 없으면 예전 토큰은 통하지 않는다");
    assert.equal((await e.call("GET", "/queue", { origin: MUSIC, token: legacy })).status, 200);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V4: 새 범위 대기열 파일이 깨지면 그 작업만 멈추고 파일을 보존하며 기존 대기열은 돈다", async () => {
  const dir = await tmp();
  let e = await engine(dir);
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const scopedToken = (await e.pair(NEW)).body.token;
    await e.close();
    const broken = Buffer.from('{"jobs": "배열이 아님"}');
    await writeFile(e.files.queueScoped, broken);
    e = await engine(dir);
    assert.ok(e.scopedQueue.broken);
    assert.equal((await e.call("GET", "/queue", { origin: NEW, token: scopedToken })).status, 503);
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).status, 503);
    const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
    assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"), "기존 대기열은 정상으로 돈다");
    await sleep(50);
    assert.ok(broken.equals(await readFile(e.files.queueScoped)), "깨진 대기열 파일을 덮어씀");
    assert.deepEqual(e.stat.ran, [lj.id]);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V5: 재연결 승계 — 같은 출처·유효한 이전 토큰·코드가 모두 맞을 때만", async () => {
  const dir = await tmp();
  const e = await engine(dir);
  try {
    const t1 = (await e.pair(NEW)).body.token;
    const j1 = (await e.call("POST", "/queue", { origin: NEW, token: t1, body: artBody() })).body.job;
    const ids = async (origin, token) => (await e.call("GET", "/queue", { origin, token })).body.jobs.map((j) => j.id);

    // 코드가 틀리거나 없으면 이전 토큰이 있어도 발급하지 않는다
    assert.equal((await e.call("POST", "/pair", { origin: NEW, body: { code: "000000x", prevToken: t1 } })).status, 401);
    assert.equal((await e.call("POST", "/pair", { origin: NEW, body: { prevToken: t1 } })).status, 401);
    assert.deepEqual(await ids(NEW, t1), [j1.id], "실패한 시도는 이전 토큰을 폐기하지 않는다");

    // 다른 출처에서는 승계되지 않는다(새 범위)
    const other = await e.pair(NEW2, { prevToken: t1 });
    assert.equal(other.status, 200);
    assert.equal(other.body.inherited, false);
    assert.deepEqual(await ids(NEW2, other.body.token), []);
    assert.deepEqual(await ids(NEW, t1), [j1.id], "다른 출처의 시도로 이전 토큰이 폐기되면 안 됨");

    // 세 조건이 맞으면 목록이 이어지고 이전 토큰은 바로 거절
    const t2 = await e.pair(NEW, { prevToken: t1 });
    assert.equal(t2.body.inherited, true);
    assert.deepEqual(await ids(NEW, t2.body.token), [j1.id]);
    assert.equal((await e.call("GET", "/queue", { origin: NEW, token: t1 })).status, 401);

    // 폐기된 이전 토큰으로는 승계되지 않는다(새 범위)
    const t3 = await e.pair(NEW, { prevToken: t1 });
    assert.equal(t3.body.inherited, false);
    assert.deepEqual(await ids(NEW, t3.body.token), []);
    assert.deepEqual(await ids(NEW, t2.body.token), [j1.id], "승계 실패가 유효한 토큰을 건드리면 안 됨");
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V6: 같은 범위·같은 접수 번호·같은 내용을 동시에 보내도 작업은 하나다", async () => {
  const dir = await tmp();
  const gate = Promise.withResolvers();
  const e = await engine(dir, { gate });
  try {
    const token = (await e.pair(NEW)).body.token;
    const body = artBody({}, { width: 720, height: 1280, seed: 3 });
    const rs = await Promise.all(Array.from({ length: 12 }, () => e.call("POST", "/queue", { origin: NEW, token, body })));
    assert.ok(rs.every((r) => r.status === 200));
    assert.equal(new Set(rs.map((r) => r.body.job.id)).size, 1, "작업 번호가 모두 같아야 함");
    assert.equal(e.scopedQueue.list().length, 1);
    gate.resolve();
    assert.ok(await until(() => e.scopedQueue.list()[0].status === "done"));
    assert.equal(e.stat.ran.length, 1, "그림은 한 번만 그린다");
    // 끝난 뒤 같은 번호를 다시 보내도 그 작업을 돌려준다
    const again = await e.call("POST", "/queue", { origin: NEW, token, body });
    assert.equal(again.body.job.id, rs[0].body.job.id);
    assert.equal(e.stat.ran.length, 1);
  } finally {
    gate.resolve();
    await until(() => e.stat.active === 0 && !e.queue.list().concat(e.scopedQueue.list()).some((j) => j.status === "queued" || j.status === "running"));
    await sleep(30);
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V7: 같은 접수 번호에 다른 내용은 409, 다른 범위의 같은 번호는 별개 작업", async () => {
  const dir = await tmp();
  const gate = Promise.withResolvers();
  const e = await engine(dir, { gate });
  try {
    const a = (await e.pair(NEW)).body.token;
    const b = (await e.pair(NEW)).body.token; // 이전 토큰 없이 짝지음 → 다른 범위
    const body = artBody({}, { seed: 1 });
    const first = await e.call("POST", "/queue", { origin: NEW, token: a, body });
    for (const task of [{ seed: 2 }, { seed: 1, width: 1280, height: 720 }, { seed: 1, prompt: "a green pear on a wooden table" }]) {
      const r = await e.call("POST", "/queue", { origin: NEW, token: a, body: { ...body, task: { ...body.task, ...task } } });
      assert.equal(r.status, 409, JSON.stringify(task));
    }
    assert.equal(e.scopedQueue.list().length, 1, "충돌이 작업을 만들면 안 됨");
    assert.equal(e.scopedQueue.get(first.body.job.id).task.seed, 1, "충돌이 기존 작업을 바꾸면 안 됨");
    const otherScope = await e.call("POST", "/queue", { origin: NEW, token: b, body: { ...body, task: { ...body.task, seed: 2 } } });
    assert.equal(otherScope.status, 200);
    assert.notEqual(otherScope.body.job.id, first.body.job.id);
    assert.equal(e.scopedQueue.list().length, 2);
    // 접수 번호 형식·크기·종류 위반은 거절
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody({ clientRequestId: "짧음" }) })).status, 400);
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody({ clientRequestId: undefined }) })).status, 400);
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody({}, { width: 1344, height: 768 }) })).status, 400);
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody({}, { width: 1280 }) })).status, 400);
    assert.equal((await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody({ kind: "text2music" }) })).status, 400);
    assert.equal(e.scopedQueue.list().length, 2);
  } finally {
    gate.resolve();
    await until(() => e.stat.active === 0 && !e.queue.list().concat(e.scopedQueue.list()).some((j) => j.status === "queued" || j.status === "running"));
    await sleep(30);
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V8: 두 대기열을 합쳐 한 번에 한 작업만 돌고, 다시 켜면 진행 중이던 작업은 「중단됨」으로 남는다", async () => {
  const dir = await tmp();
  let gate = Promise.withResolvers();
  let e = await engine(dir, { gate });
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const scopedToken = (await e.pair(NEW)).body.token;
    const order = [];
    for (let i = 0; i < 3; i++) {
      order.push((await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).body.job.id);
      await sleep(3);
      order.push((await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job.id);
      await sleep(3);
    }
    await sleep(60);
    assert.equal(e.stat.active, 1, "동시에 도는 작업은 하나");
    assert.equal(e.queue.running() && e.scopedQueue.running(), false);

    // 진행 중인 채로 엔진을 끈 것처럼 — 같은 폴더를 새로 읽는다
    const runningId = e.stat.ran[0];
    await e.close();
    const e2 = await engine(dir, { gate: (gate = Promise.withResolvers()) });
    try {
      const j = e2.scopedQueue.get(runningId) ?? e2.queue.get(runningId);
      assert.equal(j.status, "interrupted");
      await sleep(40);
      assert.ok(!e2.stat.ran.includes(runningId), "중단된 작업을 자동으로 다시 돌리면 안 됨");
    } finally {
      await e2.close();
    }
    // 처음 엔진은 실행을 풀어 주고 끝까지 — 겹침 없이 접수 순서대로
    e = await engine(await tmp());
    const l2 = (await e.pair(MUSIC)).body.token;
    const s2 = (await e.pair(NEW)).body.token;
    const seq = [];
    for (let i = 0; i < 3; i++) {
      seq.push((await e.call("POST", "/queue", { origin: NEW, token: s2, body: artBody() })).body.job.id);
      seq.push((await e.call("POST", "/queue", { origin: MUSIC, token: l2, body: legacyArt() })).body.job.id);
    }
    assert.ok(await until(() => e.stat.ran.length === 6 && e.stat.active === 0));
    assert.equal(e.stat.max, 1, "한 번에 한 작업만");
    assert.deepEqual([...e.stat.ran].sort(), [...seq].sort());
  } finally {
    gate.resolve();
    await e.close().catch(() => {});
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V9: 범위를 넘는 조회·결과·취소·지우기는 양쪽 모두 막힌다", async () => {
  const dir = await tmp();
  const e = await engine(dir);
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const a = (await e.pair(NEW)).body.token;
    const b = (await e.pair(NEW)).body.token;
    const lj = (await e.call("POST", "/queue", { origin: STUDIO, token: legacy, body: legacyArt() })).body.job;
    const aj = (await e.call("POST", "/queue", { origin: NEW, token: a, body: artBody() })).body.job;
    assert.ok(await until(() => e.queue.get(lj.id)?.status === "done" && e.scopedQueue.get(aj.id)?.status === "done"));

    // 새 사이트 → 기존 작업, 다른 범위의 작업
    for (const [token, id] of [[a, lj.id], [b, aj.id]]) {
      assert.equal((await e.call("GET", `/image-art/${id}`, { origin: NEW, token })).status, 404);
      assert.equal((await e.call("POST", `/queue/${id}/cancel`, { origin: NEW, token })).status, 404);
      assert.equal((await e.call("DELETE", `/queue/${id}`, { origin: NEW, token })).status, 404);
    }
    assert.deepEqual((await e.call("GET", "/queue", { origin: NEW, token: a })).body.jobs.map((j) => j.id), [aj.id]);
    assert.deepEqual((await e.call("GET", "/queue", { origin: NEW, token: b })).body.jobs, []);
    assert.equal(e.queue.get(lj.id).status, "done");
    assert.equal(e.scopedQueue.get(aj.id).status, "done");
    // 자기 것은 된다
    assert.equal((await e.call("GET", `/image-art/${aj.id}`, { origin: NEW, token: a })).status, 200);

    // 기존 사이트 → 새 범위 작업
    const list = (await e.call("GET", "/queue", { origin: MUSIC, token: legacy })).body.jobs.map((j) => j.id);
    assert.deepEqual(list, [lj.id], "기존 목록에 새 범위 작업이 섞이면 안 됨");
    assert.equal((await e.call("GET", `/image-art/${aj.id}`, { origin: STUDIO, token: legacy })).status, 404);
    await e.call("POST", `/queue/${aj.id}/cancel`, { origin: MUSIC, token: legacy });
    await e.call("DELETE", `/queue/${aj.id}`, { origin: MUSIC, token: legacy });
    assert.equal(e.scopedQueue.get(aj.id)?.status, "done", "기존 사이트가 새 범위 작업을 건드리면 안 됨");

    // 토큰은 발급받은 쪽에서만
    assert.equal((await e.call("GET", "/queue", { origin: MUSIC, token: a })).status, 401);
    assert.equal((await e.call("GET", "/queue", { origin: NEW, token: legacy })).status, 401);
    assert.equal((await e.call("GET", "/queue", { origin: NEW2, token: a })).status, 401);
    // 새 사이트는 그림 주소만
    assert.equal((await e.call("GET", "/system", { origin: NEW, token: a })).status, 403);
    assert.equal((await e.call("GET", "/library", { origin: NEW, token: a })).status, 403);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("V10: 크기를 안 보내면 1024×1024, 허용 목록 밖은 기본값으로 — 기존 호출의 실행 인자가 그대로다", () => {
  assert.deepEqual(imageRenderSize(undefined), { width: 1024, height: 1024 });
  assert.deepEqual(imageRenderSize({ prompt: "x" }), { width: 1024, height: 1024 });
  assert.deepEqual(imageRenderSize({ width: 1344, height: 768 }), { width: 1024, height: 1024 });
  assert.deepEqual(imageRenderSize({ width: "1280", height: "720" }), { width: 1024, height: 1024 });
  assert.deepEqual(imageRenderSize({ width: 1280, height: 720 }), { width: 1280, height: 720 });
  assert.deepEqual(imageRenderSize({ width: 720, height: 1280 }), { width: 720, height: 1280 });
  assert.deepEqual(IMAGE_SIZES.map((s) => `${s.width}x${s.height}`), ["1024x1024", "1280x720", "720x1280"]);
  assert.equal(isImageSize(720, 720), false);
});

test("새 범위를 쓰지 않으면 새 범위 파일을 만들지 않는다(기존 queue.json은 예전처럼 생긴다)", async () => {
  const dir = await tmp();
  const e = await engine(dir);
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
    assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"));
    await sleep(50);
    assert.ok(await readOrNull(e.files.queue), "queue.json은 있어야 함");
    assert.equal(await readOrNull(e.files.queueScoped), null, "queue-scoped.json이 생기면 안 됨");
    assert.equal(await readOrNull(e.files.pairedScoped), null, "paired-scoped.json이 생기면 안 됨");
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("검수 P1: 새 범위 대기열 파일의 작업 항목이 깨져 있으면 예외 없이 그 범위만 닫고 파일·기존 대기열은 그대로다", async () => {
  const now = new Date().toISOString();
  const good = { id: randomUUID(), kind: "art", engine: "art", license: "commercial", title: "시험 그림", track: { id: randomUUID() }, task: { prompt: "a red apple on a wooden table" }, site: NEW, scope: randomUUID(), clientRequestId: `req-${randomUUID()}`, digest: "a".repeat(64), status: "done", stage: "완료", createdAt: now, finishedAt: now, recorded: false };
  const cases = {
    "null 항목": { jobs: [null] },
    "숫자 항목": { jobs: [good, 7] },
    "배열 항목": { jobs: [[]] },
    "상태 없음": { jobs: [{ id: randomUUID(), kind: "art", createdAt: now }] },
    "모르는 상태": { jobs: [{ ...good, status: "weird" }] },
    "접수 시각 깨짐": { jobs: [{ ...good, createdAt: "어제" }] },
    "접수 시각 없음": { jobs: [{ id: randomUUID(), kind: "art", status: "queued" }] },
    "끝난 시각 깨짐": { jobs: [{ ...good, finishedAt: 12 }] },
    "번호 없음": { jobs: [{ kind: "art", status: "queued", createdAt: now }] },
  };
  for (const [name, data] of Object.entries(cases)) {
    const dir = await tmp();
    const bytes = Buffer.from(JSON.stringify(data));
    await writeFile(path.join(dir, "queue-scoped.json"), bytes);
    let e;
    try {
      e = await engine(dir); // 예외가 나면 여기서 시험이 실패한다(= 엔진 기동이 막히는 경우)
      assert.ok(e.scopedQueue.broken, `${name}: 닫혀야 함`);
      assert.deepEqual(e.scopedQueue.list(), []);
      const legacy = (await e.pair(MUSIC)).body.token;
      const scopedToken = (await e.pair(NEW)).body.token;
      assert.equal((await e.call("GET", "/queue", { origin: NEW, token: scopedToken })).status, 503, name);
      assert.equal((await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).status, 503, name);
      const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
      assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"), `${name}: 기존 대기열은 돌아야 함`);
      await sleep(30);
      assert.ok(bytes.equals(await readFile(e.files.queueScoped)), `${name}: 파일이 바뀜`);
    } finally {
      await e?.close();
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
  // 올바른 항목만 있으면 닫히지 않는다
  const dir = await tmp();
  await writeFile(path.join(dir, "queue-scoped.json"), JSON.stringify({ jobs: [good, { ...good, id: randomUUID(), status: "running", finishedAt: undefined }] }));
  const e = await engine(dir);
  try {
    assert.equal(e.scopedQueue.broken, "");
    assert.deepEqual(e.scopedQueue.list().map((j) => j.status).sort(), ["done", "interrupted"]);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("검수 P2: 만드는 중 취소해도 실제 실행이 끝나기 전에는 어느 대기열도 다음 작업을 시작하지 않는다(양방향)", async () => {
  for (const first of ["scoped", "legacy"]) {
    const dir = await tmp();
    const gate = Promise.withResolvers(); // 실행 함수는 취소 신호를 받아도 이 약속이 풀릴 때까지 끝나지 않는다(느린 종료)
    const e = await engine(dir, { gate });
    try {
      const legacy = (await e.pair(MUSIC)).body.token;
      const scopedToken = (await e.pair(NEW)).body.token;
      const addScoped = async () => (await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).body.job;
      const addLegacy = async () => (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
      const a = first === "scoped" ? await addScoped() : await addLegacy();
      const qa = first === "scoped" ? e.scopedQueue : e.queue;
      assert.ok(await until(() => qa.get(a.id)?.status === "running"));
      await sleep(5);
      const b = first === "scoped" ? await addLegacy() : await addScoped(); // 상대 대기열
      const c = first === "scoped" ? await addScoped() : await addLegacy(); // 같은 대기열의 다음 작업
      const cancelled = await e.call("POST", `/queue/${a.id}/cancel`, first === "scoped" ? { origin: NEW, token: scopedToken } : { origin: MUSIC, token: legacy });
      assert.equal(cancelled.status, 200);
      assert.equal(qa.get(a.id).status, "cancelled", "표시는 바로 취소됨");
      await sleep(120);
      assert.deepEqual(e.stat.ran, [a.id], `${first}: 실행이 끝나기 전에 다른 작업이 시작됨`);
      assert.equal(e.stat.active, 1);
      assert.equal(qa.running(), true, "실행이 끝날 때까지 만드는 중으로 본다");
      gate.resolve();
      assert.ok(await until(() => e.stat.ran.length === 3 && e.stat.active === 0), "실행이 끝나면 나머지가 차례로 돈다");
      assert.equal(e.stat.max, 1, "한 번에 한 작업");
      assert.deepEqual(e.stat.ran.slice(1), [b.id, c.id], "접수 순서대로");
      assert.equal(qa.get(a.id).status, "cancelled", "취소한 작업은 취소로 남는다");
      assert.ok(await until(() => !qa.running()), "정리까지 끝나면 만드는 중이 풀린다");
    } finally {
      gate.resolve();
      await until(() => e.stat.active === 0 && !e.queue.list().concat(e.scopedQueue.list()).some((j) => j.status === "queued" || j.status === "running"));
      await sleep(30);
      await e.close();
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
});

test("대기 중인 맨 앞 작업을 취소하면 그 뒤에서 기다리던 상대 대기열 작업이 이어서 돈다", async () => {
  const dir = await tmp();
  const block = { legacy: true }; // 기존 대기열 맨 앞 작업이 아직 만들 수 없는 상태(예: 음악 엔진 준비 중)
  const e = await engine(dir, { block });
  try {
    const legacy = (await e.pair(MUSIC)).body.token;
    const scopedToken = (await e.pair(NEW)).body.token;
    const l1 = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
    await sleep(5);
    const s1 = (await e.call("POST", "/queue", { origin: NEW, token: scopedToken, body: artBody() })).body.job;
    await sleep(80);
    assert.deepEqual(e.stat.ran, [], "먼저 접수된 기존 작업이 기다리는 동안 뒤 작업도 기다린다(접수 순)");
    assert.equal((await e.call("POST", `/queue/${l1.id}/cancel`, { origin: MUSIC, token: legacy })).status, 200);
    assert.ok(await until(() => e.scopedQueue.get(s1.id)?.status === "done"), "앞 작업이 빠지면 뒤 작업이 돌아야 함");
    assert.deepEqual(e.stat.ran, [s1.id]);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("검수 잔여: 출처·범위·그림 내용이 빠진 저장 기록은 실행하지 않고 새 대기열만 닫는다(정상 저장본은 그대로 읽는다)", async () => {
  // 1) 엔진이 실제로 저장한 파일을 기준 표본으로 쓴다
  const seedDir = await tmp();
  let saved;
  {
    const gate = Promise.withResolvers();
    const e = await engine(seedDir, { gate });
    try {
      const token = (await e.pair(NEW)).body.token;
      await e.call("POST", "/queue", { origin: NEW, token, body: artBody({}, { width: 1280, height: 720, seed: 11 }) });
      await e.call("POST", "/queue", { origin: NEW, token, body: artBody() });
      await sleep(40);
      saved = JSON.parse(await readFile(e.files.queueScoped, "utf8"));
      assert.equal(saved.jobs.length, 2);
      assert.ok(saved.jobs.every(isScopedArtJob), "엔진이 저장한 기록은 검증을 통과해야 함");
    } finally {
      gate.resolve();
      await until(() => e.stat.active === 0 && !e.scopedQueue.list().some((j) => j.status === "queued" || j.status === "running"));
      await sleep(30);
      await e.close();
      await rm(seedDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
  const queued = { ...saved.jobs.find((j) => j.task.width === 1280), status: "queued", stage: "대기 중" };
  delete queued.startedAt;
  delete queued.finishedAt;
  delete queued.result;
  const without = (k) => { const c = structuredClone(queued); delete c[k]; return c; };
  const withTask = (task) => ({ ...structuredClone(queued), task });
  const cases = {
    "site 없음": without("site"),
    "scope 없음": without("scope"),
    "task 없음": without("task"),
    "접수 번호 없음": without("clientRequestId"),
    "내용 요약 없음": without("digest"),
    "track 없음": without("track"),
    "제목 없음": without("title"),
    "site가 주소가 아님": { ...structuredClone(queued), site: "아무 글자" },
    "scope가 숫자": { ...structuredClone(queued), scope: 5 },
    "그림 작업이 아님": { ...structuredClone(queued), kind: "text2music" },
    "설명 없음": withTask({ width: 1280, height: 720 }),
    "허용 밖 크기": withTask({ prompt: "a red apple on a wooden table", width: 1344, height: 768 }),
    "크기 한쪽만": withTask({ prompt: "a red apple on a wooden table", width: 1280 }),
    "시드가 글자": withTask({ prompt: "a red apple on a wooden table", seed: "7" }),
    "모르는 모델 판": withTask({ prompt: "a red apple on a wooden table", variantId: "no-such:q9" }),
  };
  for (const [name, job] of Object.entries(cases)) {
    assert.equal(isScopedArtJob(job), false, `${name}: 검증이 걸러야 함`);
    const dir = await tmp();
    const bytes = Buffer.from(JSON.stringify({ jobs: [job] }, null, 2));
    await writeFile(path.join(dir, "queue-scoped.json"), bytes);
    const e = await engine(dir);
    try {
      assert.ok(e.scopedQueue.broken, `${name}: 닫혀야 함`);
      const legacy = (await e.pair(MUSIC)).body.token;
      const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
      assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"), `${name}: 기존 대기열은 돌아야 함`);
      await sleep(40);
      assert.deepEqual(e.stat.ran, [lj.id], `${name}: 손상 기록이 실행됨`);
      assert.ok(bytes.equals(await readFile(e.files.queueScoped)), `${name}: 파일이 바뀜`);
    } finally {
      await e.close();
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
  // 2) 정상 저장본(대기 1 + 끝난 것 1)은 닫히지 않고 대기 작업이 이어서 돈다
  const dir = await tmp();
  const done = { ...structuredClone(queued), id: randomUUID(), clientRequestId: `req-${randomUUID()}`, status: "done", stage: "완료", finishedAt: new Date().toISOString() };
  await writeFile(path.join(dir, "queue-scoped.json"), JSON.stringify({ jobs: [done, queued] }, null, 2));
  const e = await engine(dir);
  try {
    assert.equal(e.scopedQueue.broken, "");
    assert.equal(e.scopedQueue.list().length, 2);
    await e.scopedQueue.pump();
    assert.ok(await until(() => e.scopedQueue.get(queued.id)?.status === "done"));
    assert.deepEqual(e.stat.ran, [queued.id]);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("기존 대기열 호환: 예전 형식(출처·범위·접수 번호 없음)의 queue.json은 그대로 읽고 이어서 돈다", async () => {
  const dir = await tmp();
  const now = new Date().toISOString();
  const old = [
    { id: randomUUID(), kind: "art", engine: "art", license: "commercial", title: "예전 그림", track: { id: randomUUID() }, task: { prompt: "a blue cup on a white desk" }, status: "queued", stage: "대기 중", createdAt: now, recorded: false },
    { id: randomUUID(), kind: "text2music", engine: "acestep", license: "commercial", title: "예전 곡", track: { id: randomUUID() }, task: { caption: "piano" }, status: "running", stage: "만드는 중", createdAt: now, recorded: false },
    { id: randomUUID(), kind: "art", engine: "art", license: "commercial", title: "끝난 그림", track: { id: randomUUID() }, status: "done", stage: "완료", createdAt: now, finishedAt: now, recorded: true },
  ];
  await writeFile(path.join(dir, "queue.json"), JSON.stringify({ jobs: old }, null, 2));
  const e = await engine(dir);
  try {
    assert.equal(e.queue.broken, "", "기존 대기열은 닫히는 일이 없다");
    assert.deepEqual(e.queue.list().map((j) => j.status), ["queued", "interrupted", "done"], "진행 중이던 작업만 중단됨으로");
    await e.queue.pump();
    assert.ok(await until(() => e.queue.get(old[0].id)?.status === "done"));
    assert.deepEqual(e.stat.ran, [old[0].id], "대기 작업만 돌고 중단된 작업은 다시 돌지 않는다");
    assert.equal(await readOrNull(e.files.queueScoped), null);
  } finally {
    await e.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test("검수 잔여 2: 값의 형태가 이상해 검증 도중 예외가 나도 새 대기열만 닫힌다(원본 보존·기존 대기열 계속)", async () => {
  const now = new Date().toISOString();
  const base = () => ({ id: randomUUID(), kind: "art", engine: "art", license: "commercial", title: "시험 그림", track: { id: randomUUID() }, task: { prompt: "a red apple on a wooden table" }, site: NEW, scope: randomUUID(), clientRequestId: `req-${randomUUID()}`, digest: "a".repeat(64), status: "queued", stage: "대기 중", createdAt: now, recorded: false });
  assert.equal(isScopedArtJob(base()), true, "정상 표본");
  // JSON으로 저장될 수 있는 이상한 형태 — 글자로 바꾸다 예외가 나는 객체, 배열, 숫자, null, 빈 객체
  const odd = [{ toString: 1 }, { toString: null, valueOf: null }, [], [1], 0, 12, null, {}, true];
  const cases = {};
  for (const [i, v] of odd.entries()) {
    for (const k of ["digest", "clientRequestId", "site", "scope", "title"]) cases[`${k}=${JSON.stringify(v)}#${i}`] = { ...base(), [k]: v };
    cases[`task.prompt=${JSON.stringify(v)}#${i}`] = { ...base(), task: { prompt: v } };
    cases[`task.variantId=${JSON.stringify(v)}#${i}`] = { ...base(), task: { prompt: "a red apple on a wooden table", variantId: v } };
    cases[`track.id=${JSON.stringify(v)}#${i}`] = { ...base(), track: { id: v } };
    cases[`task=${JSON.stringify(v)}#${i}`] = { ...base(), task: v };
  }
  // 1) 검증 함수는 어떤 형태에도 예외 없이 false
  for (const [name, job] of Object.entries(cases)) {
    const parsed = JSON.parse(JSON.stringify(job)); // 파일에서 읽은 것과 같은 값
    assert.doesNotThrow(() => isScopedArtJob(parsed), name);
    assert.equal(isScopedArtJob(parsed), false, `${name}: 걸러야 함`);
  }
  // 2) 실제 읽기 — 대표 형태마다 닫힘·원본 보존·기존 대기열 계속
  const picks = ["digest", "clientRequestId", "site", "scope", "task.variantId", "task.prompt"].map((k) => Object.entries(cases).find(([n]) => n.startsWith(`${k}={"toString":1}`)));
  for (const [name, job] of picks) {
    const dir = await tmp();
    const bytes = Buffer.from(JSON.stringify({ jobs: [job] }, null, 2));
    await writeFile(path.join(dir, "queue-scoped.json"), bytes);
    let e;
    try {
      e = await engine(dir); // 읽다가 예외가 새면 여기서 실패한다
      assert.ok(e.scopedQueue.broken, `${name}: 닫혀야 함`);
      const legacy = (await e.pair(MUSIC)).body.token;
      const lj = (await e.call("POST", "/queue", { origin: MUSIC, token: legacy, body: legacyArt() })).body.job;
      assert.ok(await until(() => e.queue.get(lj.id)?.status === "done"), `${name}: 기존 대기열은 돌아야 함`);
      await sleep(40);
      assert.deepEqual(e.stat.ran, [lj.id], `${name}: 손상 기록이 실행됨`);
      assert.ok(bytes.equals(await readFile(e.files.queueScoped)), `${name}: 파일이 바뀜`);
    } finally {
      await e?.close();
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
  }
  // 3) 검증 함수 자체가 예외를 던져도(앞으로 검증이 바뀌어 생길 수 있는 경우) 대기열은 닫힐 뿐 읽기가 실패하지 않는다
  const dir = await tmp();
  const bytes = Buffer.from(JSON.stringify({ jobs: [base()] }));
  await writeFile(path.join(dir, "queue-scoped.json"), bytes);
  const q = createQueue({ file: path.join(dir, "queue-scoped.json"), failClosed: true, run: async () => ({}), validate: () => { throw new TypeError("검증 중 예외"); } });
  try {
    await assert.doesNotReject(q.load());
    assert.ok(q.broken);
    assert.ok(bytes.equals(await readFile(path.join(dir, "queue-scoped.json"))));
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
  // 4) 정상 저장본은 닫히지 않는다
  const okDir = await tmp();
  await writeFile(path.join(okDir, "queue-scoped.json"), JSON.stringify({ jobs: [base()] }));
  const e = await engine(okDir);
  try {
    assert.equal(e.scopedQueue.broken, "");
    assert.equal(e.scopedQueue.list().length, 1);
  } finally {
    await e.close();
    await rm(okDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});
