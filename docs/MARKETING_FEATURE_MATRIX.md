# 마케팅(홍보) 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 칸의 ○는 코드에서 근거 파일을 찾은 것만 적었다. 근거가 약하거나 일부만 있으면 △, 아직 코드로 확인하지 않은 칸은 「미확인」이다. 실제 운영 화면·실발송 검수 여부는 칸이 아니라 §1·§6에 따로 적었다.

> **마케팅 프로그램을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.** 완성 기준은 [마케팅 완성 기준](MARKETING_COMPLETION_POLICY.md), 작업 목록은 [마케팅 통합 작업표](MARKETING_CONSOLIDATION_TASKS.md).
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) 마케팅(홍보) 4개 + 병합된 1개.
> - 기준 시점: **2026-10-24**, 코드 버전(`lib/version.ts`): 경쟁사 v1.09 · Step Mail v1.28 · 리마인드 v1.28 · 받은편지함 v1.09 · 롱테일 v1.11(이동 안내).
> - 근거: 5개 폴더 현재 코드(Glob·Grep 확인), [마케팅 통합 분석 보고서](analysis-marketing-consolidation-20261023/REPORT.md), 각 폴더 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드.
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 두고, 구현·배포 전에는 표의 칸을 바꾸지 않는다.

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 어느 프로그램에 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음). 공용 기준 코드가 있는 것(텔레그램·SOLAPI·회원 예약 실행·Gemini 이미지)은 사본을 직접 고치지 않고 `node scripts/check-shared-modules.mjs --sync`.
2. **넣을 곳 판단:** 「키워드·검색 분석」이면 경쟁사, 「고객 명부 캠페인 발송」이면 Step Mail, 「예약 일시 기준 발송」이면 리마인드, 「여러 플랫폼 댓글 응대 창구」면 받은편지함. 롱테일(병합 원본)에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고, 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 §6에 「미배포」로.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/MARKETING_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/MARKETING_FEATURE_MATRIX.md --as <세션>`.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전 · 배지) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 | 권한 회원(10-23 보고서) |
|---|---|---|---|---|---|---|---|---|
| 경쟁사 | 키워드·경쟁사 분석 자동화 (`competitor-analysis` v1.09 · FREE) | 키워드·검색 분석 **기준** | 🌱 키워드 확장(씨드 → 연관·관련도 → 롱테일 → 작업 지시문) → 경쟁사 분석(SerpApi 4분류 → 회사 조사 → 분석 → HTML 리포트) | 서버·회원별·30일 / Perplexity(조사)·OpenAI(분석·확장)·Claude(HTML, 선택) — 공급자 역할 고정 / 본인 키 | 확장 → 분석이 한 흐름, 회원별 회사 조사·30일 삭제 운영 적용, FREE | SerpApi 유료 키 필요, 분석 결과 CSV 없음, 정기 모니터링·순위 변동 없음, 네이버는 자연·광고만 | 독립(기준) | 273 |
| Step Mail | 대량 메일발송 Step Mail (`stepmail` v1.28) | 고객 명부 캠페인 발송 **기준** | 엑셀 명부 → 메일 계정·SOLAPI 연결 → AI 초안·이미지 → 차수별 캠페인 예약 → 이메일·문자·카카오 브랜드 메시지 발송 → 기록 | 서버·회원별 / OpenAI(초안)·Gemini(이미지, 선택) / 본인 키·본인 메일·본인 SOLAPI | 차수·반복·계정 번갈아 쓰기·발송제외, 문자「(광고)」·수신거부 자동, 카카오 pfId 없으면 선택지 꺼짐 | 메일 서비스 하루 한도, 이메일 본문 수신거부 자동 삽입 없음, **30일 자동 정리 코드 없음**, 리드 화면 전화번호 수동 입력 없음 | 독립 | 273 |
| 리마인드 | 예약(취소)방지 리마인드 (`booking-reminder` v1.28) | 예약 일시 기준 발송 **기준** | 예약 직접 입력·엑셀 일괄 등록 → 규칙(전·후 분) → 15분마다 이메일·문자·알림톡·친구톡 | 서버·회원별 / AI 없음 / 본인 메일·본인 SOLAPI | 4채널, 규칙별 1회만 발송(고유 제약), 한국 시간 저장(v1.28 수정) | 외부 예약 연동 없음, 일괄 삭제 없음, 문구 AI 도움 없음, 텔레그램은 연결 시험만, **30일 자동 정리 코드 없음** | 독립 | 245 |
| 받은편지함 | AI 댓글·DM 통합 받은편지함 (`comment-inbox` v1.09) | 댓글 응대 통합 창구 | 원래 3개 프로그램의 검토 대기 → 급한 순 → 고쳐서 승인·게시, 7일 응대 그래프, 자동 수집 상태 | 자체 저장 없음(원래 표 읽기) / AI 없음 / 원래 프로그램 연결 | 창 전환 없음, 이중 게시 없음, 권한 두 겹 확인 | 수집·초안은 원래 프로그램 몫, 플랫폼당 100건, 실제 공개 게시 실검수 전 | 독립 | 145 |
| 롱테일 | 롱테일 키워드분석 (`longtail-keyword-expander` v1.11) | 병합 원본 | 이동 안내 화면(`components/MovedNotice.tsx`) | 같은 표를 경쟁사 앱이 읽음 | – | – | 병합 → 경쟁사(2026-10-23, `609e84731`) | – |

공통: 4개 모두 공용 권한 판정(`lib/access.ts` `requireProgramAccess`)·회원 본인 키 구조다. 사용 기록이 거의 없어(보고서: 최대 11건) 사용 추이로는 판단할 수 없다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음(검색으로 찾지 못함) · 「미확인」 코드로 아직 확인하지 않음 · 롱테일은 병합으로 빠져 표에서 제외.

### 2-1. 입력·명부

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| 키워드 직접 입력 | ○ 씨드·분석 키워드 | × | × | × |
| 검색엔진 선택(구글·네이버) | ○ | × | × | × |
| 지역·언어 지정 | ○ 기본 South Korea·ko | × | × | × |
| 고객·예약 직접 입력 | × | △ 엑셀 업로드 위주(수동 추가 화면 미확인) | ○ | × |
| 엑셀 일괄 등록 | × | ○ 이메일 기준 갱신 | ○ 미리보기 → 등록, 500건 | × |
| 엑셀 양식 내려받기 | × | ○ | ○ | × |
| 등록 전 미리보기 | × | 미확인 | ○ DB 안 씀 | × |
| 중복·지난 항목 건너뛰기 | ○ 이미 등록된 키워드 건너뜀(분석 등록) | ○ 파일 안 중복 이메일 제거 | ○ 지난 예약·같은 예약 | × |
| 전화번호 정리(010-1234-5678) | × | ○ | ○ | × |

### 2-2. 수집·분석

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| 검색 결과 수집(SerpApi) | ○ | × | × | × |
| 결과 4분류(자연·광고·질문·지역) | △ 구글 4분류, 네이버는 자연·광고만 | × | × | × |
| 네이버 뉴스·쇼핑·인플루언서 맥락 | ○ 키워드 확장용 | × | × | × |
| 연관 키워드·관련도 점수 | ○ | × | × | × |
| 롱테일 계층 확장 | ○ | × | × | × |
| 작업 지시문(블로그용) | ○ | × | × | × |
| 등장 사이트 회사 조사 | ○ 회원별 30일 안 본인 조사만 재사용 | × | × | × |
| 내 경쟁사 추적 표시 | ○ | × | × | × |
| AI 경쟁 분석 리포트 | ○ | × | × | × |
| HTML 리포트 | ○ 선택(Claude) | × | × | × |
| 확장 키워드 → 분석으로 바로 등록 | ○ 최대 10개 (v1.09) | × | × | × |
| 이전 회차 대비 순위 변동 | × | × | × | × |
| 정기 자동 분석(모니터링) | × | × | × | × |
| 여러 플랫폼 댓글·DM 모아 보기 | × | × | × | ○ 인스타 댓글·DM·쓰레드·유튜브 |
| 급한 순 정렬(DM 남은 시간) | × | × | × | ○ |
| 원래 프로그램 자동 수집 상태 보기 | × | × | × | ○ 보기만 (v1.09) |

### 2-3. 문구·콘텐츠 생성

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| AI 메일 제목·본문 초안 | × | ○ OpenAI | × | × |
| 초안 이미지 자동 생성 | × | ○ Gemini(키 없으면 건너뜀) | × | × |
| 초안 편집기(서식) | × | ○ | × | × |
| 문자 본문·미리보기(바이트·SMS/LMS) | × | ○ | 미확인 | × |
| 「(광고)」·수신거부 자동(문자) | × | ○ | × | × |
| 이메일 본문 수신거부 자동 삽입 | × | × | × | × |
| 메시지 변수 치환({닉네임}·{time} 등) | × | ○ {닉네임} | ○ {time} 한국 시간 | × |
| 메시지 문구 AI 작성 도움 | × | ○ (메일) | × | × |
| 답장 초안 고쳐서 승인 | × | × | × | ○ (초안은 원래 프로그램) |

### 2-4. 발송·게시

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| 이메일 발송(본인 SMTP) | × | ○ | ○ | × |
| 메일 계정 여러 개 번갈아 쓰기 | × | ○ | 미확인 | × |
| 메일 계정 시험 발송 | × | ○ | ○ | × |
| 문자(SMS·LMS) | × | ○ (v1.27) | ○ | × |
| 카카오 알림톡 | × | × (심사 반려로 제외) | ○ | × |
| 카카오 친구톡·브랜드 메시지 | × | ○ 브랜드 메시지, 본인 pfId 있을 때만 (v1.28) | ○ 친구톡 | × |
| 카카오 실패 시 문자 대체 | × | ○ 회원 선택 | 미확인 | × |
| 차수별 발송(1~5차) | × | ○ | × | × |
| 시각·수량·반복(한 번·매일·매주) | × | ○ 매시 정각 단위 | × | × |
| 예약 일시 기준 전·후 규칙 | × | × | ○ 15분마다 | × |
| 수신거부·발송제외 대상 빼기 | × | ○ `stopped`·`customer_completed` | △ 「예약됨(booked)」 상태만 발송, 고객별 수신거부 칸 없음 | × |
| 중복 발송 방지 | × | ○ 캠페인 선점(`last_run_at`) | ○ 규칙×예약 고유 + 선점 | ○ 원래 프로그램과 상태 공유 |
| 발송·게시 기록 | × | ○ `stepmail_send_log` 채널·번호 | ○ `booking_reminder_sends` | ○ 7일 응대 그래프·그날 목록 |
| SNS 댓글·DM 실제 게시 | × | × | × | ○ 원래 게시 함수 사본 |

### 2-5. 예약 실행·알림

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| AIMaster 기본 예약(Vercel cron) | × | ○ 매시 정각 | ○ 15분마다 | × |
| 본인 cron-job.org 실행 방식 | × | ○ | ○ | × |
| 예약 일시정지·재개 | × | ○ | ○ | × |
| 텔레그램 완료·운영 알림 | ○ 키워드 확장 완료 | × | △ 연결·시험 메시지만(예약 알림 발송 코드 못 찾음) | × (승인 링크 버튼은 원래 프로그램) |
| 결과 내려받기 | ○ 확장 결과 CSV | × | × | × |

### 2-6. 공통·보안

| 기능 | 경쟁사 | Step Mail | 리마인드 | 받은편지함 |
|---|---|---|---|---|
| 회원별 저장(`user_id`+RLS) | ○ | ○ | ○ | – 자체 표 없음 |
| 30일 자동 정리(DB 예약 작업) | ○ 매시 07·09분 | × (매뉴얼 문구만) | × (매뉴얼 문구만) | – |
| 화면에서 30일 지난 행 숨김 | ○ `lib/retention.ts` | × | × | – |
| 다른 회원 생성 데이터 재사용 차단 | ○ 옛 전역 회사 표 회원 접근 0 | ○ | ○ | ○ 본인 행만 |
| 키 없을 때 등록 안내 | ○ 모달 | ○ 모달 | ○ 안내 | ○ 원래 프로그램 안내 |
| 이용 안내 화면(`/guide`) | ○ | ○ | ○ | ○ |
| 휴대폰 접는 메뉴(☰, `components/layout/Sidebar.tsx` `md:hidden`) | ○ | ○ | ○ | ○ |
| 자동 시험 명령 | ○ `test:retention`·`test:expansion` 외 | ○ `test:sms` | ○ `test:import` | ○ `npm test` |

## 3. 고유 기능 (한 곳에만 있는 것) — 가져올 때 출처

| 프로그램 | 아직 그곳에만 있는 기능 | 상태 |
|---|---|---|
| 경쟁사 | SerpApi 수집·4분류, 회사 조사, 키워드 확장·관련도·작업 지시문, HTML 리포트, 확장 → 분석 등록 | 기준이라 그대로 |
| Step Mail | 차수·반복 캠페인, 메일 계정 번갈아 쓰기, AI 초안·이미지, 문자「(광고)」·수신거부, 카카오 브랜드 메시지 | 기준이라 그대로 |
| 리마인드 | 예약 기준 전·후 규칙, 알림톡·친구톡, 예약 엑셀 미리보기(한국 시간 해석) | 엑셀 미리보기 방식은 Step Mail 명부에도 후보 |
| 받은편지함 | 3개 댓글 프로그램 통합 대기열, 급한 순, 7일 응대 그래프(공용 `week-reply-panel` 기준) | 기준이라 그대로 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| SerpApi 구글·네이버 검색 결과 수집·분류 | `competitor-analysis/lib/serp/client.ts` | `searchGoogle`·`searchNaver`·`searchSerp` |
| 키워드 확장용 검색 맥락 | `competitor-analysis/lib/serp/context.ts` `fetchSerpContext` | 네이버 뉴스·쇼핑·인플루언서, 구글 PAA·연관 |
| 연관·롱테일·작업 지시문 AI | `competitor-analysis/lib/ai/expansion.ts` | `extractRelatedKeywords`·`extractLongtailExpansions`·`generateWorkMessage` |
| 회사 조사 | `competitor-analysis/lib/ai/research.ts` | Perplexity |
| 경쟁 분석·HTML 리포트 | `competitor-analysis/lib/ai/analysis.ts`·`lib/ai/report.ts` | OpenAI·Claude |
| 30일 기준 시각·화면 숨김 | `competitor-analysis/lib/retention.ts` `retentionCutoff` | DB 정리는 `supabase/migrations/20261016115339_member_owned_generated_data_retention.sql`·`20261023120000_merge_a_longtail_retention.sql` |
| 확장 키워드 → 분석 등록 | `competitor-analysis/lib/actions/expandSeeds.ts` `registerKeywordsForAnalysisAction` | 본인 씨드·30일 안 결과만 |
| CSV 내려받기 | `competitor-analysis/components/expand/CsvButton.tsx` | 분석 결과에도 재사용 후보(IMPROVEMENTS #9) |
| 엑셀 명부 읽기 | `stepmail/lib/leads.ts` `parseLeadsWorkbook` | SheetJS 0.20.3 |
| 예약 엑셀 미리보기·한국 시간 해석 | `booking-reminder/lib/reservationImport.ts` `parseKstDateTime` | 서버 UTC 9시간 어긋남 방지 |
| 캠페인 발송(계정 번갈아·순차) | `stepmail/lib/dispatch.ts` | 네이버 SMTP는 순차 필수(Promise.all 금지) |
| 캠페인 시각·반복 판단 | `stepmail/lib/schedule.ts` | |
| 문자「(광고)」·수신거부 | `stepmail/lib/sms.ts` `buildSmsText` | 정보통신망법 제50조 |
| 카카오 브랜드 메시지 | `stepmail/lib/kakaoBrand.ts` | 본인 pfId 없으면 안 보냄 |
| 리마인드 규칙 실행 | `booking-reminder/lib/booking/reminderDispatch.ts` | `offset_minutes`, 선점 |
| SOLAPI 발송 | 공용 기준 `crm-google-form/lib/solapi/client.ts` → 사본 `stepmail/lib/solapi/client.ts`·`booking-reminder/lib/solapi/client.ts` | 공용 `solapi-client`(미배포 대기 `36d0a4fdc`) |
| 메일 발송(SMTP) | `stepmail/lib/email/transport.ts`·`booking-reminder/lib/email/transport.ts` | 공용 등록은 미확인 |
| 텔레그램 봇 | 공용 기준 `instagram-comment-reply/lib/telegram/client.ts` → 사본 `competitor-analysis/lib/telegram/client.ts`·`booking-reminder/lib/telegram/client.ts` | `telegram-bot-client` |
| 회원 예약 실행 방식 | 공용 `member-scheduler` 사본 `stepmail/lib/schedulerMember/memberScheduler.ts`·`booking-reminder/lib/schedulerMember/memberScheduler.ts` | 프로그램 값은 같은 폴더 `schedulerConfig.ts` |
| Gemini 이미지 | 공용 `gemini-image-client` 사본 `stepmail/lib/ai/geminiImage.ts` | 모델 연동은 ai-image-studio 기준, 프롬프트는 프로그램 고유 |
| 통합 대기열·급한 순 | `comment-inbox/lib/inbox/load.ts` `loadSourceAccess`·`loadInbox` | |
| 승인 게시(두 겹 권한) | `comment-inbox/lib/actions/inbox.ts` `approveInboxItemAction` | 게시 함수 사본 `lib/comments/*Post.ts`·`lib/dmApp/dm/post.ts` |
| 7일 응대 그래프 | 공용 기준 `comment-inbox/components/weekChart/WeekReplyPanel.tsx`·`lib/weekChart/bucket.ts` | `week-reply-panel` |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| A 키워드 분석 | 롱테일 → 경쟁사 | 씨드·연관·롱테일 확장·관련도·작업 지시문·CSV·텔레그램, 30일 정리 | ✅ v1.08(`609e84731`) · 확장 → 분석 등록 v1.09(`2675f8ede`) |
| 독립 확장 ① | Step Mail | 문자 차수 발송(v1.27 `d6619a26d`), 카카오 브랜드 메시지(v1.28 `672643bda`) | ✅ 배포 |
| 독립 확장 ② | 리마인드 | 예약 엑셀 일괄 등록 + 한국 시간 수정(v1.28 `55064fea0`) | ✅ 배포 |
| 독립 | 받은편지함 | 그대로 | – |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다(주인님 정의). 보고서 정정: 경쟁사의 AI는 「3사 선택」이 아니라 공급자마다 역할이 정해져 있다(Perplexity=조사, OpenAI=분석, Claude=HTML).

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 30일 자동 정리(생성 초안·이미지·발송 기록) | Step Mail·리마인드 | 경쟁사 `retention.ts`+DB 예약 작업 방식, 최상위 규칙 | 없음(DB 변경 승인) | 후보 — 대상 범위 주인님 결정 필요 |
| 1차 | 이메일 본문 수신거부 안내 자동 삽입 | Step Mail | `lib/sms.ts` 방식 | 없음 | 후보 |
| 1차 | 분석 결과 CSV | 경쟁사 | `CsvButton.tsx` 재사용(IMPROVEMENTS #9) | 없음 | 후보 |
| 2차 | 문구 AI 작성 도움(리마인드 문구) | 리마인드 | Step Mail `emailPrompts.ts` | 회원 키 1회 | 후보(보고서 §3) |
| 2차 | 예약 일괄 삭제 | 리마인드 | AGENTS 남은 일 | 없음 | 후보 |
| 2차 | 리드 수동 추가·수정에 전화번호 | Step Mail | AGENTS 남은 일 | 없음 | 후보 |
| 2차 | 이전 회차 대비 순위 변동 | 경쟁사 | Phase 2 예정(IMPROVEMENTS #7) | 없음 | 후보 |
| 2차 | 예약 알림 텔레그램 실제 발송 | 리마인드 | 연결 기능만 있음 | 없음 | 후보 — 보고서·비교표 표기와 코드 대조 필요 |
| 3차 | 정기 자동 분석(모니터링) | 경쟁사 | Phase 2 예정 | 회원 SerpApi 반복 호출 | 사전 승인 필요 |
| 3차 | 외부 예약 시스템 연동(네이버 예약 등) | 리마인드 | AGENTS 남은 일 | 미확인 | 후보 |
| 3차 | 플랫폼당 100건 넘는 대기 항목 더 보기 | 받은편지함 | `IMPROVEMENT_BACKLOG.md` | 없음 | 후보 |
| 보류 | 카카오 알림톡 캠페인 | Step Mail | 광고성 내용 심사 반려 | – | 주인님 결정(제외) |

### 미배포 대기 (마케팅)

| 프로그램 | 내용 | 커밋 |
|---|---|---|
| 경쟁사 | 키워드 화면 안내 문구 정정(본인 30일 안 조사만) | `87b773ef2` |
| Step Mail · 리마인드 | 공용 `solapi-client` 사본·시험 문자/메일 라벨 정정 | `36d0a4fdc` |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 4개 프로그램 기능 표, 기준 코드 위치, 병합 A·독립 확장 2건 반영, 30일 정리·이메일 수신거부·텔레그램 차이 발견 기록 | claude-win-dotori [역할: analysis-planning] |
