# 디자인 개발완료 인수인계 — 경쟁사 키워드분석 자동화 (v1.07)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일** — 기준 구현 [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](../../longtail-keyword-expander/docs/DESIGN_HANDOFF.md)와 **같은 뼈대·같은 토큰**. 색·부품 설명은 기준 문서를 따른다(이 문서는 차이만 적음).
- **작업**: Claude Code(맥미니), 2026-10-16 · 상태: ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스 스타일), Windows 배포·화면 검수 완료. 기존 보안 후속 #11/#12는 미해결

## 1. 기준 구현에서 그대로 가져온 것
`app/globals.css`(토큰·`.mx-*` 클래스), `tailwind.config.ts`의 `mx` 색, `components/layout/PageHero.tsx`, `components/dashboard/KpiCard.tsx`, `lib/format.ts`(Asia/Seoul), `components/ui/CopyButton.tsx`(Codex가 실패 안내 보강한 버전), 사이드바 데스크톱/☰ 구조.

## 2. 이 프로그램에만 있는 것
| 화면·부품 | 내용 |
|---|---|
| 사이드바 | 🏠 대시보드 → 스텝 1·2 → **보조 메뉴 「🏢 내 경쟁사」**(스텝 아래 별도) → 🔑·📖 → 계정 |
| `/dashboard` | KPI(키워드·분석·내 경쟁사·키 n/4), 작업 흐름 4단계, **키 4종 상태**(Anthropic은 「선택」 칩), 최근 분석 5건 |
| 결과 상세 | KPI(자연·광고·등장 도메인·내 경쟁사 표시 수), 앰버 강조선 AI 리포트 + 「리포트 복사」, **결과 유형별 표**(순위·제목/요약·도메인/회사·경쟁사 토글), HTML 리포트 iframe은 흰 배경 유지(리포트 자체 디자인) |
| `/competitors` | KPI + 표(회사·도메인 / 요약 / 노출 키워드 칩 / 노출 횟수 / 표시 토글) |
| `KeywordActions` | 「⚡ 지금 분석하기」(1~2분 안내) + 삭제 확인 |

## 3. 주의
- HTML 리포트 iframe의 `sandbox=""`는 유지(리포트는 AI가 만든 HTML).
- 검색결과 링크는 `http(s)`일 때만 링크로 렌더(외부 데이터).
- 빈 목록에서 임의 문자열로 UUID 컬럼을 조회하지 않는다(조회 생략).
- 회원 화면에 「주인님」 금지, 계정 칸은 메뉴 바로 아래.

## 4. 인수 결과

맥미니 원본 ac41f83c를 Windows에서 첫 빌드했고 제품 코드 오류는 발견되지 않았습니다. Windows 검수 도구·기록 소스 c80a44af는 원격 푸시 완료입니다. package.json은 1.7.0, APP_VERSION/DB는 v1.07입니다. 검수용 모의 인증·데이터 코드는 tests/에서만 사용하며 실제 앱에는 연결하지 않았습니다.

## 5. 확인한 흐름과 증거

