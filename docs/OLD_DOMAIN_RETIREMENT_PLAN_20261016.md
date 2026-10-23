# 옛 *.vercel.app 주소 정리 대비 — 두 주소 동시 사용 + 삭제 후에도 정상 동작 플랜 (2026-10-16)

> 주인님 지시(2026-10-16): "해당 프로그램에 두 가지 종류의 주소를 다 쓸 수 있게 허용해주고, 나중에 이전 주소 체계를 삭제해도 정상 동작하도록 해줘." 당분간 두 주소 유지 → 안정되면 옛 주소 삭제(시점은 주인님 결정). 정책: `docs/DOMAIN_SSO_POLICY.md` §9.
> 작성: Claude Code(윈도우). 상태: **플랜(구현 전)**.

## 1. 문제
옛 주소를 지우면 아래가 끊어진다. 화면은 이미 새 주소로 넘어가므로(308) 문제는 **외부에 옛 주소가 "등록·저장"된 곳**이다.

| # | 옛 주소에 기대는 곳 | 프로그램 | 지금 | 옛 주소 삭제 시 |
|---|---|---|---|---|
| A | 회원 본인 OAuth 앱의 콜백 주소(메타·구글·네이버) | auto-instagram-posting(2곳)·auto-threads-posting·instagram-comment-reply·instagram-dm-reply·threads-affiliate-poster·threads-comment-reply·naver-cafe-poster·youtube-auto-reply (8개, 9곳) | 옛 콜백 → 새 주소 307로 동작 | 계정 연결 전부 실패 |
| B | 연결 끝난 뒤 돌아가는 주소(`NEXT_PUBLIC_SITE_URL`=옛 주소) | 위 8개 | 옛 주소 → 308로 새 주소 | 연결 후 빈 화면 |
| C | 회원 텔레그램 봇 웹훅(서버가 `NEXT_PUBLIC_SITE_URL`로 setWebhook) | instagram-comment-reply·instagram-dm-reply·threads-comment-reply·youtube-auto-reply·kakao_auto_poster | 옛 주소 API로 수신 | 텔레그램 승인 버튼 무반응 |
| D | 크롬 확장의 서버 주소(BASE)·허용 주소 | ai-auto-blog·tistory-auto-blog·naver-blog-agent·naver-blog-allinone(+naver-blog-seo-studio는 새 주소 없음) | 옛 주소 API 호출 | 확장 기능 전부 실패 |
| E | 확장 ZIP 다운로드 주소(DB) | naver-blog-agent·naver-blog-seo-studio | 옛 주소 | 다운로드 실패 |
| F | 회원이 외부에 붙여 둔 웹훅 주소 | crm-google-form(구글폼 Apps Script → `/api/webhooks/form-submit`) | 회원 스크립트에 저장된 주소 | 폼 접수 중단 |
| H | 회원 Meta 앱 Webhooks 콜백(앱당 1개) | instagram-dm-reply(`/api/instagram/dm-webhook/<userId>`) | 옛 주소로 등록한 회원 있음 | DM 수신 중단 — v1.07부터 설정 화면에 새 주소 안내, 회원이 직접 교체(공지 대상) |
| I | 이미 보낸 메시지·이메일·공유 카드 안의 링크 | kakao_auto_poster(리포트 공유·나에게 보내기·브로드캐스트·이메일, `NEXT_PUBLIC_SITE_URL`=옛 주소) | 옛 주소 → 308로 새 주소 | 링크 깨짐 — 새로 보내는 링크 전환은 회원 카카오 앱 "웹 도메인"에 새 도메인 추가 공지 후, 옛 주소 화면 이동은 장기간 유지 권장 |
| G | 외부 서비스 콜백(요청마다 주소 전달) | music(Suno 콜백) | 요청 시 SITE_URL로 생성 | 기준 주소만 새 주소면 문제 없음(확인 필요) |

