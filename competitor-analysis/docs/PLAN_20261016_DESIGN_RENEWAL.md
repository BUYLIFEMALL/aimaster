# 디자인 리뉴얼 개발 플랜 — 경쟁사 키워드분석 자동화 (2026-10-16, v1.06 → v1.07)

- **작업자**: Claude Code(맥미니) · **주인님 지시**: 디자인 현황판 남은 목록 2번
- **적용 템플릿**: 스마트 매트릭스 스타일 — **기준 구현 `longtail-keyword-expander`와 같은 뼈대(Next 14 + Tailwind v3)**라 기반 파일(`app/globals.css`, `PageHero`, `KpiCard`, `lib/format.ts`, `CopyButton`, 사이드바 패턴)을 그대로 가져옴

## 1. 사전 분석 (지침 8번)

| 항목 | 현재 상태 |
|---|---|
| 라우트 | `/keywords`(첫 화면) · `/keywords/[id]`(최근 결과로 이동) · `/keywords/[id]/jobs/[jobId]` · `/analyses` · `/competitors` · `/settings` |
| 데이터 흐름 | 서버 액션 `runKeywordAnalysisAction` → SerpApi → 도메인별 Perplexity+GPT 리서치(전역 캐시 `competitor_profiles`) → GPT 리포트 → 선택적 Claude HTML 리포트 |
| 보안 | 모든 서버 액션 `requireProgramAccess()`, HTML 리포트 iframe `sandbox=""`, 본인 키만 — **양호** |
| 디자인 | 흰 배경 카드 나열, 대시보드·매뉴얼 없음, **휴대폰 ☰ 전환 없음(원칙 19)** |
| 롱테일과 같은 오류(Codex가 롱테일 v1.06에서 수정) | ① 키워드 등록 후 폼 초기화 오류(`e.currentTarget` await 후 null) ② 분석 이력 삭제 확인 없음 ③ 빈 목록에서 `"__none__"`을 UUID 컬럼에 조회(오류가 빈 목록으로 숨음) — `/analyses`·`/competitors` 3곳 ④ 시각이 서버(UTC) 기준 |

## 2. 구현 순서
| 단계 | 내용 |
|---|---|
| 0 | 위 오류 4건 수정(롱테일과 같은 방식) + 검색결과 링크는 http(s)일 때만 링크로 |
| 1 | 롱테일 기반 파일 이식, 사이드바(🏠 대시보드·스텝·내 경쟁사·🔑·📖, 휴대폰 ☰) |
| 2 | `/dashboard` 신설(`/` → `/dashboard`): 지표 4종·작업 흐름·키 4종 연결 상태·최근 분석 |
| 3 | 키워드: KPI + 검색·엔진 필터·표/카드 · 분석 결과: KPI + 검색·표/카드 · 결과 상세: KPI 4종 + 결과 유형별 표(순위·제목·도메인/회사·경쟁사 표시) + 리포트 복사 · 내 경쟁사: KPI + 표(노출 키워드·노출 횟수) |
| 4 | `/guide` 신설(캐릭터·4단계·결과 유형 읽는 법·메뉴 역할·TIP/주의·키 매뉴얼·FAQ), 설정 히어로·다크 |
| 5 | 문서·버전 v1.07·현황판 🟠 |

- **비용**: 없음. **빌드·배포**: 윈도우 CLI 요청.
