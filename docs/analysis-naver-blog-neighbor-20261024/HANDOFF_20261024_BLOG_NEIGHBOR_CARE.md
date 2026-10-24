# 인수인계 — AI 블로그 이웃 소통 자동화 `blog-neighbor-care` 신규 개발 (2026-10-24)

작성: Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] — **분석·플랜·인수인계만, 코드·DB·배포는 하지 않음.**
받는 사람: **블로그 담당 [역할: blog] `claude-win-20261024-blog3`**(주인님 지정 2026-10-24).
대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). 새 폴더 `AIMaster/blog-neighbor-care/`(아직 없음, 폴더·운영 DB slug 중복은 등록 직전 다시 확인).
함께 읽을 것: [개발 플랜 2판](PLAN_20261024_BLOG_NEIGHBOR_CARE.md)(기능·「사람 느낌」 §6의 원문) · [원본 분석](REPORT.md) · 개발분석표 EXT-BLOG-07.

---

## 0. 주인님 결정 — 절대 지시 (2026-10-24, 바꾸지 말 것)
| # | 결정 |
|---|---|
| D1 | **아무 블로그가 아니라**, 회원 블로그 성격에 맞거나 회원이 원하는 블로그를 **먼저 검색·조회 → 서로 맞는 블로그에만** 이웃 신청·새 글 공감·댓글 |
| D2 | **이웃(친구) 신청이 먼저** — 수락된 서로이웃만 공감·댓글 대상 |
| D3 | 이웃 블로그에 새 글이 올라오면 **정기적으로 공감** |
| D4 | 글을 **최대한 자세히 읽고 분석한 뒤 AI가 아닌 사람처럼** 댓글(플랜 §6 규칙 전부) |
| D5 | **회원이 AI 모델 선택**(작업별: 분석 / 댓글·신청 메시지), 회원 본인 키만 |
| D6 | **하루 상한은 우리가 최대치를 정하고 회원이 그 안에서 설정** — 최대치이자 기본값 **신청 20 · 공감 100 · 댓글 30** |
| D7 | 한 이웃에게 댓글 **하루 1개까지**(회원도 못 바꿈) · 네이버 제한 안내·보안 문자·로그인 풀림 → **즉시 멈춤** · **비밀번호 저장과 링크 댓글 금지** |
| D8 | 댓글 등록 방식 회원 선택 「확인 후 등록 / 자동 등록」, **가입 후 14일은 기본 「확인 후 등록」** |
| D9 | 이름 「AI 블로그 이웃 소통 자동화」 · slug `blog-neighbor-care` · 카테고리 블로그 · **기본 프로그램** |

이와 부딪히는 구현(비밀번호 입력, 무작위 대량 신청·댓글, 상한 초과, 숨은 작업)은 만들지 않고 주인님께 여쭌다.

## 1. 한 장 요약
```
① 내 블로그 이해 → ② 맞는 블로그 찾기·점수 → ③ 서로이웃 신청·수락 관리 → ④ 이웃 새 글 감시 → 공감 → 정독 분석 → 사람 같은 댓글
[회원 크롬 · 확장]  네이버 블로그 읽기·공감·신청·댓글 입력(사람처럼), 예약 타이머, 하루 상한·이웃당 1개·즉시 멈춤
      │ 연결 토큰(Bearer)
[AIMaster 웹 blog-neighbor-care.buylife.xyz]  권한·핸드폰 · 블로그 프로필 · 후보 점수 · 댓글/메시지 생성(회원 키) · 확인 목록 · 이웃 관계 · 설정 · 기록 · 매뉴얼 · 다운로드 센터
```
- 블로그 핵심 지침(웹 완성 → 확장 입력 → 회원이 고른 발행 방식 → 결과 기록)의 정신을 그대로: **웹에서 댓글을 완성 → 확장이 입력 → 회원이 고른 등록 방식(D8) → 결과(등록 성공·실패·건너뜀)를 웹에 기록.**

