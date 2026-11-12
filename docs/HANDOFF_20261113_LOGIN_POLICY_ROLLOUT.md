# 하위 프로그램 적용 안내: 로그인 정책 「PC 1곳 + 모바일 1곳」 (2026-11-13)

- 작성: 사이트 정책·메인 사이트 담당 `claude-win-20261112-policy` [역할: policy]
- 근거: 플랜 [`PLAN_20261112_DEVICE_SLOT_LOGIN.md`](PLAN_20261112_DEVICE_SLOT_LOGIN.md), 작업 지시서 [`WORKPLAN_20261112_DEVICE_SLOT_LOGIN.md`](WORKPLAN_20261112_DEVICE_SLOT_LOGIN.md)
- 상태: 메인 사이트·운영 DB는 **적용 완료**(2026-11-13, 실물 확인 통과). 하위 프로그램은 **각자 다음 배포 때 함께** 고칩니다. 이 두 가지만을 위해 따로 배포하지 않습니다(빌드 비용).

## 1. 지금 규칙 (모든 프로그램 공통, 이미 동작 중)

- 같은 계정은 **PC 브라우저 1곳 + 모바일 브라우저 1곳**까지 동시에 접속합니다. 같은 종류에서 새로 로그인하면 그 종류의 예전 로그인만 **모든 프로그램에서** 끊깁니다(DB 트리거 `trg_enforce_login_device_slot`, 프로그램 코드와 무관).
- 관리자·시험 계정은 예외입니다(`profiles.concurrent_login_exempt`).
- 확장 프로그램 연결 토큰·서버 예약 작업은 영향이 없습니다.

## 2. 각 프로그램이 다음 배포 때 넣을 것 (두 가지)

### 2-1. 로그아웃은 「이 브라우저만」
`supabase.auth.signOut()` → `supabase.auth.signOut({ scope: "local" })`. 범위가 없으면 그 계정의 **모든 기기·모든 프로그램**이 끊깁니다(무료음악·쇼츠 동시 로그아웃 문제의 원인). **비밀번호 재설정 화면만** 그대로 둡니다.

### 2-2. 서버가 대신 로그인하면 브라우저 기기 정보를 넘기기
서버 액션·API에서 `signInWithPassword`를 부르는 프로그램은 서버용 Supabase 클라이언트(`lib/supabase/server.ts` 등)에 넣습니다. 넣지 않으면 그 로그인은 「기타」로 기록되어 동시 접속 제한에서 빠집니다(회원 피해는 없지만 규칙이 안 지켜짐). Lab 실제 로그인 시험으로 동작 확인됨(2026-11-13).
```ts
import { headers } from "next/headers";
const ua = (await headers()).get("user-agent") ?? "";
return createServerClient(url, key, {
  cookies: { /* 기존 그대로 */ },
  global: { headers: { "User-Agent": ua } },
});
```

## 3. 확인 방법 (배포 전)

`node scripts/pending-check.mjs <폴더>` — 남아 있으면 「[공통] 범위 없는 signOut()」「[공통] 서버 로그인 기기 정보 미전달」이 뜹니다. 고치면 사라집니다. 전체 남은 목록: `node scripts/pending-check.mjs --all`.
완료 보고에 「로그인 정책: 로그아웃 local·기기 정보 전달 반영」을 적습니다.

## 4. 역할별 남은 프로그램 (2026-11-13 기준, 92개)

괄호: (로그아웃) = 2-1만, (기기 정보) = 2-2만, (둘 다).

