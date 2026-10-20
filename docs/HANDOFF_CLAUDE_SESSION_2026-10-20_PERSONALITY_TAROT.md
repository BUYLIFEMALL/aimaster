# 세션 인수인계 — 성격·운세 4개 프로그램 미드나잇 퍼플 통일 + 서로 이어 보기 (2026-10-20, Claude Code 윈도우)

> 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). Lab(②) 미접촉.
> 다음 CLI는 이 문서 → 각 프로그램 `AGENTS.md` 맨 위 항목 → `docs/IMPROVEMENT_HANDOFF_20261020.md` 순서로 읽으면 바로 이어서 작업할 수 있습니다.

## 0. 한눈에 보기

| 프로그램 | 폴더 | 시작 → 현재 버전 | 링크 |
|---|---|---|---|
| AI 종합 성격 진단 | `personality-suite/` | v1.20 → **v1.27** | https://personality-suite.buylife.xyz |
| AIMaster 타로점 | `tarot/` | v1.20 → **v1.25** | https://tarot-reading.buylife.xyz |
| 캐릭코드(MBTI) | `mbti-character/` | v1.20 → **v1.22** | https://mbti-character.buylife.xyz |
| 성격코드(MBTI) | `mbti/` (slug `personality-code`) | v1.20 → **v1.21** | https://personality-code.buylife.xyz |

코드 `lib/version.ts`·`package.json`·DB `programs.version`·`DESIGN.md` 현황판이 모두 위 버전으로 맞춰져 있습니다. 미커밋 변경은 없습니다.

**흐름(완성)**: 성격 진단(16유형 결과) → 성격코드 → 캐릭코드 → 타로점. 각 단계는 새 창 링크이며, 유형·지표 비율(16유형만)·질문 문장만 주소로 넘깁니다. 마음 상태 등 민감한 점수는 넘기지 않습니다.

## 1. 작업 내역 (커밋 순)

| 커밋 | 프로그램·버전 | 내용 |
|---|---|---|
| `b5065b82` | 성격 진단 v1.21 | 타로점 「미스틱 미드나잇 퍼플」 토큰 이식. **Tailwind 미설치인데 Tailwind 클래스로 작성돼 깨져 있던 대시보드·매뉴얼**을 `ps-*` CSS로 재작성. FAQ 화살표 겹침(브라우저 기본 ▸ + ▼) 수정 |
| `65c2293e` | 성격 진단 v1.22 | 좌측 메뉴를 AI 이미지 스튜디오 배치로(매뉴얼 금색 카드·「가이드」 배지 → 구분선 → API 키 → 계정 맨 아래, 주인님 스크린샷 지시) |
| `c6a245bc` | 성격 진단 v1.23 | 결과 공유 PNG 미드나잇 퍼플, 결과 막대 40~60% 「⚖️ 균형 구간」 금색 띠·안내 |
| `3e7f6a0e` | 성격 진단 v1.24 · 타로점 v1.21 | 결과 → 타로점 3장 리딩 연결(`?q=&spread=&from=`), 타로 질문 입력란 흰 바탕+흰 글자 수정 |
| `623c2e18` | (전체) | `scripts/check-unstyled-tailwind.py` 추가 — Tailwind 없는 프로그램의 미정의 Tailwind 클래스 점검, 현재 0건 |
| `ec3814f0` | 성격 진단 v1.25 | 숫자키 빠른 입력 시 응답 누락 버그 수정(`indexRef`·`goTo`), 브라우저 테스트 추가 |
| `ba33d3c7` | (DESIGN.md) | 제 문자열 바꾸기 실수로 다른 프로그램 3줄(23·56·79) 버전이 올라간 것 되돌림 |
| `a427dc16` | 타로점 v1.22 | 카드 뽑기·보관함·설정 화면 다크 통일 |
| `11d5ba41` | 성격 진단 v1.26 · 캐릭코드 v1.21 · 타로점 v1.23 | 성격 진단 → 캐릭코드(유형+지표%) → 타로점 연결. **캐릭코드는 `from`이 있으면 그림 자동 생성 안 함** |
| `68ce0afc` | 타로점 v1.24 | 결과·공유·로그인·회원가입 다크 통일 → 타로점 전 화면 단일 테마 |
| `c3b08283` | 성격 진단 v1.27 · 성격코드 v1.21 · 타로점 v1.25 | 성격 진단 → 성격코드 연결, 성격코드 결과에 캐릭코드·타로점 「이어서 보기」, 지표 0~100 제한 |
| `4f2c83e4` | 캐릭코드 v1.22 | 파스텔 크림 → 미드나잇 퍼플(전역 CSS + 17개 화면 대응표, 로그인 포함) |

## 2. 다른 CLI가 꼭 알아야 할 것

