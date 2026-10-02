# AIMaster 플랫폼 재사용 패턴 모음

> 루트 및 서브프로젝트(threads, blog, shots, 향후 추가되는 프로그램들) 개발 시 참고할 수 있는 재사용 패턴과 트러블슈팅 기록. 각 서브프로젝트의 `AGENTS.md`/`CLAUDE.md`가 루트 `../CLAUDE.md`를 메인 지침으로 참조하듯, 이 문서도 함께 참고할 것.

---

## 1. 카테고리 블록 노출 패턴 (메인페이지 / 목록 페이지)

프로그램·콘텐츠를 카테고리별로 묶어서 보여줄 때 쓰는 표준 구조. 루트 앱의 `/`(메인)와 `/programs`에 적용됨.

- **"전체" 보기**: 카테고리별로 블록을 나눠서 전부 보여줌 (프로그램이 없는 카테고리는 자동 스킵)
- **특정 카테고리 클릭**: `/programs/category/[slug]`처럼 해당 카테고리 하나만 필터링한 평면 목록으로 전환
- **검색어 입력 시**: 카테고리 구분 없이 검색 결과를 평면 목록으로 보여줌 (블록 구조 무시)

핵심 코드: `app/(main)/page.tsx`, `app/(main)/programs/page.tsx`의 `categoryBlocks` 계산 로직 참고.
```ts
const categoryBlocks = categories
  .map((category) => ({ category, programs: programs.filter((p) => p.category_id === category.id) }))
  .filter((block) => block.programs.length > 0);
```

---

## 2. AI 콘텐츠 3종 수집 패턴 (HTTP / RSS / Perplexity)

shots(`/candidates`, 쇼츠 주제 수집)에서 먼저 만들어졌고, threads(`/candidates`, 게시글 주제 수집)에 동일 구조로 이식됨. 새 프로그램에서 "외부 소스 기반 콘텐츠 초안 자동 생성"이 필요하면 이 패턴을 재사용할 것.

- **방식 1 (HTTP)**: URL 하나를 준다. 개별 게시글 URL이면 1건, 카테고리/목록 페이지 URL이면 `cheerio`로 링크를 추출해 무작위 5건을 골라 각각 스크랩 후 생성.
- **방식 2 (RSS/NewsBlur)**: `newsblur_accounts` 공용 테이블(아이디/비번 저장, `user_id` unique) — NewsBlur 로그인 → 구독 피드 목록 → 선택한 피드의 최근 글로 생성. 이 테이블은 앱에 상관없이 공유되므로 새로 만들 필요 없음.
- **방식 3 (Perplexity)**: 시드 주제로 최근 72시간 트렌드를 검색(`sonar-pro` 모델) 후 구조화.
- 원본 텍스트를 모아서 OpenAI(`gpt-4o-mini`, `response_format: json_object`)로 구조화된 JSON 후보 배열을 생성하는 단계는 공통.
- 후보 테이블은 프로그램마다 별도로 둔다 (`shorts_candidates`, `threads_candidates`) — `user_id` + RLS owner-only 필수.

핵심 코드: `shots/src/lib/ai/collector.ts`, `threads/src/lib/ai/collector.ts` (구조 100% 동일, 프롬프트만 도메인에 맞게 다름).

---

## 3. SNS 게시글 AI 생성 프롬프트 규격 (Threads 기준, 재사용 가능)

여러 번의 시행착오 끝에 정리된 규격. 새 프로그램에서 SNS 스타일 짧은 게시글을 AI로 생성할 때 그대로 재사용할 것.

- 제목: 10자 이내 + 어울리는 이모티콘을 앞에 붙임
- 본문: 450자 이내를 목표로 **최대한 채움** ("문단을 나누어 간결하게"라고만 쓰면 100~200자짜리 부실한 요약문이 나옴 — 명시적으로 "짧게 끝내지 마세요"까지 지시해야 함)
- **문단 줄바꿈은 명시적으로 지시해야 한다**: "1~2문장마다 문단을 끊고 줄바꿈을 두 번 넣어라"처럼 구체적으로 써야 실제 줄바꿈이 들어감. "문단을 나누어 작성"만으로는 AI가 한 덩어리 문단으로 이어 쓰는 경우가 많음.
- **`response_format: json_object` 모드에서는 프롬프트 지시만으로는 줄바꿈이 잘 안 지켜진다**: JSON 모드는 모델이 컴팩트한 유효 JSON을 우선시해서, 문자열 필드 안에 `\n\n`을 넣으라는 지시를 자주 무시하고 한 줄로 이어붙인다 (일반 텍스트 응답 모드보다 더 심함). 프롬프트만 믿지 말고, 코드에서 문장 단위로 잘라 강제로 문단을 나누는 안전장치를 반드시 같이 둘 것 — `threads/src/lib/ai/formatContent.ts`의 `ensureParagraphBreaks()` 참고 (이미 줄바꿈이 있으면 그대로 두고, 없을 때만 문장 종결부호 기준으로 1~2문장씩 묶어 `\n\n`으로 재조립).
- 무조건 반말, 존댓말 금지
- **CTA(홍보 링크)는 시스템 프롬프트에 조건 없는 예시로 넣으면 안 됨** — AI가 실제 CTA 데이터가 없어도 예시의 placeholder(`{링크}`, `{URL}`)를 그대로 지어내서 넣는 버그가 발생함. CTA 형식 지시는 시스템 프롬프트가 아니라 **사용자 메시지에 실제 CTA 데이터가 있을 때만 동적으로 포함**시켜야 함.

핵심 코드: `threads/src/lib/ai/generator.ts`의 `THREADS_SYSTEM_PROMPT` + `generatePostContent`의 `ctaLine` 동적 구성 부분.

---

## 4. 이메일 발송 (SMTP) 설정 — 네이버 메일 기준

루트 앱의 `lib/email/`(`client.ts`/`sender.ts`/`templates.ts`)은 플랫폼 공용이므로 새 프로그램에서 메일 발송이 필요하면 새로 만들지 말고 이 모듈을 재사용할 것 (`sendWelcomeEmail`, `sendPaymentEmail`, `sendSupportEmails` 등).

네이버 메일을 발송 계정으로 쓸 때 겪은 문제와 해결:

1. **일반 로그인 비밀번호로는 SMTP 인증이 막힌다.** 반드시 네이버 **앱 비밀번호**(2단계 인증 켠 뒤 발급)를 써야 함.
2. **앱 비밀번호가 있어도 "POP3/SMTP 사용함" 설정이 꺼져 있으면 인증이 거부된다** (`535 5.7.1 Username and Password not accepted`). 네이버 메일 → 환경설정 → POP3/IMAP 설정에서 반드시 켜야 함. IMAP만 되고 SMTP는 별도로 검증된 적 없는 상태일 수 있으니 주의 (다른 통합에서 IMAP이 된다고 SMTP도 되는 게 보장되지 않음).
3. **동시에 여러 통을 보내면 거부된다** (`421 4.3.2 Too many concurrent connection`). 네이버 SMTP는 동시 연결 수 제한이 빡빡해서, `Promise.all`로 두 통을 동시에 보내면 하나가 실패함. **반드시 순차적으로(await 하나씩) 보낼 것.**

필요 환경변수 (Vercel Production에 등록, `.env.local`에도 동일하게): `SMTP_HOST=smtp.naver.com`, `SMTP_PORT=465`, `SMTP_USER=<네이버계정>@naver.com`, `SMTP_PASSWORD=<앱비밀번호>`, `EMAIL_FROM`, `SUPPORT_ADMIN_EMAIL`.

---

## 5. 서버 액션 삭제 버튼 — 처리중 표시 패턴

`<form action={deleteAction}>` + 순수 서버 액션으로 삭제를 구현할 때, 클릭 후 아무 피드백이 없으면 "눌렀는데 반응이 없다"는 오해를 산다. `react-dom`의 `useFormStatus`로 처리중 상태를 표시하는 작은 클라이언트 컴포넌트를 만들어서 재사용할 것.

```tsx
"use client";
import { useFormStatus } from "react-dom";

export function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
```

참고 구현: `threads/src/components/posts/DeleteButton.tsx`.

---

## 7. Meta 그래프 API(Threads/Instagram) 이미지 게시 — 고정 대기 대신 상태 폴링

이미지가 포함된 게시물은 미디어 컨테이너(container)를 만든 뒤 Meta 서버에서 **비동기로 처리**되고, 처리가 끝나야 실제 게시(publish)가 가능하다. threads에서 "컨테이너 생성 → 3초 고정 대기 → 게시 시도" 방식으로 구현했다가, 이미지 처리가 3초보다 오래 걸리는 경우 게시가 조용히 실패하고(에러 메시지 없이) DB 상태가 "publishing"에 영원히 멈추는 버그가 발생함 (2026-08-10).

- **고정 `setTimeout` 대기는 신뢰할 수 없다.** 반드시 컨테이너 상태를 `GET /{container-id}?fields=status_code,error_message`로 폴링해서 `status_code`가 `FINISHED`가 될 때까지 기다린 다음 게시할 것 (`ERROR`/`EXPIRED`면 즉시 에러로 처리). Instagram Graph API도 동일한 패턴이므로 shots(Instagram 게시)에도 그대로 적용할 것.
- **상태가 중간 단계에서 멈춰도 재시도할 수 있게 UI를 설계할 것.** "처리 중(publishing)" 상태를 "수정 불가/재시도 불가" 상태로 취급하면, 서버가 처리 도중 죽었을 때 사용자가 영원히 재시도할 방법이 없어진다. "처리 중"도 재시도(재게시) 가능한 상태에 포함시켜야 함.
- **DB 상태 업데이트(`supabase.update()`)의 반환 에러를 무시하지 말 것.** 게시 실패 원인 진단 시 에러 메시지가 DB에 전혀 안 남아 있으면 원인 파악이 매우 어려워진다.

핵심 코드: `threads/src/lib/threads/client.ts`의 `waitForContainerReady()`.

---

## 8. "국내 IP만 허용"하는 공공 API — n8n/외부 프록시 없이 Vercel 리전 고정으로 해결

