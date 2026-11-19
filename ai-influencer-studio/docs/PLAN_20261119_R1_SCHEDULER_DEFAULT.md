# R1 개발 플랜 — 예약 기본값을 cron-job.org로, 사이트(Vercel) 예약은 관리자가 지정한 계정만 (2026-11-19)

- 작성: [역할: sns] Claude(SNS) · 세션 `claude-win-20261118-sns` · `CC-SNS-01`
- 상태: **플랜(검토 대기)**. 제품 코드·DB·환경변수·빌드·배포 변경 0. 이 문서만 추가.
- 근거: `docs/analysis-ai-influencer-20261118/PLAN6_SUPPLEMENT_20261119.md` v2의 R1, 루트 지침 원칙 26, `docs/SCHEDULER_POLICY.md`.

## 1. 주인님 확정(2026-11-19 채팅)

1. 「크론잡을 기본 값으로 하고 vercel은 관리자와 테스트만 사용 가능하게 선택할수 있게 남겨놔」
2. 새 요구 6건 진행 순서 승인: 예약 기본값 → 글 모델 선택 → 이미지 모델 선택 → 숏츠 → 쓰레드 → 릴스·유튜브 쇼츠. (요청함 `c8c4e728…` 승인완료 처리)
3. 시험 계정을 가리는 수단(D3): **「관리자페이지에서 관리자가 지정할수 있게 해주면 될듯」** → 이 용도 전용 표식을 새로 두고, 관리자 화면에서 켜고 끈다. 코드에 이메일을 적지 않는다. `can_view_internal`·`retention_exempt`는 쓰지 않는다(목적이 다름).

### 1-1. 같은 날 이어서 받은 결정(R1 밖의 항목 포함 — 뒤 순서 플랜에 그대로 쓴다)

| 항목 | 주인님 결정(원문) | 적용 |
|---|---|---|
| 글 모델 범위(R2) | 「최신 모델 기준으로 최고성증/중간성능/가성비 정도로 선택지를 주면 되」 | 제공자마다 최신 기준 세 등급(최상급·중간·가성비). 기준 표는 `docs/AI_MODEL_CATALOG.md`, 기본값은 중간 |
| 이미지 모델 비교 예산(R3) | 「이건 해야할때 요청하면 예산 승인하는 것으로 하겠습니다」 | 미리 예산을 잡지 않는다. 유료 비교 시험 직전에 횟수·모델·금액을 올려 승인받는다 |
| 시험 자료 삭제 | 「나중에 봐야 하니 놔둬. 삭제는 관리자가 필요에 의해서 삭제 하겠음」 | 시험 중 만든 자료를 내가 지우지 않는다 |
| 실제 인스타 게시 확인 | 「실제 게시까지 시험」 | R1 검수에 실제 게시 1회를 넣는다(§4의 5번). 실행 시각·계정은 실행 직전에 알린다 |

- 아직 받지 않은 결정: 숏츠 1차 범위(R4 플랜 때 여쭌다).

## 2. 지금 동작(코드 확인, 저장소 기준)

| 자리 | 파일 | 지금 | 공용 사본 여부 |
|---|---|---|---|
| 기본 방식 | `src/lib/instagram/memberScheduler.ts` `DEFAULT_SCHEDULER_MODE` | 운영은 `vercel`(행이 없는 회원 전부) | 공용 `member-scheduler` 사본 |
| 방식 바꾸기 | `src/app/api/instagram/scheduler/route.ts` POST `action: "mode"` | `vercel`·`cronjob` 누구에게나 허용 | 공용 `insta-scheduler-route` 사본 |
| 키 삭제 | 같은 파일 DELETE → `removeMemberScheduler` | 방식을 `vercel`로 되돌림 | 공용 사본 |
| 예약 저장 | `src/app/api/instagram/posts/route.ts` `checkScheduleReady` | `cronjob`이면 키 확인, 아니면 사이트 예약이 켜져 있으면 통과 | 공용 `insta-posts-route` 사본 |
| 사이트 예약 실행 | `src/app/api/instagram/dispatch/route.ts` | 「cron-job.org 회원·일시정지 회원」을 뺀 전부 게시 | 공용 `insta-dispatch-route` 사본 |
| 설정 화면 | `src/components/ScheduleSettings.tsx` | 두 선택지, 문구 「기본은 AIMaster 기본(Vercel)」 | 프로그램 고유(공용 등록 없음) |
| 프로그램 값 | `src/lib/instagram/schedulerConfig.ts` | `SCHEDULER_IS_STANDALONE = false` 등 | 프로그램 고유 |
| 사이트 예약 주기 | `vercel.json` | 5분마다 `/api/instagram/dispatch` | 프로그램 고유 |