1. **`personality-suite`는 Tailwind가 없습니다.** 화면은 `src/app/globals.css`의 토큰(`var(--surface)` 등)과 `ps-*` 클래스로만 만듭니다. 디자인 작업 뒤에는 `python scripts/check-unstyled-tailwind.py`(출력 없으면 정상).
2. **다크 테마 대응표**(타로점·캐릭코드에 쓴 것, 다른 프로그램 이식 시 재사용): 흰 카드 → `bg-[#120d24]`, 회색 테두리 → `border-[#2a1f4e]`(진하게 `#3e2e70`), 검정 버튼 → `bg-purple-600`/`hover:bg-purple-500`, `bg-<색>-50/100` → `bg-<색>-500/10·15`, `border-<색>-100/200` → `/30`, `text-<색>-700` → `-300`, 입력칸 → `bg-[#0d0920]`, 로그인 파란색(#005acc)·밝은 격자 → 보라·다크 격자. 의도된 색(카카오 노란 버튼, 금색 버튼의 검은 글자, 캐릭터 그라데이션)은 유지.
3. **연결 주소 규칙**: 타로점 `/draw?q=<질문>&spread=three_cards&from=<slug>` — `from` 안내 이름은 타로점 `DrawFlow.tsx`의 `FROM_LABELS` 목록에 있는 것만 표시(새 프로그램을 연결하면 여기에 추가). 캐릭코드·성격코드 `/result/<유형>?EI=&SN=&TF=&JP=&from=<slug>`(값은 우세 비율 50~100).
4. **캐릭코드 자동 과금 주의**: 결과 화면을 `from` 없이 열면 기존 동작대로 회원 키로 그림을 자동 생성합니다. 검수할 때 `from` 없는 결과 주소를 열지 마세요.
5. **공유 문서 커밋**: `docs/HANDOFF.md`·`docs/ACTIVE_WORK.md`·`docs/ERROR_LESSONS.md`에는 다른 세션의 미커밋 변경이 자주 있습니다. 내 항목만 `git hash-object` + `git update-index --cacheinfo`로 올렸습니다. `DESIGN.md` 버전은 **해당 프로그램 줄만** 바꿉니다(전체 문자열 바꾸기 금지 — 2026-10-20 실수 사례).
6. **DB 버전 갱신**: `scripts/bump_personality_suite_version.js`·`bump_tarot_version.js`·`bump_mbti_character_version.js`·`bump_personality_code_version.js`(루트 `.env.local` 서버 키, `programs.version` 한 줄만). 파일 안 버전 값을 고친 뒤 실행.

## 3. 검수 요약과 한계

- 자동: 성격 진단 단위 테스트 22·브라우저 테스트 7, 네 프로그램 `tsc`·`next build` 매번 통과. 배포는 프로그램 하나씩 순서대로, 모두 `vercel inspect` Ready.
- 화면(크롬, 관리자 계정): 네 프로그램 주요 화면, 연결 흐름 전체(성격 진단 → 성격코드 → 캐릭코드 → 타로점), 390px 폭.
- **못 본 화면**: 타로점 결과에서 카드를 뒤집어 그림이 나온 상태(유료 생성 필요) — 코드상 대응표만 적용.
- **비용**: 캐릭코드 그림 1회 확실(관리자 키, 「from 자동 생성」 문제를 발견한 계기) + 1회 가능성(390px 점검 중 `/result/ENFP` 미리보기, 미확인). 그 외 유료 AI 호출 없음. 관리자 계정에 성격 진단 결과 1건(표준 16유형) 저장됨.

## 4. 남은 작업

- 요청 범위 기준으로 남은 작업은 없습니다.
- 알려진 미완: 성격코드(`mbti/`)는 아직 밝은 테마(이번 요청 범위 밖).

## 5. 추가 개선안 (근거 · 우선순위)

| # | 분류 | 제안 | 대상 | 우선순위 |
|---|---|---|---|---|
| 1 | 화면 | 성격코드도 미드나잇 퍼플로 — 4개 중 유일하게 밝은 테마라 넘어갈 때 분위기가 바뀜. 위 대응표로 처리 | `mbti/` | 높음 |
| 2 | 기능(과금 안전) | 캐릭코드 「결과 화면 진입 시 그림 자동 생성」을 검사를 막 끝낸 경우에만(예: `TestFlow`에서 넘어올 때 `fresh=1` 같은 표시) — 지금은 새로고침·공유 링크로도 회원 키가 과금될 수 있음 | `mbti-character/components/ResultInteractive.tsx` | 높음 |
|   | ✅ 처리 | 위 2번 완료 — 캐릭코드 v1.23(2026-10-20, 커밋 `4736e0b6`), 상세 `mbti-character/AGENTS.md` v1.23 | `mbti-character/` | 완료 |
| 3 | 연계·유지보수 | 「이어서 보기」 링크 생성 코드를 공용 기준 코드로(`docs/SHARED_MODULES.md` 등록, `check-shared-modules.mjs --sync`) — 현재 4곳에 따로 있음 | 4개 프로그램 | 중간 |
|   | ✅ 처리 | 위 3번 완료 — 공용 기준 코드 `personality-program-links`(2026-10-20, 미배포), 상세 각 `AGENTS.md` | 4개 프로그램 | 완료 |
| 4 | 연계 | 회원별 「최근 검사 유형」을 공용 DB에 저장해 주소 값 없이 불러오기 — **공용 DB 새 칸이라 주인님 사전 승인 필요** | 공용 DB | 검토 |
| 5 | 화면 | 타로점 결과 카드 뒤집힌 상태 실화면 확인 — 회원이 리딩을 저장하면 `/result?rid=`로 비용 없이 확인 가능 | `tarot/` | 낮음 |
| 6 | 화면 | 캐릭코드 매뉴얼·홈의 일부 큰 제목이 좁은 폭에서 두 줄로 끊김(「16대 오리지 / 널」) — 글자 크기 조정 | `mbti-character/app/page.tsx` | 낮음 |
|   | ✅ 처리 | 위 6번 완료 — 캐릭코드 v1.24(2026-10-20, 커밋 `0d239ca7`) | `mbti-character/` | 완료 |

각 프로그램별 상세는 폴더의 `docs/IMPROVEMENT_HANDOFF_20261020.md`에 있습니다.
