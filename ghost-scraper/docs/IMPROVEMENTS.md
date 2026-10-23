# 개선사항 기록 — Website Scraper (`website-scraper`, 폴더 `ghost-scraper/`)

형식: 발견 근거 · 영향 · 우선순위 · 상태 · 관련 파일 · 다음 첫 단계

## 2026-10-16 Codex(Windows) — 윈도우 인수 검수 중 발견

- **#14 SSRF 주소 변형·DNS 재조회 경계**: 기본 127.0.0.1은 막지만 IPv4-mapped IPv6(`::ffff:7f00:1`)와 `fe90::1`이 URL 검사에서 통과함을 격리 재현. 내부 연결은 하지 않았습니다. `safeFetch.ts`에서 mapped IPv4·IPv6 link-local /10·userinfo 차단, 검사한 주소를 연결 lookup에 고정, 리디렉트 재검사·응답 취소·연결 정리를 보완. 상태: **v1.12 운영 완료**, 로컬·운영 회원 API 12개 400 및 격리 보안 26개 확인. [재현 증거](evidence/security-before.json), 검수: evidence/security.json·runtime-live.json.
- **#15 기존 의존성 점검 필요**: npm audit가 기존 그래프에서 8건(7 high/1 critical)을 보고. 자동 major 업그레이드는 이번 범위에 포함하지 않으며 별도 호환성 플랜으로 조사합니다. undici는 기존 설치 7.30.0을 직접 고정 의존성으로 선언해 안전한 연결에 사용합니다.

- **#16 FREE 표시와 DB 배지 불일치**: 실제 DB 배지는 `["new"]`이고 접근 게이트도 이 값을 따릅니다. 사이드바 FREE 고정 표시는 가입만 하면 무료라고 오해할 수 있습니다. 우선순위 중간·미구현 제안. 다음: 서버에서 실제 FREE 여부를 전달해 표시하거나 고정 배지를 제거합니다. DB 배지·등급·사용기간은 UI에 맞춰 임의 변경하지 않습니다.

## 2026-10-16 Claude Code(맥미니) — 디자인 리뉴얼 사전 분석 중 발견

| # | 내용 | 근거·영향 | 우선순위 | 상태 | 관련 파일 | 다음 첫 단계·검수 |
|---|---|---|---|---|---|---|
| 1 | API 3개 권한 확인 없음 + `/api/user/key` 로그인만 | 원칙 1 위반, 누구나 대리 접속 통로로 사용 | 🚨 높음 | **운영 검수 완료(v1.12)** | `src/app/api/*` | 비로그인 `curl` 401 확인 |
| 2 | 내부·사설 주소 수집 가능(SSRF) | `127.0.0.1`·`169.254.169.254` 등 요청 가능 | 🚨 높음 | **구현(v1.12)** | `src/lib/safeFetch.ts` | 내부 주소 400 확인 |
| 3 | 미리보기가 남의 스크립트를 우리 도메인 권한으로 실행 | 저장된 Gemini 키·세션 API 노출 위험 | 🚨 높음 | **구현(v1.12)** — CSP sandbox + iframe sandbox + 메시지 출처 확인 | `api/proxy/route.ts`, `SectorModal.tsx` | 섹터 선택 클릭·Ctrl 이동 동작, 미리보기 안에서 `localStorage` 접근 차단 확인 |
| 4 | `/guide` 페이지·메뉴 없음 | 지침 9번 | 중간 | **구현(v1.12)** | `src/app/guide`, `GuideShell.tsx` | 화면 검수 |
| 5 | 계정 칸이 화면 맨 아래 | 사이드바 표준 위반 | 낮음 | **구현(v1.12)** | `Sidebar.tsx` | — |
| 6 | 내보내기 버전 `v1.08` 고정, ZIP 이름 `ghost_`, 실패 시 `alert()` | 혼동·차단형 알림 | 낮음 | **구현(v1.12)** | `ScraperWorkspace.tsx`, `ScraperTabs.tsx` | — |
| 7 | 모델 목록에 `gemini-1.5-flash` | 구형 모델(서비스 종료 가능성) — 고른 회원은 분석 실패 | 중간 | 미구현(확인 필요) | `SettingsModal.tsx`, `lib/types.ts` | Gemini 공식 모델 목록 확인 후 현행 모델로 교체, 저장값 자동 이전 |
| 8 | 자바스크립트로 내용을 그리는 사이트는 거의 비어 보임 | Cheerio(정적 HTML)만 사용 | 중간 | 미구현(제안) | `api/crawl/route.ts` | 결과가 비면 안내 + 「시각적 섹터 선택」 유도, 장기적으로 렌더링 수집 검토(서버 비용 → 프리미엄 후보) |
| 9 | 수집 이력이 마지막 1건뿐 | `localStorage` 1건 | 중간 | 미구현(제안) | `lib/storage.ts` | 최근 10건 이력(브라우저) 또는 DB 저장 |
| 10 | 연속 페이지(2·3페이지…) 자동 수집 없음 | 게시판 전체 수집 불편 | 중간 | 미구현(제안) | — | 「다음 페이지」 선택자 지정 후 N페이지 순회 (대상 사이트 부담 → 간격·횟수 제한) |
| 11 | robots.txt·이용 약관 안내만 있고 확인 기능 없음 | 법적·차단 위험 | 낮음 | 미구현(제안) | `api/crawl` | robots.txt 차단 경로면 경고 칩 표시 |
| 12 | 이미지 ZIP 동시 요청 최대 100개 | 대상 사이트 부하·실패 | 낮음 | 미구현(제안) | `ScraperTabs.tsx` | 동시 5개로 제한 |
| 13 | 라이트 테마 전환 없음 | 지침 8.1-4 | 낮음 | 미구현(제안) | `globals.css` | 라이트 토큰 세트 + 전환 버튼 |

## 2026-10-23 Claude Code(윈도우) — Next.js 보안 업데이트 (세션 claude-win-20261023-next-security)
- v1.14 배포(Next.js 16.4.2 보안 업데이트, DB slug `website-scraper`). **확인 필요: `/login` 404(배포는 Ready) — 실제 로그인 경로 확인(분담표 묶음 C)**. 상세·명령: [`docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md`](../../docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md)