### 2-1. 보완 계획(PLAN6 v2) 정정 — 내 오류

- v2의 R1에 「공용 사본은 고치지 않고 **이 프로그램의 호출부**(방식 바꾸기 요청·예약 저장·사이트 예약 실행)에서 막는다」고 적었다. **틀렸다.** 그 세 호출부 파일도 공용 사본이다(`scripts/check-shared-modules.mjs`의 `insta-scheduler-route`·`insta-posts-route`·`insta-dispatch-route`, 파일 머리 주석 「사본 직접 수정 금지」). 게시 처리 `posting.ts`도 공용(`insta-posting`)이다.
- 그래서 「공용 사본 무수정」과 「회원별로 Vercel을 허용/차단」은 지금 구조에서는 **동시에 만족할 수 없다**. 공용 코드에 있는 스위치는 사이트 전체용(`AIF_PLATFORM_SCHEDULER=off`) 하나뿐이고 회원별 판정 자리가 없다.

## 3. 만들 것

### 3-1. 표식(DB, 운영 공용 DB — 승인 필요)

- 새 표 `member_site_scheduler_allow`(가칭): `user_id uuid primary key references auth.users`, `granted_by uuid`, `granted_at timestamptz`, `note text`.
- RLS 켬. 회원 쓰기 정책 없음(서비스 역할만 씀). 회원 본인 행 읽기만 허용(화면에 「허용됨」을 보여 줄 때).
- `profiles`에 칸을 더하지 않는 이유: 회원이 자기 `profiles` 행을 고칠 수 있는 경로가 있으면 보호 트리거가 따로 필요하다. 별도 표는 그 위험이 없다.
- 관리자(`profiles.is_admin`)는 표와 상관없이 항상 허용.
- 뜻: 「이 회원의 예약을 사이트(Vercel) 예약으로 돌려도 된다」. 예약 기능이 있는 다른 프로그램도 나중에 같은 표를 읽을 수 있다(이번에는 이 프로그램만 읽는다).
- 마이그레이션 SQL 파일은 루트 `supabase/migrations/`에 남긴다(메인 사이트 공용 표). 번호·적용은 Master 순번.

### 3-2. 관리자 화면(메인 사이트 — 내 범위 밖)

- `www.buylife.xyz/admin`의 회원 관리 화면에 「사이트 예약(Vercel) 허용」 켜기/끄기 하나. 저장은 관리자 전용 API(서비스 역할) → 위 표에 행 넣기/지우기.
- 루트 `app/admin/`은 내 담당이 아니다 → Master가 담당 세션을 정한다. 내가 넘길 것: 표 이름·칸·API 모양(§3-1).

### 3-3. 이 프로그램의 판정과 차단

판정 함수 하나(프로그램 고유 `schedulerConfig.ts`): `canUsePlatformScheduler(service, userId)` = 관리자이거나 허용 표에 행이 있음.

| 자리 | 바꿀 동작 |
|---|---|
| 기본 방식 | 허용 계정이 아니면 기본 = `cronjob`. 허용 계정은 지금처럼 고른 값(행이 없으면 `vercel`) |
| 방식 바꾸기 | 허용 계정이 아닌 회원이 `vercel`을 보내면 403 + cron-job.org 안내 |
| 키 삭제 | 허용 계정이 아니면 `vercel`로 되돌리지 않음(방식 `cronjob` 유지, 예약할 때 키 등록 안내) |
| 예약 저장 | 허용 계정이 아닌데 방식이 `vercel`이면 거절하지 않고 **cron-job.org 기준으로 확인**(키 없으면 등록 안내, 있으면 그 키로 예약) |
| 사이트 예약 실행 | 허용 계정의 글만 게시. 그 밖의 회원 글은 건드리지 않음(실패 처리도 하지 않음) |
| 설정 화면 | 허용 계정이 아니면 Vercel 선택지를 그리지 않고, 키 등록 3단계를 맨 위로. 문구에서 「기본은 Vercel」 삭제 |
| 예약 누르는 자리 | 키가 없으면 그 자리에서 「cron-job.org 무료 가입 → 키 한 줄」 안내와 설정 열기 |

