# 기본지침 (AGENTS.md) — Threads 쇼핑제휴 자동화 독립 운영본

이 저장소를 운영·수정하는 사람과 AI 코딩 도구(Claude Code, Codex 등)가 **예외 없이 지키는 규칙**입니다.
설치 방법은 `README.md`, DB 구조는 `setup/DB_DESIGN.md`를 보세요.

---

## 1. 제품 원칙

1. **엔진은 운영자가, 연료는 회원이.** 코드·화면·자동화 로직은 운영자가 만들고, 그걸 돌리는 API 키(OpenAI·Gemini·Claude,
   쿠팡·알리·토스)와 외부 계정(Threads/Meta 앱)은 **회원이 설정 화면에서 본인 것을 등록**해 씁니다.
   - 운영자 키로 대신 호출하는 "폴백"을 만들지 않습니다. 회원 키가 없으면 조용히 실패하지 말고
     "API 키 등록이 필요합니다. 설정 페이지에서 본인 키를 등록해주세요."처럼 등록 위치를 알려 줍니다.
   - Meta(Threads) 앱도 회원 본인이 만듭니다. 운영자 앱 하나를 여러 회원이 같이 쓰면 심사 전 앱은 테스터 외 로그인이 거부됩니다.
   - 예외: 네이버 트렌드(`NAVER_TREND_*`), 토스 고정 IP 프록시(`FIXIE_URL`), 크론(`CRON_SECRET`)은 운영 인프라라 운영자 값입니다.
2. **로그인 ≠ 이용 권한.** 화면(레이아웃)뿐 아니라 **DB에 쓰거나 유료 API를 부르는 모든 Server Action·API route**가
   `requireProgramAccess()`(Server Action/페이지) 또는 `checkProgramAccessApi()`(API route, `redirect()` 대신 JSON 오류)를 거칩니다.
   예외: 로그인·로그아웃·회원가입 액션, `CRON_SECRET`으로 보호되는 `/api/posts/dispatch-scheduled`, Meta 서명으로 검증하는 콜백.
3. **회원 데이터는 완전히 분리.** 회원 데이터 테이블은 `user_id` + RLS 본인 행 정책을 갖습니다. service role(관리자 권한) 클라이언트를
   쓸 때는 코드에서 반드시 `user_id`로 걸러냅니다. `user_program_access` 등에 "모두 허용(using true)" 정책을 절대 만들지 않습니다.
4. **캐시 금지 두 줄.** 로그인·권한을 확인하는 `layout.tsx`와 모든 `route.ts`에
   `export const dynamic = "force-dynamic";`과 `export const fetchCache = "force-no-store";`를 같이 둡니다.
   빠지면 서버가 다른 사람의 응답을 캐시해서 보여줄 수 있습니다.
5. **지어낸 데이터 금지.** API가 주지 않는 수치(타인 글 조회수·좋아요 등)를 만들어 채우지 않습니다. 없으면 표시하지 않고 원문 링크를 줍니다.
   예시·AI 생성 글은 반드시 출처 배지로 구분합니다.
6. **제휴 고지 자동 삽입 유지.** `src/lib/ai/affiliateGenerator.ts`가 캡션 끝에 붙이는 수수료 고지 문구(표시광고법·쿠팡 정책)를 없애거나 우회하지 않습니다.
7. **AI 이미지의 인물은 기본적으로 한국인**으로 묘사합니다(해외 인물·해외 배경이 필수인 경우만 예외).
8. **비밀값은 코드·문서·커밋에 적지 않습니다.** `.env.local`과 Vercel 환경변수에만 둡니다. 화면 캡처에 시크릿이 보이면 즉시 재발급합니다.

## 2. 작업 순서 (모든 수정에 적용)

1. `npm run build`로 타입·빌드 오류가 없는지 확인
2. `src/lib/version.ts`의 `APP_VERSION`과 DB `programs.version`을 **함께** 올림
   - 형식 `v<메이저>.<두 자리 마이너>`: 수정·배포마다 `v1.01 → v1.02`, 큰 변경·완성 단계는 운영자 결정으로 `v2.01`
   - DB: `update programs set version = 'v1.02' where slug = 'threads-affiliate-poster';`
3. Git 커밋 (메시지에 무엇을·왜·버전) → push
4. Vercel 배포 (`vercel deploy --prod` 또는 Git 연동 자동 배포)
5. 이 문서나 `README.md`·`setup/DB_DESIGN.md`에 바뀐 규칙·구조를 같은 커밋으로 기록

DB를 바꿀 때는 `supabase/migrations/00NN_설명.sql` 파일을 추가하고 운영 DB에 실행한 뒤 함께 커밋합니다.

## 3. 구조 요약

| 경로 | 역할 |
|---|---|
| `src/lib/deployment.ts` | 독립 운영 모드 스위치(`NEXT_PUBLIC_STANDALONE_MODE`)와 사이트·운영자 정보 |
| `src/lib/access.ts` | 이용 권한 판정 (`requireProgramAccess`, `checkProgramAccessApi`, 사용 기록 `logProgramUsage`) |
| `src/lib/actions/*.ts` | Server Action (게시글·상품·설정·트렌드·페르소나·인증) |
| `src/lib/threads/` | Threads API 호출, Meta 서명 검증(`signedRequest.ts`) |
| `src/lib/ai/` | 캡션·이미지 생성, 모델 목록(`models.ts`) |
| `src/app/(dashboard)/` | 회원 화면 (대시보드·트렌드·상품·게시글·설정·사용방법) |
| `src/app/(auth)/` | 로그인·회원가입 |
| `src/app/legal/` | 개인정보처리방침·약관·데이터 삭제 안내 (운영자 정보는 환경변수) |
| `src/app/api/threads/` | Threads 로그인 콜백, Meta 제거·삭제 콜백 |
| `src/app/api/posts/dispatch-scheduled` | 예약 게시 실행 (크론 전용) |
| `supabase/` | 전체 스키마(`schema.sql`)와 변경 이력(`migrations/`) |

## 4. 알아둘 제약

- Threads `keyword_search`는 Meta 앱 심사로 `threads_keyword_search` 고급 액세스를 받기 전에는 **본인 글만** 돌려줍니다.
  미승인 회원은 "떡상글 직접 가져오기"를 씁니다.
- 타인 글의 좋아요·조회수는 API가 주지 않습니다.
- 토스 쉐어링크 API는 등록된 고정 IP에서만 호출됩니다(`FIXIE_URL`).
- 네이버 브랜드커넥트는 공식 API가 없어 회원이 링크를 직접 붙여넣습니다.
- Vercel 함수 요청·응답 본문은 4.5MB 한도입니다. 큰 영상은 Supabase Storage에 직접 올립니다.
