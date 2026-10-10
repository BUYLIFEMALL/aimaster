# 도메인 연동(SSO) 정책 — 주의사항 (2026-10-10 주인님 확정, 모든 CLI 공통)

> 루트 `CLAUDE.md` 핵심 원칙 11번의 상세본입니다. 프로그램 주소·로그인 쿠키·OAuth 콜백 주소를 만지기 전에 반드시 읽습니다.

## 1. 목적과 방식
- 문제: 프로그램마다 주소(`*.vercel.app`)가 달라 쿠키가 공유되지 않아, 프로그램을 옮길 때마다 다시 로그인함.
- 해결(A방식): 모든 프로그램을 `<이름>.buylife.xyz`로 열고, Supabase 로그인 쿠키(`sb-<project-ref>-auth-token[.n]`)의 도메인을 `.buylife.xyz`로 공유한다. 모든 프로그램이 같은 Supabase 프로젝트를 쓰므로 쿠키 이름이 같다.

## 2. 절대 지킬 것 (금지·필수)
1. **옛 `vercel.app` 주소는 삭제·해제하지 않는다.** 회원이 Meta/Google에 등록한 OAuth 콜백 주소, 크롬 확장의 접속 주소, 회원 북마크가 옛 주소를 쓴다. 새 주소는 "추가"만 한다.
2. **쿠키 `domain=.buylife.xyz`는 요청 호스트가 `buylife.xyz` 계열일 때만 지정한다.** `*.vercel.app`·`localhost`에서 지정하면 브라우저가 쿠키를 거부해 로그인이 깨진다. 공용 도우미 `lib/supabase/cookieDomain.ts`(`cookieDomainForHost`)만 쓰고 직접 문자열을 박지 않는다.
3. **미들웨어/서버에서 `sb-*` 쿠키를 `Max-Age=0`으로 일괄 만료시키지 않는다.** 요청의 `Cookie` 헤더에는 도메인 정보가 없어 방금 발급한 정상 세션 쿠키까지 지워져 로그인이 불가능해진다(2026-10-10 실제 사고, `docs/ERROR_LESSONS.md`). 옛 호스트 전용 쿠키 정리는 **로그인 버튼을 누른 시점에 브라우저에서만** 한다(루트 `LoginForm.tsx` 참고).
4. `session_token`(동시접속 제한)은 루트 전용 쿠키이며 `/api/session/create`에서 발급 시 같은 `cookieDomain`을 적용한다.

## 3. 프로그램에 적용하는 코드 패턴 (프로그램마다 4곳)
`lib/supabase/cookieDomain.ts`(새 파일) + 브라우저 `client.ts`의 `cookieOptions.domain` + 서버 `server.ts`의 `setAll` + 미들웨어/proxy의 `response.cookies.set(..., { ...options, domain })`.
기준 구현: 루트 `lib/supabase/*`·`middleware.ts`, `shots/src/lib/supabase/*`·`shots/src/proxy.ts`.

## 4. 새 주소 연결 절차(프로그램 1개당, 한 번에 한 프로그램)
1. 위 코드 패턴 반영 → 빌드 → 버전 +0.01(코드 `version.ts` + DB `programs.version` + 마이그레이션 SQL).
2. `vercel domains add <이름>.buylife.xyz <vercel프로젝트명> --scope buylife` (서브도메인은 프로젝트명 인자가 반드시 필요).
3. 인증서 발급에 약 2~3분 걸린다(그동안 `curl` exit 35). `/login`이 200이 될 때까지 기다린다.
4. `programs.app_url`을 새 주소로 갱신(마이그레이션 SQL에도 남긴다).
5. `www.buylife.xyz` 로그인 → 새 주소 접속 시 재로그인 요구가 없는지 확인(시험 계정 `buylifemall@naver.com`).
6. 문서(HANDOFF 등)·커밋·푸시·배포.

## 5. DNS (이미 설정됨 — 프로그램마다 추가하지 않는다)
- Cloudflare에 와일드카드 `*` **A 레코드 → 76.76.21.21**, 프록시 **끔(DNS 전용)**. 이 한 줄이 모든 서브도메인을 덮으므로 프로그램을 만들 때 DNS 레코드를 새로 만들지 않는다.
- 프록시를 켜면(주황 구름) Vercel 인증서 발급·쿠키가 꼬일 수 있으니 켜지 않는다.
- 필요한 것은 프로그램마다 `vercel domains add`(위 4-2)와 `app_url` 갱신뿐이다.

## 6. OAuth 콜백 주소 — 도메인을 옮기기 전에 코드를 확인한다
- 확인할 것: 프로그램이 콜백 주소(`redirect_uri`)를 **환경변수로 고정**하는지, **접속한 주소(`request.nextUrl.origin`)를 따라가는지**.
  - 환경변수 고정(예: `shots`의 `META_INSTAGRAM_REDIRECT_URI`, `GOOGLE_YOUTUBE_REDIRECT_URI`) → 주소를 옮겨도 Meta/Google 쪽 변경 없음.
  - 접속 주소를 따라가는 프로그램 → 회원이 새 주소로 연동하면 콜백이 새 주소가 되어 등록 불일치로 거부된다. **코드를 환경변수 고정으로 바꾸거나, 회원 앱에 새 콜백 주소를 "추가" 등록**한다(옛 주소는 지우지 않는다).
- 점검 대상: `threads`, `threads-affiliate-poster`, `threads-comment-reply`, `threads-content-ops`, `instagram-*`, `shots`, `youtube-auto-reply` 등 OAuth를 쓰는 모든 프로그램. 회원 본인 Meta 앱 설정은 회원이 직접 하므로 새 콜백 주소가 필요하면 안내문을 만든다.

## 7. 그 밖의 점검
- 하드코딩된 프로그램 주소(크롬 확장 `host_permissions`·API 기준 주소, 메일 링크, 다른 프로그램의 `NEXT_PUBLIC_*_URL`)가 옛 주소를 가리켜도 옛 주소가 살아 있으니 즉시 깨지지는 않는다. 확장은 새 주소를 쓰게 바꿀 때 ZIP·DB 버전까지 `CLAUDE.md` 10번 규칙대로 함께 처리한다.
- 최상위 규칙(본인 계정·본인 키)과 무관하다: 쿠키 공유는 "로그인 상태" 공유일 뿐이며, 각 프로그램의 `requireProgramAccess()` 권한 확인은 그대로 필수다.

## 8. 진행 현황 (2026-10-10)
- 완료: 루트(`www`), `shots`(`https://shots.buylife.xyz`, v1.06~) 파일럿 배포, `programs.app_url` 갱신, Cloudflare 와일드카드 A 레코드.
- 대기: 파일럿 로그인 공유 시험(주인님) → 통과하면 나머지 프로그램을 **하나씩** 위 4번 절차로 진행(OAuth 프로그램은 6번 확인 먼저).
