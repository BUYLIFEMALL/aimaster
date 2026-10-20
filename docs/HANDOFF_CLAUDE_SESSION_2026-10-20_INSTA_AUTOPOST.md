# 인수인계 — Claude Code(윈도우) 2026-10-20 세션: 인스타 자동 포스팅 확대·예약 공용화

> 다른 CLI(agy·Codex·다른 Claude 세션)가 이 문서만 읽고 이어서 작업할 수 있게 정리했다. 마지막 커밋 `0a72b89d`(푸시됨).
> 대상: **① AIMaster 운영**(DB ref `esgxyikcnnvmlhygjkth`). Lab(②)은 건드리지 않았다.
> 시작 전 필독: 루트 `CLAUDE.md`(0순위 한국어 규칙·최상위 규칙), `docs/ACTIVE_WORK.md`, `docs/ERROR_LESSONS.md` 맨 위, `docs/SCHEDULER_POLICY.md`, `docs/SHARED_MODULES.md`.

---

## 1. 이 세션에서 한 일 (시간 순, 모두 커밋·푸시·배포·DB 버전 반영 완료)

| # | 프로그램 | 버전 | 내용 | 커밋 |
|---|---|---|---|---|
| 1 | four-cut-comics + insta_auto_poster | 4컷 v1.15·v1.16 / INSTA v1.27·v1.28 | 4컷 → INSTA 「넘기기」 버튼(바둑판 1장, 카드뉴스 컷별 4장), INSTA 새 글에 직접 첨부·여러 파일 첨부·`postType` 주소값 | (요약 이전 구간) |
| 2 | cardnews-studio | 문서만 | 「직접 발행 미지원」 옛 문구 정정(이미 v1.18~ 직접 게시 중) | `7cea3562` |
| 3 | ai-influencer-studio | v1.14 | 📤 인스타 즉시 게시(지금 사진+기록 사진 최대 10장 캐러셀, 4:5 밖은 가운데 자르기) | `2461027f` |
| 4 | ai-influencer-studio | v1.15 | ⏰ 예약 게시·게시 기록·실행 방식(Vercel/내 cron-job.org), 운영 DB 표 `aif_insta_posts`·`aif_member_scheduler`, Vercel `CRON_SECRET` | `71c6fe74` |
| 5 | ai-webtoon-studio | v1.15 | 컷 캐러셀 즉시 게시(1컷 = 흰 4:5 판 + 대사 말풍선) | `1cb97c32` |
| 6 | (루트) CLAUDE.md | — | 0순위 한국어 규칙에 2026-10-20 재발 기록·대책 ⓖⓗⓘ 추가 | `1c1ab481` |
| 7 | ai-webtoon-studio | v1.16 | 예약 게시·게시 기록·올라갈 장 미리보기, 표 `wts_*`, `vercel.json` 신규, `CRON_SECRET` | `b6043dd8` |
| 8 | ai-webtoon-studio | v1.17 | 📚 여러 회차 한 번에 예약(회차 JSON 여러 개), 대시보드 예약 대기 요약, 컷 없어도 게시 칸 표시 | `60b493ac` |
| 9 | four-cut-comics | v1.17 | 📤 직접 즉시 게시(바둑판 1장 / 컷별 캐러셀, 비율 밖은 **흰 여백**) | `07947705` |
| 10 | four-cut-comics | v1.18 | 예약 게시·게시 기록·장 미리보기, /settings 「⏰ 예약 발행」, 표 `fcc_*`, `CRON_SECRET` | `1f27bd6e` |
| 11 | four-cut-comics | v1.19 | 「내 작품」 맨 위 예약 상자: 여러 회차 한 번에 예약(이 브라우저·서버 보관함 작품), 예약 대기·기록. 예약 취소 중복 누름 방지 | `c7ae63c1` |
| 12 | 카드뉴스 v1.29·인플루언서 v1.17·웹툰 v1.19·4컷 v1.20 | — | **인스타 예약 서버 코드 공용 기준 코드화**(`insta-schedule-time`·`insta-member-scheduler`·`insta-cronjob-org`, 기준 = cardnews-studio, 프로그램 값은 각 `src/lib/instagram/schedulerConfig.ts`) + **일시정지 안전 처리 누락 3개 보강** + 예약 취소 중복 누름 방지 | `0a72b89d` |

