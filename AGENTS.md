# AIMaster — AI 에이전트 인수인계 문서 (AGENTS.md)

이 문서는 **Claude Code뿐 아니라 Codex, Gemini(구글) 등 어떤 AI 코딩 에이전트가 이 저장소에
새로 투입되더라도**, 지금까지 쌓인 작업 방식·규칙·주의사항·완성된 프로그램 현황을 바로 파악하고
이어서 작업할 수 있도록 정리한 인수인계 문서다. 2026-09-29 기준 최신 상태를 반영했다.
**"지금 멈춰 있는 일·남은 일·최근 작업"은 [`docs/HANDOFF.md`](docs/HANDOFF.md)에 따로 모아뒀다 — 먼저 읽을 것.**

- 루트에는 이 문서와 별도로 `CLAUDE.md`(Claude Code 전용, 이 문서와 상당 부분 겹침)가 있다.
  Claude Code는 `CLAUDE.md`를 자동으로 읽으므로 그쪽이 1차 소스지만, **다른 도구는 CLAUDE.md를
  자동으로 읽지 않으므로 이 AGENTS.md가 사실상 유일한 진입점**이다. 두 문서 중 하나만 고쳐서
  내용이 어긋나면, 여기(AGENTS.md)와 루트 CLAUDE.md 양쪽을 함께 확인해서 최신 쪽을 신뢰할 것.
- 각 서브프로젝트 폴더(`tarot/`, `threads/`, `ai-auto-blog/` 등) 안에도 그 프로젝트 전용 `README.md`/
  `AGENTS.md`가 따로 있다. 이 루트 문서는 "플랫폼 전체 공통 규칙 + 프로그램 목록"이고, 특정
  프로그램을 실제로 고치기 전에는 반드시 그 서브프로젝트 폴더의 문서까지 읽을 것.
- 사용자를 한국어로 부를 때는 **"주인님"**을 쓴다(사장님 등 다른 호칭 금지 — 사용자가 명시적으로
  교정한 사항). 답변은 정중한 존댓말(-습니다체), 기술 용어 외에는 쉬운 한글로 쓴다.

---

## 0. 가장 먼저 확인할 것

0-1. 루트 [`PROGRESS.md`](PROGRESS.md)(최근 세션 요약 — 한 작업·남은 작업·클라우드 세션 주의점)를 먼저 훑는다.
     **클라우드 세션이면 [`docs/CLOUD_SESSION.md`](docs/CLOUD_SESSION.md)를 따른다** — `cloud-work` 브랜치에서만 작업, 배포·버전·DB 쓰기는 로컬 병합 때.
0. [`docs/HANDOFF.md`](docs/HANDOFF.md)로 현재 멈춰 있는 일, 남은 일, 손대지 말아야 할 폴더(다른 CLI 작업 중)를 확인한다.
   작업을 끝내면 그 문서의 표도 같은 커밋으로 갱신한다.
   **그리고 [`docs/ERROR_LESSONS.md`](docs/ERROR_LESSONS.md)(작업 중요 지침 — 에러 해결 기록·점검 체크리스트)를 읽는다.**
   작업 중 에러를 해결했거나 중요 점검 사항을 찾으면 그 문서에 같은 커밋으로 추가한다(핵심 원칙 7번 — 모든 CLI 공통).
1. 지금 어떤 서브프로젝트를 고치려는지 먼저 정하고, `<프로그램명>/README.md`와
   `<프로그램명>/AGENTS.md`(또는 `CLAUDE.md`)를 읽는다 — 코드를 만들기 전에 반드시.
2. `git status`, `git log --oneline -10`으로 로컬이 원격(`origin/master`)과 동기화됐는지 먼저
   확인한다. **이 저장소는 로컬 클론이 여러 개 존재할 수 있다** — 예전에 다른 클론에서 작업하다
   22커밋 뒤처진 걸 못 알아채 "최신 작업이 안 보인다"는 혼선이 실제로 있었다.
3. 참고 스크린샷/문서를 파일명만 듣고 찾아야 하면 먼저 **`D:\PDS`**(및 하위 폴더)를 검색한다 —
   사용자에게 되묻기 전에.

---

## 1. 저장소 불변의 핵심 원칙 7가지 (요약 — 전문은 루트 `CLAUDE.md` 참고)

1. **루트는 AIMaster, 모든 서브프로젝트는 각자의 서브폴더 안에서만 자기완결적으로 개발·배포된다.**
   새 서브프로젝트도 예외 없이 `AIMaster/<프로그램명>/` 안에 만든다. 별도 git 저장소를 새로
   파지 않는다(`auto-detail-page`가 한때 밖에서 별도 저장소로 개발되다 다시 편입된 전례가 있음).
2. **모든 서브프로젝트의 이용 권한(회원가입 포함)은 AIMaster 하나로 통합 관리된다.** 회원가입/
   로그인/등급/구독·결제/프로그램별 이용 권한은 전부 AIMaster가 관리하는 **공유 Supabase DB
   하나**(project id: `esgxyikcnnvmlhygjkth`)에서 나온다. 각 서브프로젝트가 자기만의 회원가입
   화면·권한 체계를 새로 만들지 않고, 공용 `requireProgramAccess()`/`checkProgramAccessApi()`/
   `user_api_keys`로 이 통합 권한을 재사용한다.
3. **AI 이미지 생성 프롬프트에서 인물은 기본적으로 한국인(동아시아인)으로 묘사한다.** 해외 특정
   유명인/정치인/실제 국가 배경이 필수인 콘텐츠일 때만 예외.
4. **"엔진은 우리가 만들고, 그 엔진을 돌리는 연료(API 키·외부 계정)는 각 회원이 본인 것을
   연동해서 쓴다."** 운영자(buylifemall) 개인 API 키나 계정을 다른 회원이 대신 쓰는 구조는
   만들지 않는다. **OAuth 연동 기능은 OAuth 앱 자체도 회원 본인이 직접 만들어 등록하게 한다** —
   운영자가 만든 공용 앱을 여러 회원이 같이 쓰면, Meta처럼 "개발 모드" 앱은 운영자가 테스터로
   등록해준 사람 외엔 인증 자체가 거부된다(2026-09-16 `threads`/`threads-affiliate-poster`에서
   실제로 발견된 버그 — `threads-comment-reply`처럼 회원별 앱 등록 패턴이 기본값).
5. **모든 서브 자동화 프로그램은 버전을 관리한다(2026-09-29 주인님 지시).** 형식 `v1.01`(메이저.두 자리 마이너).
   프로그램을 수정해 배포할 때마다 마이너 +0.01(`v1.01 → v1.02`), 큰 변경·완성 단계는 **주인님 지시가 있을 때만**
   메이저를 올리고 01부터(`v2.01`). 값은 **코드 `lib/version.ts`(또는 `src/lib/version.ts`)의 `APP_VERSION`(사이드바 제목 밑 표시)
   + 공용 DB `programs.version`(메인 사이트 목록·상세·관리자 편집 화면)** 두 곳을 같은 작업에서 함께 바꾼다. 고친 프로그램만 올리고,
   커밋 메시지·그 프로그램 AGENTS.md에 버전을 적는다. 새 프로그램은 `v1.01`로 시작. 전문은 루트 `CLAUDE.md` 핵심 원칙 5번.
6. **사이트·프로그램 이용 권한 기본규칙(2026-09-30 주인님 확정, 2026-10-06 권한 보장 지침 강화).** **FREE 배지 프로그램은 AIMaster에 가입만 하면 등급과 무관하게
   누구나 사용**(주인님이 등급·사용기간을 넣어주지 않아도 됨). FREE 배지가 없는 프로그램은 **결제 구독**, 또는 **일반 등급 이상 + 주인님이 넣어준
   사용기간(`user_program_access`)**이 등록되어 있으면 프로그램으로 즉시 정상 접근한다(구독 요청 페이지로 튕기지 않음). 관리자 항상 허용, 정지 계정 항상 차단. 판정 코드에서 **FREE 확인은 등급·사용기간 확인보다
   먼저**. **서브프로그램의 `requireProgramAccess()`는 회원 세션 인증(`requireUser`) 후 권한 조사는 RLS 차단 방지를 위해 반드시 `createAdminClient()`를 사용한다.** 무료↔유료 전환은 관리자 프로그램 편집 화면의 FREE 배지로 한다. 전문은 루트 `CLAUDE.md` 핵심 원칙 6번.
