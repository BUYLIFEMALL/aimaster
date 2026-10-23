# AI 쇼츠 원스톱 제작 자동화 — 가이드북(/guide) 가독성 및 줄넘김 개편 개발플랜

> **작성 일자**: 2026-10-16  
> **작성자**: Antigravity CLI (`agy`, Windows)  
> **대상 프로그램**: `shorts-onestop-studio` (AI 쇼츠 원스톱 제작 자동화)  
> **대상 버전**: `v1.11` ➔ `v1.12` 상향 예정  
> **프로덕션 URL**: [https://shorts-onestop-studio.buylife.xyz/guide](https://shorts-onestop-studio.buylife.xyz/guide)  

---

## 1. 문제 분석 (Root Cause)

### 1.1 현상 (주인님 스크린샷 제보)
- `/guide` 페이지의 "주제·대본 사용법" 카드 하단 안내문(배경, 음성·자막·음악, 발행 계획, 장면 편집, 내 지침)이:
  1. 글자 크기가 `fontSize: 12` (12px)로 너무 작고 흐릿함(`color: var(--muted)`).
  2. 수백 자의 긴 설명이 줄바꿈 없이 하나의 단락(`p`)에 빽빽하게 이어져 있어 눈에 들어오지 않음 (벽돌 텍스트 현상).
  3. 중요 핵심 기능(스톡 검색, AI 이미지, BGM 덕킹, MP4 렌더링, 세이프에어리어 등)이 텍스트 숲에 묻혀 있어 초보 사용자가 파악하기 어려움.

---

## 2. 해결 및 개선 범위

1. **글자 크기 및 줄간격 표준화**:
   - `fontSize: 12` ➔ 표준 본문 크기 `14px` (`text-sm`) 적용.
   - 행간 `line-height: 1.65` 및 명확한 본문 폰트 색상(`var(--fg)`) 적용.
2. **구조화된 5대 핵심 가이드 카드 분리**:
   - 빽빽한 `<p>` 단락을 5개의 깔끔한 독립 서브 카드(`background: var(--surface-2)`, `border: 1px solid var(--line)`, `border-radius: 12px`, `padding: 16px`)로 전환:
     - 🎨 **배경 설정 및 이미지 제작 가이드** (배경 방식 3종, 스톡 무료 검색, AI 이미지 묘사, 무료 스톡 키 발급 팁)
     - 🎙️ **음성·자막·음악 & 브라우저 MP4 렌더링** (TTS 음성 생성, BGM 자동 덕킹 35%, 1080×1920 MP4 다운로드, 유튜브용 업로드 문구 자동 생성)
     - 📅 **발행 계획 및 원클릭 일괄 제작** (채널 6단계 맞춤 전략, 추천 시간대 자동 배치, 대본~MP4 일괄 제작)
     - 🎬 **장면 편집 & 유튜브 세이프에어리어** (8가지 테마, 레이아웃 6종, 글꼴 5종, 유튜브 UI 가림 방지 세이프존)
     - ✍️ **내 지침 & 대본 직접 변환** (분야별 말투/금지어 우선 적용, 한 줄=한 장면 즉시 변환)
   - 각 카드 내부를 [타이틀 + 단계별 줄바꿈 불릿 리스트 + 강조 뱃지/팁] 형태로 구조화.
3. **버전 및 DB 동기화**:
   - `src/lib/version.ts`: `v1.11` ➔ `v1.12`
   - Supabase 공유 DB `programs.version`: `v1.12` 동기화.
4. **검수 및 배포**:
   - 로컬 빌드 및 오류 검증.
   - Vercel 프로덕션 배포 (`https://shorts-onestop-studio.buylife.xyz`).
   - Microsoft Edge 실세션 브라우저 검수 및 스크린샷 확인.

---

## 3. 구현 순서

1. `shorts-onestop-studio/src/app/(workspace)/guide/page.tsx` 리팩터링:
   - 5개 빽빽한 단락을 독립 카드 컴포넌트 구조로 재설계하고 폰트 크기 `14px`, 줄바꿈, 볼드 키워드, 여백 적용.
2. `shorts-onestop-studio/src/lib/version.ts` 버전 `v1.12` 상향.
3. Supabase 공유 DB `programs.version = 'v1.12'` 업데이트.
4. 로컬 빌드 검증 (`npm run build --prefix shorts-onestop-studio`).
5. Vercel 프로덕션 배포 (`vercel deploy --cwd D:/Antigravity/AIMaster/shorts-onestop-studio --prod --yes --scope buylife`).
6. Microsoft Edge 브라우저로 `https://shorts-onestop-studio.buylife.xyz/guide` 실제 접속 및 스크린샷 캡처 검수.
7. 인수인계 문서 갱신 (`IMPROVEMENTS.md`, `IMPROVEMENT_HANDOFF_20261016.md`, `AGENTS.md`, `README.md`, `HANDOFF.md`, `ACTIVE_WORK.md`).
8. Git 커밋 및 푸시.

---

## 4. 비용 및 인수인계 산출물

- **소요 비용**: 0원 (UI/CSS/마크업 구조화 작업, 무료).
- **산출물**:
  - `shorts-onestop-studio/docs/PLAN_20261016_GUIDE_READABILITY_RENEWAL.md` (본 플랜 문서)
  - `shorts-onestop-studio/docs/DESIGN_HANDOFF.md` (신규 작성 — 가이드북 및 템플릿 표준)
  - `shorts-onestop-studio/docs/IMPROVEMENTS.md` (갱신)
  - `shorts-onestop-studio/docs/IMPROVEMENT_HANDOFF_20261016.md` (갱신)
  - `docs/HANDOFF.md` 최상단 갱신
