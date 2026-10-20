# 🔑 AIMaster — 39번 성격코드(MBTI) 측정기 (AGENTS.md)

> 📌 2026-10-20 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261020.md`](docs/IMPROVEMENT_HANDOFF_20261020.md) · 세션 전체 [`docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md`](../docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md)

## 2026-10-20 (버전 변경 없음·미배포) — 「이어서 보기」 링크를 공용 기준 코드 사본으로 (Claude Code 윈도우)
- 한 일: 성격·운세 4개 프로그램의 「이어서 보기」 링크 코드를 공용 기준 코드 `personality-program-links`(`programLinks.ts`, 기준 `personality-suite/src/lib/`, 사본 `mbti/lib/`·`mbti-character/lib/`·`tarot/lib/`)로 모았다 — 타로점·캐릭코드·성격코드 주소, `tarotDrawLink(질문, from)`(300자 제한), `typeResultLink(주소, 유형, 지표, from)`(0~100 정수), 넘어온 곳 이름 `FROM_LABELS`. 이 프로그램은 `app/result/[type]/page.tsx` `NextSteps`가 공용 함수를 부른다(지표는 `DIMENSION_LABELS`의 4개만 넘김).
- 옛 링크와 결과가 같은지 표본 3개로 대조(같음). 동작·화면 변경 없음. 검수: tsc·build(성격 진단 단위 22 포함) 통과, 공용 코드 점검 일치.
- **미배포**(내부 정리 — 다음 배포 때 함께, 버전 +0.01도 그때). **새 프로그램을 이 흐름에 연결할 때는 기준 `FROM_LABELS`에 이름을 넣고 `--sync`**.

## 2026-10-20 v1.21 — 결과 → 캐릭코드·타로점 「이어서 보기」 (Claude Code 윈도우)
- `app/result/[type]/page.tsx` 하단 `NextSteps` 카드: 「🎭 캐릭코드에서 내 캐릭터 보기」(`mbti-character.buylife.xyz/result/<유형>?축%&from=personality-code`, 캐릭코드는 from이 있으면 그림 자동 생성 안 함) · 「🃏 타로점에서 3장 뽑기」(유형·별칭만 담은 질문, `from=personality-code`). AI 호출 없음.
- 성향 지표 값을 0~100으로 제한해 표시(주소로 받은 값 검증). AI 종합 성격 진단 v1.27의 16유형 결과에서 이 화면으로 들어온다.

> **프로그램 정보**
> - **프로그램 번호**: 39번
> - **프로그램명**: 성격코드(MBTI) 측정기 (`personality-code`, `mbti/`)
> - **공식 배포 주소**: https://personality-code.buylife.xyz
> - **버전**: `v1.20` (3중 동기화 완료: `package.json` 1.20.0, `lib/version.ts` v1.20, Supabase DB `programs` v1.20)
> - **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 랩 에디션 (Creative Atelier — Pastel Personality Lab Edition)**

---

## 1. 프로그램 사용목적 및 대상 (Target & Purpose)
- **목적**: 융(Jung) 심리유형론의 4대 이분지표(E/I, S/N, T/F, J/P)를 정밀 분석하여 16가지 성격 유형 중 나의 진짜 성향을 찾아내고, 결과 카드를 친구 및 SNS에 공유하는 성격유형 측정 도구입니다.
- **대상**: 나의 타고난 성향과 숨겨진 강점을 알고 싶은 개인, 팀원 간의 소통 코드를 맞추고 싶은 스타트업/조직, 카카오톡/인스타그램에 재미있는 심리 분석 카드를 공유하고 싶은 일반 사용자.

---

## 2. 개발 도구 및 기술 스택 (Tech Stack & Skills)
- **Framework**: Next.js 14.2.35 (App Router)
- **UI & Styling**: React 18, Tailwind CSS v3.4.1, Lucide React
- **Icons**: Lucide Icons
- **Backend / Auth**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`), 서비스 롤 관리자 권한
- **Social Sharing**: 동적 OG 이미지 생성기 (`app/api/og/route.tsx`), 카카오톡 공유 SDK
- **Deployment**: Vercel Production (`https://personality-code.buylife.xyz`)

---

## 3. 핵심 기능 및 아키텍처 (Features & Architecture)
1. **2분 퀵 진단 (20문항)**: 핵심 문항으로 신속하게 4대 성격 지표를 산출하여 16가지 유형 카드 도출.
2. **10분 정식 진단 (60문항)**: 다각도 교차 검증 문항을 통해 성향의 강도와 균형을 정밀 채점.
3. **독립 비주얼 가이드북 (`/guide`)**: 4단계 진단 파이프라인 다이어그램, 4대 이분지표 대비 매트릭스 표, 16유형 4대 기질 맵, FAQ 5종 파스텔 아코디언 제공.
4. **100% 프라이버시 안심 로컬 연산**: 응답 내역이 서버에 저장되지 않고 브라우저 로컬에서 안전하게 채점.
5. **동적 SNS 공유 카드**: 카카오톡 및 인스타그램 공유 시 유형별 맞춤 뱃지와 설명이 담긴 고화질 OG 카드 자동 생성.

---

## 4. 버전 및 변경 히스토리 (Changelog)
- **v1.20 (2026-10-19, Antigravity 윈도우)**:
  - 크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 랩 에디션 전면 디자인 리뉴얼
  - 상단 헤더: `🔑 성격코드 LAB`, `v1.20` 파스텔 뱃지, [📖 16성격 가이드북 (`/guide`)] 퀵 버튼 탑재
  - 메인 워크스페이스: `.studio-hero` 파스텔 배너, 3대 KPI 카드, 검사 선택 듀얼 카드, 16유형 4대 기질 갤러리 칩셋
  - 독립 비주얼 가이드북 (`/guide`) 전면 신설
  - Next.js 프로덕션 빌드 무결성 통과 및 Vercel 배포 완료
  - Microsoft Edge 최전면 포그라운드(headless: false) 6종 캡처 수집 및 10분 화면 유지 검수 완료
  - 버전 3중 동기화 완료 (`package.json`, `version.ts`, DB `programs` v1.20)
- **v1.05 (2026-10-16)**: 공통 이용 권한 판정 및 로그인 화면 도입

---

## 5. 백로그 및 남은 작업 (Pending Tasks & Backlog)
- `mbti/docs/IMPROVEMENT_BACKLOG.md` 참고.

---

## 6. 타 프로그램 연계 및 혁신 아이디어 (Integration & Ideas)
- **38번 캐릭코드(MBTI) 측정기 (`mbti-character`)와의 파이프라인 결합**: 성격코드 결과에 맞춰 AI 캐릭터/아바타 일러스트를 자동 매칭하여 굿즈나 프로필 이미지로 다운로드 지원.
- **AI 맞춤형 소통 팁 & 대인관계 시뮬레이터**: 두 사람의 유형을 선택하면 갈등 예방 팁과 업무 협업 가이드를 AI가 즉시 분석해주는 기능.

---

## 7. UI/UX 및 스타일 가이드 (UI/UX Guide)
- `mbti/docs/DESIGN_HANDOFF.md` 참고.