### 인스타 자동 포스팅 현황 (주인님 지시 「모든 인스타 자동화 프로그램은 자동 포스팅까지」 — 완료)
| 프로그램 | 주소 | 즉시 게시 | 예약 게시 | 현재 버전 |
|---|---|---|---|---|
| INSTA 포스팅 자동화 | https://auto-instagram-posting.buylife.xyz | ✅ | ✅ | v1.28 이상(다른 세션 이어서 올렸을 수 있음) |
| INSTA 카드뉴스 | https://cardnews-studio.buylife.xyz | ✅ | ✅ | v1.29 |
| AI 인플루언서 | https://ai-influencer.buylife.xyz | ✅ v1.14 | ✅ v1.15 | v1.17 |
| AI 웹툰 | https://ai-webtoon-automation.buylife.xyz | ✅ v1.15 | ✅ v1.16 (+회차 묶음 v1.17) | v1.19 |
| AI 4컷 만화 | https://four-cut-comics.buylife.xyz | ✅ v1.17 | ✅ v1.18 (+내 작품 회차 묶음 v1.19) | v1.20 |

### 공통 구조 (새로 이어받는 CLI가 알아야 할 것)
- **인스타 연결**: 각 프로그램은 INSTA에서 회원이 한 번 연결한 값을 그대로 쓴다(`src/lib/instagram/memberAccount.ts` — 다른 세션이 「회원 연동 정보 공용 저장」으로 공용 Instagram 계정을 먼저 읽게 바꿈, 인플루언서 v1.16·웹툰 v1.18). 게시 함수는 공용 `instagram-publish` 사본.
- **사진**: 브라우저에서 JPEG로 만들어 INSTA 공개 저장소 `insta-post-images`의 회원 폴더(`influencer-insta/`·`webtoon-insta/`·`fourcut-insta/`)에 서명 업로드 → 게시 직후(예약이면 예약 시각 뒤·취소·실패·30일) 삭제. 경로 검사 함수가 다른 회원·다른 프로그램 폴더를 막는다.
- **예약**: 표 2개씩(게시 기록 `*_insta_posts`, 회원 실행 방식 `*_member_scheduler`, RLS 본인 읽기만), Vercel 5분 호출(`/api/instagram/dispatch` + `CRON_SECRET`), 회원 cron-job.org 1분 호출(`/api/instagram/dispatch-member` + 회원 토큰). 지침 `docs/SCHEDULER_POLICY.md` §8에 프로그램별 행 있음.
- **공용 기준 코드**: `memberScheduler.ts`·`cronJobOrg.ts`·`schedule.ts`는 **사본을 직접 고치지 말 것** — `cardnews-studio`의 기준만 고치고 `node scripts/check-shared-modules.mjs --sync` 후 4개 모두 테스트·배포.

---

## 2. 검수에서 확인한 것 / 못 한 것

- 확인(각 `AGENTS.md`에 상세): 단위 시험·타입·빌드, 비로그인·가짜 토큰 401, 예약 1~2건 실제 등록 → DB 시각·저장소 사진 크기 확인 → 취소 → 사진 삭제, 장 미리보기, 회차 묶음 정렬·60일 경고, 일시정지 경로(3개), Vercel 예약 호출 200(4개).
- **못 한 것(첫 실제 사용 때 확인 필요)**:
  1. **실제 인스타 게시(즉시·예약 실행 모두) — 한 번도 안 했다**(주인님 확인 전 실제 SNS 발행 금지 규칙). 첫 게시 결과(캐러셀 순서·여백·캡션)를 주인님과 함께 확인할 것.
  2. 「내 cron-job.org」 방식 전환·작업 자동 켜기/끄기(인플루언서·웹툰·4컷) — 관리자 cron-job.org 하루 100회 한도 보호로 미시험(같은 코드가 카드뉴스·다른 프로그램에서 실검수됨).
  3. 4컷 서버 보관함 작품으로 회차 묶음 예약 — 서버 보관함 작품이 없어 미시험(이 브라우저 작품과 같은 경로).
  4. 카드뉴스 화면 「예약 취소」 중복 누름 방지 실클릭 — 예약 기록 없어 미시험(4컷과 같은 수정).
  5. 4컷 v1.15·v1.16 「INSTA로 넘기기」 버튼 실제 클릭(그림 생성 비용).
