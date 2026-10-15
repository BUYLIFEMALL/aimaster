# 인수인계 — 프로그램 상세 소개 3단 구성 + 프로그램 역량 지도 (2026-10-16, Claude Code 보조 계정·윈도우)

## 1. 주인님 지시 흐름
1. 「AI 블로그 작업실 자동화」 상세 소개를 기준 예시로 → 다른 프로그램도 이 형식으로(작성 표준을 핵심 지침화: `CLAUDE.md` 원칙 22).
2. 81개 프로그램 설명 전체 재작성 + "비슷한 프로그램은 차별점을 강조"(커밋 `04bd95ea`, 이전 원문 백업 `docs/program-descriptions/backup-before-2026-10-16.json`).
3. 상세 페이지 아래 공통 고정 문구(특징 4카드·사용 순서 4단계) → **A안 승인: 프로그램별 내용으로 교체**.
4. "최종 방법을 메인 지침에 추가하고 인수인계로 남겨라" → `CLAUDE.md` 22 / `AGENTS.md` 21에 3단 구성 추가, 표준 문서 §2-2.
5. "각 프로그램의 기능·차별점·장점·단점을 지침 문서로 — 장점을 합치고 단점을 보강해 더 나은 확장형 프로그램을 만들 때 참고, 작업 전 참고·완성 후 갱신" → **`docs/PROGRAM_CAPABILITY_MAP.md`** + `CLAUDE.md` 원칙 23 / `AGENTS.md` 22 + 새 프로그램 체크리스트 (11).

## 2. 바뀐 것
| 구분 | 내용 | 위치 |
|---|---|---|
| DB | `programs.detail_sections jsonb` 칸 추가(주인님 승인, Codex Supabase 연결로 적용) | `supabase/migrations/0035_programs_detail_sections.sql` |
| DB 값 | 82개 전부 특징 4개(이모지·제목·설명) + 사용 순서 4단계 입력 | 원본은 DB |
| 상세 페이지 | 공통 고정 문구 제거 → `detail_sections`로 그림, 값 없으면 숨김 | `app/(main)/programs/[slug]/page.tsx`, `lib/programs/detailSections.ts` |
| 관리자 | 편집 화면에 "핵심 특징 · 사용 순서" 입력칸(4+4줄, 빈 줄 저장 안 함) | `components/admin/DetailSectionsEditor.tsx`, `components/admin/ProgramForm.tsx` |
| 타입 | `Program.detail_sections` | `types/database.types.ts` |
| 지침 | 3단 구성 규칙, 역량 지도 원칙 | `CLAUDE.md` 22·23, `AGENTS.md` 21·22, `docs/PROGRAM_DESCRIPTION_STANDARD.md` §1·§2-2·§5·§6·§8 |
| 역량 지도 | 82개 카드(차별점·기능·장점·사용 순서·단점·키) + 공통 기반 + 재사용 부품 + 분야별 통합 아이디어 | `docs/PROGRAM_CAPABILITY_MAP.md` |

## 3. 검수
- 메인 사이트 빌드 통과, 운영 배포 READY(www.buylife.xyz). 엣지에서 `file-merge` 상세 페이지 확인 — 특징 4카드(머리글 기준 합치기·3가지 나누기·원본 서식 유지·브라우저 처리)와 사용 순서 4단계가 프로그램 내용으로 표시.
- DB: 82/82 저장, `detail_sections is null` 0건.
- 관리자 편집 화면은 이 세션 브라우저(엣지)가 시험 계정이라 열어 보지 못함 → 메인 계정(크롬)으로 `/admin/programs/<id>/edit`에서 입력칸 표시·저장 확인 필요.

## 4. 남은 일
- 상세 페이지의 **"추천 활용 대상" 3카드**는 아직 모든 프로그램 공통 문구(1인 창업가 등). 같은 방식으로 프로그램별로 바꿀지 주인님 결정 대기.
- `personality-code` 로그인 없이 열리는 구조(원칙 0·6과 다름) — 주인님 결정 대기(역량 지도 단점에 기록).
- 역량 지도는 프로그램을 새로 만들거나 기능이 바뀔 때마다 같은 커밋에서 카드 갱신(원칙 23).
