// 리믹스 저장 연결(W1·W5·W6) 시험용 대역 — 네트워크·DB·키 없음. 가사 원문은 기록·출력하지 않는다(길이만).
// 1) fakePgClient: 조건부 갱신 체인을 기록하고, 정해 둔 응답을 차례로 돌려준다(응답 유실은 throw 또는 status 0).
// 2) fakeRecordInfo: requestRemixRecordInfo deps(fetch·statusHint)를 정해 둔 응답으로.
// 3) insertRecorder: insertRemixVariantsWithFallback에 넘길 insert 함수 — 받은 행의 칸 이름·길이만 기록.
// 4) CALLER_OUTCOMES: W5(웹훅)·W6(수동)이 저장 결과 7종을 각자 어떻게 전달해야 하는지의 기대 표(연결 시험의 기준).

export function fakePgClient(responses) {
  const calls = [];
  let i = 0;
  const client = {
    from(table) {
      const call = { table, update: null, eq: [], or: [], select: null };
      calls.push(call);
      const b = {
        eq(col, val) { call.eq.push([col, val]); return b; },
        or(f) { call.or.push(f); return b; },
        select(cols) {
          call.select = cols;
          const r = responses[i++];
          if (!r) return Promise.reject(new Error("대역: 준비되지 않은 추가 호출"));
          if (r.throw) return Promise.reject(new Error(r.throw));
          return Promise.resolve(r);
        },
      };
      return { update(values) { call.update = { ...values }; return b; } };
    },
  };
  return { client, calls };
}

export function fakeRecordInfo(res) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization ?? null });
    if (res.throw) throw new TypeError(res.throw);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      text: async () => (typeof res.body === "string" ? res.body : JSON.stringify(res.body)),
      json: async () => res.body,
    };
  };
  return { deps: { fetch: fetchFn, statusHint: () => "" }, calls };
}

export function insertRecorder(responses) {
  const calls = [];
  let i = 0;
  const fn = async (rows) => {
    calls.push(rows.map((r) => ({ keys: Object.keys(r).sort(), lyricsLen: typeof r.lyrics === "string" ? [...r.lyrics].length : null })));
    const r = responses[i++];
    if (!r) throw new Error("대역: 준비되지 않은 추가 insert");
    if (r.throw) throw new Error(r.throw);
    return { error: r.error ?? null, status: r.status, transportLost: r.transportLost };
  };
  return { fn, calls };
}

/** 저장 결과 7종 → 웹훅 응답·수동 화면 결과(연결 시험의 기대값). 연장은 ok 계열에서만, 재저장은 모든 경우 0. */
export const CALLER_OUTCOMES = {
  ok: { webhook: "saved", manual: "completed", extendAllowed: true, remixStatus: "completed" },
  ok_without_lyrics_columns: { webhook: "saved", manual: "completed", extendAllowed: true, remixStatus: "completed" },
  skipped: { webhook: "failed", manual: "failed", extendAllowed: false, remixStatus: "failed" },
  error: { webhook: "failed", manual: "failed", extendAllowed: false, remixStatus: "failed" },
  retry_failed: { webhook: "failed", manual: "failed", extendAllowed: false, remixStatus: "failed" },
  uncertain: { webhook: "uncertain", manual: "uncertain", extendAllowed: false, remixStatus: "generating+__rins__" },
  retry_uncertain: { webhook: "uncertain", manual: "uncertain", extendAllowed: false, remixStatus: "generating+__rins__" },
};