7. **에러 해결 기록·점검 체크리스트(2026-10-01 주인님 지시, 모든 CLI 공통).** 작업 시작 전 `docs/ERROR_LESSONS.md`를 읽고,
   작업 중 에러를 해결했거나 원인이 비직관적인 문제·꼭 확인할 점검 사항을 찾으면 같은 커밋에 "증상 → 원인 → 해결(위치) → 다음부터 확인" 형식으로 추가한다.
   중복 에러를 줄이는 것이 목적. 저장소 밖(메모리·plan 파일)에만 남기면 인정하지 않는다. 전문은 루트 `CLAUDE.md` 핵심 원칙 7번.
8. **모든 웹 서브프로그램 작업 화면은 흰색 베이스다(2026-10-06 주인님 확정).** 메인 AIMaster 랜딩/카탈로그의 다크 테마와 설치형 원본 프로그램의 다크 화면을 웹 작업 화면에 그대로 가져오지 않는다. 본문·카드·입력 영역은 흰색 또는 아주 옅은 중성색, 경계는 중성 회색, 본문 글자는 어두운 색을 기본으로 한다. 색상은 브랜드 포인트와 상태·위험 표시에서만 제한적으로 쓴다. 새 UI·기존 UI 수정 전에는 해당 성격의 기존 웹 프로그램과 `docs/SIDEBAR_LAYOUT_STANDARD.md`를 확인해 번호형 작업 흐름, API키등록·플랫폼연동, 계정·로그아웃 위치와 여백·레이아웃을 함께 맞춘다.

---

## 2. 작업 자율성 규칙 (사용자가 명시적으로 확정한 워크플로우)

- **★ [단일 작업 세트 불변칙] 사용자의 개별 기능 구현 또는 단계별 작업이 완료되면, 질문 없이 다음 4단계를 무조건 하나의 연계된 '자동 작업 세트'로 완료하고 보고한다 (2026-09-23 주인님 지시사항):**
  1. **로컬 빌드 및 사전 검수**: 해당 프로젝트에서 `npm run build`로 타입 및 컴파일 100% 정상 검수
  2. **Git Commit**: 변경 내용을 명확한 커밋 메시지로 로컬 커밋
  3. **Git Push**: `git push origin master`로 원격 저장소 상시 동기화
  4. **Vercel 프로덕션 배포 & 결과 보고**: `vercel deploy --prod --yes`로 실제 서버에 즉시 반영 후 라이브 URL과 함께 결과 보고
  5. **인수인계 문서 반영 (2026-09-29 주인님 지시, 매 작업 필수)**: 다른 CLI가 이어서 작업할 수 있게 서브프로젝트
     `AGENTS.md`/`README.md`(진행 상태·남은 일)와 필요 시 이 문서 §5/§10, `docs/PLATFORM_PATTERNS.md`를 같은 커밋으로 갱신한다.
- **여러 CLI(Claude Code, Codex 등)가 같은 로컬 저장소를 동시에 쓴다** — 스테이징 영역도 공유되므로 `git add`는 커밋 직전에만
  하고 바로 커밋한다. 주인님이 "다른 CLI가 작업 중"이라고 지정한 서브프로젝트는 건드리지 않는다(2026-09-29 타로 파일 삭제가
  Codex의 seo-studio 커밋에 섞여 들어간 사례).
- 사소한 구현 방식 선택은 재질문하지 않고 합리적으로 판단해 진행한다. 기존 코드 구조/디자인/
  명명 규칙을 우선 따른다.
- 파일 생성, 코드 수정, 패키지 설치, 빌드/테스트/오류 수정까지 중간 확인 없이 연속 수행한다.
- **Codex 자율 실행 위임 (2026-10-03 주인님 확정)**: 사용자의 기능 요청은 필요한 조사·코드 수정·파일 생성·의존성 설치·로컬/브라우저 검수·오류 수정·문서화·커밋·푸시·프로덕션 배포까지의 일괄 실행 권한으로 해석한다. 세부 구현 방식, 파일 위치, 테스트 표본, 커밋 메시지, 배포 순서는 에이전트가 안정성·기존 패턴·비용을 기준으로 결정하며 중간 승인이나 진행 질문을 하지 않는다. 실패하면 스스로 로그·실제 화면·기존 성공 버전을 대조해 복구하고 재검수한다. 단, **파괴적 삭제/force-push, 비밀번호·API 키 변경, 환경변수·DB 스키마 변경, 유료 API 대량 호출, 회원 대신 최종 발행·결제·외부 공개**만 사전 승인을 받는다. 도구가 보안상 별도 승인을 요구하는 경우에는 필요한 한 번의 승인 요청만 한다.
- **여전히 확인이 필요한 특수 작업 (사전 승인 4가지)**: 파괴적인 데이터 삭제/force-push, 비밀번호·API 키 변경, 환경변수/DB 스키마 변경, 유료 API 대량 호출.
- **사용자가 여러 요청을 연달아 보내도 섞어서 한꺼번에 처리하지 않는다.** 각 요청을 하나의
  작업 단위로 구분해서 순서대로 처리하고 보고한다(빌드/커밋/배포 같은 기계적 사이클은 묶어서 진행하되, 기능 구현 단위는 흐려지지 않게 유지).
- 비슷한 기능을 다른 서브프로젝트에서 이미 구현했다면, **백엔드 로직만이 아니라 그 레이아웃과
  UI 동작까지 그대로 재사용한다** — 통일성 유지가 명시적 지시사항. 참고할 레퍼런스 컴포넌트:
  - 예약/스케줄 토글(간격+활성시간+알림채널 칩) → `trending-product-finder/components/watchlist/SourcingAlertControls.tsx`
  - 단순 모니터링 ON/OFF + 간격 + 활성시간 → `real_estate_sales/src/components/districts/MonitoringSettings.tsx`
  - 배열 필드 개별 추가/삭제(× 칩 + 입력창) → `trending-product-finder/components/watchlist/WatchlistRow.tsx`
  - 목록/테이블(수신자, 리드 등) → `stepmail/app/(dashboard)/leads/page.tsx` + `LeadsTable.tsx`/`LeadRow.tsx`
- 작업 완료 후에는 변경사항·테스트 결과·라이브 배포 URL만 간결하게 정리해서 보고한다.


---

## 3. 표준 개발 워크플로우

```bash
npm run dev       # 서브프로젝트 폴더 안에서: 로컬 개발 서버
npm run build     # 프로덕션 빌드 검증 (배포 전 항상 먼저 실행)
npm run lint      # ESLint
```

커밋 → 푸시 → 배포 순서(예시, tarot 기준):

```bash
git add <경로>
git commit -m "$(cat <<'EOF'
<타입>(<서브프로젝트>): <요약>

<본문 — 왜 바꿨는지, 무엇을 발견했는지>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push origin master
cd <서브프로젝트>
vercel deploy --prod --yes
```

**주의 — Vercel 배포 스코프**: 각 서브프로젝트는 자체 Vercel 프로젝트를 갖고 `vercel deploy
--prod --yes`만으로 보통 배포된다. 그런데 **루트 AIMaster 앱(프로젝트명 `aimaster`, 팀
`buylife`)은 스코프를 명시하지 않으면 `"Not authorized"` 에러가 난다** — 2026-09-19에 실제로
겪음. 루트 앱을 배포할 때는 반드시:

```bash
vercel deploy --prod --yes --scope buylife
```

배포 후 검증: 로그인이 필요 없는 페이지는 `curl -s -o /dev/null -w "HTTP %{http_code}\n" <URL>`로
200을 확인한다. 로그인 필요 페이지(`/admin/*`, `/draw`, `/dashboard` 등)는 curl로는 307
리다이렉트만 보이는 게 정상이며, 그 이상 검증하려면 실제 로그인 세션이 필요하다 — "로그인 필요
페이지라 curl로 완전히 검증 못 했다"고 솔직히 보고할 것.

---

## 4. Platform-hub 구조 & 새 서브프로젝트 체크리스트

- threads, blog 등은 독립 프로젝트가 아니라 AIMaster 저장소 안의 서브폴더다. 새 프로그램도
  `AIMaster/<프로그램명>/`에 만든다. 각자 자체 `package.json`/`node_modules`/`tsconfig.json`과
  자체 Vercel 프로젝트(별도 build & deploy)를 가진다. Supabase DB만 전체가 공유한다.
- 서브프로젝트 작업물(코드, DB 마이그레이션 SQL, 설계 배경)은 전부 그 서브프로젝트 폴더 안에
  둔다. MCP로 마이그레이션을 즉시 적용했더라도 SQL 파일을 `<프로그램명>/supabase/migrations/`에
  반드시 남긴다. Claude Code의 plan-mode 산출물은 저장소 밖에 있어 다른 클론/다른 도구에서는
  안 보이므로, 구현이 끝나면 핵심 결정을 그 프로젝트의 README로 옮겨 적는다.
