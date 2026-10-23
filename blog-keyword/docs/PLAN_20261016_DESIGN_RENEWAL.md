# 디자인 리뉴얼 개발 플랜 — AI 블로그 키워드 자동화 (2026-10-16, v1.04 → v1.05)

- **작업자**: Claude Code(맥미니) · **주인님 지시**: 디자인 현황판 남은 작업 중 1번(`blog-keyword`)부터
- **적용 템플릿**: 스마트 매트릭스 스타일 (루트 `DESIGN.md` 4번, 기준 구현 `longtail-keyword-expander`, 두 번째 `ghost-scraper`)
- **기술 특이점**: Tailwind 없이 **일반 CSS**(`src/app/globals.css`·`kw.css`) → 토큰을 CSS 변수(`--mx-*`)로 옮김

## 1. 사전 분석 (지침 8번)

| 항목 | 현재 상태 |
|---|---|
| 라우트 | `/dashboard`(9개 분석 작업대 + 트렌드 도구), `/history`, `/settings`(키 3묶음), `/guide`, `/login`·`/setup` |
| 데이터 흐름 | `POST /api/analyze` → 기능별 실행(`lib/kw/features.ts`) → `blog_keyword_reports` 저장(최근 100건 + 즐겨찾기) |
| 외부 연동 | Gemini(회원 본인 키, 구글 검색 그라운딩) · 네이버 검색/데이터랩/검색광고(회원 본인 키) · 자동완성 공개 응답 |
| 보안 | 모든 API `checkProgramAccessApi` + `force-dynamic`, 임의 URL 프록시 없음, 폴백 없음 — **문제 없음** |
| 디자인 | 흰 배경·인디고, 지표 카드·히어로 없음, 기록에 검색·필터 없음, 매뉴얼은 글 위주(흐름 그림 없음) |
| 테스트 | `tests/browser.mjs`는 버튼 이름·텍스트·`aria-pressed`·`.kw-history`·`data-group`에 의존 → **클래스 이름은 바꾸지 않고 색만 교체** |

## 2. 구현 순서

| 단계 | 내용 | 검수 |
|---|---|---|
| 1 | `:root`에 `--mx-*` 토큰(롱테일과 같은 값), 기존 `--brand/--line/--muted`를 토큰으로 연결, 두 CSS 파일의 밝은 색 전부 교체 | 1440px·375px 화면 |
| 2 | 대시보드 히어로 + `DashboardStats`(저장된 분석·즐겨찾기·최근 분석·키 연결 n/3) | 화면 |
| 3 | 기록: 키워드 검색 + 분석 종류 칩(개수) + `n / 전체` 표시 | 화면 + `npm run test:browser` |
| 4 | 기록·설정·매뉴얼 히어로, 매뉴얼에 캐릭터 말풍선 + 4단계 흐름 그림 | 화면 |
| 5 | 문서·버전 v1.05(코드·package.json, DB는 배포 때)·현황판 🟠 | — |

- **비용**: 없음. **빌드·배포**: 윈도우 CLI 요청.
