# 인수인계 — 예약 발행 시간 단위 주기 설정 및 ON/OFF 토글 기능 (Claude Code 인수인계용)

> **작성일**: 2026-10-19  
> **작성자**: Antigravity CLI (agy)  
> **대상**: Claude Code (Threads 운영 자동화 `threads-content-ops/` 운영 적용용)  
> **선행 구현 및 검증 완료처**: `labs/kit-threads/` (`https://dev-threads-posting.vercel.app/threads-content-ops?tab=settings`)

---

## 1. 배경 및 사용자(주인님) 요청 사항

- **주인님 지시**:
  > "난 등록 했는데 1분마다 발행하면 안되지. 사용자가 설정한 시간 단위마다 발행되어야 하고, 예약 발행 기능은 사용자가 직접 켜고 끌 수 있도록 해줘"
- **문제점**:
  - 기존에는 cron-job.org가 무조건 1분 간격(`minutes: [-1]`)으로 고정 호출되어 화면에 "1분마다 호출"로 표시되었음.
  - 사용자는 글이 1분마다 무차별 발행되는 것으로 오해할 수 있으며, 실제로도 사용자 설정 주기(예: 1시간, 2시간, 3시간, 6시간 등)로 작동하기를 원하심.
  - 또한 예약 발행을 사용자가 원할 때 언제든 안전하게 멈추거나(OFF) 다시 켤 수 있는(ON) 토글 스위치가 없었음.

---

## 2. 해결 및 구현 설계 (kit-threads에 구현 완료)

### 1) 시간 단위(주기) 스케줄링 (`lib/cronJobOrg.ts`)
- **지원 인터벌 목록**:
  - `1h`: 1시간마다 (권장 — 매시간 정각 `hours: [-1], minutes: [0]`)
  - `2h`: 2시간마다 (`hours: [0,2,4,6,8,10,12,14,16,18,20,22], minutes: [0]`)
  - `3h`: 3시간마다 (`hours: [0,3,6,9,12,15,18,21], minutes: [0]`)
  - `6h`: 6시간마다 (`hours: [0,6,12,18], minutes: [0]`)
  - `12h`: 12시간마다 (`hours: [9,21], minutes: [0]`)
  - `24h`: 24시간마다 (`hours: [9], minutes: [0]`)
  - `30m`: 30분마다 (`hours: [-1], minutes: [0,30]`)
  - `15m`: 15분마다 (`hours: [-1], minutes: [0,15,30,45]`)
  - `10m`: 10분마다 (`hours: [-1], minutes: [0,10,20,30,40,50]`)
  - `5m`: 5분마다 (`hours: [-1], minutes: [0,5,10,15,20,25,30,35,40,45,50,55]`)
  - `1m`: 1분마다 (실시간 정밀 확인)
- **`inferInterval` 함수**:
  - cron-job.org에 등록된 기존 작업의 `schedule.minutes` / `hours`를 분석하여 현재 설정된 주기(`1h` 등)를 자동 역추정 및 UI 동기화.
- **`updateDispatchJobSchedule`**:
  - 키를 다시 입력하지 않아도 사용자가 선택한 주기로 cron-job.org 작업의 `schedule`을 즉시 PATCH 갱신.

### 2) 예약 발행 직접 켜기/끄기 (ON / OFF 토글)
- **`toggleDispatchJob(apiKey, url, enable: boolean)`**:
  - cron-job.org REST API `PATCH /jobs/{jobId}` 호출: `{ job: { enabled: enable } }`
  - 켜짐(ON): `🟢 예약 발행 활성화됨 (ON)` + `[⏸️ 예약 발행 끄기 (일시정지)]` 버튼.
  - 꺼짐(OFF): `⚪ 예약 발행 꺼짐 (일시중지 OFF)` + `[▶️ 예약 발행 켜기 (재개)]` 버튼.

### 3) 서버 액션 (`app/threads-content-ops/web-actions.ts`)
- `connectCronJobOrg(apiKey, interval)`: 사용자가 선택한 주기로 작업 생성.
- `toggleCronJobOrg(enable: boolean)`: 예약 발행 ON/OFF 토글.
- `updateCronJobOrgSchedule(interval: CronInterval)`: 주기 변경.
- `cronJobOrgStatus()`: `enabled`, `interval`, `intervalLabel` 포함 반환.

### 4) UI 컴포넌트 (`app/threads-content-ops/CronJobOrgSetup.tsx`)
- 예약 발행 ON/OFF 스위치 카드, 시간 단위 주기 선택 셀렉트 박스, 주기 변경 적용 버튼 완비.
- 친절한 안내: "사용자가 설정한 시간 단위(주기)로 예약 목록을 확인하여 지정한 시각이 된 글을 자동으로 Threads에 발행합니다."

---

## 3. 운영 사이트(`threads-content-ops/`) 적용 가이드 (Claude Code 참고)

- 운영 프로그램의 `threads-content-ops/docs/PLAN_20261019_MEMBER_CRONJOB.md` 기획안에 위 시간 단위 주기 선택 및 ON/OFF 토글 로직을 포함하여 DB 마이그레이션(승인 후) 및 운영 적용을 진행해 주시면 됩니다.
- 기준 코드 위치:
  - `labs/kit-threads/lib/cronJobOrg.ts`
  - `labs/kit-threads/app/threads-content-ops/web-actions.ts`
  - `labs/kit-threads/app/threads-content-ops/CronJobOrgSetup.tsx`
- 검증된 실서비스: `https://dev-threads-posting.vercel.app/threads-content-ops?tab=settings`
