# 상세페이지 자동화(15p) (shop-detail-page) v1.34 디자인 및 매뉴얼 인수인계 문서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-25  
작업 CLI: Antigravity (`agy-win-20261025-ext3d`, Windows, Naver Whale)  
배포 URL: `https://shop-detail-page.buylife.xyz/` (`https://shop-detail-page.buylife.xyz/guide`, `https://shop-detail-page.buylife.xyz/settings`)  
적용 버전: `v1.34` (공유 DB `programs.version = 'v1.34'`, Vercel 프로덕션 Aliased 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명 (2026-10-25 최신 규격 동기화)

- **공식 스타일 템플릿 명칭**: **`이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio Style)`**  
  *(루트 `DESIGN.md` 카탈로그 1번 포커스 스튜디오 계열의 쇼핑몰·이커머스 특화 에디션)*
- **템플릿 3대 명시 사항 (2026-10-25 주인님 지시 반영)**:
  1. **어떤 템플릿인가**: 이커머스 상세페이지 기획/제작자를 위한 포커스 스튜디오 계열의 원스톱 대시보드 및 12P/15P 비주얼 섹션 빌더 템플릿.
  2. **어떤 스타일인가**: 스마트스토어/쿠팡 윙 톤앤매너, 클린 슬레이트 화이트(`#f8fafc`) 배경 + 로열 블루 & 앰버 골드 악센트, 그리고 누르는 손맛이 살아있는 **3D 엠보싱 버튼 규격(고채도 2단 그라데이션, 하단 `0 5px 0` 입체 그림자, 4px 물리적 푸시 모션)**.
  3. **왜 이 프로그램에 적용되었는가**: 상세페이지 제작은 AI 소구점 분석, 섹션별 카피/이미지 생성, 전체 롱이미지 병합 및 ZIP 다운로드 등 단계적 생산성이 핵심이므로, 시각적 왜곡이 없는 100% 퓨어 화이트 작업 캔버스와 직관적인 3D 실행 버튼을 통해 이커머스 셀러의 작업 몰입도와 실수를 최소화하기 위해 채택됨.

---

## 2. 디자인 시스템 및 컬러 토큰 사양

| 토큰 이름 | 색상 코드 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Canvas Background** | `#f8fafc` | 전체 페이지 부드러운 슬레이트 화이트 배경 |
| **Card Surface** | `#ffffff` | 대시보드 위젯 및 섹션 컨테이너 클린 화이트 카드 |
| **Border Subtle** | `#e2e8f0` / `#f1f5f9` | 카드 테두리 및 구분선 (정돈된 1px) |
| **Seller Royal Blue** | `#2563eb` | 메인 브랜드 액센트 (네이버/쿠팡 셀러 신뢰감) |
| **Indigo Gradient** | `#4f46e5` | 헤더 버튼 및 주요 액션 그라디언트 |
| **Conversion Coral/Amber** | `#f97316` / `#d97706` | 구매 전환 배지 및 앰버 3D 버튼 베이스 |
| **Primary Text** | `#0f172a` | 고대비 헤더 및 핵심 타이틀 텍스트 |
| **Secondary Text** | `#334155` | 본문 레이블 및 중요 설명 |
| **Muted Text** | `#64748b` / `#94a3b8` | 가이드 메타 정보 및 보조 문구 |

---

## 3. v1.34 신규 리뉴얼 내역 (2026-10-25 3D 버튼 & 퀵액션 규격)

1. **4대 플랫폼 API 키 발급 2단 퀵액션 버튼 세트 (`components/settings/ApiKeyRow.tsx`)**:
   - `Gemini`: API 키 발급(`https://aistudio.google.com/app/apikey`) + Google AI Studio 가입
   - `OpenAI`: API 키 발급(`https://platform.openai.com/api-keys`) + OpenAI 가입
   - `Claude`: API 콘솔 바로가기(`https://console.anthropic.com/settings/keys`) + Anthropic 가입
   - `Replicate`: API 토큰 발급(`https://replicate.com/account/api-tokens`) + Replicate 가입
   - 컴팩트 2단 플렉스 레이아웃 및 3D 호버/눌림 피드백 적용.
2. **주요 링크 및 핵심 실행 버튼 3D 엠보싱 규격화 (`app/globals.css`)**:
   - `.btn-3d-primary`: 로열 인디고 3D 엠보싱 버튼 (`box-shadow: 0 5px 0 #3730a3`)
   - `.btn-3d-amber`: 앰버 골드 3D 엠보싱 버튼 (`box-shadow: 0 5px 0 #b45309`)
   - `.btn-create-key`: 사이언/블루 2단 키 생성 바로가기 버튼
   - `.btn-platform-signup`: 넷/그레이 2단 플랫폼 가입 바로가기 버튼
3. **상세페이지 핵심 작업 화면 3D 버튼 탑재**:
   - `app/(dashboard)/products/page.tsx`: 신규 상품 등록 CTA 버튼 3D화 (`btn-3d-primary`).
   - `components/products/ProductAnalyzeForm.tsx`: AI 소구점 심층 분석 버튼 및 상품 정보 저장 버튼 3D화.
   - `components/products/SectionImageGrid.tsx`: 12P 섹션별 생성 버튼, 전체 섹션 롱이미지 병합 버튼, ZIP 다운로드 버튼 3D 엠보싱화.
4. **커머스 매뉴얼(`/guide`) 3D 엠보싱 원클릭 이동 버튼 탑재 (`components/guide/CommerceUsageGuide.tsx`)**:
   - 상단 히어로 배너에 3D 엠보싱 원클릭 이동 버튼 탑재.

---

## 4. 네이버 웨일(Whale) 실제 창 포그라운드 실세션 검수 결과

- **검수 환경**: Windows 11, Naver Whale Browser (`whale.exe`), 해상도 1440x900
- **검수 URL 및 상태**:
  1. `https://shop-detail-page.buylife.xyz/products`: 상품 관리 및 신규 등록 CTA 3D 버튼 정상 렌더링 확인 (`sdp_products_whale.png`).
  2. `https://shop-detail-page.buylife.xyz/settings`: 4대 플랫폼 API 키 발급 2단 퀵액션 버튼 세트 및 3D 스타일 정상 렌더링 확인 (`sdp_settings_whale.png`).
  3. `https://shop-detail-page.buylife.xyz/guide`: 3D 엠보싱 가이드 배너 버튼 및 5단계 실전 가이드 정상 작동 확인 (`sdp_guide_whale.png`).