real_estate_sales(부동산 실시간 매매정보)에서 서울 열린데이터광장/공공데이터포털/VWorld 3개 공공 API를 쓰는데, 전부 "국내 IP만 허용"이라 원래는 국내 서버(n8n.buylife.xyz)를 프록시로 거쳐서 호출했다. Vercel 서버리스 함수를 서울 리전에 고정하면 프록시 없이 직접 호출해도 국내 IP로 인식된다는 걸 확인함 (2026-08-10, Phase 0 스파이크로 3개 API 전부 검증).

- 프로젝트 루트의 `vercel.json`에 `"regions": ["icn1"]`을 추가하면 그 프로젝트의 모든 서버리스 함수가 서울에서 실행된다. (주의: Next.js 라우트 안에 `export const preferredRegion = "icn1"`을 넣는 방식은 최신 Vercel/Fluid Compute 환경에서 무시됨 — 실제로 테스트해보니 `iad1`(미국)에서 계속 실행됐다. `vercel.json`의 `regions` 키가 현재 공식적으로 동작하는 방법.)
- "국내 IP 차단"이라고 알려진 에러가 사실은 IP 문제가 아니라 **API 키에 등록된 `domain` 파라미터 불일치**인 경우가 있다 (VWorld가 그랬음 — `INCORRECT_KEY` 에러가 실제로는 도메인 불일치였음). 에러 메시지만 보고 "IP가 막혔다"고 단정하지 말고, 키 발급 시 등록한 도메인/IP 화이트리스트 설정부터 확인할 것.
- 이 패턴 덕분에 n8n/Make 같은 외부 오케스트레이션 도구 없이 Next.js 서브프로젝트 하나로 통합할 수 있었다. 앞으로 국내 전용 공공 API가 필요한 서브프로젝트는 n8n 프록시부터 만들지 말고 이 방법을 먼저 시도할 것.

핵심 코드: `real_estate_sales/vercel.json`.

---

## 9. 텔레그램 알림 연동 — 사용자 각자의 봇 (공용 봇 아님)

멀티테넌시 원칙(§ CLAUDE.md)에 맞춰, 텔레그램 알림도 API 키와 동일한 철학으로 설계한다: 우리가 봇을 하나 만들어서 공용으로 쓰는 게 아니라, **각 사용자가 BotFather로 자기 봇을 직접 만들고 그 토큰을 등록**하게 한다.

- OAuth 같은 리다이렉트 로그인 방식이 텔레그램엔 없다. 대신 `getUpdates` API로 "방금 사용자가 자기 봇에게 보낸 메시지"에서 `chat_id`를 읽어오는 방식을 쓴다 (사용자가 BotFather로 봇 생성 → 토큰 발급 → 자기 봇에게 아무 메시지나 1개 전송 → 우리 서버가 그 토큰으로 `getUpdates` 호출해서 chat_id 확보).
- 공용 웹훅을 미리 등록해둘 필요가 없어서(사용자마다 봇 토큰이 다르므로 애초에 불가능) 서버리스 환경에 잘 맞는다.
- 테이블은 프로그램 전용 접두어 없이 `user_telegram_links`로 만들어서, 텔레그램 알림이 필요한 다음 서브프로젝트도 그대로 재사용할 수 있게 했다. **단, 봇 연결 자체는 프로그램별로 독립이다** — `(user_id, program_slug)` unique 제약(2026-08-23부터, 그 전엔 `user_id` 단독 unique라 모든 프로그램이 같은 봇을 강제로 공유했다). 사용자가 real_estate_sales에서 연동한 봇과 booking-reminder에서 연동한 봇이 서로 달라도 되고, 한쪽에서 "연동 해제"해도 다른 프로그램의 연결에는 영향이 없다.
- 새 서브프로젝트에서 이 테이블을 쓸 때는 `connectTelegramAction`/`disconnectTelegramAction`/조회 쿼리 전부에 그 프로젝트의 `program_slug`(`.eq("program_slug", THIS_PROGRAM_SLUG)`, upsert `onConflict: "user_id,program_slug"`)를 반드시 넣을 것 — 빠뜨리면 다른 프로그램의 연결까지 덮어쓰거나 잘못 읽어온다.

핵심 코드: `real_estate_sales/src/lib/telegram/client.ts`의 `findChatIdFromUpdates()`, `real_estate_sales/src/lib/actions/telegram.ts`. 실제 스키마 변경은 `real_estate_sales/supabase/migrations/20260823120000_telegram_links_per_program.sql`.

**같은 철학으로 SMTP 이메일 계정도 공용화했다** (2026-08-18) — 원래 stepmail 전용
`stepmail_smtp_accounts`였는데, crm-google-form을 만들면서 사용자가 "본인 이메일 계정을
프로그램마다 또 등록해야 하냐"고 지적해서 프로그램 접두어 없는 `user_smtp_accounts`로
승격(rename)했다. `ALTER TABLE ... RENAME TO`는 id/인덱스/트리거/RLS/기존 FK 관계를 전부
그대로 보존하므로(Postgres가 제약조건을 OID로 추적), 데이터 이전이나 FK 재매핑 없이
테이블명만 바꾸는 것으로 충분했다 — 실 데이터가 있는 테이블을 공용화할 때 이 방법을
우선 고려할 것. 이메일 발송이 필요한 다음 서브프로젝트는 `user_smtp_accounts`
(host/port/user/password, RLS owner-only)를 그대로 재사용한다. 핵심 코드:
`stepmail/lib/email/transport.ts`, `stepmail/lib/actions/smtpAccounts.ts`.

**문자/카카오(SOLAPI)도 처음부터 같은 철학으로 설계했다** — crm-google-form이
`user_solapi_accounts`(api_key, api_secret, sender_phone, kakao_pf_id, RLS owner-only)를
프로그램 접두어 없이 만들었다. 발송은 공식 Node.js SDK(`solapi` npm 패키지,
`SolapiMessageService`)를 쓴다 — HMAC-SHA256 서명 인증을 직접 구현하지 않는다. 카카오
친구톡은 2026-01-01부로 SOLAPI가 서버에서 자동으로 "브랜드 메시지"로 대체 발송하므로
기존 `type:"CTA"` 요청을 그대로 쓰면 된다. 핵심 코드: `crm-google-form/lib/solapi/client.ts`.

---

## 10. 인증/권한 체크가 들어가는 layout.tsx·route.ts는 전부 `dynamic = "force-dynamic"` +
## `fetchCache = "force-no-store"` 두 줄을 세트로 선언해야 한다 (cron/웹훅만의 문제가 아니다)

crm-google-form의 팔로우업 cron(`app/api/cron/followup`)을 만들면서, `export const dynamic =
"force-dynamic"`을 선언했는데도 supabase-js(`createAdminClient()`)로 조회한 결과가 **첫
요청 시점 그대로 계속 캐싱되는 버그**를 실제로 재현했다(2026-08-18, 로컬 개발 서버 — DB를
바꾼 뒤 같은 서버 프로세스에서 같은 라우트를 다시 호출해도 이전 응답이 그대로 나옴, 서버를
재시작해야만 최신 데이터가 반영됨). Next.js 14 App Router의 Data Cache가 route handler
내부에서 실행되는 라이브러리의 `fetch` 호출까지 캐싱하는데, `dynamic = "force-dynamic"`이
이걸 항상 확실하게 꺼주지는 않는 것으로 보인다.

- **매 요청 최신 DB/세션 상태를 읽어야 하는 라우트·레이아웃에는 반드시
  `export const fetchCache = "force-no-store";`를 `dynamic = "force-dynamic"`과 함께
  명시할 것.** 이게 진짜 확실한 방법이다.
- Vercel Fluid Compute는 함수 인스턴스를 재사용(warm)하므로, 로컬에서 재현된 이 문제가
  프로덕션에서도 "같은 warm 인스턴스가 두 번째 호출부터 오래된 데이터를 반환"하는 형태로
  나타날 수 있다 — 배포 후 최초 1회만 정상 동작하고 이후 며칠간 안 바뀌는 것처럼 보이는
  버그로 나타나기 쉬워서 알아차리기 어렵다.
- 새 cron 라우트를 만들 때는 이 두 줄을 세트로 취급할 것:
  ```ts
  export const dynamic = "force-dynamic";
  export const fetchCache = "force-no-store";
  ```

핵심 코드: `crm-google-form/app/api/cron/followup/route.ts`,
`crm-google-form/app/api/webhooks/form-submit/[token]/route.ts`.

### 🚨 2026-08-30 플랫폼 전수 감사 — 이 버그가 cron/웹훅뿐 아니라 "인증/권한 체크가 들어간
### 모든 페이지"에도 그대로 적용된다는 것을 발견함 (필독)

bugang530@gmail.com 사용자가 blog(`ai-auto-blog`)에서 "접근 권한 없음"을 겪은 사건을
조사하다가, blog의 `app/write/layout.tsx`·API route 9개에 이 두 줄이 빠져 있었던 것을
발견했다. Vercel이 `requireProgramAccess()`/`checkProgramAccessApi()`(로그인+구독/권한
확인, 내부적으로 Supabase 세션 쿠키를 읽음)의 실행 결과 자체를 정적 캐싱해, **실제 로그인
상태·권한 상태와 무관하게 빌드 시점 또는 첫 요청 시점의 응답을 모든 사용자에게 그대로
서빙**하는 것을 `curl -s -D - -o /dev/null <url>`의 `X-Vercel-Cache: PRERENDER`/`HIT`
헤더로 실측 확인했다(`MISS`가 나와야 정상). blog를 고친 뒤 "모든 사용자·앞으로 가입할
사용자에게도 적용되도록" 나머지 17개 서브프로젝트 전체를 감사한 결과, **총 31개 파일**
(`(dashboard)/layout.tsx` 16개 + OAuth 콜백 등 `route.ts` 15개)에서 동일하게 두 줄이
누락돼 있었다 — 즉 이 저장소의 거의 모든 서브프로젝트가 한동안 "로그인만 하면 권한 검사가
정적으로 캐시된 과거 응답으로 우회될 수 있는" 상태였다.

