# PLAN-20261117-01 — AI 업무 워크스페이스 확장 개발 플랜 (주인님 결정용)

- 작성: 2026-11-17 [역할: workspace] Claude(Workspace) `CC-WORKSPACE-01` · Master 취합 `msg_54d6ca32393c`
- 근거 지시(주인님 채팅): 「큰 작업 4개 진행해」(초대·공유+동시 편집, 큰 첨부, 알림·리마인더·주간 요약, 디자인 리뉴얼), 「AIMaster 다른 AI 자동화 프로그램과 연계한 기능 확장을 자세하고 면밀하게 검토」, 「Notion에서 먼저 살펴보고」, 「다른 오피스용 자동화 프로그램에서 유용한 기능」, 「실현 가능한 개발 플랜」.
- 상태: **플랜만** — 코드·DB·새 외부 연결·유료 호출·빌드 0. 아래 「결정 항목」을 받은 뒤 묶음별로 구현.
- 현재 운영: v1.55(`ai-work-workspace-3z2m9m4xy`). **이 플랜과 별개인 미배포 묶음(다음 배포 때 함께)**: `90612778f` 데이터베이스 전체 페이지 여백(`src/litpage/web/features/database/database.css`·`CollectionPage.tsx`) · `8150da176` WS-20261117-08 작은 개선(`views/calendar/CalendarView.view.tsx`·`views/timeline/TimelineView.view.tsx`·`ai/AgentSteps.tsx`·`agents/AgentActivity.tsx`·`database/CollectionPage.tsx`·`database/chrome/ViewTabs.tsx`·`shell/i18n.literals.ko-KR.json`, 모두 `src/litpage/web/features/` 아래). 이 플랜 작성 중 바꾼 제품 파일 없음.
- 조사 근거: 코드·버전표(`AGENTS.md`) 직접 대조 + 보조 조사 2건(저장소 grep 연계 조사, 공개 문서 기반 노션·오피스 기능 조사). 추정은 「(추정)」으로 표시.

## 0. 먼저 바로잡을 것 — 「큰 작업 4개」 중 이미 있는 것
| 항목 | 실제 상태(근거) | 남은 것 |
|---|---|---|
| 초대·공유 | **있음** — v1.28 U13: AIMaster 회원만 초대, 워크스페이스 초대·페이지 공유·접근 요청, 공유 페이지 5초마다 변경 확인·함께 보는 사람 / v1.29 「공유됨」·게스트 승인 | **동시 타이핑 실시간 편집**만 없음(지금은 최대 5초 늦게 반영) |
| 큰 첨부 파일 | **있음** — v1.38 4~50MB 파일 Supabase Storage 저장 | 없음(4MB 이하는 DB 저장 그대로 — 바꿀 이유 낮음) |
| 알림·리마인더 | **있음** — v1.23 회원 본인 cron-job.org 1분 실행, v1.34 자동화 알림 내 메일·카카오톡, v1.36 일정 리마인더 메일·카카오톡 | **주간 요약**(한 주 할 일·발행·받은 업무 정리 메일)만 없음 |
| 디자인 리뉴얼 | 없음(예전 제안 「프로 워크스페이스 스튜디오」만 문서에) | 범위 결정 필요 |
- 원인: 개선 문서(`docs/IMPROVEMENTS.md` §1 표)가 v1.0x 때 그대로라 실제와 달랐음 → 이 플랜 채택 때 그 표도 고침.

## 1. 남은 큰 작업 3개 — 방식 비교

### 1-1. 실시간 동시 편집
| 안 | 내용 | 장점 | 단점·위험 | 비용 | 난이도 |
|---|---|---|---|---|---|
| A. 지금 방식 강화 | 5초 확인 → 바뀐 블록만 즉시 다시 읽기 + 「○○님이 편집 중」 블록 표시 | 서버리스 그대로, 회귀 적음 | 같은 블록 동시 입력은 나중 저장이 이김(지금과 같음) | 없음 | 하 |
| B. 블록 단위 실시간 방송 | Supabase Realtime broadcast로 「블록 바뀜」을 즉시 알림(내용은 기존 저장 경로) | 거의 즉시 반영, 저장 구조 그대로 | Realtime 연결 수·메시지 사용량(공용 Supabase 한도 공유 — 실제 여유는 미확인) | Supabase 요금제 안(초과 시 과금, 추정) | 중 |
| C. 글자 단위 동시 편집(CRDT, Yjs) | 같은 문단을 여럿이 동시에 타이핑 | 노션·구글 문서 수준 | 저장 형식·편집기 대수술, 서버리스에 상시 연결 서버 필요(별도 호스팅 비용) | 월 고정비 발생 | 상 |
- **추천: A → (필요하면) B.** 1인 사업자·소규모 팀 사용 형태에서 C는 비용·위험 대비 효과가 낮음.
- **이름·완료조건 구분(Master 검토 반영)**: A안 이름은 「공유 페이지 변경 빠른 반영」이며 **동시 타이핑·같은 블록 충돌·데이터 손실 문제를 해결하는 기능이 아님**. 완료조건 = 다른 사람이 바꾼 블록이 최대 5초(포커스 복귀 시 즉시) 안에 보이고, 「○○님이 이 블록 편집 중」 표시, 지금 동작(같은 블록은 나중 저장이 이김)보다 나빠지지 않음.

| 기준 | A | B | C |
|---|---|---|---|
| 같은 문단 동시 입력 | 나중 저장이 이김(지금과 같음) — 앞 사람 입력이 덮일 수 있음 | 같음(알림만 빨라짐) | 글자 단위로 합쳐짐 |
| 데이터 손실 대비 | 기존 버전 기록(페이지 기록)으로 되돌리기 | 같음 | CRDT 문서 기록 + 서버 스냅샷 별도 필요 |
| 실패·끊김 | 다음 5초 확인에서 따라잡음 | 방송 끊기면 A 방식으로 자동 후퇴 | 상시 연결 서버 장애 시 편집 불가 위험 |
| 권한 | 기존 페이지 권한 확인 그대로 | 방송 채널 이름을 페이지·권한 확인 뒤에만 구독(남의 페이지 알림 차단 필요) | 문서 서버가 따로 권한 확인 |
| 자원 상한 | 요청 수 = 열린 공유 페이지 × 12회/분(지금과 같음) | Supabase Realtime 동시 연결·메시지 수(요금제 한도 **미확인**) | 상시 서버 1대 이상 |
| 비용 | 없음 | 요금제 안이면 없음(초과 시 과금, **미확인**) | **월 고정비 발생으로 추정**(실제 구성·공식 가격 확인 전) |

### 1-2. 주간 요약
- 방식: 이미 있는 「정시 에이전트 + 내 메일·카카오톡 알림」으로 **템플릿 하나 추가** — 매주 월요일 08시, 지난주 완료·이번 주 마감 할 일, 콘텐츠 캘린더 발행 수, 받은 업무 미처리 건을 한 장 요약.
- AI 요약을 넣으면 회원 본인 AI 키 사용(건당 비용 **미확인** — 실측 전, 모델·글 길이에 따라 다름). AI 없이 숫자만 보내는 기본안을 먼저 만든다.
- 난이도 하 · 운영자 비용 없음.

### 1-3. 디자인 리뉴얼
| 안 | 범위 | 위험 |
|---|---|---|
| A. 가벼운 정리 | 색 토큰·사이드바·홈(빠른 시작 카드)·매뉴얼 첫 화면만 | 낮음 — 편집기·데이터베이스 화면은 그대로 |
| B. 전면 「프로 워크스페이스 스튜디오」 | 전체 화면 색·여백·모눈 배경·상단 칩 | 화면 수백 곳 회귀 위험, 노션식 익숙함이 줄 수 있음 |
- **추천: A.** 편집 화면은 노션과 닮을수록 쓰기 쉬움(오늘 주인님 요청도 「노션처럼」).
- **선택 단계**: 구현 전에 agy 시안 3안(같은 화면 4곳 — 사이드바+홈, 데이터베이스 캘린더/표, 일반 페이지, 받은 업무)을 나란히 비교 → 주인님 선택 → 그 안으로 구현. 시안 전에는 디자인 코드 변경 없음.

## 2. AIMaster 다른 프로그램 연계 (근거: 저장소 grep)
- 연결 방식은 하나 — 공용 표 `public.work_inbox`에 각 프로그램 서버가 `sendToWorkInbox` 사본으로 넣고, 워크스페이스 「받은 업무」가 페이지·표 행·콘텐츠 캘린더로 바꿈(`docs/WORK_INBOX.md`). **새 표·새 키 없이 보내는 쪽에 버튼만 붙이면 됨.**
- 이미 연결(확인): 할 일 플래너·음성 분석·문서 번역(→워크스페이스), 블로그 에이전트·블로그 포스팅·Threads 운영·INSTA·쇼츠 2종·플레이리스트(콘텐츠 캘린더), 경쟁사 분석·블로그 키워드·웹 크롤러(리포트), 워크스페이스→플래너·슬라이드·번역·문서 챗봇.
- 미연결 후보(28개 폴더 grep 0건 확인) 중 추천 순서:

| 순위 | 연계 | 회원 이득 | 워크스페이스 쪽 일 | 보내는 쪽 일(다른 담당) | 난이도 |
|---|---|---|---|---|---|
| 1 | 티스토리·워드프레스/구글 블로그 → 콘텐츠 캘린더 | 블로그 4플랫폼 일정을 한 달력에 | 채널 이름표 2줄(지금은 「기타」로 들어감) | 발행 결과에서 보내기 1곳 | 하 |
| 2 | 주문·매출 리포트·쿠팡 운영 → 할 일·문서 (+주문→볼타 세금계산서 초안) | 품절·송장 지연을 할 일로, 월 매출을 문서로, 계산서 초안까지 | 없음(초안은 이미 있는 「받은 업무 글 → 세금계산서 초안」 재사용, `src/server/receipts.ts` 2026-11-15) | 보내기 버튼 | 중 |
| 3 | 중개사무소 고객관리 → 할 일·일정 → 구글 캘린더 | 상담 일정이 휴대폰 달력까지 | 없음(구글 동기화 이미 운영 확인) | 보내기 + 고객 개인정보 30일 규칙 점검 | 중 |
| 4 | 유튜브·쇼츠 떡상 분석, 상품소싱 → 기획·소싱 보드(표 행) | 분석 결과가 흩어지지 않고 보드에서 진행 관리 | 없음 | 보내기 버튼 | 하 |
| 5 | 댓글·DM 통합 받은편지함 → 할 일 | 급한 문의 누락 방지, 현황판에 바로 | 없음 | 보내기 버튼 | 중 |
- 그 밖 후보(낮은 우선): 스마트스토어·11번가 등록 결과, 부동산 분석 리포트·매물 알림(알림은 회원 PC 확장에 있어 경로 추가 필요, 추정), 예약 리마인드·구글폼 CRM, Step Mail, eBook·마크다운·글쓰기 에디터 양방향, 쇼핑몰 빌더(볼타 공용화 필요).
- **원칙**: 보내는 프로그램 폴더는 그 담당 세션 몫 → 워크스페이스 쪽(이름표·받기)만 제가 하고, 보내기 버튼은 Master가 각 담당에 배정. 회원 본인 데이터를 본인 받은 업무로 옮기는 것이라 본인 키·계정 규칙 위반 없음.

