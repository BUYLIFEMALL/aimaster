# 36번 상세페이지 GIF 자동화 (`video-to-gif`) 작업 대기 백로그 (IMPROVEMENT_BACKLOG.md)

> **최초 작성**: 2026-10-19  
> **관리 상태**: 진행 중 / 대기 백로그  

---

## 1. 완료된 작업 (Completed)

- [x] **v1.10 디자인 리뉴얼**:
  - 크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션 적용 (`globals.css`, `tailwind.config.ts`)
  - 사이드바 표준화 (1-2-3단계 넘버링, `/guide` 골드 칩 메뉴, 모바일 토글 드로어)
  - 메인 워크스페이스 대시보드 리뉴얼 (`.studio-hero` 배너, 3대 KPI 카드, 다크 드롭존, 인라인 GIF 미리보기 모달)
  - 독립 비주얼 가이드북 (`/guide/page.tsx`) 전면 신설 (4단계 파이프라인, 플랫폼 매트릭스, 사다리 원리, FAQ 5종)
  - 버전 3중 동기화 (`package.json`, `lib/version.ts`, Supabase DB `programs`)
  - Turbopack 로컬 빌드 및 Vercel 프로덕션 배포 완료
  - Microsoft Edge 최전면 포그라운드 실세션 검수 (6종 캡처 보존, 10분 창 유지)

---

## 2. 향후 작업 대기 백로그 (Pending Backlog)

- [ ] **구간 자르기(Trim) 비디오 슬라이더 컨트롤러**:
  - 브라우저 Canvas 기반 시작/종료 프레임 선택기 도입.
- [ ] **WebCodecs API 기반 하드웨어 가속**:
  - 지원 브라우저에서 Chromium WebCodecs 디코더 우선 적용.
- [ ] **ZIP 일괄 다운로드 (JSZip)**:
  - 큐에 등록된 모든 GIF 결과물을 단일 ZIP으로 일괄 압축 다운로드.
- [ ] **비디오 첫 프레임 썸네일 타일 뷰**:
  - 큐 리스트에 영상 첫 프레임 이미지 렌더링.
- [ ] **8번/55번 상세페이지 자동화 크로스 연동**:
  - 상세페이지 제작기로 변환된 GIF Blob 직접 전송 API 연계.
