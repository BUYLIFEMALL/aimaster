# AIMaster — AI 에이전트 인수인계 문서 (AGENTS.md)

이 문서는 **Claude Code뿐 아니라 Codex, Gemini(구글) 등 어떤 AI 코딩 에이전트가 이 저장소에
새로 투입되더라도**, 지금까지 쌓인 작업 방식·규칙·주의사항·완성된 프로그램 현황을 바로 파악하고
이어서 작업할 수 있도록 정리한 인수인계 문서다. 2026-09-26 기준 최신 상태를 반영했다.

- 루트에는 이 문서와 별도로 `CLAUDE.md`(Claude Code 전용, 이 문서와 상당 부분 겹침)가 있다.
  Claude Code는 `CLAUDE.md`를 자동으로 읽으므로 그쪽이 1차 소스지만, **다른 도구는 CLAUDE.md를
  자동으로 읽지 않으므로 이 AGENTS.md가 사실상 유일한 진입점**이다. 두 문서 중 하나만 고쳐서
  내용이 어긋나면, 여기(AGENTS.md)와 루트 CLAUDE.md 양쪽을 함께 확인해서 최신 쪽을 신뢰할 것.
- 각 서브프로젝트 폴더(`tarot/`, `threads/`, `blog/` 등) 안에도 그 프로젝트 전용 `README.md`/
  `AGENTS.md`가 따로 있다. 이 루트 문서는 "플랫폼 전체 공통 규칙 + 프로그램 목록"이고, 특정
  프로그램을 실제로 고치기 전에는 반드시 그 서브프로젝트 폴더의 문서까지 읽을 것.
- 사용자를 한국어로 부를 때는 **"주인님"**을 쓴다(사장님 등 다른 호칭 금지 — 사용자가 명시적으로
  교정한 사항). 답변은 정중한 존댓말(-습니다체), 기술 용어 외에는 쉬운 한글로 쓴다.

---

## 0. 가장 먼저 확인할 것

1. 지금 어떤 서브프로젝트를 고치려는지 먼저 정하고, `<프로그램명>/README.md`와
   `<프로그램명>/AGENTS.md`(또는 `CLAUDE.md`)를 읽는다 — 코드를 만들기 전에 반드시.
2. `git status`, `git log --oneline -10`으로 로컬이 원격(`origin/master`)과 동기화됐는지 먼저
   확인한다. **이 저장소는 로컬 클론이 여러 개 존재할 수 있다** — 예전에 다른 클론에서 작업하다
   22커밋 뒤처진 걸 못 알아채 "최신 작업이 안 보인다"는 혼선이 실제로 있었다.
3. 참고 스크린샷/문서를 파일명만 듣고 찾아야 하면 먼저 **`D:\PDS`**(및 하위 폴더)를 검색한다 —
   사용자에게 되묻기 전에.

---

## 1. 저장소 불변의 핵심 원칙 4가지 (요약 — 전문은 루트 `CLAUDE.md` 참고)

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

---

## 2. 작업 자율성 규칙 (사용자가 명시적으로 확정한 워크플로우)

- **★ [단일 작업 세트 불변칙] 사용자의 개별 기능 구현 또는 단계별 작업이 완료되면, 질문 없이 다음 4단계를 무조건 하나의 연계된 '자동 작업 세트'로 완료하고 보고한다 (2026-09-23 주인님 지시사항):**
  1. **로컬 빌드 및 사전 검수**: 해당 프로젝트에서 `npm run build`로 타입 및 컴파일 100% 정상 검수
  2. **Git Commit**: 변경 내용을 명확한 커밋 메시지로 로컬 커밋
  3. **Git Push**: `git push origin master`로 원격 저장소 상시 동기화
  4. **Vercel 프로덕션 배포 & 결과 보고**: `vercel deploy --prod --yes`로 실제 서버에 즉시 반영 후 라이브 URL과 함께 결과 보고
- 사소한 구현 방식 선택은 재질문하지 않고 합리적으로 판단해 진행한다. 기존 코드 구조/디자인/
  명명 규칙을 우선 따른다.
- 파일 생성, 코드 수정, 패키지 설치, 빌드/테스트/오류 수정까지 중간 확인 없이 연속 수행한다.
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
  1. `programs` 테이블에 slug 등록 + **`pricing_plans`에 기본 3단계 요금제도 같은 작업
     단위로 함께 등록**(아래 참고 — 빠뜨리기 쉬움, 에러 없이 조용히 비어있다).
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
| 블로그 | BLOG(원문)생성 자동화 | ai-auto-blog | https://www.buylife.xyz/blog (루트 앱에 직접 임베드) |
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

---

## 11. 참고 인프라 정보

- **Supabase 프로젝트 ID**: `esgxyikcnnvmlhygjkth` (모든 서브프로젝트가 공유).
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
