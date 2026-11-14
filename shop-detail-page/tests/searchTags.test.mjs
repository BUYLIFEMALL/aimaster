// E2-4 검색 태그 정리 시험(상품소싱 → 상세페이지 → 스마트스토어 등록기)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSearchTags, MAX_SEARCH_TAGS } from "../lib/searchTags.ts";

test("쉼표·줄바꿈으로 나누고 #·띄어쓰기 빼기, 중복·20자 초과 제외", () => {
  assert.deepEqual(parseSearchTags("#캠핑 의자, 캠핑의자\n낚시의자,,접이식의자"), ["캠핑의자", "낚시의자", "접이식의자"]);
  assert.deepEqual(parseSearchTags("가".repeat(21)), []);
  assert.deepEqual(parseSearchTags(""), []);
});

test("최대 10개", () => {
  assert.equal(parseSearchTags(Array.from({ length: 14 }, (_, i) => `t${i}`).join(",")).length, MAX_SEARCH_TAGS);
});
