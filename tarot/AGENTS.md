# AIMaster 타로점 에이전트 작업 지침 (AGENTS.md)

> 📌 2026-10-20 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261020.md`](docs/IMPROVEMENT_HANDOFF_20261020.md) · 세션 전체 [`docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md`](../docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md)

## 2026-10-20 (버전 변경 없음·미배포) — 넘어온 곳 이름을 공용 기준 코드에서 (Claude Code 윈도우)
- 한 일: 성격·운세 4개 프로그램의 「이어서 보기」 링크 코드를 공용 기준 코드 `personality-program-links`(`programLinks.ts`, 기준 `personality-suite/src/lib/`, 사본 `mbti/lib/`·`mbti-character/lib/`·`tarot/lib/`)로 모았다 — 타로점·캐릭코드·성격코드 주소, `tarotDrawLink(질문, from)`(300자 제한), `typeResultLink(주소, 유형, 지표, from)`(0~100 정수), 넘어온 곳 이름 `FROM_LABELS`. 이 프로그램은 `components/DrawFlow.tsx`의 `FROM_LABELS`를 공용 파일에서 가져온다(이전 v1.25 주의사항 「새 프로그램은 DrawFlow에 추가」 → 이제 기준 파일에 추가).
- 옛 링크와 결과가 같은지 표본 3개로 대조(같음). 동작·화면 변경 없음. 검수: tsc·build(성격 진단 단위 22 포함) 통과, 공용 코드 점검 일치.
- **미배포**(내부 정리 — 다음 배포 때 함께, 버전 +0.01도 그때). **새 프로그램을 이 흐름에 연결할 때는 기준 `FROM_LABELS`에 이름을 넣고 `--sync`**.

## 2026-10-20 v1.26 — OpenAI에 없는 모델 6개 정리 + 옛 링크 모델 이름 자동 변환 (Claude Code 윈도우)
- 증상: 리딩 모델 메뉴의 `gpt-5.5`/`gpt-5.4` + Luna·Sol·Terra 6개는 OpenAI에 없는 이름이라(`scripts/check-openai-models.mjs --live` 404, 2026-10-20) 회원이 고르면 「모델 없음」 오류.
- 수정: `lib/deck.ts` `OPENAI_MODEL_OPTIONS`에서 6개 삭제 → 시험 통과 모델 `gpt-5.5`·`gpt-5.4`로 대체(메뉴 7개). 결과 화면은 주소의 `?om=` 값을 그대로 쓰므로, 예전에 저장·공유한 링크의 옛 이름은 `normalizeOpenAIModel()`(정규식 `^(gpt-5\.[45])-(sol|terra|luna)$` → 세대 기본 모델)로 바꿔 `app/api/generate-reading/route.ts`에서 호출한다. `gpt-5.6-*`·`o1`·`o3-mini`는 그대로(시험 통과).
- 주의: 변환표를 따옴표 문자열로 쓰면 모델 점검 도구가 옛 이름을 「쓰는 모델」로 세므로 정규식으로 적었다.
- 검수: tsc·build, `check-openai-models.mjs --new` → 「17개 모두 통과」, 변환 결과 8개 표본 확인, 커밋 `3d92d336`, 배포 `tarot-7ls7by0e6` Ready, DB `tarot-reading` v1.26(크롬 SQL Editor, PRODUCTION 확인), 운영 `/draw` 모델 메뉴 7개·`v1.26` 표시 확인. 유료 리딩 호출 0회(옛 이름 실제 호출 시험은 비용 때문에 안 함 — 변환 함수만 확인).

## 2026-10-20 v1.25 — 넘어온 곳 이름에 성격코드 추가 (Claude Code 윈도우)
- `DrawFlow.tsx` `FROM_LABELS`에 `personality-code`→성격코드. 네 프로그램(성격 진단·성격코드·캐릭코드·타로점) 연결 완료.

## 2026-10-20 v1.24 — 결과·로그인·회원가입 화면까지 다크 테마 통일 (Claude Code 윈도우)
- 결과 화면(`ResultInteractive.tsx`, `app/result`)·공유 버튼(`ShareButtons.tsx`)·로그인(`app/(auth)/login`, 바탕 격자 포함)·회원가입 안내를 v1.22 대응표로 변경. 원래 어두운 카드 뒷면·확대 창·금색 버튼(검은 글자)은 그대로 둠. 로그인의 파란색(#005acc)은 보라로.
- 검수: 카드 뽑기 → 결과 화면(카드 그림은 클릭해야 생성 → AI 호출 0회 확인), 로그인은 비로그인 HTML을 스크립트 없는 미리보기로 확인. **카드를 뒤집은 상태(그림 있는 카드)의 모습은 유료 생성이 필요해 화면으로는 못 봄** — 코드상 같은 대응표 적용.
- 이로써 타로점 전 화면이 미드나잇 퍼플 단일 테마(DESIGN.md ⑪).

## 2026-10-20 v1.23 — 넘어온 곳 이름에 캐릭코드 추가 (Claude Code 윈도우)
- `DrawFlow.tsx`의 `?from=` 안내를 정해진 목록(`personality-suite`→AI 종합 성격 진단, `mbti-character`→캐릭코드)에서만 고르도록 정리. 흐름: 성격 진단 → 캐릭코드 → 타로점.

## 2026-10-20 v1.22 — 카드 뽑기·보관함·설정 화면을 다크 테마로 통일 (Claude Code 윈도우)
- 원인: 화면 바탕은 v1.20부터 다크(#090614)인데, 카드 뽑기(`DrawFlow.tsx`)·보관함(`app/history`, `HistoryList.tsx`)·설정(`app/settings`, `ApiKeyRow`, `ApiKeyRequiredModal`, `GuideLinkButton`)이 밝은 테마 클래스(`bg-white`, `text-neutral-900`, `bg-neutral-900` 버튼)로 남아 흰 카드가 떠 보이고 제목 글자가 거의 안 보였음.
- 대응표: 흰 카드→`bg-[#120d24]`, 회색 테두리→`border-[#2a1f4e]`, 검정 버튼→보라(`bg-purple-600`/그라데이션), 선택 카드→보라 테두리+`bg-purple-600/25`, 어두운 글자→`text-slate-100~500`, 입력칸→`bg-[#0d0920]`.
- **남은 화면(미수정)**: 결과 화면(`app/result`, `ResultInteractive.tsx` 약 45곳)과 로그인·회원가입(`app/(auth)`). 결과 화면은 저장된 리딩이 있어야 비용 없이 확인 가능 → 회원이 리딩을 저장한 뒤 같은 대응표로 처리.

## 2026-10-20 v1.21 — 다른 프로그램에서 질문 미리 채우기 + 질문 입력란 글자 안 보이던 문제 수정 (Claude Code 윈도우)
- `components/DrawFlow.tsx`: 주소의 `?q=`(질문, 300자), `?spread=`(SPREAD_CONFIGS에 있는 값만), `?from=personality-suite`(안내 띠)를 처음 열 때 읽어 채운다. 채우기만 하고 카드 뽑기·AI 호출은 회원이 직접 누를 때만. 첫 연결: AI 종합 성격 진단 v1.24 결과 화면.
- **기존 버그 수정**: 질문 입력란이 흰 바탕(#fff)에 거의 흰 글자(#f1f5f9)라 입력한 글이 거의 안 보였음 → 어두운 칸(#0d0920)·밝은 글자·보라 포커스 링.
- 버전 v1.21(코드 `lib/version.ts`·`package.json`, DB `programs.version`).

> **최초 제정**: 2026-09-16  
> **최종 개정**: 2026-10-19 (v1.20 크리에이티브 아틀리에 미드나잇 퍼플 리뉴얼)  
> **적용 대상**: Claude Code, Codex, Antigravity(Gemini) 등 모든 AI 에이전트  

이 프로젝트는 AIMaster 공용 Supabase 인증·권한 체계를 사용하는 `tarot-reading` 서브프로젝트(폴더명 `tarot`)입니다. 작업 전 루트 `../AGENTS.md`와 `../CLAUDE.md`, `../DESIGN.md`를 반드시 먼저 읽습니다.

---

## 1. 기본 정보 및 서비스 식별자

| 항목 | 내용 |
|---|---|
| **프로그램 번호** | **37번** |
| **프로그램 명칭** | **AIMaster 타로점 (AI Tarot Reading)** |
| **프로그램 slug** | `tarot-reading` |
| **현재 버전** | `v1.20` (`package.json`, `lib/version.ts`, Supabase DB 3중 동기화) |
| **공식 도메인** | `https://tarot-reading.buylife.xyz` (대체 도메인: `https://tarot.buylife.xyz`) |
| **적용 템플릿** | **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션** |
| **테마 및 색상** | 딥 코즈믹 미드나잇 퍼플 (`#090614` + `#120d24`) + 미스틱 퍼플 (`#a855f7`) & 골드 (`#f59e0b`) |

---

## 2. 안전 규칙 (Mandatory Safety Rules)

- 코드 생성, 수정, 로컬 테스트 및 빌드는 자율 진행합니다.
- 파일/폴더 삭제, DB 마이그레이션 적용, 환경변수 변경, 유료 API 호출은 사전 승인을 받습니다.
- 회원 본인 API 키 원칙 (BYOK): Gemini 키(카드 이미지 연성)와 OpenAI 키(심층 타로 해석)는 회원 본인이 등록한 키를 격리 세션에서 사용하며, 관리자 공용 키로 폴백하지 않습니다.
- 계정 고정: 관리자는 `buylifemall@gmail.com`, 일반 테스트 계정은 `buylifemall@naver.com`.

---

## 3. 아키텍처 및 핵심 기술 스택

1. **12종 정통 타로 스프레드 엔진**:
   - 원카드, 3카드 시간흐름, 3카드 궁합, 5카드 심층, 켈틱크로스 10카드, 커리어 6카드, 한해운세 12카드 등 12종 스프레드 지원.
2. **78장 아르카나 덱 & 12대 화풍 연성**:
   - 22장 메이저 + 56장 마이너 아르카나.
   - 르네상스 유화, 사이버펑크, 다크 고딕, 에테르 수채화 등 12대 화풍을 결합하여 Google Gemini 이미지 모델로 실시간 고유 일러스트 연성.
3. **LLM 기반 심층 종합 리딩**:
   - 카드 간의 상호작용 및 배열 위치 의미를 통합 해석하여 `tarot_readings` 테이블에 영구 저장.
4. **마이페이지 `/history` 및 소셜 공유**:
   - 카카오톡 공유 SDK (`KakaoScript.tsx`) 및 웹 링크 공유 지원.

---

## 4. 적용 디자인 템플릿 및 UI/UX 구조

- **공식 템플릿**: **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션 (Creative Atelier Style — Mystic Midnight Purple Lab Edition)**
- **토큰 시스템 (`app/globals.css`, `tailwind.config.ts`)**:
  - 배경: `--background: #090614` (딥 코즈믹 퍼플)
  - 서피스: `--surface: #120d24`, `--surface-hover: #1c1536`, `--border: #2a1f4e`
  - 포인트: `--brand: #a855f7` (미스틱 퍼플), `--brand-purple: #c084fc`, `--brand-gold: #f59e0b`, `--brand-cyan: #38bdf8`
- **헤더 네비게이션 표준화 (`components/layout/HeaderNav.tsx`)**:
  - 브랜드 칩: `v1.20 TAROT LAB` 바이올렛 발광 칩
  - 메뉴 구성: 대시보드(`/`), 카드 뽑기(`/draw`), **`📖 연동 & 사용 매뉴얼` (`/guide`)**, 내 보관함(`/history`), API 키 설정(`/settings`)
  - 모바일(767px 이하) 반응형 헤더 및 햄버거 토글 드로어 완비
- **메인 화면 (`app/page.tsx`)**:
  - 상단 썸네일 히어로 배너 및 사용 매뉴얼 퀵 링크
  - 3대 핵심 KPI 지표 카드 (78장 정통 덱, Gemini AI 실시간 연성, 맞춤형 AI 종합 해석)
  - 다크 서피스 API 키 연동 상태 카드

---

## 5. 독립 비주얼 가이드북 (`/guide/page.tsx`) 구조

- 4단계 정통 타로 리딩 파이프라인 (질문 정돈 ➔ 화풍/셔플 ➔ 카드 드로우 ➔ AI 심층 해석)
- 12종 정통 스프레드 매트릭스 & 추천 질문 가이드 테이블
- 78장 타로 아르카나(메이저 22장 + 마이너 4대 원소 56장) 구조 인포그래픽
- 100% BYOK 프라이버시 보안 배너
- 자주 묻는 질문 FAQ 5종 골드 아코디언 인터랙션

---

## 6. 검증 및 배포 절차

1. 로컬 무결성 검증: `npm run build` (Next.js Turbopack 빌드 성공 확인)
2. 프로덕션 배포: `npx vercel --prod --yes`
3. 브라우저 실세션 검수:
   - **Antigravity / Codex**: **Microsoft Edge(엣지) 전용** (`msedge.exe`, `headless: false`, 10분 창 최전면 유지).
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) SSR 세션 쿠키 주입.
   - 데스크톱(1440px) 및 모바일(375px) 6종 스크린샷 아티팩트 보존.

---

## 7. 작업 히스토리

- **v1.00 ~ v1.07**: 12종 스프레드 및 AI 카드 연성 엔진 구축.
- **v1.13**: 도메인 통일(SSO) 및 핸드폰 번호 정책 적용.
- **v1.20 (2026-10-19, Antigravity CLI)**:
  - 크리에이티브 아틀리에 미드나잇 퍼플 스타일 전면 리뉴얼.
  - `/guide` 독립 비주얼 가이드북 전면 신설.
  - 헤더 네비게이션 표준화 (`HeaderNav.tsx`, 모바일 햄버거 메뉴, `/guide` 골드 칩).
  - 메인 화면 3대 KPI 카드 및 다크 토큰 체계 적용.
  - Vercel 프로덕션 배포 및 Microsoft Edge 최전면 포그라운드 실세션 검수 완료.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