### 3-4. 공용 사본을 어떻게 다룰지 — Master 판정 필요(둘 중 하나)

| 안 | 내용 | 영향 | 내 의견 |
|---|---|---|---|
| A. 공용 기준에 연결점 추가 | 기준 코드(`member-scheduler`와 인스타 경로 3개)에 「회원별 사이트 예약 허용 판정」 자리를 넣고, 각 프로그램 `schedulerConfig.ts`가 판정을 준다. 다른 프로그램의 기본 판정은 「전원 허용」이라 동작이 그대로다 | 기준 수정 + `--sync` + 사본을 쓰는 프로그램마다 `schedulerConfig.ts` 한 줄. 급하지 않은 등급이라 다른 프로그램은 저장소 반영만, 배포는 이 프로그램만 | 권장. 원칙 26은 모든 예약 프로그램에 해당하므로 다른 프로그램도 나중에 판정 한 줄만 바꾸면 된다 |
| B. 이 프로그램만 분기 | 이 프로그램의 예약 관련 사본 4~5개를 공용 등록에서 빼고 직접 고친다 | 다른 프로그램 영향 0. 대신 이 프로그램이 공용 수정(버그·보안)을 자동으로 못 받는다 | A가 안 되면 B |

- 참고(사본 무수정 임시안): 환경변수 `AIF_PLATFORM_SCHEDULER=off` 하나로 일반 회원은 전부 cron-job.org 안내를 받는다. 다만 관리자·지정 계정도 Vercel을 못 쓰게 되어 확정 1번의 뒷부분을 못 채운다 → 채택하지 않는다.
- Master의 기존 지시 「공용 사본 수정·`--sync` 금지」가 유지되면 A는 못 하고 B도 공용 등록 파일 수정이 든다 — 어느 쪽이든 Master 판정 뒤에만 시작한다.

## 4. 순서와 검증

1. DB 표 신설(승인 → Master 순번) → 확인: 표·RLS·정책 조회.
2. 관리자 화면 켜기/끄기(메인 사이트 담당) → 확인: 시험 계정을 켰을 때 행 1건.
3. 이 프로그램 판정·차단·화면(§3-3) → 확인: 단위 시험(판정 4갈래: 관리자/지정/일반+키/일반+키 없음), `npx tsc --noEmit`, `npm test`.
4. 배포 직전 대기 예약 재집계(PLAN6 D13): 일반 회원의 `vercel` 방식 대기 예약이 1건 이상이면 배포하지 않고 결정을 받는다(2026-11-19 읽기 기준 0건).
5. 배포(v1.28 — 미배포 대기 W01a·W01b·W01-FIT·W01-NEXT와 함께) → 화면 검수(ego lite): 일반 회원 화면에 Vercel 선택지 없음, 직접 요청 403, 키 없는 예약 → 안내, 키 등록 뒤 예약 → 회원 cron-job.org 작업 생성 → 정시 게시 → 남은 예약 0이면 작업 꺼짐. 관리자·지정 계정은 두 방식 모두.

## 5. 자동화 조건 숫자

- 일반 회원: 처음 설정 3단계(cron-job.org 가입 → 키 만들기 → 키 붙여 넣기, 다른 프로그램에서 넣었으면 0단계) · 매일 조작 0번(예약만) · 동의 0번.

## 6. 비용

| 항목 | 누구 | 내용 |
|---|---|---|
| 배포 빌드 | 운영자 | 이 프로그램 1회(미배포 대기분과 함께). 관리자 화면은 메인 사이트 빌드 1회(담당 세션 몫) |
| 유료 AI 호출 | 없음 | — |
| cron-job.org | 회원 | 무료 요금제 |
| 예약 확인 호출 | 운영자 | cron-job.org로 바꿔도 실제 처리는 이 사이트 함수에서 돈다(예약이 걸린 회원마다 1분 1회, 예약 없으면 0) |
| 실제 게시 시험 | 없음(무료) | 시험 계정으로 1회 — 실제 인스타 게시라 실행 전 승인 |

## 7. 결정 항목

