# 병합 C 개발 플랜 — AI 프롬프트 템플릿 자동화 → AI Prompt 자동화 「📁 내 템플릿」 (2026-10-21, Claude Code)

근거: 루트 `docs/analysis-scraping-consolidation-20261021/REPORT.md` §2 C, §5 주인님 결정(「새 표 승인」).
대상 DB: 운영 AIMaster `esgxyikcnnvmlhygjkth`.

## 1. 문제
- 프롬프트 템플릿(`prompt-template-studio` v1.05)은 보관·`{{변수}}`·AI 변수 채우기·바로 실행 흐름이 좋지만, 템플릿을 **브라우저 `localStorage`에만** 저장해서 기기를 바꾸면 보관함이 사라진다.
- AI Prompt(`ai-prompt-studio` v1.06, FREE)는 프롬프트 설계 기능이 가장 풍부하지만, 만든 프롬프트를 보관하거나 다시 쓸 수 없다.

## 2. 범위
| 항목 | 결정 |
|---|---|
| 기준 프로그램 | AI Prompt (FREE 그대로) |
| 새 DB 표 | `ai_prompt_templates`(회원별 `user_id` + RLS 본인만, 회원당 300개, 본문 20,000자) — 주인님 승인 |
| 권한 | 템플릿 권한 143명 모두 AI Prompt 권한 보유, 기간이 더 짧은 회원 0명 → **변경 없음** |
| 30일 자동 삭제 | 적용하지 않음. 템플릿은 AI가 만든 결과가 아니라 회원이 직접 만들어 다시 쓰는 「보관함·설정」 성격이기 때문(실행 결과는 저장하지 않음). 판단 근거를 인수인계에 남김 |
| 옛 브라우저 템플릿 | `localStorage`는 주소마다 따로라 새 주소에서 읽을 수 없음 → **옛 앱 안내 화면에 「AI Prompt로 옮기기」 버튼**(옛 주소의 브라우저 템플릿을 옛 앱 서버 API가 본인 행으로 새 표에 넣음, 같은 제목+본문은 건너뜀) + 새 앱 백업 파일(.json) 가져오기 |
| 옛 앱 | 작업 화면 → 안내 + 옮기기, 실행·AI API 410, 카탈로그 숨김 |

## 3. 구현 순서
1. DB: `ai_prompt_templates` 표 + RLS 4개 + `user_id` 인덱스(크롬 Supabase SQL 편집기, 마이그레이션 파일 기록).
2. AI Prompt에 옮기기: `types/template.ts`(변수 추출·치환), `data/templatePresets.ts`(예제), `components/templates/*`(보관함·편집·실행·백업 모달), API `/api/templates`(GET/POST/PUT/DELETE, 본인 것만) · `/api/templates/execute` · `/api/templates/auto-fill` · `/api/templates/suggest-field`(모두 `checkProgramAccessApi` + 회원 본인 Gemini 키, 캐시 방지 두 줄), `lib/koreaNowRule.ts`.
3. 좌측 메뉴 「📁 내 템플릿 보관함」, 결과 화면 「📁 내 템플릿으로 저장」(설계한 프롬프트를 바로 템플릿으로).
4. 보관함이 비어 있으면 예제 템플릿을 보여 주고, 편집·저장하면 내 템플릿으로 새로 저장.
5. 옛 앱: 안내 화면(`MovedNotice`) + 브라우저 템플릿 개수 표시 + 「AI Prompt로 옮기기」 → `/api/migrate-templates`.
6. 버전 AI Prompt v1.07 · 템플릿 v1.06, DB 상세 소개·핵심 특징·사용 순서 갱신, 매뉴얼에 보관함 안내 추가.

## 4. 검수
- 두 앱 `npx tsc --noEmit`·`npm run build`.
- 크롬(관리자): 결과 화면에서 템플릿 저장 → 보관함 목록·검색·카테고리 → 변수 AI 채우기 1회 → 실행 1회 → 수정·삭제, 새로고침 후에도 남아 있음(DB 확인), 다른 회원 행이 안 보이는지 RLS 확인(익명 키로 조회 0건). 옛 앱 안내·옮기기(시험 템플릿 1개를 브라우저에 넣고 옮기기) 확인, 390px 폭.

## 5. 비용
| 구분 | 내용 |
|---|---|
| 개발·시험 | 관리자 본인 Gemini 키로 변수 채우기 1회 + 실행 1회 + (필요하면) 설계 1회, Flash 무료 한도 안 |
| 운영자 인프라 | 새 표 1개(행 수 적음, 비용 없음), 배포 2회 |
| 회원 부담 | 회원 본인 Gemini 키, 기존과 같음 |

## 6. 버전·배포
- `ai-prompt-studio` v1.06 → v1.07, `prompt-template-studio` v1.05 → v1.06, 한 번에 하나씩 순차 배포.