- **새 프로그램 등록 체크리스트** (전부 필수):
  1. `programs` 테이블에 slug 등록 시 **반드시 `app_url`(`https://<프로그램slug>.vercel.app` 형태)을 세트로 함께 등록**한다. 메인 관리자 프로그램 관리(`/admin/programs`) 및 카탈로그에서 프로그램명 우측 외부 링크 버튼(`↗`)을 누르면 실제 서브프로그램 라이브 사이트가 새 창(`target="_blank"`)으로 즉시 열리도록 `<a>` 태그로 보장되어야 하며, `app_url` 누락이나 단순 장식용 `<span>` 태그로 회귀시켜서는 안 된다. + **`pricing_plans`에 기본 3단계 요금제도 같은 작업 단위로 함께 등록**(아래 참고 — 빠뜨리기 쉬움, 에러 없이 조용히 비어있다).
  2. 대시보드 레이아웃에 `requireProgramAccess()` 게이트.
  3. 모든 쓰기 API/Server Action에 entitlement 체크(`requireProgramAccess()` 또는
     `checkProgramAccessApi()` — API route/OAuth 콜백은 절대 `redirect()` 쓰지 말고 JSON 에러
     객체 반환).
  4. 사용자별 데이터 테이블에 `user_id` + RLS owner-only 정책.
  5. 외부 계정 연동은 사용자별로 저장, OAuth 앱 자체도 회원 본인이 등록(§1-4 참고).
  6. API 키는 공용 `user_api_keys` + `resolveApiKey()`(폴백 없음), 미등록 시 등록 안내 팝업. **저장/조회 API 라우트(`save-key` 등)는 반드시 `createAdminClient()`(Base64 Service Role Key 안전 폴백 포함)를 사용**하여, 서브도메인 쿠키 미전달 상태에서도 DB RLS 에러(`new row violates row-level security policy`)가 발생하지 않게 보장한다(`docs/PLATFORM_PATTERNS.md` §21 참고).
  7. 로그인/권한 체크가 들어간 모든 `layout.tsx`/`route.ts`에 **`export const dynamic =
     "force-dynamic"`과 `export const fetchCache = "force-no-store"` 두 줄을 반드시 같이**
     선언(하나만 빠져도 Vercel이 권한 체크 결과를 정적 캐싱해서 엉뚱한 사용자에게 과거 응답을
     서빙할 수 있다 — 로컬 빌드의 ○/ƒ 표시로는 못 잡는다, 배포 후 `X-Vercel-Cache` 헤더로
     확인).
  8. API키등록/외부계정 설정 화면은 메뉴명을 **"API키등록·플랫폼연동"**으로 통일하고, 화면
     맨 하단에 "📖 연동 매뉴얼" 박스(`platform_guides` 테이블 연결, 팝업으로 열기)를 추가한다.
  9. 서브프로그램 좌측 사이드바 상단에는 반드시 `← 다른 프로그램 보기` 링크를 배치하고, 대상 URL은 항상 전체 마케팅 자동화 프로그램 목록 페이지인 **`https://www.buylife.xyz/programs`**로 연결한다(`/dashboard`나 상대경로 연결 금지, `docs/SIDEBAR_LAYOUT_STANDARD.md` 및 `docs/PLATFORM_PATTERNS.md` §32 준수).
- **기본 요금제(pricing_plans) 3단계**(2026-09-07부터, `components/admin/ProgramForm.tsx`의
  `DEFAULT_PLANS`가 SSOT):

  | name | billing_type | price | original_price |
  |---|---|---|---|
  | 1개월 | monthly | 10000 | 10000 |
  | 2개월 | bimonthly | 20000 | 20000 |
  | 3개월 | quarterly | 30000 | 30000 |

  전부 `is_active: true`. `biannual`/`annual`/`lifetime`은 여전히 선택 가능한 billing_type이지만
  기본값에서는 빠졌다. 관리자 UI("새 프로그램 등록" 폼)를 거치지 않고 Supabase에 직접 insert로
  프로그램을 만들면 이 기본값이 자동으로 안 채워지므로 수동으로 넣어야 한다.

---

## 5. 멀티테넌시 원칙 (모든 서브 자동화 프로그램에 적용, 요약)

1. **로그인 ≠ 이용 권한.** 페이지/레이아웃뿐 아니라 실제 쓰기 작업을 하는 모든 API
   route/Server Action이 프로그램별 구독/개별부여/등급 권한까지 확인해야 한다.
2. 사용자별 데이터는 `user_id` + RLS owner-only로 완전히 격리한다. 서비스 롤 클라이언트를 쓸
   때도 코드에서 `user_id`로 직접 필터링한다.
3. API 키는 본인 키만 사용, 관리자 공용 키로 폴백 금지(2026-08-12부터). 없으면 조용히 실패하지
   말고 "API 키 등록이 필요합니다" 팝업으로 안내한다.
4. 외부 서비스 연동(OAuth)은 `user_id` unique 제약 + `state` 파라미터로 세션 사용자와
   일치 검증.
5. 루트 AIMaster 앱에서 "이 사용자가 이 프로그램을 쓸 수 있는가"를 판정할 때는 항상
   `lib/access/checkProgramAccess.ts`(`checkProgramAccess()` / `evaluateProgramAccess()`)를
   재사용한다 — 화면마다 판정 로직을 새로 짜면 안 된다(2026-09-03, 화면 3곳이 각자 로직을
   새로 짜서 등급 반영이 화면마다 다르게 나타난 사고가 실제로 있었음).

**감사 이력 하이라이트** (반복되기 쉬운 실수 — 새 코드 작성 시 의식적으로 체크):
- 2026-08-10 전수 감사: threads/shots/real_estate_sales의 Server Action + OAuth 콜백 다수가
  `requireUser()`(로그인만 확인)만 쓰고 있어서 로그인한 비구독자가 기능을 무료로 우회 가능했음
  → `requireProgramAccess()`/`checkProgramAccessApi()`로 일괄 수정.
- 2026-08-30 전수 감사: 31개 파일(레이아웃 16개 + route.ts 15개)에 `dynamic`/`fetchCache` 두
  줄이 빠져 있어 캐싱 버그 위험 → 일괄 수정.
- 2026-09-16: threads/threads-affiliate-poster가 공용 Meta 앱 하나를 환경변수로 공유하다가,
  다른 회원 계정으로는 "앱 ID를 인식할 수 없다" 에러로 연동 자체가 실패 → 회원별 앱 등록
  방식(threads-comment-reply 패턴)으로 전환.
- 2026-09-25: 관리자 프롬프트 추천 게시판(`admin/prompts`)의 프로그램 전환 시 카테고리 연동 & 자동 리셋 필터 적용. `ai-image-studio`에 make.com Nanobanana 극사실적 포토리얼리즘 프롬프트 엔진 적용 및 픽사 3D, 지브리 애니, 일본 2D 극장판 애니 스타일 신규 추가 및 화풍별 10종 샘플 데이터 반영. Vercel 커스텀 도메인 Alias 포인팅 연동 최신화 완료 (`docs/PLATFORM_PATTERNS.md` §22, §23 참고). `naver-blog-seo-studio` 크롬 확장 v1.0.36 태그 추출 고도화 반영.
- 2026-09-26: `threads-affiliate-poster` 트렌드 페이지(/trends) 개편 — **2026-09-28 정정: 당시 "5대 바이럴 탐지 기능"으로 기록된 조회수 배지·반응도 정렬·실시간 검색은 실제로 동작하지 않았다**(하드코딩 예시 글 + 지어낸 반응 수치 + AI가 만든 가짜 글, 관련 테이블도 운영 DB 미적용). 2026-09-28에 Meta 공식 `keyword_search` API 연동(앱 심사 전에는 본인 글만), "떡상글 직접 가져오기", 출처 배지로 재구현. 교훈: 회원에게 "실시간 분석"으로 보여주는 데이터를 지어내서 채우지 말 것 (`docs/PLATFORM_PATTERNS.md` §24 참고).

