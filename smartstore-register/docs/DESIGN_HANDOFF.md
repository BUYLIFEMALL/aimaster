# smartstore-register 1안 110번 공식 채택 전면 구현 인수인계 (DESIGN_HANDOFF.md)

> **일시**: 2026-11-14 22:40 (KST)  
> **세션**: `agy-win-ssr-v1` (역할: `design`)  
> **주인님 지시**: 「1안으로 진행해」 (110. 네이버 스마트스토어 오리지널 그린 & 화이트 셀러 스튜디오 공식 채택)  
> **프로그램 버전**: `v1.28` (`smartstore-register`)

---

## 1. 개요 및 반영 사항
- **110번 디자인 정체성 수립**:
  - 네이버 스마트스토어 센터(`sell.smartstore.naver.com`) 고유의 시그니처 그린(`#03C75A`, `#1EC800`)과 클린 화이트/쿨 그레이 톤으로 전면 교체
  - 3D 엠보싱 입체 네이버 그린 버튼 (`.btn-3d-primary`, `.btn-3d-naver`, `.btn-3d-secondary`) 전역 적용
  - 모든 버튼에 전역 1행 유지 헌장(`white-space: nowrap !important;`) 엄격 준수

## 2. 4대 화면 개편 상세
1. **메인 등록 관제 스튜디오 (`/home`)**:
   - 상단 실시간 파이프라인 배너: `상세페이지 자동화 상품 ➔ 네이버 스마트스토어 원클릭 자동 등록`
   - 4대 실시간 KPI 관제 카드:
     1) 스토어 기본 설정 (택배사, A/S 번호 등)
     2) 등록 대기 상품 (동기화된 상품 수)
     3) 30일 등록 기록 (성공률 % SUCCESS 및 건수)
     4) 판매자센터 화면 점검 실시간 관제 (`HealthCard`)
   - 3단계 등록 프로세스 카드 덱 및 최근 등록 전송 내역 테이블
2. **상품 목록 및 배치 전송 (`/products`)**:
   - `BatchRegister`: 네이버 그린 액센트 체크박스, 선택 카드 엠보싱 하이라이트
   - 하단 고정 연속 전송 바: 3D 네이버 버튼 및 전송 상태 배지 적용
3. **상품 상세 등록 스튜디오 (`/products/[id]`)**:
   - `RegisterForm`: 카테고리 검색, 판매가/할인가 입력, 구매/리뷰 혜택 바로가기 안내 배너
   - `AttributePicker`: 네이버 그린 톤의 「🔎 이 카테고리 속성 불러오기」 및 AI 속성 추천
   - 대표 사진 및 상세 섹션 이미지 썸네일 그리드 덱 (`ring-2 ring-[#03C75A]`)
4. **스토어 기본값 설정 (`/defaults`)**:
   - `DefaultsForm`: 네이버페이 포인트/구매 혜택, 배송비/반품 배송비, 판매자 A/S 덱의 네이버 센터 스타일 일체화
5. **셀러 마스터 가이드 (`/guide`)**:
   - 4단계 핵심 프로세스 매뉴얼 덱 및 네이버 그린 시그니처 뱃지
6. **5단계 표준 로그인 폼 (`/login`)**:
   - 네이버 N 시그니처 로고, 알약 캡슐 뱃지, 2단 탭, 3D 엠보싱 로그인 버튼, 1행 약관 규격 완비

---

## 3. 검증 결과
- **단위 테스트**: `npm --prefix smartstore-register test` ➔ 27 / 27 전수 통과 (`pass 27, fail 0`)
- **타입 검사**: `npx --prefix smartstore-register tsc --noEmit` ➔ 오류 0건 통과
- **프로덕션 빌드**: `npm --prefix smartstore-register run build` ➔ Next.js 16.4.3 Turbopack 빌드 성공
- **실물 검수**:
  - 데스크톱 1440px 고화질 캡처 확인
  - 모바일 390px 가로스크롤 0px 오버플로우 검증 통과 (너비 390px / 클라이언트 390px)
- **최상위 0번 규칙 고지 & 저장공간 위젯 탑재 확인**:
  - `node scripts/apply-source-notice.mjs --check smartstore-register` 통과
  - `<Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />` 확인

---

## 4. 파일 변경 목록
- `smartstore-register/src/app/globals.css` (110번 CSS 변수, 3D 엠보싱 버튼 테마)
- `smartstore-register/src/components/layout/Sidebar.tsx` (N 스마트스토어 센터 브랜드 및 네비게이션)
- `smartstore-register/src/app/(dashboard)/home/page.tsx` (110번 메인 관제 스튜디오 및 4대 KPI)
- `smartstore-register/src/components/BatchRegister.tsx` (선택 카드 및 연속 전송 바 개편)
- `smartstore-register/src/components/DefaultsForm.tsx` (기본값 설정 카드 덱 스타일화)
- `smartstore-register/src/components/RegisterForm.tsx` (상품 등록 폼 및 3D 전송 버튼)
- `smartstore-register/src/components/AttributePicker.tsx` (속성 검색 버튼 톤앤매너)
- `smartstore-register/src/components/HealthCard.tsx` (KPI 관제 카드 일체화)
- `smartstore-register/src/app/(dashboard)/guide/page.tsx` (가이드 뷰 네이버 그린 일체화)
- `smartstore-register/src/app/(dashboard)/products/[id]/page.tsx` (상세 검수 뷰 스타일링)
- `smartstore-register/src/app/(auth)/login/page.tsx` (5단계 표준 로그인 폼 N 테마)
- `smartstore-register/package.json` (v1.28.0)
- `smartstore-register/docs/DESIGN_HANDOFF.md` (인수인계 문서)
