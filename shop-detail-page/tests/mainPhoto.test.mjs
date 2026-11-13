// 메이커 P2 대표사진 칸 규칙 시험 — 실행: node --test tests/ (Node 22.18+ 형식 지우기로 .ts 직접 읽음)
import test from "node:test";
import assert from "node:assert/strict";
import { isOwnMainPhotoPath, isStale, mainPhotoFolder, nextMainHistory, representativePhoto } from "../lib/mainPhoto.ts";

const U = "11111111-1111-4111-8111-111111111111", P = "22222222-2222-4222-8222-222222222222", F = "33333333-3333-4333-8333-333333333333";

test("F7 본인·그 상품 대표사진 폴더 파일만 받는다", () => {
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(U, P)}${F}.jpg`, U, P), true);
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(U, P)}${F}.png`, U, P), true);
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(F, P)}${F}.jpg`, U, P), false); // 다른 회원
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(U, F)}${F}.jpg`, U, P), false); // 다른 상품
  assert.equal(isOwnMainPhotoPath(`${U}/products/${P}/${F}.jpg`, U, P), false); // main 폴더 밖(원본 자리)
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(U, P)}../x.jpg`, U, P), false);
  assert.equal(isOwnMainPhotoPath(`${mainPhotoFolder(U, P)}${F}.gif`, U, P), false);
  assert.equal(isOwnMainPhotoPath(null, U, P), false);
});

test("F7 이력: 맨 뒤에 추가, 10장 넘으면 오래된 것부터 빼서 지울 목록으로", () => {
  assert.deepEqual(nextMainHistory([], "a"), { list: ["a"], dropped: [] });
  assert.deepEqual(nextMainHistory(["a", "b"], "a"), { list: ["b", "a"], dropped: [] });
  const many = Array.from({ length: 10 }, (_, i) => `u${i}`);
  assert.deepEqual(nextMainHistory(many, "new"), { list: [...many.slice(1), "new"], dropped: ["u0"] });
});

test("F7 묵은 작업 감지·대표사진 고르기(합성 → 원본 순)", () => {
  assert.equal(isStale("2026-11-13T01:02:03.456+00:00", "2026-11-13T01:02:03.456Z"), false);
  assert.equal(isStale("2026-11-13T01:02:03.456Z", "2026-11-13T01:02:04Z"), true);
  assert.equal(representativePhoto({ main_image_url: "m", source_image_url: "s" }), "m");
  assert.equal(representativePhoto({ main_image_url: null, source_image_url: "s" }), "s");
  assert.equal(representativePhoto({}), null);
});
