# 도메인 통일(SSO) 작업 플랜 — 남은 27개 프로그램을 `<slug>.buylife.xyz`로 (2026-10-16, Claude Code 윈도우)

> 근거 정책: [`DOMAIN_SSO_POLICY.md`](DOMAIN_SSO_POLICY.md) (루트 `CLAUDE.md` 핵심 원칙 11). 이 문서는 그 정책을 남은 프로그램 전체에 적용하는 실행 계획이다.

## 1. 문제
- 활성 프로그램 중 27개의 `programs.app_url`이 아직 `*.vercel.app`이다. 로그인 쿠키는 `.buylife.xyz`에서만 공유되므로, 이 프로그램들은 메인 사이트(`www.buylife.xyz`)에서 로그인해도 **프로그램마다 따로 다시 로그인**해야 한다.
- 27개 모두 쿠키 공유 코드(`lib/supabase/cookieDomain.ts` 등 4곳)도 아직 없다(2026-10-16 폴더 조사).

## 2. 목표
- 모든 프로그램 주소 = `<slug>.buylife.xyz`, 로그인 한 번이면 메인·모든 프로그램에서 재로그인 없이 이동.
- 옛 `vercel.app` 주소는 지우지 않는다: 화면 주소는 새 주소로 308 이동, API·OAuth 콜백·확장 접속 주소는 그대로 동작.

## 3. 대상 (그룹별 진행 순서)

### A그룹 — 일반 프로그램 19개 (OAuth 없음, 코드 4곳 + 도메인)
| 순 | slug(= 새 서브도메인) | 폴더 | Vercel 프로젝트 | 주의 |
|---|---|---|---|---|
| 1 | ✅ tarot-reading | `tarot` | tarot | FREE 유도 프로그램(가입 유입 많음) |
| 2 | ✅ mbti-character | `mbti-character` | mbti-character | |
| 3 | ✅ personality-code | `mbti` | mbti | |
| 4 | competitor-analysis | `competitor-analysis` | competitor-analysis | |
| 5 | longtail-keyword-expander | `longtail-keyword-expander` | longtail-keyword-expander | |
| 6 | trending-product-finder | `trending-product-finder` | trending-product-finder | |
| 7 | shop-detail-page | `shop-detail-page` | shop-detail-page | |
| 8 | auto-detail-page | `auto-detail-page` | auto-detail-page | 개발 중(coming) |
| 9 | video-to-gif | `video-to-gif` | video-to-gif | app_url이 `/dashboard`까지 포함 |
| 10 | ai-image-studio | `ai-image-studio` | ai-image-studio | |
| 11 | threads-easy-planner | `threads-easy-planner` | threads-easy-planner | |
| 12 | real-estate-sales | `real_estate_sales` | real-estate-sales | |
| 13 | music-automation | `music` | music | |
| 14 | booking-reminder | `booking-reminder` | booking-reminder | 문자 발송 링크 확인 |
| 15 | crm-google-form | `crm-google-form` | crm-google-form | 구글폼 연동 주소 확인 |
| 16 | web-crawler-saas | `web-crawler/webapp` | web-crawler-saas | |
| 17 | ai-auto-blog | `ai-auto-blog` | ai-auto-blog | **크롬 확장** |
| 18 | tistory-auto-blog | `tistory-auto-blog` | tistory-auto-blog | **크롬 확장** |
| 19 | naver-blog-agent | `naver-blog-agent` | naver-blog-agent | **크롬 확장** |

### B그룹 — 외부 계정 연결(OAuth) 8개
| 순 | slug | 폴더 | 콜백 주소 방식(코드 확인) |
|---|---|---|---|
| 20 | auto-threads-posting | `threads` | 환경변수 고정 `THREADS_REDIRECT_URI` |
| 21 | threads-affiliate-poster | `threads-affiliate-poster` | 환경변수 고정 `THREADS_REDIRECT_URI` |
| 22 | threads-comment-reply | `threads-comment-reply` | 환경변수 고정 `META_THREADS_REDIRECT_URI` |
| 23 | auto-instagram-posting | `insta_auto_poster` | 환경변수 고정(`META_INSTAGRAM_REDIRECT_URI`, `..._BYOK_...`) |
| 24 | instagram-comment-reply | `instagram-comment-reply` | 환경변수 고정 `META_INSTAGRAM_REDIRECT_URI` |
| 25 | instagram-dm-reply | `instagram-dm-reply` | 환경변수 고정 `META_INSTAGRAM_REDIRECT_URI` |
| 26 | youtube-auto-reply | `youtube-auto-reply` | 환경변수 고정 `GOOGLE_YOUTUBE_REDIRECT_URI` |
| 27 | naver-cafe-poster | `naver-cafe-poster` | 환경변수 고정 `NAVER_REDIRECT_URI` |

