// v1.15 인스타 자동 포스팅 1차 — 컷 캐러셀 장 만들기·고르기·경로 검사
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_INSTA_PHOTOS, SLIDE_W, SLIDE_H, SLIDE_PAD, defaultCaption, defaultPicked, slideLayout, slideSources, togglePicked, validInstaPaths, wrapDialogue,
} from "../src/lib/instagram/slides.ts";

const cut = (i, img = true, dialogue = "") => ({ cutIndex: i, cameraAngle: "", characterNames: [], description: "", dialogue, prompt: "", imageUrl: img ? `data:image/png;base64,${i}` : undefined });

test("장 목록: 표지(넣기로 했을 때만) + 그림 있는 컷만 원고 순서대로", () => {
  const s = slideSources({ includeCover: true, coverImageUrl: "c", cuts: [cut(1, true, " 안녕 "), cut(2, false), cut(3)] });
  assert.deepEqual(s.map((x) => x.id), ["cover", "cut-1", "cut-3"]);
  assert.equal(s[1].dialogue, "안녕");
  assert.deepEqual(slideSources({ includeCover: false, coverImageUrl: "c", cuts: [cut(1)] }).map((x) => x.id), ["cut-1"]);
});

test("고르기: 처음엔 앞 10장, 빼고 넣어도 원고 순서 유지, 10장 넘게는 안 담김", () => {
  const src = slideSources({ includeCover: true, coverImageUrl: "c", cuts: Array.from({ length: 12 }, (_, i) => cut(i + 1)) });
  const p = defaultPicked(src);
  assert.equal(p.length, MAX_INSTA_PHOTOS);
  assert.equal(p[0], "cover");
  assert.deepEqual(togglePicked(src, p, "cut-12"), p, "10장이면 더 안 담김");
  const less = togglePicked(src, p, "cut-2");
  assert.equal(less.includes("cut-2"), false);
  const back = togglePicked(src, togglePicked(src, less, "cut-12"), "cut-2");
  assert.equal(back.length, 10);
  assert.equal(back.indexOf("cut-2") < back.indexOf("cut-3"), true);
});

test("판 배치: 가로 컷은 너비 가득, 세로 컷은 높이 맞춤, 모두 판 안", () => {
  const wide = slideLayout(1024, 768, 0);
  assert.equal(wide.dw, SLIDE_W - SLIDE_PAD * 2);
  assert.equal(wide.bubble, null);
  const tall = slideLayout(768, 1024, 2, 300);
  assert.ok(tall.bubble);
  assert.ok(tall.bubble.y + tall.bubble.h <= SLIDE_H - SLIDE_PAD + 1, "말풍선이 판 아래로 넘치지 않음");
  assert.ok(tall.dy >= SLIDE_PAD - 1);
  assert.ok(Math.abs(tall.dw / tall.dh - 768 / 1024) < 0.01, "그림 비율 유지");
  for (const l of [wide, tall, slideLayout(500, 3000, 3, 2000)]) {
    assert.ok(l.dx >= 0 && l.dx + l.dw <= SLIDE_W && l.dy >= 0 && l.dy + l.dh <= SLIDE_H);
    if (l.bubble) assert.ok(l.bubble.x >= 0 && l.bubble.x + l.bubble.w <= SLIDE_W);
  }
});

test("대사 줄바꿈: 너비 안, 최대 3줄, 넘치면 …", () => {
  const measure = (s) => s.length * 10; // 글자당 10px
  assert.deepEqual(wrapDialogue("", 100, measure), []);
  assert.deepEqual(wrapDialogue("짧은 대사", 100, measure), ["짧은 대사"]);
  const lines = wrapDialogue("가나다라마 바사아자차 카타파하가 나다라마바 사아자차카", 100, measure);
  assert.ok(lines.length <= 3);
  for (const l of lines) assert.ok(measure(l) <= 100, l);
  assert.ok(lines[lines.length - 1].endsWith("…"));
});

test("기본 캡션: 제목·줄거리·해시태그, 빈 칸은 건너뜀", () => {
  assert.equal(defaultCaption("제목", "줄거리"), "제목\n\n줄거리\n\n#웹툰 #AI웹툰 #인스타툰 #웹툰추천");
  assert.equal(defaultCaption(" ", ""), "#웹툰 #AI웹툰 #인스타툰 #웹툰추천");
});

test("임시 경로는 회원 본인 webtoon-insta 폴더의 .jpg 1~10장만", () => {
  const u = "11111111-2222-3333-4444-555555555555";
  assert.equal(validInstaPaths(u, [`${u}/webtoon-insta/b/01.jpg`]), true);
  assert.equal(validInstaPaths(u, []), false);
  assert.equal(validInstaPaths(u, [`x/webtoon-insta/b/01.jpg`]), false);
  assert.equal(validInstaPaths(u, [`${u}/influencer-insta/b/01.jpg`]), false);
  assert.equal(validInstaPaths(u, [`${u}/webtoon-insta/../x/01.jpg`]), false);
  assert.equal(validInstaPaths(u, Array.from({ length: 11 }, (_, i) => `${u}/webtoon-insta/b/${i}.jpg`)), false);
});

import { MAX_BATCH_EPISODES, episodeTimes, parseEpisode, sortEpisodes } from "../src/lib/instagram/slides.ts";

test("회차 묶음: 간격대로 시각 계산(월·해 넘김 포함), 잘못된 입력은 빈 목록", () => {
  assert.deepEqual(episodeTimes("2026-10-27T19:00", 3, 7), ["2026-10-27T19:00", "2026-11-03T19:00", "2026-11-10T19:00"]);
  assert.deepEqual(episodeTimes("2026-12-31T23:30", 2, 1), ["2026-12-31T23:30", "2027-01-01T23:30"]);
  assert.deepEqual(episodeTimes("2026-10-27 19:00", 3, 7), []);
  assert.deepEqual(episodeTimes("2026-10-27T19:00", 0, 7), []);
  assert.equal(MAX_BATCH_EPISODES, 20);
});

test("회차 파일: 웹툰 프로젝트만 읽고, 제목이 없으면 파일 이름, 표지 넣기 기본값 유지", () => {
  const ep = parseEpisode("3화.json", JSON.stringify({ title: "", synopsis: " 줄 ", includeCover: false, coverImageUrl: "c", cuts: [cut(1, true, "대사")] }));
  assert.equal(ep.title, "3화");
  assert.equal(ep.synopsis, "줄");
  assert.deepEqual(ep.sources.map((s) => s.id), ["cut-1"]);
  assert.equal(parseEpisode("x.json", "{깨진"), null);
  assert.equal(parseEpisode("x.json", JSON.stringify({ foo: 1 })), null);
  assert.deepEqual(parseEpisode("y.json", JSON.stringify({ title: "제목", coverImageUrl: "c" })).sources.map((s) => s.id), ["cover"]);
});

test("회차 순서: 파일 이름 숫자 순서(2화 < 10화)", () => {
  const e = (n) => ({ fileName: n, title: n, synopsis: "", sources: [] });
  assert.deepEqual(sortEpisodes([e("10화.json"), e("2화.json"), e("1화.json")]).map((x) => x.fileName), ["1화.json", "2화.json", "10화.json"]);
});
