import { TYPE16_TESTS } from "./content/type16Tests";
import { PSYCH_TESTS } from "./content/psychTests";
import { TEMPERAMENT_TEST, WELLBEING_TEST } from "./content/careTests";
import type { Test, TestGroup } from "./types";

// 검사 목록(순서가 화면 순서). v1.02: 상황별 16유형 10종 + 심리·성격 5종(기질·성향 추가) + 마음 상태 자기점검 1종 = 16종.
export const ALL_TESTS: Test[] = [...TYPE16_TESTS, ...PSYCH_TESTS, TEMPERAMENT_TEST, WELLBEING_TEST];

export const GROUPS: { id: TestGroup; label: string; hint: string }[] = [
  { id: "type16", label: "16유형 상황별 검사", hint: "같은 네 가지 기준을 상황마다 다르게 읽어 봅니다" },
  { id: "psych", label: "심리·성격 검사", hint: "성격 5요인·행동 스타일·애착·에니어그램·기질·성향" },
  { id: "care", label: "마음 상태 자기점검", hint: "진단이 아닌 가벼운 점검 — 기본적으로 저장하지 않습니다" },
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

/** 민감 정보: 기본적으로 저장하지 않고, AI 분석·종합 프로필에서 제외한다 */
export function isSensitive(testId: string): boolean {
  return getTest(testId)?.kind === "wellbeing";
}
