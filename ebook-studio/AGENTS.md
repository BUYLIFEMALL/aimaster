# eBook Studio (ebook-studio) — 인수인계 문서

## 1. 개요
- **프로그램명**: eBook Studio (`ebook-studio`)
- **라이브 도메인**: [https://ebook-studio.buylife.xyz](https://ebook-studio.buylife.xyz) (별칭: `https://ebook.buylife.xyz`)
- **버전**: `v1.10` (포커스 스튜디오 스타일 — 전자책 퍼블리싱 에디션)
- **배포 상태**: Vercel 프로덕션 배포 완료 (`READY`, `https://ebook-studio.buylife.xyz`)
- **주요 기능**:
  1. **01 원본 문서 (스마트 자료 입력 & 목차 엔진)**:
     - 3가지 입력 방식: 파일(TXT, Markdown, DOCX - 브라우저 메모리 파싱), 최대 12개 웹 URL 일괄 스크래핑, 직접 붙여넣기(유튜브 자막 추출 스크립트 복사 지원).
     - 스마트 목차 분할 알고리즘: 파일명 넘버링(01_, 02_) 우선 정렬, 소제목(#, ##) 단위 자동 챕터 분할, 3,500자 초과 자동 분할 `(2)` 표기, Gemini AI 기반 "AI 목차 제안".
  2. **02 전자책 구성 (디자인 & 집필 제어)**:
     - 3대 정리 수준: `상세 정리` (강의안·가이드북용), `핵심 요약` (브리핑·요약노트용), `원문 그대로` (원문 보존 및 서식 정돈).
     - 21종 독서 테마 (밝은 12, 어두운 8, 고대비 1) & 5대 한글 서체 (본고딕, 본명조, 리디바탕, 마루부리, 페이퍼로지).
     - 10대 출판 디자인 프리셋 (문학 에세이, 고전 문고, 출판 원고, 실용 안내서, 기술 문서, 야간 독서, 연구 노트, 접근성 우선, 검증 워크북, 다크 스튜디오).
     - 표지 만들기 프롬프트 4대 공식 템플릿 (체크리스트형, 대비형, 요점 나열형, 인물 대비형).
     - AI 모델 선택: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro` 지원.
  3. **03 실시간 뷰어 & 인라인 챕터 에디터**:
     - 반응형 e-Book 리더기 (모바일 375px, 태블릿 768px, 데스크톱 전체화면).
     - 챕터별 제목, 요약, 마크다운 직접 수정 및 순서 변경, 장 삭제, "이 장만 다시 생성".
  4. **04 멀티 포맷 익스포트 & 웹 배포**:
     - **단일 독립형 HTML**: 외부 서버/인터넷 없이 1개 파일로 평생 영구 실행되는 e-Book.
     - **표준 EPUB**: Apple Books, Google Play 북스, e-잉크 리더기 호환 전자책.
     - **웹 배포용 ZIP**: vercel.com/new/drop 드래그앤드롭 10초 무료 웹사이트 배포 번들.
     - **인쇄 / PDF**: `@media print` 출판 인쇄 규격 페이지 바꿈 및 PDF 즉시 저장.
  5. **독립 비주얼 가이드북 (`/guide`)**:
     - 4단계 출판 파이프라인, 21종 테마 매트릭스, 4대 표지 프롬프트 가이드, FAQ 5종 아코디언, BYOK 보안 안내.

---

## 2. 디자인 시스템 및 UI/UX (포커스 스튜디오 스타일)
- **테마 철학**: 편안한 종이 질감의 캔버스와 프로 출판사를 위한 하이엔드 퍼블리싱 스튜디오
- **컬러 팔레트**:
  - 메인 배경: `#fbfbf9` (Paper Cream) / `#f8f9fa`
  - 작업 서피스: `#ffffff` (Pure Surface)
  - 보더/구분선: `#e2e8f0` / `#cbd5e1`
  - 포인트 인디고: `#4f46e5` / `#6366f1` (Primary Brand & Accent)
  - 서브 바이올렛: `#7c3aed` / `#8b5cf6` (Publishing Glow)
  - 앰버 골드: `#f59e0b` (Guide Badge & Preset Highlight)
  - 에메랄드 그린: `#10b981` (Security Clean Badge)
- **핵심 컴포넌트**:
  - `.studio-hero`: 인디고 그라데이션 및 매뉴얼/API 키 빠른 바로가기 배너
  - `.kpi-card`: 3대 핵심 성능 지표 카드 (스마트 입력&목차, 21종 테마&5대 서체, 4대 멀티포맷 발행)
  - 사이드바 브랜드 뱃지: `v1.10 PUBLISHING LAB`
  - 4단계 집필 워크플로우 넘버링 (`01 원본 문서`, `02 전자책 구성`, `03 실시간 뷰어`, `04 내보내기 & 공유`)
  - `/guide` 연동 배너: `📖 연동 & 사용 매뉴얼` 골드 배지 메뉴

---

## 3. 핵심 파일 구조
- `src/lib/template.ts`: 독립형 단일 HTML 번들러 (21종 테마, 목차, 검색 엔진 인라인 패키징)
- `src/lib/types.ts`: EbookProject, Chapter, ThemeType 등 전체 도메인 타입
- `src/lib/version.ts`: APP_VERSION (`v1.10`), APP_NAME, APP_SLUG
- `src/app/globals.css`: 포커스 스튜디오 디자인 토큰 및 종이 질감 캔버스 CSS
- `src/app/guide/page.tsx`: 독립 비주얼 가이드북 및 FAQ 아코디언 페이지
- `src/components/studio/StudioWorkspace.tsx`: `.studio-hero` 배너 및 3대 KPI를 포함한 메인 작업대
- `src/components/studio/SourceInputPanel.tsx`: 파일/URL/직접 입력 및 스마트 목차 설계기
- `src/components/studio/StyleDesignPanel.tsx`: 21종 테마, 5대 서체, 10대 프리셋 및 AI 집필 제어
- `src/components/studio/ChapterEditorPanel.tsx`: 챕터별 인라인 에디터 및 재집필 제어
- `src/components/studio/LivePreviewPanel.tsx`: 실시간 전자책 뷰어
- `src/components/studio/ExportPublishPanel.tsx`: HTML, EPUB, ZIP, 인쇄/PDF 4대 내보내기
- `src/components/layout/Sidebar.tsx`: 표준 사이드바 및 모바일 슬라이드 드로어
- `src/components/modals/SettingsModal.tsx`: 회원 본인 Gemini API 키 연동 모달

---

## 4. 플랫폼 연동 규칙 준수
- **최상위 불변 규칙 (Rule 00 — 회원 본인 계정 및 API 키 원칙)**:
  - 수동 작성 및 내보내기는 완전 무료이며, AI 집필 호출 시 회원 본인이 등록한 Google Gemini API 키로만 구동.
  - 운영자 키 폴백이나 우회 로직 일절 없음.
- **원고 데이터 100% 로컬 격리 및 보안**:
  - 원본 문서 파싱 및 원고는 브라우저 로컬 저장소에만 격리 보관되며 서버에 저장되지 않음.

---

## 5. 실세션 검증 증거 (Microsoft Edge 최전면 포그라운드)
- **일반 회원 테스트 계정**: `buylifemall@naver.com` 실세션 인증 쿠키 주입 완료
- **검수 브라우저**: Microsoft Edge (`headless: false`, `--start-maximized`)
- **검수 스크립트**: `scripts/capture_edge_ebook_v110.cjs`
- **6종 검증 캡처 목록**:
  1. 메인 스튜디오 전경: `edge_ebook_desktop_studio_v110.png`
  2. 원본 문서 입력 패널: `edge_ebook_desktop_inputs_v110.png`
  3. 비주얼 가이드북 상단: `edge_ebook_desktop_guide_v110.png`
  4. 가이드북 FAQ 아코디언: `edge_ebook_desktop_guide_faq_v110.png`
  5. API 키 설정 모달: `edge_ebook_desktop_settings_v110.png`
  6. 모바일 반응형 뷰포트(375px): `edge_ebook_mobile_guide_v110.png`
- **화면 유지**: 검수 완료 후 실제 Edge 브라우저 창 최전면 10분간 유지 확인 완료.

---

## 6. 버전 및 DB 이력
- `v1.10` (2026-10-19):
  - 포커스 스튜디오 스타일 전면 리뉴얼 (전자책 퍼블리싱 에디션)
  - 독립 비주얼 가이드북 (`/guide`) 신설
  - `package.json` (`1.10.0`), `src/lib/version.ts` (`v1.10`), Supabase DB `programs` (`slug: ebook-studio`, `version: v1.10`) 3중 동기화 완비.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