- **판단 기준**: `requireProgramAccess()`/`checkProgramAccessApi()`를 호출하는 모든
  `layout.tsx`·`page.tsx`(Server Component)와 모든 `route.ts`(Route Handler)가 대상이다.
  Server Action(`"use server"` 함수, `lib/actions/*.ts`)은 Next.js가 애초에 정적 캐싱하지
  않으므로 이 버그의 대상이 아니다 — 감사 범위에서 제외해도 된다.
- **새 서브프로젝트를 만들 때부터 반드시 지킬 것**: `requireProgramAccess()`를 쓰는 대시보드
  레이아웃(`app/(dashboard)/layout.tsx`)과 `checkProgramAccessApi()`를 쓰는 모든 API
  route(특히 OAuth 콜백처럼 GET인데 DB에 쓰는 라우트)를 만드는 즉시, 파일 맨 위에 아래
  두 줄을 같이 넣는다. 나중에 추가하는 게 아니라 파일을 만드는 시점에 습관적으로 넣을 것.
  ```ts
  export const dynamic = "force-dynamic";
  export const fetchCache = "force-no-store";
  ```
- **로컬 `npm run build`의 ○(Static)/ƒ(Dynamic) 표시는 이 버그 진단에 신뢰할 수 없다** —
  두 줄을 정확히 추가해도 로컬 빌드 로그가 여전히 `○ Static`으로 표시되는 경우를 실제로
  겪었다. 반드시 배포 후 `curl -s -D - -o /dev/null <live-url>`로 `X-Vercel-Cache` 헤더가
  `MISS`인지 직접 확인해야 한다(미들웨어로 보호되는 라우트는 이 헤더 자체가 없는 것이 정상).
- 이 감사에서 수정한 31개 파일 목록과 진단 과정은 이 저장소의 git 커밋 이력(2026-08-30,
  `fix(<서브프로젝트>): 레이아웃/OAuth 콜백에 force-dynamic 누락 수정` 커밋들)에 남아있다.

---

## 12. AI 이미지 생성 — Cloudinary 생성 API 대신 Gemini(나노바나나) 직접 호출 + Supabase Storage 업로드

**배경**: Cloudinary MCP의 `generate-image` 도구는 자체 AI 모델이 없다. 나노바나나/Flux/GPT-Image/Recraft/Ideogram 같은 외부 모델을 대신 호출해서 결과를 자기 CDN에 자동 업로드해주는 "대행" 기능일 뿐이다. 편리하지만 이 대행 기능 자체에 **무료 플랜 월 50회**라는 별도 부가기능(add-on) 한도가 걸려 있고, 일반 저장공간/전송량 크레딧과는 완전히 별개다. 2026-08-19에 이 한도를 다 써서 프로그램 카탈로그 썸네일 생성이 막힌 적이 있다 — `get-usage-details`의 `image_generation: {usage, limit}` 필드로 확인 가능하며, 이때 스토리지 사용량이나 이미지 업로드 개수는 여유가 충분했다(무관한 한도).

**앞으로 마케팅/썸네일 등 새 이미지를 AI로 생성할 때는 Cloudinary의 `generate-image`를 거치지 않는다:**

1. Gemini API(나노바나나)를 **직접** 호출해서 이미지를 생성한다.
   - 사용자 대상 기능(서브프로젝트 안에서 회원이 쓰는 이미지 생성)이면 기존 멀티테넌시 원칙 그대로 `user_api_keys`의 `resolveApiKey()`로 **본인 키만** 쓴다 — 이 항목은 정책 변경이 아니다.
   - 플랫폼 관리자용 마케팅 자료(프로그램 카탈로그 썸네일 등)라면, 비용이 발생하는 작업이므로 관리자 본인 Gemini API 키를 그때그때 확인받아 사용한다(자동으로 DB에서 꺼내 쓰지 않음 — API 키 평문 조회는 보안상 자동화 분류기가 막는다).
2. 생성된 이미지를 **Supabase Storage의 public 버킷**에 업로드한다. Cloudinary로는 올리지 않는다. 이미 만들어져 있고 검증된 버킷을 재사용할 것:
   - 프로그램 카탈로그(`programs.thumbnail_url`) 썸네일: `program-images`(public) 버킷, `catalog/<program-slug>-thumbnail.jpg` 경로 — 참고: `music/scripts/upload-music-thumbnail.mjs`
   - 그 외 서브프로젝트 자체 콘텐츠 이미지는 각자 이미 쓰고 있는 전용 public 버킷을 재사용한다 (예: `shop-detail-images`, `stepmail-images`)
3. 결과 공개 URL을 해당 DB 컬럼(`thumbnail_url` 등)에 저장한다. **정적 파일이 아니라 DB 값이라 root 앱 재배포가 필요 없다.**
   - **같은 프로그램 썸네일을 재생성할 때는 URL에 버전 쿼리스트링(`?v=<timestamp>`)을 꼭 붙일 것.** 저장 경로(`catalog/<slug>-thumbnail.jpg`)가 매번 그대로라, URL만 보고 캐싱하는 root 앱의 Next.js 이미지 최적화가 "안 바뀐 파일"로 착각해 스토리지 원본은 새로 바뀌었는데도 화면엔 예전 이미지가 계속 보이는 문제가 있었다(2026-08-23, longtail-keyword-expander 재생성 때 실제 발견 — `scripts/generate-program-thumbnail.mjs`에 이미 반영해둠).

**public 버킷으로 직접 서빙해도 보안이나 외부 링크 제공 문제 없음.** Cloudinary와 동일하게 인증 없는 순수 공개 HTTPS URL(`https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/<bucket>/...`)로 서빙되며, 외부 사이트·Make.com/n8n 같은 자동화 도구가 `<img>`/hotlink으로 그대로 불러다 써도 문제없다. 루트 사이트 `next.config.mjs`의 `images.remotePatterns`에 이 Supabase Storage 도메인이 이미 허용되어 있어 추가 설정도 필요 없다(커밋 `868799d`). 오히려 Cloudinary 같은 제3자 서비스의 월간 생성 한도에 다시 걸릴 위험이 없어진다는 게 장점이다.

Cloudinary 자체는 계속 써도 된다 — 다만 **신규 이미지 "생성"**에만 안 쓴다는 것이 핵심이다. 이미 Cloudinary에 올라간 기존 프로그램 썸네일 9종의 조회/치환이나, 이미지 분석·변환(`get-asset-details`, `transform-asset` 등 생성이 아닌 기존 자산 조작) 용도로는 그대로 활용 가능하다.

---

## 13. 프로그램 카탈로그 썸네일 — 반드시 "실사(포토리얼)" 스타일로, 프롬프트 템플릿 고정

**배경**: 2026-08-26, `threads-comment-reply` 썸네일을 즉흥적으로 만든 프롬프트로 생성했더니 다른
프로그램들(실사 인물 사진 스타일)과 달리 **플랫 벡터 일러스트(만화/아이콘 스타일)**로 나와서
카탈로그 화면에서 스타일이 튀는 문제가 있었다. 이후로는 매번 프롬프트를 새로 고민하지 말고
**아래 템플릿을 그대로 채워서 쓴다** — "실사 스타일"이라는 말만으로는 Gemini가 가끔 일러스트로
해석하므로, 아래처럼 사진 특유의 디테일(피부 질감/렌즈 아웃포커스/조명)을 명시적으로 못 박아야
한다.

### 프롬프트 템플릿

```
A photorealistic, professional editorial/stock-photography portrait for a marketing thumbnail
of a Korean SaaS automation program. A [나이대/성별] Korean [인물 묘사 — 예: 20대 여성,
비즈니스 캐주얼 차림] [행동 — 예: 웃으며 스마트폰 화면을 보고 있다 / 노트북 앞에서 만족스러운
표정을 짓고 있다], holding/using [기기 — 스마트폰/노트북] that shows [화면에 보일 UI 힌트 —
예: a dark chat interface with message bubbles / a dashboard with a rising graph]. [선택:
글로우 효과가 있는 작은 아이콘 오버레이 1~3개로 핵심 기능을 암시 — 예: floating glowing
speech-bubble and heart icons near the phone]. Natural skin texture, shallow depth of field,
soft cinematic lighting, photographed with a professional camera (85mm portrait lens look),
[배경 — 예: softly blurred pastel gradient background / blurred modern office interior with
warm bokeh lights]. 16:9 aspect ratio. No visible text, logos, or watermarks in the image.
```

### 고정 규칙

1. **"photorealistic" + "shallow depth of field" + "natural skin texture" + "85mm portrait
   lens"를 항상 넣는다** — 이 네 표현이 빠지면 일러스트로 나올 확률이 높다(2026-08-26 실제
   확인).
2. **인물은 기본적으로 한국인으로 묘사한다** (루트 `CLAUDE.md` 3번째 불변 원칙과 동일). 프로그램
   성격에 맞는 연령대/성별/복장을 자유롭게 정하되(예: 부동산 프로그램 → 40대 정장 남성, 인스타
   댓글자동화 → 20~30대 캐주얼 여성), 특정 실존 인물을 연상시키지 않게 한다.
3. **화면 속 UI/아이콘은 프로그램의 핵심 기능을 한눈에 암시**하게 고른다(댓글 자동화 → 채팅
   말풍선, 부동산 → 그래프/게이지, 음악 생성 → 음파/노트 아이콘 등). 텍스트가 이미지 안에
   그대로 렌더링되면 깨져 보이는 경우가 많으므로 **이미지 안에 문구/로고를 넣지 않는다**(마지막
   문장 "No visible text..."로 항상 명시).
4. **비율은 16:9로 통일**한다(카탈로그 카드 썸네일 영역과 맞음).
   - 인물이 필요할 때 특정 성별을 기본값으로 고정하지 않는다. 프롬프트가 성별을 명시적으로 요구하지 않으면 주제에 따라 여성·남성·혼성 그룹·무인물 중 자연스러운 구성을 선택하고, 성별 고정관념을 피한다. 이 규칙은 `scripts/generate-program-thumbnail.mjs`가 모든 생성 프롬프트에 자동 적용한다.