- Windows npm run build 및 npm run build:verify: Next.js 14.2.35 타입·컴파일·정적 페이지 생성 통과.
- 실제 일반 시험 회원 buylifemall@naver.com(관리자 아님), 보이는 Microsoft Edge: 로컬/운영 각 12개 묶음 검사 통과. / 진입 대시보드 이동, 비로그인 차단·돌아올 경로, KPI·4개 키 상태, 6개 페이지의 동일 테마/375px 메뉴·계정 표시·가로 넘침, 메뉴 이동 후 닫힘, 존재하지 않는 키워드 상세 404. /guide는 고유 URL·제목 및 FAQ 열기/닫기 확인.
- 실제 회원 테이블 5개는 검사 전후 모두 0건. 브라우저 POST 0, 페이지 오류 0, 유료 검색·AI 호출 0.
- 합성 데이터/액션으로 실제 컴포넌트 및 서버 상세 페이지 15개 검사: 표/카드·검색·구글 필터·검색 없음, 키워드/분석/이력 삭제 취소, 비동기 등록 후 폼 초기화, 필수/선택 키 안내, 자연·광고·PAA·지역 표, 한국 시각, 리포트 실제 복사·권한 거부 안내, HTML sandbox, 경쟁사 노출·표시 토글, 빈 목록 후속 조회 생략·user_id 조건, 375px 채워진 표의 내부 스크롤.
- [로컬 결과](evidence/runtime-local.json), [운영 결과](evidence/runtime-live.json), [합성 결과](evidence/browser-fixtures.json). [운영 1440px](evidence/live-dashboard-desktop.png), [375px](evidence/live-dashboard-mobile.png), [매뉴얼](evidence/live-guide-desktop.png), [매뉴얼 375px](evidence/live-guide-mobile.png), [합성 상세](evidence/fixture-desktop.png).
- 첫 매뉴얼 캡처는 SPA 전환 전에 이전 설정 화면을 찍을 수 있었습니다. 검사를 URL+고유 제목 대기로 고치고 로컬/운영 재검수, 캡처를 교체했습니다. sticky 사이드바 위치 혼동을 줄이기 위해 맨 위에서 다시 캡처했으며 [주소/제목 증거](evidence/guide-captures.json)를 남겼습니다. 제품 라우트 수정은 없었습니다.

## 6. 한계·후속 작업

- 유료 SerpApi/Perplexity/OpenAI/Anthropic 분석·HTML 생성 품질, 실제 키 저장/삭제, 실제 키워드 신규 저장/삭제, 유효한 다른 회원 ID로 교차 접근은 미검수입니다. 폼·삭제·토글 쓰기는 합성 검사이며 실제 DB 쓰기 검증으로 해석하지 않습니다.
- 기존 의존성 보안 경고 15건(critical 1/high 12/moderate 2, [audit](evidence/dependency-audit.json))은 미해결입니다. #11의 공식 공지와 지원 버전을 먼저 확인해 별도 업그레이드 플랜을 세웁니다. Windows 로컬 서버는 127.0.0.1만 사용하고 검수 종료 후 중지합니다.
- 기존 공유 competitor_profiles는 실제 RLS도 일반 authenticated INSERT/UPDATE 허용입니다. 최상위 공용 데이터 쓰기 지침과 충돌하는 구조이므로 #12에 정책 정비를 남겼습니다. 이번에 유료 분석/공유 쓰기나 DB 정책을 변경하지 않았습니다. 최상위 지침이 초기 AGENTS의 캐시 예외 설명보다 우선합니다.
- #7 순위 변동·#8 전체 노출 빈도·#9 CSV·#10 정기 모니터링은 기존 후속 제안입니다. 승인 없이 유료 자동 실행·DB 스키마/정책 변경을 시작하지 않습니다.

## 7. 배포·DB 최종 기록 — 2026-10-16 Codex(Windows)

| 항목 | 값 |
|---|---|
| 원본 / Windows 소스 | ac41f83c / c80a44aff91720f7f69c7ec6dde016fdd6c02e5d |
| Vercel 프로젝트 | competitor-analysis (prj_1It7Em1XLeQoX5J6wFWbmWxCGxg6) |
| 프로덕션 | dpl_2fSGbqZK3PrGWSSy85dyG8m2BmXt READY |
| 고정 배포 | https://competitor-analysis-d7krwoagy-buylife.vercel.app |
| 실제 서비스 | https://competitor-analysis.buylife.xyz |
| 코드·DB 버전 | v1.07 / v1.07 |
| DB/권한 | 주소·FREE 배지 유지, VIP 유효 138/138 (조회 확인), 실제 회원 데이터 쓰기 0 |
| 배포 방식 | 고정 git archive, 기존 해당 프로젝트 환경 사용, 로컬 env 파일 복사 없음 |
| 검수 | 합성 15개, 로컬/운영 회원 각 12개, 모두 통과 |

[배포 증거](evidence/deployment-v107.json), [버전 DML](../supabase/releases/20261016_v107.sql), [Windows 최종 인수인계](IMPROVEMENT_HANDOFF_20261016.md). 신규 운영 코드 변경은 없으며 최종 문서·검사 대기 보완은 이후 문서 커밋 이력에서 확인합니다.
