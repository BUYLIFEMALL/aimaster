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

## 이어서 작업하는 CLI를 위한 안내

### 현재 상태 한눈에
- 반영 완료: 80/80(`select count(*) from programs where description like '%<p><br></p>%'` = 80). 커밋 `7b1d73a1`(이 문서·`HANDOFF.md`·`ERROR_LESSONS.md`). **설명의 원본은 DB**이며 저장소에는 설명 문구 파일이 없다.
- 작업 장비: 맥미니(Claude Code 보조 계정, 크롬은 맥미니 크롬). DB는 Supabase MCP `execute_sql`로 수정(프로젝트 `esgxyikcnnvmlhygjkth`). 화면 확인은 `https://www.buylife.xyz/programs/<slug>`.

### 설명을 고치거나 새로 쓸 때 순서
1. 현재 값을 먼저 파일로 백업한다: `select slug, description from programs where slug in (...)`.
2. 프로그램 폴더의 README·AGENTS·`docs/CLI_HANDOFF.md`·`DEVELOPMENT_PLAN.md`로 **실제 기능**을 확인한다(아래 대응표). 문서에 없는 기능은 쓰지 않는다. 필요한 키·계정(본인 API 키 등)과 주의점은 마지막 단락에 쓴다.
3. 형식: `<p><strong>🎯 한 줄 소개</strong></p><p>🔎 기능 단락</p>…`을 만들고 `replace($d$…$d$, '</p><p>', '</p><p><br></p><p>')`로 단락 사이에 빈 줄 단락을 넣어 저장한다.
4. `https://www.buylife.xyz/programs/<slug>`에서 단락 간격을 확인한다.
5. DB 값만 바꾼 작업은 프로그램 버전을 올리지 않는다(버전 규칙은 코드·배포를 바꿀 때만).

### 슬러그와 폴더가 다른 프로그램(분석 시 찾는 위치)
| slug | 폴더 |
|---|---|
| auto-instagram-posting | `insta_auto_poster/` |
| auto-threads-posting | `threads/` |
| auto-shorts-posting | `shots/` |
| kakao-auto-posting | `kakao_auto_poster/` |
| real-estate-sales | `real_estate_sales/` |
| web-crawler-saas | `web-crawler/`(`service/`, `webapp/`) |
| website-scraper | `ghost-scraper/` |
| music-automation | `music/` |
| personality-code | `mbti/` (캐릭코드 `mbti-character`는 별도 폴더) |
| tarot-reading | `tarot/` |
| shop-detail-page | `shop-detail-page/` |
| naver-blog-auto-poster / -web | `naver-blog-auto-poster_app/` / `naver-blog-auto-poster_web/` |
| 나머지 | slug와 같은 폴더(`ai-ui…` 등 일부는 `ai-web-ui`처럼 AGENTS가 없을 수 있음) |

### 남은 일(우선순위 순)
| # | 일 | 담당·메모 |
|---|---|---|
| 1 | 성격코드(`personality-code`)가 로그인 없이 열리는 문제(핵심 원칙 0·6번과 충돌) 처리 | **주인님 결정 필요** — 코드(`mbti/`)를 로그인·FREE 판정 구조로 바꿀지, 예외로 둘지. 결정 전에는 설명을 바꾸지 않는다 |
| 2 | 기능이 단순한 프로그램 설명이 300자 안팎 | 주인님이 더 길게 원하면 기능 단락을 보강(없는 기능으로 채우지 말 것) |
| 3 | 화면 확인이 안 된 78개 상세 페이지의 단락 간격·줄바꿈 확인 | 맥미니 크롬으로 `/programs/<slug>` 열어 확인. 같은 HTML 형식이라 위험은 낮음 |
| 4 | 프로그램 이름 표기 통일(`Website Scraper`·`eBook Studio`·`YOUTUBE VIRAL FINDER`·`상세페이지 자동생성기 v1` 등) | 이번 범위 아님, 주인님 지시 시 |
| 5 | 새 프로그램 등록 때 설명도 이 형식으로 쓰기 | 루트 `CLAUDE.md` 체크리스트에 넣을지는 주인님 지시 시(메인 지침이라 임의로 고치지 않음) |

### 주의
- 이전 설명은 백업 없이 덮어썼다(복구하려면 Supabase 시점 복구 또는 새로 작성).
- 설명 문구는 문서 기준이며 프로그램 실제 동작을 전부 화면에서 확인한 것은 아니다.
- 카탈로그 카드의 한 줄 요약(`short_desc`)은 이번에 손대지 않았다. 일부는 새 설명과 표현이 겹치거나 길다(예: 100자 이상) — 필요하면 별도 작업.