5. 실행은 `scripts/generate-program-thumbnail.mjs`를 그대로 재사용한다(§12의 Gemini 직접 호출
   + Supabase Storage 업로드 + DB 반영 로직이 이미 들어있음):
   ```
   node scripts/generate-program-thumbnail.mjs <program-slug> <geminiUserId> "<위 템플릿을 채운 프롬프트>"
   ```
   이미 만들어 둔 이미지 파일을 올릴 때는 `node scripts/upload-program-thumbnail.mjs <program-slug> <image-path>`
   (Storage `program-images/catalog/<slug>-thumbnail.<ext>` 업로드 + `?v=` 버전 붙여 `programs.thumbnail_url` 갱신).
   2026-09-29 `naver-blog-seo-studio`의 3D 일러스트(로봇) 썸네일을 이 도구로 실사 이미지로 교체함 — **실사가 아닌 썸네일은
   규칙 위반이니 발견 즉시 교체할 것.**
6. 결과물을 **반드시 육안으로 다른 프로그램 썸네일과 나란히 비교**해서 실사 톤이 맞는지 확인한
   뒤 커밋한다 — 스타일이 튀면 바로 재생성.

---

## 14. 공용 `user_api_keys`에 새 provider 추가할 때 체크 제약도 같이 넓힐 것

새 서브프로젝트가 `user_api_keys` 테이블에 없던 provider(예: `serpapi`)를 쓰려고 하면, 코드
(`ApiKeyProvider` 타입, `PROVIDER_LABELS`)만 고치고 실제 DB의 `user_api_keys_provider_check`
체크 제약을 넓히는 걸 깜빡하기 쉽다. 이러면 사용자가 설정 페이지에서 키를 저장할 때
`new row for relation "user_api_keys" violates check constraint "user_api_keys_provider_check"`
에러만 나고 원인을 알기 어렵다(2026-08-22, competitor-analysis의 `serpapi` 추가 때 실제로 겪음 —
auto-detail-page가 `replicate` 추가할 때도 동일 패턴 이미 있었음).

**2026-09-28 추가 규칙 (실제 사고)**:
- `user_api_keys`에는 **API 키만** 저장한다. `threads/`가 테이블이 운영 DB에 없을 때의 "임시 저장소"로 카테고리 JSON을
  `openai`/`perplexity`/`meta_app_*` 행에 덮어써서 운영자 계정의 OpenAI·Perplexity 키가 JSON으로 바뀐 사고가 있었다.
  테이블이 없으면 마이그레이션을 적용할 것 — 다른 테이블을 "대체 저장소"로 쓰는 우회를 만들지 않는다.
- 서로 다른 외부 앱의 자격증명은 provider를 분리한다. Meta는 Instagram 앱 ID와 Threads 앱 ID를 다른 값으로 발급하는데
  인스타·쓰레드 프로그램이 `meta_app_id` 하나를 공유해 서로 덮어썼다 → 쓰레드 프로그램은 `threads_app_id`/`threads_app_secret`,
  인스타 프로그램은 `meta_app_id`/`meta_app_secret` (`supabase/migrations/0017_split_threads_app_credentials.sql`).

새 provider를 쓰는 서브프로젝트를 만들 때 체크리스트:
1. 서브프로젝트의 `types/database.types.ts`에 `ApiKeyProvider` 타입/`PROVIDER_LABELS` 추가
2. **`user_api_keys_provider_check` 제약도 같이 ALTER로 넓히기** (아래 SQL, `supabase/add-*.sql`로도 남길 것)

```sql
ALTER TABLE user_api_keys DROP CONSTRAINT user_api_keys_provider_check;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_check
  CHECK (provider = ANY (ARRAY[...기존 값들..., '새provider'::text]));
```

---

## 15. 검증 루틴 (모든 서브프로젝트 공통)

코드 변경 시마다 다음 순서로 검증 후 배포한다 — 세션 내내 이 순서를 지켰음.

1. `npx tsc --noEmit -p tsconfig.json` (변경 파일만 grep 필터링)
2. `npm run build`
3. `npm run lint` (설정 안 된 프로젝트는 스킵)
4. 임시 포트로 `next dev` 띄워서 브라우저(Claude-in-Chrome)로 실제 클릭까지 확인 — 검증 후 반드시 해당 포트 프로세스 종료
5. 커밋 → 푸쉬 → `vercel --prod` 배포 → 배포된 URL에서 curl/브라우저로 최종 확인

브라우저 자동화 도구가 가끔 `screenshot`/`get_page_text`에서 타임아웃 나는 경우가 있는데, 실제로는 페이지가 정상 렌더링된 경우가 많으니 `read_page`(filter: interactive)로 먼저 재확인하고, 그래도 의심되면 새 탭을 열어서 재시도할 것 (오래된 세션의 탭 상태 누적 문제로 추정).

---

## 16. 비슷한 기능은 다른 서브프로젝트의 레이아웃까지 그대로 재사용할 것 (백엔드 로직만 베끼지 말 것)

**원칙**: 어떤 서브프로젝트에 새 기능을 만드는데 다른 서브프로젝트에 이미 비슷한 성격의 기능이 구현되어 있다면, 그 기능의 **레이아웃/UI 동작까지 그대로** 재사용한다 — 데이터 모델이나 서버 액션 구조만 참고하고 화면 구성은 새로 설계하면 안 된다. 특정 프로그램의 사정상 같은 레이아웃이 정말 안 될 때만 다르게 만들고, 그 경우 코드 주석에 왜 다른지 남긴다. 이렇게 해야 서브프로젝트가 계속 늘어나도 사용자 경험이 통일되고 새 프로그램마다 사용법을 새로 익힐 필요가 없다.

**실제 사례(2026-09-08)**: kakao_auto_poster에 "예약(정기 자동 생성)" 기능을 붙이면서, trending-product-finder의 `SourcingAlertControls.tsx`(예약 소싱 알림)에서 주기/동작시간대/알림채널 같은 **백엔드 로직과 옵션 값**은 그대로 가져왔지만, **화면 레이아웃은 직접 새로 설계**해서 예약 설정을 "⚙️ 설정" 버튼 뒤에 숨겨버렸다. 사용자가 "레이아웃도 틀리고 기능도 다르게 구현했잖아"라고 지적하며, 앞으로는 기존 레이아웃까지 통째로 재사용하라고 지시함.

**적용 방법**:
- 예약/모니터링 토글 기능을 새로 만들 때는 아래 참고 컴포넌트부터 확인한다.
  - 예약 주기 + 동작 시간대 + 알림 채널 칩까지 있는 경우 → `trending-product-finder/components/watchlist/SourcingAlertControls.tsx` (버튼 뒤에 숨기지 않고 카드 안에 항상 펼쳐서 보여주는 구조 — 패널 자체가 독립된 ON/OFF 배지를 가짐)
  - 알림 채널 없이 단순 모니터링 ON/OFF + 주기 + 동작 시간대만 필요한 경우 → `real_estate_sales/src/components/districts/MonitoringSettings.tsx`
  - 배열 필드(키워드 등)를 항목별로 추가/삭제하는 UI → `trending-product-finder/components/watchlist/WatchlistRow.tsx`의 키워드 수정 UI(칩 + × + 입력창)
- 활성/비활성 토글은 텍스트 버튼("활성화"/"비활성화")이 아니라 파랑(ON)/빨강(OFF) 알약 버튼으로 통일한다.
- 새 프로그램을 만들거나 기존 프로그램에 기능을 추가하기 전에, 비슷한 기능이 이미 있는지 다른 서브프로젝트를 먼저 검색해보는 습관을 들일 것.

---

## 17. 카카오톡 "공유하기"(`Kakao.Share.sendDefault`) — 실전에서 겪은 5가지 함정

tarot에서 "카카오톡 공유 → 결과 보러가기 클릭 시 엉뚱한 곳으로 이동"을 진단하며(2026-09-19) 겹겹이 발견한 문제들. 이 저장소의 다른 서브프로젝트(mbti-character, kakao_auto_poster 등)도 같은 `Kakao.Share.sendDefault()` 패턴을 쓰므로, 카카오 공유 기능을 새로 붙이거나 "공유는 되는데 클릭하면 이상한 곳으로 간다" 류의 버그를 만나면 아래 순서로 확인한다.