- 시험 흔적: 관리자·시험 계정의 **취소된 시험 예약 기록**이 `aif_insta_posts`·`wts_insta_posts`·`fcc_insta_posts`에 몇 건 있다(사진은 지움, 30일 뒤 자동 삭제). 이 브라우저에 넣은 시험 원고·작품은 모두 지워 원래대로 되돌렸다.

---

## 3. 남은 작업 (우선순위 순) — 다음 첫 단계 포함

### A. 바로 이어서 할 만한 개발 (각 프로그램 `docs/IMPROVEMENTS.md`에도 기록)
1. **예약 게시 처리 코드 공용화 2단계** — `posting.ts`·예약 API 4개(`posts`·`dispatch`·`dispatch-member`·`scheduler`)를 공용으로. 카드뉴스에만 프로젝트 연결(`project_id`)·`cardnews-images` 버킷이 있어 구조가 다르므로, 그 차이를 `schedulerConfig.ts` 같은 설정으로 빼는 설계부터. 첫 단계: 4개 `posting.ts` diff 비교 → 플랜 보고.
2. **인스타 4개 화면 부품 공용화** — 「⏰ 예약 발행 상태 줄」·「게시 기록 목록」이 색만 다르고 내용이 같다(이번에 취소 중복 누름 수정을 3곳에 따로 넣어야 했던 원인). 색을 props/설정으로 받는 공용 부품 검토.
3. **다른 예약 프로그램 12개의 `memberScheduler.ts`도 공용 기준 코드로 등록**(threads 기준, 아직 손 복사 사본) — 오늘 「운영 12개 적용」 뒤 새 사본이 빠진 사고 재발 방지(`docs/ERROR_LESSONS.md` 2026-10-20 맨 위).
4. ✅(v1.22, 2026-10-20 처리) 4컷: 서버 보관함 서명 주소 1시간 만료 → 묶음 예약 직전 목록 다시 불러오기 / 회차별 캡션 미리보기·수정.
5. ✅(v1.21, 2026-10-20 — 창 닫힘 경고·안내·실패 회차만 다시 예약 처리, 회차별 캡션은 남음) 웹툰: 회차 묶음 예약 중 창을 닫으면 멈춤 → 「창을 닫지 마세요」 안내·「이어서 예약」 / 회차별 캡션 미리보기·수정.
6. 인플루언서: 게시 기록·예약이 결과 화면에서만 보임 → 대시보드·히스토리에 「예약 n건 대기」 / 작업 히스토리 DB 저장(현재 브라우저 저장, DB 추가라 승인 필요) / 「하루 일과 자동 예약」(일과 컷을 시간표대로 자동 예약).

### B. 요약 이전부터 남아 있던 일
7. **SNS 배포판(수강생 설치 키트) v1.01 → v1.02**: 주인님 시험 결과 대기 중. v1.02 포장 때 INSTA v1.27·v1.28(직접 첨부·여러 파일 첨부·postType) 반영, 매뉴얼 캡처. 관련 `docs/ACTIVE_WORK.md`의 「(문서·배포판만) docs/sns-kit-manual …」 줄(Claude Code 윈도우)이 아직 열려 있음 — 이어받는 CLI가 맡으면 그 줄을 본인 것으로 바꿀 것. 지침 `docs/DISTRIBUTION_KIT_GUIDE.md`.
8. 쇼핑제휴 키트 리허설 — 주인님 참여 필요.

