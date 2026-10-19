# SNS 키트 수강생 설치 리허설 기록 (2026-10-19)

> 목적: PDS `SNS_Auto_Posting_Kit_20261018`(Threads 콘텐츠 운영 자동화 + INSTA 포스팅 자동화)를 **수강생과 똑같이** 처음부터 설치해 보고, 막힌 곳·필요한 값·화면을 기록해 초보자용 교육 매뉴얼(`SNS_KIT_STUDENT_MANUAL.md`)을 만든다.
> 체계: ② AIMaster_dev(Lab). 운영 AIMaster DB·운영 프로그램 폴더·buylife.xyz 미접촉.
> 진행: 주인님(수강생 역할) + Claude Code(윈도우, 크롬 화면 조작·기록). 비밀번호·키 입력은 주인님.

## 환경

| 항목 | 값 |
|---|---|
| 코드 위치 | `labs/kit-threads/`, `labs/kit-insta/` (PDS 폴더 그대로 복사) |
| Supabase 조직 | `BUYLIFE-DEV` (Free) |
| Threads용 Supabase | 프로젝트 `kit-threads`, ref `jehfmpqzcuwjyzqejtnq`, 서울(ap-northeast-2) |
| Vercel | 팀 `buylife`, Threads = 프로젝트 `dev-threads-posting` → **https://dev-threads-posting.vercel.app** (설치 때 주인님이 정한 이름), 인스타 = 예정 |

## 단계별 기록

