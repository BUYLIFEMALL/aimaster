# 디자인 인수인계 — AI 11번가 상품 자동등록기 (elevenst-register)

> **공식 채택 디자인**: **107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오 스타일 (11st Iconic Vibrant Red Studio)**  
> **적용 일자**: 2026-11-13 (주인님 "1안으로 하고" 확정 승인 반영)  
> **담당**: UI·디자인 전담 에이전트 agy (`[역할: design]`)

---

## 1. 디자인 컨셉 & 브랜드 아이덴티티

- **목적**: 스마트스토어(네이버 그린 78번), 쿠팡(로열 블루 84번)에 이어 3대 오픈마켓 커머스 삼총사의 핵심인 11번가 공식 비비드 레드(`#FA0050`)를 중심으로 전문 셀러 전용 스튜디오 룩 확립.
- **배경**: 소프트 스노우 크림 화이트 (`#FAFAFC` / `#F8F9FD`)
- **카드 & 서피스**: 화이트 스튜디오 카드 (`#FFFFFF`, 테두리 `#EEF0F4`, 부드러운 로즈 섀도우 `rgba(250, 0, 80, 0.03)`)
- **브랜드 컬러 팔레트**:
  - Main Brand Red: `#FA0050`
  - Hover Red: `#E60045`
  - Soft Rose Tint: `#FFF0F4` / `#FFF5F7`
  - 3D Shadow Deep Red: `#9E002E`
- **시그니처 버튼**:
  - `.btn-3d-red`, `.btn-3d-11st`: 11st 오리지널 레드 3D 엠보싱 버튼 (`linear-gradient(180deg, #FA0050 0%, #E60045 100%)`, 테두리 `#D4003E`, 박스 섀도우 `0 4px 0 #9E002E, 0 6px 14px rgba(250, 0, 80, 0.35)`)

---

## 2. 주요 개편 화면 및 구현 내역

### 1) 5단계 표준 로그인 화면 (`src/app/(auth)/login/page.tsx`)
- **쿠팡 문구 잔재 완전 제거**: `AIMASTER COUPANG OPS` → `AIMASTER 11ST REGISTER` 캡슐 배지 탑재
- **로고 심볼**: 68px 11st 레드 그라데이션 라운드 스퀘어 아이콘 (`from-[#FA0050] to-[#E60045]`)
- **입력 폼 & 3D 버튼**: 11st 레드 포커스 링 및 3D 엠보싱 레드 로그인 버튼 (`.btn-3d-red`)
- **반응형 검증**: 데스크톱 1440px / 모바일 390px 가로 스크롤 0px (scrollWidth 390 === innerWidth 390)

### 2) 대시보드 홈 화면 (`src/app/(dashboard)/home/page.tsx`)
- **4단계 오픈 API 파이프라인 배너**:
  1. 상세 상품 추출 → 2. 11st 규격 변환 → 3. 10원 절사 & 고시 → 4. 11st 즉시 전송 & 전시중지
- **실시간 4대 KPI 카드 그리드**:
  1. 11번가 API 상태: `정상 연동 200 OK` (서울 서버 직접 통신)
  2. 등록 대기 상품: 상세페이지 연계 건수 실시간 집계
  3. 11번가 등록 완료: 누적 `elevenst_register_jobs` 성공 건수
  4. 데이터 보관 정책: 30일 보관 (저장 구독 연장)
- **구버전 경고 제거**: 과거 "검사 단계" 안내 문구를 공식 Seller API 즉시 전송 & 전시중지 보호 안내로 최신화

### 3) 2단 상품 등록 관제 덱 (`src/app/(dashboard)/products/[id]/page.tsx` & `RegisterForm.tsx`)
- **11st 스튜디오 섹션 박스**: 기본정보(1), 카테고리(2), 가격·재고(3), 배송·반품(4), 고시(5), 규격검사(6), 전송(7)
- **10원 단위 절사 가이드**: 판매가 및 즉시할인 입력 필드 시각적 정돈
- **3D 액션 버튼**:
  - `🧪 11st 규격 검사하기` (`.btn-3d-11st`)
  - `🟠 11번가에 보내기 (등록 후 바로 전시중지)` (`.btn-3d-red`)
- **API 계약 보존**: `checkDraftAction`, `sendProductAction`, XML 빌더, 검증 로직 100% 원본 유지

### 4) 사이드바 & 상단 헤더 (`Sidebar.tsx`, `TopBar.tsx`, `PageHeader.tsx`)
- 11번가 비비드 레드 브랜드 뱃지 및 액티브 메뉴 하이라이트
- 보안 격리 배지: `보안 격리: 내 11번가 판매자 계정만 연동`
- 모바일 햄버거 드로어 완벽 대응

---

## 3. 검증 결과

- **단위 테스트**: `node --test tests/*.test.mjs` (39/39 100% 통과)
- **타입 검사**: `npx tsc --noEmit` (에러 0건)
- **로컬 프로덕션 빌드**: `npm run build` (Next.js 16.4.6 Turbopack 성공)
- **실물 검수 증거 캡처**:
  - 데스크톱: `elevenst-register/docs/evidence/elr_v107_desktop_login.png`
  - 모바일(390px): `elevenst-register/docs/evidence/elr_v107_mobile_login.png` (가로스크롤 0px)