## 2. 해결 방식 (프로그램 코드만으로, 환경변수 변경 없이)
- **A. 콜백 두 주소 지원**
  1. 각 프로그램에 `lib/oauthRedirect.ts`: `OLD` = 기존 환경변수 값, `NEW` = `https://<slug>.buylife.xyz` + 같은 경로(코드 상수).
  2. 연결 버튼은 기본 **옛 콜백**(지금처럼). 설정 화면에 **두 콜백 주소를 모두 표시**하고 "본인 앱에 두 주소를 모두 등록" 안내 + **[새 주소로 연결]** 버튼(=`NEW`로 authorize).
  3. 콜백은 자기가 받은 경로로 판정: 옛 주소에서 307로 넘어올 때 `via=old`를 붙이고, 토큰 교환 시 `via=old`면 `OLD`, 아니면 `NEW`를 redirect_uri로 쓴다(인증 요청과 교환 주소 일치 규칙 충족).
  4. 회원이 새 주소로 성공하면 계정 행에 기록할 곳이 없으므로(스키마 변경 피함) 집계는 Vercel 로그로 대신하거나, 필요 시 별도 승인 후 컬럼 추가.
- **B.** 연결 후 이동은 `NEXT_PUBLIC_SITE_URL` 대신 **현재 요청 주소(새 주소)** 기준으로.
- **C.** 웹훅 등록 기준 주소를 **새 주소 상수**로 바꾸고, 기존 등록분은 서버가 저장된 봇 토큰으로 setWebhook을 새 주소로 다시 등록(1회 이전 스크립트 또는 다음 크론 때 자동). 옛 주소 웹훅도 삭제 전까지 계속 받음 → 끊김 없음. **회원 봇 설정을 바꾸는 외부 작업이라 실행 전 주인님 확인.**
- **D·E.** 확장 BASE를 새 주소로, 허용 주소는 두 주소 모두 유지 → 버전+0.01, ZIP·DB(extension_version·extension_download_url 새 주소)·`check-extension-release` (원칙 10). 회원 PC 확장은 재설치 필요 → 공지. naver-blog-seo-studio는 새 주소(서브도메인) 자체가 없어 먼저 도메인 연결 필요(Codex 담당 이력 — 작업 전 ACTIVE_WORK 확인).
- **F.** 설정 화면의 웹훅 주소 안내를 새 주소로, "옛 주소로 붙인 회원은 교체" 안내. 옛 주소도 삭제 전까지 동작.
- **G.** 기준 주소가 새 주소인지 코드 확인만.

## 3. 옛 주소 삭제 전 마지막 단계 (주인님이 시점 결정)
1. 회원 공지(새 콜백 등록·확장 재설치·구글폼 주소 교체) → 유예 기간.
2. 연결 버튼 기본값을 `NEW`로 바꾸고 옛 버튼 제거, 텔레그램 웹훅 새 주소 이전 확인.
3. 옛 주소 307/308 코드 제거 → Vercel 옛 별칭 정리 → 9곳 콜백·확장·웹훅 실동작 재확인.

## 4. 진행 순서 (한 번에 한 프로그램, 각 버전 +0.01·배포·검수·인수인계)
1. threads-comment-reply(기준 구현: A·B·C) → 2. youtube-auto-reply → 3. instagram-comment-reply → 4. instagram-dm-reply → 5. threads-affiliate-poster → 6. auto-threads-posting(threads/) → 7. auto-instagram-posting(insta_auto_poster, 2곳) → 8. naver-cafe-poster → 9. kakao_auto_poster(C만) → 10~13. 확장 4개(D·E) → 14. crm-google-form(F) → 15. music(G 확인).

## 5. 검수
- 콜백: 옛 주소·새 주소 각각 시험 요청(가짜 code)으로 경로·redirect_uri 선택 확인 + **시험 계정으로 실제 연결 1회**(주인님이 메타 로그인 — 비밀번호는 에이전트가 입력 안 함).
- 텔레그램: 시험 계정 봇 1개로 새 주소 setWebhook 후 승인 버튼 1회.
- 확장: 시험 계정에서 ZIP 재설치 후 기본 동작 1회, `check-extension-release` OK.

## 6. 비용
- 개발·시험: 없음(유료 API 호출 없음). 운영 인프라: 없음(도메인·DNS 이미 있음). 회원 부담: 없음(본인 앱 설정에 주소 추가만).

## 7. 사전 확인이 필요한 항목
- C의 기존 회원 텔레그램 웹훅 일괄 재등록(회원 봇 대상 외부 작업).
- 환경변수는 바꾸지 않는 설계(필요해지면 별도 승인).

