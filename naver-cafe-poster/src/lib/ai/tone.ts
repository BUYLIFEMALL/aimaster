// cafeGenerator.ts(서버 전용)와 클라이언트 컴포넌트(DraftComposer) 양쪽에서 같이 쓰는
// 타입/상수라 "server-only" 가드가 없는 별도 파일로 분리했다 — 클라이언트 컴포넌트가
// cafeGenerator.ts를 직접 import하면 "server-only cannot be imported from a Client
// Component" 빌드 에러가 난다.
export type CafeTone = "전문적" | "친근함" | "설득력있는" | "격식있는" | "위트있는";

export const CAFE_TONE_OPTIONS: CafeTone[] = ["전문적", "친근함", "설득력있는", "격식있는", "위트있는"];
