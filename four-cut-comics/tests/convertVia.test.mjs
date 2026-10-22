import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("v1.31 형식 바꾸기 링크가 보낸 곳(?via=four-cut-comics)을 함께 넘긴다", () => {
  const src = readFileSync(new URL("../src/components/studio/ServerWorks.tsx", import.meta.url), "utf8");
  assert.match(src, /image-convert-studio\.buylife\.xyz\/convert\?src=\$\{encodeURIComponent\(w\.url\)\}.*&via=four-cut-comics`/);
});
