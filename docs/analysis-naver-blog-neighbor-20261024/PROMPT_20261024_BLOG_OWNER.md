# 블로그 담당 전달 프롬프트 — `blog-neighbor-care` (2026-10-24)

작성: `claude-win-dotori` [역할: analysis-planning]. 블로그 담당 세션 `claude-win-20261024-blog3`(역할 ID `blog`)에 아래 코드 블록을 그대로 붙여 넣는다.

```
너는 AIMaster 저장소(D:\Antigravity\AIMaster)의 블로그 담당이다(역할 ID blog, 역할 파일 docs/roles/blog.md). 주인님이 새 프로그램 「AI 블로그 이웃 소통 자동화」(slug blog-neighbor-care, 폴더 blog-neighbor-care/, 카테고리 블로그, 기본 프로그램)를 너에게 맡겼다. 대상은 ① AIMaster 운영(DB ref esgxyikcnnvmlhygjkth). 모든 진행 안내·보고는 한국어 존댓말로 쓴다.

[먼저 할 일]
- 지금 하던 naver-blog-agent v2.21·naver-blog-seo-studio v2.19 시험을 마무리하거나, 언제 이 작업으로 넘어갈지 주인님께 여쭌다(작업을 섞지 않는다).
- docs/roles/blog.md 「대기 중」에 이 작업 줄을 넣는다(근거: 아래 인수인계).

[작업 전 반드시 읽기 — 이 순서대로]
1. node scripts/dev-requests.mjs list --role blog — 관리자 지시는 절대 지시
2. 인수인계(가장 중요, 기준 문서): docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md
3. 같은 폴더 PLAN_20261024_BLOG_NEIGHBOR_CARE.md(플랜 2판 — 특히 §6 「사람 느낌」 규칙), REPORT.md(원본 분석)
4. 루트 CLAUDE.md(새 프로그램 체크리스트·블로그 핵심 지침·최상위 규칙), docs/ERROR_LESSONS.md, docs/HANDOFF.md 맨 위, docs/ACTIVE_WORK.md
5. docs/BLOG_FEATURE_MATRIX.md, docs/EXTENSION_RELEASE_RULES.md, docs/PLATFORM_PATTERNS.md §20, docs/SIDEBAR_LAYOUT_STANDARD.md, DESIGN.md 최상위 원칙 0, docs/PROGRAM_DESCRIPTION_STANDARD.md, docs/DOMAIN_SSO_POLICY.md

[주인님 결정 — 절대 바꾸지 말 것 (인수인계 §0)]
- 아무 블로그가 아니라, 회원 블로그 성격에 맞거나 회원이 원하는 블로그를 먼저 찾아 점수로 고른 뒤 그 블로그에만.
- 이웃 신청이 먼저 — 수락된 서로이웃에게만 새 글 정기 공감·댓글.
- 글을 자세히 읽고 분석한 뒤 AI 티가 안 나는 사람 같은 댓글(플랜 §6 규칙 전부: 디테일 짚기·요약 금지·길이 흔들기·금지어·회원 말투·없는 경험 지어내기 금지·리듬).
- 회원이 AI 모델을 작업별로 선택(분석 / 댓글·신청 메시지), 회원 본인 키만(user_api_keys, 폴백 없음).
- 하루 상한은 우리가 최대치를 정하고 회원이 그 안에서 설정: 최대치이자 기본값 신청 20·공감 100·댓글 30(화면·서버·DB·확장 3중 확인).
- 한 이웃에게 댓글은 하루 1개까지. 네이버 제한 안내·보안 문자·로그인 풀림이 뜨면 즉시 멈춤(우회·자동 재시도 없음). 비밀번호 저장과 링크 댓글은 하지 않음.
- 댓글 등록 방식은 회원이 「확인 후 등록 / 자동 등록」 중 선택, 가입 후 14일은 기본 「확인 후 등록」.
- 원본의 숨은 동작(무료판 강제 홍보 작업, IP·패스워드 전송)과 같은 것은 어떤 형태로도 넣지 않는다.
이와 부딪히는 구현이 필요해 보이면 만들지 말고 주인님께 먼저 여쭌다.

[진행 순서]
- 시작할 때 docs/ACTIVE_WORK.md에 blog-neighbor-care/ 줄([역할: blog])을 넣는다.
- 코드를 고치기 전에 인수인계 §6 기준으로 이번 단계 개발 플랜(범위·순서·검수·비용)을 주인님께 먼저 보여 드린다.
- 0단계 사전 검증부터. Claude 브라우저 도구로는 blog.naver.com을 다룰 수 없으므로, 저장소 밖 임시 확장을 만들어 주인님이 크롬에 설치·실행하게 하고 그 결과를 읽는다. 실제 등록·신청은 0건, 결과는 PREVALIDATION_YYYYMMDD.md, 임시 확장은 지운다.
- 그다음 §6의 1~5단계를 순서대로. 한 단계가 끝나면 커밋하고 다음으로.

[작업 규칙]
- 기준 코드(인수인계 §5)를 가져다 쓰고 새로 짜지 않는다: 웹 뼈대·확장 연결 naver-blog-seo-studio, ZIP 빌드 naver-blog-agent, 예약 판정 real_estate_sales schedule.ts, 확인 목록·선점 instagram-comment-reply, AI 모델 web-crawler models.ts, 공용 사본 파일은 직접 고치지 않는다.
- 운영 DB 쓰기(마이그레이션·programs 등록·요금제 3단계·버전)는 주인님 승인 뒤, 크롬 SQL 편집기에 넣어 두고 Run은 주인님이 누른다.
- 비용이 드는 일(Vercel 빌드 1회 포함, 유료 AI)은 실행 전에 여쭙는다. 배포는 팀 전체 한 번에 하나, 작은 수정은 모았다가. 작업이 끝날 때마다 비용 리포트.
- 커밋: 일반 파일은 git commit -m "…" -- <경로>, 공용 문서는 node scripts/safe-commit.mjs. 커밋 직후 git show --stat HEAD | tail -1 확인. --no-verify·git add -A·git reset --hard 금지.
- 버전 v1.01 시작, lib/version.ts·programs.version·manifest version_name 함께.
- 시험은 buylifemall@naver.com(일반 회원 시험 계정)으로. 비밀번호는 입력하지 않는다.

[완료 기준]
- 인수인계 §7 검수 13개 모두 ✅, check-extension-release.mjs blog-neighbor-care OK, 웹 화면 크롬 데스크톱·375px 검수.
- 문서: 프로그램 폴더 인수인계 6종(AGENTS.md·README.md·docs/IMPROVEMENTS.md·IMPROVEMENT_BACKLOG.md·DESIGN_HANDOFF.md·PLAN_*.md), 프로그램 비교표 카드, docs/BLOG_FEATURE_MATRIX.md 「이웃 소통」 줄, 카테고리 지침 지도 블로그 줄, 외부 개발분석표 EXT-BLOG-07 진행 상태, 역할 파일, 루트 HANDOFF([역할: blog]), ACTIVE_WORK 줄 삭제.
- 작업 결과는 node scripts/dev-requests.mjs report로 관리자 화면에 남기고, 결과 보고에 프로그램 링크를 단독 줄로: https://blog-neighbor-care.buylife.xyz
```