## 3. 노션·다른 오피스 제품에서 가져올 기능 (공개 문서 기준, 이미 있는 것 제외)
- 이미 있어서 뺀 것: 보기 11종(지도·폼·대시보드 포함), 자동화·버튼·웹훅·메일/카톡 알림, 관계·롤업·수식·하위 항목·스프린트, AI 자동 채우기·리서치·에이전트·MCP, 사이트·번역·버전 기록, 회의록, 공개 폼, 영수증·세금계산서 사진 읽기.

| 추천 | 기능 | 출처 | 1인 사업자 효용 | 난이도·근거 |
|---|---|---|---|---|
| 1 | **예약 링크** — 빈 시간을 공개해 손님이 직접 예약, 겹치면 막음 | Notion Calendar | 상 | 중 — 구글 캘린더 동기화 + 공개 폼 재사용 |
| 2 | **시간 기록 타이머** — 작업별 시작·정지, 주간 시간표 | ClickUp | 상(외주 정산) | 하 — 날짜·숫자 속성 + 버튼, 세금계산서와 연결 가능 |
| 3 | **회의록 끝나면 에이전트 실행** — 할 일 자동 생성·후속 메일 초안 | Notion 3.x | 상 | 하 — 이벤트 실행에 트리거 1개 |
| 4 | **셀 AI 채우기 + 출처 링크** — 표 칸마다 웹 조사 결과와 출처 | Google Sheets | 상(마케터 조사표) | 중 — 자동 채우기 보강 |
| 5 | **손님 포털** — 손님이 로그인 없이 자기 건 진행 상태만 보기 | Airtable 인터페이스 | 상 | 중 — 공개 페이지 + 행 단위 비밀 주소 |
| 6 | **폼 조건부 질문** | Notion Forms | 중 | 하(현재 일부 코드 있음, 동작 미확인) |
| 7 | **메일 받은편지함 + AI 분류·답장 초안** | Notion Mail | 상 | 상 — 회원 본인 Gmail OAuth 앱 필요(공용 앱 금지 규칙) |
| 8 | **간단 전자결재**(올림→승인/반려→이력) | 플로우·두레이 | 중(직원 1~5명) | 중 — 상태 속성 + 자동화 + 받은 업무 |
- 그 밖 후보: 사이트 개인 도메인, AI 주간 진행 보고서(1-2와 합침), 목표(OKR) 진행률, 업무량 보기, 여러 표 통합 대시보드 위젯, 근태 기록, 화이트보드.
- 출처 URL: 노션 릴리스·도움말(Calendar 예약·Forms·Mail·Sites), Google Docs 도움말·Workspace 블로그(Fill with Gemini 출처 표시), ClickUp·monday·Asana·플로우·두레이 기능 페이지 — 원문 확인 정도는 보조 조사 기록대로(일부는 검색 요약만, 추정 포함).

## 4. 구현 묶음과 순서(추천)
| 묶음 | 내용 | 예상 커밋 규모 | 배포 |
|---|---|---|---|
| E1 (작고 효과 큼) | 주간 요약 템플릿(1-2) · 회의록→에이전트 트리거(3-3) · 시간 기록 타이머 템플릿(3-2) · 폼 조건부 질문 확인·보완(3-6) · 블로그 채널 이름표(2-1 워크스페이스 쪽) · 개선 문서 §1 표 바로잡기 | 소~중 | v1.4 규칙대로 묶음 1회 |
| E2 | 예약 링크(3-1) · 손님 포털(3-5) · 실시간 편집 A안(1-1) | 중 | 묶음 1회 |
| E3 | 셀 AI 출처(3-4) · 전자결재(3-8) · 디자인 A안(1-3) | 중 | 묶음 1회 |
| E4 (큰 결정 필요) | 메일 받은편지함(3-7, 회원 본인 Gmail 앱) · 실시간 B안 | 중~상 | 별도 |
| 연계 | 2절 1~5 — 보내는 쪽은 Master가 각 담당 배정, 워크스페이스는 이름표·받기만 | 담당별 소 | 각 프로그램 묶음 |

- 검증(묶음마다): 로컬 시험 DB 점유 확인 → 관련 시험 추가(빨강→초록) → 전체 시험·tsc → 배포 뒤 엣지 화면·시험 계정 실사용. 회귀 위험이 큰 실시간·디자인은 독립 검토 1회.
- 마이그레이션·복구: E1~E3는 템플릿·속성·화면 위주라 새 표 거의 없음(예약 링크·손님 포털은 「비밀 주소」 표 1개씩 추가 예상 — 추가만, 되돌릴 땐 기능 끄기). 운영 DB 적용은 묶음별 승인.
- 비용: 운영자 비용 — Vercel 빌드 묶음당 1회, 실시간 B안 채택 시 Supabase Realtime 사용량(요금제 여유 미확인). 회원 부담 — AI 요약·셀 AI·메일 분류는 회원 본인 키(건당 비용 **미확인**, 실측 전). 개발 중 유료 호출은 시험 계정 키로 최저가 모델 최소 횟수, 실행 직전 보고.

## 5-0. ✅ 주인님 결정(2026-11-17 채팅 「추천안대로 E1부터 진행해」)
- 1 실시간 편집 = **A**(5초 확인 강화) · 2 디자인 = **B 전면 리뉴얼**(같은 날 정정: 「agy에게 디자인 시안 3가지 받아서 보고 정하도록」 — Master 경유 agy 시안 3안 → 주인님 선택 뒤 구현, E1과 별도) · 3 첫 묶음 = **E1** · 4 노션·오피스 추천 8개 = **전부 채택**(같은 날 「노션·오피스 추천 8개 중 넣을 것: 전부」) — 묶음 순서대로 E1(3-2·3-3·3-6) → E2(3-1·3-5) → E3(3-4·3-8) → E4(3-7, 회원 본인 Gmail 앱) · 5 연계 순서는 Master가 담당 일정과 함께 정함(워크스페이스 쪽 2-1 채널 이름표는 E1).

## 5. 🙋 주인님 결정 항목(진짜 미정만)
1. **실시간 편집 수준**: A(5초 확인 강화, 추천) / B(블록 실시간 방송, Supabase 사용량 확인 필요) / C(글자 단위, 월 고정비).
2. **디자인 리뉴얼 범위**: A(가벼운 정리, 추천) / B(전면) / 보류.
3. **첫 구현 묶음**: E1부터(추천) / 다른 순서.
4. **노션·오피스 기능 채택**: 3절 1~8 중 넣을 것(전부 / 일부 / 보류). 특히 7 메일 받은편지함은 회원이 본인 Gmail 앱을 만들어야 해 설정 부담이 큼.
5. **연계 1~5 순서**: 추천 순서대로 Master에 배정 요청할지(보내는 쪽 프로그램 담당 일정 영향).

## 6. 하지 않은 것
코드·DB·빌드·배포·새 외부 연결·유료 호출 0. 다른 프로그램 폴더 미수정.

## 7. E2 구현 계획 — 정확한 경로·외부 자원 영향 (Master `msg_a8502f6e2cc1`, 구현 전 제출)
E1 독립 검수(QA17-003)와 별개로 계획만. 디자인 3안 선택 전이라 **화면 구조(레이아웃·색) 변경 없음** — 새 화면은 기존 공개 폼·공개 페이지 모양을 재사용.

### 7-1. 실시간 편집 A안 「공유 페이지 변경 빠른 반영」(동시 타이핑·데이터 손실 해결 아님)
- 현재(확인): `src/litpage/web/lib/store/sync.ts` `pollOnce` — 공유 페이지 5초·비공유 60초, 숨은 탭은 5초 뒤 재시도. 커서 위치(`currentPresenceData`)는 `collabPoll`로 이미 다른 사람에게 전달되지만 **편집기에는 그리지 않음**(위쪽 얼굴 묶음 `presence/Facepile.tsx`만).
- 바꿀 것: (1) `sync.ts` — 창 포커스·탭 다시 보임(`focus`·`visibilitychange`) 때 즉시 한 번 확인(`schedulePoll(0)`), (2) 편집기 블록 옆에 「○○님 편집 중」 작은 표시 — 새 파일 `src/litpage/web/features/presence/BlockEditingBadge.tsx` + 블록 렌더 연결 1줄(정확한 연결 지점은 구현 첫 단계에서 확정해 보고).
- 외부 자원: 없음. 요청 수 = 지금과 같음(포커스 복귀 때 1회 추가). 서버·DB 변경 없음.
- 완료조건: 다른 브라우저에서 바꾼 블록이 포커스 복귀 즉시·아니면 5초 안에 보임, 같은 블록을 다른 사람이 커서로 잡고 있으면 표시, 같은 블록 동시 입력은 지금처럼 나중 저장이 이김(악화 없음). 시험: 폴링 즉시 실행 단위 시험 + 표시 컴포넌트 렌더 시험.

### 7-2. 예약 링크(노션 캘린더 예약 페이지형)
- 흐름: 회원이 「예약 받기」 설정(요일·시간대·한 칸 길이·준비 시간·안내 문구) → 공개 주소 `/book/<비밀번호형 토큰>` → 손님이 빈 칸 선택·이름·연락처 → 회원 구글 캘린더에 일정 생성 + 워크스페이스 「받은 업무」(또는 표 행) + 회원에게 앱 알림(원하면 내 메일·카카오톡, E1 경로 재사용).
- 빈 시간 계산: 회원 본인 구글 캘린더 일정 읽기(`events.list`) — **지금 받는 권한 `calendar.events`로 가능, 새 권한·재동의 불필요**(`src/server/googleCalendar.ts` 11줄). 구글 앱은 회원 본인 앱(공용 앱 아님, 기존 규칙 그대로).
- 경로(예정): 새 `src/server/booking.ts`(설정·빈 칸 계산·예약 생성), 새 `src/app/book/[...path]/page.tsx`(공개 화면, 공개 폼 `src/app/form`·`src/server/publicForms.ts` 패턴 재사용), 설정 화면은 `src/app/calendar-sync/` 안 한 칸, 시험 `tests/integration/booking.test.ts`.
- 저장: 워크스페이스 저장소(`src/litpage/server/db.ts`)에 새 표 2개(예약 설정·예약 기록) — 기존 `aww_*` 표처럼 첫 사용 때 `CREATE TABLE IF NOT EXISTS`. **운영 적용 = 배포 뒤 첫 사용 때 표 생성(운영 DB 구조 추가)** → 묶음 배포 승인 때 함께 명시.
- 외부 자원·위험: 공개 주소라 남용 대비 — 회원당 하루 예약 상한(공개 폼 하루 한도 `FORM_PER_DAY` 방식), 같은 칸 중복 예약 막기(생성 직전 다시 읽고 조건부 저장), 손님 개인정보(이름·연락처)는 회원 소유·30일 보관 규칙(예외 회원 제외). 구글 API 호출은 회원 키 사용량(무료 한도 안, 추정). 운영자 비용 없음.
- 완료조건: 빈 칸 계산(겹치는 일정·준비 시간·요일·시간대) 단위 시험, 동시 2예약 같은 칸 → 1건만, 토큰 틀리면 404, 하루 상한, 구글 실패 시 예약 확정 안 함.

