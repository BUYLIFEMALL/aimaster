# 작업 인수인계 현황판 (HANDOFF.md)

## 티스토리 갱신 (2026-10-02, v1.13)

- `tistory-auto-blog` 확장은 BLOG(원문) 네이버 입력기와 같은 카드형 계정 연결 → 보낸 글·입력 진행 → 카테고리·태그 설정 → 하단 진단 흐름으로 제목·본문·카테고리·태그와 이미지를 사람 속도로 입력합니다. 태그는 보낸 글 값으로 자동 채워지며 쉼표·줄바꿈으로 직접 편집할 수 있습니다. v1.13은 실제 실패 기록(첫 이미지 `figure > img` 미확인)을 분석해, 오프스크린 클립보드 준비 실패를 숨기지 않고 전달하며 티스토리의 고해상도 이미지 업로드 완료 확인을 20초에서 90초로 늘렸습니다. `#publish-btn`은 탐색·클릭하지 않으며 발행 설정창까지만 엽니다. **2026-10-01: 메인 카탈로그의 블로그 카테고리 등록을 활성화하고 COMING 배지를 제거했으며, 실사형 썸네일을 `program-images/catalog/tistory-auto-blog-thumbnail.png`에 연결했습니다.**

> **다른 CLI(Codex, Gemini, 다른 Claude 세션)가 이어서 작업할 때 가장 먼저 읽는 "지금 상태" 요약본이다.**
> 규칙·원칙은 루트 `AGENTS.md`/`CLAUDE.md`, 프로그램별 상세는 각 `<프로그램>/AGENTS.md`·`README.md`에 있다.
> 이 문서는 "최근에 무엇을 했고, 무엇이 멈춰 있고, 다음에 무엇을 하면 되는지"만 모은다.
> 작업을 끝낼 때마다 아래 1·2·3번 표를 갱신하고 같은 커밋에 포함할 것.

- 최종 갱신: 2026-10-01 (Claude 세션 — 로그인 폼 통일 배포 후 남은 일 정리)
- 기준 커밋: `7179bab` 이후 (master, origin과 동기화됨)

---

## 1. 지금 멈춰 있거나 남은 일

