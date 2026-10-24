import test from "node:test";
import assert from "node:assert/strict";

// 두 프로그램의 실제 사본을 모두 실행한다. 네트워크·회원 DB 쓰기는 하지 않는다.
for (const app of ["ai-doc-chatbot", "ai-prompt-studio"]) {
  const base = new URL(`../../${app}/src/lib/compatibleChat/`, import.meta.url);
  const { compatibleChat } = await import(new URL("transport.ts", base));
  const { endpointFor, credentialValue, CompatibleChatError } = await import(new URL("config.ts", base));
  const { compatibleKeys, compatibleCredentials, saveCompatibleKey, deleteCompatibleKey } = await import(new URL("keyStore.ts", base));
  const options = { provider: "groq", model: "openai/gpt-oss-20b", apiKey: "test-own-secret", messages: [{ role: "user", content: "질문" }] };
  const response = () => Response.json({ model: "actual-model", choices: [{ message: { content: "답변" }, finish_reason: "stop" }] });
  const sse = (text) => {
    const bytes = new TextEncoder().encode(text);
    // 한글 UTF-8 문자 중간도 분리한다.
    return new Response(new ReadableStream({ start(c) { for (const b of bytes) c.enqueue(Uint8Array.of(b)); c.close(); } }));
  };
  const run = (name, fn) => test(`${app}: ${name}`, fn);

  run("공식 URL·모델·토큰 파라미터를 사용하고 한 번만 호출", async () => {
    for (const [provider, model, accountId, expected] of [
      ["groq", "openai/gpt-oss-120b", undefined, "https://api.groq.com/openai/v1/chat/completions"],
      ["openrouter", "meta-llama/llama-3.3-70b-instruct:free", undefined, "https://openrouter.ai/api/v1/chat/completions"],
      ["cloudflare", "@cf/meta/llama-3.2-3b-instruct", "a".repeat(32), `https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/ai/v1/chat/completions`],
    ]) {
      let count = 0;
      const result = await compatibleChat({ ...options, provider, model, accountId }, async (url, init) => {
        count++;
        assert.equal(url, expected);
        assert.equal(init.headers.Authorization, "Bearer test-own-secret");
        const body = JSON.parse(init.body);
        assert.equal(body.model, model);
        assert.equal(body.stream, false);
        assert.equal(body[provider === "groq" ? "max_completion_tokens" : "max_tokens"], 2048);
        assert.equal(body[provider === "groq" ? "max_tokens" : "max_completion_tokens"], undefined);
        return response();
      });
      assert.equal(count, 1);
      assert.deepEqual(result, { text: "답변", model: "actual-model" });
    }
  });
  run("운영 대기 NVIDIA·임의/유료 모델·임의 주소·잘못된 ID는 외부 호출 전에 차단", async () => {
    for (const patch of [{ provider: "nvidia" }, { provider: "https://localhost" }, { provider: "openrouter", model: "paid/model" }, { provider: "cloudflare", model: "@cf/meta/llama-3.2-3b-instruct", accountId: "../secret" }]) {
      await assert.rejects(compatibleChat({ ...options, ...patch }, () => assert.fail("호출 금지")), CompatibleChatError);
    }
    assert.throws(() => endpointFor("cloudflare", undefined, undefined), CompatibleChatError);
  });
  run("한글 SSE·CRLF·여러 data 줄·주석·DONE 처리", async () => {
    const deltas = [];
    const result = await compatibleChat({ ...options, onDelta: (p) => deltas.push(p) }, async () => sse(': ping\r\ndata: {"model":"stream-model",\r\ndata: "choices":[{"delta":{"content":"한글"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" 답변"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    assert.deepEqual(deltas, ["한글", " 답변"]);
    assert.deepEqual(result, { text: "한글 답변", model: "stream-model" });
  });
  run("DONE이 없어도 정상 stop 종결은 허용", async () => {
    assert.equal((await compatibleChat({ ...options, onDelta() {} }, async () => sse('data: {"choices":[{"delta":{"content":"끝"},"finish_reason":"stop"}]}\n\n'))).text, "끝");
  });
  run("중간 단절·형식 오류·상류 오류·출력 잘림은 완성 답변으로 반환하지 않음", async () => {
    for (const tail of ["", 'data: {oops}\n\n', 'data: {"error":{"message":"test-own-secret"}}\n\n', 'data: {"choices":[{"finish_reason":"length"}]}\n\n']) {
      await assert.rejects(compatibleChat({ ...options, onDelta() {} }, async () => sse('data: {"choices":[{"delta":{"content":"일부"}}]}\n\n' + tail)), (error) => error.status === 502 && !error.message.includes("test-own-secret"));
    }
  });
  run("빈 응답·필터 응답을 거절", async () => {
    for (const choices of [[{ message: { content: "  " } }], [{ message: { content: "일부" }, finish_reason: "content_filter" }]]) {
      await assert.rejects(compatibleChat(options, async () => Response.json({ choices })), { status: 502 });
    }
  });
  run("인증·결제·한도·서버 실패는 재시도/키 유출 없이 반환", async () => {
    for (const status of [401, 403, 402, 429, 503]) {
      let count = 0;
      await assert.rejects(compatibleChat(options, async () => { count++; return new Response("test-own-secret", { status }); }), (error) => {
        assert.equal(error.status, status === 503 ? 502 : status);
        assert.equal(error.needApiKey, status === 401 || status === 403);
        return !error.message.includes("test-own-secret");
      });
      assert.equal(count, 1);
    }
  });
  run("네트워크 예외 원문에 키가 있어도 외부에 숨김", async () => {
    await assert.rejects(compatibleChat(options, async () => { throw Error("test-own-secret"); }), (e) => e.status === 502 && !e.message.includes("test-own-secret"));
  });
  run("취소·시간 초과 신호가 실제 fetch까지 전달", async () => {
    const hanging = (_url, init) => new Promise((_resolve, reject) => {
      if (init.signal.aborted) reject(init.signal.reason);
      else init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
    const controller = new AbortController();
    const pending = compatibleChat({ ...options, signal: controller.signal }, hanging);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    await assert.rejects(compatibleChat({ ...options, timeoutMs: 5 }, hanging), { status: 504 });
  });
  run("잘못된 출력 길이·온도·키 값은 호출 전 거절", async () => {
    for (const patch of [{ maxTokens: 0 }, { maxTokens: 8193 }, { temperature: NaN }, { apiKey: "" }]) {
      await assert.rejects(compatibleChat({ ...options, ...patch }, () => assert.fail("호출 금지")), CompatibleChatError);
    }
    assert.throws(() => credentialValue("groq", "key\nother"), CompatibleChatError);
    assert.throws(() => credentialValue("openai", "key"), CompatibleChatError);
  });
  run("본문 수신 중 취소·시간 초과도 부분 답변을 성공 반환하지 않음", async () => {
    const streaming = (_url, init) => Promise.resolve(new Response(new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"일부"}}]}\n\n'));
        init.signal.addEventListener("abort", () => c.error(init.signal.reason), { once: true });
      },
    })));
    const controller = new AbortController();
    await assert.rejects(compatibleChat({ ...options, signal: controller.signal, onDelta() { controller.abort(); } }, streaming), { name: "AbortError" });
    await assert.rejects(compatibleChat({ ...options, timeoutMs: 5, onDelta() {} }, streaming), { status: 504 });
  });
  run("reasoning 필드는 답변 본문으로 노출하지 않음", async () => {
    const result = await compatibleChat(options, async () => Response.json({ choices: [{ message: { content: "답변", reasoning: "비공개 추론" } }] }));
    assert.equal(result.text, "답변");
  });

  function fakeStore(seed = [], failed = false) {
    const rows = structuredClone(seed);
    return { rows, from(table) {
      assert.equal(table, "user_api_keys");
      const filters = [];
      let operation = "select";
      const query = {
        select() { return query; },
        eq(k, v) { filters.push((r) => r[k] === v); return query; },
        in(k, values) { filters.push((r) => values.includes(r[k])); return query; },
        delete() { operation = "delete"; return query; },
        async upsert(row, config) {
          assert.equal(config.onConflict, "user_id,provider");
          if (failed) return { error: Error("test-own-secret") };
          const old = rows.find((r) => r.user_id === row.user_id && r.provider === row.provider);
          if (old) Object.assign(old, row); else rows.push(row);
          return { error: null };
        },
        then(resolve) {
          if (failed) return Promise.resolve({ error: Error("test-own-secret") }).then(resolve);
          // 소유자 조건이 빠지면 다른 회원 키도 반환되므로 아래 시험에서 잡힌다.
          const found = rows.filter((r) => filters.every((f) => f(r)));
          if (operation === "delete") for (const r of found) rows.splice(rows.indexOf(r), 1);
          return Promise.resolve({ data: found, error: null }).then(resolve);
        },
      };
      return query;
    } };
  }
  const keys = [{ user_id: "A", provider: "groq", api_key: "A-own-long-secret" }, { user_id: "B", provider: "groq", api_key: "B-own-long-secret" }];
  run("공용 키 조회는 회원별 격리·마스킹", async () => {
    const store = fakeStore(keys);
    const a = await compatibleKeys(store, "A");
    assert.equal(a.groq.maskedKey, "A-ow••••••cret");
    assert.ok(!JSON.stringify(a).includes("A-own-long-secret"));
    assert.equal((await compatibleKeys(store, "C")).groq.registered, false);
    assert.equal((await compatibleCredentials(store, "B", "groq", undefined)).apiKey, "B-own-long-secret");
    await assert.rejects(compatibleCredentials(store, "C", "groq", undefined), { needApiKey: true });
  });
  run("키 추가·수정·삭제가 다른 회원 값에 영향 없음", async () => {
    const store = fakeStore(keys);
    await saveCompatibleKey(store, "A", "groq", "new-own-key");
    assert.equal(store.rows.find((r) => r.user_id === "B").api_key, "B-own-long-secret");
    await deleteCompatibleKey(store, "A", "groq");
    assert.deepEqual(store.rows, [keys[1]]);
    await assert.rejects(deleteCompatibleKey(store, "B", "gemini"), CompatibleChatError);
  });
  run("Cloudflare는 본인 토큰과 본인 계정 ID 모두 필요", async () => {
    const store = fakeStore([{ user_id: "A", provider: "cloudflare_workers_ai_token", api_key: "token-A" }, { user_id: "B", provider: "cloudflare_account_id", api_key: "b".repeat(32) }]);
    await assert.rejects(compatibleCredentials(store, "A", "cloudflare", undefined), { needApiKey: true });
    await saveCompatibleKey(store, "A", "cloudflare_account_id", "a".repeat(32));
    assert.equal((await compatibleCredentials(store, "A", "cloudflare", undefined)).accountId, "a".repeat(32));
  });
  run("DB 실패를 성공 처리하거나 원문 키를 노출하지 않음", async () => {
    const store = fakeStore(keys, true);
    for (const call of [() => compatibleKeys(store, "A"), () => compatibleCredentials(store, "A", "groq", undefined), () => saveCompatibleKey(store, "A", "groq", "value"), () => deleteCompatibleKey(store, "A", "groq")]) {
      await assert.rejects(call(), (e) => e.status === 500 && !e.message.includes("test-own-secret"));
    }
  });
}