## 2. 원본에서 확인한 네이버 블로그 쪽 사실 (비공식, 0단계에서 재확인)
| 용도 | 주소·요소 (원본 코드 근거, 2026-10-24) |
|---|---|
| 서로이웃 새글 피드 | `https://m.blog.naver.com/FeedList.naver` |
| 블로그 검색 | `https://m.blog.naver.com/SectionSearch.naver?searchValue=<검색어>` |
| 블로그 글 목록 | `https://m.blog.naver.com/PostList.naver?blogId=<ID>` |
| 글 보기 | `https://m.blog.naver.com/PostView.naver?blogId=<ID>&logNo=<번호>` |
| 댓글 목록 | `https://m.blog.naver.com/CommentList.naver?blogId=<ID>&logNo=<번호>` |
| 서로이웃 신청 화면 | `https://m.blog.naver.com/BuddyAddForm.naver?blogId=<ID>` (원본은 팝업 창으로 열어 메시지 입력·신청, 「내 그룹 이웃 수 초과」 문구에서 중지) |
| 이웃 그룹·이웃 관리 | `https://admin.blog.naver.com/BuddyGroupManage.naver?blogId=<내ID>`, `BuddyShortcutManage.naver` |
| 댓글 입력창·등록 버튼 | `.u_cbox_text` · `.u_cbox_btn_upload` (원본은 `execCommand("insertText")` 한 번 붙여넣기 — **우리는 사람처럼 한 글자씩**) |
| 원본 기본 대기 | 스크롤 대기 2500ms · 피드 필터 대기 4000ms · 페이지 스크롤 2~5초 무작위 · 체류 600초(무료판) |
| 네이버 화면 개편 대비 | 원본은 회원이 버튼·링크를 클릭해 선택자를 다시 저장 → 우리는 **서버 「선택자 규칙」 JSON**(로그인 필요 `GET /api/extension/rules`) + 회원 지정 보조 |
| 원본에 없던 것(공개본 누락) | manifest의 `content2.js`·`comment-scraper.js` 파일 없음 — 원본 동작 전부를 알 수는 없음 |

## 3. 기능 명세 (플랜 2판 §2 요약 — 상세는 플랜)
| 단계 | 핵심 |
|---|---|
| ① 블로그 프로필 | 내 최근 글 10~20개 → AI 프로필(주제·관심사·독자·분위기·자주 쓰는 표현) · 원하는 이웃 조건(꼭/피할 주제·지역·규모) · **회원 말투 샘플**(예전에 직접 단 댓글 5~10개) · 회원 사실 메모(댓글에 쓸 수 있는 진짜 경험만) |
| ② 후보 찾기 | 프로필 키워드 + 회원 키워드로 검색 → 후보 블로그 최근 글 3~5개 → **맞춤 점수 0~100**(주제 일치·활동성·진정성·소통 성향)과 이유 → 회원 체크(점수 기준 자동 체크 선택) |
| ③ 이웃 신청 | 고른 블로그에만, 그 블로그 글을 읽은 **맞춤 신청 메시지** · 상태 신청함/수락/대기/거절 · 7일 대기 시 취소 제안 · 하루 상한 |
| ④ 새 글 → 공감 → 정독 → 댓글 | 예약(회원 ON/OFF·간격 30분~24시간·동작 시간대) → 새 글 → 공감 → 글 길이 비례 정독(최소 30초) → 분석 메모(핵심·감정·디테일 2~3개·질문 여부) → 플랜 §6 규칙 댓글 → 등록 방식(D8) → 결과 기록 |
| 운영 | 금지어·유사 문장 검사 → 다시 생성, 자가 점검(「AI 같은지」 7점 이상 재생성), 이웃당 하루 1개, 즉시 멈춤, 처음 실행 동의, 전체 정지 버튼 |

