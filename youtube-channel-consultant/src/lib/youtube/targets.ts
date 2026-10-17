// 2026-10-17 v1.08: 선별 계산은 공용 엔진(goldenEngine.ts — youtube-viral-studio와 같은 파일)으로 옮겼다.
// 기존 이름(selectTargetChannels·TargetCandidate)은 테스트·다른 코드 호환을 위해 그대로 둔다.
export { selectGoldenChannels as selectTargetChannels } from "./goldenEngine";
export type { GoldenCandidate as TargetCandidate } from "./goldenEngine";