### C. 주인님이 직접 하실 일 (에이전트가 하지 않음)
- `C:\Program Files\Git\tmp_fc.sql` 삭제 — 이 세션 셸 실수로 생긴 표 생성 SQL 사본(비밀값 없음). 안전 장치 때문에 에이전트가 못 지움.
- 크롬에 남은 Supabase 탭 2개(조직 프로젝트 목록·SQL 편집기) 닫기 — 「페이지를 떠나시겠습니까」 창 때문에 에이전트가 못 닫음.
- INSTA 관리자 계정 게시글 관리의 시험 초안 2건 삭제(주인님이 직접 지우겠다고 하심 — 건드리지 말 것).
- cron-job.org 예전 작업 삭제, 카카오 예약 결정.

---

## 4. 이어받는 CLI 주의사항 (이 세션에서 겪은 것)

1. **진행 설명은 처음부터 끝까지 한국어** — 이 세션에서 도구 사이 진행 설명이 영어로 여러 번 나와 주인님이 지적했다(루트 `CLAUDE.md` 0순위 ⓖⓗⓘ). 「~하겠습니다.」/「~했습니다. 다음은 ~입니다.」 두 문형만.
2. **공용 문서는 내 줄만 커밋** — `docs/HANDOFF.md`는 다른 CLI가 미커밋 내용을 자주 남긴다. `git show HEAD:docs/HANDOFF.md` + 내 항목 → `git hash-object -w` → `git update-index --cacheinfo`로 올리고 **바로 커밋**. 그 사이 다른 CLI가 `git add docs/HANDOFF.md`로 파일 전체를 커밋해 내 항목이 그쪽 커밋에 들어간 적이 있다(`542b1948`, 내용 손실은 없음).
3. **운영 DB 쓰기**는 크롬의 로그인된 Supabase SQL Editor로(`window.monaco.editor.getModels()`로 SQL 넣고 Run). 표 추가는 매번 주인님 승인. `drop policy if exists`가 있으면 「Potential issue」 경고 창이 뜨는데, 새 표의 정책만 건드리는 경우만 진행. 탭이 다른 화면으로 옮겨져 있을 수 있으니 실행 전 주소(`esgxyikcnnvmlhygjkth`)를 확인.
4. **그림 생성 비용 없이 화면 검수**: 4컷은 화면 상태(React 내부 상태)에 시험 컷을 넣어서, 웹툰·인플루언서는 브라우저 저장소에 시험 원고·기록을 넣어서 확인했다. 실제 게시를 막을 때는 그 탭에서 업로드·게시 요청만 가로챈다(실제 게시·저장 없음). 끝나면 반드시 원래대로 되돌릴 것.
5. 셸에서 `/tmp…` 같은 경로로 파일을 쓰면 `C:\Program Files\Git\` 아래에 생기고 지우기가 막힌다 — 임시 파일은 `scratch/`(커밋 대상 아님)에.
6. 새 인스타 예약 프로그램을 만들면 예약 코드를 손으로 복사하지 말고 `scripts/check-shared-modules.mjs`의 `insta-*` 항목에 사본으로 등록 → `--sync`, 프로그램 값은 `schedulerConfig.ts`.

## 5. 관련 문서
- 프로그램별: `ai-influencer-studio/AGENTS.md`(v1.14~v1.17)·`ai-webtoon-studio/AGENTS.md`(v1.15~v1.19)·`four-cut-comics/AGENTS.md`(v1.15~v1.20)·`cardnews-studio/AGENTS.md`(v1.29), 각 `docs/PLAN_20261020_*.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`
- 공용: `docs/SHARED_MODULES.md`(insta-* 3개), `docs/SCHEDULER_POLICY.md`(§8 현황·처리 결과 3), `docs/ERROR_LESSONS.md`(2026-10-20 맨 위), `docs/PROGRAM_CAPABILITY_MAP.md`(카드 갱신), `docs/HANDOFF.md`(맨 위 항목들)