| # | 할 일 | 상태 / 막힌 이유 | 담당 | 자세한 위치 |
|---|---|---|---|---|
| 1 | Meta 앱 심사 (`threads_keyword_search` 고급 액세스) | ⏸ **비즈니스 인증 재제출 후 결과 대기**. 결과가 나오면 → 액세스 인증 → 데이터 처리 질문 → 앱 검수 제출 순서로 재개. 제출에는 심사관 테스트 계정과 시연 영상이 필요 | 주인님(Meta 화면) + 개발 | `threads-affiliate-poster/docs/META_APP_REVIEW.md` §0 |
| 3 | 회원 계정으로 실제 동작 확인 | 쇼핑제휴 `/trends`(직접 가져오기·검색 필터·AI 모델별 캡션·내 페르소나), 댓글자동화 `threads_read_replies` 재연동 후 댓글 테스트, 20개 프로그램 사이드바 하단 계정 표시 | 주인님(테스트) | 각 서브프로젝트 `AGENTS.md` |
| 4 | 티스토리 블로그 자동화 (`tistory-auto-blog/`, BLOG 방식 = 웹 + 크롬 확장) | 🟡 **확장 계정 연동 배포 완료(v1.02)**: 전용 DB·owner-only RLS, 프로그램·기본 3단계 요금제, `https://tistory-auto-blog-pearl.vercel.app` 배포. 확장은 설정의 연동 토큰을 서버에서 검증한 뒤 저장한다. 편집기 조작은 티스토리 권한만 쓰는 읽기 전용 조사 모드다. **다음: 주인님 PC에서 `extension/`을 압축 해제 로드 → 설정에서 토큰 발급·연결 → JSON 전달 → 서버 변환기·실제 입력 코드.** 복제 원본 ESLint 오류 53개는 별도 정리 필요 | 주인님(조사 실행) + 개발 | `tistory-auto-blog/docs/TISTORY_PLAN.md` §6, `tistory-auto-blog/AGENTS.md` |
| 6 | BLOG(ai-auto-blog v1.33) 실제 사용 확인 | ① 이미지 1~5장 선택 시 제목용·문단 이미지 배치 ② 확장으로 네이버 입력 시 추천 링크가 **실제 링크 1개만** 들어가는지(v1.27 수정 후) ③ 추천테그 추출 결과 ④ 회원 계정으로 로그인→글 생성. 실제 생성은 회원 키 유료 호출이라 **에이전트가 임의 실행 금지** | 주인님(테스트) | `ai-auto-blog/AGENTS.md` |
| 7 | GPT-6 계열 본문 생성 1회 검증 (BLOG) | 유료 — 주인님 승인 후 실행 | 개발 | `ai-auto-blog/AGENTS.md` v1.09 |
| 8 | BLOG 30일 자동 삭제 첫 실행 결과 확인 | 📅 **2026-11-01 03:00 KST** 첫 실행(기존 데이터 10/1부터 유예). 다음 날 삭제 건수·Storage 정리 확인 | 개발 | `ai-auto-blog/app/api/cron/cleanup-images` |
| 9 | (Codex 담당) SEO 스튜디오 남은 3가지 | ① `naver-blog-seo-studio/components/StudioPage.tsx`의 "다른 프로그램 보기" 링크 `/blog/dashboard` → `https://www.buylife.xyz/dashboard`(다른 프로그램은 2026-10-01 교체 완료) ② 로그인 화면을 `docs/PLATFORM_PATTERNS.md` §29 레이아웃으로 ③ 확장 타이핑 속도 24~52ms → §20 기준 70~170ms. 고친 뒤 버전 +0.01(코드·DB) | Codex | `docs/ERROR_LESSONS.md` D, §29 |
| 10 | (선택) BLOG 해시태그에도 본문 필터 적용 | SEO 규칙을 그대로 복사해 "위한·주목해야" 같은 말이 남을 수 있음 | 주인님 결정 대기 | `ai-auto-blog/AGENTS.md` v1.29 |
| 11 | 로그인 폼 통일 실사용 확인 (24개 프로그램) | 모든 라이브 `/login` 200·새 문구 확인 완료. 남은 것: 회원 계정으로 아무 프로그램 1~2개 로그인 → `?redirect` 경로로 돌아가는지, 좌측 "다른 프로그램 보기"가 메인 대시보드로 가는지 | 주인님(테스트) | `docs/PLATFORM_PATTERNS.md` §29 |
| 5 | ⚠️ ai-auto-blog 운영 DB 정책·API 점검 | `blog_*` 테이블이 anon 읽기·모든 회원의 카테고리 변경 등으로 열려 있고 `GET /api/posts/[id]`가 인증 없음(읽기 조회로 확인, **미수정**). 영향 범위 확인 후 정책 교체·API 인증 추가(버전 +0.01, 주인님 승인) | 로컬 + 주인님 | `docs/ERROR_LESSONS.md` C 섹션 2026-10-01(cloud) 항목 |

**주의**: `naver-blog-seo-studio/`는 주로 Codex가 작업하는 폴더다. 2026-09-30 주인님 지시로 Claude가 권한 규칙만 적용했다(v1.03).
손대기 전에 `git status --porcelain -- naver-blog-seo-studio`로 Codex의 커밋 안 된 변경이 없는지 먼저 확인하고, 있으면 건드리지 않는다.

---

## 2. 최근 완료한 작업 (2026-09-28 ~ 09-29)

