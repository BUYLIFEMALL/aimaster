# stepmail — 이메일 자동발송 (STEP Mail)

리드(잠재고객) 목록을 엑셀로 업로드하고, 사용자가 등록한 여러 이메일 계정(구글/네이버/다음 등)
으로 AI가 작성한 이메일을 원하는 수량/시간대/반복주기로 예약 발송하는 프로그램.

## 파이프라인 (Phase 1)

1. **리드 관리** (`/leads`): 엑셀(xlsx) 업로드로 리드를 대량 등록/갱신한다(이메일만 필수,
   닉네임 등 나머지 컬럼은 비어 있어도 됨). 이메일 기준 upsert라 같은 파일을 다시 올려서
   최신화할 수도 있다. 상태(`status`)는 `new`(미발송/발송 중 공통) / `customer_completed`
   (전환된 고객, 발송 제외) / `stopped`(수신거부, 발송 제외) 3가지이고, 몇 차까지 발송했는지는
   별도 컬럼 `send_count`(0~5)로 표현한다 — 화면에는 `send_count`가 0이면 "미발송", 1
   이상이면 "N차 발송"으로 표시된다(`lib/leadStatus.ts`의 `getLeadDisplayStatus()`).
2. **이메일 계정** (`/accounts`): 발송에 쓸 본인 이메일 계정(SMTP)을 여러 개 등록한다. 구글/
   네이버/다음 프리셋으로 호스트/포트를 자동 채워주고, 등록 직후 "테스트 발송" 버튼으로 본인
   메일함에 실제로 확인할 수 있다.
3. **이메일 작성** (`/drafts`): 주제/키워드/참고링크/추천링크(CTA)/추가지시사항을 입력하면
   AI가 제목+본문을 초안으로 만들고, 사용자가 검토/수정 후 저장한다(blog의 AI 글쓰기 폼과
   동일한 입력 구조). Gemini API 키를 등록해뒀으면, 이메일 핵심 주제를 반영한 이미지도 함께
   자동 생성해서 본문 상단에 넣어준다(blog의 `generateArticleBasedImagePrompts` + NanoBanana
   이미지 생성 패턴 참고 — `lib/ai/emailImage.ts`). 선택 사항이라 Gemini 키가 없으면 이미지
   없이 텍스트 초안만 만들어진다.
4. **예약 발송** (`/campaigns`): 초안 하나를 골라 발송 대상 차수(`target_send_count` — "지금까지
   N번 받은 리드"를 골라 N+1차로 발송), 실행당 발송 수량, 발송 시각(시), 반복주기(한 번만/매일/
   매주)를 정하고, 사용할 이메일 계정을 여러 개 선택하면(로테이션 발송) 캠페인이 만들어진다.
   "지금 실행" 버튼으로 예약 시각을 기다리지 않고 즉시 1회 실행할 수도 있다(테스트/긴급 발송용).
5. **자동 실행** (`app/api/cron/dispatch`): Vercel Cron이 매시 정각에 깨어나서, 활성 캠페인
   중 그 시간대·반복주기 조건에 맞는 것만 골라 `lib/dispatch.ts`로 실제 발송한다.

## 설계 배경 — Make.com 시나리오 참고 + 실제 요구사항 확장 (2026-08-17)

`D:\PDS\01🟡(Stepmail)-GSheet(고객DB)-Naver(1차)-Gmail(2차)-GSheet업데이트(T)1.blueprint.json`
(구글시트 CRM + Naver 1차/Gmail 2차 콜드메일 자동화)을 분석하며 시작했지만, 사용자가 실제로
원한 것은 그보다 넓었다:

- 계정을 Naver/Gmail 2개로 고정하지 않고, **임의 개수의 SMTP 계정을 등록**해서 예약 발송 시
  로테이션하는 방식.
- 발송 트리거를 "F/G/H 컬럼 상태"가 아니라 **수량/시간대/반복주기를 사용자가 직접 정하는
  예약(캠페인) 방식**으로.
