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
