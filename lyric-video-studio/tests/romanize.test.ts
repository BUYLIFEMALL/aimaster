import { test } from "node:test";
import assert from "node:assert/strict";
import { romanize } from "../src/lib/romanize.ts";

test("기본 음절과 띄어쓰기", () => {
  assert.equal(romanize("사랑해"), "saranghae");
  assert.equal(romanize("나의 하늘"), "naui haneul");
  assert.equal(romanize("빗소리"), "bitsori");
});

test("연음 — 받침이 다음 ㅇ으로 넘어감", () => {
  assert.equal(romanize("음악"), "eumak");
  assert.equal(romanize("알아"), "ara");
  assert.equal(romanize("읽어"), "ilgeo");
  assert.equal(romanize("좋아"), "joa");
  assert.equal(romanize("싫어"), "sireo");
  assert.equal(romanize("않아"), "ana");
});

test("비음화·ㄹ 겹침·거센소리", () => {
  assert.equal(romanize("국물"), "gungmul");
  assert.equal(romanize("밥물"), "bammul");
  assert.equal(romanize("설날"), "seollal");
  assert.equal(romanize("신라"), "silla");
  assert.equal(romanize("종로"), "jongno");
  assert.equal(romanize("좋다"), "jota");
});

test("받침 대표음과 겹받침 끝소리", () => {
  assert.equal(romanize("밖"), "bak");
  assert.equal(romanize("닭"), "dak");
  assert.equal(romanize("삶"), "sam");
  assert.equal(romanize("꽃"), "kkot");
});

test("한글 없는 줄은 빈 문자열, 섞인 줄은 영어·기호 유지", () => {
  assert.equal(romanize("I love you"), "");
  assert.equal(romanize("Baby, 사랑해!"), "Baby, saranghae!");
  assert.equal(romanize("  "), "");
});
