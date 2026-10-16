# 상세페이지 자동화(15p) (shop-detail-page) v1.08 디자인 및 매뉴얼 인수인계 문서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
배포 URL: `https://shop-detail-page.vercel.app/` (`https://shop-detail-page.vercel.app/guide`)  
적용 버전: `v1.08` (공유 DB `programs.version = 'v1.08'` 동기화 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명

- **공식 스타일 템플릿 명칭**: **`이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio Style)`**  
  *(루트 `DESIGN.md` 카탈로그 1번 포커스 스튜디오 계열의 쇼핑몰·이커머스 특화 에디션)*
- **디자인 모티브 & 컨셉**:
  - 스마트스토어 센터, 쿠팡 윙 등 실제 쇼핑몰 셀러들이 매일 사용하는 관리자 인터페이스의 친숙하고 정돈된 **클린 화이트 & 슬레이트 블루 톤앤매너**.
  - 단순 텍스트 줄글을 탈피하고, **3대 탭 인터랙티브 가이드북 시스템** (5단계 실전 가이드 / 15대 필수 섹션 가이드 / 셀러 성공 꿀팁 & FAQ) 구축.
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

## 3. 주요 컴포넌트 및 레이아웃 구조 (v1.08 전면 고도화)

1. **사이드바 (`components/layout/Sidebar.tsx`)**:
   - `ShoppingBag` 브랜드 엠블럼 + `v1.08` 오렌지 틴트 배지.
   - 번호형 2단계 워크플로우 네비게이션:
     - 1단계: `ScanSearch` 상품 및 상세페이지 분석 (`/products/new`, `text-blue-600`)
     - 2단계: `LayoutGrid` 상세페이지 생성·관리 (`/products`, `text-indigo-600`)
   - 유틸리티 메뉴 (직관적 아이콘 & 프로그램 컬러 토큰):
     - `KeyRound` API키등록·플랫폼연동 (`/settings`, `text-amber-500` 골드 키)
     - `BookOpen` 사용 안내 (`/guide`, `text-blue-600` 가이드북 블루)
   - **접속 계정 정보 및 로그아웃 밀착 배치 (주인님 지시 완료)**:
     - 기존 `mt-auto` 하단 고정을 제거하고, 유틸리티 메뉴 바로 아래(`border-t border-slate-200 pt-3`)에 바짝 밀착.
     - 실시간 접속 표시 녹색 점, 이메일 표시, `LogOut` 아이콘(`text-slate-400` -> hover 시 `text-rose-500`) 탑재.
   - 하단 "✨ Gemini 15단 생성 엔진 탑재" 인포 배너 카드.
   - 모바일 접이식 햄버거 메뉴(`☰` / `✕`) 탑재.

2. **전면 고도화된 인터랙티브 가이드북 (`components/guide/CommerceUsageGuide.tsx`, `/guide`)**:
   - **상단 3대 탭 네비게이션**:
     - `📋 5단계 완벽 실전 가이드`: 시작 전 준비부터 최종 다운로드까지 5단계 로드맵
     - `🧱 15대 필수 섹션 상세 가이드`: 전환율 극대화 15개 섹션별 추천 구성 & 기획 의도 아코디언
     - `💡 셀러 성공 꿀팁 & FAQ`: 실전 꿀팁 4선 & 트러블슈팅 FAQ 아코디언
   - **5대 실전 스텝 디테일 (실제 소스코드 동작 원리 100% 반영)**:
     - **STEP 00. 필수 API 키 등록**: Gemini API 발급, `user_api_keys` 저장 및 세션 즉시 반영.
     - **STEP 01. 상품 등록 & AI 정밀 분석 (`ProductAnalyzeForm`)**: 이미지 누끼 촬영 권장(흰색 배경), 다중 참고 사진 업로드, Gemini 1.5 Flash 분석 엔진, 카테고리/타겟고객/핵심소구점/키워드 자동 추출.
     - **STEP 02. 소구점 & 카피라이팅 검토**: AI가 추출한 기획 내용 셀러 직접 수정/보완 및 확정.
     - **STEP 03. 15단 섹션 이미지 자동 생성 (`SectionImageGrid`)**: Gemini 2.5 Flash / Pro 모델 선택 가이드, 개별 섹션 썸네일 히스토리 바, 개별 재생성 및 사용자 직접 이미지 업로드 교체 지원.
     - **STEP 04. 15단 세로 롱 이미지 병합 & 다운로드**: Canvas API 860px 표준 너비 고화질 PNG 세로 병합, 스마트스토어/쿠팡 즉시 등록.

3. **메인 목록 콘솔 (`app/(dashboard)/products/page.tsx`)**:
   - `15-Section Studio` 배지와 `+ 새 상품 분석하기` 그라디언트 액션 버튼.
   - 빈 화면(Empty State): 3D 패키지 박스 일러스트와 웰컴 가이드 탑재.
   - 상품 카드 그리드: 호버 인터랙션, 상태 배지, 카테고리 태그 표시.

4. **15단 섹션 스튜디오 (`app/(dashboard)/products/[id]/page.tsx`, `SectionImageGrid.tsx`)**:
   - 대표 이미지 요약 헤더 및 15개 섹션 카드 그리드.
   - 섹션별 넘버링 배지(`01~15`), 썸네일 히스토리 바, 개별 재생성 버튼.
   - 하단 고정형 "최종 15단 상세페이지 세로 롱 이미지 병합 & 다운로드" 바.

---

## 4. Microsoft Edge 브라우저 전용 실세션 검수 증거

- **검수 브라우저**: **Microsoft Edge (`msedge.exe`) 전용** (규칙 준수, Chrome 배제).
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 실세션 검수 완료).
- **생성된 검수 아티팩트 (v1.08)**:
  - 데스크톱 매뉴얼 탭 1 (5단계 실전 가이드): `edge_shop_detail_guide_steps_v108.png` (1440 × 900)
  - 데스크톱 매뉴얼 탭 2 (15대 섹션 가이드): `edge_shop_detail_guide_sections_v108.png` (1440 × 900)
  - 데스크톱 매뉴얼 탭 3 (셀러 꿀팁 & FAQ): `edge_shop_detail_guide_faq_v108.png` (1440 × 900)
  - 모바일 반응형 매뉴얼 (375px): `edge_shop_detail_guide_mobile_v108.png` (375 × 812)

---

## 5. 배포 정보
- **배포 플랫폼**: Vercel Production
- **배포 ID**: `dpl_35BMWwMcKgnYyQ27Bn6fTMAdaMFx`
- **배포 도메인**: `https://shop-detail-page.vercel.app` (HTTP 200 정상)
- **DB 동기화**: `programs` 테이블 `shop-detail-page`의 `version` 컬럼 = `v1.08`