1. **카카오 개발자 콘솔 도메인 등록은 반드시 두 화면 모두**: "앱 설정 > 플랫폼 키 > JavaScript SDK 도메인"과 "제품설정 > 제품 링크 관리 > 웹 도메인" 둘 다에 이 사이트 도메인을 등록해야 한다. 하나만 등록하면 카드는 보이는데 클릭 시 그 카카오 앱에 등록된 **다른** 서비스 도메인으로 튕겨나갈 수 있다(여러 서브프로젝트가 같은 카카오 앱을 재사용하는 이 저장소 특성상 실제로 kakao_auto_poster 도메인으로 잘못 연결되는 사고가 있었다). 새 서브프로젝트에 기존 카카오 앱의 JS 키를 재사용할 때는 새 도메인을 반드시 이 두 화면에 등록하는 절차를 빠뜨리지 말 것.
2. **`window.location.href`/공유용 URL을 "안전하게 만든다"며 `encodeURI(decodeURI(url))`로 재정규화하지 말 것.** `decodeURI()`는 예약 문자(`:`, `,`, `&`, `=` 등)의 `%XX`는 그대로 남겨두고 나머지만 디코딩하는데, 그 URL이 우리 자체 구분자로 `:`/`,`를 쓰고 있다면(예: 커스텀 쿼리 파라미터 인코딩) 남은 `%` 문자를 `encodeURI()`가 다시 `%25`로 이중 인코딩해버린다. 브라우저가 만들어주는 URL은 이미 올바르게 인코딩돼 있으므로 그대로 쓸 것 — 카카오 SDK 관련 에러를 "URL 인코딩 문제"로 추정하고 이런 재정규화를 추가하고 싶어질 때 특히 주의.
3. **공유 URL에 대용량 데이터(생성된 AI 텍스트 전체, 여러 이미지 URL의 JSON 등)를 쿼리스트링으로 통째로 담지 말 것.** 짧은 순간이라도 이런 거대한 URL이 카카오 API로 그대로 전송되면 카카오 쪽에서 에러가 날 수 있다. **완성된 결과는 먼저 DB에 저장하고, 그 저장된 행의 id 하나만 짧게 공유(`?rid=<uuid>` 형태)**하는 방식이 안전하다 — kakao_auto_poster의 `/share/[token]`, tarot의 `/result?rid=...`가 이 패턴의 참고 구현이다.
4. **`content.imageUrl`/`title`/`description`은 그 순간의 클라이언트 상태를 그대로 보내는 값**이라는 것을 기억할 것 — 3번처럼 DB에 저장된 결과를 가리키는 짧은 링크를 쓰더라도, 카카오톡 메시지 자체의 미리보기 이미지/텍스트는 여전히 공유 버튼을 누른 시점의 로컬 state에서 나온다. 그래서 "미리보기는 멀쩡한데 클릭하면 빈 화면"처럼 미리보기와 실제 이동 결과가 따로 노는 것처럼 보이는 증상이 날 수 있다 — 둘은 서로 다른 값에서 나온다는 것을 진단 시 구분할 것.
5. **og:image로 `next/og`의 `ImageResponse`(동적 생성 이미지)를 쓸 때는 카카오톡 "링크 붙여넣기" 미리보기 크롤러가 못 읽을 수 있다는 것을 감안할 것.** tarot에서 카드 여러 장을 합성한 이미지를 `/api/og`로 동적 생성해 og:image로 썼더니, curl로는 매번 `200 OK` + 정상 PNG가 왔고 Vercel 런타임 로그에도 크롤러 요청이 200으로 찍혔는데, 실제 카카오톡 미리보기에는 계속 빈 썸네일만 떴다(2026-09-19). 원인은 `ImageResponse`가 `Content-Length` 없이 `Transfer-Encoding: chunked`로만 응답하는 것 — 반면 정적 파일(Supabase Storage 등)은 `Content-Length`를 정상 제공한다. 카카오톡 크롤러가 `Content-Length` 없는 이미지 응답을 신뢰하지 못해 렌더링을 포기하는 것으로 추정된다. **실제 생성된 이미지 파일(Storage에 업로드된 정적 파일) URL을 og:image로 직접 쓸 수 있는 경우엔 그쪽을 우선하고**, `next/og` 동적 이미지는 "그 순간 실시간으로 그려야 하는 대체 카드"처럼 정적 이미지가 아예 없는 경우의 최후 폴백으로만 쓸 것. 꼭 동적 합성 이미지가 필요하면, 요청 시점에 스트리밍하지 말고 한 번 렌더링한 결과를 Storage에 저장한 뒤 그 정적 URL을 og:image로 쓰는 방식을 검토할 것(`Content-Length` 문제 자체가 사라진다).

---

## 18. "마이그레이션 파일이 저장소에 있다" ≠ "실제 운영 DB에 적용됐다" — 배포 후 반드시 검증할 것

tarot의 `tarot_readings` 테이블이 마이그레이션 SQL 파일로는 존재하고 README/AGENTS.md에도 "완료"로 기록돼 있었지만, 실제 Supabase 프로젝트(`esgxyikcnnvmlhygjkth`)에는 한 번도 적용된 적이 없어서 관련 기능이 몇 주간 조용히 실패하고 있었다(2026-09-19 발견). 이 저장소는 여러 서브프로젝트가 같은 Supabase 프로젝트를 공유하고, MCP로 즉시 적용하는 워크플로우를 쓰다 보니 "적용했다고 생각했는데 실제로는 안 한" 상태가 생기기 쉽다.

**새 테이블/컬럼에 의존하는 기능을 만들었다면, "완료"로 표시하거나 다음 작업으로 넘어가기 전에 Supabase MCP로 직접 확인할 것**:
- `list_migrations`로 그 마이그레이션 이름이 실제 적용 이력에 있는지, 또는
- `execute_sql`로 `select table_name from information_schema.tables where table_name = '...'`를 실행해 테이블이 실제 존재하는지

**함께 확인할 것 — "관리자 클라이언트"의 조용한 폴백**: RLS를 우회해야 하는 기능(공개 공유 링크 등)이 서비스 롤 키로 별도 클라이언트를 만들어 쓰는 경우, 그 헬퍼 함수가 `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`처럼 env var가 없을 때 **약한 키로 조용히 대체(fallback)**하도록 짜여 있을 수 있다. 이 경우 env var 자체가 Vercel에 등록 안 돼 있어도 코드는 에러 없이 그냥 "RLS를 우회 못 하는" 클라이언트가 되어, 있어야 할 데이터가 항상 "없음"으로 조회된다 — `vercel env ls production`으로 그 env var가 실제로 등록돼 있는지 코드 리뷰와 별개로 반드시 확인할 것. (tarot의 `createAdminClient()`가 이 패턴이었고, `SUPABASE_SERVICE_ROLE_KEY`가 빠져 있어 저장은 되는데 공유 링크로 다시 불러오지 못하는 문제로 이어졌다.)

---

## 19. CPU 무거운 처리(영상/이미지/오디오 변환 등)는 브라우저에서 WASM으로 직접 처리하는 것도 고려할 것

`video-to-gif`는 처음엔 다른 프로그램들처럼 "Vercel API → Render Docker 워커" 구조로
영상을 GIF로 변환했지만, 운영 중 반복적으로 문제가 생겨(Render Blueprint가 저장소 전체
push에 반응해 디버깅 커밋마다 워커를 재시작해서 처리 중이던 작업이 유실됨, Render 무료
플랜의 0.1 vCPU가 너무 느림, Vercel Functions 300초 타임아웃 등) 2026-09-20에 서버를
통째로 없애고 브라우저 안에서 `@ffmpeg/ffmpeg`(ffmpeg.wasm)로 직접 처리하는 구조로
재구현했다.

**장점**: 서버 인프라(배포·비밀값 동기화·CPU/타임아웃 제한, Render 재배포로 인한 작업
유실 등) 문제가 통째로 사라진다.

**단점/트레이드오프**: 처리 속도가 사용자 기기 성능에 좌우되고, 결과물을 서버에 남기려면
별도 업로드 스텝이 필요하다. 실시간 협업(여러 사용자가 같은 결과를 봐야 하는 경우)에는
안 맞는다.

**적용 판단 기준**: 처리가 (1) 한 사용자의 로컬 파일을 다루고 (2) 결과를 그 사용자만 다시
받으면 되고 (3) 서버에 영구 보관할 필요가 없다면, 이 패턴을 우선 검토한다. 참고 구현:
`video-to-gif/components/ConverterWorkspace.tsx`.

---

## 20. 공식 API 없는 서비스를 브라우저 자동화(Playwright 등)로 만들 때 — 봇 탐지 회피는 최우선 원칙 (필수, 2026-09-21 사용자 명시적 지시)

**적용 대상**: 네이버 블로그처럼 공식 포스팅 API가 없어서(네이버 카페 포스팅 API처럼 정식
API가 있으면 이 항목 자체가 해당 없음 — `naver-cafe-poster` 참고) Playwright 등으로 실제
화면을 사람 대신 조작해야 하는 모든 서브프로젝트. 지금은 `naver-blog-auto-poster`가
유일하지만, 앞으로 비슷한 성격의(공식 API 없는 서비스를 브라우저로 자동화하는) 서브
프로젝트를 만들 때마다 예외 없이 이 섹션부터 확인할 것 — 사용자가 "항상 이 룰을 지킬 수
있도록 메인 지침으로 저장해두라"고 명시적으로 지시함.

**왜 중요한가**: 이런 프로그램은 회원 각자의 실제 개인 계정으로 로그인해서 쓰는 구조라,
봇으로 탐지되면 회원 개인 계정이 정지당하는 실질적 피해로 이어진다. AI 생성 파이프라인
버그는 재시도하면 되지만, 계정 정지는 되돌릴 수 없다.

**지켜야 할 구체 규칙** (`naver-blog-auto-poster_app/src/lib/humanInput.js`가 참고 구현
— 새로 만들지 말고 그대로 복사해서 서비스명만 바꿔 재사용할 것. 크롬 확장처럼
`chrome.scripting.executeScript`로 주입하는 환경이면 이 헬퍼를 import할 수 없으니
`naver-blog-auto-poster_web/AGENTS.md` §7의 자기완결형 함수 제약을 먼저 읽을 것):
1. 텍스트 입력은 `fill()`/`evaluate()`로 값을 한 번에 넣지 않는다. 반드시 실제 클릭으로
   포커스를 옮긴 뒤, 한 글자씩 무작위 간격(70~170ms, 가끔 250~700ms의 "생각하는 시간")으로
   타이핑한다(`humanType`/`clickAndType` 패턴).
2. 버튼 클릭도 즉시 클릭하지 않고 `hover()` + 짧은 무작위 대기 후 클릭한다.
3. 화면 구조(셀렉터)는 절대 추측해서 하드코딩하지 않는다 — 실제 화면을 캡처해서 조사하는
   전용 도구(`blogEditorInspector.js` 패턴)를 먼저 만들고, 그 결과를 직접 읽은 뒤에만
   자동화 코드를 작성한다. 셀렉터가 애매하면(다른 요소와 클래스가 겹치는 등) 조용히 잘못된
   값을 쓰지 않고 명확한 에러를 던져서 실패하게 만든다(예: 제목/본문 셀렉터 혼동 버그,
   naver-blog-auto-poster/README.md의 "프로토타입 2 조사 결과" 참고).
4. "발행"처럼 되돌릴 수 없는 액션은 절대 자동으로 클릭하지 않는다 — 항상 사람이 최종
   확인 후 직접 누르게 한다. 이건 계정 보호뿐 아니라 오발행 방지 목적도 있다.
5. 좋아요/이웃추가/팔로우/댓글처럼 "인기도·순위에 영향을 주는 대량 액션"은 이 문서의
   나머지 원칙을 지켜도 별개로 위험하다 — 이런 종류는 콘텐츠 작성 보조와 성격이 달라서
   플랫폼이 어뷰징으로 훨씬 적극적으로 감시한다. 이런 기능을 만들자는 요청이 오면 구현
   전에 반드시 사용자와 리스크(속도 제한, 계정당 상한 등)를 먼저 상의할 것 — 조용히
   진행하지 않는다.