### 7-3. 손님 포털(손님이 자기 건 진행 상태만 보기)
- 흐름: 데이터베이스 행 메뉴 「손님에게 진행 상황 공유」 → 그 행 전용 비밀 주소 `/portal/<토큰>` → 로그인 없이 그 행의 **회원이 고른 속성만**(예: 상태·예정일·메모) 읽기 전용으로 보여 줌. 회원이 언제든 끄기·주소 새로 만들기.
- 경로(예정): 새 `src/server/portal.ts`, 새 `src/app/portal/[...path]/page.tsx`(공개 페이지 `src/app/public` 패턴 재사용), 행 메뉴 연결 1곳(`src/litpage/web/features/database/RowPageExtras.tsx` 근처 — 첫 단계 확정), 시험 `tests/integration/portal.test.ts`.
- 저장: 워크스페이스 저장소 새 표 1개(행·토큰 해시·보일 속성·만료) — 7-2와 같은 방식.
- 외부 자원·위험: 외부 호출 없음. 보안: 토큰은 해시로 저장, 행·속성 범위만 노출(다른 행·페이지 본문·댓글 안 보임), 검색 노출 막기(`noindex`, 로그인 뒤 화면 규칙), 주소 남용 대비 요청 속도 제한. 운영자 비용 없음.
- 완료조건: 고른 속성만 보임, 다른 행 토큰으로 접근 불가, 끈 뒤 404, 행이 지워지면 404, noindex 머리글.

### 7-4. 순서·배포
- 순서: 7-1(외부 자원 0) → 7-3(외부 호출 0) → 7-2(구글 연동). 각 단계 커밋·시험 후 Master 접수, 독립 검수는 QA 배정.
- 배포: v1.4대로 E1·작은 수정과 묶음. 7-2·7-3은 운영 저장소에 새 표가 생기므로 그 묶음 배포 때 「운영 DB 구조 추가」를 승인 항목으로 명시.
- 하지 않을 것: 디자인 구조 변경, 새 외부 서비스·공용 OAuth 앱, 유료 호출.

### 7-1 정정과 결과 (2026-11-17, Master `msg_bc05dda4e776`) · 커밋 `3f32871e2d3804aab61df837a10105aaa9f06fd1`
- **정정 — 기존 기능 조사가 틀렸음**: 7-1 처음 계획의 「커서 위치는 받지만 편집기에는 그리지 않음」은 잘못. `src/litpage/web/features/presence/PresenceLayer.tsx`(`features/page/PageView.tsx` 174줄에서 사용)가 이미 다른 사람의 커서·이름 깃발·선택 영역·**편집 중 블록 옆 얼굴**을 그림. 서버 `src/server/collabPoll.ts`는 15초(`PRESENCE_MS`) 지난 위치 정보를 지우고 돌려주지 않음. → 새 `BlockEditingBadge.tsx`·`Block.tsx` 연결·`presence.ts` 판정 함수·`ui.ts` 시각 기록은 **중복이라 철회**(다른 담당도 새로 만들지 말 것).
- 실제 구현(축소 범위): `lib/store/sync.ts` — 창 포커스·탭이 다시 보일 때 기존 `pollOnce`를 바로 한 번(`pollNow`, 새 폴링 없음), 요청이 나가 있는 동안 또 불리면 겹쳐 보내지 않고 끝난 뒤 한 번만(`polling`·`pollAgain`), 리스너는 `connectRealtime`(호출처 `lib/store/session.ts` 60)에서 한 번만 등록·`disconnectRealtime`(`session.ts` 88, `features/shell/accounts.tsx` 64·84, `Workspace.tsx` 160)에서 해제, 숨은 탭은 확인 안 함. 기존 얼굴 말풍선 「○○ is editing」을 「○○ · 편집 중 — 잠금이 아니어서 같은 블록을 함께 입력하면 나중에 저장한 내용이 남습니다」로(번역 사전 1줄).
- 시험 `tests/integration/presenceE2.test.ts` 5개: 수정 전 `sync.ts`로 **5 실패** → 수정 후 5 통과(포커스 즉시 확인 / 복귀 여러 번 → 요청 중 겹침 0·끝난 뒤 1회 / 숨은 탭 0·다시 보이면 1 / 연결 두 번에도 리스너 하나·해제 뒤 0 / 등록·해제 짝). 전체 31파일 250/250, tsc 0. 서버·DB·외부 자원 변경 0.
- 남은 것: 같은 블록 동시 입력은 지금처럼 나중 저장이 이김(잠금·병합 없음 — A안 범위 밖).

### 7-5. E2 7-2(예약 링크)·7-3(손님 포털) 보완 계획 (2026-11-17, Master `msg_f7cb5e8b75de`) — 코드 전
**확인한 기존 코드**: `src/server/googleCalendar.ts` — 회원 본인 구글 앱·`calendar.events` 범위, 쓰기 `upsertGoogleEvent`(161, 아이디 있으면 PUT·없으면 POST), 읽기 `listGoogleEvents`(178, **워크스페이스가 보낸 일정은 빼고**, 한국 시간 +9 고정 변환). DB `src/litpage/server/db.ts` 253 `tx()`(BEGIN/COMMIT)·303 `FOR UPDATE` 사용 사례 있음. 공개 폼 `src/server/publicForms.ts`(하루 300·분당 한도, 내림 표 `aww_public_takedowns`, noindex). 보관 예외 `src/server/retentionExempt.ts`(`profiles.retention_exempt`).

#### A. 예약 링크(7-2)
1. **회원 설정(처음 3단계)**: ① 구글 캘린더 연결(이미 연결돼 있으면 건너뜀 — 「캘린더 연결」 화면 재사용) ② 예약 받을 요일·시간대·한 칸 길이(기본 30분)·앞뒤 준비 시간(기본 0)·시간대(기본 Asia/Seoul)·하루 최대 예약 수(기본 10) ③ 「예약 주소 만들기」 → 주소 복사. **매일 조작 0번**(예약은 손님이 함, 회원은 알림만 받음). 동의 추가 0번(새 구글 권한 없음).
2. **빈 칸 계산**: `listGoogleEvents`는 우리가 보낸 일정을 빼므로 그대로 못 씀 → 새 읽기 함수 `listBusy(token, from, to)`(같은 `events.list`, 빼지 않음, `transparency: transparent`·취소 일정 제외) + DB의 확정·처리 중 예약을 합쳐 바쁜 구간으로. 각 구간에 앞뒤 준비 시간을 더해 **범위가 겹치면** 그 칸 제외(같은 시작 시각만 비교하지 않음). 시각 계산은 회원 시간대 기준 `Intl.DateTimeFormat`로 — 한국(서머타임 없음)은 그대로, 서머타임 있는 시간대는 그 날의 실제 오프셋으로 칸을 만들고 존재하지 않는/두 번 있는 시각 칸은 제외. 손님 화면은 회원 시간대로 표시 + 손님 브라우저 시간대 병기.
3. **겹침 동시성(두 worker)**: 제출 때 `tx()` 안에서 ① 회원별 예약 설정 행을 `SELECT … FOR UPDATE`로 잠가 같은 회원 예약을 한 줄로 세움 ② DB의 확정·처리 중 예약과 (준비 시간 포함) **범위 겹침** 검사 ③ 하루 최대 수 검사 ④ 통과하면 예약 행을 `처리 중`으로 넣고 커밋 → 칸이 잡힘. 다른 worker는 잠금이 풀린 뒤 같은 검사를 다시 해 겹치면 거절. (Postgres 범위 배제 제약은 확장 설치가 필요해 쓰지 않음.)
4. **구글 생성 — 멱등·사후 조회·자동 재생성 금지**: 잠금 밖에서 ① 그 구간을 `listBusy`로 한 번 더 확인(회원이 방금 넣은 일정) — 겹치면 `실패`로 바꾸고 칸 해제 ② 예약 id로 만든 **고정 구글 일정 id**(base32hex 규칙 소문자 a~v·0~9)로 `POST`(10초 제한). 결과: 성공 → `확정`; 409(같은 id 이미 있음) → 이미 만들어진 것으로 보고 `확정`; 4xx(권한·연결 끊김) → `실패`·칸 해제·회원 앱 알림; **타임아웃·5xx(생겼는지 모름) → `확인 필요`로 두고 칸은 계속 잡음**. `확인 필요`는 같은 고정 id로 `GET`만 해서(1분·5분·30분, 최대 3번) 있으면 `확정`, 404면 `실패`·칸 해제, 끝까지 모르면 `확인 필요` 유지 + 회원에게 「캘린더를 확인해 주세요」 알림. **새 id로 다시 만들지 않음**(중복 일정 방지). 손님에게는 `확정`일 때만 「예약 완료」, 그 전엔 「접수됨 — 확정되면 회원이 연락」.
5. **외부 호출 수**: 손님이 예약 화면을 열 때 `events.list` 1번(같은 회원 60초 캐시), 제출 1건당 `events.list` 1 + `POST` 1(+ 확인 필요일 때 `GET` 최대 3). 모두 회원 본인 구글 앱 한도(무료 범위 안, 추정).
6. **남용·개인정보**: 화면 열기 IP당 분당 30, 제출 IP당 시간당 5·회원당 하루 최대 수, 손님 입력은 이름·연락처·메모(500자)만, 저장 위치는 회원 워크스페이스 「받은 업무」 행 + 예약 기록. **예약 종료 30일 뒤 손님 개인정보(이름·연락처·메모) 삭제**(행은 「손님 정보 삭제됨」으로 남김), `retention_exempt` 회원 제외. 구글 일정 본문에는 이름만(연락처 미기록). 공개 주소 noindex·`X-Robots-Tag`. 회원 이용 기간 만료·관리자 내림이면 주소 닫힘(공개 폼과 같은 방식).
7. **토큰 폐기**: 주소는 32바이트 난수, DB엔 해시만. 「주소 끄기」 즉시 404, 「새 주소」는 옛 해시 삭제. 구글 연결 해제 시 예약 주소 자동 꺼짐.

#### B. 손님 포털(7-3)
1. **회원 설정(2단계)**: 행 메뉴 「손님에게 진행 상황 공유」 → 보일 속성 고르기(기본: 제목·상태·날짜) → 주소 복사. 매일 조작 0번. 끄기·새 주소 1클릭.
2. **보일 수 있는 속성만**: 제목·텍스트·숫자·선택·다중 선택·상태·날짜·체크박스. **관계·롤업·사람·만든 사람·수정한 사람·수식·파일·이메일·전화**는 고를 수 없게 함(다른 행 제목·회원 이름/이메일·첨부·계산으로 숨은 값이 새는 것 방지). 본문·댓글·다른 행 접근 없음.
3. **매 요청 재확인**: 행 살아 있음·포털 켜짐·만료 전(기본 90일, 회원이 연장)·**공유를 만든 회원이 지금도 그 행을 읽을 수 있음**(`canRead`) — 하나라도 아니면 404. 회원이 권한을 잃거나 행을 지우면 바로 닫힘. 속성이 지워지거나 종류가 위 금지 목록으로 바뀌면 그 속성은 표시 안 함.
4. **토큰·검색·남용**: 32바이트 난수·해시 저장·끄기 즉시 404·새 주소로 교체, noindex·`X-Robots-Tag`, IP당 분당 30. 접속 기록은 남기지 않음(개인정보 최소화).
5. **보관**: 포털 설정은 회원 설정(생성 콘텐츠 아님)이라 30일 삭제 대상이 아님. 단 만료·끈 포털 기록은 30일 뒤 삭제.

