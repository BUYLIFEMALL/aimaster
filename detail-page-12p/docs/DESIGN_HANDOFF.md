# AI 12단 상세페이지 자동화 (detail-page-12p) v1.12 디자인 및 매뉴얼 인수인계서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-25  
작업 CLI: Antigravity (`agy-win-20261025-ext3d`, Windows, Naver Whale)  
배포 URL: `https://detail-12p.buylife.xyz` (`https://detail-12p.buylife.xyz/guide`, `https://detail-12p.buylife.xyz/login`)  
적용 버전: `v1.12` (공유 DB `programs.version = 'v1.12'`, Vercel 프로덕션 Aliased 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명 (2026-10-25 최신 규격 동기화)

- **공식 스타일 템플릿 명칭**: **`이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio Style)`**  
  *(루트 `DESIGN.md` 카탈로그 1번 포커스 스튜디오 계열의 쇼핑몰·이커머스 특화 에디션)*
- **템플릿 3대 명시 사항 (2026-10-25 주인님 지시 반영)**:
  1. **어떤 템플릿인가**: 포커스 스튜디오 계열의 쿠팡 12단 / 스마트스토어 9단 규격 맞춤형 원스톱 상세페이지 기획 및 이미지 렌더링 빌더 템플릿.
  2. **어떤 스타일인가**: 눈의 피로가 없는 클린 슬레이트 화이트(`#f8fafc`) 캔버스 + 신뢰감 있는 로열 블루 & 앰버 골드 악센트, 그리고 누르는 손맛이 있는 **3D 엠보싱 버튼 규격(고채도 2단 그라데이션, 하단 `0 5px 0` 입체 그림자, 4px 물리적 푸시 모션)**.
  3. **왜 이 프로그램에 적용되었는가**: 상품 스펙 분석 ➔ 12단 시퀀스 기획 ➔ 이미지 일괄 렌더링 ➔ 통이미지 합성/다운로드로 이어지는 셀러의 집중 작업 흐름에 최적화되고, 3D 실행 버튼을 통해 긴 호흡의 제작 작업에서 클릭 실수와 인지 피로를 최소화하기 위해 채택됨.

---

## 2. 디자인 시스템 및 컬러 토큰 사양

| 토큰 이름 | 색상 코드 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Canvas Background** | `#f8fafc` | 전체 페이지 부드러운 슬레이트 화이트 배경 |
| **Card Surface** | `#ffffff` | 대시보드 위젯 및 씬 컨테이너 클린 화이트 카드 |
| **Border Subtle** | `#e2e8f0` / `#f1f5f9` | 카드 테두리 및 구분선 (정돈된 1px) |
| **Seller Royal Blue** | `#2563eb` / `#1d4ed8` | 메인 브랜드 액센트 & 3D Primary 버튼 |
| **Emerald Action** | `#059669` / `#047857` | 통이미지 다운로드 3D Emerald 버튼 |
| **Conversion Amber** | `#d97706` / `#b45309` | 구매 전환 배지 및 앰버 3D 버튼 |
| **Primary Text** | `#0f172a` | 고대비 헤더 및 핵심 타이틀 텍스트 |
| **Secondary Text** | `#334155` | 본문 레이블 및 중요 설명 |
| **Muted Text** | `#64748b` / `#94a3b8` | 가이드 메타 정보 및 보조 문구 |

---

## 3. v1.12 신규 리뉴얼 내역 (2026-10-25 3D 버튼 & 퀵액션 규격)

1. **Google Gemini API 키 발급 2단 퀵액션 버튼 세트 (`src/components/ApiKeyModal.tsx`)**:
   - Google AI Studio 키 발급 바로가기(`.btn-create-key`: `https://aistudio.google.com/app/apikey`) + 플랫폼 가입(`.btn-platform-signup`: `https://ai.google.dev/`) 2단 버튼 세트 탑재
   - 「API 키 저장」 버튼을 물리적 키캡 눌림감이 살아있는 3D 엠보싱 버튼(`.btn-3d-primary`)으로 업그레이드
2. **핵심 실행 버튼 전면 3D 엠보싱화 (`src/app/globals.css`, `ProductInputForm.tsx`, `DetailStudioView.tsx`)**:
   - **메인 기획 CTA**: 「쿠팡 규격 12단 / 스마트스토어 9단 상세페이지 원클릭 일괄 기획하기 🚀」 버튼을 고채도 로열 블루 2단 그라데이션 및 `box-shadow: 0 5px 0 #1e40af` 3D 버튼으로 전환
   - **스튜디오 핵심 실행**: 「⚡ 전체 이미지 일괄 렌더링」 (인디고 3D), 「📥 860px 통이미지 다운로드」 (에메랄드 3D) 탑재
   - **상세 목업 전환 액션**: 모바일 프리뷰 하단 「바로구매」 버튼 3D 엠보싱화
3. **연동 & 사용 매뉴얼 (`src/components/DetailGuideView.tsx`, `/guide`)**:
   - 상단 히어로 배너에 3D 엠보싱 원클릭 이동 버튼 탑재
   - 초보 셀러를 위한 1초 키 발급 & 12단 구성법 가이드북 시각화 강화

---

## 4. 네이버 웨일(Whale) 실제 창 포그라운드 실세션 검수 결과

- **검수 환경**: Windows 11, Naver Whale Browser (`whale.exe`), 해상도 1440x900
- **검수 URL 및 상태**:
  1. `https://detail-12p.buylife.xyz/`: 메인 스펙 입력 및 3D 일괄 기획하기 CTA 버튼, 키 관리 메뉴 정상 렌더링 확인 (`dp12_main_whale.png`).
  2. `https://detail-12p.buylife.xyz/guide`: 3D 엠보싱 가이드 배너 버튼 및 5단계 실전 가이드 정상 작동 확인 (`dp12_guide_whale.png`).