- 2026-09-28~29 (Claude Code 세션 종합 — 상세는 각 서브프로젝트 AGENTS.md):
  - **운영 DB에 미적용이던 마이그레이션 일괄 적용**: `tap_saved_posts`/`tap_personas`/`program_prompts`/`style_preset_prompts`/
    `user_image_generations`/`affiliate_clicks`/`threads_categories`. 프롬프트 테이블은 관리자만 쓰기, 이미지 이력 정리 함수는 외부 호출 차단.
  - **threads-affiliate-poster `/trends`**: 떡상 탐지기는 원래 가짜 데이터였음 → Meta 공식 `keyword_search`(앱 심사 전 본인 글만) +
    "떡상글 직접 가져오기" + 출처 배지로 재구현. AI 캡션 모델 몰래 치환 제거(종료 모델 호출 실패 수정). "내 페르소나 저장" 연결.
    Meta 앱 심사(`threads_keyword_search`)는 **비즈니스 인증 결과 대기로 중단** — 재개 순서는 `threads-affiliate-poster/docs/META_APP_REVIEW.md` §0.
  - **쓰레드 3개 프로그램 앱 자격증명 분리**: `meta_app_id`(인스타 전용 유지) ↔ `threads_app_id`/`threads_app_secret`(신설).
    Meta 제거·삭제 콜백은 쇼핑제휴 1곳에서 쓰레드 3개 프로그램을 함께 처리(`/api/threads/uninstall`, `/api/threads/delete`).
  - **threads(자동포스팅) 카테고리 버그**: 카테고리 JSON을 `user_api_keys`(openai/perplexity/meta_app_*) 칸에 덮어쓰던 코드 제거,
    데이터 복원. 관리자(gmail) 계정 OpenAI·Perplexity 키는 재등록 필요(주인님이 나중에 하기로 함).
  - **개인정보처리방침 제12조**(Meta 연동 정보) 추가 + 10/5 시행 공지, `https://www.buylife.xyz/data-deletion` 신설.
  - **카탈로그 썸네일 실사 원칙 전수 정리**: 30개 모두 실사. seo-studio(3D→실사), tarot(없음→관리자 Gemini로 생성) 교체,
    옛 타로 일러스트 삭제. 업로드 도구 `scripts/upload-program-thumbnail.mjs` 추가.
  - bkit 플러그인 자동 기록 파일 Git 추적 해제(.gitignore). 연동 매뉴얼(platform_guides) 쓰레드 2건 갱신.
  - **(09-29 후반) 쇼핑제휴 `/trends` 검색 확장**: 앱 검수 승인 회원은 키워드/해시태그·미디어·작성자 필터로 타인 공개 글 검색,
    미승인 회원은 직접 가져오기 — 화면 맨 위 A/B 안내 박스 + 회원용 "비즈니스 앱 승인 절차" 매뉴얼(`platform_guides` `ae85d991-...`).
  - **(09-29 후반) 좌측 사이드바 통일**: 21개 프로그램 메뉴 바로 밑에 로그인 계정·로그아웃을 붙여 항상 표시(§10 참고).
  - **(09-29) 공용 DB 보안 구멍 수정**: `user_program_access`의 RLS 정책 "Service role full access"가 역할 제한 없이
    `using (true) with check (true)`라 로그인만 하면(anon 키로도) 누구나 스스로 모든 프로그램 이용 권한을 넣을 수 있었다.
    정책 삭제 → 본인 행 조회만 허용, 쓰기는 service role만(마이그레이션 `0019`). 악용 흔적 없음(4,702건 전부 관리자 부여).
    **교훈: "service role용"이라는 이름의 정책을 만들지 말 것 — service role은 RLS를 원래 우회하므로 그런 정책은 필요 없고,
    `to` 역할을 빼면 모든 사용자에게 열린다.** 새 테이블 정책은 `to authenticated` + `auth.uid() = user_id`로 쓴다.
  - **(09-29) 이용 권한 베타테스트 정책 적용**: 무료 배지 프로그램은 가입만 하면 사용, 나머지는 결제 구독 또는
    "일반 이상 등급 + 관리자가 넣어준 사용기간"이 있어야 사용(등급만으로 열리던 예외 삭제). 루트 판정 함수 + 서브프로젝트 22곳
    `lib/access.ts` + `ai-image-studio` + `blog`(루트 공용 함수 호출로 교체)에 적용. 적용 전 계산: 유료 24개×회원 167명 중 열려 있던
    3,864개 조합 → 3,734개 유지, 사용기간 없는 130개만 닫힘. 규칙 전문은 루트 `CLAUDE.md` "이용 권한 판정 정책".
    `naver-blog-seo-studio`(Codex 작업 중)·`tarot`·`mbti-character`는 미적용.
  - 남은 일·대기 중인 일은 `docs/HANDOFF.md` §1에서 관리한다.

---

## 6. 등급/요금제 체계 (참고)

`member_grades`: 일반(basic) → 실버(silver) → 골드(드림팀, gold) → VIP(드림AI팀, vip) 순.
등급이 높을수록 그 아래 등급 프로그램도 자동 이용 가능(계층적 판정,
`evaluateProgramAccess()`). **2026-09-08부터 "등급별로 프로그램 이용 권한과 비용을 차등화"할
방향이 선언됐으나, 구체적인 배정표(어느 프로그램이 어느 등급부터 유료/무료인지)는 아직
미확정** — 이 지시가 들어오면 새 기능 개발이 아니라 `programs.required_grade_id`와
`pricing_plans` 데이터 입력 작업일 가능성이 높다는 점을 먼저 안내할 것.

---

## 7. 등록·운영 중인 프로그램 (`programs` 테이블, 2026-09-26 기준 30개 전부 `is_active: true`)

| 카테고리 | 프로그램명 | slug | 라이브 URL |
|---|---|---|---|
| 쓰레드 | Threads 포스팅 자동화 | auto-threads-posting | https://threads-nu-dusky.vercel.app |
| 쓰레드 | Threads 댓글자동화 | threads-comment-reply | https://threads-comment-reply.vercel.app |
| 쓰레드 | Threads 쇼핑제휴 자동화 | threads-affiliate-poster | https://threads-affiliate-poster.vercel.app |
| 인스타 | INSTA 포스팅 자동화 | auto-instagram-posting | https://insta-auto-poster-red.vercel.app |
| 인스타 | INSTA 댓글자동화 | instagram-comment-reply | https://instagram-comment-reply.vercel.app |
| 인스타 | INSTA DM답변 자동화 | instagram-dm-reply | https://instagram-dm-reply.vercel.app |
| 블로그 | BLOG(원문)생성 자동화 | ai-auto-blog | https://ai-auto-blog-one.vercel.app (2026-10-01부터 자체 Vercel 프로젝트 `ai-auto-blog`, 예전 www.buylife.xyz/blog/* 주소는 새 주소로 넘겨짐) |
| 음악 | 음악(SUNO)자동화 | music-automation | https://music-rho-virid-22.vercel.app |
| 쇼츠 | YOUTUBE Shots(이미지 스토리) 자동화 | auto-shorts-posting | https://shots-inky.vercel.app |
| 유튜브 | 유튜브 댓글자동화 | youtube-auto-reply | https://youtube-auto-reply.vercel.app |
| CRM | 구글폼 CRM 자동화 | crm-google-form | https://crm-google-form.vercel.app |
| CRM | 카카오톡 뉴스레터 자동화 | kakao-auto-posting | https://kakaoautoposter.vercel.app |
| 네이버 | 네이버 카페 포스팅 자동화 | naver-cafe-poster | https://naver-cafe-poster.vercel.app |
| 이커머스 | 상품소싱 자동화 | trending-product-finder | https://trending-product-finder.vercel.app |
| 이커머스 | 상세페이지 자동화(15p) | shop-detail-page | https://shop-detail-page.vercel.app |
| 이커머스 | 상세페이지 자동생성기 v1 | auto-detail-page | https://shop-page-seven.vercel.app |
| 이커머스 | 상세페이지 GIF 자동화 | video-to-gif | https://video-to-gif-buylife.vercel.app/dashboard (카탈로그 app_url이 랜딩이 아니라 대시보드로 직결) |
| 마케팅(홍보) | 웹 크롤링 자동화 | web-crawler-saas | https://web-crawler-saas.vercel.app |
| 마케팅(홍보) | 대량 메일발송 자동화(Step Mail) | stepmail | https://stepmail-kappa.vercel.app |
| 마케팅(홍보) | 경쟁사 키워드분석 자동화 | competitor-analysis | https://competitor-analysis-flax.vercel.app |
| 마케팅(홍보) | 롱테일 키워드분석 자동화 | longtail-keyword-expander | https://longtail-keyword-expander.vercel.app |
| 마케팅(홍보) | 예약(취소)방지 리마인드 자동화 | booking-reminder | https://booking-reminder.vercel.app |
| 부동산 | 부동산 실거래 투자분석 자동화 | real-estate-sales | https://real-estate-sales-delta.vercel.app |
| 유틸리티 | 성격코드(MBTI) 측정기 | personality-code | https://mbti-rho-two.vercel.app |
| 유틸리티 | 캐릭코드(MBTI) 측정기 | mbti-character | https://mbti-character.vercel.app |
| 유틸리티 | AI 타로 | tarot-reading | https://tarot-eight-jet.vercel.app |
| 이미지 | AI 이미지 스튜디오 | ai-image-studio | https://ai-image-studio.vercel.app |
| 네이버 | 네이버 블로그 자동화(App) | naver-blog-auto-poster | https://www.buylife.xyz/naver-blog-auto-poster (데스크톱 앱 다운로드 + 계정 연동 토큰 발급, 실제 자동화는 사용자 PC에서 실행됨) |
| 네이버 | 네이버 블로그 자동화(Web) | naver-blog-auto-poster-web | https://www.buylife.xyz/naver-blog-auto-poster-web (크롬 확장 다운로드 + 계정 연동 토큰 발급, 실제 자동화는 사용자 브라우저에서 실행됨) |
| 네이버 | 네이버 블로그 SEO 스튜디오 | naver-blog-seo-studio | https://www.buylife.xyz/naver-blog-seo-studio (+ 크롬 확장, `naver-blog-seo-studio/extension/`) |
| 쇼츠 | 쇼츠 떡상 분석·대본 자동화 | shorts-viral-studio | https://shorts-viral-studio.vercel.app (2026-10-04 신설 v1.01, 유료, 회원 본인 YouTube·AI 키 사용, 상세는 `shorts-viral-studio/AGENTS.md`) |

