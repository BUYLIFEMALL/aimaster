# 이미지 변환 스튜디오 (image-convert-studio) v1.07 디자인 리뉴얼 사전 개발 플랜

- **작성 일자**: 2026-10-18
- **작업자**: Antigravity CLI (agy, 윈도우)
- **대상 프로그램**: 17번 `이미지 변환 스튜디오` (`image-convert-studio`)
- **공식 서비스 URL**: https://image-convert-studio.buylife.xyz
- **프로그램 구분**: 멀티미디어 카테고리 / 브라우저 100% 로컬 고성능 이미지 변환·업스케일·콜라주 도구

---

## 1. 개요 및 문제점 분석

### 1.1 현황 및 개선 필요점
1. **디자인 테마 미흡 및 구형 UI**:
   - 현재 흰색 바탕에 단순한 기본 파란색(blue-600) 조합으로 되어 있어, 크리에이터 및 디자이너를 위한 고성능 이미지 처리 스튜디오의 전문적이고 고급스러운 감성이 부족함.
   - `DESIGN.md` 17번 권장 템플릿인 **크리에이티브 아틀리에 스타일 (Creative Atelier Style)**에 맞추어, 딥 옵시디언/차콜 아틀리에 감성의 단일 테마로 리뉴얼 필요.
2. **비주얼 가이드북 부재 (DESIGN.md 9번 원칙 위반)**:
   - 현재 `/guide` 페이지가 단순 텍스트 나열(ol, ul 목록 태그) 수준으로 구성되어 있어, 시각적 파이프라인, 포맷 비교 표, 압축 팁, 트러블슈팅 FAQ 등이 결여됨.
3. **모바일 반응형(375px) 내비게이션 미흡**:
   - 모바일 환경에서 상단 바 펼침 토글로만 구성되어 있어 다른 최신 리뉴얼 프로그램들의 표준(56px 상단 슬림 헤더 + 슬라이딩 드로어 메뉴)과 차이가 남.
4. **인수인계 문서 6종 부재**:
   - 서브폴더 내 `AGENTS.md`(7대 핵심 항목), `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`가 부재하여 규격화 필요.

---

## 2. 작업 목표 및 공식 템플릿 지정

### 2.1 공식 디자인 템플릿 명칭
- **크리에이티브 아틀리에 스타일 — 이미지 스튜디오 에디션 (Creative Atelier Style — Image Studio Edition)**

### 2.2 핵심 색상 및 토큰 설계 (단일 테마 원칙)
- **전체 배경**: 딥 나이트 옵시디언 (`#0b0f17` / `#090d16`)
- **서피스 카드**: 다크 아틀리에 패널 (`#131926` / `#162032`)
- **테두리 & 디바이더**: 슬레이트 보더 (`#1e293b` / `#334155`)
- **포인트 컬러**:
  - 시그니처 바이올렛 (`#8b5cf6` / `#7c3aed`) & 인디고 (`#6366f1`)
  - 앰버 골드 (`#f59e0b` / `#d97706`): 처리 완료 및 하이라이트
  - 에메랄드 그린 (`#10b981`): 파일 크기 절감율 및 상태 표시
- **텍스트**: 헤드라인 퓨어 화이트 (`#ffffff`), 본문 슬레이트 200 (`#e2e8f0`), 보조 슬레이트 400 (`#94a3b8`)

---

## 3. 세부 구현 계획

### Step 1: 레이아웃 및 375px 모바일 내비게이션 구축
- `src/components/layout/Sidebar.tsx`:
  - 딥 아틀리에 테마 적용 (좌측 고정 네비게이션 데스크톱).
  - 모바일 전용 56px 상단 슬림 헤더 + ☰ 햄버거 버튼 터치 시 부드러운 슬라이딩 드로어(Drawer) 및 백드롭 오버레이 구축.
  - 가로 넘침(`overflow-x-hidden`) 0px 완벽 방어.
  - 메뉴 구성: 1단계 변환(`/convert`) ➔ 2단계 콜라주(`/collage`) ➔ 📖 연동 & 사용 매뉴얼(`/guide`) + 계정/로그아웃.
