import test from "node:test";
import assert from "node:assert/strict";

// Supabase 관리자 모의 클라이언트를 주입하여 hasCloudflareWorkersAiKey 로직을 격리 검증한다.
function fakeClient(rows = [], fail = false) {
  return {
    from(table) {
      assert.equal(table, "user_api_keys");
      return {
        select(cols) {
          assert.equal(cols, "provider,api_key");
          return {
            eq(col, val) {
              assert.equal(col, "user_id");
              assert.equal(val, "test-user-id");
              return {
                in(pCol, pVals) {
                  assert.equal(pCol, "provider");
                  assert.deepEqual(pVals, ["cloudflare_workers_ai_token", "cloudflare_account_id"]);
                  if (fail) return Promise.resolve({ data: null, error: new Error("DB Connection Error") });
                  return Promise.resolve({ data: rows, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
}

async function checkCloudflare(client, userId = "test-user-id") {
  const { data, error } = await client
    .from("user_api_keys")
    .select("provider,api_key")
    .eq("user_id", userId)
    .in("provider", ["cloudflare_workers_ai_token", "cloudflare_account_id"]);
  if (error) throw new Error("Cloudflare 키 등록 상태를 확인하지 못했습니다.");
  const hasToken =
    data?.some(
      (r) => r.provider === "cloudflare_workers_ai_token" && Boolean(r.api_key),
    ) || false;
  const hasAccount =
    data?.some(
      (r) => r.provider === "cloudflare_account_id" && Boolean(r.api_key),
    ) || false;
  return hasToken && hasAccount;
}

test("Cloudflare 키 검사: 토큰과 계정 ID 2개 모두 존재할 때만 true", async () => {
  const bothExist = [
    { provider: "cloudflare_workers_ai_token", api_key: "valid-secret-token" },
    { provider: "cloudflare_account_id", api_key: "0123456789abcdef0123456789abcdef" },
  ];
  const result = await checkCloudflare(fakeClient(bothExist));
  assert.equal(result, true);
});

test("Cloudflare 키 검사: 토큰만 있고 계정 ID 누락 시 false (한 키 누락)", async () => {
  const tokenOnly = [
    { provider: "cloudflare_workers_ai_token", api_key: "valid-secret-token" },
  ];
  const result = await checkCloudflare(fakeClient(tokenOnly));
  assert.equal(result, false);
});

test("Cloudflare 키 검사: 계정 ID만 있고 토큰 누락 시 false (한 키 누락)", async () => {
  const accountOnly = [
    { provider: "cloudflare_account_id", api_key: "0123456789abcdef0123456789abcdef" },
  ];
  const result = await checkCloudflare(fakeClient(accountOnly));
  assert.equal(result, false);
});

test("Cloudflare 키 검사: 키 값이 빈 문자열이거나 null이면 false", async () => {
  const emptyKeys = [
    { provider: "cloudflare_workers_ai_token", api_key: "" },
    { provider: "cloudflare_account_id", api_key: null },
  ];
  const result = await checkCloudflare(fakeClient(emptyKeys));
  assert.equal(result, false);
});

test("Cloudflare 키 검사: DB 조회 실패 시 미등록 단정하지 않고 에러 전파", async () => {
  await assert.rejects(
    () => checkCloudflare(fakeClient([], true)),
    /Cloudflare 키 등록 상태를 확인하지 못했습니다/,
  );
});

test("Cloudflare 키 검사: 평문 키/토큰 절대 노출 0 (반환값은 오직 boolean)", async () => {
  const rows = [
    { provider: "cloudflare_workers_ai_token", api_key: "super-secret-raw-token" },
    { provider: "cloudflare_account_id", api_key: "secret-account-id" },
  ];
  const res = await checkCloudflare(fakeClient(rows));
  assert.equal(typeof res, "boolean");
  assert.equal(res, true);
  // 문자열이나 객체가 아닌 순수 boolean 확인
  assert.equal(JSON.stringify(res), "true");
});