| 번호 | 결정할 것 | 누가 | 상태 |
|---|---|---|---|
| R1-1 | 시험 계정을 가리는 수단 | 주인님 | **확정**: 관리자 화면에서 지정 |
| R1-2 | 운영 DB에 표 신설(§3-1) 승인 | 주인님 | 대기 |
| R1-3 | 공용 사본 처리 A/B(§3-4) | Master | 대기 |
| R1-4 | 관리자 화면 담당 세션 | Master | 대기 |
| R1-5 | 사이트 예약 주기 5분 ↔ 정책 1분(PLAN6 D4) | Master | 대기(이번에 안 맞춰도 R1은 가능) |
| R1-6 | 방식 행이 `vercel`인 일반 회원 행을 한꺼번에 바꿀지 | Master | 대기(안 바꿔도 §3-3의 「예약 저장」이 흡수) |
| R1-7 | 빌드 1회 | 주인님 | 배포 직전에 다시 여쭘 |
| R1-8 | 실제 게시 시험 | 주인님 | **확정**: 실제 게시까지 시험 |

## 8. 하지 않는 것

- `docs/SCHEDULER_POLICY.md` 개정(별도 작업, Master 판정).
- 다른 프로그램의 기본값 변경.
- 원본 사진 정리 예약(`/api/aif/assets/cleanup`) — 운영 정리 작업이라 사이트 예약 그대로.

## 9. A안 설계 — 공용 기준의 「선택 연결점」 (2026-11-19, Master `msg_81623dd95517`)

- 상태: **설계 표만**. 기준·사본 편집 0, `--sync` 0, DB·제품 편집 0, 실제 게시·배포·유료 호출 0.
- Master 조건(그대로 반영): 이 앱은 관리자·지정 회원도 행이 없으면 cron-job.org가 기본이고 Vercel은 **명시 선택만** · 권한 조회 오류와 철회는 Vercel **차단** · 오래된 `vercel` 행은 일괄 수정 없이 **유효 방식으로 해석** · 대기 게시 처리는 D13 선행 · 회원 cron 1분과 운영 Vercel 5분은 별개이고 이번에 주기 변경 없음 · 관리자 화면·권한 저장 계약·마이그레이션 번호는 Master 조정(§3-1의 표 이름·칸은 내 제안일 뿐이다).
- §3-3 정정: 「허용 계정은 행이 없으면 `vercel`」이라고 적었던 것은 Master 조건에 따라 **행이 없으면 누구나 `cronjob`**으로 바꾼다.

### 9-1. 연결점(프로그램 고유 `schedulerConfig.ts`가 **내보낼 때만** 켜진다)

| 선택 내보내기 | 뜻 | 없을 때(다른 프로그램 전부) |
|---|---|---|
| `SCHEDULER_DEFAULT_MODE` | 행이 없는 회원의 기본 방식 | 지금 식 그대로(`SCHEDULER_IS_STANDALONE ? "cronjob" : "vercel"`) |
| `platformSchedulerAllowed(service, userId)` | 이 회원이 사이트(Vercel) 예약을 써도 되는가 | 전원 허용(지금과 같음) |
| `listPlatformAllowedUserIds(service)` | 사이트 예약 실행이 처리해도 되는 회원 목록 | 「제외 목록」 방식 그대로 |

- 읽는 방법: 기준이 `import * as cfg from "./schedulerConfig"`로 읽고 있으면 쓰고 없으면 건너뛴다 → **다른 프로그램의 `schedulerConfig.ts`는 한 줄도 바뀌지 않는다.**
- 판정 함수가 오류를 내면 「허용 아님」으로 본다(연결점이 있는 프로그램에서만).

### 9-2. 기준 파일별 패치 범위

| 공용 id | 기준 파일 | 사본 수 | 바꿀 것 | 이 앱 밖 동작 |
|---|---|---|---|---|
| `member-scheduler` | `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts` | 18 | 기본 방식을 선택 값에서 읽기 · 새 내부 함수 「회원별 허용」 · `memberSchedulerMode`가 **유효 방식**을 돌려줌(행이 `vercel`인데 허용이 아니면 `cronjob`) · `setMemberSchedulerMode("vercel")`은 허용 아니면 거절 · `removeMemberScheduler`는 허용일 때만 `vercel`로 되돌림 · `memberSchedulerState`에 `platformAllowed` 추가(방식은 유효 방식) · 새 함수 `platformDispatchScope(service)`(제외 목록 또는 허용 목록) | 불변(§9-4) |
| `insta-posting` | `ai-webtoon-studio/src/lib/instagram/posting.ts` | 2 | `dispatchDuePosts` 선택 인자 `onlyUserIds`(주면 그 회원 글만, 빈 목록이면 0건) | 인자를 안 주면 불변 |
| `insta-dispatch-route` | `ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts` | 2 | `membersExcludedFromPlatform` 대신 `platformDispatchScope` 결과를 넘김 | 연결점이 없으면 같은 제외 목록 |
| `insta-scheduler-route` · `insta-posts-route` · `insta-dispatch-member-route` · `insta-cronjob-org` | — | — | **변경 없음**(유효 방식·거절이 `member-scheduler` 안에서 처리됨) | — |

