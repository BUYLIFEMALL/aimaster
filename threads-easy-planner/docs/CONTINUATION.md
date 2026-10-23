# Threads AI 기획기 — 다음 CLI 작업 재개 안내

> 기준: 2026-10-08 · 현재 버전: `v1.41` · 라이브: <https://threads-easy-planner.vercel.app>

이 문서는 Claude, Codex, Gemini 등 다음 작업 에이전트가 이 프로그램만 안전하게 이어서 수정하기 위한 기준점입니다.

## 작업 시작 순서

1. 루트 `AGENTS.md`, `PROGRESS.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다.
2. 이 폴더의 `AGENTS.md`, `README.md`, 이 문서를 읽습니다.
3. `git status --short`와 `git log --oneline -10`을 확인해 다른 CLI의 변경을 파악합니다.
4. `threads-easy-planner/` 내부 파일만 수정합니다. 다른 Threads 프로그램 또는 루트의 무관한 임시 파일을 커밋하지 않습니다.

## 현재 실제 기능

- 회원 자신의 OpenAI/Gemini/Claude API 키(BYOK)로 Threads 글을 생성합니다. 운영자 키·다른 회원 키 폴백은 금지입니다.
- 주제 입력, 업종/타깃 추천, 사진·동영상 분석, 맞춤글 템플릿, 5대 훅 교체, 7종 리라이팅, 보관함 자동 저장을 제공합니다.
- 생성 결과와 보관함은 `tep_saved_plans`에 회원별로 저장하고 30일 보관 정책을 적용합니다.
- PC와 모바일은 같은 URL·권한·생성·저장 흐름을 사용합니다. 모바일은 `MobileNavigation`과 하단 생성 버튼을 유지합니다.
- `PLANNER_PERSONAS`는 `src/types/planner.ts`에 정의하며, 카드 UI는 `src/components/planner/PlannerApp.tsx`가 배열을 그대로 렌더링합니다.

## v1.41에서 방금 완료한 내용

- `🌿 고부간 갈등 공감형` 페르소나를 `PLANNER_PERSONAS` 첫 항목으로 추가했습니다.
- ID는 `in_law_conflict`이며, 입력이 없어도 명절·시댁 문화·육아 방식 차이 속에서 내 감정과 경계를 다루는 기본 소재로 생성됩니다.
- 프롬프트는 특정 가족 비난, 폭로, 편 가르기, 갈등 조장, 억지 화해를 금지합니다. 현실적인 1인칭 공감과 경계 존중만 허용합니다.
- `/guide`의 페르소나 원클릭 사용 설명에도 새 유형을 반영했습니다.
- 버전은 `src/lib/version.ts`, `public.programs.version`, `supabase/migrations/0011_tep_bump_version_v1_41.sql` 모두 `v1.41`입니다.

## 수정 시 반드시 지킬 규칙

- 웹 작업 화면은 흰색 베이스를 유지합니다. 원본 설치형 프로그램의 다크 테마를 가져오지 않습니다.
- 권한이 포함된 page/route에는 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"`를 함께 선언합니다.
- 새 사용자 데이터는 반드시 `user_id`와 owner-only RLS를 둡니다. DB 스키마 변경은 주인님 승인 범위입니다.
- API 키가 없을 때 가짜 결과를 만들지 말고 API 키 등록 안내를 표시합니다.
- AI 프롬프트는 4단계 흐름, 읽기 쉬운 줄바꿈, 친근한 톤, 본문 제품명 배제 원칙을 유지합니다. 민감한 관계/건강/금전 소재는 해당 페르소나의 `tonePrompt`에 금지 표현과 안전한 서사 범위를 함께 적습니다.
- 원클릭 페르소나는 단순 카드만 추가하지 않습니다. `id`, 이름, 배지, 이모지, 설명, `tonePrompt`, `defaultTopic`을 모두 정의하고 가이드 문서도 같은 작업에서 갱신합니다.
- 실제 유료 AI 호출, 외부 최종 발행, 환경변수·DB 스키마 변경은 루트 정책의 승인 조건을 따릅니다.

## 권장 다음 작업

현재 사용자 지시가 없는 상태에서 임의로 구현하지 말고, 다음 요청이 들어오면 아래 순서로 검토합니다.

1. 새 페르소나 또는 글감 유형 추가: `PLANNER_PERSONAS` 정의 → 카드 렌더링 → 가이드 → 프롬프트 안전성 검수.
2. 생성 품질 개선: `src/lib/ai/generator.ts`와 응답 정제 함수를 함께 점검하며, 실제 회원 키를 임의로 호출하지 않습니다.
3. 보관함/모바일 UX: 서버 저장과 30일 삭제 정책, 모바일 하단 안전 여백(`pb-28`)을 훼손하지 않습니다.
4. 신규 외부 연동: 먼저 회원별 키/계정, RLS, 실제 API 응답, 오류 안내를 설계한 뒤 UI를 구현합니다.

## 완료 절차

```powershell
cd D:\Antigravity\AIMaster\threads-easy-planner
npm.cmd run build

cd ..
git add -- threads-easy-planner/<변경파일> docs/HANDOFF.md docs/ERROR_LESSONS.md
git commit -m "feat(threads-easy-planner): <요약>"
git push origin master

cd threads-easy-planner
vercel deploy --prod --yes
curl.exe -sS -I https://threads-easy-planner.vercel.app/
```

배포 후 비로그인 상태에서 `307 → /login?redirect=%2F`는 정상입니다. 실제 화면 기능은 로그인 세션에서 확인해야 합니다.

## 최근 커밋과 배포 기준점

- 기능 커밋: `f6a938d3 feat(threads-easy-planner): add in-law conflict persona (v1.41)`
- 배포: `https://threads-easy-planner-gegm2y8qk-buylife.vercel.app`
- 실제 별칭: <https://threads-easy-planner.vercel.app>