## 4. 데이터 (승인 후 마이그레이션, 초안 — 담당이 다듬기)
```sql
-- blog-neighbor-care/supabase/migrations/<날짜>_blog_neighbor_care_init.sql
create table if not exists bnc_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  my_blog_id text, profile jsonb, wish_rules jsonb, voice_samples text[], member_facts text,
  updated_at timestamptz not null default now()
);
create table if not exists bnc_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schedule_enabled boolean not null default false,
  interval_minutes integer not null default 180 check (interval_minutes = 30 or (interval_minutes % 60 = 0 and interval_minutes between 60 and 1440)),
  active_hour_start smallint, active_hour_end smallint,
  daily_request_cap smallint not null default 20 check (daily_request_cap between 0 and 20),   -- D6
  daily_like_cap smallint not null default 100 check (daily_like_cap between 0 and 100),
  daily_comment_cap smallint not null default 30 check (daily_comment_cap between 0 and 30),
  posting_mode text not null default 'review' check (posting_mode in ('review','auto')),     -- D8
  analysis_model text, comment_model text,                                                   -- D5
  updated_at timestamptz not null default now()
);
create table if not exists bnc_candidates (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  blog_id text not null, score smallint, reasons jsonb, status text not null default 'new', created_at timestamptz not null default now(), unique (user_id, blog_id));
create table if not exists bnc_neighbors (user_id uuid not null references auth.users(id) on delete cascade, blog_id text not null,
  state text not null, requested_at timestamptz, accepted_at timestamptz, last_seen_log_no text, primary key (user_id, blog_id));
create table if not exists bnc_comments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  blog_id text not null, log_no text not null, kind text not null, analysis jsonb, body text, status text not null default 'pending',
  processing_at timestamptz, posted_at timestamptz, created_at timestamptz not null default now(), unique (user_id, blog_id, log_no, kind));
create table if not exists bnc_daily (user_id uuid not null references auth.users(id) on delete cascade, day date not null,
  requests smallint not null default 0, likes smallint not null default 0, comments smallint not null default 0, primary key (user_id, day));
-- RLS: 모든 표 enable + owner-only. 이웃당 하루 1개(D7)는 bnc_comments에서 (user_id, blog_id, posted_at::date) 확인 + 서버 거절.
-- 30일 정리: bnc_candidates(채택 안 된 것)·bnc_comments·bnc_daily — 공용 cleanup-usage-log 사본.
-- 상한 최대치 상수: lib/limits.ts 한 곳(REQUEST 20 / LIKE 100 / COMMENT 30), 화면·서버·확장 3중 확인.
```
- AI 키는 공용 `user_api_keys`(`resolveApiKey`, 폴백 없음), 텔레그램 알림(선택)은 `user_telegram_links`(`program_slug='blog-neighbor-care'`).
- 운영 DB 쓰기는 주인님 승인 뒤, 크롬 SQL 편집기에 넣어 두고 Run은 주인님.

