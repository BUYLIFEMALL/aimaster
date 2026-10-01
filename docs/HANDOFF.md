# 작업 인수인계 현황판 (HANDOFF.md)

> **다른 CLI(Codex, Gemini, 다른 Claude 세션)가 이어서 작업할 때 가장 먼저 읽는 "지금 상태" 요약본이다.**
> 규칙·원칙은 루트 `AGENTS.md`/`CLAUDE.md`, 프로그램별 상세는 각 `<프로그램>/AGENTS.md`·`README.md`에 있다.
> 이 문서는 "최근에 무엇을 했고, 무엇이 멈춰 있고, 다음에 무엇을 하면 되는지"만 모은다.
> 작업을 끝낼 때마다 아래 1·2·3번 표를 갱신하고 같은 커밋에 포함할 것.

- 최종 갱신: 2026-09-29 (Claude Code 세션)
- 기준 커밋: `eb0b072` (master, origin과 동기화됨)

---

## 1. 지금 멈춰 있거나 남은 일

| # | 할 일 | 상태 / 막힌 이유 | 담당 | 자세한 위치 |
|---|---|---|---|---|
| 1 | Meta 앱 심사 (`threads_keyword_search` 고급 액세스) | ⏸ **비즈니스 인증 재제출 후 결과 대기**. 결과가 나오면 → 액세스 인증 → 데이터 처리 질문 → 앱 검수 제출 순서로 재개. 제출에는 심사관 테스트 계정과 시연 영상이 필요 | 주인님(Meta 화면) + 개발 | `threads-affiliate-poster/docs/META_APP_REVIEW.md` §0 |
| 3 | 회원 계정으로 실제 동작 확인 | 쇼핑제휴 `/trends`(직접 가져오기·검색 필터·AI 모델별 캡션·내 페르소나), 댓글자동화 `threads_read_replies` 재연동 후 댓글 테스트, 20개 프로그램 사이드바 하단 계정 표시 | 주인님(테스트) | 각 서브프로젝트 `AGENTS.md` |
| 4 | 티스토리 블로그 자동화 | 기획만 됨. 네이버 블로그 자동화가 완전히 끝난 뒤 시작, `naver-blog-auto-poster_*`의 AGENTS.md 방법론 재사용 | 미정 | `docs/PLATFORM_PATTERNS.md` §20 |

**주의**: `naver-blog-seo-studio/`는 주로 Codex가 작업하는 폴더다. 2026-09-30 주인님 지시로 Claude가 권한 규칙만 적용했다(v1.03).
손대기 전에 `git status --porcelain -- naver-blog-seo-studio`로 Codex의 커밋 안 된 변경이 없는지 먼저 확인하고, 있으면 건드리지 않는다.

---

## 2. 최근 완료한 작업 (2026-09-28 ~ 09-29)

