// 관련성·언어·종교 거르기 기준 모듈(src/lib/youtube/relevanceFilter.ts) 시험 — 2026-11-20 영상 담당.
// boks/core.ts에서 옮긴 함수가 같은 결과를 내고, core.ts가 같은 함수를 다시 내보내는지 확인. 네트워크 없음.
// 실행: node --test tests/relevanceFilter.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});
const rf = await import("../src/lib/youtube/relevanceFilter.ts");
const core = await import("../src/lib/youtube/boks/core.ts");
const { relevanceIssue, languageMismatch, isReligious, isReligiousQuery } = rf;

test("core.ts가 기준 모듈의 같은 함수를 다시 내보낸다(복사본 아님)", () => {
  for (const name of ["relevanceIssue", "languageMismatch", "isReligious", "isReligiousQuery"]) {
    assert.equal(typeof rf[name], "function", name);
    assert.equal(core[name], rf[name], name);
  }
});

test("해시태그 도배", () => {
  assert.equal(relevanceIssue({ title: "#a #b #c", tags: [] }, "캠핑"), "spam");
  assert.equal(relevanceIssue({ title: "#캠핑 #캠핑용품 #차박 #노지 #감성캠핑", channelTitle: "x", tags: [] }, "캠핑"), "spam");
  // 본문 글자가 충분하고 키워드가 제목에 있으면 해시태그가 많아도 통과
  assert.equal(relevanceIssue({ title: "초간단 크림당면 #자취요리 #먹방 #요리 #레시피 #간단", tags: [] }, "자취요리"), null);
  // #shorts·#쇼츠 형식 표시는 도배로 세지 않음
  assert.equal(relevanceIssue({ title: "겨울 캠핑 준비물 #shorts #쇼츠", channelTitle: "캠퍼", tags: [] }, "캠핑"), null);
});

test("언어", () => {
  assert.equal(relevanceIssue({ title: "Best camping hacks", channelTitle: "Camper", description: "camping", tags: [] }, "camping", "ko"), "language");
  // 음성 언어가 한국어로 표시돼 있으면 통과
  assert.equal(relevanceIssue({ title: "Best camping hacks", channelTitle: "Camper", description: "camping", tags: [], defaultAudioLanguage: "ko" }, "camping", "ko"), null);
  // 태그에 한글이 충분하면 통과
  assert.equal(relevanceIssue({ title: "NewJeans MV", channelTitle: "HYBE", description: "", tags: ["뉴진스", "아이돌", "뮤비"] }, "", "ko"), null);
  // langOnly=false면 언어 검사를 건너뜀
  assert.equal(relevanceIssue({ title: "Best camping hacks", channelTitle: "Camper", description: "camping", tags: [] }, "camping", "ko", false), null);
  assert.equal(languageMismatch({}, "", "제목", "채널", ""), false);
});

test("키워드 무관과 키워드 없는 탐색", () => {
  assert.equal(relevanceIssue({ title: "오늘 저녁 메뉴 추천", channelTitle: "요리왕", description: "", tags: [] }, "캠핑"), "offtopic");
  assert.equal(relevanceIssue({ title: "겨울 캠핑 준비물", channelTitle: "캠퍼", description: "", tags: [] }, "겨울 캠핑"), null);
  assert.equal(relevanceIssue({ title: "오늘 저녁 메뉴 추천", channelTitle: "요리왕", tags: [] }, ""), null);
  // 분해형(NFD) 한글도 같은 글자로 판정
  assert.equal(relevanceIssue({ title: "캠핑 브이로그".normalize("NFD"), channelTitle: "캠퍼", tags: [] }, "캠핑"), null);
});

test("종교 판별과 종교 검색어", () => {
  assert.equal(isReligious({ title: "은혜로운 찬양 모음", channelTitle: "", tags: [] }), true);
  assert.equal(isReligious({ title: "주님 은혜", channelTitle: "", tags: [] }), true);
  assert.equal(isReligious({ title: "Sunday worship live", channelTitle: "", tags: [] }), true);
  // 약한 단어 하나만으로는 종교 영상이 아님
  assert.equal(isReligious({ title: "새해 소원 기도 브이로그", channelTitle: "", tags: [] }), false);
  assert.equal(isReligious({ title: "겨울 캠핑 준비물", channelTitle: "캠퍼", tags: [] }), false);
  assert.equal(isReligiousQuery("찬양 모음"), true);
  assert.equal(isReligiousQuery("기도"), true);
  assert.equal(isReligiousQuery("캠핑"), false);
});