## 5. 기준 코드 — 새로 짜지 말고 가져다 쓸 것 (2026-10-24 행 번호, 고치기 전 재확인)
| 필요 | 위치 |
|---|---|
| 웹 뼈대(좌측 메뉴·767px ☰·`/guide`·권한/핸드폰·캐시 두 줄) | `naver-blog-seo-studio`: `components/studio/StudioSidebar.tsx`(70·95행), `app/globals.css` 430행, `lib/access.ts` 27-90행, `app/dashboard/layout.tsx` 3-4행 |
| 확장 연결 토큰(Bearer) | `naver-blog-seo-studio`: `extension/web-bridge.js`, `lib/extensionBridge.ts`(`askExtension`), `lib/extensionAuth.ts` 6-16행(sha256 `token_hash`), `lib/tokenActions.ts`, `app/api/extension/whoami/route.ts` |
| 확장 ZIP 빌드(버전 자동 동기화) | `naver-blog-agent/scripts/build-extension-archive.mjs` 13-23행 → `prebuild` 연결 |
| 새 버전 알림 | `naver-blog-agent/extension/background.js` 110-125·489행(공개 `GET /api/extension/version`, 6시간) |
| 디버거 사람처럼 입력 | `naver-blog-seo-studio/extension/sidepanel.js` 320-345행 · `tistory-auto-blog/extension/tistory-adapter.js` 64-76행(실패 시 떼고 다시, `finally` 떼기) |
| 예약 타이머 | `chrome.alarms`: `naver-blog-agent/extension/background.js` 488-490행 · 판정 함수 `real_estate_sales/src/lib/publicdata/schedule.ts`(`isCollectDue`·`isWithinActiveHours`) · 설정 화면 `real_estate_sales/src/components/districts/MonitoringSettings.tsx` |
| 확인 목록·처리 중 선점(이중 등록 방지) | `instagram-comment-reply`(댓글 검토/게시, `processing_at` 선점) · `threads-comment-reply` · `youtube-auto-reply` |
| AI 모델 목록·호출(주요 공급자) | `web-crawler/webapp/src/lib/ai/models.ts`(OpenAI·Claude·Gemini·Perplexity) · 무료 호환 공용 G-1 `ai-doc-chatbot/src/lib/compatibleChat/`(미배포 기준) |
| 다운로드 센터·연결 배지 | `video-to-gif/components/LocalRendererHub.tsx`·`components/layout/Sidebar.tsx` 212·283-318행 · 간단판 `naver-blog-seo-studio/app/settings/ExtensionDownloadCard.tsx` |
| 30일 정리 | 공용 `cleanup-usage-log`(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`) |
| 확장 배포 규칙 | `docs/EXTENSION_RELEASE_RULES.md` ①~⑤ + `scripts/check-extension-release.mjs`의 `EXTENSION_PROGRAMS`(13행)에 새 slug 추가 |

## 6. 단계별 작업 (각 단계 끝에 커밋, 배포는 승인)
| 단계 | 할 일 | 완료 기준 |
|---|---|---|
| **0. 사전 검증** | ⚠ **Claude 브라우저 도구로는 blog.naver.com을 다룰 수 없다**(블로그 역할 파일 기록) → 저장소 밖 임시 확장(`m.blog.naver.com`·`admin.blog.naver.com` 권한만)을 만들어 **주인님이 크롬에 설치·실행**하고, 확장이 결과를 화면·JSON으로 보여 주면 담당이 읽는다. 확인: ① 내 글 목록·글 본문 읽기 ② 검색 결과 목록 ③ 서로이웃 새글 피드 ④ 신청 화면 요소(신청은 누르지 않음) ⑤ 댓글 입력창에 사람처럼 입력(등록 안 누름) ⑥ 네이버 하루 신청 한도·제한 안내 문구 ⑦ AI 댓글 3개 시험(최저가·상위 모델 비교, 시험 계정 키) | 실제 등록·신청 0건, 결과 `PREVALIDATION_YYYYMMDD.md`, 임시 확장 삭제 |
| 1 | 폴더 생성(뼈대 복사) · `lib/version.ts` v1.01 · 권한·핸드폰·좌측 메뉴·`/guide` · `programs` 등록(`app_url` `https://blog-neighbor-care.buylife.xyz`·카테고리 블로그·기본 요금제 3단계·`short_desc`/`description`/`detail_sections` 표준) · Vercel 프로젝트·도메인 · VIP 자동 부여 확인 · 썸네일 · §4 표 + RLS + 상한 상수 | 다른 회원 행 안 보임, 상한 초과 값 거절, `tsc`·`build` |
| 2 | ① 블로그 프로필 ② 후보 찾기·점수(확장 읽기 + 서버 AI) · AI 모델 선택 화면(품질·비용·속도 표시) | 시험 계정 블로그로 후보 20개 점수 |
| 3 | ③ 맞춤 신청 메시지·신청·관계 관리 | 주인님 승인 뒤 실제 신청 1건 |
| 4 | ④ 예약·새 글 감시·공감·정독·분석·댓글(확인 후 등록) · 플랜 §6 규칙·금지어·유사 문장·자가 점검 · 이웃당 하루 1개 · 즉시 멈춤 | 실제 댓글 1건(승인), 같은 글 두 번 안 됨 |
| 5 | 자동 등록 방식(D8)·답글 이어 가기·품질 기록·텔레그램 알림(선택) · 확장 ZIP·DB 버전 · 매뉴얼 Step 1~4 | 하루 상한·멈춤 시험, `check-extension-release.mjs blog-neighbor-care` OK |

## 7. 검수 체크리스트 (출시 전 전부 ✅)
- [ ] 비밀번호 입력칸·저장·자동 로그인 코드 0건
- [ ] 생성 댓글에 주소(`http`, `www.`, `.com` 등) 들어가면 재생성 — 시험으로 확인
- [ ] 하루 상한: 최대치(20·100·30) 넘는 값이 화면·서버·DB `check`·확장 모두에서 거절
- [ ] 이웃당 하루 댓글 1개 — 같은 이웃 두 번째 글은 건너뜀
- [ ] 네이버 제한 안내·보안 문자·로그인 풀림 모의 → 즉시 멈춤, 그날 중지, 자동 재시도 없음
- [ ] 수락된 서로이웃이 아닌 블로그엔 공감·댓글 0건
- [ ] 가입 후 14일 기본 「확인 후 등록」
- [ ] 같은 글에 같은 종류 댓글 두 번 안 됨(`unique` + `processing_at` 선점)
- [ ] 금지어 목록(플랜 §6-2)·최근 100개 유사 문장 검사 동작
- [ ] AI 키는 회원 본인 키만, 키 없으면 등록 안내
- [ ] 확장 권한은 `m.blog.naver.com`·`blog.naver.com`·`admin.blog.naver.com`·우리 웹 주소만
- [ ] 버전 3곳 일치(`lib/version.ts`·`programs.version`·manifest `version_name`), ZIP 실물 검증 OK
- [ ] 크롬 데스크톱·375px 화면 검수(웹 화면), 확장 동작은 주인님 실행 기록으로 확인

## 8. 비용 (실행 전 주인님 승인)
| 항목 | 예상 |
|---|---|
| Vercel 빌드 | 단계마다 1회 안팎, 총 4~5회 — 사전 승인, 동시 빌드 금지, 작은 수정은 모았다가 |
| AI 시험 | 0단계 비교 6회 + 단계별 몇 회(시험 계정 본인 키, 상위 모델은 품질 비교에만) |
| 운영자 인프라 | 없음(기본 프로그램) |

## 9. 남은 주의
- 블로그 담당은 지금 `naver-blog-agent` v2.21·`naver-blog-seo-studio` v2.19 시험 중 — **기존 일을 끝낸 뒤 이 작업을 시작**한다(단일 작업 순차 원칙). 시작 순서는 주인님께 여쭌다.
- 원본의 숨은 동작(무료판 월 1회 제작자 글 강제 공감·댓글, IP·패스워드 전송)과 같은 것은 어떤 형태로도 넣지 않는다.
- 프로그램 비교표 카드, 블로그 기능 비교표(`docs/BLOG_FEATURE_MATRIX.md`)에 「이웃 소통」 줄 추가, 카테고리 지침 지도 블로그 줄 갱신은 출시 작업에 포함.

## 10. 다음 첫 단계
블로그 담당은 ① 이 문서 §0 확인 → ② 지금 하던 시험을 마무리하고 → ③ `docs/ACTIVE_WORK.md`에 `blog-neighbor-care/` 줄 → ④ 0단계 사전 검증 플랜(주인님이 임시 확장을 설치·실행하는 방법 포함)을 주인님께 보고.
