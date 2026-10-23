# 네이버 블로그 올인원 자동화(naver-blog-allinone) 디자인 인수인계서

- **프로그램명**: 네이버 블로그 올인원 자동화 (`naver-blog-allinone`)
- **적용 버전**: `v1.49`
- **배포 URL**: https://naver-blog-allinone.buylife.xyz
- **작업 일시**: 2026-10-18
- **작업자**: Antigravity CLI (agy, 윈도우)
- **적용 디자인 템플릿**: **플로우 위저드 스타일 (네이버 그린 라이트 변형)**

---

## 1. 디자인 리뉴얼 핵심 변경 사항
1. **플로우 위저드 라이트 테마 일관 적용**:
   - 메인 배경: 클린 슬레이트 (`bg-[#f8fafc]`)
   - 서피스 카드: 순백색 (`#ffffff`), 섬세한 보더 (`border-slate-200/90`), 가벼운 그림자 (`shadow-xs`)
   - 브랜드 포인트: 네이버 시그니처 그린 (`#03c75a` / `#00c73c`), 에메랄드, 포인트 인디고
2. **비주얼 사용 매뉴얼 (`GuideSection.tsx`) 완전 신설**:
   - 상단 환영 히어로 배너: 네이버 그린 & 에메랄드 그라디언트 및 마스코트 배너
   - 4단계 올인원 제작 파이프라인 (01 주제 발굴 → 02 멀티모달 비전 → 03 7대 엔진 키워드 → 04 생성 본문 보관함)
   - 크롬 확장 프로그램(`naver-blog-allinone-latest.zip`) 1초 설치 및 스마트에디터 ONE 자동 주입 가이드
   - 네이버 C-Rank / D.I.A.+ 검색엔진 알고리즘 대응 4대 실전 체크포인트
   - 자주 묻는 질문(FAQ) 아코디언 컴포넌트
3. **사이드바 및 모바일 반응형 정비**:
   - `Sidebar.tsx`: `MainTabType`에 `"guide"` 추가, `📖 연동 & 사용 매뉴얼` 메뉴 항목 신설 (에메랄드 하이라이트)
   - 모바일 375px: 56px 고정 헤더, 햄버거 메뉴 토글 슬라이드 오버레이 드로어 완벽 호환
   - `page.tsx`: URL 쿼리 파라미터(`?tab=guide`) 지원 및 탭 전환 시 매뉴얼 섹션 부드러운 렌더링

---

## 2. 브라우저 실세션 검수 결과 (Microsoft Edge)
- **검수 브라우저**: Microsoft Edge (`msedge`), 포그라운드(`headless: false`)
- **로그인 세션**: 일반 회원 테스트 계정 `buylifemall@naver.com`
- **검수 캡처 아티팩트 5종**:
  1. 데스크톱 대시보드 (1440px): `edge_naver_blog_allinone_desktop_dashboard_v149.png`
  2. 데스크톱 사용 매뉴얼 (1440px): `edge_naver_blog_allinone_desktop_guide_v149.png`
  3. 모바일 대시보드 (375px): `edge_naver_blog_allinone_mobile_dashboard_v149.png`
  4. 모바일 햄버거 메뉴 (375px): `edge_naver_blog_allinone_mobile_menu_v149.png`
  5. 모바일 사용 매뉴얼 (375px): `edge_naver_blog_allinone_mobile_guide_v149.png`

---

## 3. 크롬 확장 프로그램 동기화
- `extension/manifest.json`: `1.49.0` / `v1.49`
- `package.json`: `1.49.0`
- `src/lib/version.ts`: `v1.49`
- `public/downloads/naver-blog-allinone-latest.zip`: 재패키징 완료
- Supabase DB `programs`: `version: v1.49`, `extension_version: v1.49` 일치 완료 (`check-extension-release.mjs` PASS)