- 8개 모두 콜백이 **옛 주소로 고정**돼 있어, 회원이 본인 Meta·Google·네이버 앱에 등록한 콜백 주소를 **바꾸지 않아도 된다**.
- 단, 연결 시작은 새 주소(로그인 쿠키 있음)에서 하고 콜백은 옛 주소(쿠키 없음)로 돌아오므로, `kakao-auto-posting`에서 검증한 방식을 쓴다: **옛 주소로 들어온 콜백은 같은 쿼리 그대로 새 주소 콜백으로 넘기고**, 새 주소에서 세션 확인 후 토큰 교환(교환 때 `redirect_uri`는 옛 주소 그대로 = 등록값과 일치). 환경변수·회원 앱 설정 변경 없음.

## 4. 프로그램 1개당 작업 순서 (정책 4절)
1. 시작 전 `docs/ACTIVE_WORK.md`·`git status`·실행 중 빌드 확인 → 다른 CLI가 작업 중이면 건너뛰고 다음 프로그램.
2. 쿠키 공유 코드 4곳: `cookieDomain.ts`(기준: `shots`·`stepmail`) + 브라우저 `client.ts` + 서버 `server.ts` + 미들웨어/proxy 쿠키 설정. `sb-*` 쿠키 일괄 만료 금지(정책 2-3).
3. 옛 `vercel.app` **화면** 주소 → 새 주소 308(미들웨어, `stepmail` 방식). **API·콜백·확장용 경로는 이동하지 않음.** (B그룹은 위 콜백 넘기기 추가)
4. 빌드 → 버전 +0.01(`version.ts` + DB + 마이그레이션 SQL).
5. `vercel domains add <slug>.buylife.xyz <프로젝트> --scope buylife` → 인증서 발급 대기(`/login` 200).
6. `programs.app_url` 갱신, VIP 자동 부여 확인(주인님 규칙).
7. **실화면 검수(크롬, 시험 계정)**: `www.buylife.xyz` 로그인 상태에서 카탈로그의 [실행하기] → 새 주소가 **재로그인 없이** 열리는지, 옛 주소 접속 시 새 주소로 넘어가는지, 주요 기능 1개 동작. B그룹은 계정 연결 화면까지 진입 확인(실제 외부 계정 연결은 회원 계정이 필요해 주인님 확인 요청 가능).
8. 프로그램 `AGENTS.md`·`HANDOFF.md`·정책 문서 8절 진행 현황 갱신 → 커밋·푸시·배포.

## 5. 크롬 확장 프로그램(17~19) 추가 확인
- 확장이 부르는 서버 주소는 옛 주소 API로 그대로 둬서 **설치된 확장이 깨지지 않게** 한다(API는 이동하지 않음).
- 확장이 프로그램 **화면**을 열어 로그인 상태를 쓰는 구조인지 코드 확인 후, 필요하면 확장의 접속 주소를 새 주소로 바꾸고 원칙 10(확장 폴더·ZIP·DB 버전·`check-extension-release.mjs`)을 같은 작업에서 처리한다.

## 6. 0단계 — 이미 `buylife.xyz`로 옮긴 프로그램 점검
- 쿠키 공유 코드가 있고 주소도 옮긴 프로그램(약 55개) 중 대표 몇 개를 메인 로그인 후 열어 재로그인 요구가 없는지 먼저 확인한다(기준이 실제로 동작하는지 확인 후 같은 패턴 복제).

## 7. 비용·위험
| 항목 | 비용 |
|---|---|
| Vercel 서브도메인 추가·인증서 | 없음(팀 요금제 포함) |
| DNS | 없음(Cloudflare 와일드카드 `*` 이미 설정) |
| AI·외부 API | 없음(검수 시 기능 1개 확인 정도, 필요하면 가장 저렴한 모델) |
| 위험 | 쿠키 설정 실수 시 로그인 불가 → 프로그램마다 배포 직후 크롬으로 확인, 문제 시 즉시 이전 배포로 되돌림(`vercel rollback`) |

## 8. 일정·산출물
- 프로그램당 약 10~15분, A그룹(19) → B그룹(8) 순서, 한 번에 한 프로그램씩 끝까지(커밋·배포·검수) 처리.
- 산출물: 프로그램별 코드·버전·마이그레이션 SQL·`AGENTS.md` 기록, `DOMAIN_SSO_POLICY.md` 8절 진행 표, 이 문서의 진행 체크.

## 9. 진행 체크
| 그룹 | 완료 | 남음 |
|---|---|---|
| 0단계 점검 | threads-content-ops.buylife.xyz 메인 로그인 유지 확인 | — |
| A그룹 | 3/19 | 16 |
| B그룹 | 0/8 | 8 |