## 8. 진행 결과 (2026-10-16, Claude Code 윈도우)
| 항목 | 프로그램 | 버전 | 상태 |
|---|---|---|---|
| A·B·C | threads-comment-reply | v1.08 | 완료(기준 구현) |
| A·B·C | youtube-auto-reply | v1.08 | 완료 |
| A·B·C | instagram-comment-reply | v1.08 | 완료 |
| A·B·C·H | instagram-dm-reply | v1.07 | 완료(DM 웹훅 새 주소 안내) |
| A·B | threads-affiliate-poster | v1.54 | 완료(+독립 배포본 옛 주소 이동 제외) |
| A·B | threads(auto-threads-posting) | v1.08 | 완료 |
| A·B | insta_auto_poster(auto-instagram-posting) | v1.09 | 완료(콜백 2곳) |
| A·B | naver-cafe-poster | v1.09 | 완료 |
| A·B·C | kakao_auto_poster | v1.10 | 완료(메시지 링크 I는 회원 공지 후 전환) |
| D·E | ai-auto-blog v1.66 · tistory-auto-blog v1.73 · naver-blog-agent v1.86 | — | 완료(check-extension-release OK) |
| D | naver-blog-allinone | — | 변경 불필요(이미 새 주소만 사용) |
| F | crm-google-form | v1.08 | 완료(교체 안내) |
| G | music(music-automation) | v1.10 | 완료(Suno 콜백 새 주소) |
| 공지·매뉴얼 | 메인 사이트 | — | 공지 `notices` ad4fd1c7-1085-461c-aae3-c0994746e7c8(상단 고정) · 매뉴얼 `platform_guides` cffe0d83-1e7f-494c-947d-75dcfcaee01e(https://www.buylife.xyz/guides/cffe0d83-1e7f-494c-947d-75dcfcaee01e) |

**남은 일**
1. 텔레그램 웹훅 일괄 이전 실행: 연동 5건 모두 주인님 관리자 계정 봇. 관리자 로그인 상태로 아래 5개 주소를 한 번씩 열면 이전됨(결과 JSON의 moved/alreadyNew 확인) — threads-comment-reply·youtube-auto-reply·instagram-comment-reply·instagram-dm-reply·kakao-auto-posting 각 `https://<새 주소>/api/telegram/migrate-webhooks`.
2. **naver-blog-seo-studio**: 새 서브도메인 자체가 없음(앱은 `naver-blog-seo-studio.vercel.app`, 확장 BASE도 옛 주소). 옛 주소 삭제 전 별도 작업으로 도메인 통일(SSO) + 확장 BASE 전환 필요.
3. 삭제 직전(주인님 시점 결정): 기본 연결을 새 콜백으로 바꾸고 [새 주소로 연결]·via=old·307 코드 정리 → 카카오 메시지 링크 전환(회원 웹 도메인 추가 공지 후) → Vercel 옛 별칭 정리. 이미 보낸 메시지 속 옛 링크(I) 때문에 화면 308 이동은 가능한 한 오래 유지 권장.
4. 시험 계정 앱 설정 문제(기존부터): Instagram "Invalid platform app"(instagram-comment-reply `docs/IMPROVEMENTS.md`), 네이버 카페 `naver_app_missing` 안내 미표시(naver-cafe-poster `docs/IMPROVEMENTS.md`).

- **2026-10-16 텔레그램 웹훅 이전 완료**: 주인님이 관리자 로그인으로 5개 migrate 주소 실행 → getWebhookInfo 확인 결과 5개 봇 모두 새 주소(`https://<slug>.buylife.xyz/api/telegram/webhook/<회원ID>`), 대기 0·최근 오류 없음. 남은 일 1번 완료.

- **2026-10-16 남은 일 2번 완료**: naver-blog-seo-studio v1.65 새 주소 이전(SSO·확장·메인 경로). 상세 `naver-blog-seo-studio/AGENTS.md`. 회원 공지 매뉴얼의 확장 재설치 대상에 SEO 스튜디오 추가함.

- **2026-10-16 남은 일 4번 처리**: Instagram "Invalid platform app" = 시험 계정에 Facebook 앱 ID가 등록된 값 위치 혼동 → INSTA 댓글 v1.09·DM v1.08·포스팅 v1.10 설정 화면 안내 추가(시험 계정 값 교체는 주인님). 네이버 카페 안내 미표시는 검수 오판으로 정정(정상 표시).