각 프로그램의 상세 아키텍처/기능/트러블슈팅 히스토리는 해당 폴더의 `README.md`를 참고할 것
(이 표는 "무엇이 있는지" 색인일 뿐, "어떻게 만들었는지"는 각 폴더 문서가 훨씬 자세하다).

카테고리 자체(추가/수정/삭제)는 `/admin/programs` 페이지 필터 바 우측의 **"카테고리 관리"**
버튼(골드색, `components/admin/CategoryManagerButton.tsx`) 팝업 모달에서 관리한다
(2026-09-19~20에 이 위치로 확정 — 처음엔 프로그램 등록 폼 안에만 있었고, 그다음 필터 바 인라인
패널이었다가, 최종적으로 필터 바 우측 끝 팝업 버튼으로 자리 잡음).

**`video-to-gif`는 이 표의 다른 프로그램들과 아키텍처가 다르다** — 서버(백엔드 워커)가
아예 없고, 영상→GIF 변환을 **브라우저 안에서 `@ffmpeg/ffmpeg`(ffmpeg.wasm)로 직접** 처리한다.
처음엔 다른 프로그램들처럼 "Vercel API → Render Docker 워커" 구조로 만들었다가, 운영 중
반복적으로 문제가 생겨(§10 참고) 2026-09-20에 서버를 통째로 없애고 브라우저 처리로
재구현했다. 이 프로그램을 만질 때는 반드시 `video-to-gif/README.md`/`AGENTS.md`부터 읽을 것
— 다른 프로그램의 "서버에서 무거운 작업 처리" 패턴을 그대로 베끼면 안 된다.

**`naver-blog-auto-poster`/`naver-blog-auto-poster-web`도 이 표의 다른 프로그램들과
아키텍처가 근본적으로 다르다** — 네이버가 블로그 포스팅 공식 API를 제공하지 않아서, 이
프로그램들의 "본체"는 서버가 아니라 **사용자 PC(데스크톱 앱, Electron+Playwright)나
사용자 브라우저(크롬 확장)에서 실행되는 자동화 도구**다. 루트 앱의 각 다운로드 페이지는
그 도구의 다운로드 + AI 생성 API + 계정 연동 토큰 발급/검증 역할만 한다.
2026-09-20~21에 데스크톱 앱과 크롬 확장 둘 다 완성·검증되고 공개 판매까지 전환됐다.
**원래 하나의 프로그램(`naver-blog-auto-poster`)에서 데스크톱 앱/크롬 확장 두 다운로드를
같이 제공했었지만, 2026-09-21에 사용자 명시적 결정으로 코드·문서뿐 아니라 `programs`
테이블 등록·요금제·이용권한까지 완전히 분리해서 지금은 서로 독립적으로 결제해야 하는
**별도의 두 유료 프로그램**이다** — 자동화 로직 자체가 서로 다르고(Playwright vs
`chrome.scripting`), 앞으로도 각자 다른 속도로 유지보수될 것이라는 이유였다. 분리 시점에
활성 구독/토큰이 0건이라 기존 회원 이관 이슈는 없었다(`supabase/migrations/0010_*.sql`).
**이 프로그램들을 만질 때는 반드시 `naver-blog-auto-poster_app/AGENTS.md`(데스크톱 앱
개발 방법론 — 특히 "추측하지 말고 실측한다" 원칙과 봇 탐지 회피 원칙)와
`naver-blog-auto-poster_web/AGENTS.md`(크롬 확장 개발 방법론, 특히
`chrome.scripting.executeScript`의 자기완결형 함수 제약)부터 읽을 것** — 다른
프로그램들의 OAuth+공식 API 패턴이 전혀 적용되지 않는 프로젝트다. 봇 탐지 회피 원칙
자체는 이 프로그램에만 국한되지 않고 "공식 API 없는 서비스를 브라우저로 자동화하는"
모든 서브프로젝트에 적용되는 플랫폼 전역
원칙으로 격상되어 있다(`docs/PLATFORM_PATTERNS.md` §20 참고).

---

## 8. 아직 미등록/기획 단계인 서브프로젝트

- **`coupang/`** — 쿠팡 셀러 운영 AI & Product Intelligence 코파일럿. `docs/`만 있고 아직
  실제 앱 코드는 없음(설계 단계).
- **`sourcing/`** — 제조 공장/소싱 데이터 AI 분석 코파일럿(견적서·스펙시트·위챗 대화 분석).
  마찬가지로 `docs/`만 있고 앱 코드는 아직 없음.
- **`blog_auto_poster/`** — "24h News SEO AI Auto Poster". 실제 TypeScript 코드(`src/`)는
  있지만 Next.js 웹앱이 아니라 독립 실행형 스크립트/배치 형태이고, `programs` 카탈로그에는
  등록돼 있지 않다. 회원용 SaaS로 전환할지, 내부 도구로 남길지는 미정 — 손대기 전에 사용자에게
  방향을 확인할 것.

---

## 9. 재사용 가능한 패턴 색인 — `docs/PLATFORM_PATTERNS.md`

새 프로그램을 만들거나 비슷한 기능이 필요하면 코드를 새로 짜기 전에 먼저 이 문서를 확인한다.
현재 20개 섹션(번호가 일부 비어 있는 건 과거 재구성 흔적이니 무시할 것):

1. 카테고리 블록 노출 패턴 (메인/목록 페이지)
2. AI 콘텐츠 3종 수집 패턴 (HTTP/RSS/Perplexity)
3. SNS 게시글 AI 생성 프롬프트 규격 (Threads 기준)
4. 이메일 발송(SMTP) 설정 — 네이버 메일 기준
5. 서버 액션 삭제 버튼 — 처리중 표시 패턴
7. Meta 그래프 API(Threads/Instagram) 이미지 게시 — 고정 대기 대신 상태 폴링
8. "국내 IP만 허용"하는 공공 API — Vercel 리전 고정으로 해결(n8n/프록시 불필요)
9. 텔레그램 알림 연동 — 사용자 각자의 봇(공용 봇 아님)
10. 인증/권한 체크 있는 `layout.tsx`/`route.ts`는 전부 `dynamic`+`fetchCache` 세트 필수
12. AI 이미지 생성 — Cloudinary 대행 생성 API 대신 Gemini(나노바나나) 직접 호출 +
    Supabase Storage 업로드(Cloudinary 대행 생성은 월 50회 한도라 금방 소진됨)
13. 프로그램 카탈로그 썸네일 — 반드시 "실사(포토리얼)" 스타일, 프롬프트 템플릿 고정
14. 공용 `user_api_keys`에 새 provider 추가 시 체크 제약도 같이 넓힐 것
15. 검증 루틴(모든 서브프로젝트 공통)
16. 비슷한 기능은 다른 서브프로젝트의 레이아웃까지 재사용(백엔드 로직만 베끼지 말 것)
17. 카카오톡 "공유하기"(`Kakao.Share.sendDefault`) — 실전에서 겪은 5가지 함정
18. "마이그레이션 파일이 저장소에 있다" ≠ "실제 운영 DB에 적용됐다" — 배포 후 반드시 검증
19. CPU 무거운 처리(영상/이미지/오디오 변환 등)는 전용 백엔드 워커 대신 브라우저에서
    `ffmpeg.wasm` 같은 WASM으로 직접 처리하는 것도 고려할 것 — 서버 인프라(배포·비밀값 동기화·
    CPU/타임아웃 제한) 문제가 통째로 사라진다. 단, 처리 속도가 사용자 기기 성능에 좌우되고
    결과물을 서버에 남기려면 별도 업로드 스텝이 필요하다. 참고 구현: `video-to-gif/components/ConverterWorkspace.tsx`.
