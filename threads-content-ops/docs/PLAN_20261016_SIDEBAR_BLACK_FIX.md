# Threads 콘텐츠 운영 자동화 — 사이드바 검은색 덩어리 및 텍스트 묻힘 버그 해결 플랜

> **작성 일자**: 2026-10-16  
> **작성자**: Antigravity CLI (`agy`, Windows)  
> **대상 프로그램**: `threads-content-ops` (Threads 콘텐츠 운영 자동화)  
> **대상 버전**: `v1.96` ➔ `v1.97` 상향 예정  
> **프로덕션 URL**: [https://threads-content-ops.buylife.xyz](https://threads-content-ops.buylife.xyz)  

---

## 1. 문제 분석 (Root Cause)

### 1.1 현상
- 사이드바 첫 번째 메뉴인 [대시보드] 항목이 거대한 검은색 직사각형 바(`black background`)로 보이며, 내부 '대시보드' 글자가 사라져 노란색 아이콘만 덩그러니 보임 (사용자 스크린샷 제보).

### 1.2 근본 원인
1. **스타일 덮어쓰기 충돌**:
   - `threads-content-ops/app/globals.css`의 라이트 테마 강제 규칙:
     ```css
     .threads-content-ops-light .text-white { color: #171717; }
     ```
   - `ContentOpsSidebar.tsx`에서 대시보드 활성 클래스로 `bg-neutral-900 text-white`를 지정함.
   - 브라우저 렌더링 시 `text-white`가 `#171717` (거의 완전한 검정색)으로 강제 변환되어, **검정색 배경(`bg-neutral-900`) 위에 검정색 글자(`#171717`)가 얹혀 텍스트가 완전히 묻혀버림**.
2. **라이트 테마 대비 부조화**:
   - 사이드바 전체가 흰색(`bg-white`)과 밝은 회색 테두리로 구성되어 있는데, 상단 대시보드 혼자 무거운 블랙 박스로 채워져 시각적으로 붕 뜨고 이질적인 '검은색 덩어리'로 인식됨.
3. **잠재적 동일 결함 메뉴**:
   - 하단 유틸리티의 `API키등록·플랫폼연동`(`settings`) 메뉴도 활성 시 `bg-neutral-900 text-white`를 사용하고 있어 클릭 시 동일한 글자 묻힘 버그가 발생함.

---

## 2. 해결 및 개선 범위

1. **사이드바 메뉴 활성 스타일을 `스레드 바이럴 스튜디오 스타일` 라이트 프리미엄 톤으로 일원화**:
   - **대시보드 (`dashboard`) 활성 상태**:
     - 기존: `bg-neutral-900 text-white shadow-sm` (검정 덩어리 + 글자 묻힘)
     - 변경: `bg-neutral-100 text-neutral-950 font-extrabold border border-neutral-300/80 shadow-xs` + 아이콘 `text-neutral-900`
     - 또는 바이럴 앰버 포인트 테마에 맞춰:
       `bg-amber-50/90 text-amber-950 font-extrabold border border-amber-200/80 shadow-xs` + 아이콘 `text-amber-600`
     - 흰색 사이드바와 자연스럽게 어우러지면서도 현재 탭임을 확실하고 고급스럽게 부각.
   - **API 키 등록 메뉴 (`settings`) 활성 상태**:
     - `bg-neutral-900` 제거 ➔ `bg-neutral-100 text-neutral-900 font-extrabold border border-neutral-300/80` 적용.
   - **가이드 메뉴 (`guide`) 및 파이프라인 1~5번 배지 명암비 보장**:
     - 혹시 모를 `.text-white` 덮어쓰기 방지를 위해 인라인 스타일 `style={{ color: '#ffffff' }}` 또는 확실한 명암비 토큰 지정.
2. **버전 및 DB 동기화**:
   - `lib/version.ts`: `v1.96` ➔ `v1.97`
   - Supabase DB `programs.version`: `v1.97` 동기화.
3. **검수 및 배포**:
   - 로컬 빌드 및 단위 테스트 통과.
   - Vercel 프로덕션 배포.
   - Microsoft Edge 브라우저로 대시보드 탭 활성화 화면 실세션 캡처 및 검증.

---

## 3. 구현 순서

1. `threads-content-ops/app/threads-content-ops/ContentOpsSidebar.tsx` 수정 (대시보드, 설정, 가이드, 배지 스타일 개편).
2. `threads-content-ops/lib/version.ts` 버전 `v1.97` 상향.
3. Supabase 공유 DB `programs.version = 'v1.97'` 동기화.
4. 로컬 빌드 및 단위 테스트 실행 (`npm run build --prefix threads-content-ops`).
5. Vercel 프로덕션 배포 (`vercel deploy --cwd D:/Antigravity/AIMaster/threads-content-ops --prod --yes --scope buylife`).
6. Microsoft Edge(`msedge.exe`) 실세션 브라우저 검수 및 스크린샷 확인.
7. 인수인계 문서 갱신 (`DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `AGENTS.md`, `HANDOFF.md`, `ACTIVE_WORK.md`).
8. Git 커밋 및 푸시.

---

## 4. 비용 및 인수인계 산출물

- **소요 비용**: 0원 (UI/CSS 로직 수정, 무료).
- **산출물**:
  - `threads-content-ops/docs/PLAN_20261016_SIDEBAR_BLACK_FIX.md` (본 플랜 문서)
  - `threads-content-ops/docs/DESIGN_HANDOFF.md` 갱신
  - `threads-content-ops/docs/IMPROVEMENTS.md` 갱신
  - `docs/HANDOFF.md` 최상단 갱신
