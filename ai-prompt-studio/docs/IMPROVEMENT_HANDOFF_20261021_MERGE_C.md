# 병합 C 인수인계 — 프롬프트 템플릿 → AI Prompt 「📁 내 템플릿 보관함」 (2026-10-21, Claude Code 윈도우)

플랜: [PLAN_20261021_MERGE_C_PROMPT_TEMPLATES.md](PLAN_20261021_MERGE_C_PROMPT_TEMPLATES.md) · 근거: 루트 `docs/analysis-scraping-consolidation-20261021/REPORT.md` §2 C·§6

## 1. 결과
| 항목 | 상태 |
|---|---|
| DB 표 `ai_prompt_templates` (운영 `esgxyikcnnvmlhygjkth`) | ✅ 생성·RLS 본인만(공개 키 조회 0건 확인) |
| AI Prompt v1.07 (보관함·API·결과 화면 저장 버튼) | ✅ 커밋 `f0a3f529`, 배포 Ready, https://ai-prompt.buylife.xyz |
| 옛 템플릿 앱 v1.06 (안내·옮기기, 옛 AI API 410) | ✅ 같은 커밋, 배포 Ready, https://prompt-template.buylife.xyz |
| DB `programs` | ✅ ai-prompt-studio v1.07(소개·핵심 특징·사용 순서 갱신) / prompt-template-studio v1.06·`is_active=false`·배지 `['new']` |
| 권한 | 변경 없음(템플릿 권한 143명 모두 AI Prompt 권한 보유) |

## 2. 검수 (메인 크롬, 관리자 `buylifemall@gmail.com`)
- 저장 → `{{변수}}` 자동 추출 → 목록 → 수정 → 같은 제목+본문 중복 건너뛰기 → 삭제: 모두 정상(실제 API).
- 새로고침 뒤에도 보관함에 남아 있음(DB 저장 확인).
- 실행 모달에서 변수 입력 후 실행 1회(Gemini, 관리자 본인 키) → 결과 정상.
- 옛 앱: 시험 템플릿 1개를 브라우저에 넣고 「AI Prompt로 옮기기」 → 「옮기기 완료 1개」 → AI Prompt 보관함에 들어온 것 확인. 옛 API 3개 410.
- 390px: 실제 창이 최대화라 iframe 390px로 확인 — 좌측 메뉴 숨김, ☰ 표시, 가로 넘침 없음, 보관함 화면 정상.
- 시험 데이터(템플릿 2개·브라우저 시험 항목)는 모두 지움.
- 유료 호출: Gemini 실행 1회만(무료 한도 안). **AI 변수 채우기(`/api/templates/auto-fill`)·AI 제안(`suggest-field`)은 실제로 호출하지 않았습니다.**

## 3. 남은 일 · 다음 첫 단계
1. 회원이 처음 쓸 때 「AI 변수 채우기」·「AI 제안」 동작을 확인한다(코드는 옛 앱 검증본과 같은 흐름, 빌드 통과).
2. 일반 회원 계정(`buylifemall@naver.com`)으로 보관함 저장 1회 확인(관리자로만 검수함).
3. 옛 앱 주소는 회원이 옮기기를 마칠 시간을 두고 유지한다. 폐지할 때는 코드 백업(`D:\Antigravity\AIMaster_backup\retired-programs\`) + git 태그 뒤에 진행.