20. **공식 API 없는 서비스를 브라우저 자동화(Playwright/크롬 확장 등)로 만들 때는 봇 탐지
    회피가 최우선 원칙이다** — 값을 `fill()`/`evaluate()`로 즉시 대입하지 않고 실제 클릭+
    사람처럼 한 글자씩 타이핑, 화면 구조는 추측 대신 실측(전용 구조 조사 도구), 발행처럼
    되돌릴 수 없는 액션은 항상 사람이 직접, 좋아요/이웃추가 같은 대량 액션 기능은 구현 전
    사용자와 리스크 상의. 새 자동화 서브프로젝트를 시작하기 전 반드시 이 섹션부터 확인할 것
    (2026-09-21 사용자 명시적 지시로 격상됨). 참고 구현:
    `naver-blog-auto-poster_app/src/lib/humanInput.js`,
    `naver-blog-auto-poster_app/AGENTS.md`, `naver-blog-auto-poster_web/AGENTS.md`.
28. **웹에서 만든 글을 크롬 확장으로 네이버 블로그 글쓰기 화면에 입력하기** — 연동 토큰·보낸 글 목록 API·입력 블록 변환·
    한 글자씩 입력(§20)·이미지 파일 업로드·발행 설정창까지(마지막 발행은 사람). 새 프로그램은 `ai-auto-blog/extension/` 구현을 복사해 이름만 바꾼다.
30. **유튜브 쇼츠 검색·분석 프로그램 패턴** — YouTube Data API 쿼터(검색 1회≈100유닛), 떡상 지표·등급(구독자 비공개는 판정불가), Gemini 영상 주소 직접 분석 vs 지표 기반 "추정" 표시, 30일 보관. 참고 구현: `shorts-viral-studio/`.

---

## 10. 이번 시즌(2026-09)에 실제로 겪은 트러블슈팅 교훈 모음

- **Vercel `vercel deploy --prod --yes`가 루트 앱에서만 `"Not authorized"`로 실패** → 원인은
  CLI 세션의 기본 스코프 문제, `--scope buylife`를 명시하면 해결(§3 참고). 서브프로젝트들은
  스코프 없이도 잘 됐다 — 왜 루트만 그런지는 명확히 규명 안 됨, 재발 시 이 플래그부터 시도.
- **`next/og`의 `ImageResponse`는 `Transfer-Encoding: chunked`라 `Content-Length`가 없다** —
  카카오톡 링크 미리보기 크롤러가 이걸 못 읽어서 공유 썸네일이 빈 화면으로 뜬 적 있음(tarot).
  동적 OG 이미지 대신 `Content-Length`가 있는 정적 Storage 이미지 URL을 `og:image`로 쓰는 게
  더 안전하다.
- **Kakao `Kakao.Share.sendDefault()`**: 여러 서브프로젝트가 공유하는 Kakao 앱은 "플랫폼 키 >
  JavaScript SDK 도메인"과 "제품 링크 관리 > 웹 도메인" **두 화면 모두**에 새 서브프로젝트
  도메인을 등록해야 한다. 하나만 등록하면 엉뚱한 서브프로젝트로 리다이렉트되는 증상이 난다.
  `decodeURI()`/`encodeURI()`를 커스텀 구분자(`,`, `:`)가 든 URL에 한 번 더 씌우면 이중
  인코딩으로 파라미터가 깨진다 — 공유 URL은 그대로 두고 재정규화하지 말 것.
- **"공유는 원본 데이터를 URL에 실어 보내는 게 아니라, 서버에 저장해둔 결과물의 ID로 보낸다"**
  는 설계가 안전하다(`/result?rid=<uuid>` 패턴). 카드 조합처럼 "내용"으로 매칭하면 다른
  사용자의 데이터를 잘못 복원해서 노출시키는 크로스 유저 버그가 날 수 있다(tarot에서 실제
  발생, 정확한 레코드 id로만 매칭하도록 수정).
- **마이그레이션 SQL 파일이 저장소에 있다고 실제 운영 DB에 적용됐다는 보장이 없다.** 새 테이블에
  의존하는 기능을 "완료"로 표시하기 전에 Supabase MCP의 `list_migrations` 또는
  `execute_sql`로 `information_schema.tables` 직접 조회해서 실존 여부를 확인할 것.
- **`createAdminClient()`(서비스 롤 클라이언트)는 `SUPABASE_SERVICE_ROLE_KEY`가 Vercel에
  없으면 조용히 anon key로 대체(fallback)된다** — 에러 없이 그냥 RLS를 못 우회하는 클라이언트가
  된다. 이 함수를 쓰는 기능을 디버깅할 때는 `vercel env ls production`으로 이 변수가 실제로
  있는지부터 확인.
- **관리자 화면에 새 UI를 추가할 위치는 사용자가 스크린샷으로 정확히 짚어주는 경우가 많다** —
  "카테고리 관리 버튼"처럼 위치를 말로만 설명하면 오해가 생기기 쉬우니(실제로 헤더 → 필터
  인라인 패널 → 필터 바 우측 팝업 버튼까지 세 번 옮긴 사례가 있었다), 스크린샷이 있으면 반드시
  `D:\PDS`에서 찾아 열어보고 정확한 위치/스타일을 확인한 뒤 구현할 것.
- **버튼 텍스트를 줄바꿈시켜 달라는 요청은 "완전히 제거"와 "강제 줄바꿈으로 2줄 고정"을
  헷갈리기 쉽다** — 사용자가 예시 문구를 줄 단위로 직접 보여줄 때까지는 최종 포맷을 단정하지
  말고, 예시가 오면 괄호/순서/공백까지 글자 그대로 맞춘다.

### video-to-gif 개발/디버깅 과정에서 나온 교훈 (2026-09-20, 분량이 많아 따로 묶음)

- **Vercel Authentication(Deployment Protection)이 새 프로젝트에서 기본으로 켜져 있을 수
  있다.** `ssoProtection.deploymentType: "all_except_custom_domains"`가 기본값이면, 커스텀
  도메인이 아닌 `*.vercel.app` 주소로 들어오는 모든 일반 사용자가 Vercel 팀 로그인 화면으로
  튕긴다. **새 서브프로젝트를 처음 배포한 뒤 로그인 없이 curl로 200이 나오는지 반드시 확인할
  것** — Vercel API로 이 설정을 끄는 것 자체가 "보안 약화"로 분류돼 에이전트가 직접 못 끄니
  (아래 항목 참고), 사용자에게 Project Settings → Deployment Protection → Vercel
  Authentication을 Off로 바꿔달라고 안내해야 한다.
- **서로 다른 Vercel 도메인을 쓰는 서브프로젝트는 반드시 자기 자신의 `/login` 페이지가
  있어야 한다.** Supabase 세션 쿠키는 도메인별로 완전히 분리되어 있어서, "로그인 안 됐으면
  메인 사이트(`buylife.xyz`)의 `/login`으로 보낸다"는 방식은 로그인에 성공해도 그 세션이
  원래 서브프로젝트 도메인으로 절대 돌아오지 않는다(로그인 루프처럼 보이거나 엉뚱한 곳에
  남게 됨). tarot/threads는 처음부터 자체 `(auth)/login`이 있어서 문제가 없었는데,
  video-to-gif는 이 패턴을 빼먹었다가 발견돼 뒤늦게 추가했다 — **새 서브프로젝트 스캐폴딩
  체크리스트에 "자체 로그인 페이지 존재 여부"를 반드시 넣을 것.**
- **Supabase Storage의 객체 경로(key)에 파일명을 그대로 쓰면 안 된다.** 대괄호 `[ ]`, 쉼표
  `,` 같은 문자가 든 원본 파일명을 저장 경로에 그대로 붙이면 `"Invalid key"` 오류로 업로드
  자체가 거부된다(실계정 파일명 `[Shots]지쳐도, 우리는 다시 걷는다.mp4`로 재현). **저장
  경로는 항상 UUID + 확장자만 쓰고, 사람이 읽는 원래 파일명은 DB 컬럼 등 별도 필드로
  전달·보관할 것.**
- **Render Blueprint는 연결된 저장소 전체의 git push를 감지해서 자동 재배포한다** — 그
  서브프로젝트와 무관한 다른 파일을 고쳐서 커밋해도 워커가 재시작된다. 디버깅하며 짧은
  시간에 여러 번 커밋하면 그때마다 워커가 재시작되어, 하필 그 순간 처리 중이던 작업이
  전부 유실될 수 있다(실제로 반복 발생). **이 저장소처럼 하나의 repo에 여러 서브프로젝트가
  같이 있고 커밋이 잦은 구조에서는, Render Blueprint 기반 워커보다 위 19번 패턴(브라우저
  WASM 처리)이나 최소한 "특정 경로 변경 시에만 배포"가 되는 다른 방식을 먼저 고려할 것.**