#### C. 공통 — 저장 구조·운영 변경·검증
- 새 표 3개(워크스페이스 저장소 `aww_` 접두): `aww_booking_pages`(회원·토큰 해시·설정·켬), `aww_bookings`(예약·상태·고정 구글 id·손님 정보·시각), `aww_portals`(행·토큰 해시·속성 목록·만료·켬). 서버만 접근(공개 API는 토큰 경로뿐).
- **첫 사용 때 `CREATE TABLE IF NOT EXISTS`도 운영 구조 변경**이므로: 배포 묶음 승인 항목에 「운영 워크스페이스 저장소 표 3개 추가」를 따로 적고, 승인 전에는 기능 스위치(서버 환경 변수 없이 코드 상수 `BOOKING_ENABLED=false`)로 화면·표 생성을 막아 둠. 승인 후 스위치를 켜는 배포에서 표가 생김.
- 복구: 기능 끄기 = 스위치 끔(표·데이터 그대로, 공개 주소 404). 잘못 만든 구글 일정은 회원 캘린더에서 지우면 다음 확인 때 `실패` 처리.
- 시험(구현 때, 실DB·구글 모의): 겹침(준비 시간 포함·경계 맞닿음 허용) / 두 worker 동시 제출 → 1건만 / 서머타임 시간대 칸 생성 / 구글 409=확정·4xx=해제·타임아웃=확인 필요→GET 있음/없음·재생성 0 / 하루 최대·IP 한도 / 30일 손님 정보 삭제·예외 회원 / 포털 금지 속성 미노출·권한 철회·행 삭제·끔·만료 404·noindex.
- 구현 순서(승인 후): 7-3 포털(외부 호출 0) → 7-2 예약. 예상 범위: 새 서버 파일 2(`src/server/portal.ts`·`booking.ts`), 새 공개 화면 2(`src/app/portal`·`src/app/book`), 설정·행 메뉴 연결 각 1곳, 시험 2파일, `googleCalendar.ts`에 `listBusy`·고정 id 생성·`GET` 함수 추가. 비용: 빌드는 묶음 배포 때만, 유료 호출 0.

### 7-6. 예약 링크(7-2) 계획 정정 (2026-11-17, Master `msg_f0616e6ab766`) — 코드 전, 7-5 A를 아래로 대체
**공식 근거(2026-11-17 확인)**: developers.google.com/workspace/calendar/api/v3/reference/events/insert — 직접 정한 일정 id는 base32hex(소문자 a~v·숫자 0~9) 5~1024자·캘린더 안에서 유일, 그러나 「생성 때 id 충돌을 항상 잡아낸다고 보장하지 않음」, 멱등·시간 초과 재시도 안내 없음, `extendedProperties.private`는 이 캘린더 사본에만 있는 속성. /guides/errors — 409 `duplicate`는 「같은 id가 이미 있음」뿐(같은 일정이라는 뜻 아님, 새 id를 만들거나 update 하라고 안내), 400 재시도 금지, 401 토큰 새로 받기, 403 `rateLimitExceeded`·`userRateLimitExceeded`·429·500은 지수 대기 후 재시도, 403 `quotaExceeded`는 재시도 안내 없음(관리자 한도), 404는 대기 후 재시도 안내, 410 `deleted`는 「이미 지워짐」.

**1. 고정 일정 id와 확정 조건(409 = 성공 아님)**
- id = `bk` + 예약 UUID의 16진수 32자(모두 a~v·0~9 안). 일정에 `extendedProperties.private.awwBookingId = 예약 id`.
- **확정 조건**: POST 성공 응답, 또는 그 id로 `GET`한 일정이 ① `extendedProperties.private.awwBookingId`가 이 예약 id ② 시작·끝 시각이 예약과 같음 ③ `status`가 `cancelled` 아님 ④ 기본 캘린더(`primary`) — 넷 다 맞을 때만.
- 409를 받으면 위 `GET` 검사로만 판단. 다른 일정(속성·시간 다름)이나 취소된 일정이면 **확정하지 않음**(fail closed) → `확인 필요` + 회원 알림, 새 id로 다시 만들지 않음.

**2. 오류 분류(일괄 해제 금지)**
| 결과 | 만들어졌나 | 처리 |
|---|---|---|
| 200 | 예 | `확정` |
| 400 | 아니오 | `실패`·칸 해제·재시도 0(요청 오류) |
| 401 | 아니오 | 토큰 한 번 새로 받아 같은 id로 1회 재시도, 또 401이면 `실패`·칸 해제·회원에게 「구글 다시 연결」 |
| 403 `rateLimitExceeded`/`userRateLimitExceeded`, 429 | 아니오(거절) | 칸 유지·`처리 중`, 같은 id로 지수 대기 재시도(최대 3) — 끝까지 거절이면 `실패`·칸 해제·알림 |
| 403 `quotaExceeded`·기타 403 | 아니오 | `실패`·칸 해제·알림(재시도 안 함) |
| 404(캘린더 없음) | 아니오 | `실패`·칸 해제·알림 |
| 409 `duplicate` | 모름 | 1의 `GET` 검사 |
| 408·500·502·503·연결 끊김·10초 초과 | **모름** | `확인 필요`·**칸 유지**, 아래 3 |
- 「모름」 뒤 `GET`이 한 번 404여도 **즉시 해제하지 않음**(공식 문서상 충돌·반영 지연 보장 없음).

**3. 확인 작업 — 기존 예약 작업기만 사용(새 예약 등록 0)**
- 기존 `litpage/server/scheduler.ts`(DB `scheduled_jobs`, `scheduleJob(kind, key, runAt)` 키 단위 덮어쓰기, `runDueJobs`가 **행 삭제 성공한 한 곳만 실행**(127줄 `claim`)으로 동시 실행 막음, 재시작 뒤 기한 지난 작업 이어서, 실패 시 지수 대기 최대 5회)에 작업 종류 `booking.reconcile`(키 `booking:<예약 id>`)을 넣고 `src/server/memberJobs.ts` `MEMBER_JOB_KINDS`에 회원 작업으로 등록.
- 실행 주체: **회원 본인 cron-job.org가 부르는 `/api/cron/member`**(1분, 회원 본인 작업만) — 운영 하루 1회 호출(`/api/cron/jobs`, `operatorJobFilter`)은 회원 예약을 처리하지 않음(지침 `docs/SCHEDULER_POLICY.md`). 회원이 cron-job.org를 연결하지 않았으면 확인은 **회원이 예약 목록 화면을 열 때** 한 번 돎 — **확인 시각은 보장되지 않으며** 그때까지 `확인 필요`가 남을 수 있음(설정 화면에 안내).
- 순서: 1분·5분·30분 뒤 같은 id `GET`만(1의 확정 조건). **「모름」 뒤에는 자동으로 다시 POST하지 않음**(Master `msg_7197b56a1015` 정정 — GET 404가 여러 번이어도 재전송 0, 생겼는지 모르는 요청을 다시 보내지 않는 기존 원칙 유지). 30분 확인까지 확정 안 되면 **최종 미확인** = `확인 필요` 유지·칸 유지·회원 알림 「캘린더에서 확인해 주세요」, 예약 목록에서 회원이 「캘린더에 있음(확정)」/「없음(칸 풀기)」를 직접 고름. 예약 시각이 지나면 칸 유지 의미가 없으므로 자동 종료(상태 `만료`).
- 손님 화면: `확정`이면 「예약 완료」, 그 외에는 「접수됨 — 확정되면 연락드립니다」.

**4. 빈 칸 계산과 겹침(정정)**
- `events.list`는 `singleEvents=true`(반복 일정 펼침)·`pageToken`으로 **끝 페이지까지**, `timeMin/timeMax`는 보여 줄 기간만. 종일 일정(`start.date`)은 회원 시간대의 그 날 전체를 바쁨으로, `transparency: transparent`(한가함 표시)·`cancelled`는 제외.
- 준비 시간은 **바쁜 구간과 후보 칸 양쪽**에 적용(후보 [시작−앞 준비, 끝+뒤 준비]가 바쁜 구간과 겹치면 제외, 맞닿음은 허용).
- DB 잠금(회원 설정 행 `FOR UPDATE`) 안의 범위 겹침 검사는 **우리 예약끼리만** 원자적. 회원이 구글에 직접 넣는 일정과는 원자적이지 않음 — POST 직전 그 구간 `events.list` 재확인으로 창을 줄이지만, 그 몇 초 사이에 들어온 일정과는 겹칠 수 있음(남는 위험으로 명시, 회원에게 알림으로 보임).
- 외부 호출 수(예약 1건): 화면 열기 `events.list` 1~N페이지(60초 캐시) + 제출 재확인 1~N + POST 1(+401 재시도 1·한도 재시도 최대 3) + 확인 `GET` 최대 3(「모름」 뒤 다시 POST 0).

**5. 보관(정정 — 연장 없음)**
- 기존 규칙(`profiles.retention_exempt` 제외, **만든 날로부터 30일**, 예: `src/server/receipts.ts` 347)을 그대로: 예약 기록·손님 개인정보는 **예약을 받은 날로부터 30일** 뒤 삭제. 「예약 끝난 뒤 30일」로 늘리지 않음.
- 그래서 30일 안에 만나는 일정만 받도록 **예약 가능 기간을 최대 21일 앞까지**로 제한(받은 날+30일 > 만나는 날). 늘리려면 관리자 지정 프로그램 보관 예외(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8) 승인이 필요 — 이번 계획에는 넣지 않음.
- 정리 실행: 운영 하루 1회 `/api/cron/jobs`가 이미 부르는 운영 정리 묶음에 `runBookingRetention` 한 줄 추가(기존 `runReceiptRetention`과 같은 방식, 새 예약 등록 0).

**6. 첫 사용 표 생성·스위치**: 7-5 C와 같음(표 `aww_booking_pages`·`aww_bookings`, 서버·화면 스위치 기본 꺼짐, 켜는 배포 = 운영 구조 추가 승인). 손님 정보는 이름·연락처·메모만, 구글 일정 본문에는 이름만.

**7. 회원 설정·조작**: 처음 3단계(캘린더 연결·시간 설정·주소 만들기) + cron-job.org 연결 권장(없어도 동작하되 확인이 늦음). 매일 조작 0번, `확인 필요`가 생긴 날만 1번(확정/칸 풀기).

**8. 시험(구현 때, 구글 모의)**: 오류 표의 각 줄 / 409 같은 일정=확정·다른 일정·취소=확인 필요 / 모름→GET 404 여러 번이어도 해제·재전송 안 됨 / 최종 미확인 상태·회원 선택 / 두 worker가 같은 확인 작업 → 1번만 / 재시작 뒤 기한 지난 확인 실행 / 페이지 넘김·종일·반복·준비 시간 양쪽 / 21일 제한 / 30일 정리·예외 회원.

