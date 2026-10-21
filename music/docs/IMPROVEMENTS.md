# 음악(SUNO)자동화 (music/) 개선사항 및 백로그 (IMPROVEMENTS.md)

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
버전: `v1.07` (이전 v1.06)

---

## 1. 완료된 개선 내역 (v1.08 - 2026-10-16)
1. **사이드바 사용 매뉴얼 메뉴 연동 & 계정 밀착 배치 (주인님 지시)**:
   - 좌측 사이드바 `UTILITY_ITEMS`에 `📚 연동 & 사용 안내` (`/guide`) 메뉴 신설 및 오렌지 액센트 적용.
   - 접속 계정 및 로그아웃 버튼을 유틸리티 메뉴 바로 아래(`border-t border-[#23232f] pt-3 px-1`)에 바짝 밀착 배치 (최신 사이드바 표준 반영).
2. **Suno AI 음악 자동화 전용 가이드북(/guide) 전면 신설**:
   - `app/(dashboard)/guide/page.tsx` 라우트 신설 (`requireProgramAccess()` 보안 권한 체크 적용).
   - `components/guide/MusicUsageGuide.tsx` 신설:
     - **3대 인터랙티브 탭**: `4단계 실전 마스터 가이드`, `Suno 스타일 & 메타 태그 비법`, `사운드 꿀팁 & FAQ`.
     - STEP 00 (API키 등록) ~ STEP 04 (Remix 스튜디오) 실제 소스코드 로직 100% 반영.
     - 4대 인기 장르 프리셋 코드, 6대 가사 메타 태그 아코디언, 4대 사운드 꿀팁 및 5대 FAQ 아코디언 탑재.
3. **버전 및 DB 동기화**: 코드 `lib/version.ts` `v1.08` 및 Supabase DB `programs.version = 'v1.08'` 동기화 완료.

## 2. 완료된 개선 내역 (v1.07)
1. **Suno v6 최신 엔진 지원 문구 및 배지 반영**:
   - 좌측 사이드바 하단 배너: `✨ Suno v4 ~ v6 최신 엔진 탑재`로 최신화.
   - 곡 기획·트랙 관리 헤더 배지: `Suno v4 ~ v6 Engine`으로 최신화.
   - 버전 `v1.07` (코드 및 Supabase DB `programs.version`) 동기화 완료.

## 2. 완료된 개선 내역 (v1.06)
1. **Suno 본사이트 오리지널 다크 스튜디오 리뉴얼**:
   - `사이버 수노 다크 스튜디오 스타일` 전면 적용 (`globals.css`, `tailwind.config.ts`, `Sidebar.tsx`, `layout.tsx`).
   - 기존 파스텔 화이트/블루 테마에서 퓨어 딥 블랙(`#09090b`) & 앰버 오렌지(`#f97316`) 네온 테마로 탈바꿈.
2. **비로그인 로그인/회원가입 화면 다크 테마 일관화**:
   - `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` 다크 스튜디오화.
   - 비로그인 사용자가 `/remix`나 보호된 페이지 진입 시에도 고급스러운 다크 감성을 즉시 체감할 수 있도록 개선.
3. **Suno 비주얼 사용 가이드 & 프로세스 맵 신설**:
   - `components/guide/SunoUsageGuide.tsx` 신설 및 `remix/page.tsx`, `plannings/page.tsx`에 연동.
   - STEP 1(컨셉&가사) ➔ STEP 2(고음질 생성) ➔ STEP 3(Remix) 3단계 프로세스 시각화.
4. **알약형(Pill) 태그 칩 및 액션 버튼 디자인 업그레이드**:
   - `TagChips.tsx`를 다크 알약 버튼으로 개편.
   - 트랙별 연장, 리믹스, MR 분리, WAV 다운로드 버튼의 시인성 및 그루핑 강화.

---

## 3. 향후 제안 및 기능 개선사항 (다음 CLI 이관용 백로그)

### 🚨 [최우선] Suno v6 모델 선택 및 API 호출 연동 로직 구현
- **발견 배경**: 화면 배너/배지에는 "Suno v4 ~ v6 최신 엔진 탑재"로 표시되어 있으나, 실제 백엔드 API 연동 로직을 점검한 결과 **v6 모델 선택 및 호출 로직이 미구현** 상태임.
- **현재 구현 분석**:
  1. `music/lib/ai/suno.ts`: `export const DEFAULT_SUNO_MODEL = "V5_5";` 로 하드코딩되어 있음.
  2. `music/lib/actions/tracks.ts` 및 `music/lib/actions/remix.ts`: 곡 생성·리믹스 시 사용자가 모델을 선택할 수 없고 무조건 `DEFAULT_SUNO_MODEL` ("V5_5")로 DB 저장 및 API 전송됨.
  3. UI (`GenerateTracksPanel.tsx`, `RemixForm.tsx`): 엔진 모델(v4, v5.5, v6) 선택 UI(라디오 버튼/드롭다운)가 없음.
- **구현 과제 (다음 CLI 작업 가이드)**:
  1. **API 파라미터 확인**: 서드파티 Suno API(`api.sunoapi.org`) 명세에서 Suno v6 모델의 식별자 값(예: `V6`, `V6_0` 등) 확인 및 허용 모델 상수 정의 (`SUNO_ENGINE_MODELS = [{ id: "V6", label: "Suno v6 (최신 플래그십)" }, { id: "V5_5", label: "Suno v5.5" }, { id: "V4", label: "Suno v4" }]`).
  2. **UI 모델 셀렉터 추가**:
     - `components/plannings/GenerateTracksPanel.tsx`: 곡 생성 옵션에 "엔진 버전 선택 (Suno v6 / v5.5 / v4)" 라디오/알약 칩 추가.
     - `components/remix/RemixForm.tsx`: 리믹스 생성 옵션에도 엔진 모델 선택 제공.
  3. **Server Actions 및 DB 연동**:
     - `generateTracksAction`, `createRemixAction` 파라미터에 `sunoModel` 추가.
     - `music_tracks.suno_model`, `music_track_remixes.suno_model`에 사용자 선택 모델 반영 및 `requestSunoGeneration`, `requestSunoRemix`에 전달.

---

### 일반 제안 과제
1. **오디오 웨이브폼 비주얼라이저 (파형 시각화)**:
   - 현재는 브라우저 기본 `<audio controls />` 태그를 사용 중임.
   - `wavesurfer.js` 등을 도입하여 Suno 본사이트처럼 세련된 오렌지 파형 재생 바로 업그레이드하면 시각적 몰입감이 배가됨.
2. **플레이리스트 큐 & 하단 미니 플레이어**:
   - 페이지를 이동해도 백그라운드에서 끊김 없이 음악이 연속 재생되는 글로벌 하단 고정 오디오 플레이어 바 도입 추천.
3. **보컬 및 악기 Stem 개별 분리 기능 (Phase 3 백로그)**:
   - 보컬/반주 2트랙 외에 드럼, 베이스, 기타, 건반 등 멀티트랙 스템 분리 UI 추가 고려.
- 2026-10-21 v1.30: 기획 목록 여러 기획 곡 → 플레이리스트(완료). 다음 제안: 플레이리스트 쪽에서 곡 순서를 끌어 바꾸기(지금은 고른 순서·화면 순서).