| 영역 | 무엇을 했나 | 왜 | 커밋/기록 |
|---|---|---|---|
| 쇼핑제휴 `/trends` 떡상 탐지기 | 가짜 샘플 데이터(지어낸 조회수·반응도)를 걷어내고 Meta 공식 `keyword_search` + "떡상글 직접 가져오기" + 출처 배지로 재구현 | 실제로는 동작하지 않는 기능이 "실시간 분석"처럼 보이고 있었음 | `docs/PLATFORM_PATTERNS.md` §24 |
| 쇼핑제휴 검색 확장 | 앱 검수 승인 회원: 키워드/해시태그 방식·미디어 유형·작성자 필터로 타인 공개 글 검색. 미승인 회원: 직접 가져오기 안내. 화면 맨 위 A/B 안내 박스 + "비즈니스 앱 승인 절차" 매뉴얼 팝업(`platform_guides` `ae85d991-...`) | 승인 여부에 따라 쓸 수 있는 기능이 다름 | `3975b29`, `4257527` / TAP `AGENTS.md` |
| 쇼핑제휴 AI 캡션 | 화면에서 고른 모델(GPT-6/5.6/4.1, Gemini 3.x, Claude Sonnet 5/Opus 5/Haiku 4.5)을 몰래 다른 모델로 바꿔 부르던 코드 제거, 종료된 모델 목록 정리 | 종료 모델 호출로 실패하고 있었음 | TAP `AGENTS.md` |
| 쇼핑제휴 내 페르소나 | 커스텀 말투를 저장해 트렌드 벤치마킹·새 글 작성에서 재사용(`tap_personas`, 공용 `PersonaPicker`) | 테이블만 있고 연결이 안 돼 있었음 | `25113ca` |
| 쓰레드 3개 프로그램 앱 정보 분리 | 인스타용 `meta_app_id/secret`과 쓰레드용 `threads_app_id/secret`을 따로 저장. Meta 제거·삭제 콜백은 쇼핑제휴 한 곳에서 3개 프로그램을 함께 처리 | 인스타·쓰레드 앱 ID 칸을 같이 써서 잘못된 ID로 인증 실패(4476002) | 루트 마이그레이션 `0017` |
| threads(자동포스팅) 카테고리 버그 | 카테고리 JSON을 API 키 칸에 덮어쓰던 코드 제거·데이터 복원 | 회원 API 키가 망가지고 있었음 | `threads/AGENTS.md` |
| 운영 DB 미적용 마이그레이션 | `tap_saved_posts`, `tap_personas`, `program_prompts`, `style_preset_prompts`, `user_image_generations`, `affiliate_clicks`, `threads_categories` 적용 | 코드만 있고 운영 DB에 테이블이 없었음 | 각 `supabase/migrations/` |
| 법적 페이지 | 개인정보처리방침 제12조(Meta 연동 정보, 10/5 시행 공지), `https://www.buylife.xyz/data-deletion` 신설 | Meta 앱 심사 필수 항목 | `META_APP_REVIEW.md` §1 |
| 카탈로그 썸네일 | 30개 전부 실사 원칙으로 정리(seo-studio·tarot 교체), 업로드 도구 `scripts/upload-program-thumbnail.mjs` | 썸네일은 실사가 원칙 | `docs/PLATFORM_PATTERNS.md` §13·§14 |
| 사이드바 통일 | 21개 프로그램 좌측 메뉴 바로 밑에 로그인 계정·로그아웃을 붙이고, 사이드바를 화면에 고정해 항상 보이게 함(기준: TAP `Sidebar.tsx`). 처음엔 화면 맨 아래에 붙였다가 "메뉴와 너무 멀다"는 지시로 메뉴 밑으로 옮김 | 긴 페이지에서 계정 표시가 화면 밖으로 밀려남 | `7b09f63`, `eb0b072`, 이번 커밋 / 루트 `AGENTS.md` §10 |
| 쇼핑제휴 알리 상품 이미지 누락 재발 수정 (v1.05) | 원인: 알리 API 호출 빈도 제한(`ApiCallLimit`)이 조용히 삼켜짐(09-27 지침은 단축 URL만 다뤘음). 재시도·경고·"이미지 다시 가져오기" 버튼 추가, 누락 1건 복구 | 주인님 신고 | `threads-affiliate-poster/docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md` |
| BLOG 글쓰기 고급 설정 삭제 (ai-auto-blog v1.16) | "이번 글에만 쓸 Gemini 키·커스텀 엔드포인트" 입력칸 삭제, 서버도 요청 키를 받지 않고 등록된 본인 키만 사용 | 주인님 지시 | `blog/AGENTS.md` "고급 설정 삭제" |
| BLOG 보관 안내 문구 정리 (ai-auto-blog v1.15) | 설정 화면 안내에서 "Cloudinary 연결 불필요"·"기존 콘텐츠 10/31부터 삭제" 문장 삭제(규칙·배지는 유지) | 주인님 지시 | `blog/AGENTS.md` "보관 기간 안내 문구 정리" |
| BLOG 콘텐츠 일체 30일 보관 (ai-auto-blog v1.14) | 글(본문)·이미지·글감 수집 결과를 건별로 만든 날 기준 30일 뒤 자동 삭제(매일 03시 KST). 기존 데이터는 10/1부터 30일 유예 → 첫 삭제 11/01에 현재 글 14·글감 25개 삭제 예정. 설정·글쓰기·게시글 관리·글감 수집 화면 안내, 글마다 "N일 후 삭제" 배지 | 주인님 지시 | `blog/AGENTS.md` "콘텐츠 일체 30일 보관" |
| BLOG 이미지 보관 기간 30일 (ai-auto-blog v1.13) | Storage의 BLOG 이미지(`<회원id>/ai-auto-blog/`만)를 만든 지 30일 지나면 매일 03시(KST) 자동 삭제(Vercel Cron + `CRON_SECRET`). 설정 화면·AI 글쓰기 화면에 보관 기간·다른 블로그로 옮길 때 주의사항 안내 | 주인님 지시 | `blog/AGENTS.md` "이미지 보관 기간 30일" |
| BLOG 이미지 저장소 전환 (ai-auto-blog v1.12) | 모든 회원·모든 이미지(자동 생성·편집기 AI·첨부)를 Supabase Storage `post-images/<회원id>/ai-auto-blog/`에 저장, Cloudinary 연동 삭제. 기존 base64 글 3개(각 12MB) 이미지 9장 이전 → 20~25KB | 주인님 지시 | `blog/AGENTS.md` "이미지 저장소 전환" |
| BLOG 이미지 프롬프트 섹션 숨김 (ai-auto-blog v1.11) | 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션을 새 글에서 만들지 않고, 기존 글은 보기·편집 화면에서 걷어냄 | 주인님 지시 | `blog/AGENTS.md` "이미지 프롬프트 섹션 숨김" |
| BLOG 주소 입력 자동 보정 (ai-auto-blog v1.10) | 추천 링크·참고 링크에 `buylife.blog`처럼 넣어도 `https://`를 자동으로 붙임(브라우저 "URL을 입력하세요" 차단 해제) | 주인님 요청(ur.png) | `blog/AGENTS.md` "주소 입력 자동 보정" |
| BLOG 모델 목록 정리 (ai-auto-blog v1.08~v1.09) | 본문 기본 OpenAI GPT-4.1, 모델 표준 문서 기준 레지스트리로 정리(GPT-6 Luna·6.1 Sol, Claude Fable 5, Gemini 3.5/3.6/3.8 Flash 추가, Haiku 4.5 정확한 ID로 수정), 이미지 1K를 2K 위로·기본 2K, 제목에 선택 모델명 표시. 남은 일: GPT-6 계열 실제 생성 1회 검증(유료, 승인 필요) | 주인님 지시 | `blog/AGENTS.md` "모델 기본값·목록 정리" |
| BLOG 로그인 "fetch failed" 수정 (ai-auto-blog v1.07) | 단독 배포 환경변수에 옛(없어진) Supabase 주소가 들어가 있던 것을 공용 DB 값으로 교체, 로그인 화면 문구("세션 인증"→"로그인") 정리 | 주인님 신고(에러.png) | `blog/AGENTS.md` "로그인 fetch failed 수정" |
| BLOG 독립 배포 분리 (ai-auto-blog v1.06) | 루트 내장(www.buylife.xyz/blog)을 자체 Vercel 프로젝트 `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)로 분리, 메인 카탈로그 `app_url` 교체, 예전 /blog/* 주소는 새 주소로 넘김. 회원 전용 화면 서버 권한 확인·설정 저장 권한 확인 추가. 남은 일: 회원 계정으로 로그인→글 생성 실사용 확인 | 주인님 지시 | `blog/AGENTS.md` "독립 배포 분리" |
| BLOG 버전 표시 (ai-auto-blog v1.05) | 버전 규칙이 DB에만 있던 것을 `blog/utils/version.ts` + 사이드바 제목 밑 표시로 보완 | 주인님 지시 | `blog/AGENTS.md` "버전 표시" |
| BLOG 본문·이미지 모델 분리 선택 (ai-auto-blog v1.04) | 글 작성 화면에 SEO 스튜디오와 같은 "본문 생성 설정(OpenAI/Claude/Gemini+모델)"·"이미지 생성 설정(나노바나나 모델)" 카드. 키는 본문용/이미지용 각각 확인, 생성 실패 시 틀 글 대체 없이 오류 표시. 세 플랫폼 짧은 요청 검증 완료 | 주인님 지시 | `blog/AGENTS.md` "본문 생성 모델·이미지 생성 모델 분리 선택" |
| BLOG(원문) 이미지 로직 개편 (ai-auto-blog v1.03) | SEO 스튜디오 방식 반영: 섹션마다 핵심 문장 1개를 원문 그대로 골라 그 문장만 그리는 짧은 장면 설명, 이미지 응답에서 inlineData part 탐색. **운영자 GEMINI_API_KEY 폴백으로 키 없는 회원 글이 운영자 비용으로 생성되던 문제 차단**(API_KEY_REQUIRED 안내), pollinations 대체 이미지 제거. 실측 검증 완료(내용 일치·가짜 글자 제거·설명 잘림 수정), 운영 GEMINI_API_KEY 삭제. 남은 일: 이미지 저장 Supabase 전환 | 주인님 지시 | `blog/AGENTS.md` "이미지 생성 로직" |
| 관리자(gmail) API 키 재등록 확인 (09-30) | 쓰레드 자동포스팅용 OpenAI·Perplexity 키를 주인님이 재등록 → OpenAI 모델 목록 조회 200, Perplexity 무과금 검증(빈 요청 400 vs 가짜 키 401)으로 유효 확인 | 주인님 | — |
| SEO 스튜디오 권한 규칙 적용 (v1.03) | Codex가 버전 표시(v1.02)는 이미 적용해 둠. 웹 `lib/access.ts`·확장 `lib/extensionAuth.ts`를 핵심 원칙 6번 순서로 정리(정지 차단·FREE 추가, 등급만/사용기간만 허용 제거). 막히는 회원 0명 | 주인님 지시 | `naver-blog-seo-studio/AGENTS.md` |
| 이용 권한 기본규칙 확정 (09-30) | FREE 배지 = 가입만 하면 등급과 무관하게 사용 / 그 외 = 구독 또는 일반 이상 + 사용기간. 핵심 원칙 6번으로 등록. 타로·캐릭코드에 FREE 배지 + 같은 규칙 판정 코드 적용(v1.03) | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 6번 |
| 이용 권한 베타테스트 정책 | 무료 배지 → 가입만 하면 사용 / 그 외 → 결제 구독 또는 일반 이상 + 사용기간. 등급만으로 열리던 예외 삭제. 루트 + 서브프로젝트 24곳 적용, 해당 프로그램 버전 +0.01 | 주인님 지시 | 루트 `CLAUDE.md` "이용 권한 판정 정책" |
| 🔒 `user_program_access` 보안 구멍 수정 | 모든 역할에 `using (true)`로 열려 있던 RLS 정책 "Service role full access" 삭제 → 회원은 본인 행 조회만, 쓰기는 service role(관리자 API)만. 적용 전 기존 4,702건 전부 관리자가 부여한 것 확인(악용 흔적 없음). 적용 후 회원 권한으로 검증: 본인 29건만 조회, 추가 시도 거부 | 주인님 승인 | 루트 마이그레이션 `0019` |
| 쇼핑제휴 복제 키트 (v1.02) | 다른 GitHub·Vercel·Supabase 계정으로 통째 복제하는 키트 `threads-affiliate-poster/clone-kit/`(설치 매뉴얼·기본지침·DB 설계·전체 스키마 SQL·환경변수·연동 매뉴얼 8종·복제 스크립트). 코드에 독립 운영 모드(`NEXT_PUBLIC_STANDALONE_MODE`, `src/lib/deployment.ts`) 추가 — 값이 없으면 기존과 동일. 스키마는 빈 PostgreSQL에서 실행 검증, 실제 새 계정 설치는 아직 | 주인님 요청 | TAP `README.md` "별도 서버로 통째 복제하기" |
| 프로그램 버전 관리 시작 | 30개 프로그램 전부 `v1.01`. DB `programs.version` 칸 추가(루트 마이그레이션 `0018`) → 메인 사이트 목록·상세·관리자 편집 화면에 표시. 21개 프로그램은 `lib/version.ts`의 `APP_VERSION`을 좌측 메뉴 제목 밑에 표시, auto-detail-page·mbti·mbti-character·tarot은 화면 제목 옆(또는 밑)에 표시(09-29 후반 추가). **이후 수정할 때마다 +0.01, 큰 변경은 주인님 지시 시 v2.01** | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 5번 |
| 작업 규칙 | 매 작업 5단계(빌드→커밋→푸시→배포→**인수인계 문서 반영**), 여러 CLI가 같은 폴더·스테이징을 공유한다는 주의 추가 | 다른 CLI가 이어받을 수 있게 | `79cc7e5` |

---

## 3. 이어받는 도구가 꼭 알아야 할 것

- **여러 CLI가 같은 작업 폴더를 동시에 쓴다.** `git add`는 커밋 직전에만, 그리고 `git commit -m "..." -- <경로들>`처럼
  경로를 지정해 커밋한다. 남의 변경이 섞여 들어간 사례가 실제로 있었다.
- **배포는 서브프로젝트 폴더에서 `vercel deploy --prod --yes --scope buylife`.** Vercel과 GitHub는 연결돼 있지 않은 게 정상이다(CLI 업로드 방식).
- **테스트 계정**: `buylifemall@naver.com` = 일반 회원 테스트용(회원 기능 문제는 이 계정부터 확인), `buylifemall@gmail.com` = 관리자.
- **비용이 드는 작업은 매번 승인받는다**: 관리자 Gemini 키로 이미지 생성 같은 유료 호출, DB 스키마·환경변수 변경, 데이터 삭제.
- **비밀값 노출 금지**: 스크린샷 등에 앱 시크릿이 보여도 문서·커밋·답변에 옮겨 적지 않는다.
- **브라우저로 비밀번호 로그인을 대신하지 않는다.** 로그인이 필요한 화면 확인은 주인님께 요청한다.
- **데이터를 지어내서 화면을 채우지 않는다.** 실제 API가 주지 않는 수치(조회수 등)는 표시하지 않고 원문 링크를 준다.
- 로컬 빌드만 타입 에러가 나면 먼저 `node_modules` 버전이 `package.json`과 맞는지 확인한다(`npm install`로 해결된 사례: longtail).
- 사용자 호칭은 "주인님", 답변은 정중한 존댓말과 쉬운 한글.