- `membersExcludedFromPlatform`은 지우지 않고 그대로 둔다(정기형 프로그램의 자체 실행 경로가 부른다).
- 허용 목록 방식이 필요한 이유: 지금은 행이 없는 회원도 예약할 수 있어 「행 없는 회원의 대기 글」이 생길 수 있다. 제외 목록으로는 행이 없는 회원을 적을 수 없다.
- 사이트 예약이 처리하는 대상(이 앱) = 허용 목록 ∩ 행의 방식이 `vercel` ∩ 일시정지 아님.

### 9-3. 이 앱만 바뀌는 파일(프로그램 고유)

| 파일 | 바꿀 것 |
|---|---|
| `src/lib/instagram/schedulerConfig.ts` | `SCHEDULER_DEFAULT_MODE = "cronjob"` · 판정 2개(관리자이거나 권한 저장소에 있음 — 저장 계약은 Master 확정 뒤) |
| `src/components/ScheduleSettings.tsx` | `platformAllowed`가 아니면 Vercel 선택지를 그리지 않음 · 키 등록 안내를 위로 · 「기본은 Vercel」 문구 삭제 · 키 삭제 안내 문구 |
| 예약 누르는 화면(`SchedulePublishingControl.tsx` 등 고유 화면) | 키가 없을 때 등록 안내와 설정 열기 |

### 9-4. 기본 동작 회귀 표 — 연결점을 내보내지 않는 프로그램(사본 17 + 2 + 2)

| 함수·경로 | 지금 | 패치 뒤(연결점 없음) | 같음을 볼 시험 |
|---|---|---|---|
| `DEFAULT_SCHEDULER_MODE` | 운영 `vercel` / 키트 `cronjob` | 같음 | 값 단언 2갈래 |
| `memberSchedulerMode` | 행의 방식, 없으면 기본 | 같음(허용 = 항상 참) | 행 없음·`vercel`·`cronjob` |
| `setMemberSchedulerMode("vercel")` | 사이트 예약이 켜져 있으면 저장 | 같음 | 켜짐·꺼짐 |
| `setMemberSchedulerMode("cronjob")` | 키 필요·실패 시 되돌림 | 같음(손대지 않음) | 기존 시험 |
| `removeMemberScheduler` | 켜져 있으면 `vercel`로 되돌림 | 같음 | keepMode 유무 |
| `memberSchedulerState` | 6가지 상태 | 같음 + 칸 `platformAllowed: true` 하나 추가 | 상태 6가지 |
| `membersExcludedFromPlatform` | 제외 목록 | 같음(손대지 않음) | — |
| `platformDispatchScope`(새) | — | `{ excludeUserIds: 위와 같은 목록 }` | 목록 동일 단언 |
| `dispatchDuePosts` | 제외 목록 적용 | 같음(`onlyUserIds` 없음) | 조회 조건 동일 |
| 사이트 예약 실행 경로 | 제외 목록으로 게시 | 같음 | 모의 실행 |

- 덧붙는 응답 칸(`platformAllowed`)을 엄격히 검사하는 기존 화면·시험이 있는지는 패치 때 사본 프로그램별로 찾아본다(지금은 미확인).

### 9-5. 이 앱의 판정표(연결점 있음)

| 회원 | 행 | 유효 방식 | Vercel로 바꾸기 | 사이트 예약이 게시 |
|---|---|---|---|---|
| 일반 | 없음 | `cronjob` | 거절 | 아니오 |
| 일반 | `vercel`(옛 기본) | `cronjob` | 거절 | 아니오 |
| 일반 | `cronjob` | `cronjob` | 거절 | 아니오 |
| 관리자·지정 | 없음 | `cronjob` | 허용 | 아니오(고르기 전) |
| 관리자·지정 | `vercel` | `vercel` | — | 예 |
| 지정 철회됨 | `vercel` | `cronjob` | 거절 | 아니오 |
| 판정 조회 오류 | 무엇이든 | `cronjob` | 거절 | 아니오 |