| # | 단계 | 결과 | 막힌 곳·메모 | 캡처 |
|---|---|---|---|---|
| T1 | 압축 풀기·폴더 정하기 | ✅ `labs/kit-threads` | — | — |
| T2 | Supabase 새 프로젝트 | ✅ 이름 `kit-threads`, 비밀번호 「Generate a password」, Region은 기본 「Asia-Pacific」에서 **「Need a specific region?」→ Northeast Asia (Seoul)** 로 바꿔야 함, Security 3항목은 기본값 | 안내서엔 Region 고르는 화면 설명이 없음(기본이 Asia-Pacific 일반 지역) → 매뉴얼에 추가. 조직이 여러 개면 맨 위 Organization 확인 | `img/t02-supabase-new-project.jpg` |
| T3 | 프로젝트 준비 대기 | ✅ 약 30초 후 이름 `kit-threads`·Status Healthy | 생성 직후 화면 제목이 `warm-project-pool_…` 임시 이름·STATUS 「Coming up…」 → **「1분 정도 기다렸다 새로고침하면 내 이름으로 바뀜」 안내 필요** | `img/t03-supabase-project-starting.jpg` |
| T4 | SQL Editor 열기 | ✅ | 처음 열면 「Snippets no longer save automatically」 안내 창 → **Understood** 누르기 | — |
| T5 | `schema.sql` 붙여넣고 Run | ✅ 289줄 | Run 누르면 **「Potential issue detected」(destructive operations) 경고** — `drop policy if exists` 때문. 빈 새 프로젝트라 안전 → **Run query**. 안내서에 없음 → 매뉴얼 필수 | `img/t05-sql-destructive-warning.jpg` |
| T6 | 실행 결과 | ✅ 「Success. No rows returned」 | 이후 다른 메뉴로 가면 「Leave site?(저장 안 한 변경)」 창 → 이미 실행됐으니 **나가기** 눌러도 됨 | `img/t06-sql-success.jpg` |
| T7 | Confirm email 끄기 | ✅ Authentication → Sign In / Providers → **Confirm email 끄기 → Save changes**(새로고침 후 꺼짐 확인) | 안내서 경로 「Email → Confirm email」은 옛 화면. 지금은 **User Signups 칸 맨 아래**에 바로 있음 | `img/t07-confirm-email-off.jpg` |
| T8 | 키 3가지 확인 | ✅ Project Settings → **API Keys**: Publishable key(바로 보임·복사 버튼), Secret key(눈 아이콘으로 보기·복사 버튼). Project URL은 상단 **Connect** 또는 Settings → Data API | 안내서의 「Project Settings → API」는 지금 메뉴명 **API Keys** | — |
| T9 | 설치 스크립트(주인님 실행) | ✅ 프로젝트 이름 `dev-threads-posting`, 빌드·환경변수 7개·배포 Ready(47초) | 끝에 주소가 3개 보여 헷갈림: `…-bsdb3n07o-buylife.vercel.app`(배포마다 바뀌는 개별 주소, 로그인 보호됨) vs **`dev-threads-posting.vercel.app`(대표 주소 = Vercel Domains에 보이는 것, 이걸 씀)** → 매뉴얼에 「Domains 화면의 주소 하나만 쓰세요」. 「Deployment Protection is on」 경고는 개별 주소 얘기라 대표 주소는 누구나 열림 | — |
| T9-1 | ⚠️ 사고: 대표 주소에 엉뚱한 사이트가 뜸 | ✅ 해결 | 원인: `vercel link`가 폴더가 GitHub 저장소 안에 있으면 **그 저장소를 프로젝트에 자동 연결** → 저장소에 푸시될 때마다 저장소 루트(AIMaster 메인 사이트)가 이 프로젝트로 빌드돼 대표 주소를 덮어씀(빌드 비용도 발생). 조치: `npx vercel@latest git disconnect --yes` → `npx vercel@latest promote <키트 배포 주소> --yes`(새 빌드 없음). **수강생**은 키트를 자기 GitHub 저장소 밖 폴더(바탕화면 등)에 풀면 안 생기는 문제지만, 저장소 안에 풀었다면 같은 증상 → 매뉴얼 「자주 막히는 곳」에 추가. 브라우저가 옛 화면을 기억할 수 있어 `/login`으로 확인 | — |
| T10 | 사이트 열기 | ✅ 첫 화면 → 로그인 「Threads 콘텐츠 운영 자동화」 | — | `img/t10-kit-login.jpg` |
| T11 | 가입·로그인 | ✅ 주인님 가입 → 대시보드 정상, 사이드바에 buylife.xyz 링크 안 보임(독립 모드 OK) | — | `img/t11-dashboard.jpg` |
| T12~T16 | Meta 새 앱 만들기(수강생 경로) | ⏸ 마지막 「앱 만들기」 직전까지 진행 후 취소(앱 미생성) | 5단계: 앱 상세 정보(이름에 「Threads」 등 Meta 상표 넣지 말 것, 예 `dev-kit-rehearsal`) → 이용 사례 **Threads API 액세스** → 비즈니스 **「아직 연결하고 싶지 않음」** → 요구 사항(없음) → 개요 **앱 만들기**(=Meta 플랫폼 약관·개발자 정책 동의) | `img/t12~t16-meta-*.jpg` |
| T17 | 기존 앱 재사용(주인님 리허설 경로) | ✅ 주인님 결정: 기존 `Threads` 앱(Threads 앱 ID `2421352361643803`) 사용. 이용 사례 → Threads API 액세스 → 설정 → **리디렉션 콜백 URL에 키트 주소 추가**(기존 `threads-nu-dusky…/api/threads/callback`은 유지, 제거·삭제 콜백 칸 미변경) → 저장 → 새로고침 후 유지 확인. 권한 `threads_basic`·`threads_content_publish` 이미 있음, 테스터 `buylife.co.kr` 이미 등록 | 콜백 칸은 주소 입력 뒤 **Enter가 아니라 아래 뜨는 제안 항목을 클릭**해야 목록에 들어감 → 매뉴얼에 추가. 「이미 앱이 있는 사람」용 짧은 경로로 매뉴얼에 넣음 | `img/t17-meta-callback-added.jpg` |
| T18 | 키 등록·Threads 계정 연결(주인님) | ✅ 가입 계정 `buylifemall@naver.com`, 대시보드 「Threads 계정 연결됨 · 토큰 확인됨 · 현재 운영 계정 @buylife.co.kr · 연결 계정 1」 | OpenAI 키는 아직 「키 등록 필요」 → 글 생성 전 등록 필요(매뉴얼: 키 등록 화면에서 Threads 앱 ID/시크릿과 **함께** 넣으라고 안내) | `img/t18-threads-connected.jpg` |
| T19 | 첫 글 생성 | ✅ 콘텐츠 생성 → 주제 직접 입력(「퇴근 후 10분 만에 끝내는 자취방 정리 습관」) → GPT 세부 모델 **GPT-4o-mini**(가장 저렴, 1회) → 글 생성하기 → 약 40초 뒤 5가지 유형(반전형·자책형·부정 명령형·리얼 썰형·논쟁형) + 첫 댓글 멘트·후속 아이디어 | 생성 버튼은 「글 만드는 중…(최대 1분)」으로 바뀜 → 매뉴얼: 1분 기다리기. 기본 모델은 GPT-4.1 | — |
| T20 | 임시저장 | ✅ 반전형 카드 「💾 임시저장하기」 → 대시보드 「실제 작업 진행」에 **검토 대기** 1건 | ⚠️ 발견: 저장 시각이 「오전 9:02」로 표시(실제 한국 시각 18시대) → 시각이 UTC로 보이는 것으로 추정. 운영 원본도 같은 코드일 가능성 → 확인 후 수정 대상 | — |
| T21 | 첫 발행 | ✅ 사이드바 「콘텐츠 보관함」(`?tab=manage`) → 글 카드 「지금 발행」 → 확인 창 「@계정에 지금 포스팅하시겠습니까?」 확인 → 약 20초 「포스팅 중…」 → 「✓ 포스팅완료 · 오후 6:04:13」 + 「게시글 보기」 링크(https://www.threads.com/@buylife.co.kr/post/Deq5KK2GxKM) | 보관함 화면 시각은 정상(오후 6:02:32) — 시각 오류는 **대시보드만** | — |
| T22 | 시각 오류 수정(주인님 지시, 키트+운영 원본) | ✅ 원인: 대시보드(`OperationsDashboard.tsx`)만 서버 컴포넌트라 UTC로 시각 생성 → `timeZone: "Asia/Seoul"` 추가. 키트 배포 `9l0qbl01u`, 운영 v2.06 배포 `cnmn2cb7m`, 두 대시보드 모두 한국 시각 확인 | — | — |
| T23 | 예약 발행 2가지 방식 구현(주인님 지시, 키트 전용) | ✅ 공지: 「Vercel 무료는 하루 1번만 → 1분 확인은 Pro 구독 필요, 무료는 cron-job.org」. **A(Pro)**: `KIT/enable-vercel-cron.ps1`·`.sh`가 vercel.json에 1분 호출 추가 후 재배포(Vercel 예약 호출 기능 유지). **B(무료)**: 키 등록 화면 「⏰ 예약 발행 자동 실행」에 cron-job.org API 키 → 「연결하기」 → 프로그램이 cron-job.org REST API(`PUT /jobs`)로 1분 작업 생성, 주소·`Authorization: Bearer CRON_SECRET` 자동 입력(수강생이 비밀값을 다룰 필요 없음), 「작동 상태 확인」·「연결 해제」. 설치자(처음 가입 회원)만 설정 가능. DB 허용 목록에 `cronjob_org_api_key` 추가(`KIT/schema.sql`, 기존 설치자용 `KIT/upgrade-20261019-cronjob.sql` — 리허설 DB에 실행 「Success」, 이번엔 destructive 경고 안 뜸). 대시보드 예약 칸 안내·사용 매뉴얼 FAQ 독립 모드 문구. 배포 `2wh9aaj5b`, 화면 표시 확인 | 운영 원본은 Vercel Cron 그대로라 미변경 | — |
| T24 | 예약 방식 최종 정리(주인님 지시, 운영 원본과 같은 코드) | ✅ agy 1차안(설정 화면 주기 선택·켜기/끄기, 설치자 1명·`CRON_SECRET`) 폐기 → 운영 v2.07과 같은 **회원 전용 토큰** 방식: 설정은 cron-job.org 키 한 줄, 예약은 포스팅 쪽, 예약 시 자동 켜기·남은 예약 0건 자동 끄기, 보관함 일시정지·재개, 가입한 사람마다 각자 키. A(Vercel Pro) 스크립트는 `TCO_PLATFORM_SCHEDULER=on`도 등록. 보관함 예약 9시간 오류도 함께 수정. 리허설 DB에 `tco_member_scheduler` 생성(`KIT/schema.sql`·`upgrade-20261019-cronjob.sql` 반영). 배포 `hzdohavqd`. 실검수: 키 「등록됨」 → GPT-4o-mini 1회 생성·임시저장 → 20:25 예약(DB `11:25Z` 정상) → 작업 자동 생성(8676638)·켜짐 → 예약 취소 후 약 50초에 자동 꺼짐 | agy가 만든 예전 cron-job.org 작업(`dispatch-scheduled` 1분 호출)은 꺼 둠 — 주인님 cron-job.org 콘솔에서 삭제 가능. 실제 자동 발행은 운영에서 확인(19:34:18) | — |
