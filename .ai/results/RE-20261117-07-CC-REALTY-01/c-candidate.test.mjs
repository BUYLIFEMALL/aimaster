// 후보 C 단위 시험 — 합성 fixture(실제 기사 원문 아님). 실행: node --test c-candidate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { decideC, regionTokens } from "./c-candidate.mjs";

const d = (sgg, title, snippet) => decideC({ sgg, title, snippet }).decision;

test("지역 토막: 구 이름과 앞부분", () => {
  assert.deepEqual(regionTokens("서초구"), ["서초구", "서초"]);
  assert.deepEqual(regionTokens("고양시 일산동구"), ["일산동구", "일산동"]);
});

test("제목에 부동산 낱말이 있으면 장소 문장이어도 유지", () => {
  assert.equal(d("종로구", "도심 재개발 설명회 열려", "서울 종로구 기념관에서 열린 간담회에서 관계자가 말했다."), "keep");
});

test("지역이 기자간담회 장소로만 쓰이면 제외", () => {
  assert.equal(d("종로구", "가상 노조, 다음 주 파업 예고", "노조는 10일 서울 종로구 기념관에서 기자간담회를 열었다. 지하철 운행이 줄어든다."), "drop");
});

test("장소 문장이라도 강한 부동산 낱말이 있으면 유지", () => {
  assert.equal(d("서초구", "가상 조합장 모임", "전국 조합장들이 서울 서초구에서 열린 회의에서 재초환 폐지를 요구했다."), "keep");
});

test("지역 문장 중 하나라도 장소 문장이 아니면 유지(애매함은 유지)", () => {
  assert.equal(d("서초구", "가상 공약 해설", "서초구는 내년 공원을 늘린다. 서초구 기념관에서 열린 행사도 있었다."), "keep");
});

test("요약에 지역 문장이 없으면 근거 부족으로 유지", () => {
  assert.equal(d("서초구", "가상 날씨 소식", "내일 전국에 비가 온다."), "keep");
});

test("활용형 시세 문장(내렸습니다)은 장소 표현이 없어 유지", () => {
  assert.equal(d("서초구", "가상 집주인 속사정", "서초구는 반포 위주로 0.37% 내렸습니다."), "keep");
});
