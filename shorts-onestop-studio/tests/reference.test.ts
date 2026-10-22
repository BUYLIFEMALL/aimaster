// v1.30 레퍼런스 문장 베끼기 방지 — 순수 함수 시험
import test from "node:test";
import assert from "node:assert/strict";
import { COPY_WORDS, REF_MARK, copiedPhrases, referenceBlocks, words } from "../src/lib/reference.ts";

const REF = "예전엔 도서관에서 책 하나 찾겠다고 몇 시간씩 헤매기 일수였어요. 바로 ISBN 번호만 기억하면 돼요.";

test("레퍼런스 블록만 뽑는다(다른 참고 자료는 제외)", () => {
  const reference = `내가 쓴 메모입니다.\n\n${REF_MARK} — 「a.mp4」에서 실제로 말한 내용]\n${REF}\n\n[다른 자료]\n상관없는 글`;
  assert.equal(referenceBlocks(reference), REF);
  assert.equal(referenceBlocks("메모만 있음"), "");
});

test("어절 나누기: 문장 부호 제거", () => {
  assert.deepEqual(words("책, 하나! 찾기?"), ["책", "하나", "찾기"]);
});

test("연속 6어절 이상 같으면 겹침, 짧은 사실(숫자·고유명사)은 통과", () => {
  assert.equal(COPY_WORDS, 6);
  const copied = copiedPhrases(["예전엔 도서관에서 책 하나 찾겠다고 몇 시간씩 헤매곤 했죠."], REF);
  assert.deepEqual(copied, ["예전엔 도서관에서 책 하나 찾겠다고 몇 시간씩"]);
  assert.deepEqual(copiedPhrases(["ISBN 번호만 알면 10초면 충분해요."], REF), [], "5어절 이하 겹침은 괜찮음");
  assert.deepEqual(copiedPhrases(["완전히 다른 문장으로 시작하는 대본입니다."], REF), []);
  assert.deepEqual(copiedPhrases(["아무거나"], "짧은 레퍼런스"), [], "레퍼런스가 6어절보다 짧으면 검사 안 함");
});

// ── v1.31 참고 자료 전체 검사 · 장면 겹침 판정 ──
import { guardText, hasCopy } from "../src/lib/reference.ts";
test("검사 대상: 기본은 레퍼런스 블록만, 전체 선택이면 표시 문구만 빼고 모두", () => {
  const reference = `기사 본문 첫째 문장이 여기에 길게 이어집니다 정말로요.\n\n${REF_MARK} — 「a.mp4」]\n${REF}`;
  assert.equal(guardText(reference), REF);
  const all = guardText(reference, true);
  assert.ok(all.includes("기사 본문 첫째 문장이") && all.includes(REF) && !all.includes(REF_MARK));
});
test("장면 겹침 판정: 고치면 사라짐, 검사 대상이 없으면 항상 false", () => {
  assert.equal(hasCopy("예전엔 도서관에서 책 하나 찾겠다고 몇 시간씩 헤맸죠", REF), true);
  assert.equal(hasCopy("서가 사이를 오래 돌아다닌 적 있으신가요?", REF), false);
  assert.equal(hasCopy("아무 문장", ""), false);
});

// ── v1.32 INSTA → 원스톱 레퍼런스 대사 넘기기(주소 # 뒤) ──
import { REF_HANDOFF_MAX, readRefHandoff, refHandoffHash } from "../src/lib/reference.ts";
test("넘기기 주소: 한글·줄바꿈·기호가 그대로 돌아오고, 다른 # 이나 깨진 값은 무시", () => {
  const text = "아직도 S&P500만 사는 거 아니죠?\n#재테크 100% 정리";
  assert.equal(readRefHandoff(refHandoffHash(text)), text);
  assert.equal(readRefHandoff("#other=abc"), "");
  assert.equal(readRefHandoff(""), "");
  assert.equal(readRefHandoff("#ref-transcript=%E0%A4%A"), "");
  assert.equal(readRefHandoff(refHandoffHash("가".repeat(REF_HANDOFF_MAX + 50))).length, REF_HANDOFF_MAX);
});

// ── 겹친 구절은 원문 글자 그대로(문장 부호 포함) ──
test("겹친 구절을 원문 글자 그대로 돌려준다(S&P500·쉼표 유지)", () => {
  const ref = "최근 수익률 높은 기업들만 모아놔서 S&P500보다 수익률이 높아요, 정말로.";
  assert.deepEqual(copiedPhrases(["요즘 최근 수익률 높은 기업들만 모아놔서 S&P500보다 수익률이 높아요, 정말로!"], ref), ["최근 수익률 높은 기업들만 모아놔서 S&P500보다 수익률이 높아요, 정말로"]);
});