| 역할 | 개수 | 프로그램 |
|---|---|---|
| blog | 9 | `ai-auto-blog`(둘 다) · `blog-content-maker`(로그아웃) · `blog-keyword`(로그아웃) · `blog-workroom`(로그아웃) · `naver-blog-agent`(둘 다) · `naver-blog-allinone`(로그아웃) · `naver-blog-auto-poster_web`(로그아웃) · `naver-blog-seo-studio`(로그아웃) · `tistory-auto-blog`(둘 다) |
| design | 1 | `threads-content-ops`(로그아웃) |
| docbot-prompt | 2 | `ai-doc-chatbot`(둘 다) · `ai-prompt-studio`(둘 다) |
| ecommerce-image | 4 | `ai-image-studio`(둘 다) · `banana-canvas`(로그아웃) · `shop-detail-page`(둘 다) · `trending-product-finder`(둘 다) |
| mall-builder | 1 | `mall-builder`(로그아웃) |
| music | 6 | `ai-mastering-studio`(둘 다) · `ai-music-studio`(둘 다) · `lyric-video-studio`(로그아웃) · `music`(둘 다) · `music-video-studio`(둘 다) · `playlist-channel-studio`(둘 다) |
| realty | 2 | `realty-listing-alert`(로그아웃) · `real_estate_sales`(둘 다) |
| video | 2 | `ai-video-studio`(둘 다) · `infinite-loop-video`(둘 다) |
| workspace | 2 | `ai-task-planner`(로그아웃) · `ai-work-workspace`(로그아웃) |
| 미지정 | 63 | `ai-audio-analyzer`(둘 다) · `ai-slide-builder`(둘 다) · `ai-webtoon-studio`(로그아웃) · `ai-writing-editor`(로그아웃) · `allinone-graphic`(둘 다) · `auto-detail-page`(둘 다) · `booking-reminder`(둘 다) · `cinematic-storyboard-studio`(둘 다) · `comment-inbox`(둘 다) · `commercial-land-trade-alert`(둘 다) · `competitor-analysis`(둘 다) · `coupang-ops`(둘 다) · `crm-google-form`(둘 다) · `document-translator`(로그아웃) · `elevenst-register`(둘 다) · `emotion-writer`(둘 다) · `fashion-style`(로그아웃) · `file-merge`(로그아웃) · `four-cut-comics`(로그아웃) · `free-music-studio`(둘 다) · `ghost-scraper`(로그아웃) · `image-convert-studio`(둘 다) · `instagram-comment-reply`(둘 다) · `insta_auto_poster`(둘 다) · `kakao_auto_poster`(둘 다) · `landing-architect`(로그아웃) · `longtail-keyword-expander`(둘 다) · `markdown-studio`(로그아웃) · `mbti`(둘 다) · `mbti-character`(둘 다) · `music-player`(로그아웃) · `naver-blog-auto-poster_app`(로그아웃) · `naver-cafe-poster`(둘 다) · `naver-cafe-recruit`(둘 다) · `persona-style-studio`(둘 다) · `personality-suite`(로그아웃) · `photo-remake-studio`(로그아웃) · `portrait-photo`(로그아웃) · `prompt-template-studio`(둘 다) · `react-ui-showcase`(둘 다) · `realty-client-desk`(둘 다) · `reverse-prompt`(로그아웃) · `seller-label-docs`(둘 다) · `shop-order-report`(둘 다) · `shorts-onestop-studio`(로그아웃) · `shorts-viral-studio`(둘 다) · `shots`(둘 다) · `smartstore-register`(둘 다) · `stepmail`(둘 다) · `style-dna-analyzer`(둘 다) · `suno-music-studio`(둘 다) · `tarot`(둘 다) · `threads`(둘 다) · `threads-affiliate-poster`(둘 다) · `threads-comment-reply`(둘 다) · `threads-easy-planner`(둘 다) · `thumbnail-master`(로그아웃) · `ui-canvas`(로그아웃) · `video-to-gif`(둘 다) · `vinyl-lp-studio`(둘 다) · `wp-blogger-auto`(둘 다) · `youtube-auto-reply`(둘 다) · `youtube-viral-studio`(둘 다) |

- 역할은 `docs/roles/*.md`의 「맡은 폴더」 기준입니다. 「미지정」은 그 프로그램을 다음에 배포하는 세션이 함께 넣습니다.
- 이 표는 시간이 지나면 낡습니다. 최신 목록은 항상 `pending-check --all`로 봅니다.
