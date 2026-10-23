# 인수인계 — Claude Code(윈도우) 2026-10-19 밤 ~ 2026-10-20 오전 세션

> 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). 다른 CLI(agy·Codex·다른 Claude 세션)가 이 문서만 읽고 이어서 작업할 수 있게 정리했다.
> 상세 구조·규칙은 [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md)(확정 구조·§6 현황·§7 주의)가 기준이다. 이 문서는 세션 요약·남은 일·주의점이다.

---

## 1. 한눈에 보기

| 구분 | 결과 |
|---|---|
| 핵심 작업 | **회원 연동 정보 공용 저장** ⓪~⑤단계 전부 완료 — 한 번 연결한 플랫폼 계정을 여러 프로그램이 함께 씀 |
| 적용 프로그램 | Threads 4 · Instagram 7 · YouTube 2 · 카카오 1 · 네이버 로그인 1 (+ 메인 「내 연동 정보」) |
| 부수 작업 | 문자 인증 시험 지원, 비밀번호 찾기 메일 SMTP 오류 해결, 보조 계정 한시 예외 종료, 부동산 공공 키 방침 기록 |
| 남은 개발 | 없음(이 주제). 개선 아이디어·주의점은 §5·§6 |
| 주인님 할 일 | 이메일 찾기 문자 인증 재시험, 크롬에 남은 Supabase 탭 2개 「나가기」로 닫기 |

---

## 2. 회원 연동 정보 공용 저장 — 무엇을 만들었나

