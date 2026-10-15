# 프로그램 상세 설명 전체 재작성 (2026-10-15, 맥미니 세션)

## 무엇을 했나
- 주인님 요청: 프로그램마다 설명 형식이 제각각(한 줄로 길게 이어짐·비어 있음·HTML/마크다운 혼재)이라, 각 프로그램의 README·AGENTS·인수인계 문서와 기존 설명을 분석해 **500자 내외, 단락 나눔, 이모티콘** 형식으로 다시 써서 넣었다.
- 대상: 공용 DB `programs.description` **80개 전부**(비공개 `naver-blog-auto-poster`·`-web` 포함). `short_desc`(카드 한 줄 요약)·이름·버전은 바꾸지 않았다. 코드·배포 변경 없음(DB 값만 변경).
- 결과: 화면에 보이는 글자 수 평균 385자(최소 205, 최대 567). 단순한 프로그램(성격코드·캐릭코드·네이버 블로그 App/Web 등)은 기능이 적어 300자 안팎이다 — 없는 기능을 채워 넣지 않았다.

## 형식 규칙(앞으로 설명을 고칠 때도 같게)
- 저장 형식은 에디터가 쓰는 HTML이다. **단락마다 `<p>…</p>`, 단락 사이에는 빈 줄 단락 `<p><br></p>`을 넣는다.**
- 이유: 메인 사이트 상세 페이지(`app/(main)/programs/[slug]/page.tsx`)는 `prose` 스타일로 그리는데 `<p>` 사이 간격이 없어, 빈 줄 단락이 없으면 줄만 바뀌고 붙어 보인다(2026-10-15 `ai-webtoon-studio`로 확인 후 반영).
- 구성: 첫 단락은 굵은 한 줄 소개(`<strong>`), 이어서 기능 단락 2~4개, 마지막에 필요한 키·계정·주의(본인 API 키, 브라우저 처리 여부 등). 단락 앞에 이모티콘 1개.
- 반영은 Supabase `execute_sql`의 `update programs set description = replace($d$<p>…</p><p>…</p>$d$, '</p><p>', '</p><p><br></p><p>') where slug='…'` 형태로 했다. 관리자 프로그램 편집 화면(`/admin/programs/<id>/edit`)의 "상세 설명" 에디터에서도 같은 모양으로 보인다.

## 기존 설명이 낡았거나 정책과 달라 보여 고친/확인할 것
- `tarot-reading`: 설명이 3카드 스프레드뿐이었으나 README는 12종 스프레드·12종 화풍·OpenAI 해석·내 타로 보관함 → README 기준으로 갱신.
- `ai-task-planner`: 설명이 v1.03("AI 분석 준비 중")이었으나 v1.04부터 AI 분석·JSON 가져오기·CSV 내보내기 제공 → 갱신.
- `personality-code`(성격코드): 코드(`mbti/`)에 로그인 확인이 없고 README도 "로그인 없이 누구나"라서 설명을 그대로 유지했다. **핵심 원칙 0·6번(비로그인 방문자는 사용 불가, FREE 배지는 가입 회원 대상)과 어긋나는 구현**이므로 주인님 판단이 필요하다(설명만 바꾸지 않았다).
- `web-crawler-saas`: 폴더 `web-crawler/`(루트 README는 Claude Code용 에이전트 설명, 실제 서비스는 `web-crawler/service`+`webapp`)라 서비스 README 기준으로 작성.
- 이름 표기 불일치(`Website Scraper`·`eBook Studio`·`YOUTUBE VIRAL FINDER`·`상세페이지 자동생성기 v1` 등)는 이번 범위가 아니라 그대로 두었다.

## 주의
- **이전 설명은 별도 백업 없이 덮어썼다.** 되돌려야 하면 Supabase 시점 복구를 쓰거나 해당 프로그램 설명을 다시 써야 한다. 앞으로 대량 수정 전에는 `select slug, description from programs`를 파일로 남긴다.
- 설명에 쓴 사실은 문서 기준이다. 화면에서 실제 동작을 모두 확인한 것은 아니다(확인: `ai-webtoon-studio`, `four-cut-comics` 상세 페이지 표시).
