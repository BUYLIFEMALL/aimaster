// 시험용 모의 엔진 — 엔진 e8e52b505의 「새 그림 사이트 범위」 계약을 흉내 낸다(실제 엔진·네트워크 없음).
// 근거: free-music-studio/engine/src/gateway.mjs(/pair, handleScopedQueue, handleScopedArt), security.mjs(createScopedTokens), queue.mjs(add).
// 실제 엔진과 어긋나지 않는지는 tests/engine.test.mjs의 「계약 대조」 시험이 엔진 소스의 해당 줄을 읽어 확인한다.
import { createHash, randomUUID } from "node:crypto";

export const ENGINE = "http://127.0.0.1:47821";
const SIZES = ["1024x1024", "1280x720", "720x1280"];
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;
const UUID = /^[0-9a-f-]{36}$/;
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export function createMockEngine({ codes = ["123456", "654321", "111222", "333444"] } = {}) {
  const st = {
    codes: [...codes],
    tokens: [], // { token, scope }
    jobs: [], // { id, kind, status, title, site, scope, clientRequestId, digest, ... }
    queueBroken: "",
    tokensBroken: "",
    calls: [], // { method, path, url, auth, body, init }
    /** (call) => true 면 엔진이 처리한 **뒤** 응답을 잃는다(브라우저는 실패로 봄) */
    loseResponse: null,
    /** (call) => true 면 엔진에 닿기 **전에** 실패한다(엔진은 요청을 못 봄) */
    unreachable: null,
    /** (call) => Promise 면 응답을 그 약속이 풀릴 때까지 붙잡는다 */
    hold: null,
    /** (call) => Response 면 그 응답으로 대신한다 */
    override: null,
  };
  const scopeOf = (token) => (st.tokensBroken ? null : st.tokens.find((t) => t.token === token)?.scope ?? null);
  const pub = ({ task: _task, ...rest }) => rest;

  async function handle(call) {
    const { method, path, body, auth } = call;
    if (method === "GET" && path === "/status") return json(200, { name: "AI 무료음악 자동화 엔진", version: "0.9.0", features: ["queue", "local-art"] });
    if (method === "POST" && path === "/pair") {
      if ((body?.code ?? "").trim() !== st.codes[0]) return json(401, { error: "연결 코드가 맞지 않습니다. 엔진 창의 6자리 숫자를 확인해 주세요." });
      if (st.tokensBroken) return json(503, { error: `연결 기록 파일을 읽지 못해 새 연결을 만들 수 없습니다(${st.tokensBroken}). 파일은 그대로 두었습니다.` });
      const prev = typeof body.prevToken === "string" ? st.tokens.find((t) => t.token === body.prevToken) : null;
      const issued = { token: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""), scope: prev ? prev.scope : randomUUID() };
      st.tokens = [...st.tokens.filter((t) => t !== prev), issued]; // 이어받으면 이전 토큰은 폐기
      st.codes.push(st.codes.shift()); // 한 번 쓴 코드는 바뀐다
      return json(200, { token: issued.token, inherited: !!prev });
    }
    const scope = auth ? scopeOf(auth) : null;
    if (!scope) return json(401, { error: "PC 연결이 필요합니다.", needPair: true });
    const own = (j) => !!j && j.scope === scope;
    const parts = path.split("/").filter(Boolean);

    if (parts[0] === "image-models" && method === "GET" && parts.length === 1) return json(200, { build: { id: "win-cuda12", label: "NVIDIA" }, reason: "", recommendedId: "flux2-klein-4b:q4_0", families: [], engineInstalled: true, installed: [], defaultId: null });

    if (parts[0] === "image-art" && method === "GET" && parts.length === 2) {
      const job = st.jobs.find((j) => j.id === parts[1]);
      if (!UUID.test(parts[1]) || !own(job) || job.status !== "done") return json(404, { error: "그린 그림이 없습니다." });
      return new Response(PNG, { status: 200, headers: { "content-type": "image/png", "cache-control": "no-store" } });
    }

    if (parts[0] === "queue") {
      if (st.queueBroken) return json(503, { error: `작업 기록 파일을 읽지 못해 이 사이트의 작업을 멈췄습니다(${st.queueBroken}). 엔진 창을 확인해 주세요.` });
      if (method === "GET" && parts.length === 1) return json(200, { jobs: st.jobs.filter(own).map(pub) });
      if (method === "POST" && parts.length === 1) {
        const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
        if (body?.kind !== "art" || !title || !UUID.test(body?.track?.id ?? "") || !body.task || typeof body.task !== "object") return json(400, { error: "그림 작업 내용이 올바르지 않습니다." });
        if (typeof body.clientRequestId !== "string" || !REQUEST_ID.test(body.clientRequestId)) return json(400, { error: "접수 번호가 올바르지 않습니다." });
        const prompt = String(body.task.prompt ?? "").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim();
        if (prompt.split(" ").length < 3) return json(400, { error: "그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다)." });
        const { width, height, seed, variantId } = body.task;
        const sized = width !== undefined || height !== undefined;
        if (sized && !SIZES.includes(`${width}x${height}`)) return json(400, { error: "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280)." });
        if (seed !== undefined && !(Number.isInteger(seed) && seed >= 0 && seed <= 2147483647)) return json(400, { error: "시드 값이 올바르지 않습니다." });
        const digest = createHash("sha256").update(JSON.stringify([variantId ?? null, prompt, width ?? null, height ?? null, seed ?? null])).digest("hex");
        const same = st.jobs.find((j) => j.clientRequestId === body.clientRequestId && j.scope === scope);
        if (same) return same.digest === digest ? json(200, { job: pub(same) }) : json(409, { error: "같은 접수 번호로 다른 내용이 이미 접수돼 있습니다." });
        if (st.jobs.filter((j) => j.status === "queued" || j.status === "running").length >= 50) return json(400, { error: "대기열에는 50개까지 넣을 수 있습니다. 앞의 작업이 끝난 뒤 넣어 주세요." });
        const job = { id: randomUUID(), kind: "art", engine: "art", title, status: "queued", stage: "대기 중", site: "https://free-image-studio.buylife.xyz", scope, clientRequestId: body.clientRequestId, digest, createdAt: new Date().toISOString(), task: body.task };
        st.jobs.push(job);
        return json(200, { job: pub(job) });
      }
      const job = parts[1] ? st.jobs.find((j) => j.id === parts[1]) : null;
      if (!own(job)) return json(404, { error: "그 작업을 찾지 못했습니다." });
      if (method === "POST" && parts[2] === "cancel" && parts.length === 3) {
        if (job.status === "queued" || job.status === "running") job.status = "cancelled";
        return json(200, { ok: true });
      }
      if (method === "DELETE" && parts.length === 2) {
        if (job.status === "queued" || job.status === "running") return json(400, { error: "끝난 작업만 지울 수 있습니다." });
        st.jobs = st.jobs.filter((j) => j !== job);
        return json(200, { ok: true });
      }
    }
    return json(404, { error: "없는 주소입니다." });
  }

  const fetch = async (url, init = {}) => {
    const u = new URL(String(url));
    const auth = /^Bearer (.+)$/.exec(init.headers?.Authorization ?? "")?.[1] ?? null;
    const call = { method: init.method ?? "GET", path: u.pathname, url: String(url), auth, body: init.body ? JSON.parse(init.body) : undefined, init };
    st.calls.push(call);
    if (u.origin !== ENGINE) throw new TypeError("모의 엔진: 루프백이 아닌 주소");
    if (st.unreachable?.(call)) throw new TypeError("fetch failed");
    const res = st.override?.(call) ?? (await handle(call));
    if (st.loseResponse?.(call)) throw new TypeError("fetch failed");
    const gate = st.hold?.(call);
    if (gate) await gate;
    return res;
  };

  return { st, fetch, finish: (jobId, status = "done") => (st.jobs.find((j) => j.id === jobId).status = status) };
}

/** localStorage를 흉내 낸 저장소. failSet(key)가 true면 쓰기에서 예외 */
export function memoryStorage() {
  const map = new Map();
  const s = {
    map,
    failSet: null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (s.failSet?.(k)) throw new DOMException("quota", "QuotaExceededError");
      map.set(k, String(v));
    },
    removeItem: (k) => void map.delete(k),
  };
  return s;
}
