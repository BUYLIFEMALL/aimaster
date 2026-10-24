# 성격·운세 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 이 카테고리는 **담당 역할이 없다**. 주인님이 담당을 지정하고 그 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 최근 작업 세션: Claude Code(윈도우) 2026-10-20 성격·타로 세션([인수인계](HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md)), 2026-10-23 Next.js 보안 업데이트(종합 v1.28).

## 현재 위치와 읽는 순서

1. [성격·운세 자동화 완성 기준](PERSONALITY_FORTUNE_COMPLETION_POLICY.md) — 끝났다고 말할 조건·상표명·위기 안내·결과 저장 범위·공유 규칙·하지 않을 것.
2. [성격·운세 기능 상세 비교표](PERSONALITY_FORTUNE_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. [2026-10-20 성격·타로 세션 인수인계](HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md) §5 추가 개선안, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-08.
4. 프로그램별 기록: `personality-suite/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_HANDOFF_20261020.md`, `mbti/AGENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, `mbti-character/AGENTS.md`·`docs/IMPROVEMENTS.md`, `tarot/AGENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`.

**2026-10-24 요약:** 네 프로그램은 합치지 않고 「이어서 보기」(공용 `personality-program-links`)로 연결돼 있다. 2026-10-24 카테고리 「성격·운세」로 옮겼다(마이그레이션 0042). 기능 쪽 남은 일은 적지만, **최상위 규칙(로그인·데이터 격리·30일 삭제·당해 연도)과 상표명에 걸리는 차이가 여러 개** 발견됐다 — 아래 「우선 처리」.

## 우선 처리 (회원에게 실제 영향이 갈 수 있는 것 — 담당 확인 필요)

| ID | 대상 | 문제 | 근거 | 영향 | 추천 처리 |
|---|---|---|---|---|---|
| PF-U1 | 타로 | **결과 화면(`/result`)에 로그인 확인이 없다.** 로그인 필요 경로가 `/draw`·`/settings`뿐이고, 결과 페이지에 `requireProgramAccess`가 없다 | `tarot/middleware.ts` 7행 `AUTH_REQUIRED_PATHS = ["/draw", "/settings"]`, `tarot/app/result/page.tsx`(`getSessionUser`만, 비로그인이어도 진행) | 「로그인 없이 열림」 — FREE도 가입 회원 누구나 규칙 위반. 비로그인 방문자가 결과 화면을 봄(AI 호출 API는 권한 확인이 있어 비용은 막힘) | 결과 화면을 로그인 대상에 넣되, 공유 링크 정책(PF-U2)과 함께 결정 |
| PF-U2 | 타로 | **리딩이 자동 저장되고, 저장된 리딩은 `?rid=` 주소만 알면 누구나(비로그인 포함) 질문·카드·AI 해석·그림을 본다.** 공유 버튼을 누르지 않아도 저장 즉시 생김 | `tarot/components/ResultInteractive.tsx` `saveReadingHistory`(자동 insert), `tarot/app/result/page.tsx` `loadReadingById`(서비스 롤, `user_id` 조건 없음 — 주석상 의도된 공유 설계) | 「다른 회원 결과 공유」 — 회원이 적은 고민 질문이 링크로 퍼질 수 있음. `rid`는 추측이 어려운 UUID라 즉시 노출 위험은 낮지만, 회원이 공유를 고른 적이 없는 리딩까지 열람 가능 | 공유는 회원이 「공유」를 누른 리딩만(공유 표시 칸 또는 별도 토큰), 질문 원문은 공유 화면에서 기본 숨김 — 주인님 결정 |
| PF-U3 | 타로 | 옛 공유 링크(`?img=`) 복원이 서비스 롤로 최근 리딩 100건을 `user_id` 조건 없이 훑어 그림 주소가 같은 리딩을 찾는다 | `tarot/app/result/page.tsx` 270행 이하(과거 다른 회원 리딩 노출 사고를 고친 뒤 남은 경로) | 그림 주소가 사실상 고유해 위험은 낮지만, 「user_id 조건 없는 조회」 금지 원칙과 맞지 않음 | 옛 링크 형식 지원 종료 여부 결정 → 종료하면 이 블록 제거 |
| PF-U4 | 종합·캐릭·타로 | **30일 자동 삭제가 없다.** 종합은 회원당 100개만 남기고, 캐릭·타로는 무기한 | `personality-suite/src/lib/results.ts` `MAX_RESULTS`(예약 정리 경로 없음, `vercel.json` 예약 없음), `mbti-character`·`tarot`에 정리 경로·예약 없음 | 「데이터 미삭제」 — 생성 데이터 30일 삭제 최상위 규칙 위반. 마음 상태 점검을 저장한 회원 자료도 계속 남음 | 공용 `cleanup-usage-log` + 정리 예약(기준 예: `reverse-prompt/src/app/api/cron/cleanup/route.ts`), 기존 자료 유예 기간을 정해 안내 |
| PF-U5 | 캐릭·타로 | **생성 그림을 공개 버킷에 저장**한다(회원 폴더지만 누구나 주소로 읽기 가능) | `mbti-character/supabase/migrations/0004_character_images_storage.sql`(`public=true`, select to public), `app/api/generate-character-image/route.ts` 117행 `getPublicUrl` / `tarot/supabase/migrations/0003_card_images_storage.sql`, `app/api/generate-card-image/route.ts` 132행 | 이커머스 E0에서 고친 것과 같은 유형(회원 생성물 공개). 카카오 공유 미리보기 때문에 공개로 둔 것(마이그레이션 주석) | 비공개 + 서명 주소로 보기, 공유를 누른 그림만 공개용 — 카카오 미리보기 동작과 함께 주인님 결정 |
| PF-U6 | 타로 | **해석 지시문에 당해 연도·오늘 날짜가 없다.** 「한 해 운세(12개월)」는 「올해」를 말하는데 연도를 주지 않음 | `tarot/app/api/generate-reading/route.ts`(86행 이하 `year_ahead`), `tarot/app` `tarot/lib`에서 `getFullYear` 검색 결과 없음 | 「당해 연도 누락」 — 모델이 과거 연도를 올해로 쓸 수 있음(핵심 원칙 8) | 모든 스프레드 지시문에 기준 연도·오늘 날짜(한국 시간) 주입, 기준 `personality-suite/src/lib/tests/ai.ts` `yearGuard` |
| PF-U7 | 코드·캐릭 | **프로그램 이름·로그인 제목·페이지 제목·OG·매뉴얼 제목에 상표명 「MBTI」**가 들어 있다(면책 문구는 있음) | `mbti/app/(auth)/login/page.tsx` 171행 「성격코드(MBTI) 측정기」, `mbti-character/app/(auth)/login/page.tsx` 171행, `mbti-character/app/layout.tsx` 17·20·115행, `mbti-character/app/guide/page.tsx` 8·23·171행, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 목록 28·29행(DB 이름은 미조회) | 「상표명 노출」 — EXT-TL-08 결정(MBTI → 16유형)과 종합 진단의 단위 시험 기준과 다름 | 이름 후보(예: 「성격코드 16유형 측정기」·「캐릭코드 16유형 캐릭터 테스트」) 제시 → 주인님 결정 후 코드·DB `programs.name`·OG·매뉴얼 일괄, 상표명 단위 시험 추가 |
| PF-U8 | 타로 | 결과 화면에 「재미용·중요한 결정의 근거 아님」 안내 글을 찾지 못했다(지시문에만 있음) | `tarot/app`·`tarot/components`에서 안내 문구 검색 결과 없음, 지시문 `generate-reading/route.ts` | 운세를 결정 근거로 받아들일 위험 | 결과 화면 아래 고정 안내 추가(화면으로 먼저 확인 — 「미확인」 칸) |

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 역할 | 흡수한 장점 | 원본 도구 처리 |
|---|---|---|---|
| AI 종합 성격 진단 자동화 (`personality-suite`) | 여러 검사·마음 상태 점검·종합 프로필, 안전 규칙 **기준** | EXT-TL-08 원본의 검사군 구조(복제 없이 새로 작성) | 「이어서 보기」 기준 코드 보유 |
| 성격코드 측정기 (`personality-code`, `mbti/`) | 빠른 16유형 검사·공유(저장 없음) | 독립 유지 | 연결만 |
| 캐릭코드 측정기 (`mbti-character`) | 유형 → 오리지널 캐릭터 그림 | 독립 유지 | 연결만 |
| AIMaster 타로점 (`tarot-reading`, `tarot/`) | 카드 뽑기·운세 해석 | 독립 유지 | 연결만 |

병합된 프로그램은 없다. 합칠지 여부는 [프로그램 비교 분석 매뉴얼](PROGRAM_COMPARISON_ANALYSIS_GUIDE.md) 순서로 따로 분석한 뒤 주인님이 정한다(이 표는 병합을 제안하지 않는다).

## 완료 기록 — 2026-10-20 연결·안전 묶음

| ID | 대상과 구현 범위 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| PF-D1 | 종합: 결과 → 타로점 3장 리딩(질문만, 점수 숫자 안 보냄) | v1.24 | ✅ 완료 |
| PF-D2 | 종합: 숫자키 빠른 입력 시 응답 빠짐 수정 + 브라우저 시험 | v1.25 | ✅ 완료 |
| PF-D3 | 종합: 16유형 → 캐릭코드·성격코드로(민감 점수 안 보냄) | v1.26·v1.27 | ✅ 완료 |
| PF-D4 | 캐릭: 결과 → 타로점, 다른 프로그램에서 오면 그림 자동 생성 안 함 | v1.21 | ✅ 완료 |
| PF-D5 | 캐릭: 그림 자동 생성을 「검사 직후」(`fresh=1`)로만 | `4736e0b6` · v1.23 | ✅ 완료 |
| PF-D6 | 타로: 다른 프로그램에서 질문 미리 채우기, 넘어온 곳 이름, 다크 테마 통일 | v1.21~v1.25 | ✅ 완료 |
| PF-D7 | 타로: OpenAI에 없는 모델 정리·옛 이름 변환·허용 목록 검사 | `3d92d336`·`c982c51d` · v1.26·v1.27 | ✅ 완료 |
| PF-D8 | 네 프로그램: 「이어서 보기」 공용 기준 코드 `personality-program-links` | `c6fa194c8` | ✅ 코드 완료(캐릭 v1.24·타로 v1.27에 나감, 종합·코드는 배포 포함 여부 확인 필요) |
| PF-D9 | 종합: Next.js 보안 업데이트 | `d81b9bef4` · v1.28 | ✅ 완료 |
| PF-D10 | 네 프로그램: 카테고리 Tools → 성격·운세 | 마이그레이션 `0042_categories_ai_prompt_personality.sql` | ✅ 완료(2026-10-24) |

## 대기·후속 (다음에 할 일 후보)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| PF-W1 | 성격·운세 담당 역할 지정 | 주인님 지정 | 확인 필요 |
| PF-W2 | 타로: 질문에 위기 신호(자해 등)가 있으면 해석 전에 위기 상담 안내 | 완성 기준 §4-3 합의 | 후보 |
| PF-W3 | 코드: 미드나잇 퍼플 테마(네 프로그램 중 유일하게 밝은 테마) | 디자인 담당 | 대기(인수인계 §5-1) |
| PF-W4 | 회원별 「최근 검사 유형」 공용 DB 저장 → 주소 값 없이 불러오기 | 공용 DB 새 칸 — 주인님 사전 승인 | 검토(인수인계 §5-4) |
| PF-W5 | 타로: 카드 뒤집힌 상태 실화면 확인(저장 리딩 다시 열기, 비용 없음) | 회원 저장 리딩 | 대기(인수인계 §5-5) |
| PF-W6 | 코드·캐릭·타로: 상표명 단위 시험 추가(기준 `personality-suite/tests/ps.test.mjs`) | PF-U7 결정 뒤 | 대기 |
| PF-W7 | 코드·캐릭·타로: Next 14.2.35 → 상위 버전 | 담당 판단(빌드 비용) | 확인 필요 |
| PF-W8 | 문서 정리: 종합 AGENTS 제목 v1.27, 코드 AGENTS 「버전 v1.20」, 타로 AGENTS 「현재 버전 v1.20」, 종합 IMPROVEMENTS의 해결된 [대기] 2건, 프로그램 비교표 캐릭 카드 「결과 저장 없음」, 타로 화풍 수(12종↔코드 11개) | 각 담당 다음 작업 때 | 확인 필요 |
| PF-W9 | 캐릭터·타로 그림 프롬프트의 인물 묘사가 한국인 기본 원칙(핵심 원칙 3)과 맞는지 점검 | 담당 판단(프롬프트 내용은 프로그램 고유) | 확인 필요 |

## 항목마다 지킬 완료 조건

1. 착수 직전 `node scripts/dev-requests.mjs list`·`docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일(지정되면)·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](PERSONALITY_FORTUNE_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 AI·그림 시험은 시험 계정 본인 키로 승인된 횟수만 한다(가장 저렴한 모델, 그림은 1~2장).
4. 로그인 필수, 회원 본인 키만, 회원별 비공개 저장, 생성일 기준 30일 정리, 당해 연도 주입, 상표명 금지, 위기·참고용 안내를 지킨다. 공용 사본(`programLinks.ts`·`geminiImage.ts`·`nanoBananaModels.ts`)은 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
5. 버킷 공개 여부·DB 표·정리 예약 추가는 DB·환경변수 변경이므로 사전 승인 뒤 한다. 기존 자료 삭제는 유예를 두고 주인님 승인 뒤 시작한다.
6. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 버전 파일 + DB `programs.version`).
7. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID 또는 미지정>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(종합 진단 원본은 EXT-TL-08).

## 프로그램 주소

https://personality-suite.buylife.xyz

https://personality-code.buylife.xyz

https://mbti-character.buylife.xyz

https://tarot-reading.buylife.xyz

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 우선 처리 8줄, 완료 기록 10줄, 대기 9줄 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
