# AI 종합 성격 진단 자동화 (`personality-suite`) — 인수인계 문서 (2026-10-14, v1.04)

다른 CLI(Codex·Gemini·다른 Claude 세션)가 이 대화 없이 바로 이어받을 수 있도록 정리한 한 장짜리 요약입니다. 상세는 [`personality-suite/AGENTS.md`](../personality-suite/AGENTS.md)와 [`personality-suite/docs/CLI_HANDOFF.md`](../personality-suite/docs/CLI_HANDOFF.md)를 봅니다.

## 1. 프로그램 개요
- 이름/slug: **AI 종합 성격 진단 자동화** / `personality-suite`. 주소: https://personality-suite.buylife.xyz (옛 `personality-suite.vercel.app`도 유지).
- 참고 원본: AI Studio "다기능 종합 성격 진단기(배포용)". 코드·문항·해석은 복제하지 않고 새로 작성(상표명 미사용, 진단 아님 안내).
- 검사 16종: 상황별 16유형 10종 + 성격 5요인·행동 스타일·애착·에니어그램·기질·성향 5종 + 스트레스·마음 상태 자기점검 1종.
- AI 기능(심층 분석·종합 프로필)은 **회원 본인 Gemini 키**만 사용(폴백 없음). 검사·기본 해석은 키 없이 동작.

## 2. 등록 현황 (공용 Supabase `esgxyikcnnvmlhygjkth`)
| 항목 | 값 |
|---|---|
| `programs` | slug `personality-suite`, 카테고리 Tools, 최소 등급 일반, `is_active=true`, 버전 **v1.04**, `app_url` 위 주소 |
| 배지 | 등록 시 `new`+`free`로 넣었으나 2026-10-14 확인 시 **`["new"]`만 남아 있음**(관리자 화면에서 바뀐 것으로 보이며 의도 확인 필요 — 무료 가입자 사용 여부가 이 배지로 결정됨) |
| 요금제 | 1/2/3개월 = 10,000 / 20,000 / 30,000원 (3건) |
| 등급 접근 | `grade_program_access` 2건 (VIP 포함) |
| 썸네일 | 실사 16:9 (§13 템플릿, `scripts/generate-program-thumbnail.mjs`), `program-images/catalog/personality-suite-thumbnail.jpg` |
| 설명 | v1.04 기준 `short_desc`·`description` 갱신 |
| DB 테이블 | `personality_suite_results`, `personality_suite_profiles` (RLS owner-only `for all`, 서버는 service role + `user_id` 필터). 마이그레이션 `personality-suite/supabase/migrations/0001·0002` |

## 3. 배포
- Vercel 프로젝트 `personality-suite`(팀 buylife), CLI 업로드 방식: `cd personality-suite && vercel deploy --prod --yes --scope buylife`.
- 환경변수 4종(Supabase URL·anon·service role·메인 사이트 URL)은 `scripts/add-personality-suite-vercel-env.mjs`로 등록 완료.
- 도메인 `personality-suite.buylife.xyz` 연결 완료(와일드카드 DNS).

## 4. 버전 이력
| 버전 | 내용 | 커밋 |
|---|---|---|
| v1.01 | 신규: 14종 검사, 서버 점수 계산, AI 심층 분석·종합 프로필, 등록·썸네일·배포 | `5d201e90` |
| v1.02 | 기질·성향 점검, 마음 상태 자기점검(기본 미저장), 이전 결과 비교, 프로필에 직전 결과 반영 | `a8ae7747` |
| v1.03 | 결과 공유 이미지(PNG), 인쇄·PDF, 시기별 변화 추이 그래프 | `4a75ada2` |
| v1.04 | 종합 프로필 검사별 반영 비중(제외·참고·중요·핵심) | `9c18ebab` |

버전은 `src/lib/version.ts`·`package.json`·DB `programs.version` 세 곳을 함께 올립니다.

## 5. 반드시 지킬 것
- 마음 상태 점검(`wellbeing`)은 민감 정보: `save:true`가 없으면 저장하지 않고, AI 분석·종합 프로필·공유 이미지·추이에서 제외. 결과 화면에 상담 창구(109·1577-0199·1388·119) 고정 안내. 진단 용어·자해 문항 금지.
- 상표·공식 검사 이름을 제목·소개에 쓰지 않음(단위 테스트가 검사).
- 모든 AI 프롬프트에 당해 연도 지침(`yearGuard`) 포함, 결과 텍스트는 "데이터"로 취급.
- 사고(thinking) 토큰이 출력 한도에 포함되므로 JSON 분석은 `maxOutputTokens` 8192 이상.
- 쓰기 API는 `checkProgramAccessApi` + `force-dynamic`/`force-no-store`, 데이터는 항상 `user_id`로 거른다.

## 6. 검수 방법
- `cd personality-suite && npm test`(19건) → `npx tsc --noEmit` → `npm run build`.
- 운영 확인은 로그인된 Chrome에서 검사→결과→AI 분석→삭제까지 흐름으로 하고, **테스트로 만든 결과·프로필은 반드시 삭제**한다(`DELETE /api/results/[id]`, `personality_suite_profiles` 행).

## 7. 남은 일
- 일반 회원(`buylifemall@naver.com`) 로그인으로 같은 흐름 재확인(주인님이 로그인해야 함).
- FREE 배지 상태 확인(위 2번 표) 후 필요하면 관리자 프로그램 편집 화면에서 켜기.
- 확정된 후속 개발 과제 없음.

## 8. 작업 함정 메모
- Bash 도구에서 한글·따옴표가 섞인 긴 here-document는 통째로 실패할 수 있다 → 파일은 Write/Edit 도구로 쓴다(`docs/ERROR_LESSONS.md`에 기록).
- 다른 CLI의 미커밋 변경이 있는 루트 문서는 HEAD 내용에 항목만 끼워 넣어 `git update-index --cacheinfo`로 스테이징하면 섞이지 않는다.
- Supabase MCP `execute_sql`은 문장별로 보내고, "Invalid or expired requestState"는 같은 문장을 한 번 더 보내면 된다.