### 2-1. 구조 (변경 금지 원칙만 요약)
- 표: `integration_catalog`(항목 9개: threads·instagram·youtube·kakao·naver_login·solapi·smtp·newsblur·cronjob_org), `member_platform_accounts`(회원별 연결 계정). 루트 `supabase/migrations/0039_member_integrations.sql`.
- 권한: 회원은 **토큰·extra를 뺀 칸만 SELECT**, 본인 행 DELETE만. 쓰기는 서비스 키만. 브라우저에서 읽을 때 `select("*")` 금지(칸 이름을 적을 것).
- 공용 부품 기준: 루트 `lib/memberIntegrations.ts` — `getMemberAccount(admin, userId, platform, { needScopes, authMethod })` / `saveMemberAccount` / `updateMemberAccountToken` / `markMemberAccountNeedsReconnect`. 사본은 **직접 고치지 않는다** — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`(목록 「member-integrations」, 사본 15개).
- 프로그램 방식(모두 같음): 연결 콜백에서 **자기 표 + 공용 표 이중 기록** → 읽을 때 **공용 먼저(조건 맞을 때) → 없으면 자기 표** → 토큰 갱신은 **읽은 곳에 기록** → 해제 시 **공용 행도 삭제**.

### 2-2. 플랫폼별 조건 (공용 계정을 쓰는 조건)
| 플랫폼 | 조건 | 이유 |
|---|---|---|
| Threads | 필요한 권한 + 재연결 필요 아님 (댓글은 + 계정 이름) | 권한은 합치지 않음 / 계정 이름으로 자기 답글 거르기 |
| Instagram | **로그인 방식(`auth_method`)에 맞는 권한** (+ Facebook 방식은 `extra.page_id`) | Facebook 로그인 토큰과 Instagram 로그인 토큰은 서로 못 씀 |
| YouTube·카카오·네이버 | 권한 + **`app_ref`가 지금 등록한 앱 ID와 같음** | 갱신 토큰은 발급한 앱으로만 쓸 수 있음 |

### 2-3. 프로그램별 현재 버전·배포 (2026-10-20)
| 단계 | 프로그램 | 버전 | 마지막 배포 |
|---|---|---|---|
| ⓪① | 메인 사이트 「내 연동 정보」(`/api-settings`) | — | `aimaster-qr1exmnyd` 이후 자동 빌드 |
| ② | threads / threads-comment-reply | v1.22 / v1.13 | `threads-ay42ddvth` / `threads-comment-reply-qu57ukuso` |
| ③ | threads-affiliate-poster / threads-content-ops | v1.66 / v2.11 | (이후 다른 세션이 더 올림) |
| ④ | insta_auto_poster / instagram-comment-reply / instagram-dm-reply / cardnews-studio | v1.30 / v1.17 / v1.16 / v1.26 | `insta-auto-poster-5o23oboys` / `-gtg47dx4s` / `-lsnxxk3af` / `cardnews-studio-2qswijqar` |
| ④⑤ | shots | v1.23 | `shots-bqoxk3vq3` |
| ⑤ | youtube-auto-reply / kakao_auto_poster / naver-cafe-poster | v1.16 / v1.24 / v1.24 | `youtube-auto-reply-jz4ln0czb` / `kakaoautoposter-66xth45f0` / `naver-cafe-poster-6bvf1y0ea` |
| 후속 | ai-influencer-studio / ai-webtoon-studio | v1.16 / v1.18 | `ai-influencer-studio-k93ebvizw` / `ai-webtoon-studio-gblpamag0` |

※ 카카오·네이버 카페·유튜브 댓글·쇼핑제휴 등은 같은 날 다른 세션이 예약 공용 코드로 더 올렸을 수 있다 — **작업 전 각 폴더 `version.ts`와 `git log -1 -- <폴더>`로 최신 확인.**

### 2-4. 운영 DB 백필 결과 (모두 주인님 승인 후 크롬 SQL Editor)
| 플랫폼 | 공용 행 | 비고 |
|---|---|---|
| Threads | 12 | Threads 연결 회원 12명 전원 |
| Instagram | 2 | 관리자·시험 회원 모두 @buylife.co.kr(Instagram 로그인) |
| YouTube | 1 | 관리자 「공동구매 아카데미」(유튜브 댓글에서) |
| 카카오·네이버 | 0 | 기존 연결 3건이 모두 예전 공용 앱 시절(본인 앱 키 없음) → 회원이 본인 앱으로 다시 연결하면 들어감 |

원본 표(`threads_accounts`·`insta_accounts`·`ig_accounts`·`dm_accounts`·`instagram_accounts`·`ytreply_accounts`·`youtube_accounts`·`user_kakao_accounts`·`ncafe_accounts` 등)는 **하나도 지우지 않았다** — 대체 경로로 계속 쓴다.

### 2-5. 후속 개선 (2026-10-20 오전)
- **YouTube 연결 하나로**: 유튜브 댓글·shots 연결 화면에 「다른 YouTube 프로그램 권한도 함께 받기」(기본 꺼짐). 켜면 `force-ssl`·`upload`·`readonly`를 `include_granted_scopes=true`로 한 번에, 공용 표에는 **Google이 실제로 내준 권한**을 기록.
- **shots Facebook 앱 키**: INSTA와 같은 순서 — `facebook_app_id`/`secret` 먼저, 없으면 `meta_app_id`/`secret`. 설정 화면에 Facebook 앱 칸 추가.
- **인플루언서·웹툰**: 카드뉴스와 같은 「공용 먼저 → 없으면 `insta_accounts`」.

플랜 문서: [`PLAN_20261020_MEMBER_INTEGRATIONS.md`](PLAN_20261020_MEMBER_INTEGRATIONS.md) · [`…_STEP4_INSTAGRAM.md`](PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md) · [`…_STEP5_YT_KAKAO_NAVER.md`](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) · [`PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md`](PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md)

---

## 3. 부수 작업 결과
| 작업 | 결과 | 기록 |
|---|---|---|
| 비밀번호·이메일 찾기 문자 인증 | 문자 미수신 원인 = 주인님 번호 오입력. 재시도 성공(솔라피 `4000`). 이메일 찾기는 **발송 기록 미확인 → 주인님 재시험 대기** | 진단 순서: 솔라피 `getMessages` + `app_metadata.password_reset.sms_sent` 둘 다 없으면 입력값 불일치 |
| 비밀번호 찾기 메일 오류 | 네이버 SMTP `535` → 주인님이 애플리케이션 비밀번호로 Vercel `SMTP_USER`·`SMTP_PASSWORD` 갱신, CLI 업로드 배포로 반영 | `docs/ERROR_LESSONS.md` (환경변수만 바꾼 재배포는 빌드 건너뛰기로 CANCELED) |
| 보조 계정 `buylifemall1` 한시 예외 | 「종료됨(2026-10-20)」 — 이제 Claude 로그인도 메인 계정만 | 루트 `CLAUDE.md`·`AGENTS.md` (`c1afb5aa`) |
| 부동산 공공데이터 키 | 당분간 운영자 공용 유지, 사용자가 많아지면 회원 본인 키로 전환 | `190f8683`, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 |

---

## 4. 남은 일 (다음 CLI가 할 수 있는 것)
| 우선 | 일 | 첫 단계 |
|---|---|---|
| 주인님 | 이메일 찾기 문자 인증 재시험 | 결과 받으면 솔라피 기록·`app_metadata` 확인 |
| 주인님 | 크롬 Supabase 탭 2개 닫기(저장 안 한 쿼리 → 「나가기」) | — |
| 선택 | 카카오·네이버 회원이 본인 앱으로 다시 연결하도록 안내 | 각 설정 화면에 「본인 앱으로 다시 연결하면 다른 프로그램에서도 함께 씁니다」 문구 검토 |
| 선택 | 옛 연결 표 정리 | **지금은 하지 않는다** — 「권한 추가 연결」 흐름이 Threads·Instagram에는 아직 없어 옛 표가 대체 경로로 필요(§7 주의) |
| 선택 | Threads·Instagram도 「권한 함께 받기」 | YouTube 방식(실제 받은 권한 기록) 참고. Meta는 Instagram/Facebook 로그인이 앱 종류별로 달라 설계 먼저 |
| 선택 | 새 플랫폼 연동 프로그램 | 처음부터 이 구조로 — `integration_catalog`에 항목 추가 → 사본 등록 → 이중 기록 없이 공용 표만 써도 됨(새 프로그램은 옛 표가 없음) |

---

## 5. 반드시 지킬 주의점 (이번 세션에서 실제로 겪은 것)
1. **권한을 합쳐 기록하지 않는다** — 다른 권한으로 다시 연결하면 그 토큰에 예전 권한이 있다고 보장 못 함. 실제 받은 권한만.
2. **Threads 운영 자동화(`tco_threads_accounts`)는 지우지 말 것** — 글·운영 설정·글감이 `on delete cascade`. Meta 제거 콜백은 토큰만 무효화한다.
3. **커밋 전 스테이징이 비어 있는지 반드시 확인하고, 비어 있지 않으면 멈춘다** — 이번 세션에서 다른 세션이 미리 스테이징한 파일이 제 커밋(`d06dc024`)에 섞였다. 스크립트: `git diff --cached --quiet || { echo 중단; exit 1; }`.
4. **공용 문서(HANDOFF·ERROR_LESSONS 등)는 수정 전에 그 파일의 미커밋 변경부터 본다** — 다른 CLI의 미커밋 이동이 제 문서 커밋(`b8d893b6`)에 함께 들어간 일이 있었다(내용 손실 없음).
5. **커밋·배포 직전에 `git log -1 -- <폴더>`와 `version.ts`를 다시 본다** — 다른 세션의 일괄 수정과 유튜브 댓글 v1.15가 겹쳐 v1.16으로 정정했다.
6. **운영 DB 쓰기는 주인님 승인 후 크롬 SQL Editor**. 저장 안 한 쿼리가 있는 탭은 다른 주소로 이동·닫기가 막히므로 **새 탭**을 연다(강제 이동은 쿼리를 버리므로 하지 않음). Run 버튼은 대략 (1240, 89), 안내 띠가 생기면 (1232, 123).
7. 실제 게시·댓글 답글·DM·카카오 발송·카페 글쓰기·연결 해제·OAuth 재연결은 회원 대신 하지 않았다 — 검수는 설정 화면·연결 상태 API·DB 대조로 했다.
8. 크롬은 그때그때 관리자/시험 회원 중 한 계정으로 로그인돼 있다 — 에이전트는 계정을 바꿔 로그인하지 않는다. 다른 계정 화면은 DB로 대체 확인하고 보고에 구분해 적는다.

---

## 6. 검수 방법 (다음 CLI가 다시 확인할 때)
- 공용 행 확인(읽기만): `select platform, connected_via, auth_method, username, array_to_string(granted_scopes, ','), (app_ref is not null) from public.member_platform_accounts order by platform;`
- 사본 일치: `node scripts/check-shared-modules.mjs` → 「모든 사본이 기준과 같고…」
- 화면: 메인 https://www.buylife.xyz/api-settings 「내 연동 정보」, 각 프로그램 설정 화면 연결 표시, 카드뉴스·인플루언서·웹툰은 `/api/instagram`(로그인 상태, `connected`·`username`·`expired`만 응답 — 토큰 없음).

---

## 7. 링크
https://www.buylife.xyz/api-settings

https://auto-threads-posting.buylife.xyz

https://auto-instagram-posting.buylife.xyz

https://instagram-comment-reply.buylife.xyz

https://instagram-dm-reply.buylife.xyz

https://cardnews-studio.buylife.xyz

https://ai-influencer.buylife.xyz

https://ai-webtoon-automation.buylife.xyz

https://shots.buylife.xyz

https://youtube-auto-reply.buylife.xyz

https://kakao-auto-posting.buylife.xyz

https://naver-cafe-poster.buylife.xyz