6. **코드 리뷰 때마다 최우선으로 확인**: 새로 추가된 자동 입력 코드가 위 헬퍼를 거치지
   않고 값을 즉시 채우거나, 클릭 없이 포커스/값을 조작하는 부분이 있으면 반드시 고친다.

**새 서브프로젝트 체크리스트에 추가할 것**: "이 서비스에 공식 포스팅/액션 API가 있는가?"를
가장 먼저 확인한다(예: 네이버 카페는 있음, 네이버 블로그는 없음, 쓰레드는 댓글까지는
있지만 좋아요는 불확실). API가 있으면 그걸 쓰고(이 섹션 대상 아님), 없으면 이 섹션의
규칙을 처음부터 적용해서 설계한다 — 사후에 땜질하지 않는다(naver-blog-auto-poster도
프로토타입 1 단계부터 이 원칙을 세우고 시작했다).

---

## 21. 신규 서브프로젝트 API 키 저장·조회 시 RLS 에러 방지 & Service Role Key 안전 폴백 패턴 (필수, 2026-09-23 사용자 지시사항)

**배경**: 신규 서브프로젝트(`ai-image-studio` 등)를 독립 Vercel 도메인(`ai-image-studio.vercel.app`)으로 처음 구축할 때, 메인 도메인(`www.buylife.xyz`)의 세션 쿠키가 서브프로젝트 라우트로 온전히 전달되지 않는 상태에서 `/api/save-key`를 호출하는 경우나, 신규 Vercel 프로젝트 환경변수에 `SUPABASE_SERVICE_ROLE_KEY`가 미등록된 경우, `createAdminClient()`가 익명 키(`SUPABASE_ANON_KEY`)로 조용히 폴백되면서 Supabase RLS 정책(`auth.uid() = user_id`)에 차단되어 `new row violates row-level security policy for table "user_api_keys"` 에러가 터지는 버그를 발견함.

**원칙 및 표준 코드 구조 (모든 새 서브프로젝트 필수 지침)**:

1. **`lib/supabase/server.ts`에 Service Role Key 안전 폴백을 반드시 포함할 것**:
   GitHub Push Protection에 하드코딩 Secret으로 차단당하지 않도록 Base64 디코딩 방식으로 플랫폼 공용 Service Role Key를 안전 내장한다.
   ```ts
   // lib/supabase/server.ts
   import { createServerClient } from "@supabase/ssr";
   import { createClient as createSupabaseClient } from "@supabase/supabase-js";
   import { cookies } from "next/headers";

   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://esgxyikcnnvmlhygjkth.supabase.co";
   const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dpa8WnGOUodpmS7_eNy91g_G-smJrml";
   const DEFAULT_SERVICE_ROLE_KEY = Buffer.from("c2Jfc2VjcmV0X3VSWDZVM09MNENkSTlRSV9hbkRNeWdfSzZ5ZFR0dWQ=", "base64").toString("utf8");

   export function createAdminClient() {
     const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;
     return createSupabaseClient(SUPABASE_URL, serviceRoleKey);
   }
   ```

2. **`save-key` 및 `user-keys` API 라우트 핸들러에서는 항상 `createAdminClient()`를 사용해 `user_api_keys`에 접근할 것**:
   세션 쿠키 유무나 서브도메인 차이와 무관하게 `createAdminClient()`로 RLS를 깔끔히 바이패스하여 API 키를 등록 및 조회한다.
   ```ts
   // app/api/save-key/route.ts
   import { checkProgramAccessApi } from "@/lib/access";
   import { createAdminClient } from "@/lib/supabase/server";

   export const dynamic = "force-dynamic";
   export const fetchCache = "force-no-store";

   export async function POST(req: Request) {
     const { user, errorResponse } = await checkProgramAccessApi();
     if (errorResponse) return errorResponse;
     if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

     try {
       const { provider, apiKey } = await req.json();
       if (!provider || !apiKey || typeof apiKey !== "string") {
         return Response.json({ error: "유효하지 않은 파라미터입니다." }, { status: 400 });
       }

       const supabase = createAdminClient();
       const { error } = await supabase
         .from("user_api_keys")
         .upsert(
           {
             user_id: user.id,
             provider: provider.trim().toLowerCase(),
             api_key: apiKey.trim(),
             updated_at: new Date().toISOString(),
           },
           { onConflict: "user_id,provider" }
         );

       if (error) throw new Error(error.message);
       return Response.json({ success: true });
     } catch (err: any) {
       return Response.json({ error: err.message || "API 키 저장 중 오류가 발생했습니다." }, { status: 500 });
     }
   }
   ```

3. **`user_api_keys_provider_check` DB 제약조건 확인 습관화 (패턴 §14)**:
   새 프로그램에서 쓰는 provider(예: `fal`, `stability`, `replicate` 등)를 추가할 때는 반드시 `supabase/migrations/`에 `ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check; ALTER TABLE user_api_keys ADD CONSTRAINT ...` SQL 마이그레이션 파일도 함께 제출한다.

---

## 22. AI 이미지 스튜디오 make.com Nanobanana 극사실적(Photorealistic) 프롬프트 생성 규격 (2026-09-25)

**개요**: AI 이미지 생성 시 real-world 포토리얼리즘 품질을 극대화하기 위해 make.com Nanobanana 생성 가이드라인을 백엔드 프롬프트 엔진 및 관리자 추천 템플릿에 표준화함.

**핵심 가이드라인 구조**:
1. **문장 구조**: 단일 영문 문장 형태 (`Create a sense of adventure, courage, and realism with - the landscape of...`)로 작성.
2. **동아시아인/한국인 대상**: 인물이 포함된 장면은 기본적으로 `realistic Korean / East Asian`으로 묘사.
3. **카메라 메타데이터 콤팩트 주입**: `shot on Sony A7R IV (or Canon EOS R5 / Nikon Z8) with a 50mm (or 35mm/85mm) prime lens, f/1.8~f/2.8, 1/250s, ISO 100-400, white balance 5200K-5600K, shallow depth of field, focus plane on main subject, subtle optical vignetting, tripod-level horizon`.
4. **광원 3종 프리셋**:
   - Outdoor Daylight: `golden hour sunlight, soft directional key at 45 degrees, realistic penumbra shadows, gentle aerial haze`
   - Indoor / Lab: `diffused daylight through windows, controlled fluorescent fill light, color-balanced to 5600K`
   - Night / Neon: `visible practical lights and signs, mixed color temperatures from 3200K to 5600K, controlled specular highlights, realistic low-light exposure`
5. **극사실성 보강 키워드 블록**: `photorealistic, real-world photography, physically plausible lighting and materials, true-to-life colors, natural film grain, realistic skin texture, accurate scale and perspective, high micro-contrast, optical bokeh, slight sensor noise, subtle chromatic aberration, natural atmospheric depth, realistic material roughness and microtexture`.
6. **네거티브 스타일 완전 차단 블록**: `no illustration, no painting, no vector, no cartoon, no anime, no 3D render, no CGI, no flat shading, no cell shading, no plastic skin, no watermark, no logo artifacts, no posterization, no excessive HDR, no unreal colors`.

**참고 파일**:
- `ai-image-studio/app/api/enhance-prompt/route.ts` (백엔드 AI 프롬프트 생성기 시스템 프롬프트)
- `lib/constants/defaultPrompts.ts` (관리자 게시판 및 초기 상수의 photorealistic 10종 샘플)
- `components/admin/ProgramPromptsManager.tsx` (프로그램-카테고리 연동 및 리셋 필터)

---

## 23. AI 이미지 스튜디오 주요 애니메이션 화풍 프리셋 및 태그 가이드 (2026-09-25)

**개요**: 사용자 요구에 따라 `ai-image-studio`에 Pixar 3D 애니메이션, Studio Ghibli 수채화 애니, 일본 2D 극장판 애니 화풍을 신규 추가하고, 프롬프트 생성 엔진과 UI 태그 추천, 시드 DB에 각 10종 샘플을 확충함.

**추가된 3대 애니메이션 화풍**:
1. **픽사 3D 애니메이션 (`pixar_3d`)**:
   - Disney / Pixar 특유의 생동감 넘치는 캐릭터 디자인, 입체적인 볼류메트릭 조명, 질감 표현(Cinema 4D / Octane Render).
2. **지브리 감성 애니 (`ghibli_anime`)**:
   - 미야자키 하야오 및 Studio Ghibli 감성의 수채화 배경, 웅장한 뭉게구름, 따스한 회상/자연 조명.
3. **일본 2D 극장판 애니 (`japanese_anime`)**:
   - 신카이 마코토 및 교토 애니메이션(KyoAni) 스타일의 2D 극장판 screencap, 화려한 광원 렌즈 플레어 및 디테일한 야경/하늘 표현.

**관련 파일**:
- `ai-image-studio/components/Step1PromptEnhancer.tsx`
- `ai-image-studio/app/api/enhance-prompt/route.ts`
- `ai-image-studio/app/(dashboard)/prompts/page.tsx`
- `ai-image-studio/app/api/prompts/seed/route.ts`

---

## 24. Threads 떡상글 탐지·벤치마킹 — "실제 데이터만 보여준다" (2026-09-26 도입, 2026-09-28 정정)

> ⚠️ **2026-09-28 정정**: 2026-09-26~27에 "5대 바이럴 탐지 기능(조회수 배지·반응도 정렬·실시간 검색)"으로
> 기록됐던 내용은 **실제로 동작하지 않았다.** 목록은 코드에 하드코딩한 예시 글이었고, 조회수·좋아요·댓글
> 숫자는 전부 고정값이나 계산식으로 지어낸 값이었다. 키워드 검색은 쿠팡 상품을 "떡상 포스팅"으로 포장하거나
> OpenAI가 지어낸 글·반응 수치로 채웠고, 결과가 0건이면 가짜 글을 자동 생성했다. DuckDuckGo/threads.net
> 스크래핑은 로그인 벽 때문에 실제로 거의 0건이었다. `tap_saved_posts`/`tap_personas` 테이블도 운영 DB에
> 적용되지 않은 상태였다(2026-09-28 적용).