- 이메일 본문을 하드코딩하지 않고, **blog의 AI 글쓰기 폼과 동일한 방식**(주제/키워드/참고
  문서/추천링크 → AI 초안 → 사용자 검토/저장)으로 작성.

### 실제 잠재고객(T).xlsx 데이터 확인 (2026-08-17)

`D:\PDS\잠재고객(T).xlsx`(사용자가 실제 운영 중이던 리드 시트)를 직접 열어 구조와 데이터를
확인했다:
- 컬럼: 입력일 / 채널 / 닉네임 / 이메일 / 메모 / 현재Funnel / 콜드메일차수 / 마지막 콜드메일
  발송일 (I열 이후는 비어있는 예비 컬럼).
- 실데이터 9,999건, 이메일 전부 유니크. 채널은 전부 `"T"`(Threads 추정).
- `현재Funnel` 값: 미접촉(9,742) / `콜드메일`(245, 발송중) / `고객완료`(6, 전환됨) /
  `스탑메일`(6, 수신거부) — **원래 계획했던 3단계(new/step1/step2)보다 상태가 많아서**, 발송
  제외 상태(`customer_completed`, `stopped`)를 스키마에 명시적으로 추가했다.
- `콜드메일차수`가 `2차`인 행이 **단 한 건도 없었다**(데이터는 2024-06-12부터 존재, 1년 넘게
  운영). 원본 Make.com 시나리오의 최상위 필터(F/G/H가 전부 비어있어야 트리거)가 2차(Gmail
  리마인드) 라우터의 조건(F/G가 채워져 있어야 함)과 상충하는 버그가 있었는데, **실제로 이
  버그가 발동해서 2차 메일이 한 번도 안 나간 것으로 추정**된다. 이 프로젝트는 이 필터 버그를
  재현하지 않고 명확한 status 상태 머신으로 재설계했다(`lib/leads.ts`의 `mapFunnelToStatus`).
- `입력일`/`마지막 콜드메일 발송일` 셀이 날짜형과 `"2025.03.24"` 문자열이 섞여 있어서
  `lib/leads.ts`의 `parseDateCell()`이 둘 다 처리한다.

### 발송 계정을 SMTP로 통일한 이유

원본은 Naver는 SMTP, Gmail은 Make.com의 네이티브 OAuth 모듈을 썼다. 이 프로젝트는 **Gmail도
OAuth 대신 앱 비밀번호 기반 SMTP로 통일**했다 — 이미 이 저장소에 검증된 네이버 SMTP 패턴
(`docs/PLATFORM_PATTERNS.md`, 루트 `lib/email/`)이 있고, Google OAuth는 심사/동의화면 등
훨씬 복잡해서 멀티테넌트 환경(사용자마다 자기 계정 연동)에 부담이 크기 때문이다. 사용자가 각
서비스의 앱 비밀번호만 발급받으면 되므로 구현/운영 난이도가 훨씬 낮다.

### 이메일 초안 이미지 생성 (blog 참고, 2026-08-17)