### 7-7. 예약 링크(7-2) 구현 준비 — 현재 코드 대조 차이 (2026-11-17, Master `msg_c34e47266f97`) — 코드 전, 7-6을 그대로 쓰고 아래만 바뀜
**대조 결과(중복 제외)**
- **7-3 손님 포털은 이미 코드에 있음**(`src/server/portal.ts`, `src/app/portal/[...path]`, 스위치 `PORTAL_ENABLED=false`·`setPortalEnabledForTests`, 만든 회원 이용 기간 `tokenOwnerAllowed`, IP당 분당 30 `hit()`, `tx()`+`FOR UPDATE`). → 7-5 C의 「새 표 3개」는 이제 **예약 2개(`aww_booking_pages`·`aww_bookings`)만** 새로 생김. 예약은 포털 방식을 그대로 복사(새 패턴 0): `BOOKING_ENABLED=false`·`setBookingEnabledForTests`, 스위치가 꺼져 있으면 모든 진입점이 DB 접속·표 생성 전에 404.
- **`booking-reminder`(별도 프로그램)와 중복 아님**: 그쪽은 이미 잡힌 예약에 문자·메일 리마인드 발송, 손님이 고르는 공개 예약 페이지는 없음. 연결은 이번 범위 밖(아이디어로만).
- **이미 있어 재사용**: 예약 작업기 `litpage/server/scheduler.ts`(`scheduleJob`·`cancelJob`·`runDueJobs` claim), 회원 작업 `/api/cron/member`, 운영 정리 `/api/cron/jobs`(49줄 `runReceiptRetention` 옆에 한 줄), 보관 예외 `retentionExempt.ts`, 공개 폼 한도 방식 `publicForms.ts`(`hit`), 회원 앱 `validToken`·`getGoogleApp`·`upsertGoogleEvent`.
- **고쳐야 하는 기존 함수(새로 만들지 않음)**: `memberJobs.ts`의 `MEMBER_JOB_KINDS`에 `'booking.reconcile': 'booking:'` + `jobOwner`에 이 종류의 `payload.ownerId` 분기(없으면 회원 cron이 이 작업을 못 집음). `listGoogleEvents`(178)는 우리 일정을 빼므로 손대지 않고 옆에 `listBusy`·`getEventById`·`insertEventWithId` 추가.
- **확인 필요(첫 단계에서 확정)**: 「받은 업무」에 행을 넣는 전용 함수가 `workInbox.ts`에 따로 export돼 있지 않음 → 첫 단계에서 기존 받은 업무가 행을 만드는 경로를 찾아 그대로 부름(새 함수 만들지 않음). 회원 앱 알림은 E1 경로(`notifications`·`sendExternalNotify`) 재사용.

**구현 첫 단계(서버만, 스위치 꺼짐) — 정확 경로**
- 새: `src/server/booking.ts`(설정·빈 칸 계산·제출·확인 작업·30일 정리), `tests/integration/booking.test.ts`.
- 수정: `src/server/googleCalendar.ts`(함수 3개 추가), `src/server/memberJobs.ts`(종류·소유자 1곳씩), `src/app/api/cron/jobs/route.ts`(정리 한 줄).
- 둘째 단계(화면): 새 `src/app/book/[...path]/page.tsx`(포털 화면 패턴), `src/app/calendar-sync/` 안 설정 한 칸. 서버·화면을 나누면 파일 점유가 겹치지 않음.

**경계·정책(7-6 그대로, 요약)**: DB 2표는 서버만 접근·토큰 해시 / 예약 생성은 회원 설정 행 `FOR UPDATE` 잠금 안에서 범위 겹침(준비 시간 양쪽, 맞닿음 허용)·하루 최대 검사 / 구글은 고정 id `bk`+UUID 32자, 409=GET 4조건 일치만 확정, 「모름」은 `확인 필요`·칸 유지·GET만 1·5·30분·재전송 0·회원 직접 선택 / 시간대는 회원 시간대 `Intl`, 서머타임 없는·두 번 있는 시각 제외, 손님 시간대 병기 / 보관은 받은 날 30일(예외 회원 제외), 그래서 예약은 21일 앞까지 / 계정 전환: 공개 화면은 토큰 주인 기준이라 세션 무관, 회원 설정 화면은 기존 기대 계정 헤더(409) 방식 그대로.

**켜기 승인 조건**: 주인님·Master가 「운영 워크스페이스 저장소 표 2개 추가」를 묶음 배포 승인 항목으로 승인 → Mac 독립 검수 통과 → 스위치를 켜는 배포 1회. 켜기 전 운영 DDL·외부 구글 호출 0.

**모의 시험 완료 조건(구현 때)**: 7-6 §8 전부 + 스위치 꺼짐이면 표 생성·DB 접속 0(포털 시험과 같은 방식) + `MEMBER_JOB_KINDS`/`jobOwner`로 회원 cron이 자기 확인 작업만 집음(다른 회원 0) + 전체 tsc·전체 시험 통과. 구글은 `setGcalFetch` 모의만, 실호출 0.

### 7-8. 예약 링크 2단계 연결 경로 — 읽기 조사 결과 (2026-11-17, Master `msg_06c13fb6a12f`) — 코드 전, 1단계 5파일(`5ed9bc2ec`)은 QA024 동안 동결
**1단계는 서버만이고 아무 입구에도 연결돼 있지 않음 — 완성 아님.** 아래는 2단계에서 고칠 정확한 경로와 그대로 쓸 기존 함수.

| 연결 | 고칠 경로 | 그대로 쓰는 기존 것 | 근거 |
|---|---|---|---|
| 회원 처리기 5개(`bookingGet/Save/Off/List/Resolve`) | `src/server/runtime.ts` 처리기 묶음에 `...bookingHandlers` 한 줄(포털 `portalHandlers`와 같은 자리) | `/api/rpc/[name]` — JSON만·`sec-fetch-site` 다른 사이트 403·`checkProgramAccessApi` 인가·기대 계정 헤더 409(`EXPECTED_ACCOUNT_HEADER`)·`trackMemberJobs` | `route.ts` 24~44·60 |
| 확인 작업 처리기를 회원 cron에서 | **수정 불필요** — `/api/cron/member`가 이미 `@/server/runtime`을 불러오므로 위 한 줄로 `registerJobHandler("booking.reconcile")`도 등록됨 | `runDueJobs(…, memberJobFilter(userId))`, `tokenOwnerAllowed` | `cron/member/route.ts` 8·33 |
| 회원 cron이 너무 일찍 꺼지지 않게 | **수정 불필요** — `countRemainingWork` → `countMemberJobs`가 `MEMBER_JOB_KINDS`(1단계에 `booking.reconcile` 추가)를 셈 | `stopMemberSchedulerIfIdle` | `schedulerConfig.ts` 24 |
| 손님 제출·빈 칸 보기 | `src/server/publicPages.ts` `handlePublicRpc`에 예약 명령 2개(`getBookingSlots`·`submitBooking`) 분기 한 곳 — 공개 폼 `FORM_RPCS` 분기와 같은 방식 | `/api/public/[name]` — JSON만·10KB 제한·`sec-fetch-site` 403·IP(`x-forwarded-for` 첫 값)·`X-Robots-Tag: noindex`·IP당 분당 120 / `bookingSlots`·`bookingSubmit`의 자체 IP 한도(30/분·5/시간) | `api/public/[name]/route.ts`, `publicPages.ts` 106~118 |
| 손님 화면 | 새 `src/app/book/[...path]/page.tsx`(포털 화면 그대로: `force-dynamic`·`robots noindex/nocache`·`referrer no-referrer`·꺼짐/조건 불일치 404) + 제출용 작은 클라이언트 컴포넌트(같은 폴더, `/api/public/submitBooking` 호출) | `portal/[...path]/page.tsx` 패턴 | |
| 회원 설정·예약 목록 | `src/app/calendar-sync/page.tsx`(서버가 확인한 `user.id` 전달) + `CalendarBoard.tsx` 안 「📅 예약 받기」 카드 한 개(새 파일로 분리하고 연결 한 줄 권장) | 기대 계정 헤더 방식(영수증 `boundReceiptRpc`·키 화면 `CalendarConnStatus`와 같게 `rpc(name, body, { expectedAccount })`), 「확인 필요」 줄에 「캘린더에 있음/없음」 버튼 | 지금 `CalendarBoard`는 기대 계정 없이 `rpc()`를 씀 — 예약 카드부터는 기대 계정 적용 |

**공개 출처·CSRF·스팸**: 공개 입구는 쿠키·로그인을 쓰지 않아 CSRF로 회원 권한을 빌릴 수 없음. 다른 사이트 브라우저 요청은 `sec-fetch-site`로 막고, 서버 직접 호출은 토큰(32바이트 난수, 해시 저장)+IP 한도(공개 입구 120/분, 예약 화면 30/분·제출 5/시간)+회원 하루 최대 수로 막음. 신고 기능은 이번 범위에 넣지 않음(필요하면 `reportPublicPage` 방식 재사용 제안).

**회원 cron-job.org — 승인 범위와 새 외부 행동을 구분(권장안 A)**
- 지금 cron-job.org를 켜는 공용 함수 `ensureMemberSchedulerRunning`(공용 사본 `src/lib/schedulerMember/memberScheduler.ts`, 직접 수정 금지)은 작업이 없으면 **새 회원 토큰을 만들고 회원 cron-job.org 계정에 새 작업을 등록**한다. 지금 이 함수는 회원 본인 요청 뒤(`/api/rpc` `afterRpc`)와 키 저장(`/api/keys`)에서만 불린다.
- **A(권장, 새 외부 행동 0)**: 손님 제출에서는 cron-job.org를 부르지 않는다. 확인 작업은 ① 회원 cron-job.org가 이미 켜져 있으면 1분 주기로 처리, ② 아니면 회원이 예약 목록을 열 때(`bookingList`가 자기 작업만 `runDueJobs`) 처리 — 7-6 3의 「확인 시각 보장 안 됨」 그대로. 회원이 예약 받기를 켤 때 설정 카드에 「cron-job.org 연결 권장」을 보이고, 연결은 기존 키 화면 흐름(회원 본인 요청)으로만.
- B(별도 승인 필요): 손님 제출 뒤 `ensureMemberSchedulerRunning`을 불러 켬 — 모르는 사람의 요청이 회원 외부 계정에 작업을 만들고(cron-job.org 하루 호출 한도 100 사용) 새 회원 토큰까지 만들 수 있어 **새 외부 행동**. 채택하려면 주인님 승인 + 「이미 있는 작업만 켜기」 전용 경로가 필요(공용 사본 수정이라 기준 코드 절차).
- 실패 정책(A): 확인 작업 처리기 실패는 작업기 기본 재시도(1·4·9·16분, 최대 5회) — 처리기는 GET만 하므로 재시도해도 POST 0.

**2단계 파일 범위(배정 시 점유)**: 수정 `src/server/runtime.ts`(1줄)·`src/server/publicPages.ts`(분기 1곳)·`src/app/calendar-sync/page.tsx`·`CalendarBoard.tsx`(카드 연결), 새 `src/app/book/[...path]/page.tsx`·제출 컴포넌트·설정 카드 컴포넌트, 시험(공개 입구 403/415/404·IP 한도·기대 계정 409·설정 카드 DOM). 1단계 5파일은 QA024 반례가 오면 그 수정이 먼저. 스위치는 계속 꺼짐 — 켜기는 별도 승인.

