import { TYPE16_TESTS } from "./content/type16Tests";
import { PSYCH_TESTS } from "./content/psychTests";
import type { Test, TestGroup } from "./types";

// 검사 목록(순서가 화면 순서). v1.01은 상황별 16유형 10종 + 심리·성격 4종 = 14종이다.
export const ALL_TESTS: Test[] = [...TYPE16_TESTS, ...PSYCH_TESTS];

export const GROUPS: { id: TestGroup; label: string; hint: string }[] = [
  { id: "type16", label: "16유형 상황별 검사", hint: "같은 네 가지 기준을 상황마다 다르게 읽어 봅니다" },
  { id: "psych", label: "심리·성격 검사", hint: "성격 5요인·행동 스타일·애착·에니어그램" },
];

export function getTest(id: string): Test | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}

export function testsOf(group: TestGroup): Test[] {
  return ALL_TESTS.filter((t) => t.group === group);
}

/** 화면에 보여 줄 검사 이름(결과 목록용) */
export function testTitle(id: string): string {
  return getTest(id)?.title ?? id;
}
