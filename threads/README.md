# Threads 자동 포스팅 관리 웹

Threads 게시글을 작성하고, 즉시 게시하거나 날짜/시간을 지정해 예약 게시할 수 있는
마케팅 자동화 웹 애플리케이션입니다.

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Meta Threads 공식 API** (Graph API)
- **Vercel** 배포

## 핵심 기능

- 이메일 회원가입 / 로그인 (Supabase Auth)
- 대시보드: 상태별 게시글 통계, 다가오는 예약 게시 목록
- Threads 계정 OAuth 연결 / 해제
- 텍스트 게시글 작성 + 이미지 첨부 (파일 업로드 → Supabase Storage, 또는 이미지 URL 직접 입력)
- 즉시 게시 / 예약 게시 / 임시저장
- 게시 상태 관리: `draft → scheduled → publishing → published / failed`
- 게시 성공 시 Threads 게시물 ID·permalink 저장, 실패 시 오류 메시지 저장
- 게시글 목록/상세/수정/삭제
- AI 게시글 생성 기능을 위한 확장 자리 (`src/lib/ai/generator.ts`)
- 모바일/PC 반응형 UI

## 보안 설계

- Threads Access Token은 `threads_accounts` 테이블에만 저장되며, 브라우저로 전달되지 않습니다.
  모든 Threads API 호출은 `src/lib/threads/client.ts`(서버 전용, `server-only` 가드)에서만 실행됩니다.
- Supabase **service role key**는 `src/lib/supabase/admin.ts`에서만 사용하며,
  예약 게시 일괄 처리(`/api/posts/dispatch-scheduled`)처럼 RLS를 우회해야 하는 서버 로직에 한정합니다.
- 사용자 데이터는 Supabase RLS(`auth.uid() = user_id`)로 분리됩니다. (`supabase/migrations/0001_init.sql`)
- 비밀값은 `.env.local`(gitignore 처리됨)에서만 관리하며, 저장소에 커밋되지 않습니다.

## 예약 게시 실행 방식 (자동화: cron-job.org + Vercel Cron 백업)

Vercel **Hobby(무료) 플랜은 Cron이 하루 1회로 제한**되므로, 메인 자동화는
무료 외부 스케줄러(cron-job.org)가 1~5분 간격으로
`/api/posts/dispatch-scheduled`를 호출하는 방식으로 구성했습니다.
`vercel.json`에는 하루 1회 실행되는 Vercel Cron이 안전망(백업)으로 등록되어 있어,
외부 스케줄러가 멈춰도 하루 한 번은 밀린 예약글이 게시됩니다.
대시보드의 "예약 게시 실행" 버튼은 즉시 확인용 수동 트리거로 별도 유지됩니다.

동일한 처리 로직이 `/api/posts/dispatch-scheduled` (GET/POST, `Authorization: Bearer <CRON_SECRET>` 필요)
엔드포인트로 노출되어 있습니다. Vercel **Pro 플랜**으로 업그레이드하면 `vercel.json`만으로
분 단위 자동화가 가능합니다. 자세한 내용은 `SETUP_GUIDE.md`를 참고하세요.

## 폴더 구조

```
src/
├── app/
│   ├── (auth)/            # 로그인 / 회원가입
│   ├── (dashboard)/       # 인증 가드가 걸린 대시보드/게시글/계정 화면
│   └── api/
│       ├── threads/callback/          # Threads OAuth 콜백
│       └── posts/dispatch-scheduled/  # 예약 게시 일괄 실행 (CRON_SECRET)
├── components/
│   ├── ui/                # 공용 UI 컴포넌트
│   ├── posts/             # PostForm, StatusBadge
│   └── layout/             # Sidebar
├── lib/
│   ├── supabase/          # client / server / admin 클라이언트
│   ├── threads/           # Threads Graph API 래퍼 (서버 전용)
│   ├── posts/              # 게시 실행 공용 로직 (publish-core, dispatch)
│   ├── actions/            # Server Actions (posts, accounts, auth)
│   ├── ai/                 # AI 게시글 생성 확장 자리 (stub)
│   ├── auth.ts, date.ts, validation.ts, clsx.ts
├── types/                  # Database / Post 타입
└── proxy.ts                 # 인증 가드 (Next.js 16 "proxy" 컨벤션, 구 middleware)

supabase/migrations/
├── 0001_init.sql                    # 테이블 + RLS 정의
└── 0002_post_images_storage.sql     # 이미지 업로드용 Storage 버킷 + RLS
```

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

환경변수 값 채우는 방법과 Supabase/Threads 앱 설정은 **`SETUP_GUIDE.md`**를 참고하세요.

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드 + 타입체크
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint
```
