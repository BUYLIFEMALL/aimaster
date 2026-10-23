# 20번 eBook Studio (ebook-studio) — 디자인 리뉴얼 인수인계서 (v1.10)

## 1. 개요 및 변경 목적
- **대상 프로그램**: 20번 eBook Studio (`ebook-studio`)
- **라이브 서비스 도메인**: [https://ebook-studio.buylife.xyz](https://ebook-studio.buylife.xyz) (별칭: [https://ebook.buylife.xyz](https://ebook.buylife.xyz))
- **가이드북 URL**: [https://ebook-studio.buylife.xyz/guide](https://ebook-studio.buylife.xyz/guide)
- **적용 버전**: `v1.10`
- **테마 컨셉**: **포커스 스튜디오 스타일 — 전자책 퍼블리싱 에디션 (`Focus Studio Style — eBook Publishing Edition`)**
- **목적**: 장시간 독서와 출판 집필에 최적화된 편안한 종이 질감의 크림/소프트 화이트 베이스와 딥 인디고 & 바이올렛 포인트 컬러를 적용하고, 독립 비주얼 가이드북(`/guide`) 및 3대 KPI 배너를 완비하여 완성도 높은 디지털 퍼블리싱 스튜디오로 고도화.

---

## 2. 디자인 시스템 상세 규격

### 2.1 컬러 팔레트 & 디자인 토큰
- 메인 배경: `#fbfbf9` (Paper Cream) / `#f8f9fa`
- 서피스/패널: `#ffffff` (Pure White)
- 테두리 및 구분선: `#e2e8f0` / `#cbd5e1`
- 메인 인디고: `#4f46e5` / `#6366f1`
- 서브 바이올렛: `#7c3aed` / `#8b5cf6`
- 앰버 골드: `#f59e0b`
- 에메랄드 그린: `#10b981`
- 텍스트 주색상: `#1e293b` / 보조색상: `#64748b`

### 2.2 메인 화면 및 주요 컴포넌트 리뉴얼
1. **`.studio-hero` 웰컴 배너**:
   - 좌측 작업 패널 최상단에 배치되어 버전 태그(`v1.10 Focus Publishing Studio`), 매뉴얼 바로가기(`[📖 사용 매뉴얼]`) 및 `[API 키]` 설정 버튼 제공.
2. **3대 핵심 성능 지표 카드 (`.kpi-card`)**:
   - `스마트 입력 & 목차`: TXT·DOCX·URL, 소제목·분량 자동 분할
   - `21종 테마 & 5대 서체`: 10대 출판 프리셋, 실시간 반응형 뷰어
   - `4대 멀티 포맷 발행`: HTML·EPUB·ZIP, 인쇄 규격 PDF 지원
3. **사이드바 메뉴 표준화**:
   - 브랜드 타이틀 아래 `v1.10 PUBLISHING LAB` 인디고 뱃지 배치
   - 4단계 집필 워크플로우 넘버링 (`01 원본 문서`, `02 전자책 구성`, `03 실시간 뷰어`, `04 내보내기 & 공유`)
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 골드 뱃지 메뉴 및 모바일 햄버거 토글 드로어 완비
4. **독립 비주얼 가이드북 (`/guide`) 신설**:
   - 4단계 올인원 전자책 출판 파이프라인 (STEP 01 ~ STEP 04)
   - 21종 테마 & 10대 출판 프리셋 매트릭스 해설
   - 4대 멀티 포맷 익스포트 상세 규격 가이드
   - FAQ 5종 아코디언 인터랙션
   - 100% 회원 본인 키 원칙 (BYOK) 및 원고 무저장 보안 보증 배너 탑재

---

## 3. 실세션 검증 (Microsoft Edge 최전면 포그라운드)
- **일반 회원 테스트 계정**: `buylifemall@naver.com`
- **검수 브라우저**: Microsoft Edge 최전면 포그라운드 (`--start-maximized`)
- **보존된 6종 아티팩트 캡처**:
  1. `edge_ebook_desktop_studio_v110.png` (메인 스튜디오 전경 및 3대 KPI 배너)
  2. `edge_ebook_desktop_inputs_v110.png` (원본 자료 입력 및 목차 분할 패널)
  3. `edge_ebook_desktop_guide_v110.png` (독립 비주얼 가이드북 상단 및 4단계 파이프라인)
  4. `edge_ebook_desktop_guide_faq_v110.png` (가이드북 테마 매트릭스 및 FAQ 아코디언 오픈)
  5. `edge_ebook_desktop_settings_v110.png` (API 키 설정 모달)
  6. `edge_ebook_mobile_guide_v110.png` (모바일 375x812 반응형 가이드북 뷰)
- **10분 화면 유지**: 완료 후 실제 브라우저 창 최전면 10분 유지 완료.
