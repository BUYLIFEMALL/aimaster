# 병합 B 개발 플랜 — 페르소나 문체 자동화 → AI 글쓰기 에디터 「🎚️ 문체 바꾸기」 (2026-10-21, Claude Code)

근거: 루트 `docs/analysis-scraping-consolidation-20261021/REPORT.md` §2 B, §5 주인님 결정.
대상 DB: 운영 AIMaster `esgxyikcnnvmlhygjkth`.

## 1. 문제
- 페르소나 문체 자동화(`persona-style-studio` v1.08)는 문체 조절(5개 슬라이더·프리셋 8·페르소나 10·나만의 페르소나)이 좋지만 에디터가 단순해(서식·검색·분석 없음) 결과를 다시 다듬으려면 다른 프로그램으로 옮겨야 했다.
- AI 글쓰기 에디터(`ai-writing-editor` v1.10)는 서식 에디터·문서 저장·검색 출처·글 분석이 있지만 「문체를 통째로 바꾸는」 기능이 없다.

## 2. 범위 (주인님 결정 반영)
| 항목 | 결정 |
|---|---|
| 기준 프로그램 | AI 글쓰기 에디터 |
| FREE 배지 | 글쓰기 에디터는 **FREE 아님 유지** |
| 권한 | 페르소나 권한 회원(175명) 전원이 이미 에디터 권한 보유. **에디터 사용기간이 더 짧은 24명만 페르소나 기간으로 늘린다**(줄이지 않음) |
| 회원 데이터 | `persona_style_personas` 0건·`persona_style_drafts` 0건 → 옮길 데이터 없음. 페르소나 표는 그대로 재사용 |
| 옛 앱 | 첫 화면·/guide는 안내(새 주소 버튼), 쓰기 API는 410, 카탈로그에서 숨김(`is_active=false`) |

## 3. 구현 순서
1. `ai-writing-editor/src/lib/persona/{types,data,prompt}.ts` — 페르소나 앱에서 그대로 가져옴(한국어만 사용, 영어 값은 남겨 둠).
2. API(모두 `checkProgramAccessApi` + 회원 본인 Gemini 키, 폴백 없음, `force-dynamic`/`force-no-store`)
   - `POST /api/style-rewrite` — 글(선택 부분 또는 전체, 8,000자 이하) + 5개 값 + 페르소나 → 바뀐 글
   - `GET/POST/DELETE /api/personas` — 나만의 페르소나·기본 페르소나 수정값(표 `persona_style_personas`, `user_id`로 직접 거름, 100개 한도)
   - `POST /api/persona-generate` — 이름·역할 → AI가 배경·말투·문체·5개 값 채움
3. 화면 `components/editor/StylePanel.tsx` — 글 분석 패널과 같은 자리(오른쪽 360px)에 번갈아 열림
   - 대상: 「선택한 부분」(드래그 중이면) / 「글 전체」
   - 5개 가로 슬라이더, 프리셋 8개, 페르소나 목록(기본 10 + 나만의), 「+ 나만의 페르소나」(이름·역할 → AI 채우기 → 저장/삭제)
   - 「문체 바꾸기」 → 미리보기 → [본문에 적용](Ctrl+Z로 되돌리기) / [다시]
4. 에디터 상단 「🎚️ 문체 바꾸기」 버튼, 선택 툴바에 「문체」 버튼.
5. 옛 앱 안내 전환(병합 A의 `MovedNotice` 방식), 버전 에디터 v1.11 · 페르소나 v1.09(코드+DB).
6. 메인 상세 소개·핵심 특징에 문체 기능 한 줄 추가, 역량 지도·보고서 §6 갱신.

## 4. 검수
- `npx tsc --noEmit`, `npm run build`(두 앱).
- 크롬(메인 계정): 에디터 → 글 전체 문체 바꾸기 1회, 선택 부분 1회, 나만의 페르소나 AI 채우기 1회·저장·삭제, 모바일 폭 확인. 옛 앱 첫 화면 안내·API 410 확인.

## 5. 비용
| 구분 | 내용 |
|---|---|
| 개발·시험 | 관리자 본인 Gemini 키로 문체 바꾸기 약 2회 + 페르소나 생성 1회(Flash, 무료 한도 안) |
| 운영자 인프라 | 없음(기존 Vercel 프로젝트 2개 각 1회 배포) |
| 회원 부담 | 회원 본인 Gemini 키 — 1회 수천 토큰, Flash 기준 무료 한도 또는 매우 적은 비용 |

## 6. 버전·배포
- `ai-writing-editor` v1.10 → v1.11, `persona-style-studio` v1.08 → v1.09, 한 번에 하나씩 순차 배포.