- **Render 무료 플랜은 0.1 vCPU로 매우 느리다** — 45MB 영상 하나의 풀해상도 FFmpeg 1차
  패스만으로도 수십 분이 걸릴 수 있다. 가벼운 테스트조차 무료 플랜에서는 신뢰하기 어렵다.
- **Vercel Functions 기본 실행시간 한도는 300초다.** SSE처럼 오래 열어두는 스트리밍
  라우트가 이보다 긴 루프(예: 10분)를 돌면 "Runtime Timeout Error"로 강제 종료된다. `export
  const maxDuration`을 명시하고 내부 루프도 그보다 짧게 잡을 것. **또한 클라이언트의
  `EventSource.onerror`에서 무조건 `close()`를 부르면 안 된다** — 브라우저의 기본 자동
  재연결을 막아버려서, 스트림이 한 번이라도 끊기면 그 이후 진행 상황을 영영 못 받는다(정상
  종료는 `onmessage`에서 done/error 볼 때만 `close()`).
- **Claude in Chrome 브라우저 자동화가 항상 사용자 화면에 보이는 건 아니다.** 이 세션에서
  Render 대시보드 값을 브라우저로 대신 입력해주려다, 그 브라우저가 사용자에게는 전혀 안
  보이는 별도 원격 환경이라는 게 뒤늦게 드러났다(사용자: "너만 보는 페이지 인가봐"). **비밀값
  입력처럼 사용자 확인이 필요한 대시보드 작업은, 브라우저 자동화로 대신 하겠다고 나서기 전에
  그 브라우저가 실제로 사용자와 공유되는 세션인지 먼저 확인하거나, 처음부터 "정확한 위치 +
  붙여넣을 값"을 안내하는 방식을 기본으로 쓸 것.**
- **에이전트 자체의 안전장치가 일부 작업을 자동으로 막는다** — (1) Render/Vercel처럼 "비밀값
  입력창"으로 인식되는 필드에 브라우저 자동화로 타이핑하는 것("Secret-Store Writes"),
  (2) Vercel Authentication을 끄는 것처럼 보안을 약화시키는 API 호출("Security Weaken")은
  차단된다. 이런 경우 우회를 시도하지 말고, 정확한 값과 화면 위치를 안내해서 **사용자가 직접
  누르게** 할 것.
- **Supabase 조직(BUYLIFE)이 2026-09-20 기준 Free 플랜이다** — Storage 1GB/Egress 5GB 한도인데
  전체 버킷 합계가 이미 약 1.6GB로 한도를 넘어선 상태였다(음악·타로 카드이미지·상세페이지
  이미지 등 여러 프로그램이 이 하나의 공유 프로젝트를 같이 씀). **저장공간을 많이 쓰는 기능을
  새로 추가하기 전에는 Supabase 대시보드 Settings → Usage로 현재 사용량을 먼저 확인할 것** —
  이미 한도 근처/초과 상태일 수 있다. Pro 플랜은 $25/월에 100GB/250GB로 크게 늘어난다.
- **Vercel MCP 커넥터(`mcp__claude_ai_Vercel__*`)는 이 팀의 프로젝트를 전부 못 본다** —
  `list_projects`가 26개 넘는 프로젝트 중 3개만 반환했다. 특정 프로젝트의 런타임 로그/에러를
  볼 때 이 MCP가 "project not found"를 반환하면, MCP 자체의 접근 범위 문제일 수 있으니 바로
  포기하지 말고 `vercel logs <domain> --scope buylife --json` (CLI)로 전환해서 확인할 것 —
  이번에 실제로 이 방법으로 근본 원인(Vercel 300초 타임아웃, Render 401)을 찾아냈다.

### 2026-09-21 추가 (naver-blog-auto-poster 개발 중 발견, 플랫폼 전체에 해당)

- **서버 간 API를 호출할 때 도메인에 `www`가 빠지면 인증 헤더가 사라질 수 있다.** `buylife.xyz`
  (www 없음)로 요청하면 서버가 `https://www.buylife.xyz`로 307 리다이렉트하는데, Node의
  `fetch`가 그 리다이렉트를 따라가면서 "다른 하위 도메인으로 이동"으로 판단해
  `Authorization` 헤더를 자동으로 제거해버린다 — 그 결과 서버는 헤더가 아예 없는 것으로 보고
  401을 반환한다. **이 플랫폼 어디서든 서버 간 API를 호출하는 코드를 짤 때는 항상
  `www.buylife.xyz`처럼 최종 도메인을 정확히 쓸 것** (리다이렉트 자체가 안 나면 이 문제도
  생기지 않는다).
- **Electron 등 독립 실행형 데스크톱 앱 서브프로젝트를 추가하면 루트 `.vercelignore`에도
  등록할 것.** 루트 AIMaster 앱을 `vercel deploy`할 때 Vercel CLI가 `.gitignore`를 존중하지
  않고 로컬 작업 폴더 전체를 스캔한다 — 데스크톱 앱의 `runtime/`처럼 실행 중인 프로세스가
  파일을 잠그고 있으면(예: 열려 있는 Playwright 브라우저 프로필) `EBUSY`로 루트 앱 배포
  자체가 실패한다. 그 서브프로젝트가 루트 앱에서 import되지 않는 게 확실하면, 최소한
  `runtime/`·`node_modules/`는 `.vercelignore`에 추가한다.
- **GitHub CLI(`gh`)가 이 환경에 새로 설치됐다** — `winget install --id GitHub.cli`로 설치,
  PowerShell에서 공백 있는 경로는 `& "C:\Program Files\GitHub CLI\gh.exe" ...`처럼 호출
  연산자(`&`)가 필요하다. 최초 인증(`gh auth login`)은 브라우저 로그인이 필요해 사용자가
  직접 해야 한다. GitHub Releases에 실행 파일/zip을 배포할 때 `gh release create`/
  `gh release upload --clobber`로 이 저장소(`BUYLIFEMALL/aimaster`, public)에 에셋을 올릴
  수 있다 — Supabase Storage 대신 이 방법을 쓴 이유는 무료·용량 걱정 없음(private 저장소가
  아니라 그냥 public repo의 릴리스 기능).

### 2026-09-30 추가 (외부 사이트 연동은 로컬 테스트만 믿지 말 것)

- **이 컴퓨터(한국 가정/사무실 회선)에서 되는 외부 사이트 요청이 Vercel 서버에서는 막힐 수 있다.** 쿠팡 위젯 주소(`coupa.ng`)가
  로컬에서는 정상인데 Vercel(미국·서울 지역 모두)에서는 403이었다 — 클라우드 IP를 막는 사이트가 있다. 쇼핑제휴 v1.09를 로컬 테스트만 보고
  배포했다가 회원 화면에서 실패했다. **외부 사이트를 서버에서 불러오는 기능은 운영 배포 전에 `vercel deploy`(미리보기)에 임시 진단 경로를
  올려 `vercel curl "/경로?x=1" --deployment "https://<미리보기 주소>"`로 실제 서버에서 확인하고, 진단 경로는 지운 뒤 운영 배포한다.**
  (`vercel curl`은 경로에 `?`가 없으면 "Malformed input" 오류가 나서 쿼리를 하나 붙였다.)
- **`sharp`는 Vercel 함수에서 실패할 수 있다**(Next 16 + turbopack 빌드에서 libvips 누락, `ERR_DLOPEN_FAILED`). 작은 이미지 자르기 정도는
  순수 JS(`jpeg-js`)로 처리한다. 네이티브 모듈을 새로 넣으면 역시 미리보기 배포에서 먼저 확인할 것.
- 상세: `threads-affiliate-poster/README.md` "쿠팡 링크 직접 등록 검사".

### 2026-10-01 추가 (BLOG 독립 배포 분리 — 새 Vercel 프로젝트를 만들 때)

- BLOG(`ai-auto-blog/`, ai-auto-blog)는 초창기에 루트 앱에 내장(`app/(embedded)/blog` + `app/api/*` 재수출)돼 www.buylife.xyz/blog로 서빙됐다.
  주인님 지시로 다른 프로그램처럼 자체 Vercel 프로젝트로 분리했다. 루트에는 `next.config.mjs`의 `/blog/:path*` → 새 주소 넘김만 남겼다.
