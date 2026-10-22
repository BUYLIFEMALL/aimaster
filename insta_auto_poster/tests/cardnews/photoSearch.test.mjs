// 배경 무료 사진 검색(v1.63) — 주소 허용 규칙, 검색 요청 모양, 응답 해석
import test from "node:test";
import assert from "node:assert/strict";
import { allowedPhotoUrl, photoSearchRequest, parsePhotos, searchPhotos, isPhotoProvider } from "../../src/lib/cardnews/photoSearch.ts";

test("제공처 이미지 서버의 사진 경로만 허용", () => {
  assert.ok(allowedPhotoUrl("https://cdn.pixabay.com/photo/2020/01/01/a.jpg"));
  assert.ok(allowedPhotoUrl("https://pixabay.com/get/abc123.jpg"));
  assert.ok(allowedPhotoUrl("https://images.pexels.com/photos/1/pexels-1.jpeg"));
  for (const bad of ["http://cdn.pixabay.com/photo/a.jpg", "https://evil.com/photo/a.jpg", "https://images.pexels.com/photos/a.jpg#x", "https://cdn.pixabay.com/photo/a.svg", "https://images.pexels.com:8443/photos/a.jpg", 123])
    assert.throws(() => allowedPhotoUrl(bad));
});

test("검색 요청: Pixabay는 주소에 키, Pexels는 머리글에 키", () => {
  const a = photoSearchRequest("pixabay", "K1", "커피", "4:5");
  assert.equal(a.url.hostname, "pixabay.com");
  assert.equal(a.url.searchParams.get("key"), "K1");
  assert.equal(a.url.searchParams.get("orientation"), "vertical");
  assert.deepEqual(a.headers, {});
  const b = photoSearchRequest("pexels", "K2", "coffee", "1:1");
  assert.equal(b.url.searchParams.get("orientation"), "square");
  assert.equal(b.url.searchParams.has("key"), false);
  assert.equal(b.headers.Authorization, "K2");
  assert.ok(isPhotoProvider("pexels") && !isPhotoProvider("unsplash"));
});

test("응답 해석: 허용 주소 행만, 작가·출처 포함", () => {
  const pix = parsePhotos("pixabay", { hits: [
    { id: 1, largeImageURL: "https://pixabay.com/get/a.jpg", webformatURL: "https://pixabay.com/get/a_640.jpg", pageURL: "https://pixabay.com/photos/a-1/", user: "kim" },
    { id: 2, largeImageURL: "https://evil.com/a.jpg", webformatURL: "https://pixabay.com/get/b.jpg", pageURL: "https://pixabay.com/photos/b-2/", user: "x" },
  ] });
  assert.equal(pix.length, 1);
  assert.deepEqual([pix[0].id, pix[0].author, pix[0].source], ["1", "kim", "pixabay"]);
  const pex = parsePhotos("pexels", { photos: [{ id: 9, src: { large2x: "https://images.pexels.com/photos/9/a.jpeg", medium: "https://images.pexels.com/photos/9/a-m.jpeg" }, url: "https://www.pexels.com/photo/a-9/", photographer: "lee" }] });
  assert.equal(pex[0].author, "lee");
  assert.throws(() => parsePhotos("pexels", { nope: 1 }));
});

test("검색 실패 안내: 키 오류·한도", async () => {
  const fake = (status) => async () => new Response("{}", { status });
  await assert.rejects(searchPhotos("pixabay", "k", "q", "4:5", fake(401)), /API 키가 올바르지 않습니다/);
  await assert.rejects(searchPhotos("pexels", "k", "q", "4:5", fake(429)), /한도/);
});
