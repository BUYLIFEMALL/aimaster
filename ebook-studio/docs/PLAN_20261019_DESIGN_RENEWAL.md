# 20번 eBook Studio — 디자인 리뉴얼 사전 개발 플랜 (PLAN_20261019_DESIGN_RENEWAL.md)

- **작성 일자**: 2026-10-19
- **대상 프로그램**: 20번 eBook Studio (`ebook-studio`)
- **공식 서비스 도메인**: [https://ebook-studio.buylife.xyz](https://ebook-studio.buylife.xyz)
- **적용 목표 버전**: `v1.10` (기존 v1.09 ➔ v1.10 동기화)
- **공식 디자인 템플릿**: **포커스 스튜디오 스타일 — 전자책 퍼블리싱 에디션 (Focus Studio Style — eBook Publishing Edition)**

---

## 1. 추진 배경 및 리뉴얼 목표

1. **포커스 스튜디오 스타일 완성 (`DESIGN.md` 1번 템플릿)**:
   - 종이 질감의 편안하고 집중도 높은 크림/소프트 화이트 배경(`bg-[#fbfbf9]` / `bg-[#f8f9fa]`), 딥 인디고(`#4f46e5`) & 바이올렛(`#7c3aed`) 포인트 컬러를 정립.
   - 작가와 출판 기획자를 위한 프리미엄 전자책 집필 스튜디오 UI/UX 구축.
2. **상단 `.studio-hero` 웰컴 배너 및 3대 핵심 성능 지표 카드 탑재**:
   - `4대 스마트 입력 & 목차 엔진`: 파일(TXT/MD/DOCX), 12개 URL 일괄 수집, 붙여넣기, AI 목차 분할.
   - `21종 테마 & 10대 출판 프리셋`: 실시간 반응형 프리뷰 및 5대 한글 서체 최적화.
   - `4대 멀티 포맷 익스포트`: 단일 독립형 HTML, 표준 EPUB, 인쇄/PDF 최적화, Vercel Drop 웹 배포 ZIP.
3. **독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 신설 (`DESIGN.md` 9번 원칙)**:
   - 4단계 전자책 출판 파이프라인 시각화 (Step 1 자료 입력 ➔ Step 2 목차/구성 ➔ Step 3 AI 집필/교정 ➔ Step 4 멀티포맷 발행).
   - 21종 테마 & 5대 서체 매트릭스 해설.
   - 표지 만들기 프롬프트 4대 공식 가이드.
   - FAQ 5종 아코디언 인터랙션.
   - 100% 회원 본인 API 키 원칙 (BYOK) 및 데이터 보안 보증 배너 탑재.
4. **사이드바 메뉴 표준화**:
   - 브랜드 뱃지 `v1.10 PUBLISHING LAB` 발광 칩.
   - 4단계 집필 워크플로우 넘버링 (`01 원본 문서`, `02 전자책 구성`, `03 실시간 뷰어`, `04 내보내기 & 공유`).
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 골드 하이라이트 배지 메뉴 신설.
   - 모바일 햄버거 토글 드로어 완비.
5. **버전 및 DB 3중 동기화 (`v1.10`)**:
   - `package.json` (`1.10.0`), `src/lib/version.ts` (`v1.10`), Supabase DB `programs` (`slug: ebook-studio`, `version: v1.10`) 동기화.

---

## 2. 세부 구현 단계 및 작업 순서

```
[1단계: 사전 플랜 수립 및 DB 동기화]
  - docs/PLAN_20261019_DESIGN_RENEWAL.md 작성
  - Supabase DB programs 테이블 version 'v1.10' 갱신
  - package.json (1.10.0), src/lib/version.ts (v1.10) 갱신
  - docs/ACTIVE_WORK.md 및 DESIGN.md 20번 "🔵 작업 중" 등록

[2단계: 디자인 토큰 및 글로벌 테마 구축]
  - src/app/globals.css: 포커스 스튜디오 스타일 크림/소프트 화이트 토큰 시스템 및 종이 질감 캔버스 구축
  - src/app/layout.tsx: 포커스 스튜디오 테마 글로벌 래핑 및 폰트 설정

[3단계: 사이드바 및 레이아웃 표준화]
  - src/components/layout/Sidebar.tsx: v1.10 PUBLISHING LAB 뱃지, 1-2-3-4 넘버링, /guide 골드 메뉴, 모바일 햄버거 토글

[4단계: 메인 스튜디오 UI 고도화]
  - src/components/studio/StudioWorkspace.tsx: 상단 .studio-hero 웰컴 배너 및 3대 핵심 KPI 지표 카드 탑재
  - SourceInputPanel, StyleDesignPanel, ChapterEditorPanel, LivePreviewPanel, ExportPublishPanel의 포커스 스튜디오 스타일 리파인

[5단계: 독립 비주얼 가이드북 (/guide/page.tsx) 신설]
  - 4단계 전자책 출판 파이프라인 다이어그램
  - 21종 테마 & 10대 출판 프리셋 가이드
  - 표지 프롬프트 4대 템플릿 안내
  - FAQ 5종 아코디언 및 BYOK 보안 원칙 보증 배너 탑재

[6단계: 빌드 및 프로덕션 배포]
  - npm run build (Next.js Turbopack 빌드 무결성 검증)
  - npx vercel --prod --yes (https://ebook-studio.buylife.xyz 배포)

[7단계: Microsoft Edge 최전면 포그라운드 실세션 검수]
  - 일반 회원 테스트 계정(buylifemall@naver.com) SSR 세션 쿠키 주입
  - 6종 필수 캡처 보존 및 화면 최전면 10분 유지

[8단계: 규격 인수인계 문서 6종 완비 및 Git 원격 푸시]
  - AGENTS.md, README.md, DESIGN_HANDOFF.md, IMPROVEMENTS.md, IMPROVEMENT_BACKLOG.md, PLAN 동기화
  - DESIGN.md 현황판 완료 갱신, ACTIVE_WORK.md 정리, HANDOFF.md 보고서 추가
  - Git 커밋 및 origin/master 원격 푸시
```

---

## 3. 검수 계획 및 성공 기준

- **로컬 빌드**: `npm run build` Turbopack 빌드 무오류 통과.
- **Vercel 배포**: `https://ebook-studio.buylife.xyz` 프로덕션 READY 상태.
- **Edge 검수 (6종 필수 캡처 보존)**:
  1. `edge_ebook_desktop_studio_v110.png` (메인 스튜디오 전경 및 3대 KPI 배너)
  2. `edge_ebook_desktop_inputs_v110.png` (원본 자료 입력 및 목차 분할 영역)
  3. `edge_ebook_desktop_guide_v110.png` (독립 비주얼 가이드북 상단 및 4단계 파이프라인)
  4. `edge_ebook_desktop_guide_faq_v110.png` (가이드북 테마 매트릭스 및 FAQ 아코디언 오픈)
  5. `edge_ebook_desktop_settings_v110.png` (API 키 설정 모달)
  6. `edge_ebook_mobile_guide_v110.png` (모바일 375px 반응형 가이드북 뷰)
- **화면 유지**: Edge 브라우저 창 최전면 포그라운드로 10분간 유지.

---

## 4. 최종 구현 및 검수 결과 (2026-10-19 완료)
- **로컬 빌드**: `npm run build` Turbopack 빌드 성공 (경로 9개 완벽 생성, exit code 0).
- **Vercel 프로덕션 배포**: `https://ebook-studio.buylife.xyz` (배포 ID: `dpl_GzSRfYzdi9UdfiTsVJyJZZQocNwn`, `READY`).
- **Edge 최전면 포그라운드 실세션 검수**:
  - 일반 회원 테스트 계정(`buylifemall@naver.com`) SSR 인증 쿠키 주입 완료.
  - 6종 캡처 보존 완료:
    1. `edge_ebook_desktop_studio_v110.png`
    2. `edge_ebook_desktop_inputs_v110.png`
    3. `edge_ebook_desktop_guide_v110.png`
    4. `edge_ebook_desktop_guide_faq_v110.png`
    5. `edge_ebook_desktop_settings_v110.png`
    6. `edge_ebook_mobile_guide_v110.png`
  - 실제 Edge 브라우저 창 최전면 10분 유지 완료.
- **문서화**: 규격 인수인계 문서 6종(`AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN`) 완비.

