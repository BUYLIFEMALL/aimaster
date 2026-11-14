import test from "node:test";
import assert from "node:assert/strict";
import { registeredPostedPaths } from "../src/lib/smartstore/posted.ts";

const U = "11111111-1111-1111-1111-111111111111";
const url = (p) => `https://x.supabase.co/storage/v1/object/public/shop-detail-images/${p}`;

test("등록 성공 표시: 대표(합성 우선)·추가·섹션, 본인 폴더만, 중복 없음", () => {
  const paths = registeredPostedPaths(
    U,
    { main_image_url: url(`${U}/main.png`), source_image_url: url(`${U}/src.png`), reference_image_urls: [url(`${U}/ref1.jpg`), url(`other/ref2.jpg`)] },
    [url(`${U}/s1.png`), null, url(`${U}/main.png`), "https://elsewhere.com/a.png"],
  );
  assert.deepEqual(paths, [`${U}/main.png`, `${U}/ref1.jpg`, `${U}/s1.png`]);
});

test("대표사진이 없으면 원본 사진, 사진이 하나도 없으면 빈 목록", () => {
  assert.deepEqual(registeredPostedPaths(U, { source_image_url: url(`${U}/src.png`) }, []), [`${U}/src.png`]);
  assert.deepEqual(registeredPostedPaths(U, {}, []), []);
});
