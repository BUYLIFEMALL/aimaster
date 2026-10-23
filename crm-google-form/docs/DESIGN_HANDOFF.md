# 디자인 개발완료 인수인계 — 구글폼 CRM 자동화 (v1.09)

- **적용 디자인 템플릿**: **스마트 매트릭스 — 라이트 변형**. 클래스·부품은 기준 구현 [`longtail-keyword-expander`](../../longtail-keyword-expander/docs/DESIGN_HANDOFF.md)(Tailwind v3)와 같고, 색 값은 [`file-merge`](../../file-merge/docs/DESIGN_HANDOFF.md)의 라이트 토큰. **Tailwind v3 프로그램에 라이트 변형을 넣는 첫 예.**
- **작업**: Claude Code(맥미니), 2026-10-17 · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망

## 1. Tailwind v3 + 라이트 변형 적용 방법 (다른 프로그램 이식용)
1. 기준 구현 `app/globals.css`를 복사하고 `:root`의 `--mx-*` 값만 라이트 값으로 바꾼다(`--mx-link` 추가).
2. 칩 3종(`.mx-chip-blue/-amber/-green`)을 반투명 → **연한 배경 + 진한 글자**로 바꾸고 `.mx-chip-red` 추가.
3. `tailwind.config.ts`에 `mx` 색(link 포함) 추가.
4. `PageHero`는 그라데이션 시작색 `#eff6ff`, 팁 글자 `#92400e`로.
5. 기존 화면의 회색·파랑 클래스는 일괄 치환(`bg-white→bg-mx-surface`, `bg-gray-50/100→bg-mx-raised`, `border-gray-100/200→border-mx-border`, `text-gray-900/800/700→text-mx-text`, `text-gray-600/500/400→text-mx-muted`, `text-blue-600→text-mx-link`, `bg-blue-600→bg-mx-primary`, 빨강·초록 글자 → `mx-danger/success`, 그라데이션 버튼 → `mx-btn-primary`).

## 2. 이 프로그램 화면
| 화면 | 내용 |
|---|---|
| `/dashboard`(신규) | KPI(연결 폼·전체 접수·최근 7일·발송 실패), **발송 계정 3종 상태**(SMTP·SOLAPI·텔레그램), 작업 흐름 4단계, 최근 접수 5건 표(상태 칩) |
| `/submissions` | KPI(표시·발송 완료·접수만·실패) + `SubmissionMatrix`: 이름·연락처·이메일 검색, 상태 토글, 폼 선택, 실패 사유, **행별 원본 응답 펼치기** |
| `/sources` · `/promotions` · `/settings` | 히어로 + 토큰 색(카드 구조·기능 그대로) |
| `/guide`(신규) | 캐릭터, 설정 4단계(소요 시간), **채널별 필요한 연결 표**, TIP/주의(요금·수신 동의·웹훅 주소 보안), 계정 매뉴얼, FAQ |
| 사이드바 | 🏠 → 1 구글폼 연결 · 2 접수 내역 → 📢 RCS(보조) → 🔑 · 📖 → 계정, 휴대폰 ☰ |

## 3. 주의
- 상태 칩: 접수됨 `mx-chip` · 발송 완료 `mx-chip-green` · 발송 실패 `mx-chip-red`.
- Apps Script 코드 블록은 검정 배경 유지(코드 가독성), 옛 주소 교체 안내는 앰버 박스 유지.
- 실제 발송 버튼(RCS)은 검수 때 누르지 않는다(AGENTS 사전 승인 대상).

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 코드 커밋 | 맥미니 구현 커밋 반영 |
| 빌드·배포 | ✅ 윈도우 Antigravity (`npm run build` 성공, `vercel deploy --prod --yes` 성공, alias `crm-google-form.buylife.xyz` 연결 완료) |
| DB `programs.version` | ✅ `v1.09` 업데이트 완료 |
| 화면 검수 | ✅ Microsoft Edge 전용 실세션 검수 완료 (1440px 데스크톱 및 375px 모바일 캡처 보존, ☰ 모바일 메뉴, 대시보드, 가이드, 소스 화면 확인. 발송 버튼 누르지 않음) |