### 7-9. 배선 단계(스위치 3개 OFF 그대로) 보존 시험 계획 (2026-11-17, Master `msg_13adaa555ac5`) — 코드 전, 정리만
대상 배선(7-8): `runtime.ts` `...bookingHandlers` · `publicPages.ts` `getBookingSlots`·`submitBooking` 분기 · 새 `src/app/book/[...path]/page.tsx`. 스위치 `BOOKING_ENABLED`·`BOOKING_UI.enabled`·`BOOKING_FORM_UI.enabled`는 모두 false로 둔 채 배선만 한다.
**새 시험 파일 1개(제안)**: `tests/integration/bookingWiring.test.ts`(격리 시험 DB, 구글 `setGcalFetch` 모의, 받은 업무·토큰 모의). 기존 `publicPages.test.ts`·`publicForms.test.ts`·`rpcAccountGuard.test.ts`·`portal.test.ts`는 손대지 않고 회귀로 함께 실행.

| 보존할 것 | 확인 방법(시험 이름 요지) |
|---|---|
| 불러와도 DB 0 | `@/server/runtime`·`api/public` 경로를 불러온 뒤 `to_regclass('aww_booking_pages'·'aww_bookings')` null, `scheduled_jobs`에 `booking:` 0, 구글 fetch 0 |
| OFF면 모든 입구 404 | `runRpc('bookingGet'…'bookingResolve')` 404, `handlePublicRpc('getBookingSlots'·'submitBooking')` 404(본문 `NOT_FOUND`), 공개 페이지 `notFound()` — 그 뒤에도 표 0·fetch 0 |
| 공개 입구 형식 검사 | `POST /api/public/submitBooking` 경로 함수를 직접 불러: JSON 아님 415, `sec-fetch-site: cross-site` 403, 10KB 초과 413 — 모두 처리기 호출 전(표 0). 응답 머리글 `X-Robots-Tag: noindex`·`Cache-Control: private, no-store`(404 포함) |
| 요청 한도 | 공개 입구 IP당 분당 120(`aww-public-ip`) 다음에 예약 자체 한도(보기 30/분·제출 5/시간)가 겹쳐 적용 — 121번째 429, 같은 IP 제출 6번째 오류 |
| 토큰 노출 | 제출 토큰은 JSON 본문으로만(쿼리 문자열 0), 공개 페이지는 경로 토큰을 받아 서버에서만 판정·응답·로그에 원문 0(`console.*` 감시로 토큰·손님 입력 0), DB에는 해시만 |
| 캐시·색인·참조 | 공개 페이지 `dynamic="force-dynamic"`·`fetchCache="force-no-store"`·`revalidate=0`, metadata `robots { index:false, follow:false, nocache:true }`·`referrer: "no-referrer"` (포털 페이지와 같은 값인지 비교) |
| 회원 입구 | `/api/rpc/booking*`는 기존 인가·기대 계정 409 그대로(`rpcAccountGuard` 방식 1개씩: 다른 계정 헤더 → 409, 처리기 호출 0) |
| 허용 출처 | 공개 입구는 쿠키를 읽지 않음(로그인 세션과 무관) — 제출 처리기가 `createClient()`·쿠키를 부르지 않는지 모의로 확인 |

켜기는 이 배선 시험이 모두 통과하고 Mac 독립 검수 뒤, 주인님 표 2개 추가 승인과 함께 별도 배포(세 스위치를 한 번에). 지금은 문서만.

### 7-10. E3(3-4 셀 AI 출처 · 3-8 간단 전자결재) 현재 코드 대조와 첫 구현 단위 (2026-11-17, Master `msg_6f5ab29b8506`, WS-20261117-24) — 코드 전
**이미 있는 것(다시 만들지 않음)**
- 표 칸 AI 자동 채우기: `aiAutofill`(`src/litpage/server/api/modules/ai.ts` → `service.ts` `runAutofill`, 화면 `web/features/ai/autofill.ts`·`autofillUi.tsx`) — 요약·핵심·번역·직접 지시. **웹 검색·출처 없음**(행 내용만 보고 씀).
- 웹 검색+출처 기록: AI 채팅 한 턴에만(`service.ts` `searchPlanFor`·`runWebSearchTool`·`cite`, 회원이 고른 검색 도구 네이버·카카오·Tavily·Perplexity·SerpAPI 또는 기본). AI 블록 `search`는 **워크스페이스 안 검색**일 뿐.
- 전자결재 재료: 템플릿 카탈로그(`src/litpage/server/content/catalog.ts`, E1 「작업 시간 기록」 방식), 상태·사람·날짜·글 속성(`content/spec.ts` `buildProperty`), 자동화(`shared/automation/types.ts`: `property_edited` 조건 → `notify` 「사람 속성」에게, 회원 본인 메일·카톡 `external`), 페이지 버전 기록(`snapshots`, `api/handlers.ts` 441).
- 없는 것: ① 템플릿에 자동화를 함께 넣는 칸(`TemplateDef`에 없음) ② 상태 그룹 규칙에 「승인·반려」 단어(`spec.ts` 254 — 지금은 「승인」이 「시작 전」 그룹으로 감) ③ 결재자만 승인할 수 있는 권한(편집 권한이면 누구나 상태 변경) ④ 자동 채우기의 웹 검색·출처 저장.

**첫 구현 단위 E3-1: 「간단 전자결재」 템플릿(AI 0·새 DB 0·외부 발송 0)**
- 경로: `src/litpage/server/content/catalog.ts`(템플릿 1개 추가, E1 「작업 시간 기록」 옆) · `src/litpage/server/content/spec.ts` 254줄 그룹 규칙에 `승인`·`반려` → 완료 그룹, `승인 요청` → 진행 그룹(기존 단어 판정 유지) · 새 시험 `tests/integration/approvalTemplate.test.ts`.
- 내용: 결재 건(제목)·상태(작성 중 → 승인 요청 → 승인 / 반려)·요청자(사람)·결재자(사람)·금액(원)·결재 의견(글)·결재일(날짜), 보기 「상태별」 보드·「전체」 표, 예시 1행(「(예시) 사무용품 구매」). 설명에 「알림은 이 표의 ⚡ 자동화에서 '상태가 승인 요청이 되면 결재자에게 알림'을 켜세요」 안내(템플릿 자동 생성은 E3-2).
- 권한: 기존 데이터베이스 권한 그대로 — 편집 권한이 있으면 누구나 상태를 바꿀 수 있음(간단 결재의 한계로 설명에 명시, 결재자 전용 승인은 E3-3 후보).
- 이력: 기존 페이지 버전 기록 + 결재 의견·결재일 칸. 새 이력 저장 0.
- 실패·계정 전환: 기존 템플릿 갤러리 「사용」 흐름 그대로(새 RPC·새 입구 0) — 실패 시 기존 오류 처리.
- 완료 조건(시험): 템플릿이 목록에 1개 추가 · 펼친 표의 속성 7개·상태 선택지 4개·예시 1행 · 상태 그룹: 「승인」「반려」 완료·「승인 요청」 진행·「작성 중」 시작 전 · **회귀**: 기존 템플릿의 상태 그룹(완료·진행·읽는 중 등) 결과 그대로 · tsc. 배포는 다음 묶음.

**다음 단위(각각 따로 배정)**
- E3-2 템플릿에 자동화 함께 만들기(`TemplateDef`에 자동화 정의 + 템플릿 사용 때 자동화 생성, 상태→승인 요청 시 결재자 알림·승인/반려 시 요청자 알림) — 자동화 생성 경로 조사부터.
- E3-3 결재자만 승인(버튼 자동화 또는 속성 편집 권한) — 권한 설계 필요.
- E3-4 셀 AI 출처: `aiAutofill`에 「웹에서 찾기」 선택 + 채팅의 검색 도구 재사용 + 출처를 URL 속성(또는 행 댓글)에 저장 — 실제 확인에 유료 AI·검색 호출이 필요해 비용 승인과 함께.

### 7-11. E3-2 「템플릿을 쓸 때 알림 자동화도 함께」 읽기 조사 (2026-11-17, Master `msg_f42da8e3b8a0`) — 코드 전, E3-1(`e297153b8`) QA030 동안 동결
**지금 구조(근거)**
- 템플릿 사용: 숨은 갤러리 공간(`seed.ts` `ensureTemplateGallery`, `TEMPLATE_GALLERY_VERSION = 7`)에 한 번 만들어 두고, `api/modules/templates.ts`의 `getTemplate`(새 페이지)·`applyTemplateToDatabase`(빈 표에 적용)가 `copyTreeOps`(115줄)로 블록·표·보기만 복사 → **자동화는 복사되지 않음**(이 파일에 automation 0). 표 정의는 `...rest`로 그대로 복사돼 속성 번호(`aSta`·`aApr`·`aReq`)가 유지됨.
- 갤러리는 새 템플릿 id가 없으면 다시 만든다(`TEMPLATES.every(cur.pages[t.id])` 실패 → 옛 루트 은퇴·재생성) — E3-1 배포 때 버전 숫자를 올리지 않아도 결재 템플릿이 들어감(기존 동작).
- 자동화 만들기: `api/modules/automations.ts` `handlers.saveAutomation(ctx, { collectionId, automation })` — 편집 권한 확인(`assertCanEdit`)·조건/동작 정리(`cleanTrigger`·`cleanActions`·`assertTargets`)·검사(`validateAutomation`)·저장(`saveAutomationRecord`)·감사 기록까지 이미 한 곳. 알림 동작 `notify`(대상 `{type:'property', property}` = 사람 속성), `external` 비우면 앱 안 알림만(메일·카톡 발송 0).

**최소 구현 단위(새 권한 0·외부 발송 0·새 DB 0)**
- `content/catalog.ts`: `TemplateDef`에 선택 칸 `automations?: AutomationDraft[]`(이름·`trigger`·`actions`, 속성은 템플릿 속성 번호로) — 결재 템플릿에 2개: ① 상태가 「승인 요청」이 되면 → 결재자(`aApr`)에게 알림 ② 상태가 「승인」 또는 「반려」가 되면 → 요청자(`aReq`)에게 알림. `external` 없음.
- `api/modules/templates.ts`: `getTemplate`·`applyTemplateToDatabase`에서 복사가 커밋된 **뒤**, 그 템플릿에 `automations`가 있으면 새 표(collection) id로 **기존 `saveAutomation` 처리기를 같은 ctx로 호출**(권한·검사·감사 재사용, 새 경로 0). 자동화 만들기가 실패해도 템플릿 복사는 그대로 두고 응답에 `automationWarnings`(사유 문구)만 — 다시 만들기는 회원이 ⚡ 자동화에서.
- 화면 변경 0(응답의 recordMap에 자동화 기록을 더하면 기존 자동화 화면이 그대로 보여 줌). 결재 템플릿 설명 문구는 「알림 자동화 2개가 함께 만들어집니다(끌 수 있음)」로 바꿈.
- 정확 파일: 수정 `src/litpage/server/content/catalog.ts`·`src/litpage/server/api/modules/templates.ts`, 새 시험 `tests/integration/approvalAutomation.test.ts`. `automations.ts`·엔진·스키마 무수정.
- 완료 조건(시험, 격리 DB): 결재 템플릿 `getTemplate` → 새 표에 자동화 2개(활성, 만든 사람=사용 회원, 대상 속성 번호 일치) / 다른 템플릿은 자동화 0 / 행 상태를 「승인 요청」으로 바꾸면 결재자에게 앱 알림 1·「승인」이면 요청자에게 1(외부 발송 0) / 편집 권한 없는 회원은 기존처럼 템플릿 사용 자체가 거절 / 자동화 저장 실패를 흉내 내면 템플릿은 남고 경고만 / `applyTemplateToDatabase` 경로도 같은 결과 · tsc.
- 남는 한계(그대로 명시): 결재자 전용 승인 아님(E3-3), 알림은 앱 안만.

