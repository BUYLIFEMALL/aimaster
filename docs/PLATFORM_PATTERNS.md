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

## 10. cron/웹훅 라우트는 `dynamic = "force-dynamic"`만으로 캐시가 안 꺼질 수 있다

crm-google-form의 팔로우업 cron(`app/api/cron/followup`)을 만들면서, `export const dynamic =
"force-dynamic"`을 선언했는데도 supabase-js(`createAdminClient()`)로 조회한 결과가 **첫
요청 시점 그대로 계속 캐싱되는 버그**를 실제로 재현했다(2026-08-18, 로컬 개발 서버 — DB를
바꾼 뒤 같은 서버 프로세스에서 같은 라우트를 다시 호출해도 이전 응답이 그대로 나옴, 서버를
재시작해야만 최신 데이터가 반영됨). Next.js 14 App Router의 Data Cache가 route handler
내부에서 실행되는 라이브러리의 `fetch` 호출까지 캐싱하는데, `dynamic = "force-dynamic"`이
이걸 항상 확실하게 꺼주지는 않는 것으로 보인다.

- **cron이나 웹훅처럼 "매 요청 최신 DB 상태를 읽어야 하는" 라우트에는 반드시
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

**public 버킷으로 직접 서빙해도 보안이나 외부 링크 제공 문제 없음.** Cloudinary와 동일하게 인증 없는 순수 공개 HTTPS URL(`https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/<bucket>/...`)로 서빙되며, 외부 사이트·Make.com/n8n 같은 자동화 도구가 `<img>`/hotlink으로 그대로 불러다 써도 문제없다. 루트 사이트 `next.config.mjs`의 `images.remotePatterns`에 이 Supabase Storage 도메인이 이미 허용되어 있어 추가 설정도 필요 없다(커밋 `868799d`). 오히려 Cloudinary 같은 제3자 서비스의 월간 생성 한도에 다시 걸릴 위험이 없어진다는 게 장점이다.

Cloudinary 자체는 계속 써도 된다 — 다만 **신규 이미지 "생성"**에만 안 쓴다는 것이 핵심이다. 이미 Cloudinary에 올라간 기존 프로그램 썸네일 9종의 조회/치환이나, 이미지 분석·변환(`get-asset-details`, `transform-asset` 등 생성이 아닌 기존 자산 조작) 용도로는 그대로 활용 가능하다.

---

## 14. 공용 `user_api_keys`에 새 provider 추가할 때 체크 제약도 같이 넓힐 것

새 서브프로젝트가 `user_api_keys` 테이블에 없던 provider(예: `serpapi`)를 쓰려고 하면, 코드
(`ApiKeyProvider` 타입, `PROVIDER_LABELS`)만 고치고 실제 DB의 `user_api_keys_provider_check`
체크 제약을 넓히는 걸 깜빡하기 쉽다. 이러면 사용자가 설정 페이지에서 키를 저장할 때
`new row for relation "user_api_keys" violates check constraint "user_api_keys_provider_check"`
에러만 나고 원인을 알기 어렵다(2026-08-22, competitor-analysis의 `serpapi` 추가 때 실제로 겪음 —
auto-detail-page가 `replicate` 추가할 때도 동일 패턴 이미 있었음).

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
