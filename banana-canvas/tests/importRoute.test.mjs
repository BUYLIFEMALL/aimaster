// v1.16 받기 허용 버킷 — 정적 검사(무료). 본인 폴더 검사(`/${b}/${userId}/`)는 그대로여야 한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const r = readFileSync(new URL("../src/app/api/import/route.ts", import.meta.url), "utf8");
test("이미지 스튜디오·인물사진 버킷만, 본인 폴더만 받는다", () => {
  assert.match(r, /const ALLOWED_BUCKETS = \["ai-image-generations", "portrait-photo-files"\];/);
  assert.match(r, /startsWith\(`\/storage\/v1\/object\/sign\/\$\{b\}\/\$\{userId\}\/`\)/);
  assert.match(r, /checkProgramAccessApi\(\)/);
  assert.match(r, /redirect: "error"/);
});