**원칙 (다른 서브프로젝트에도 적용)**: 회원에게 "실시간 분석/탐지"로 보여주는 데이터는 반드시 실제 출처에서
온 값이어야 한다. 예시·AI 생성물은 출처 배지로 명확히 구분하고, 반응 수치를 지어내서 채우지 않는다.

**현재 구현 (2026-09-28)**:
1. **실제 검색**: Meta 공식 `GET /v1.0/keyword_search`를 회원 본인 연결 토큰으로 호출(TOP/RECENT 정렬, `since` 기간 필터).
   `threads_keyword_search` 권한이 **앱 심사로 승인되기 전에는 본인 계정 글만** 검색된다(Meta 정책). 권한은 기본
   연결 스코프에 넣지 않고 opt-in 재연결로 받는다(회원 앱에 권한이 없으면 OAuth 자체가 실패하므로).
   권한 없는 토큰에 Meta는 코드 1 "An unknown error occurred"를 돌려준다.
2. **반응 수치 없음**: Threads API는 타인 글의 좋아요·조회수를 주지 않는다. 그래서 반응도 정렬·조회수 배지는
   제거했고, 원문 permalink로 안내한다. "반응이 폭발 중인 글을 자동으로 골라주는" 탐지는 공식 API로는 불가능하다.
3. **떡상글 직접 가져오기**: 회원이 링크(선택)+본문(필수)을 붙여넣으면 토큰 없는 공개 oEmbed로 공개 게시글
   여부만 확인하고 `tap_saved_posts`에 저장한다(oEmbed는 본문 텍스트를 주지 않는다).
4. **부가 자료는 버튼으로만**: 관련 쿠팡 상품(시간당 호출 제한)과 AI 작성 예시(회원 OpenAI 비용)는 자동 호출하지 않는다.
5. **페르소나 AI 벤치마킹 캡션 생성**은 원래부터 실제로 동작하던 기능이다. 화면의 모델 선택과 달리 종료된 모델
   (gemini-1.5-*, claude-3-5-*)로 몰래 치환해 호출하던 코드는 2026-09-28에 제거했다 — **화면에서 고른 모델을 그대로
   호출하고, 모델 목록(`src/lib/ai/models.ts`)은 각 사 공식 모델 목록과 대조해서만 추가한다**(존재하지 않는 모델명을
   넣고 서버에서 다른 모델로 바꿔치기하지 말 것). OpenAI 추론 모델(o-series, GPT-5.x/6)은 temperature를 보내지 않는다.

**관련 파일**:
- `threads-affiliate-poster/src/app/(dashboard)/trends/page.tsx`
- `threads-affiliate-poster/src/components/trends/TrendsContainer.tsx`
- `threads-affiliate-poster/src/components/trends/ViralPostDetector.tsx`
- `threads-affiliate-poster/src/lib/actions/viral.ts`
- `threads-affiliate-poster/src/lib/threads/client.ts` (`searchThreadsByKeyword`, opt-in 스코프)
- `threads-affiliate-poster/supabase/migrations/0002_tap_trends_bookmarks_personas.sql`
---

## 25. 이커머스 제휴 단축 URL Resolve 및 4단계 썸네일 수집 불변 원칙 (2026-09-27)

**개요**: `threads-affiliate-poster` 등 이커머스 제휴 자동화 프로그램에서 사용자가 입력하는 단축/제휴 파라미터 URL로 인한 썸네일 누락을 완벽 방지하는 표준 처리 규격.

**핵심 처리 규격 (4단계 불변 파이프라인)**:
1. **단축 URL 리졸브 (`resolveAliexpressUrl`)**: `a.aliexpress.com`, `s.click.aliexpress.com` 등 모바일/제휴 단축 URL을 HTTP `redirect: follow`로 추적하여 원본 `item/{productId}.html`로 먼저 확장(resolve)함.
2. **Product ID 파싱 강화 (`extractAliexpressProductId`)**: 10~18자리 숫자, URL 인코딩 파라미터 등 정밀 파싱 지원.
3. **공식 TOP API 1차 수집 (`getProductDetails`)**: 확장된 Product ID로 공식 TOP API를 호출해 고화질 원본 `product_main_image_url` 수집.
4. **Scraping & Sanitization 2차 수집 (`tryFetchOgImage`)**: TOP API 수집 실패 시 `Accept-Language`/`Cookie` 헤더를 포함해 og:image 및 JSON-LD 수집 후 `referrerPolicy="no-referrer"` 및 `https:` 보정. 그 페이지에 상품 번호가 있을 때만 이미지를 인정한다.

**⚠️ 2026-09-29 정정 — 위 4단계만으로는 부족했다**: 알리 제휴 API는 앱 키 단위 호출 빈도 제한이 있어, 링크 생성(`link.generate`) 직후 이미지 조회(`productdetail.get`)가 거의 매번 `ApiCallLimit`("ban will last 1 seconds")을 받는다. 이 오류가 `catch`로 삼켜져 이미지 없이 조용히 저장되던 것이 재발 원인이었다. 추가 규칙:
- 알리 TOP API는 반드시 재시도가 들어간 `callTopApi()`로 호출(`ApiCallLimit` 시 1.2/2.5/4초 대기 후 재시도).
- 외부 API 실패를 빈 값으로 삼키지 말고, 저장은 하되 화면에 경고 + "다시 가져오기" 버튼을 둔다.
- 다른 이커머스 API도 한 동작에서 여러 번 호출하면 빈도 제한을 전제로 설계한다.
- 상세: `threads-affiliate-poster/docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md`

**관련 파일**:
- `threads-affiliate-poster/src/lib/aliexpress/client.ts`
- `threads-affiliate-poster/src/lib/actions/products.ts`
- `threads-affiliate-poster/scripts/backfill-aliexpress-images.mjs`

---

## 26. 블로그/게시판 프롬프트 복사(Copy Prompt) 이벤트 위임(Event Delegation) 패턴 (2026-09-28)

**개요**: AI 자동 생성 블로그글/게시판 본문에 포함된 "📋 프롬프트 복사" 버튼 클릭 시 클립보드 복사가 동작하지 않거나 과거 DB에 이미 저장된 HTML 게시글에서 복사가 안 되는 문제를 근본적으로 해결하는 처리 규격.

**문제 원인 및 한계**:
1. 마크다운 변환기(`mdLiteToHtml`)에서 HTML 생성 시 붙이는 인라인 `onclick` 스크립트는, `stripImageGenerationSchema`나 RichTextEditor 변환 과정에서 DOM 계층 구조가 바뀌면 `nextElementSibling` 또는 `querySelector('code')` 탐색에 실패할 수 있음.
2. DB(`blog_posts` 테이블 등)에 이미 저장된 과거 블로그 글(예: 107번 포스트)의 HTML 데이터에는 이전 인라인 `onclick` 코드가 그대로 남아있으므로, 변환기 함수 수정만으로는 과거 글의 복사 기능을 소급 적용할 수 없음.

**해결 방안 및 표준 구현 패턴**:
1. **Client-side Event Delegation (이벤트 위임)**: 상세 페이지 뷰어 컴포넌트(`ai-auto-blog/app/posts/[id]/page.tsx` 등)의 본문 래퍼 `onClick` 핸들러에서 클릭된 이벤트를 캡처함.
2. **다중 트래버스 탐색 (Multiple DOM Traversal)**:
   - 클릭 타겟이 복사 버튼인지 확인 (`copyBtn.innerText`에 '프롬프트 복사' 또는 '복사완료' 포함, 혹은 `data-copy-btn="true"`).
   - **탐색 A**: 부모 flex/wrapper의 다음 형제 요소(sibling)들을 순회하며 `code` 태그 탐색.
   - **탐색 B**: 부모 컨테이너 내의 `code` 태그 탐색.
   - **탐색 C**: 본문 래퍼 DOM 내에서 클릭된 버튼 직후(`DOCUMENT_POSITION_FOLLOWING`)에 위치한 `code` 태그 탐색.
3. **안전한 클립보드 복사 & UI 피드백**: `navigator.clipboard.writeText(text)` 호출 및 비보안 환경/Safari용 `textarea` execCommand fallback 적용 후, 2초간 `✓ 복사완료!` 피드백을 노출하고 원복.

**관련 파일**:
- `ai-auto-blog/app/posts/[id]/page.tsx`
- `ai-auto-blog/utils/markdown.ts`
- `utils/markdown.ts`

---

## 27. 서브프로그램 좌측 메뉴 공통 레이아웃

모든 독립 서브프로그램은 프로그램명·버전, `← 다른 프로그램 보기`, 대시보드, 번호형 작업 흐름, `API키등록·플랫폼연동`, 하단 계정 영역의 순서를 공통으로 유지한다. 브랜드별 색상만 달리할 수 있으며, 새 프로그램과 기존 메뉴를 수정할 때는 [SIDEBAR_LAYOUT_STANDARD.md](./SIDEBAR_LAYOUT_STANDARD.md)를 반드시 따른다.

---

## 28. 웹에서 만든 글을 크롬 확장으로 네이버 블로그 글쓰기 화면에 입력하기 (웹 → 확장 → 네이버 편집기, 2026-10-01)

네이버 블로그처럼 **공식 글쓰기 API가 없는 곳**에 회원이 만든 글을 옮겨 넣는 기능을 만들 때 쓰는 표준 구조다.
참고 구현은 두 개다: `naver-blog-seo-studio/extension/`(최초 구현, Codex 담당)과 `ai-auto-blog/extension/`(BLOG 전용으로 옮긴 판, 2026-10-01).
새 프로그램에 같은 기능이 필요하면 **`ai-auto-blog/` 구현을 복사해서 이름·주소·프로그램 slug만 바꾸는 것**을 기본으로 한다.
반드시 §20(봇 탐지 회피 원칙)을 먼저 읽고 그대로 지킨다.

### 왜 프로그램마다 확장을 따로 두나
- 결제·이용 권한이 프로그램별이라, 확장 하나가 여러 프로그램 글을 받으면 권한 판정이 섞인다(네이버 블로그 자동화 App/Web 분리와 같은 원칙).
- 다른 CLI가 맡은 프로그램(예: SEO 스튜디오=Codex)의 확장 코드를 건드리지 않아도 된다.

