# 상세페이지 자동생성기 v1 (auto-detail-page) 디자인 인수인계서 (DESIGN_HANDOFF.md)

> **버전**: `v1.20` (이커머스 셀러 스튜디오 에디션)  
> **갱신일시**: 2026-10-19  
> **담당**: Antigravity (윈도우 환경)  
> **실제 배포 주소**: https://auto-detail-page.buylife.xyz/

---

## 1. 디자인 리뉴얼 요약
- **컨셉 테마**: **이커머스 셀러 스튜디오 (E-Commerce Seller Studio) — 상세페이지 기획 에디션**
- **시각적 특징**:
  - 로열 블루(`#2563eb`) & 세일즈 앰버/오렌지(`#f97316`)의 고전환율 이커머스 테마 컬러 적용.
  - 좌측 사이드바(260px 고정, `v1.20` 배지, 4단계 파이프라인 스텝퍼, 회원 계정 연동) 신설.
  - 모바일(767px 미만) 상단 헤더 및 좌측 슬라이드 오버레이 드로어 완비.
  - 상단 프리미엄 `.studio-hero` 배너 및 3대 핵심 KPI 통계 카드, 4단계 파이프라인 가이드 바 탑재.
  - 독립 비주얼 가이드북(`app/guide/page.tsx`) 전면 신설: 쿠팡/스마트스토어/럭셔리몰 규격 매트릭스 표, 전환율 7대 황금 수칙, FAQ 5종.

---

## 2. 주요 수정 및 신설 파일 목록
1. `app/globals.css`: 셀러 스튜디오 전용 컴포넌트 클래스(`.studio-hero`, `.stat-card`, `.guide-card` 등) 및 색상 토큰 추가
2. `components/layout/DetailSidebar.tsx`: 데스크톱 고정 사이드바 및 모바일 햄버거 슬라이드 드로어 네비게이션 신설
3. `components/layout/DetailShell.tsx`: 경로별(메인/가이드/설정 vs 미리보기/로그인) 사이드바 제어 셸 신설
4. `app/layout.tsx`: `DetailShell` 래핑 및 메타데이터 갱신
5. `app/page.tsx`: 히어로 배너, 3대 KPI 카드, 파이프라인 바, 넉넉한 폼 컨테이너 적용
6. `app/guide/page.tsx`: 플랫폼별 규격 매트릭스 표, 4단계 제작 워크플로우, 전환율 7대 수칙, FAQ 5종 가이드북 신설
7. `app/settings/page.tsx`: 스튜디오 테마와 조화로운 UI 레이아웃 리뉴얼 및 브레드크럼/가이드북 링크 보강
8. `package.json` & `lib/version.ts` & DB `programs`: 버전 `v1.20` 3중 동기화 완료
9. `scripts/verify_edge_auto_detail_v120.cjs`: Microsoft Edge 전용 포그라운드 7종 캡처 검수 스크립트 작성

---

## 3. 검수 완료 증거
- **로컬 Next.js 14 프로덕션 빌드**: 통과 (`Compiled successfully`, 정적/동적 라우트 무오류)
- **Vercel 프로덕션 배포**: `https://auto-detail-page-q7aw8xvat-buylife.vercel.app` (Aliased: `https://auto-detail-page.buylife.xyz`)
- **실제 도메인 HTTP 응답**: 정상 작동 (`Location: /login?redirect=%2F`, 미들웨어 인증 보호 확인)
- **Microsoft Edge 포그라운드(headless: false) 7종 캡처 수집 완료**:
  - `edge_detail_desktop_main_v120.png`
  - `edge_detail_desktop_kpi_v120.png`
  - `edge_detail_desktop_form_v120.png`
  - `edge_detail_desktop_guide_v120.png`
  - `edge_detail_desktop_guide_matrix_v120.png`
  - `edge_detail_mobile_main_v120.png`
  - `edge_detail_mobile_guide_v120.png`
- **화면 유지**: Edge 브라우저 창 10분간(600초) 포그라운드 유지 세션 가동 완료
