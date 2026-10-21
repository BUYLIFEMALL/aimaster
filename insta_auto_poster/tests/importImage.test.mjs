// v1.47 다른 프로그램이 넘긴 첨부 이미지 받기 판단(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { acceptImportImage } from "../src/lib/importImage.ts";

const SB = "https://esgxyikcnnvmlhygjkth.supabase.co";
const ME = "4a82ff77-97f7-474d-866e-8e9431858ed3";
const url = (who, name = "0b8f2b8e-1c1a-4d1e-9c55-111111111111.jpg") => `${SB}/storage/v1/object/public/insta-post-images/${who}/${name}`;

test("본인 폴더의 이미지 파일만 받는다", () => {
  assert.equal(acceptImportImage(url(ME), ME, SB), url(ME));
  assert.equal(acceptImportImage(url("someone-else"), ME, SB), null);
  assert.equal(acceptImportImage(url(ME, "../x.jpg"), ME, SB), null);
  assert.equal(acceptImportImage(url(ME, "a.svg"), ME, SB), null);
});

test("다른 호스트·다른 버킷·쿼리·비로그인은 거부", () => {
  assert.equal(acceptImportImage(url(ME).replace(SB, "https://evil.example.com"), ME, SB), null);
  assert.equal(acceptImportImage(url(ME).replace("insta-post-images", "banana-canvas-files"), ME, SB), null);
  assert.equal(acceptImportImage(url(ME) + "?x=1", ME, SB), null);
  assert.equal(acceptImportImage(url(ME), "", SB), null);
  assert.equal(acceptImportImage(123, ME, SB), null);
});
