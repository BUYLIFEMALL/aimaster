# 음악(SUNO)자동화 (music/) 개선사항 인수인계서 (IMPROVEMENT_HANDOFF_20261016.md)

- **작성일자**: 2026-10-16
- **작성 CLI**: Antigravity (Windows)
- **대상 프로그램**: `music/` (음악(SUNO)자동화, slug: `music-automation`)
- **현재 버전**: `v1.07`

---

## 1. 발견된 개선 과제 개요

| 항목 | 내용 |
| :--- | :--- |
| **과제명** | **Suno v6 최신 엔진 모델 파라미터 연동 및 UI 선택 기능 구현** |
| **우선순위** | 🚨 **최우선 (P1 - High)** |
| **처리 상태** | 🟡 **미구현 (인수인계 및 설계 완료)** |
| **발견 배경** | 사이드바 배너 및 기획 헤더에 "Suno v4 ~ v6 최신 엔진 탑재" 문구가 반영되었으나, 실제 백엔드 API 연동 코드를 전수 점검한 결과 **v6 모델 선택 및 전송 로직이 구현되어 있지 않고 `DEFAULT_SUNO_MODEL = "V5_5"`로 고정 호출**되고 있음을 발견함. |
| **영향도** | 사용자가 v6 기반의 최신 음질/보컬 렌더링을 기대하고 곡을 생성하더라도 실제로는 v5.5 모델로만 생성되어 기대 품질과의 불일치가 발생할 수 있음. |

---

## 2. 세부 현황 분석 및 코드 위치

### 1) 백엔드 모델 하드코딩
- 파일: [`music/lib/ai/suno.ts`](file:///D:/Antigravity/AIMaster/music/lib/ai/suno.ts#L5)
  ```typescript
  export const DEFAULT_SUNO_MODEL = "V5_5";
  ```
  - `requestSunoGeneration`, `requestSunoExtend`, `requestSunoRemix` 함수에서 `model: input.model ?? DEFAULT_SUNO_MODEL`로 호출되고 있으나, 상위 호출부에서 `input.model`을 넘겨주지 않아 무조건 `"V5_5"`로 고정됨.

### 2) Server Actions의 고정 저장
- 파일: [`music/lib/actions/tracks.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/tracks.ts#L172)
  ```typescript
  suno_model: DEFAULT_SUNO_MODEL, // "V5_5" 하드코딩
  ```
- 파일: [`music/lib/actions/remix.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/remix.ts#L225)
  ```typescript
  suno_model: DEFAULT_SUNO_MODEL, // "V5_5" 하드코딩
  ```

### 3) UI상 모델 선택 옵션 부재
- 파일: [`music/components/plannings/GenerateTracksPanel.tsx`](file:///D:/Antigravity/AIMaster/music/components/plannings/GenerateTracksPanel.tsx)
  - 보컬/인스트루멘탈, 성별, 언어, 태그 칩 등은 있으나 **Suno 엔진 모델(v4, v5.5, v6)을 선택하는 UI가 전혀 없음**.
- 파일: [`music/app/(dashboard)/remix/new/page.tsx`](file:///D:/Antigravity/AIMaster/music/app/(dashboard)/remix/new/page.tsx)
  - 리믹스 생성 시에도 엔진 모델 선택 옵션이 없음.

---

## 3. 다음 작업 CLI를 위한 구현 가이드 (Step-by-Step)

### Step 1. Suno API v6 모델 식별자 확인
- `api.sunoapi.org` 프록시 API의 `/api/v1/generate` 명세를 확인하여 v6에 해당하는 파라미터 값(예: `"V6"`, `"V6_0"`, `"V5_5"`, `"V4"` 등)을 정의합니다.
- [`music/lib/ai/suno.ts`](file:///D:/Antigravity/AIMaster/music/lib/ai/suno.ts)에 지원 모델 목록 상수 추가:
  ```typescript
  export const SUNO_MODELS = [
    { id: "V6", label: "Suno v6 (최신 플래그십)", description: "최고 음질 및 자연스러운 보컬 뉘앙스", recommended: true },
    { id: "V5_5", label: "Suno v5.5", description: "안정적인 밸런스와 빠른 생성" },
    { id: "V4", label: "Suno v4", description: "클래식 v4 사운드 엔진" },
  ] as const;
  export type SunoModelId = typeof SUNO_MODELS[number]["id"];
  export const DEFAULT_SUNO_MODEL = "V6"; // 기본값을 최신 v6로 전환 권장
  ```

### Step 2. UI 모델 선택 셀렉터 추가
- [`music/components/plannings/GenerateTracksPanel.tsx`](file:///D:/Antigravity/AIMaster/music/components/plannings/GenerateTracksPanel.tsx):
  - `const [sunoModel, setSunoModel] = useState<string>("V6");` 상태 추가.
  - 생성 모드 선택 영역 하단에 알약형 칩 형태의 모델 선택 UI(v6, v5.5, v4) 배치.
  - `generateTracksAction` 호출 시 `sunoModel` 인자 전달.
- [`music/components/remix/RemixForm.tsx`](file:///D:/Antigravity/AIMaster/music/components/remix/RemixForm.tsx):
  - 동일하게 리믹스 생성 옵션에 모델 선택 UI 연동.

### Step 3. Server Actions 및 DB 저장 확장
- [`music/lib/actions/tracks.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/tracks.ts):
  - `generateTracksAction`의 `options`에 `sunoModel?: string` 추가.
  - `music_tracks` 테이블 INSERT 시 `suno_model: options?.sunoModel ?? DEFAULT_SUNO_MODEL` 적용.
- [`music/lib/actions/remix.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/remix.ts):
  - `createRemixAction` 파라미터에 `sunoModel?: string` 추가.
  - `music_track_remixes` 테이블 INSERT 시 선택 모델 반영.

### Step 4. 빌드, 버전 판올림 (`v1.08`) 및 배포
- 버전: `music/lib/version.ts` ➔ `v1.08`, Supabase `programs.version = 'v1.08'`.
- 빌드 검증: `cd music; npm run build`.
- 배포: `npx vercel --prod --yes`.
- 화면 검수: Microsoft Edge(`msedge`) 브라우저로 실제 모델 선택 UI 및 생성 요청 정상 동작 캡처.

---

## 4. 관련 파일 목록
- [`music/lib/ai/suno.ts`](file:///D:/Antigravity/AIMaster/music/lib/ai/suno.ts) (API 호출 및 상수)
- [`music/lib/actions/tracks.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/tracks.ts) (트랙 생성 액션)
- [`music/lib/actions/remix.ts`](file:///D:/Antigravity/AIMaster/music/lib/actions/remix.ts) (리믹스 생성 액션)
- [`music/components/plannings/GenerateTracksPanel.tsx`](file:///D:/Antigravity/AIMaster/music/components/plannings/GenerateTracksPanel.tsx) (생성 UI)
- [`music/components/remix/RemixForm.tsx`](file:///D:/Antigravity/AIMaster/music/components/remix/RemixForm.tsx) (리믹스 UI)
- [`music/docs/IMPROVEMENTS.md`](file:///D:/Antigravity/AIMaster/music/docs/IMPROVEMENTS.md) (서브폴더 백로그)
- [`docs/HANDOFF.md`](file:///D:/Antigravity/AIMaster/docs/HANDOFF.md) (루트 인수인계 현황)
