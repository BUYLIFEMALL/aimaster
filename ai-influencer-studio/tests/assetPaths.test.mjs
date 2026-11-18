// W01-A1 (2026-11-18, CC-SNS-01) — 자산 경로·종류·크기 규칙 순수 시험. DB·저장소 호출 없음.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSET_BUCKET, ASSET_KINDS, ASSET_EXTS, REF_MAX_BYTES, GENERATED_MAX_BYTES, GENERATED_EST_BYTES,
  buildAssetPath, parseAssetPath, pathBelongsTo, checkAssetBytes, extForMime, maxBytesForKind, estimatedGeneratedBytes, isCanonicalUuid,
} from "../src/lib/assets/paths.ts";

const U = "11111111-1111-1111-1111-111111111111";
const V = "22222222-2222-2222-2222-222222222222";
const A = "abcdef01-2345-4789-8abc-def012345678";

test("상수: 버킷·종류·확장자·상한이 계약(§18-3·R1-3)과 같다", () => {
  assert.equal(ASSET_BUCKET, "aif-assets");
  assert.deepEqual([...ASSET_KINDS], ["ref_face", "ref_place", "ref_product", "generated"]);
  assert.deepEqual([...ASSET_EXTS], ["png", "jpg", "webp", "heic"]);
  assert.equal(REF_MAX_BYTES, 1048576);
  assert.equal(GENERATED_MAX_BYTES, 20971520);
  assert.deepEqual(GENERATED_EST_BYTES, { "1K": 4194304, "2K": 10485760, "4K": 20971520 });
});

test("buildAssetPath: 회원/종류/자산.확장자 — 회원 ID가 맨 앞", () => {
  const p = buildAssetPath({ userId: U, kind: "generated", assetId: A, ext: "png" });
  assert.equal(p, `${U}/generated/${A}.png`);
  assert.ok(p.startsWith(U + "/"), "중앙 측정 like 조건에 걸리도록 uid가 앞에 있어야 함");
  assert.deepEqual(parseAssetPath(p), { userId: U, kind: "generated", assetId: A, ext: "png" });
});

test("buildAssetPath: 잘못된 입력은 예외(회원 입력을 경로에 그대로 넣지 않음)", () => {
  assert.throws(() => buildAssetPath({ userId: A.toUpperCase(), kind: "generated", assetId: A, ext: "png" }), "대문자 회원 id");
  assert.throws(() => buildAssetPath({ userId: U, kind: "generated", assetId: A.toUpperCase(), ext: "png" }), "대문자 자산 id");
  assert.throws(() => buildAssetPath({ userId: U, kind: "generated", assetId: "../x", ext: "png" }));
  assert.throws(() => buildAssetPath({ userId: U, kind: "avatar", assetId: A, ext: "png" }));
  assert.throws(() => buildAssetPath({ userId: U, kind: "generated", assetId: A, ext: "gif" }));
  assert.throws(() => buildAssetPath({ userId: U, kind: "generated", assetId: A, ext: "PNG" }));
});

test("parseAssetPath: 규칙 밖 경로는 null", () => {
  for (const bad of [
    null, 123, "",
    `${U}/generated/${A}`, // 확장자 없음
    `${U}/generated/${A}.png.jpg`, // 점 두 개
    `${U}/generated/sub/${A}.png`, // 세그먼트 추가
    `/${U}/generated/${A}.png`, // 앞 슬래시
    `${U}/generated/${A}.png/`, // 뒤 슬래시
    `${A.toUpperCase()}/generated/${A}.png`, // 대문자 회원 id(영문자 포함)
    `${U}/generated/${A.toUpperCase()}.png`, // 대문자 자산 id
    ` ${U}/generated/${A}.png`,
    `${U}/generated/${A}.png\n`,
    `${U}/history/${A}.jpg`, // 히스토리 버킷 경로 모양(다른 kind)
    `${U}/influencer-insta/${A}/01.jpg`, // 게시 임시 사본 경로 모양
  ]) {
    assert.equal(parseAssetPath(bad), null, String(bad));
  }
});

test("pathBelongsTo: 소유자 경계", () => {
  const p = `${U}/ref_face/${A}.jpg`;
  assert.equal(pathBelongsTo(p, U), true);
  assert.equal(pathBelongsTo(p, V), false);
  assert.equal(pathBelongsTo(`${A}/ref_face/${U}.jpg`, A.toUpperCase()), false, "대문자 회원 id로는 소유 아님");
  assert.equal(pathBelongsTo(`${V}/ref_face/${A}.jpg`, U), false);
  assert.equal(pathBelongsTo("x", U), false);
});

test("checkAssetBytes: kind별 상한 분리(ref 1MiB·generated 20MiB), 0·음수·비정수 거절", () => {
  assert.deepEqual(checkAssetBytes("ref_face", REF_MAX_BYTES), { ok: true });
  assert.equal(checkAssetBytes("ref_face", REF_MAX_BYTES + 1).code, "ASSET_TOO_LARGE");
  assert.deepEqual(checkAssetBytes("generated", GENERATED_MAX_BYTES), { ok: true });
  assert.equal(checkAssetBytes("generated", GENERATED_MAX_BYTES + 1).code, "ASSET_TOO_LARGE");
  assert.deepEqual(checkAssetBytes("generated", REF_MAX_BYTES + 1), { ok: true }, "생성 결과는 참고 상한을 적용하지 않음");
  for (const bad of [0, -1, 1.5, "100", null, undefined, NaN]) assert.equal(checkAssetBytes("generated", bad).code, "ASSET_EMPTY", String(bad));
  assert.equal(maxBytesForKind("ref_product"), REF_MAX_BYTES);
});

test("extForMime·estimatedGeneratedBytes", () => {
  assert.equal(extForMime("image/png"), "png");
  assert.equal(extForMime("image/jpeg"), "jpg");
  assert.equal(extForMime("image/webp"), "webp");
  assert.equal(extForMime("image/heic"), "heic");
  assert.equal(extForMime("image/heif"), "heic");
  assert.equal(estimatedGeneratedBytes("1K"), 4194304);
  assert.equal(estimatedGeneratedBytes("2K"), 10485760);
  assert.equal(estimatedGeneratedBytes("4K"), 20971520);
  assert.equal(estimatedGeneratedBytes("8K"), 20971520, "모르는 화질은 최대치로 보수적");
  assert.equal(estimatedGeneratedBytes(undefined), 20971520);
});

test("isCanonicalUuid: 소문자 36자만", () => {
  assert.equal(isCanonicalUuid(U), true);
  assert.equal(isCanonicalUuid(A.toUpperCase()), false, "영문자 포함 id 대문자");
  assert.equal(isCanonicalUuid(A), true);
  assert.equal(isCanonicalUuid(U + "\n"), false);
  assert.equal(isCanonicalUuid(" " + U), false);
  assert.equal(isCanonicalUuid(U.slice(0, 35)), false);
});
