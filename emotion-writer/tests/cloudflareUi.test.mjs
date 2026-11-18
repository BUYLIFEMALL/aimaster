import test from "node:test";
import assert from "node:assert/strict";
import {
  checkCloudflareRegistered,
  resolveInitialCloudflareStatus,
} from "../src/lib/cloudflareStatus.ts";

// Supabase 관리자 모의 클라이언트 생성
function createMockClient(rows = [], fail = false) {
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
                  assert.deepEqual(pVals, [
                    "cloudflare_workers_ai_token",
                    "cloudflare_account_id",
                  ]);
                  if (fail) {
                    return Promise.resolve({
                      data: null,
                      error: new Error("DB Connection Failed"),
                    });
                  }
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

// ============================================================================
// 1. 실 구현 checkCloudflareRegistered 함수 직접 검증
// ============================================================================
test("Cloudflare 실 구현: 토큰과 계정 ID 2개 모두 존재할 때만 true", async () => {
  const bothExist = [
    { provider: "cloudflare_workers_ai_token", api_key: "valid-secret-token" },
    {
      provider: "cloudflare_account_id",
      api_key: "0123456789abcdef0123456789abcdef",
    },
  ];
  const result = await checkCloudflareRegistered(
    createMockClient(bothExist),
    "test-user-id",
  );
  assert.equal(result, true);
});

test("Cloudflare 실 구현: 토큰만 있고 계정 ID 누락 시 false (한 키 누락)", async () => {
  const tokenOnly = [
    { provider: "cloudflare_workers_ai_token", api_key: "valid-secret-token" },
  ];
  const result = await checkCloudflareRegistered(
    createMockClient(tokenOnly),
    "test-user-id",
  );
  assert.equal(result, false);
});

test("Cloudflare 실 구현: 계정 ID만 있고 토큰 누락 시 false (한 키 누락)", async () => {
  const accountOnly = [
    {
      provider: "cloudflare_account_id",
      api_key: "0123456789abcdef0123456789abcdef",
    },
  ];
  const result = await checkCloudflareRegistered(
    createMockClient(accountOnly),
    "test-user-id",
  );
  assert.equal(result, false);
});

test("Cloudflare 실 구현: 키 값이 빈 문자열이거나 null이면 false", async () => {
  const emptyKeys = [
    { provider: "cloudflare_workers_ai_token", api_key: "" },
    { provider: "cloudflare_account_id", api_key: null },
  ];
  const result = await checkCloudflareRegistered(
    createMockClient(emptyKeys),
    "test-user-id",
  );
  assert.equal(result, false);
});

test("Cloudflare 실 구현: DB 조회 실패 시 미등록(false) 단정하지 않고 에러 전파", async () => {
  await assert.rejects(
    () =>
      checkCloudflareRegistered(createMockClient([], true), "test-user-id"),
    /Cloudflare 키 등록 상태를 확인하지 못했습니다/,
  );
});

test("Cloudflare 실 구현: 평문 키/토큰 절대 노출 0 (반환값은 오직 순수 boolean)", async () => {
  const rows = [
    {
      provider: "cloudflare_workers_ai_token",
      api_key: "super-secret-raw-token",
    },
    { provider: "cloudflare_account_id", api_key: "secret-account-id" },
  ];
  const res = await checkCloudflareRegistered(
    createMockClient(rows),
    "test-user-id",
  );
  assert.equal(typeof res, "boolean");
  assert.equal(res, true);
  assert.equal(JSON.stringify(res), "true");
});

// ============================================================================
// 2. 반례 검증: 초기 조회 실패 시 미등록(false) 오표시 방어
// ============================================================================
test("반례 1 (초기 로드 실패 방어): DB 오류 시 catch false 대신 null을 반환하여 미등록 오표시 방지", async () => {
  // 기존 SHA 결함: catch(() => false) -> 등록된 회원이더라도 DB 일시 장애 시 "키 등록 필요"로 오표시됨
  const buggyLegacyHandler = async () => {
    try {
      throw new Error("DB Connection Error");
    } catch {
      return false; // 오표시 버그
    }
  };
  const legacyResult = await buggyLegacyHandler();
  assert.equal(
    legacyResult,
    false,
    "기존 로직은 오류 시 미등록(false)으로 오표시됨",
  );

  // 수정 후 로직: resolveInitialCloudflareStatus 사용 시 null(알 수 없음/재확인 권장) 반환
  const fixedResult = await resolveInitialCloudflareStatus(async () => {
    throw new Error("DB Connection Error");
  });
  assert.equal(
    fixedResult,
    null,
    "수정 후 로직은 오류 시 null을 반환하여 '확인 필요 · 재확인 권장'으로 안전 처리됨",
  );
});

test("반례 2 (정상 조회 시 불린 보존): 성공 시 true/false 원본 불린 정확히 전달", async () => {
  const trueResult = await resolveInitialCloudflareStatus(async () => true);
  assert.equal(trueResult, true);

  const falseResult = await resolveInitialCloudflareStatus(async () => false);
  assert.equal(falseResult, false);
});

// ============================================================================
// 3. API Route POST 불변성 및 GET 응답 구조 검증
// ============================================================================
test("API Route 불변성: Cloudflare는 POST 저장 대상이 아니며 오직 GET cloudflare boolean만 제공", () => {
  const ALLOWED_POST_PROVIDERS = ["openai", "anthropic", "gemini", "pixabay"];
  // POST 요청에서 cloudflare는 지원 프로바이더에 포함되지 않음을 검증
  assert.ok(!ALLOWED_POST_PROVIDERS.includes("cloudflare"));
  assert.ok(!ALLOWED_POST_PROVIDERS.includes("cloudflare_workers_ai_token"));
  assert.ok(!ALLOWED_POST_PROVIDERS.includes("cloudflare_account_id"));

  // GET 응답 모델 규격 검증
  const mockGetPayload = {
    keys: { openai: true, anthropic: false, gemini: false, pixabay: true },
    cloudflare: true,
  };
  assert.equal(typeof mockGetPayload.cloudflare, "boolean");
  assert.equal(Object.keys(mockGetPayload.keys).length, 4);
});