- **루트에 내장돼 있던 서브프로젝트는 루트 빌드가 타입 오류를 무시(`ignoreBuildErrors`)해서 숨은 타입 오류가 있을 수 있다** — 단독 빌드 때 1건 발견·수정.
  또 루트 화면이 대신 해주던 권한 확인이 빠질 수 있으니, 분리할 때 회원 전용 화면마다 서버 쪽 `requireProgramAccess()` 레이아웃을 넣어야 한다.
- **`vercel project add`로 빈 프로젝트를 만든 뒤 배포하면 프레임워크가 비어 있어 모든 페이지가 404가 된다.** 서브프로젝트에
  `vercel.json`(`{"framework": "nextjs"}`)을 두고 배포할 것. 새 프로젝트의 첫 배포는 바로 운영으로 올라간다.
  `<이름>.vercel.app`이 이미 다른 사람 것이면 `<이름>-one.vercel.app`처럼 다른 별칭이 붙으니 배포 결과의 "Aliased" 주소를 확인할 것.
- Git Bash에서 `curl "$B/경로"`처럼 `/`로 시작하는 인자는 Windows 경로로 바뀐다 — `MSYS_NO_PATHCONV=1`을 먼저 설정할 것.
  또 문서에 넣을 긴 글을 `node -e "..."` 안에 백틱과 함께 넣으면 bash가 백틱을 명령으로 실행해 버린다 — 스크립트 파일로 따로 써서 실행할 것.
- **서브프로젝트를 단독 배포로 옮길 때 환경변수는 그 서브프로젝트의 `.env.local`이 아니라 루트 `.env.local`(공용 DB) 값을 기준으로 넣는다.**
  BLOG의 `.env.local`에는 없어진 옛 Supabase 프로젝트 주소가 남아 있어서, 그대로 옮겼다가 로그인이 "fetch failed"로 전부 실패했다.
  넣은 뒤에는 주소에 공용 프로젝트 ID(`esgxyikcnnvmlhygjkth`)가 들어 있는지 꼭 확인할 것.
- **여러 프로그램이 함께 쓰는 Storage 버킷(`post-images` 등)에서 자동 삭제 작업을 만들 때는 반드시 그 프로그램 폴더만 지운다.**
  BLOG의 30일 정리 작업(`ai-auto-blog/app/api/cron/cleanup-images`)은 `<회원 id>/ai-auto-blog/` 안만 본다 — threads·insta·naver-cafe 파일이 같은 버킷에 있다.
- **크롬 확장 입력 속도는 §20(70~170ms) 기준이다.** 2026-10-01 BLOG 확장을 만들며 SEO 스튜디오 확장(`naver-blog-seo-studio/extension/sidepanel.js`
  `typeWithDebugger`)이 24~52ms로 기준보다 빠른 것을 발견했다(Codex 담당 폴더라 손대지 않음 — 담당 CLI가 맞출 것). 상세 패턴: `docs/PLATFORM_PATTERNS.md` §28.
- **서브폴더 이름은 프로그램 slug·Vercel 프로젝트 이름과 맞춘다.** BLOG는 2026-10-01에 `blog/` → `ai-auto-blog/`로 옮겼다(git mv).
  폴더를 옮길 때는 `.vercel/`·`node_modules`·`.env.local`(git이 추적하지 않는 파일)도 같이 옮겨졌는지, 루트 `tsconfig.json` 제외 목록·`.vercelignore`를 바꿨는지 확인한다.
- 상세: `ai-auto-blog/AGENTS.md` "독립 배포 분리".

### 2026-09-29 추가 (좌측 사이드바 계정 표시 통일)

- **모든 서브프로젝트의 `Sidebar.tsx`는 "로그인 계정 + 로그아웃"을 메뉴 바로 밑에 붙여서,
  긴 페이지에서도 항상 보이게 하는 구조를 쓴다.** 예전엔 사이드바가 `md:h-full`/`md:min-h-screen`이라
  긴 페이지(예: TAP `/trends`)에서 사이드바가 본문 길이만큼 늘어나 계정 영역이 화면 밖으로 밀려 안 보였다.
  기준 구현은 `threads-affiliate-poster/src/components/layout/Sidebar.tsx`:
  `<aside>`에 `md:sticky md:top-0 md:h-screen md:shrink-0`(화면에 고정), 메뉴 영역
  `<div className="md:min-h-0 md:overflow-y-auto">`(메뉴가 길 때만 메뉴 안에서 스크롤), 계정 영역
  `<div className="mt-4 shrink-0 border-t ... pt-4">`. 2026-09-29 이 구조를 21개 서브프로젝트
  (naver-blog-seo-studio 제외 — Codex 작업 중)에 일괄 적용했다. **새 서브프로젝트의 사이드바도
  이 구조를 그대로 복사할 것.**
  - ⚠️ 처음엔 `md:justify-between` + 메뉴 `md:flex-1`로 계정을 화면 맨 아래에 붙였는데, 주인님이
    "메뉴와 거리가 너무 멀다"며 **메뉴 바로 밑에 붙이라고 지시**해 같은 날 바꿨다. 계정 영역을
    화면 맨 아래로 다시 내리지 말 것.
- `ai-image-studio`는 계정 블록이 메뉴 영역 안에 붙어 있었고, 이메일이 없으면
  `buylifemall@naver.com`이 대신 표시되는 하드코딩 기본값이 있어 함께 제거했다.
- `longtail-keyword-expander`는 로컬 `node_modules`의 `@supabase/supabase-js`가 2.95.3으로
  `package.json`(^2.110.8)보다 오래돼 `seed.engine` 타입 에러로 로컬 빌드가 실패했었다 —
  `npm install`로 해결(코드 문제 아님). 로컬 빌드만 타입 에러가 나면 먼저 설치 버전부터 확인할 것.

---

## 11. 참고 인프라 정보

- **Supabase 프로젝트 ID**: `esgxyikcnnvmlhygjkth` (모든 서브프로젝트가 공유). 예전 개발 전용
  프로젝트 `AIMaster_dev`(`rjjtjakljjxsgjelqgek`)는 더 이상 쓰지 않는다(일시정지 상태) — 모든
  개발·유지보수는 이 운영 DB에서 직접 한다(`docs/DEV_TO_PROD_WORKFLOW.md`는 폐기 문서).
- **Vercel 팀/스코프**: `buylife` (팀 id `team_orq6xPe9P3c1uMQdKlJsQ6k9`). 루트 앱 배포 시
  `--scope buylife` 필수(§3).
- **참고 자료 기본 폴더**: `D:\PDS` — 사용자가 스크린샷/블루프린트/템플릿을 모아두는 곳. 파일명만
  듣고 못 찾겠으면 먼저 여기부터 검색.
- **git 원격**: `https://github.com/BUYLIFEMALL/aimaster.git`, 기본 브랜치 `master`.
- **네이버/카카오 신규 자동화 기획**(별도 프로젝트, 진행 중, 상세는 세션 메모리 참고): NAVER
  쇼핑/책/전문자료 검색 API는 2026-07-31 완전 종료(대체 API 없음), 일반 검색/데이터랩은
  네이버 개발자센터에서 **NAVER API HUB(NCP 콘솔)**로 이관됨. 이 계열 API를 쓰는 제안을 할 때는
  반드시 NCP 콘솔 기준 최신 상태를 먼저 확인할 것 — 오래된 가이드는 이관 이전 기준일 수 있다.
  이 신규 프로젝트도 BYOK(회원 본인 네이버/카카오 계정 연동) 원칙을 그대로 따른다.

---

## 12. 다른 AI 코딩 도구가 이어받을 때 참고

- 이 저장소는 Windows 환경(`D:\Antigravity\AIMaster`)에서 작업돼 왔다. 셸 문법(PowerShell vs
  POSIX bash) 차이에 주의하고, 경로 구분자는 필요에 따라 변환할 것.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` 트레일러가
  붙어 있는 이력이 많다 — 다른 도구를 쓰는 경우 자기 도구에 맞는 attribution으로 바꿔도 되지만,
  기존 커밋 이력을 리라이트하지는 말 것.
- 이 문서(AGENTS.md)와 각 서브프로젝트 문서는 "작업이 끝나면 바로 갱신"하는 게 이 저장소의
  일관된 관행이다 — 새 트러블슈팅을 발견하거나 규칙이 바뀌면, 코드만 고치고 끝내지 말고 관련
  섹션(§9 PLATFORM_PATTERNS.md, §10 이 문서, 또는 해당 서브프로젝트 README)에도 반영할 것.
## 작업 자료 기본 경로

- 스크린샷, 참고 이미지, PDF 등 사용자가 제공한 자료는 항상 `D:\PDS`를 먼저 검색한다.
- 사용자가 별도 경로를 지정하지 않은 경우, 자료 탐색·검수·분석의 기본 폴더는 `D:\PDS`로 한다.