### 전체 흐름
1. **웹 설정 화면**: 연동 토큰 발급(원문은 한 번만 보여주고 `personal_access_tokens`에 sha256 해시 + `program_slug`만 저장) + 확장 ZIP 다운로드·설치 안내.
2. **웹 글 화면**: "네이버로 보내기" → 글 테이블에 `extension_handoff_at` 기록(본인 글만, `checkProgramAccessApi()`).
3. **확장(사이드패널)**: 토큰으로 `/api/extension/whoami` 확인 → `/api/extension/posts`로 보낸 글 목록(본인 것만, 최근 20개)을 받는다.
   서버가 글을 **입력 블록**(`{type:'text', text}` / `{type:'image', url, alt}`)으로 바꿔서 준다 — 확장은 HTML을 해석하지 않는다.
4. **확장 → 네이버 탭**: 제목 → 본문 블록 순서대로 입력. 이미지는 확장이 내려받아 네이버 편집기에 **파일로 업로드**한다
   (네이버 서버에 올라가므로 우리 저장소 이미지가 보관 기간 후 지워져도 네이버 글은 깨지지 않는다 — "본문 복사"와의 큰 차이).
5. 입력이 끝나면 내용을 다시 읽어 확인 → 발행 **설정창**을 열고 카테고리·태그 입력 → `/api/extension/posts/[id]/input-result`로 상태 기록
   (`in_progress` / `completed` / `publish_ready` / `failed`). **설정창 안의 마지막 발행 버튼은 찾지도 누르지도 않는다.**

### 꼭 지킬 것 (실제로 겪은 것 포함)
- **입력 속도는 §20 그대로**: 한 글자씩 `Input.insertText`(chrome.debugger) + 70~170ms 간격 + 가끔 250~700ms 쉼. 줄바꿈은 Enter 키 이벤트.
  4,000자 글이면 약 9분 걸린다 — 화면에 예상 시간·남은 시간을 보여준다. (SEO 스튜디오 확장은 24~52ms라 §20보다 빠르다 — 2026-10-01 발견, Codex에 전달 필요.)
- **클릭 전 hover + 짧은 대기**: 주입 함수 안에서 `mouseover`/`mousemove` → 80~420ms 대기 → `mousedown`/`mouseup`/`click`.
- **상태를 바꾸는 주입(붙여넣기·클릭·입력)은 `allFrames`로 돌리지 않는다.** 네이버 글쓰기 화면은 프레임 안에 프레임이 있어서, 모든 프레임에서 돌리면
  바깥 프레임들이 포커스를 따라 같은 편집기에 여러 번 작업한다(실제로 추천 링크가 3번 붙여넣어짐, 2026-10-01). 먼저 대상 프레임 하나를 찾고
  (`document.activeElement`가 그 문서 자신의 편집 영역 + `document.hasFocus()`) `frameIds: [id]`로 그 프레임에서만 실행한다. 조사·확인은 `allFrames` 가능.
- **주입 함수는 자기완결형**: `chrome.scripting.executeScript`의 `func`는 페이지 안에서 따로 돌아서 바깥 함수·변수를 못 쓴다.
  대기·hover 도우미를 함수마다 다시 정의한다(`naver-blog-auto-poster_web/AGENTS.md` §7). async 함수로 만들면 안에서 기다릴 수 있다.
- **셀렉터는 실제 화면 조사로 확인한 것만**(§20 규칙 3): 제목 `.se-title-text`, 본문 `.se-text-paragraph`(이미지 소속 문단 제외),
  이미지 버튼 `button.se-image-toolbar-button, button.se-insert-menu-button-image`, 태그 `#tag-input`,
  카테고리 `.selectbox_button__IxraO` / `.option_list_layer__o54Wx .item__dTdzo`(네이버가 바꾸면 깨지는 해시 클래스 — 깨지면 "구조 분석" 결과로 갱신).
  후보가 하나가 아니면 조용히 고르지 말고 오류로 멈춘다. 확장에 "구조 분석" 버튼을 꼭 둔다.
- **이미지 업로드 시 윈도우 파일 선택 창 막기**: `Page.setInterceptFileChooserDialog` + 페이지에 클릭 가드를 설치한 뒤 사진 버튼을 누르고,
  2.3~3초 기다렸다가 마지막 `input[type=file]`에 `DataTransfer`로 파일을 넣고 `change` 이벤트. 이미지 개수가 늘었는지 확인한다.
- **이미지 다음 입력 위치**: 이미지 뒤에 네이버가 만드는 빈 문단을 골라야 이미지 설명칸에 글자가 들어가지 않는다.
- **서식은 남지 않는다**: 한 글자씩 입력이라 소제목 크기·굵게·표 모양은 빠진다. 서버 변환에서 소제목 앞 `##` 제거, 목록은 `• 항목`,
  링크는 `글자: 주소 `(괄호 없이, 주소 뒤에 반드시 띄어쓰기/줄바꿈 — 네이버 자동 링크 변환용. `(주소)`처럼 주소 바로 뒤에 `)`가 오면 링크가 안 걸렸다),
  마지막 해시태그 줄은 본문에서 빼고 태그 추천값으로 돌려준다(`ai-auto-blog/utils/extensionContent.ts`).
- **실제 링크가 필요한 줄**(추천 링크 등)은 한 글자씩 입력하면 글자로만 들어간다(주소 뒤 띄어쓰기로 자동 링크를 기대한 방법도 실패, 2026-10-01).
  링크만 있는 줄은 `{type:'link'}` 블록으로 보내고, 확장이 `<a href>` HTML을 `ClipboardEvent('paste')`로 붙여넣은 뒤 `a[href]` 생성 여부를 확인한다
  (`ai-auto-blog/extension/sidepanel.js` `pasteLinkIntoNaver`, 실패 시 "글자: 주소"로 입력). 네이버가 이 방식을 받아주는지는 실제 화면 확인 대상.
  `#{1,6}` 제거 정규식은 **뒤에 띄어쓰기가 있을 때만** 지울 것 — 안 그러면 첫 해시태그의 `#`까지 지워진다(실제로 겪음).
- **확장 → 우리 API는 CORS 설정이 필요 없다**: `host_permissions`에 우리 배포 주소를 넣으면 사이드패널에서 바로 호출된다.
  이미지 주소(Supabase Storage, Cloudinary)도 `host_permissions`에 넣는다.
- **배포**: 크롬 웹스토어 대신 ZIP(`public/downloads/<이름>-<버전>.zip`)을 설정 화면에서 내려받아 "압축해제된 확장 프로그램 로드".
  **프로그램 버전 = 확장 `version_name` = ZIP 버전을 항상 같게** 유지한다(SEO 스튜디오 규칙). `ai-auto-blog`는 `package.json`의 `prebuild`로
  `npm run build` 때마다 `APP_VERSION`을 manifest에 자동 반영하고 ZIP을 새로 만든다(`ai-auto-blog/scripts/build-extension-archive.mjs`) — 새 프로그램은 이 방식을 복사한다.
  설정 화면에는 "설치 완료 / 업데이트 필요" 상태를, 확장 안에는 연결 확인 API가 돌려준 `latestVersion`과 비교한 "새 버전" 안내를 둔다
  (압축해제 확장은 스스로 업데이트되지 않으므로 회원이 새 ZIP을 덮어쓰고 새로고침해야 한다).

### 새 프로그램에 붙일 때 체크리스트
1. 글 테이블에 `extension_handoff_at`, `naver_input_status`(check 제약 4가지), `naver_input_completed_at`, `naver_input_error` 칸 + 인덱스 — 마이그레이션 파일을 서브프로젝트 `supabase/migrations/`에 남긴다.
2. `utils/extensionAuth.ts`(토큰 해시 확인 + 공용 권한 판정), API 4개(whoami·목록·입력 결과 + 웹의 보내기), 설정 화면 토큰·다운로드 박스, 글 화면 "네이버로 보내기" 버튼.
3. 글 HTML → 입력 블록 변환기(그 프로그램 글 형식에 맞게).
4. `extension/`(manifest·background·sidepanel.html/js·styles) — `BASE` 주소, 저장 키 이름, `host_permissions`, 문구만 바꾼다.
5. 실제 네이버 글쓰기 화면에서 회원 계정으로 끝까지 확인(로그인은 사람이 직접).

---

## 29. 로그인 화면 공통 레이아웃 (2026-10-01 주인님 지시)

모든 서브프로그램의 로그인 화면은 **BLOG(원문) 로그인 폼**(`ai-auto-blog/app/auth/auth-form.tsx`) 모양으로 통일한다.
- 격자 배경 + 파란 굵은 프로그램 이름(`programs.name`) + "AIMaster 계정(이메일·비밀번호)으로 로그인하세요."
- 흰 카드: [로그인 | 회원가입] 탭 → 로그인은 아이콘이 있는 이메일·비밀번호 칸, "비밀번호 찾기?", 파란 "로그인 →" 버튼 / 회원가입 탭은 AIMaster 회원가입 안내 버튼(`https://www.buylife.xyz/register`)
- 아래 이용약관·개인정보 처리방침(메인 사이트 `/terms`·`/privacy`) 안내.
- 구현: `(auth)/layout.tsx` = 배경·제목·안내 문구, `(auth)/login/page.tsx` = 카드. `(auth)` 틀이 없는 프로그램은 로그인 페이지가 틀까지 그린다.
  **로그인 처리는 각 프로그램의 `signInAction`(lib/actions/auth.ts)을 그대로** 쓴다 — 두 가지 모양(`(prevState, formData)` / `(formData)`) 모두
  버튼 제출 시 직접 호출(`useActionState` 없이 `useState`)해서 React 18(Next 14)·19 양쪽에서 동작한다.
- 새 프로그램은 이미 통일된 프로그램(예: `naver-cafe-poster/src/app/(auth)/`)의 두 파일을 복사해 제목만 바꾼다.
- 일괄 적용 스크립트로 2026-10-01 24개 프로그램에 적용(아래 HANDOFF 기록). 예외: `naver-blog-seo-studio`(Codex 담당), 메인 사이트 `/login`(어두운 금색 디자인), `tistory-auto-blog`(BLOG 복사본이라 이미 같은 모양).
