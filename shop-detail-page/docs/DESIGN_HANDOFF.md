# 상세페이지 자동화(15p) (shop-detail-page) v1.06 디자인 인수인계 문서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
배포 URL: `https://shop-detail-page.vercel.app/` (`https://shop-detail-page.vercel.app/products`)  
적용 버전: `v1.06` (공유 DB `programs.version = 'v1.06'` 동기화 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명

- **공식 스타일 템플릿 명칭**: **`이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio Style)`**  
  *(루트 `DESIGN.md` 카탈로그 1번 포커스 스튜디오 계열의 쇼핑몰·이커머스 특화 에디션)*
- **디자인 모티브 & 컨셉**:
  - 스마트스토어 센터, 쿠팡 윙 등 실제 쇼핑몰 셀러들이 매일 사용하는 관리자 인터페이스의 친숙하고 정돈된 **클린 화이트 & 슬레이트 블루 톤앤매너**.
  - 단순 텍스트 줄글을 탈피하고, **4단계 전자동 상세페이지 파이프라인 다이어그램** 및 **15대 필수 섹션 블록 맵**을 전면 시각화.
  - 생성된 상품 이미지와 섹션별 결과물의 실제 색감과 화질을 왜곡 없이 점검할 수 있는 **100% 퓨어 화이트 캔버스** 환경 구현.

---

## 2. 디자인 시스템 및 컬러 토큰 사양

| 토큰 이름 | 색상 코드 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Canvas Background** | `#f8fafc` | 전체 페이지 부드러운 슬레이트 화이트 배경 |
| **Card Surface** | `#ffffff` | 대시보드 위젯 및 섹션 컨테이너 클린 화이트 카드 |
| **Border Subtle** | `#e2e8f0` / `#f1f5f9` | 카드 테두리 및 구분선 (정돈된 1px) |
| **Seller Royal Blue** | `#2563eb` | 메인 브랜드 액센트 (네이버/쿠팡 셀러 신뢰감) |
| **Indigo Gradient** | `#4f46e5` | 헤더 버튼 및 주요 액션 그라디언트 |
| **Conversion Coral** | `#f97316` | 구매 전환 및 버전 배지 오렌지 포인트 |
| **Primary Text** | `#0f172a` | 고대비 헤더 및 핵심 타이틀 텍스트 |
| **Secondary Text** | `#334155` | 본문 레이블 및 중요 설명 |
| **Muted Text** | `#64748b` / `#94a3b8` | 가이드 메타 정보 및 보조 문구 |

---

## 3. 주요 컴포넌트 및 레이아웃 구조

1. **사이드바 (`components/layout/Sidebar.tsx`)**:
   - `SHOP DETAIL STUDIO` 브랜드 엠블럼 + `v1.06` 오렌지 틴트 배지.
   - 번호형 2단계 워크플로우 네비게이션:
     - 1단계: 🔍 상품 및 상세페이지 분석 (`/products/new`)
     - 2단계: 🖼️ 상세페이지 생성·관리 (`/products`)
   - 하단 "✨ Gemini 15단 생성 엔진 탑재" 인포 배너 카드.
   - 접속 계정 정보, 실시간 접속 표시 점, 정돈된 로그아웃 버튼 밀착 배치.
   - 모바일 접이식 햄버거 메뉴(`☰`) 탑재.
2. **비주얼 가이드북 (`components/guide/CommerceUsageGuide.tsx`)**:
   - **4단계 전자동 상세페이지 파이프라인**: STEP 01(등록) ➔ STEP 02(분석) ➔ STEP 03(15단 생성) ➔ STEP 04(롱 이미지 병합).
   - **15대 필수 섹션 블록 맵**: 01. 인트로 헤더부터 15. 구매전환 CTA까지 15개 섹션 아이콘 칩 배치.
   - 셀러 성공 꿀팁 아코디언 (정방형 누끼 사진, 개별 재생성 팁, 과대광고 심의 안내).
3. **메인 목록 콘솔 (`app/(dashboard)/products/page.tsx`)**:
   - `15-Section Studio` 배지와 `+ 새 상품 분석하기` 그라디언트 액션 버튼.
   - 빈 화면(Empty State): 3D 패키지 박스 일러스트와 웰컴 가이드 탑재.
   - 상품 카드 그리드: 호버 인터랙션, 상태 배지, 카테고리 태그 표시.
4. **상품 분석/등록 콘솔 (`app/(dashboard)/products/new/page.tsx`, `ProductAnalyzeForm.tsx`)**:
   - 드래그앤드롭 대표 사진 업로더 및 다중 참고 이미지 박스.
   - Gemini AI 분석 로딩 인디케이터 및 소구점 정밀 검토 폼.
5. **15단 섹션 스튜디오 (`app/(dashboard)/products/[id]/page.tsx`, `SectionImageGrid.tsx`)**:
   - 대표 이미지 요약 헤더 및 15개 섹션 카드 그리드.
   - 섹션별 넘버링 배지(`01~15`), 썸네일 히스토리 바, 개별 재생성 버튼.
   - 하단 고정형 "최종 15단 상세페이지 세로 롱 이미지 병합 & 다운로드" 바.

---

## 4. Microsoft Edge 브라우저 전용 실세션 검수 증거

- **검수 브라우저**: **Microsoft Edge (`msedge.exe`) 전용** (규칙 준수, Chrome 배제).
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 실세션 검수 완료).
- **생성된 검수 아티팩트**:
  - 데스크톱 메인 목록: `edge_shop_detail_desktop_v106.png` (1440 × 900)
  - 데스크톱 새 상품 폼: `edge_shop_detail_new_desktop_v106.png` (1440 × 900)
  - 모바일 메인 반응형: `edge_shop_detail_mobile_v106.png` (375 × 812)

---

## 5. 배포 정보
- **배포 플랫폼**: Vercel Production
- **배포 ID**: `dpl_FtwzTAdhuNr7aUnGtCZCwpM9ddRp`
- **배포 도메인**: `https://shop-detail-page.vercel.app` (HTTP 200 정상)
- **DB 동기화**: `programs` 테이블 `shop-detail-page`의 `version` 컬럼 = `v1.06`