#### 7-11 보완 (Master `msg_ed9b8236045a`) — 읽기 확인 2점 + 예시값 안전
**① 경고가 화면에 보이는가 — 지금은 안 보임(추가 범위 필요)**
- 호출부 3곳 모두 응답의 다른 값은 무시: `web/features/templates/api.ts` `addTemplate`(127, 성공 toast 「Template added…」)·`applyTemplate`(140, 성공 toast 「Template applied」), `web/features/templates/dbTemplates.tsx` `applyTemplateToDatabase`(15, toast 없음). 온보딩 `OnboardingPage.tsx` 118은 결과를 버림(시작 템플릿 고르기 — 결재 템플릿은 고르기 목록이 아니면 해당 없음, 구현 때 목록 확인).
- 최소 추가(새 UI 흐름 0): 세 함수의 응답 타입에 `automationWarnings?: string[]`를 더하고, 값이 있으면 기존 `useUI.getState().toast()`로 **한 번** 「알림 자동화 n개를 만들지 못했습니다 — ⚡ 자동화에서 직접 추가해 주세요」(번역 사전 1줄). 정확 경로: `src/litpage/web/features/templates/api.ts`·`src/litpage/web/features/templates/dbTemplates.tsx`(+ ko 번역 사전 1줄). 화면 시험은 기존 DOM 시험 방식으로 경고 toast 1회만.
**② 중복 생성 경계**
- `getTemplate`은 호출마다 **새 페이지·새 표**를 만드는 기존 동작(응답을 잃고 다시 눌러도 표가 하나 더 생기는 것은 지금도 같음) → 자동화는 항상 그 새 표에만 붙어 **표 하나당 최대 2개**. `applyTemplateToDatabase`는 이미 행이 있는 표면 거절(285줄 「empty database」)이라 같은 표에 두 번 적용 불가 — 예시 행이 들어가므로 두 번째 호출은 거절.
- 그래도 만들기 직전에 그 표의 살아 있는 자동화 중 **같은 이름**이 있으면 건너뜀(재사용) — 템플릿 적용 1회당 그 표에 결재 알림 2개를 넘지 않는 근거. 일부만 실패하면 만든 것은 두고 못 만든 이름만 경고 → 복구 완료 조건 = 회원이 ⚡ 자동화에서 같은 이름으로 추가하거나, 그대로 두어도 템플릿·표는 정상.
**③ 예시값이 다른 사람에게 알림을 보내지 않는 근거**
- 예시 행의 요청자·결재자는 비어 있음(E3-1 `e297153b8`) → 알림 대상 계산 `shared/automation/runtime.ts` 526 `notifyTargets`가 사람 속성 값만 모으므로 0명. 예시 행은 자동화보다 **먼저** 복사되어 생성 시점 실행도 없음(복사 커밋 뒤 자동화 생성).
- 엔진 `automations/engine.ts` 246 `sendNotifications`: 그 페이지를 열 수 있는 사람에게만 앱 알림(`blockRole !== 'none'`), 외부 발송은 `external`이 있을 때만·자동화를 만든 회원 본인에게만 → 템플릿 자동화는 `external` 비움 = 메일·카톡 0.
- 안전 보강 제안(E3-2에 포함): 예시 행 상태를 「승인 요청」 → 「작성 중」으로(회원이 예시 행에 결재자를 넣고 상태를 다시 「승인 요청」으로 바꿀 때만 알림 — 사람이 직접 한 행동). E3-1 QA030 결과 뒤 반영.
- 권한 경로: `getTemplate`(멤버·상위 페이지 편집) → `saveAutomation`(`assertCanEdit` 새 표, `assertTargets`) 그대로.

**E3-2 확정 파일(QA030 통과 뒤)**: 서버 `content/catalog.ts`·`api/modules/templates.ts`, 화면 `web/features/templates/api.ts`·`web/features/templates/dbTemplates.tsx`·ko 번역 사전, 시험 새 `tests/integration/approvalAutomation.test.ts`(서버) + 경고 toast DOM 시험 1개.

### 7-12. E3-3 「결재자만 승인」 읽기 조사 (2026-11-17, Master `msg_789119a0ee0d`) — 코드 전, E3-2(`4ca85f4b2`) QA033 동안 동결
**이미 있는 서버 정책(새로 만들지 않음)**
- **속성별 접근 규칙** `schema[p].property_permissions = { default_access, overrides[] }`(`shared/database/propertyAccess.ts`): 예외 종류에 **「이 표의 사람 속성에 선택된 사람」**(`type: 'collection_property_permission'`, `property_info: { property_id, type: 'person' | 'created_by' }`)이 이미 있음 → 「상태」 칸을 `결재자`(aApr)로 선택된 사람만 쓰게 할 수 있음.
- 서버 검사: `server/dbaccess.ts` `propertyValueProblem`(authz.ts TxGuard에 연결) — 값을 바꾸면 그 사람의 속성 권한을 계산해 아니면 거절. 적용 경로: 화면 저장(`api/handlers.ts` 360 `client: true`)·공개 API(`publicapi/routes.ts` 101 `client: true`)·AI 비서 편집(`ai/changes.ts` `client: true`)·버튼(속성 편집 단계는 화면이 계획해 `client: true`로 보냄, 서버 단계는 알림·웹훅뿐 `automations.ts` 421) → **UI 숨기기와 무관하게 서버에서 막힘**.
- **넘어서는 경우(규칙상 정상, 그대로 밝힘)**: ① 그 데이터베이스 **전체 권한(editor)** 가진 사람은 속성 규칙을 넘음(`dbaccess.ts` `roleAtLeast(dbRole,'editor') → null`) — 템플릿을 쓴 회원은 자기 표의 전체 권한자 ② 같은 요청에서 새로 만든 표 ③ 자동화 엔진의 쓰기(`client`·`userInitiated` 아님)는 기존 행 값 검사를 안 받지만 자동화를 만들려면 전체 권한이 필요(`engine.ts` `automationEditProblem` editor) — ①과 같은 사람이라 새 구멍 아님.
- 읽기 쪽은 `propaccess.ts`가 권한 없는 값을 가림(화면은 읽기 전용으로 보임).

**규칙은 「값」이 아니라 「칸」 단위** → 한 칸(상태)에서 「요청자는 승인 요청만, 결재자는 승인·반려만」은 불가. 그래서 최소 구조 변경이 필요:
- 안 A(권장): 「상태」(작성 중·승인 요청·승인·반려)를 **결재자만**(default `reader` + 예외 결재자 `read_and_write`), 대신 요청자가 올리는 칸 **「결재 올림」(체크박스, 페이지 만든 사람만)** 추가 → 자동화 ① 「결재 올림」 체크 → 결재자 알림(E3-2 ①의 조건만 바꿈), ② 상태 승인·반려 → 요청자 알림(그대로).
- 안 B: 「결재자」 지정 자체를 올림으로 보고(결재자 칸 변경 → 알림), 상태는 결재자만.
- **결정 필요(주인님/Master)**: 「결재자」 칸을 누가 정하나 — (가) 페이지 만든 사람(요청자) → 자기 자신을 결재자로 넣으면 스스로 승인 가능(규칙으로 못 막음) (나) 전체 권한자만 → 결재자 배정은 관리자가, 1~5명 팀엔 번거로움. 권장: (가) + 템플릿 설명에 「자기 자신을 결재자로 넣지 마세요(막히지는 않음)」 + 결재 기록에 남는 사람 표시로 확인.

**최소 구현 범위(새 권한 엔진·새 API 0, 템플릿 정의만)**
- `content/spec.ts`: `DbPropSpec`에 `property_permissions?` 통과(지금 `buildProperty`는 name·type·options 등만 복사 — 1~2줄).
- `content/catalog.ts`: 결재 템플릿 「상태」·「결재 올림」·「결재자」 규칙 + 자동화 ① 조건 변경 + 설명 문구(전체 권한자는 넘을 수 있음·자기 결재 가능 여부).
- 시험 새 `tests/integration/approvalPermission.test.ts`(격리 DB): 같은 표에 **일반 편집(read_and_write) 회원 3명**(요청자·결재자·제3자) 공유 → `saveTransactions`(client) 경로로: 제3자·요청자가 상태 변경 = 거절, 결재자 = 허용, 요청자 「결재 올림」 = 허용·결재자 알림 1, 전체 권한자 = 허용(넘음 명시), 공개 API 경로도 같은 거절, 버튼 속성 편집(client) 거절, 기존 E3-1·E3-2 시험 회귀.
- 남는 한계: 전체 권한자 넘음, (가)면 자기 결재 가능, 앱 알림만.

#### 7-12 Master 기본 결정 (msg_7cb36f10c967) — 구현은 QA033 마감 뒤 정확 범위 확정 시 배정
- 구조 = **안 A**: 「상태」는 **선택된 결재자만**(default `reader` + 예외 결재자 `read_and_write`), 요청자는 **「결재 올림」 체크칸만**(페이지 만든 사람 예외), 자동화 ①은 올림 체크로.
- **결재자 지정 = (나) 표 전체 권한자만**(결재자 칸 default `reader`, 예외 없음 → editor만 씀). 요청자 셀프 지정·셀프 승인 허용안(가)은 **채택 안 함**.
- 구분해서 밝힐 것: 전체 권한자는 기존처럼 규칙을 넘음(기존 ACL 공용 함수 `propertyRoleFor`·`dbaccess.ts` 재사용, 새 권한 엔진 0) — 「결재자 전용」은 일반 편집자 기준.
- 보완 필요(구현 때): ① 템플릿 spec의 `property_permissions`를 그대로 복사하지 말고 **알려진 모양만 통과**(default_access 값 목록·override 종류·`property_info.property_id`가 같은 표 속성 번호·person/created_by 타입·role 값 목록 검사, 그 밖은 버림 — 규칙이 넓어지거나 빠지지 않게) ② 속성 번호 매핑 근거: 템플릿 표는 `copyTreeOps`가 schema를 그대로 복사(키 유지)하므로 `aApr`·`aSta`·`aSub` 참조가 복사 뒤에도 같은 표를 가리킴 — 시험으로 복사본 규칙의 `property_id`가 새 표 schema에 있는지 확인.