- `src/components/layout/TopBar.tsx`:
  - 다크 아틀리에 테마 동기화 및 언어 선택 버튼 디자인 정돈.

### Step 2: 툴 페이지 전면 테마 일체화 (`/convert`, `/collage`)
- `src/components/tool/ConvertTool.tsx`:
  - 드롭존, 옵션 카드, 이미지 그리드 뷰어를 딥 아틀리에 스타일로 리뉴얼.
  - 슬라이더, 셀렉트 박스, 체크박스 디자인 통일.
  - 용량 절감율 칩, 변환 상태 뱃지 시인성 극대화.
- `src/components/tool/CollageTool.tsx`:
  - 캔버스 뷰포트 프리뷰 영역 아틀리에 캔버스 스타일화.
  - 그리드 레이아웃 조절 패널 및 컬러 피커 딥 테마 동기화.
- `src/app/(auth)/login/page.tsx`:
  - 이미지 스튜디오 시그니처 아이콘 및 다크 아틀리에 로그인 카드 리뉴얼.

### Step 3: 비주얼 연동 & 사용 매뉴얼 (`/guide`) 전면 구축
- `src/components/tool/GuideView.tsx` & `src/app/(dashboard)/guide/page.tsx`:
  - **공식 가이드북 히어로 배너 (v1.07)**.
  - **5단계 원스톱 이미지 변환/콜라주 파이프라인 다이어그램**:
    1. 파일 드래그앤드롭 ➔ 2. 포맷/품질 옵션 설정 ➔ 3. 초고화질 업스케일 ➔ 4. 일괄 변환 처리 ➔ 5. 1-Click ZIP 다운로드.
  - **포맷별 최적 활용 매트릭스** (WebP, AVIF, PNG, JPEG 비교 가이드).
  - **전문가 이미지 팁 4종** (Lanczos3 리샘플링, 언샵 마스크 샤프닝, 무손실 압축, 100% 브라우저 처리 보안 원칙).
  - **트러블슈팅 FAQ 아코디언 5종** (투명 배경 처리, AVIF 브라우저 지원, 대용량 일괄 변환 한도, 모바일 저장 방법 등).

### Step 4: 버전 동기화 및 빌드/배포 검증
- 버전 `v1.07`로 갱신 (`src/lib/version.ts`, `package.json`).
- `npm run test` 통과 확인.
- Next.js 로컬 빌드(`npm run build`) 무오류 확인.
- Vercel 프로덕션 배포 (`vercel --prod`).

### Step 5: Microsoft Edge 포그라운드 실세션 검수
- Microsoft Edge 실제 창을 띄워 일반 회원 테스트 계정(`buylifemall@naver.com`)으로 로그인 검수.
- 데스크톱(1440px) 및 모바일(375px) 화면 캡처 및 아티팩트 보존.

### Step 6: 필수 인수인계 문서 6종 완비 및 루트 동기화
1. `image-convert-studio/AGENTS.md` (7대 핵심 항목 완벽 규격화)
2. `image-convert-studio/README.md` (동기화)
3. `image-convert-studio/docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서)
4. `image-convert-studio/docs/IMPROVEMENTS.md` (필수 3대 항목 + 타 프로그램 탐색 제안)
5. `image-convert-studio/docs/IMPROVEMENT_BACKLOG.md` (작업 대기 백로그)
6. `image-convert-studio/docs/PLAN_20261018_DESIGN_RENEWAL.md` (사전 개발 플랜 원본)
- 루트 마스터 동기화: `DESIGN.md` (17번 완료 상태 및 누적 48개 달성 갱신), `docs/ACTIVE_WORK.md`(행 삭제), `docs/HANDOFF.md`(최상단 보고서 작성).
- Git 커밋 및 원격 푸시.