- 「옛 `vercel` 행이 명시 선택인지 기본으로 들어간 것인지」는 행만으로 구분할 수 없다(지금 코드는 행을 만들 때 기본값을 적는다). 관리자·지정 계정의 옛 `vercel` 행은 유효 방식 `vercel`로 해석된다 — Master 조건 「유효 방식으로 해석」과 맞지만, 「명시 선택만」을 엄격히 하려면 그 계정들이 한 번 다시 골라야 한다. 판정 필요(운영 행은 2026-11-19 읽기 기준 1건).
- 유효 방식이 `cronjob`인데 키가 없는 회원의 **이미 대기 중인 글**은 아무도 게시하지 않는다 → D13(배포 직전 건수 확인, 1건 이상이면 배포 보류)이 선행인 이유다.

### 9-6. 로컬 패치 경로(승인 뒤 순서)

1. 격리 사본(저장소 밖 `git archive`)에서 기준 3파일을 고치고 시험 작성 — 공유 작업 폴더의 기준·사본은 그대로.
2. 회귀 시험: §9-4(연결점 없음) + §9-5(연결점 있음) + 각 사본 프로그램의 기존 예약 시험.
3. Master 수락 뒤 기준 3파일 커밋 → `node scripts/check-shared-modules.mjs --sync` → 사본 22개가 바뀜(18 + 2 + 2). 사본 프로그램은 저장소 반영만(급하지 않은 등급, 각 프로그램 「미배포 대기」 기록), 배포는 이 앱만.
4. 이 앱 고유 파일(§9-3) → `tsc`·`npm test` → D13 확인 → 배포(빌드 승인 뒤).

- 사본 영향 프로그램: `ai-influencer-studio` · `ai-webtoon-studio` · `four-cut-comics` · `threads-content-ops` · `threads` · `insta_auto_poster`(기준 + 사본) · `threads-affiliate-poster` · `booking-reminder` · `crm-google-form` · `kakao_auto_poster` · `naver-cafe-poster` · `stepmail` · `trending-product-finder` · `youtube-auto-reply` · `threads-comment-reply` · `instagram-comment-reply` · `realty-client-desk` · `ai-work-workspace`. 다른 역할 담당 프로그램이 많다 — `--sync` 전에 각 폴더의 미커밋 변경과 점유를 확인해야 한다.
- 점검 기준선(2026-11-19): `check-shared-modules.mjs` 일치 458줄, 예약 관련 22줄 모두 OK. 무관한 문제 1건(`safe-fetch` 기준 파일 없음)은 내 범위 밖이라 Master에 알림.

## 10. 격리 후보 결과 — 공용 연결점(§9-6의 1·2) (2026-11-19, Master `msg_e22a2892cbd5`)

- 범위: 저장소 밖 격리 사본에서만 기준 3파일을 고치고 모의 시험. **공용 실제 파일·사본·`--sync`·DB·제품 코드·운영·실제 게시·빌드·배포 0.** 후보 보관: `docs/analysis-ai-influencer-20261118/candidates/r1/`(패치 + 시험 + 다시 돌리는 법).
- 결과: 모의 시험 **16/16**, 변형 검사 **21개 중 빨강 21개**. 새 빈 폴더에서 안내대로 다시 만들어 같은 결과.
- 패치 크기: `memberScheduler.ts` +90 −8 · `posting.ts` +11 · 사이트 예약 실행 경로 +3 −2.

**§9 설계에서 바뀐 것(Master 조건 반영)**

