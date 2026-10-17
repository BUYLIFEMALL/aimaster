# 네이버 블로그 에이전트(naver-blog-agent) 디자인 인수인계서

- **프로그램명**: 네이버 블로그 에이전트 (`naver-blog-agent`)
- **적용 버전**: `v1.94`
- **배포 URL**: https://naver-blog-agent.buylife.xyz
- **작업 일시**: 2026-10-18
- **작업자**: Antigravity CLI (agy, 윈도우)
- **적용 디자인 템플릿**: **플로우 위저드 스타일 (네이버 그린 라이트 변형)**

---

## 1. 디자인 리뉴얼 핵심 변경 사항
1. **플로우 위저드 라이트 테마 일관 적용**:
   - 메인 배경: 클린 슬레이트 (`bg-[#f8fafc]`)
   - 서피스 카드: 순백색 (`#ffffff`), 섬세한 보더 (`border-slate-200/90`), 가벼운 그림자 (`shadow-xs` / `shadow-sm`)
   - 브랜드 포인트: 네이버 시그니처 그린 (`#03c75a` / `#00c73c`), 에메랄드, 포인트 앰버/인디고
2. **모바일(375px) 반응형 내비게이션 완비**:
   - `Header.tsx`와 `Sidebar.tsx`: 모바일 전용 햄버거 메뉴 토글 버튼(`aria-label="사이드 메뉴 열기"`), 오버레이 백드롭, 좌측 슬라이드 오버레이 드로어 구축 완료.
   - `DashboardShell.tsx` 클라이언트 래퍼를 도입하여 모바일 메뉴 상태 완벽 동기화.
3. **비주얼 연동 & 사용 매뉴얼 (`guide/page.tsx`) 전면 고도화**:
   - 공식 가이드북 히어로 배너: 네이버 그린 & 에메랄드 그라디언트 및 마스코트 배너 (`v1.94`)
   - 3단계 올인원 제작 파이프라인 (01 떡상 글감 수집 → 02 AI 5단계 원고/이미지 생성 → 03 보관함 & 스마트에디터 ONE 자동 발행)
   - 크롬 확장 프로그램 1초 설치 및 8자리 페어링 코드 연결 가이드 (4단계 스텝 박스)
   - 네이버 C-Rank & D.I.A.+ 검색엔진 알고리즘 상위 노출 4대 실전 핵심 원칙
   - 트러블슈팅 FAQ 5종 아코디언 컴포넌트 탑재
4. **확장 프로그램 & DB 버전 일괄 동기화**:
   - `extension/manifest.json`: `1.94.0` / `v1.94`
   - `package.json`: `1.94.0`
   - `src/lib/version.ts`: `v1.94`
   - `npm run build:extension`: 최신 ZIP 아카이브 빌드 완료 (`naver-blog-agent-extension-latest.zip`)
   - Supabase DB `programs`: `version: v1.94`, `extension_version: v1.94` 동기화 완료 (`check-extension-release.mjs`: PASS)

---

## 2. 브라우저 실세션 검수 결과 (Microsoft Edge)
- **검수 브라우저**: Microsoft Edge (`msedge`), 포그라운드(`headless: false`)
- **로그인 세션**: 일반 회원 테스트 계정 `buylifemall@naver.com`
- **검수 캡처 아티팩트 5종**:
  1. 데스크톱 대시보드 (1440px): `edge_naver_blog_agent_desktop_dashboard_v194.png`
  2. 데스크톱 사용 매뉴얼 (1440px): `edge_naver_blog_agent_desktop_guide_v194.png`
  3. 모바일 대시보드 (375px): `edge_naver_blog_agent_mobile_dashboard_v194.png`
  4. 모바일 햄버거 메뉴 (375px): `edge_naver_blog_agent_mobile_menu_v194.png`
  5. 모바일 사용 매뉴얼 (375px): `edge_naver_blog_agent_mobile_guide_v194.png`