### 7-13. E3-3 결재자 전용 승인 구현 결과 (2026-11-17, Master `msg_de5df14ea733`) — 코드 `c5b26d81c`, 미배포
- 범위: `content/spec.ts`(템플릿 전용 기호 키 `TEMPLATE_PROPERTY_ACCESS` + 검사 `templatePropertyAccess` + 실패 `TemplatePropertyAccessError`), `content/catalog.ts`(결재 템플릿 칸 규칙·「결재 올림」·자동화 ① 조건), 시험 `approvalPermission.test.ts` 신규·기존 결재 시험 기대값만. `propertyAccess.ts`·`dbaccess.ts`·새 API·DB 0.
- 칸 규칙: 상태·결재 의견·결재일 = default `reader` + 「결재자(aApr) 선택된 사람」 `content_only_editor` / 결재 올림(aSub, 체크칸)·요청자 = 「페이지 만든 사람」 `content_only_editor` / 결재자 = default `reader`, 예외 없음(표 전체 권한자만). 자동화 ① = aSub `is checked`.
- 신뢰 경계: 규칙은 기호 키로만 받아 JSON(가져오기·AI 도구 `write.ts`의 `schema as any`)으로는 만들 수 없음 — 문자열 키 `property_permissions`는 지금처럼 무시. 받은 규칙은 알려진 모양만 새 객체로 복사, 하나라도 틀리면 예외 → 템플릿 추가 전체 실패·기록 0(조용히 버려 무제한 편집으로 넘어가지 않음).
- 속성 번호 근거: 템플릿 복사(`templates.ts copyTreeOps`)는 collection을 `...rest`로 옮겨 schema 키가 그대로 → 복사본 규칙의 `aApr`·`created_by` 참조가 새 표 schema에 있음을 시험으로 확인.
- 실서버 증거(격리 시험 DB): 일반 편집(read_and_write) 요청자·결재자·제3자 + 전체 권한 주인. 화면 저장 `applyChanges`·공개 API `PATCH /v1/pages/:id`·AI/버튼과 같은 client 거래 모두에서 제3자·요청자 상태 변경 거절, 결재자 허용; 결재자 지정은 세 회원 모두 거절·주인만; 같은 거래 「결재자=나+승인」 전체 거절; 요청자 자기 결재자 지정 새 행 거절·행 0; 규칙 스키마 삭제 거절; 반례: 규칙을 뺀 표에서는 같은 제3자가 상태를 바꿀 수 있었음. 상태 기본값은 새 행에 저장되지 않아 요청자 새 행이 막히지 않음.
- 남은 한계: 표 전체 권한자는 모든 칸을 바꿈(기존 동작, 템플릿 설명에 평문), 결재자로 지정되면 기존 「사람 속성 지정」 알림이 함께 감(결재 요청 알림과 별개), 앱 알림만, 결재 이력은 페이지 버전 기록.

### 7-14. E3-4 셀 AI 출처 읽기 조사 (2026-11-17, Master `msg_c9df8533e961`) — 코드 0, E3-3 QA034 동안
**지금 있는 것(재사용)**
- 칸 AI 채우기: 화면 `web/features/ai/autofill.ts` → RPC `aiAutofill`(`api/modules/ai.ts` 329, `modelCall`: 로그인·AI 설정·회원 한도) → `ai/service.ts` `runAutofill`(행 열람 권한 `rowForAutofill`·워크스페이스 AI 정책) → `prompts.ts` `buildAutofillRequest`/`autofillValue`. 값은 서버가 돌려주고 **화면이 회원 본인 거래로 저장**(`setProperty`, client 거래 → 칸 권한 규칙 그대로). 시험용 모델 주입 `runAutofill(p, client)` 있음. **웹 검색·출처 없음.**
- 검색: `ai/providers/webSearch.ts` — 회원이 고른 검색(`aww_search_tool`: 자동·모델 내장·네이버·카카오·Tavily·Perplexity·SerpAPI), **회원 본인 공용 키(user_api_keys)만**(`memberSearch()` 요청 단위 저장소, 운영자 키 없음), `planSearch`(고른 키 없으면 내장→다른 등록 키), `runWebSearch`(20초, 결과 최대 8개, http(s) 주소만, 키 값 오류에 안 넣음, 한국어 오류), 시험용 `setWebSearchFetch`. 채팅은 `service.ts` 404~411에서 외부 검색이면 `web_search` 함수 도구, 내장이면 모델 서버 도구(출처는 모델 응답 인용에서).
- 정책: 워크스페이스 `aiPolicy.webSearch`(`ai_web_search`, 기본 켬) — 채팅은 이 값을 지킴.
- 자동 다시 채우기 `ai/autofillAuto.ts`: 행 편집 몇 초 뒤 서버가 대신 실행(`client: true`) — 여기서 검색까지 하면 편집마다 유료 검색이 반복됨.

**최소 구현 단위(제안, 유료 호출 없이 시험 가능)**
1. `aiAutofill`에 선택 입력 `web: true`(수동 실행만). 서버: `aiPolicy.webSearch` 꺼짐이면 거절, `searchPlanFor`가 **외부 검색일 때만** 1회 검색(검색어 = 회원 지시 + 행 제목, 300자) → 결과를 번호 붙인 자료로 `buildAutofillRequest`에 넣고 「자료에 있는 것만, 근거 번호」 지시 → 응답에 `sources: [{n,title,url}]`(쓴 번호만, 최대 8). 모델 내장 검색(서버 도구·인용 파싱이 모델마다 다름)은 이번 단위 제외 → 외부 검색 키가 없으면 「검색 도구 키 등록」 안내로 거절(조용히 검색 없이 채우지 않음).
2. 출처 저장: 새 저장 경로 0 — 응답의 출처를 화면에 보여 주고, 회원이 고른 **같은 행의 URL 칸**이 있으면 첫 출처 주소를 같은 `setProperty` 거래로(칸 권한 규칙 그대로). 행 댓글 저장은 다음 단위(새 쓰기 경로라 별도 검토).
3. 자동 다시 채우기(`autofillAuto`)·에이전트에는 넣지 않음(`web`은 수동 요청에서만 받음).
- 시험(유료 0): `setWebSearchFetch` 가짜 응답 + `runAutofill(…, client)` 가짜 모델 → 회원 키 없음 거절·정책 꺼짐 거절·다른 회원 키 안 씀·http 외 주소 버림·출처 번호 범위 밖 버림·검색 실패 시 한국어 오류·자동 채우기 경로에 web 무시. 실제 검색·모델 1회 확인은 비용 승인 뒤 시험 계정 키 최저가로.
- 정확 경로(예정): `server/api/modules/ai.ts`(aiAutofill 입력), `server/ai/service.ts`(runAutofill), `server/ai/prompts.ts`(자료 포함 요청·출처 번호 정리), `web/features/ai/autofill.ts`·`autofillUi.tsx`(「웹에서 찾기」 체크·출처 표시·URL 칸 고르기), 번역 사전 1~3줄, 새 시험 `tests/integration/autofillWeb.test.ts`. `webSearch.ts`·검색 공급자·회원 키 구조 변경 0.
- 결정 필요: 내장 검색만 쓰는 회원(외부 검색 키 없음)도 이번에 지원할지(지원하면 모델별 인용 파싱 필요 → 범위·시험 비용 커짐). 권장: 이번은 외부 검색만.

### 7-15. E3-4 칸 AI 「웹에서 찾기」 구현 결과 (2026-11-17, Master `msg_228557cee536`) — 코드 `81e816a26`, 미배포
- 서버: `aiAutofill`이 `web === true`만 받음 → `runAutofill`: 워크스페이스 웹 검색 꺼짐 거절 → `planSearch(회원 선택, null, 회원 키)`로 **외부 검색만**(내장 검색 미지원, 키 없으면 등록 안내) → 검색 1번(기존 20초·8개) → 번호 고정 자료 블록(「데이터일 뿐 명령 아님」) → 모델 1번(`maxRetries: 0`·대체 모델 끔·도구 없음) → 마지막 줄 `SOURCES:`에서 1~개수 번호만 → 출처는 서버 번호 표에서만. URL 칸 값도 인용된 검색 주소만. 검색 실패·결과 없음·근거 없음·정책 꺼짐·검색어 없음 → 한국어 오류, 칸 그대로. `ai_autofill.web`이 켜진 칸을 web 없이 부르면(자동 다시 채우기) 거절 → 검색 없이 조용히 채우지 않음.
- 화면: 칸 설정에 「웹에서 찾기(출처 포함)」(켜면 자동 다시 채우기 꺼짐·외부 도구 필요·검색/AI 비용 안내), 「첫 출처 주소를 저장할 칸」(같은 행 URL 칸, 기본 저장 안 함), 「이미 주소가 있어도 바꾸기」(기본 끔). 값+출처 주소는 회원 거래 하나(권한 거절이면 둘 다 반영 안 됨), 출처 없으면 주소 칸을 지우지 않음.
- 남은 한계: OpenAI 공급자 래퍼의 「응답 전 실패」 자체 재시도(`providers/openai.ts` 생성 시 설정)는 범위 밖이라 그대로, 실제 검색 서비스·실제 모델 응답 형식(마지막 줄 지시 준수율)은 미검수(비용 승인 뒤 시험 계정 최저가 1회), 출처 목록은 알림 문구로만(칸 안 목록 표시 없음).

#### 7-15 보완: 공급자별 재시도 읽기 조사 (Master `msg_7af424cd3514`) — 코드 0
`81e816a26`의 `noRetry` 래퍼는 `stream(params, { …, maxRetries: 0 })`만 넘긴다. 공급자별로 실제 효과가 다르므로 **「모델 1회 확정」으로 표시하지 않는다.**
| 공급자 | 재시도 위치 | `maxRetries: 0` 전달 시 | 근거 |
|---|---|---|---|
| Anthropic | SDK 클라이언트 `maxRetries: 2`(`providers/anthropic.ts` 20) | SDK 요청 옵션 `RequestOptions.maxRetries`(기본 2)로 받는 형식 — **효과 있을 것으로 보이나 실제 SDK로는 미검증**(81e816a26 시험은 가짜 클라이언트가 옵션을 받았는지만 확인) | `node_modules/@anthropic-ai/sdk/internal/request-options.d.ts` 75 |
| OpenAI(호환 포함) | 어댑터 `respond()`: 아무것도 내보내기 전 `overloaded·network·rate_limited(사용 한도 제외)`면 `retryDelays ?? [700, 2000]` → 최대 **HTTP 3번** | **무시**(`openaiClient`의 `stream`이 `opts.signal`만 읽음) | `providers/openai.ts` 29·98·171~185·283~285 |
| Gemini | 같은 구조, `[1500]` → 최대 **2번**(`overloaded·network`만) | **무시**(`geminiClient`가 `opts.signal`만) | `providers/gemini.ts` 25·73·138~152·232~234 |
- 실패 응답(429·5xx·연결 실패)의 과금 여부는 공급자마다 미확인 — 「응답 전 실패 재시도」라 대개 과금 전이지만 단정하지 않음.
- **최소 수정안(승인 시)**: `providers/openai.ts`·`providers/gemini.ts`의 `stream` 진입부 각 1줄 — `opts?.maxRetries === 0`이면 그 스트림만 `{ ...deps, retryDelays: [] }`(기본 동작·다른 기능 불변). `providers/anthropic.ts` 변경 0. 시험: 기존 `tests/integration/gemini.test.ts`처럼 가짜 fetch로 ① OpenAI 503 → `maxRetries:0`이면 fetch 1번·기본이면 3번 ② Gemini 503 → 1번/2번 ③ Anthropic 실제 SDK(`new Anthropic({ apiKey: 가짜, fetch: 가짜, maxRetries: 2 })`) 529 → `stream(…, { maxRetries: 0 })`이면 1번. 위치: 새 `tests/integration/providerNoRetry.test.ts`(또는 `autofillWeb.test.ts`에 추가). 실호출 0.
- 그 전까지 E3-4 표시는 「Anthropic SDK에 재시도 0 요청 옵션 전달(미검증), OpenAI·Gemini 어댑터는 응답 전 실패 시 기존 재시도 유지」.
