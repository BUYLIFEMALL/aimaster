# AI 문서번역 자동화 (document-translator) 디자인 리뉴얼 인수인계서

## 1. 개요 및 버전 정보
- **프로그램명**: AI 문서번역 자동화 (`document-translator`)
- **도메인**: [https://document-translator.buylife.xyz](https://document-translator.buylife.xyz)
- **최신 버전**: `v1.20` (2026-10-19 갱신 완료)
- **적용 테마**: **포커스 스튜디오 스타일 — 소프트 크림 문서번역 에디션 (Focus Studio Soft Cream Translator Edition)**
- **주요 색상 팔레트**:
  - 소프트 크림 (`#fdfbf7`, `--cream-bg`)
  - 딥 인디고 & 바이올렛 (`#4f46e5`, `--brand`)
  - 에메랄드 틸 (`#0d9488`, `--accent-teal`)
  - 웜 앰버 (`#d97706`, `--accent-amber`)
  - 차콜 잉크 (`#1e293b`, `--ink`)
  - 슬레이트 라인 (`#e2e8f0`, `--line`)

---

## 2. 주요 개선 내용 (DESIGN.md 10대 원칙 준수)
1. **사이드바 내비게이션 & 가이드북 메뉴 고도화 (`DESIGN.md` 9번 필수 원칙)**:
   - `/guide` 라우트 기반 `📖 연동 & 사용 매뉴얼` 메뉴 항목 강조 및 상세 디테일 갱신.
   - 상단 로고에 `v1.20` 인디고 배지 및 4단계 파이프라인 진행 상태 인디케이터 장착.
   - 모바일 56px 헤더 및 햄버거 토글 슬라이드 오버레이 드로어 개선.
2. **대시보드 히어로 배너 & 3대 KPI 카드 (`src/components/Studio.tsx`)**:
   - `.studio-hero`: 딥 인디고와 소프트 크림 그라데이션이 적용된 서재(Studio) 느낌의 프리미엄 배너.
   - 3대 KPI 통계 카드: 현재 작업 원문 자수 실시간 집계, 번역 대상 언어(10대 언어), 적용 전문 용어(Glossary) 등록 건수 모니터링 카드.
   - 4단계 파이프라인 가이드 바: 원문 입력/파일 분석 ➔ 용어집 매칭/언어 설정 ➔ AI 분할 번역/3중 검수 ➔ 역번역 대조/다중 내보내기.
3. **독립 비주얼 가이드북 (`src/components/Guide.tsx`) 전면 개편**:
   - 4단계 핵심 문서번역 프로세스 다이어그램.
   - 지원 포맷(TXT, PDF, Word DOCX, Markdown)별 용량 한도 및 서식 보존 범위 기능 매트릭스 표.
   - 전문 번역 품질 극대화 7대 황금 수칙 카드 그리드.
   - 스캔 PDF, API 키 및 비용, 긴 문서 분할, Word 서식, 프라이버시 보호 등 5대 핵심 FAQ 아코디언.
4. **버전 3중 동기화**:
   - `document-translator/package.json` (`1.20.0`)
   - `document-translator/src/lib/version.ts` (`v1.20`)
   - Supabase DB `programs` 테이블 (`v1.20`)

---

## 3. 검수 결과 요약 (Microsoft Edge 포그라운드 실세션)
- 데스크톱(1920x1080) 및 모바일(375x812) 전 영역 캡처 7종 수집 완료:
  1. `edge_translator_desktop_main_v120.png`: 메인 대시보드 및 상단 히어로 배너
  2. `edge_translator_desktop_kpi_v120.png`: 3대 핵심 KPI 통계 카드
  3. `edge_translator_desktop_steps_v120.png`: 4단계 파이프라인 가이드 바
  4. `edge_translator_desktop_guide_v120.png`: 독립 가이드북 상단 및 워크플로우
  5. `edge_translator_desktop_guide_matrix_v120.png`: 파일/언어 기능 매트릭스 표 및 FAQ 아코디언
  6. `edge_translator_mobile_main_v120.png`: 모바일 375px 메인 대시보드 반응형 레이아웃
  7. `edge_translator_mobile_guide_v120.png`: 모바일 375px 가이드북 반응형 레이아웃
- Vercel 프로덕션 배포 완료 (`https://document-translator.buylife.xyz`).
- Microsoft Edge 창 10분간 화면 노출 유지 세션 진행.

---

## 4. 관련 파일 목록
- [src/app/globals.css](file:///D:/Antigravity/AIMaster/document-translator/src/app/globals.css)
- [src/lib/navigation.ts](file:///D:/Antigravity/AIMaster/document-translator/src/lib/navigation.ts)
- [src/components/Sidebar.tsx](file:///D:/Antigravity/AIMaster/document-translator/src/components/Sidebar.tsx)
- [src/components/Studio.tsx](file:///D:/Antigravity/AIMaster/document-translator/src/components/Studio.tsx)
- [src/components/Guide.tsx](file:///D:/Antigravity/AIMaster/document-translator/src/components/Guide.tsx)
- [src/lib/version.ts](file:///D:/Antigravity/AIMaster/document-translator/src/lib/version.ts)
- [package.json](file:///D:/Antigravity/AIMaster/document-translator/package.json)