| 항목 | §9 초안 | 후보 |
|---|---|---|
| 연결점 수 | 내보내기 3개 | **하나**: `platformSchedulerPolicy` 객체(`defaultMode`·`allowed`·`confirmed?`·`markConfirmed?`·`listAllowedUserIds`) |
| 연결점 없는 앱의 응답 | 칸 `platformAllowed: true` 추가 | **추가하지 않음**(응답 키가 원본과 같음을 시험으로 고정) |
| 옛 `vercel` 행 | 유효 방식 `vercel`로 해석 | 프로그램이 `confirmed`를 주면 **명시 선택이 확인된 경우만** `vercel`. 확인 안 된 지정 회원은 유효 방식 `cronjob` + 상태에 `platformReselectNeeded: true`(다시 고르기 안내용) |
| 키 삭제 | 허용일 때만 `vercel`로 되돌림 | 연결점이 있으면 **되돌리지 않음**(행의 방식 유지) |
| 처리 직전 재확인 | 없음 | `dispatchDuePosts`의 선택 인자 `allowUser` — 글을 잡기 전에 행(방식·일시정지)·권한·명시 확인을 다시 보고, 거짓이거나 실패하면 그 글은 **건드리지 않음**(대기 그대로, 결과에 `skipped`) |
| 예약 때 행 맞춤 | 없음 | 연결점이 있으면 `ensureMemberSchedulerRunning`이 행을 `cronjob`으로 맞춤 — 안 맞추면 옛 `vercel` 행 회원의 cron-job.org 호출을 회원 실행 주소가 401로 거절한다(작성 중 발견) |

**시험이 본 것**

| 묶음 | 내용 |
|---|---|
| 연결점 없음 — 원본과 나란히 대조 | 함수 12개 × 상태 6 × 키 유무 × 남은 일 0/2 × 사이트 스위치 기본/off × cron 실패 유무 = **1,152조합**에서 반환값·오류 문구·DB 호출 순서와 내용·cron 호출이 원본과 같음. 게시 처리 4갈래, 사이트 예약 경로 4갈래(인증 실패 포함)도 원본과 같음. 상태 응답 키 6개 그대로 |
| 연결점 있음 | 기본 `cronjob`(관리자·지정도 행 없으면 `cronjob`) · 판정표 6갈래(행 쓰기 0) · 다시 고르기 안내 · 권한/확인 조회 실패 → 차단 · Vercel로 바꾸기(거절·허용+명시 기록·기록 실패 시 미변경·사이트 스위치 off) · 키 삭제 · 예약 때 행 맞춤 · 실행 범위(허용 ∩ `vercel` ∩ 일시정지 아님, 목록/DB 실패 → 0명) · 처리 직전 철회·일시정지·방식 변경·조회 실패 · 경로 통합(지정+명시 글만 게시, 나머지 대기) |

**확인하지 못한 것(모의로는 볼 수 없음)**

- 타입 검사(`tsc`)와 실제 빌드: 격리 사본에 의존성이 없어 돌리지 않았다. 특히 「없는 내보내기를 이름으로 읽는 줄」(`Reflect.get(…, "platformSchedulerPolicy")`)이 연결점 없는 프로그램의 Next 빌드에서 경고·오류 없이 통과하는지는 **실제 빌드로 봐야 한다**.
- 실제 Supabase 질의(특히 `.in("user_id", …)`에 회원이 아주 많을 때의 주소 길이) — 지정 회원은 소수라는 전제.
- 이 앱의 `schedulerConfig.ts` 연결점 구현(권한 저장소·명시 기록 저장소)과 화면 — 저장 계약이 정해진 뒤.
- 정기형 프로그램(예약 글이 아니라 규칙을 돌리는 사본들)의 자체 실행 경로: `membersExcludedFromPlatform`을 그대로 두어 영향이 없도록 했고 대조 시험에 넣었지만, 그 프로그램들의 기존 시험은 돌리지 않았다.
- 사본 프로그램의 화면·시험이 상태 응답을 엄격히 검사하는지 — 응답 모양을 바꾸지 않아 해당 없음으로 본다(직접 확인은 안 함).

**Master 판정이 필요한 것**

1. 「명시 선택」 기록을 어디에 둘지(`confirmed`·`markConfirmed`의 저장소) — 권한 표에 칸으로 둘지, 실행 방식 표에 칸을 더할지. 후보는 저장 방식과 무관하게 동작한다.
2. 재확인으로 건너뛴 글의 결과 표기 `skipped`를 사이트 예약 응답의 `processed` 수에 넣을지(지금은 들어간다 — 연결점이 있는 앱에서만).
3. 실제 빌드 확인을 어느 프로그램으로 할지(연결점 없는 사본 1개 + 이 앱) — 로컬 `npm run build`는 무료지만 격리 사본에 의존성 설치가 필요하다.