blog(`blog/utils/news/imageGenerator.ts`)의 `generateArticleBasedImagePrompts` + Gemini
NanoBanana 이미지 생성 패턴을 그대로 참고해서 이식했다:
- 1단계: GPT(이미 등록된 `openai` 키 재사용)로 주제/키워드/제목/본문을 영어 사진 프롬프트 1개로
  압축한다("인물이 나오면 기본은 한국인/동아시아인으로 묘사, 해외 유명인·장소가 명시된 경우만
  예외" — 루트 CLAUDE.md 원칙 + blog 코드의 문구를 그대로 반영).
- 2단계: 그 프롬프트로 Gemini `gemini-2.5-flash-image` 모델을 직접 호출해 base64 이미지를
  받는다(`gemini` provider, 본인 키 필요, `lib/ai/emailImage.ts`).
- **blog는 Cloudinary(사용자별 계정)에 영구 저장하지만, stepmail은 Supabase Storage(신규
  public 버킷 `stepmail-images`, music-audio와 동일한 owner-scoped 정책)를 쓴다** — 이미
  Supabase를 쓰고 있는데 이메일 발송이라는 용도 하나 때문에 Cloudinary 계정까지 추가로
  요구하는 건 과하다고 판단했다.
- 이미지는 있으면 좋은 부가 기능으로 취급한다: Gemini 키가 없거나 생성이 실패해도 이메일 텍스트
  초안 저장 자체는 막지 않는다(blog처럼 무료 폴백 이미지 서비스로 대체하지 않고, 그냥 이미지
  없이 진행 — 실제 발송 메일에 출처 불명 이미지가 섞여 들어가지 않게 하기 위함).
- 생성된 이미지는 `stepmail_email_drafts.image_url`에 저장하고, 실제 발송 시에도 보이도록
  `body_html` 상단에 `<img>` 태그로 직접 삽입한다(에디터에서 지우거나 위치를 바꿀 수 있음).

### 캠페인 재사용 row 방식 (같은 remix row를 재사용하는 music의 자동연장 패턴과 유사)

캠페인은 `last_run_at`/`recurrence`로 자기 자신을 반복 실행하는 단일 row다 — 실행마다 새
row를 만들지 않고 같은 캠페인이 계속 재사용된다. 발송 이력(누구에게 언제 보냈는지)은 별도
`stepmail_send_log` 테이블에 감사 로그로 남긴다.

### 이메일 초안 편집기 (2026-08-17)

`/drafts/[id]`의 본문 편집을 AI가 만든 HTML을 그대로 텍스트로 고치는 방식에서, 루트 앱의
`components/ui/RichTextEditor.tsx`(TipTap)를 참고한 시각적(WYSIWYG) 편집기로 바꿨다
(`components/drafts/EmailRichTextEditor.tsx`). 루트/블로그용 에디터와 다르게 유튜브 삽입·표
기능은 뺐다 — 대부분의 이메일 클라이언트(특히 Outlook)가 iframe을 제거하거나 깨뜨리기 때문에
"블로그 글"이 아니라 "실제 발송되는 이메일 본문"에는 맞지 않는다고 판단했다. 이미지 삽입은
`stepmail-images` 버킷(이메일 초안 이미지와 같은 버킷)에 업로드한다. 고급 사용자를 위해
"HTML 코드로 편집" 토글도 남겨뒀다. AI가 만든 CTA 버튼(`<a>` 태그의 인라인 style)이 편집기를
거쳐 저장해도 그대로 보존되는 것을 실제로 확인했다(TipTap이 알 수 없는 속성도 파싱 시 버리지
않고 유지함).

## Vercel Cron 관련 주의사항

`vercel.json`에 매시 정각(`0 * * * *`) 스케줄로 `/api/cron/dispatch`를 등록해뒀다. **이 cron이
실제로 배포되어 활성화되는 순간부터, 등록된 활성 캠페인은 자동으로 실제 리드에게 이메일을
발송하기 시작한다** — 배포 전 반드시 사용자에게 확인할 것(AGENTS.md 승인 필요 작업 7번).

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=
CRON_SECRET=
```

## 남은 작업 / 향후 확장 후보

- 발송 이력(`/campaigns`나 별도 `/logs` 화면)에서 `stepmail_send_log`를 조회하는 UI는 아직
  없음(DB에는 쌓이지만 화면에서 못 봄) — 필요하면 추가.
- 이메일 본문에 리드 닉네임 등 merge field(개인화) 치환 기능은 아직 없음(모든 리드에게 동일한
  본문 발송) — 필요하면 `{{nickname}}` 같은 플레이스홀더 치환 로직을 `lib/dispatch.ts`에 추가.
- CSV 업로드는 파일 확장자만 허용해뒀고 실제 파싱 로직은 xlsx 전용(`lib/leads.ts`가 `xlsx`
  패키지로 xlsx/xls만 정확히 파싱함 — CSV는 `XLSX.read`가 처리는 하지만 별도 검증 안 함).
