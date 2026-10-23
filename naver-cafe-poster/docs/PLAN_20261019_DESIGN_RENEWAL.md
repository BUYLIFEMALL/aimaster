# 📋 [사전 개발 플랜 및 검수 결과] 40번 네이버 카페 포스팅 자동화 v1.20 리뉴얼

> **문서 생성**: 2026-10-19  
> **상태**: ✅ 구현 완료 및 검수 통과  
> **담당**: Antigravity CLI (`agy`, 윈도우)

---

## 1. 사전 계획 개요 (착수 전 주인님 승인 완료)

### 대상 프로그램
- 프로그램 번호: 40번
- 프로그램명: 네이버 카페 포스팅 자동화
- slug: `naver-cafe-poster`
- 공식 서비스 URL: [https://naver-cafe-poster.buylife.xyz](https://naver-cafe-poster.buylife.xyz)
- 버전 목표: `v1.15` ➔ `v1.20`

### 문제점 및 리뉴얼 배경
1. 사이드바 활성 메뉴에 스카이블루(파란색)가 적용되어 있어 네이버 고유의 그린 아이덴티티와 불일치.
2. 네이버 로그인, club_id 추출, 3대 소스 글감 수집 등 사전 설정 안내를 위한 시각적 가이드북(`/guide`) 부재.
3. 모바일 접속 시 상단 메뉴 과다 노출로 본문이 밀리는 구조 ➔ 햄버거 토글 헤더 필요.

### 적용 템플릿
- **공식 템플릿**: **플로우 위저드 스타일 — 네이버 카페 그린 에디션 (Flow Wizard Style — Naver Cafe Green Edition)**
- **컬러 토큰**: 네이버 카페 그린 (`#03c75a`), 웜 슬레이트 라이트 (`#f8fafc`), 에메랄드 (`#10b981`), 앰버 골드 (`#f59e0b`).

---

## 2. 세부 구현 결과

1. **디자인 토큰 시스템 (`src/app/globals.css`)**:
   - 네이버 카페 그린 토큰 및 `.studio-hero`, `.stat-card` 시그니처 클래스 구축 완료.
2. **사이드바 및 모바일 헤더 (`src/components/layout/Sidebar.tsx`)**:
   - `v1.20 CAFE BOT` 뱃지, 1-2-3-4 단계 넘버링 스텝퍼, `/guide` 메뉴 신설, 모바일 햄버거 토글 드로어 완비.
3. **메인 대시보드 (`src/app/(dashboard)/dashboard/page.tsx`)**:
   - 입체적인 `.studio-hero` 배너 및 [📖 연동 & 사용 매뉴얼 보기] 퀵 버튼 탑재.
   - 3대 핵심 KPI 지표 카드 및 상태별 진행 통계 카드 가독성 개선.
4. **독립 비주얼 가이드북 (`src/app/(dashboard)/guide/page.tsx`)**:
   - 4단계 파이프라인, club_id 추출 매트릭스, 3대 소스 비교표, 100% BYOK 보안 배너, FAQ 5종 아코디언 탑재.
5. **버전 3중 동기화 (`v1.20`)**:
   - `package.json` (`1.20.0`), `version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`) 동기화 완료.

---

## 3. 검증 및 검수 결과

1. **로컬 빌드 검증 (`npm run build`)**:
   - `post.cafe_article_url` 타입 필드 정확히 바인딩 후 Next.js 16 프로덕션 빌드 성공 (15개 라우트 완벽 생성, exit code 0).
2. **Vercel 프로덕션 배포 (`npx vercel --prod --yes`)**:
   - 배포 ID: `dpl_4D3v4tgmwPJxgHznBHh61sj9BeWh` (Ready, Production).
   - 공식 도메인 즉시 반영: `https://naver-cafe-poster.buylife.xyz`.
3. **Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 기반 검수 완료.
   - 6종 아티팩트 보존:
     - `edge_cafe_desktop_main_v120.png`: 메인 대시보드 및 상단 히어로 배너
     - `edge_cafe_desktop_kpi_v120.png`: 3대 KPI 카드 및 상태별 통계 카드
     - `edge_cafe_desktop_guide_v120.png`: 비주얼 가이드북 상단 및 4단계 파이프라인
     - `edge_cafe_desktop_guide_matrix_v120.png`: 카페 club_id 추출 매트릭스 및 비교표 & FAQ
     - `edge_cafe_desktop_candidates_v120.png`: 글감 수집 화면
     - `edge_cafe_mobile_guide_v120.png`: 모바일 375px 뷰포트 반응형 화면
   - 화면 최전면 10분 유지 대기 정상 수행.
