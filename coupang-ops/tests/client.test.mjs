// 쿠팡 WING 서명 규칙 확인(가짜 키·고정 시각, 외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildWingAuthorization, wingSignedDate } from "../src/lib/coupang/sign.ts";

const keys = { accessKey: "test-access", secretKey: "test-secret" };
const now = new Date(Date.UTC(2026, 9, 28, 3, 4, 5));

test("signed-date 형식은 yyMMdd'T'HHmmss'Z'(UTC)", () => {
  assert.equal(wingSignedDate(now), "261028T030405Z");
});

test("서명 대상은 날짜+메서드+경로+조건을 ? 없이 이은 것", () => {
  const path = "/v2/providers/marketplace_openapi/apis/api/v1/vendor/shipping-place/outbound";
  const query = "pageNum=1&pageSize=10";
  const expected = crypto.createHmac("sha256", keys.secretKey).update(`261028T030405ZGET${path}${query}`).digest("hex");
  assert.equal(
    buildWingAuthorization("GET", path, query, keys, now),
    `CEA algorithm=HmacSHA256, access-key=test-access, signed-date=261028T030405Z, signature=${expected}`,
  );
});
