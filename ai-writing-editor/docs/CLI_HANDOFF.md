# ai-writing-editor CLI 인수인계 (2026-10-14, v1.02)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 글쓰기 에디터 자동화 / `ai-writing-editor` |
| 운영 주소 | https://ai-writing-editor.buylife.xyz (Vercel `buylife/ai-writing-editor`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` |
| DB | `ai_writing_editor_documents`(0001, RLS owner-only), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), 카테고리 Tools |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-ai-writing-editor-vercel-env.mjs`로 등록 완료). 운영자 AI 키는 등록하지 않음 |
| 키 매뉴얼 | 기존 Gemini 매뉴얼 `f442cd37-…` 재사용(새 매뉴얼 없음) |
| 버전 | v1.02 (코드 `src/lib/version.ts`, package.json 1.0.2, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 원본 분석: AI Studio "매직 에디터" `geminiService.ts`·`types.ts`·`App.tsx`·`HomeScreen.tsx`·`FloatingToolbar.tsx`와 사용법 화면 직접 열람(플랜: `DEVELOPMENT_PLAN.md`). 이름은 주인님이 "AI 글쓰기 에디터 자동화"로 확정.
- 단위 11/11, 보이는 Chrome 14/14(모의 API: 생성→저장→에디터, 툴바, 되돌리기, 직접 지시, 분석·필터·적용·바뀐 문장 처리·모두 적용, 자동 저장, 내보내기, 오류, 기존 글 분석, 문서 삭제, 키, 모바일), 빌드.
- 실제 Gemini 호출(운영자 본인 키): 블로그 초안, 인터넷 검색 초안, 선택 수정(전문적으로), 직접 지시, 전체 분석(결함 있는 글에서 제안 6개 → 6개 모두 정확히 적용).
- 운영 화면(로그인 상태): 주제 입력 → 초안 생성·저장 → 에디터 → 문단 선택 시 플로팅 툴바 → [짧게] 수정 → [글 분석] 제안 4개 표시(테스트 문서는 삭제).
- `X-Vercel-Cache`/헤더는 blog-keyword와 같은 골격(`private, no-store`).
- v1.02: 운영 확인 중 발견한 두 가지 수정 — 블로그 초안의 `**` 굵게 기호·구분선(프롬프트에서 금지), 문서 제목에 `**메타 제목:**`가 남던 문제(`deriveTitle` 정리).

## 알려진 한계 / 남은 일
1. 일반 회원(buylifemall@naver.com) 계정으로 로그인한 화면 확인(비밀번호 입력은 에이전트가 하지 않음).
2. 인터넷 검색 옵션은 모델이 실제로 검색했을 때만 출처가 붙는다(검색하지 않으면 출처 0건). 프롬프트에 "반드시 검색"을 넣었지만 보장은 아니다.
3. 에디터는 plain textarea라 마크다운이 서식으로 렌더링되지 않는다(.md로 내려받아 다른 도구에서 본다). 서식 에디터(리치 텍스트)는 후속 아이디어.
4. 후속 아이디어: 문서 버전 기록, 여러 제안 중 선택 적용 미리보기(diff), 말투 프리셋을 페르소나 문체 자동화와 연결.
