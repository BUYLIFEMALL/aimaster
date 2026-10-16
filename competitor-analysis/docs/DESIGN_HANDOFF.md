# 디자인 개발완료 인수인계 — 경쟁사 키워드분석 자동화 (v1.07)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일** — 기준 구현 [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](../../longtail-keyword-expander/docs/DESIGN_HANDOFF.md)와 **같은 뼈대·같은 토큰**. 색·부품 설명은 기준 문서를 따른다(이 문서는 차이만 적음).
- **작업**: Claude Code(맥미니), 2026-10-16 · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망

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

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 코드 커밋 | (이 문서와 같은 커밋) |
| 빌드·배포 | 대기 |
| DB `programs.version` | v1.06 (배포 때 v1.07) |
| 화면 검수 | 대기 |