| 영역 | 무엇을 했나 | 왜 | 커밋/기록 |
| SEO 스튜디오 추천 태그 정제 (v1.59) | 한글 조사를 문자 단위로 잘라 `메시지`가 `메시`가 되고 `합니다.`·`있습니다.` 금칙어가 우회되던 로직을 실제 조사·문장부호 처리로 교체. 이미 구체 태그에 포함된 `서울`·`여행` 같은 구성 단어와 본문 일반어(`시간`·`여행지` 등)를 제외하고, 주제·사용자 핵심 키워드는 보존. 두 사용자 화면 사례 회귀 테스트 추가 | 불필요한 추천 태그가 발행 설정에 섞임 | `naver-blog-seo-studio/AGENTS.md`, `CLI_HANDOFF_2026-10-01.md` |
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
| 로그인 폼 통일 + "다른 프로그램 보기" 링크 (24개 프로그램 + ai-image-studio + ai-auto-blog v1.33) | 모든 프로그램 로그인 화면을 BLOG 로그인 폼 레이아웃으로(`docs/PLATFORM_PATTERNS.md` §29). 좌측 메뉴 "← 다른 프로그램 보기"를 `/blog/dashboard` → **`https://www.buylife.xyz/dashboard`**(주인님 결정). web-crawler 버전 파일·표시 추가, music·shop-detail-page 빌드 막던 미사용 변수 제거. 버전: insta_auto_poster(v1.03), kakao_auto_poster(v1.03), naver-cafe-poster(v1.03), shots(v1.03), threads(v1.03), threads-affiliate-poster(v1.14), real_estate_sales(v1.03), web-crawler/webapp(v1.03), mbti-character(v1.04), tarot(v1.04), video-to-gif(v1.03), auto-detail-page(v1.04), booking-reminder(v1.03), competitor-analysis(v1.03), crm-google-form(v1.03), instagram-comment-reply(v1.03), instagram-dm-reply(v1.03), longtail-keyword-expander(v1.03), music(v1.03), shop-detail-page(v1.03), stepmail(v1.03), threads-comment-reply(v1.03), trending-product-finder(v1.03), youtube-auto-reply(v1.03), ai-image-studio(v1.03). 예외: SEO 스튜디오(Codex — 같은 링크가 `components/StudioPage.tsx`에 남아 있음, Codex가 고칠 것) | 주인님 지시 | `docs/PLATFORM_PATTERNS.md` §29, `docs/SIDEBAR_LAYOUT_STANDARD.md` |
| BLOG 문단 이미지 고르게 배치 (ai-auto-blog v1.32) | 2~4장일 때 문단 이미지가 문단 4개를 묶음으로 나눠 맡음(3장=[1~2][3~4] 등), 앞쪽 쏠림 해소 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "2~4장일 때 문단 4개를 나눠 맡기" |
| BLOG 이미지 장수 선택 (ai-auto-blog v1.31) | 이미지 1~5장 선택(1번 제목용=전체 대표, 2번부터 문단 1~4 순서), 본문 문단 3→4개. **남은 일: 실제 생성으로 배치 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 장수 선택" |
| BLOG 삭제 예정 배지 문구 (ai-auto-blog v1.30) | "N일 후 삭제" → "N일 후 자동삭제" | 주인님 지시 | `ai-auto-blog/AGENTS.md` "삭제 예정 배지 문구" |
| BLOG 추천테그 추출 SEO와 동일화 (ai-auto-blog v1.29) | SEO 스튜디오 v1.59 태그 추천 코드·스타일을 그대로 복사(함수 diff 동일). SEO 규칙이 바뀌면 같이 맞출 것 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천테그 추출을 SEO 스튜디오 v1.59와 똑같이" |
| BLOG 확장 추천태그 추출 (ai-auto-blog v1.28) | SEO 스튜디오 v1.57 태그 추천을 BLOG 확장에 적용(버튼을 눌렀을 때만, 해시태그·제목·본문 빈도, 최대 10개) + 해시태그 조사 처리 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 추천태그 추출" |
| BLOG 추천 링크 중복 입력 수정 (ai-auto-blog v1.27) | 링크 붙여넣기가 모든 프레임에서 돌아 3번 + 글자 1번 들어가던 것 → 커서가 있는 프레임 하나에서만 1번 붙여넣기, 실패 시에만 글자. 이미지 설명 줄 제거. 실제 링크가 걸리는 것은 주인님 화면으로 확인됨. **남은 일: 새 버전으로 1개만 들어가는지 재확인** | 주인님 신고(확장.png) | `ai-auto-blog/AGENTS.md` "추천 링크가 4번 들어가던 문제" |
| BLOG 확장 부제 문구 (ai-auto-blog v1.26) | 확장 제목 밑 문구를 주인님 문안으로 교체 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 부제 문구" |
| BLOG 확장 제목 한 줄 (ai-auto-blog v1.25) | 확장 제목 "BLOG(원문) 네이버 입력기" 한 줄, 확장 이름·툴팁 통일 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 제목" |
| BLOG 버튼 이름 변경 (ai-auto-blog v1.24) | "네이버로 보내기" → "네이버 입력기로 보내기"(버튼·안내·오류 문구 전체) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버튼 이름" |
| BLOG 확장 미리보기 문구 정리 (ai-auto-blog v1.23) | 미리보기 링크 뒤 "(실제 링크로 입력)" 문구 삭제 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 미리보기 링크 문구 정리" |
| BLOG 추천 링크 한 줄 + 실제 링크 입력 (ai-auto-blog v1.22) | 추천 링크를 "👉 {문구} 바로가기" 한 줄로(예전 글도 보낼 때 정리), 확장이 링크 줄을 링크 걸린 HTML 붙여넣기로 입력 후 실제 링크 생성 확인(실패 시 글자로). **남은 일: 실제 네이버 화면에서 링크 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천 링크 한 줄 + 네이버에 실제 링크로 입력" |
| BLOG 네이버 입력 링크 (ai-auto-blog v1.21) | 확장 입력 시 추천 링크가 글자로만 들어가던 것 → 링크를 `글자: 주소 `(괄호 없음, 뒤에 띄어쓰기)로 바꿔 네이버 자동 링크 유도. **남은 일: 실제 포스팅으로 링크 확인, 안 되면 링크 도구 방식(구조 분석 필요)** | 주인님 요청(추천링크.png) | `ai-auto-blog/AGENTS.md` "네이버 입력 시 링크가 걸리게" |
| BLOG 확장 아이콘·이름 구분 (ai-auto-blog v1.20) | SEO 확장과 똑같은 회색 "A" 아이콘이라 헷갈리던 것을 초록 "B" 아이콘·"BLOG(원문) 네이버 입력" 이름으로 구분 | 주인님 신고 | `ai-auto-blog/AGENTS.md` "확장 아이콘·이름 구분" |
| BLOG 확장 버전 자동 동기화 (ai-auto-blog v1.19) | SEO 스튜디오 방식(프로그램 버전 = 확장 버전 = ZIP 버전)을 `prebuild`로 자동화 — 버전 올리고 빌드하면 manifest·ZIP 자동 갱신(예전 ZIP 삭제). 설정 화면 "업데이트 필요" 표시, 확장 안 "새 버전" 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 버전 자동 동기화" |
| BLOG 서브폴더 이름 변경 (ai-auto-blog v1.18) | `blog/` → `ai-auto-blog/`(폴더=slug=Vercel 프로젝트 규칙). 작업·빌드·배포는 이제 `ai-auto-blog/`에서. 같은 Vercel 프로젝트·주소로 배포 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "서브폴더 이름 변경" |
| BLOG 네이버 입력 크롬 확장 (ai-auto-blog v1.17) | BLOG 전용 확장(A안): 글 보기 "네이버로 보내기" → 확장이 네이버 글쓰기 화면에 제목·본문·이미지를 §20 속도(70~170ms)로 한 글자씩 입력, 카테고리·태그까지, 마지막 발행은 사람. 설정 화면 토큰·ZIP, `blog_posts` 칸 4개 추가. 서버 흐름 운영 검증 완료. **남은 일: 주인님 PC 실제 네이버 화면에서 끝까지 입력 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "네이버 블로그 입력 크롬 확장", `docs/PLATFORM_PATTERNS.md` §28 |
| BLOG 글쓰기 고급 설정 삭제 (ai-auto-blog v1.16) | "이번 글에만 쓸 Gemini 키·커스텀 엔드포인트" 입력칸 삭제, 서버도 요청 키를 받지 않고 등록된 본인 키만 사용 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "고급 설정 삭제" |
| BLOG 보관 안내 문구 정리 (ai-auto-blog v1.15) | 설정 화면 안내에서 "Cloudinary 연결 불필요"·"기존 콘텐츠 10/31부터 삭제" 문장 삭제(규칙·배지는 유지) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "보관 기간 안내 문구 정리" |
| BLOG 콘텐츠 일체 30일 보관 (ai-auto-blog v1.14) | 글(본문)·이미지·글감 수집 결과를 건별로 만든 날 기준 30일 뒤 자동 삭제(매일 03시 KST). 기존 데이터는 10/1부터 30일 유예 → 첫 삭제 11/01에 현재 글 14·글감 25개 삭제 예정. 설정·글쓰기·게시글 관리·글감 수집 화면 안내, 글마다 "N일 후 삭제" 배지 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "콘텐츠 일체 30일 보관" |
| BLOG 이미지 보관 기간 30일 (ai-auto-blog v1.13) | Storage의 BLOG 이미지(`<회원id>/ai-auto-blog/`만)를 만든 지 30일 지나면 매일 03시(KST) 자동 삭제(Vercel Cron + `CRON_SECRET`). 설정 화면·AI 글쓰기 화면에 보관 기간·다른 블로그로 옮길 때 주의사항 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 보관 기간 30일" |
| BLOG 이미지 저장소 전환 (ai-auto-blog v1.12) | 모든 회원·모든 이미지(자동 생성·편집기 AI·첨부)를 Supabase Storage `post-images/<회원id>/ai-auto-blog/`에 저장, Cloudinary 연동 삭제. 기존 base64 글 3개(각 12MB) 이미지 9장 이전 → 20~25KB | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 저장소 전환" |
| BLOG 이미지 프롬프트 섹션 숨김 (ai-auto-blog v1.11) | 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션을 새 글에서 만들지 않고, 기존 글은 보기·편집 화면에서 걷어냄 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 프롬프트 섹션 숨김" |
| BLOG 주소 입력 자동 보정 (ai-auto-blog v1.10) | 추천 링크·참고 링크에 `buylife.blog`처럼 넣어도 `https://`를 자동으로 붙임(브라우저 "URL을 입력하세요" 차단 해제) | 주인님 요청(ur.png) | `ai-auto-blog/AGENTS.md` "주소 입력 자동 보정" |
| BLOG 모델 목록 정리 (ai-auto-blog v1.08~v1.09) | 본문 기본 OpenAI GPT-4.1, 모델 표준 문서 기준 레지스트리로 정리(GPT-6 Luna·6.1 Sol, Claude Fable 5, Gemini 3.5/3.6/3.8 Flash 추가, Haiku 4.5 정확한 ID로 수정), 이미지 1K를 2K 위로·기본 2K, 제목에 선택 모델명 표시. 남은 일: GPT-6 계열 실제 생성 1회 검증(유료, 승인 필요) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "모델 기본값·목록 정리" |
| BLOG 로그인 "fetch failed" 수정 (ai-auto-blog v1.07) | 단독 배포 환경변수에 옛(없어진) Supabase 주소가 들어가 있던 것을 공용 DB 값으로 교체, 로그인 화면 문구("세션 인증"→"로그인") 정리 | 주인님 신고(에러.png) | `ai-auto-blog/AGENTS.md` "로그인 fetch failed 수정" |
| BLOG 독립 배포 분리 (ai-auto-blog v1.06) | 루트 내장(www.buylife.xyz/blog)을 자체 Vercel 프로젝트 `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)로 분리, 메인 카탈로그 `app_url` 교체, 예전 /blog/* 주소는 새 주소로 넘김. 회원 전용 화면 서버 권한 확인·설정 저장 권한 확인 추가. 남은 일: 회원 계정으로 로그인→글 생성 실사용 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "독립 배포 분리" |
| BLOG 버전 표시 (ai-auto-blog v1.05) | 버전 규칙이 DB에만 있던 것을 `ai-auto-blog/utils/version.ts` + 사이드바 제목 밑 표시로 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버전 표시" |
| BLOG 본문·이미지 모델 분리 선택 (ai-auto-blog v1.04) | 글 작성 화면에 SEO 스튜디오와 같은 "본문 생성 설정(OpenAI/Claude/Gemini+모델)"·"이미지 생성 설정(나노바나나 모델)" 카드. 키는 본문용/이미지용 각각 확인, 생성 실패 시 틀 글 대체 없이 오류 표시. 세 플랫폼 짧은 요청 검증 완료 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "본문 생성 모델·이미지 생성 모델 분리 선택" |
| BLOG(원문) 이미지 로직 개편 (ai-auto-blog v1.03) | SEO 스튜디오 방식 반영: 섹션마다 핵심 문장 1개를 원문 그대로 골라 그 문장만 그리는 짧은 장면 설명, 이미지 응답에서 inlineData part 탐색. **운영자 GEMINI_API_KEY 폴백으로 키 없는 회원 글이 운영자 비용으로 생성되던 문제 차단**(API_KEY_REQUIRED 안내), pollinations 대체 이미지 제거. 실측 검증 완료(내용 일치·가짜 글자 제거·설명 잘림 수정), 운영 GEMINI_API_KEY 삭제. 남은 일: 이미지 저장 Supabase 전환 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 생성 로직" |
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

- **클라우드 세션은 `cloud-work` 브랜치에서만 작업**한다(`docs/CLOUD_SESSION.md`). 로컬은 `master` 유지, 클라우드 작업은 로컬에서 병합 후 배포.
- **작업 전에 `docs/ERROR_LESSONS.md`(작업 중요 지침)를 꼭 읽고, 에러를 해결했거나 점검 사항을 찾으면 같은 커밋에 추가한다**(핵심 원칙 7번, 모든 CLI 공통).

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
