import { test } from "node:test";
import assert from "node:assert/strict";
import { convertPath } from "../src/lib/imageTools/convertPath.ts";

test("검색값이 없으면 /convert", () => {
  assert.equal(convertPath({}), "/convert");
});
test("규격·원본 주소를 그대로 넘긴다", () => {
  const p = convertPath({ preset: "story", src: "https://example.com/a b.jpg" });
  const u = new URL(p, "https://x.test");
  assert.equal(u.pathname, "/convert");
  assert.equal(u.searchParams.get("preset"), "story");
  assert.equal(u.searchParams.get("src"), "https://example.com/a b.jpg");
});
test("같은 이름이 여러 개면 모두 넘긴다", () => {
  assert.equal(convertPath({ a: ["1", "2"], b: undefined }), "/convert?a=1&a=2");
});
