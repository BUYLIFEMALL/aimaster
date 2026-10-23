# BLC-12 티스토리 독립 유지·검증된 부품만 적용 (2026-10-22, Claude Code 윈도우) — v1.86

주인님 승인: 2026-10-22 「진행해」. 조건(과제 표): 네이버 adapter 강제 이식 금지, 입력/태그/예약 회귀 금지, 실제 변경 없는 부품은 작업하지 않음.

## 비교 결과와 판단
| 후보 부품 | 출처(검증) | 판단 |
|---|---|---|
| 안전한 주소 가져오기(SSRF·시간·크기) | 공용 `safe-fetch`(ghost-scraper) | 적용 — 기존 `fetchHtml`은 보호가 전혀 없었음 |
| 결과 연도 보정 | naver-blog-agent `yearPolicy.ts`(v2.09) | 적용 — 공용 기준 `year-policy`로 등록 |
| AI 오류 안내(`openAIErrorReason`) | 공용 `openai-request-params` | 하지 않음 — 티스토리는 이미 키를 가린 응답 본문을 안내하고, 그 본문으로 Responses API 재시도를 판단함 |
| 모델 선택 칸 안내 | 공용 사본 | 이미 적용돼 있어 변경 없음(`app/write/ai-form/page.tsx` 530행) |
| 출처 객체·RSS 안전 해석 | 에이전트 `sourceBundle.ts`·`rss.ts` | 나중(DB·화면 변경이 커 별도 플랜) |
| 근거 인용·실행 선점·BLC-07 입력 검증 | SEO·에이전트 | 하지 않음(쓸 곳 없음 / 이미 있음 / 편집기 달라 금지) |

## 이미 갖춘 것(변경 없음)
본인 키만 사용, 30일 삭제(Vercel Cron `cleanup-images` — BC-05 이미 처리), 실행 선점(`extensionTask.ts`).

## 검수
- 시험 `tests/blc12-collect.test.cjs`(내부 주소 8종 거절·3MB 제한·연도 보정), 기존 shorts 18·extension 81·extension-api 44·home-topics 2·update-banner 3.
- 웨일(시험 계정): `http://127.0.0.1/` → 「내부·사설 네트워크 주소는 수집할 수 없습니다.」(AI 호출 없음), `https://ko.wikipedia.org/wiki/캠핑` → 주제 1건 수집(AI 1회).

## 비용
Vercel 빌드 1회, OpenAI 1회(시험 계정 본인 키).
