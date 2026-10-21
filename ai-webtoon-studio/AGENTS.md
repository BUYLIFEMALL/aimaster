# AI 웹툰 자동화 (`ai-webtoon-studio`) AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Google Gemini)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.
> **생성 데이터도 회원 본인 소유로 격리하며 다른 회원과 공유·복사·재사용하지 않는다.**

---

## 1. 프로그램의 사용목적 및 대상
- **프로그램명**: AI 웹툰 자동화 (영문 `AI Webtoon Automation` / `ai-webtoon-studio`)
- **서비스 공식 URL**: https://ai-webtoon-automation.buylife.xyz (기존 `ai-webtoon-studio.buylife.xyz` 병행 지원)
- **사용 목적**: 아이디어 한 줄과 키워드만으로 기승전결 시놉시스 확장, 캐릭터 턴어라운드 일관성 시트 확립, 컷별 콘티(연출·앵글·대사) 분할, 그리고 나노바나나 2.1 고화질 컷 렌더링부터 세로 롱스크롤 JPG 무손실 합성 및 ZIP 일괄 다운로드까지 웹툰 제작 전 과정을 원스톱으로 자동화하는 전문 웹툰 스튜디오 솔루션.
- **주요 대상**:
  - 웹툰 콘티 및 스토리를 빠르게 기획하고 시각화하려는 1인 웹툰 작가 및 스토리보드 작가
  - 네이버웹툰, 카카오페이지 등 웹툰 플랫폼 공모전 준비생 및 인스타툰/SNS 웹툰 크리에이터
  - 비주얼 스토리텔링 마케팅 콘텐츠를 제작하려는 기업 및 브랜드 마케터

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript
- **스타일링**: Tailwind CSS v4, 인라인 CSS 테마 변수
- **디자인 템플릿**: **크리에이티브 아틀리에 스타일 (웹툰 스튜디오 다크 변형)** (`bg-[#0a0d14]`, 서피스 `#121620`, 카드 `#181d2a`, 보더 `#232b3e`, 인디고 `#6366f1` / 바이올렛 `#8b5cf6`, 앰버 `#f59e0b`)
- **반응형 아키텍처**: 데스크톱(1440px) 260px 좌측 사이드바 + 모바일(375px) 상단 56px 고정 헤더 & 슬라이드 오버레이 드로어
- **백엔드 & 데이터베이스**: Supabase SSR (공유 DB `esgxyikcnnvmlhygjkth`), PostgreSQL RLS (회원별 데이터 엄격 격리)
- **AI 모델 연동**: Google Gemini (`gemini-nano-banana-2.1`, `gemini-2.5-flash`), 무료 대체 렌더러 (pollinations-flux)
- **캔버스 & 압축 엔진**: HTML5 Canvas (무손실 롱스크롤 세로 병합), JSZip (원고 일괄 압축 다운로드)

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점
### 핵심 기능 (4단계 파이프라인)
1. **STEP 1 기획 & 컨셉 설정 (`concept`)**:
   - 작품 제목, 작가명, 핵심 시놉시스 AI 추천/확장 (`expandSynopsisAI`).
   - 5대 아트 스타일(로판, 액션실사, 소년만화, 3D애니, 사이버펑크 등), 레이아웃(세로스크롤/그리드), 3대 말풍선 스타일 선택.
2. **STEP 2 캐릭터 설정 & 일관성 시트 (`character`)**:
   - 최대 3인 주연 캐릭터 외형 묘사 AI 보강 (`expandCharacterAI`).
   - 3면 턴어라운드 캐릭터 시트 생성 (`generateCharacterSheetImage`) 또는 로컬 사진 업로드로 그림체 일관성 고정.
3. **STEP 3 시나리오 콘티 생성기 (`script`)**:
   - 챕터(화) 수 및 컷 수 조절, 스토리 추가 요청 프롬프트 반영.
   - 컷별 연출 지문, 카메라 앵글, 대사 콘티 자동 분할 (`generateStoryboardAI`) 및 컷별 카드/텍스트 원문 뷰 편집.
4. **STEP 4 웹툰 제작 & 뷰어 (`canvas`)**:
   - 메인 표지 및 컷 일괄 렌더링 (`generateCutImage`), 개별 컷 재생성 지원.
   - 모바일 690px 표준 세로 스크롤 뷰어 및 그리드 뷰 제공.
   - HTML5 Canvas 기반의 세로 롱스크롤 JPG 병합 다운로드 및 ZIP 일괄 압축 다운로드.
5. **비주얼 연동 & 사용 매뉴얼 (`guide`)**:
   - 4단계 워크플로우 카드, 5대 아트 스타일 상세 안내, 세로 롱스크롤 안전영역 가이드, BYOK 수칙 및 FAQ 5종.

### 장점 및 단점
- **장점**:
  - 시놉시스부터 완성 원고 롱스크롤 JPG까지 외부 툴 없이 브라우저 안에서 원스톱 종결.
  - 정식 `gemini-nano-banana-2.1` 고화질 모델 탑재로 웹툰 특유의 세밀한 컷 렌더링 지원.
  - 키가 없거나 사용량 소진 시에도 무료 대체 렌더러로 끊김 없이 프로토타이핑 가능.
- **단점**:
  - 여러 컷에 걸쳐 복잡한 다이나믹 포즈의 의상 디테일이 미세하게 달라질 수 있어 프롬프트 튜닝 필요.

---

## 4. 현재 버전 및 버전별 변경 히스토리
- **현재 버전**: `v1.19` (2026-10-20 — v1.18 회원 연동 정보 공용 저장, v1.19 예약 서버 코드 공용 사본·일시정지 안전 처리, 아래 기록 참고)
- **v1.24 (2026-10-20, Claude Code 윈도우) — 📢 프로그램 공지 띠(공용 기준 코드 첫 적용)**
  - 메인 사이트 관리자가 공지의 「관련 프로그램」에 웹툰을 고르면 작업 화면(`StudioWorkspace` `<main>`) 맨 위에 최근 공지 1건(30일 이내)이 뜸 → 누르면 메인 공지 상세(새 탭), ✕는 공지별로 이 브라우저에 기억. `src/components/ProgramNoticeBanner.tsx`(공용 기준 `program-notice-banner`, 공개 읽기만, `tone` dark/light). 다른 프로그램은 다음 배포 때 사본으로 넣음(`docs/SHARED_MODULES.md` 미배포 표).
  - 검수: build, 커밋 `40264500`, 배포 `ai-webtoon-studio-c57ciuy0s` Ready, DB v1.24. 크롬(관리자) 웹툰 연결 시험 공지 → 작업 화면 맨 위 띠 표시·링크(메인 공지 상세, 새 탭)·✕ 닫기 후 새로고침해도 안 뜸 확인, 시험 공지 삭제·브라우저 닫기 기록 비움.
- **v1.23 (2026-10-20, Claude Code 윈도우) — 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로**
  - 원인: `src/components/Sidebar.tsx` 바깥 묶음의 `justify-between`이 메뉴와 계정 사이를 벌려 계정이 화면 맨 아래로 밀림(사이드바 표준 위반). 이 클래스를 빼고 계정 영역에 `shrink-0`(낮은 화면에서는 메뉴만 스크롤). 휴대폰 펼침 메뉴도 같은 부품이라 함께 반영.
- **v1.22 (2026-10-20, Claude Code 윈도우) — 📚 회차 묶음 예약: 회차별 캡션 미리보기·수정**
  「여러 회차 한 번에 예약」 회차 줄마다 「✏️ 캡션」 → 자동 캡션을 펼쳐 고치기(고친 회차만 저장, 나머지는 자동 캡션), 글자 수 n/2200 표시·초과 시 「캡션이 너무 깁니다」로 예약 버튼 막기, 「자동 캡션으로 되돌리기」. 파일/작품을 다시 고르거나 예약이 끝나면 비움. DB 변경 없음. 커밋 `088367ba`. 추가개선 제안 2-2.
  - 검수: tsc·시험 18·build, 배포 `ai-webtoon-studio-qkpj6wnuw` Ready, DB v1.22. 화면은 프로젝트 파일이 필요해 4컷(같은 구조)에서만 실검수.
  - 웹툰 실화면 검수(2026-10-20, v1.23 운영, 크롬 관리자): 「4단계 → 인스타그램에 게시 → 📚 여러 회차 한 번에 예약」에 그림 주소만 넣은 시험 회차 JSON 2개를 브라우저 안에서만 넣어 확인 — 「캡션」 펼침·자동 캡션(제목·줄거리·해시태그), 2300자 입력 시 「2300/2200자」·「캡션이 너무 깁니다」·예약 버튼 막힘, 「자동 캡션으로 되돌리기」 후 경고 사라짐. 예약 버튼은 누르지 않음(계정 확인 체크 전이라 막힘이 정상), 새로고침으로 비움.
- **v1.21 (2026-10-20, Claude Code 윈도우, 남은 작업 ⑧) — 📚 회차 묶음 예약 중 창 닫힘 경고·안내 + 실패한 회차만 다시 예약**
  - `src/components/EpisodeBatchSchedule.tsx`: 예약하는 동안(`busy`) `beforeunload`로 브라우저 「사이트에서 나가시겠습니까?」 확인, 진행 중 「⚠️ 예약이 끝날 때까지 이 창을 닫거나 다른 화면으로 옮기지 마세요」 안내. 실패한 회차 순번을 기억해 「실패한 n개 회차만 다시 예약 (성공한 회차는 그대로)」 버튼 — 원래 계획 시각으로 다시 시도. 파일을 다시 고르면 비움. 이미 닫힌 창의 진행 상태는 브라우저가 기억하지 못해 같은 화면 안에서만 이어서 할 수 있음.
  - **이 배포로 미배포 공용 정리 3건도 함께 나감**(게시 처리·예약 API 5개, 예약 화면 동작, 예약 실행 방식).
  - 검수: tsc·시험 18·build, 커밋 `07986cc9`, 배포 `ai-webtoon-studio-4kgou7eow` Ready, DB v1.21(크롬 SQL Editor, PRODUCTION). 운영 예약 실행 주소 3개(가짜 토큰·비밀값 없음·비로그인) 401, 크롬(관리자) 홈 `v1.21`, 로그인 상태 예약 상태 API 200(`platform`)·게시 기록 API 200. **묶음 예약 화면(프로젝트 파일 필요)·실제 예약은 미시험**(코드 확인만).
- **2026-10-20 (버전 변경 없음·미배포) — 예약 실행 방식 공용 코드 15개로 확대**
  2026-10-20 추가: 공용 `insta-member-scheduler`를 예약 프로그램 15개 공용 **`member-scheduler`**로 넓혔다. `schedulerConfig.ts`에 `SCHEDULER_IS_STANDALONE`(false)·`countRemainingWork`(남은 예약 게시 수) 추가, 기준 `memberScheduler.ts`는 상대 경로(`./cronJobOrg`·`./schedulerConfig`)로 부름. 동작 같음·미배포. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.
- **2026-10-20 (버전 변경 없음·미배포) — 인스타 예약 화면 동작 공용화(상태 줄·게시 기록 시각·예약 취소) (Claude Code 윈도우)**
  - 한 일: 인스타 예약 화면의 같은 동작을 공용 기준 코드 `insta-posts-client`(`src/lib/instagram/postsClient.ts`, 기준 `cardnews-studio`, 사본 인플루언서·웹툰·4컷)로 뺐다 — ① 「⏰ 예약 발행」 상태 줄 동작 `useInstaSchedulerStatus(주소, refreshKey)`(불러오기·일시정지/재개·다음 상태 계산) + 상태 이름·설명 `SCHEDULER_STATE_TEXT` ② 게시 기록 시각 문구 `postTimeLabel` ③ 예약 취소 훅 `useScheduledPostCancel(주소, {onCanceled, onError, onSettled})`(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) + `markCanceled`. **화면 모양(색·테마·배치)과 주소는 각 프로그램에 그대로**(상태 줄은 색 표 `STATE_TONE`/`STATE_COLOR`만 남김). 카드뉴스는 `src/lib/instagram/schedule.ts`를 새로 두어 `lib/cardnews/schedule.ts`를 다시 내보냄(공용 파일이 같은 경로로 부르도록).
  - 바뀐 화면 파일: `SchedulePublishingControl.tsx`(4곳), 게시 기록이 있는 `InstagramPublishPanel.tsx`(카드뉴스·인플루언서·웹툰) / `InstaPostHistory.tsx`(4컷). 화면 마크업·문구 변경 없음.
  - 검수: 네 프로그램 tsc·테스트(카드뉴스 52·웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치, 훅 앞 이른 return 없음 확인. **화면 실검수는 다음 배포 때**(미배포).
  - **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 다음 배포 때 함께 나가며 버전 +0.01도 그때. 그 배포 때 「⏰ 예약 발행」 줄·게시 기록 「예약 취소」 화면을 크롬으로 한 번 확인할 것.
- **2026-10-20 (버전 변경 없음·미배포, Claude Code 윈도우) — 인스타 게시 처리·예약 API 5개 공용 기준 코드화(2단계, 이 폴더가 기준)**
  - 한 일: `src/lib/instagram/posting.ts`와 `src/app/api/instagram/{posts,dispatch,dispatch-member,scheduler}/route.ts` 5개를 **공용 기준 코드로 등록**(`insta-posting`·`insta-posts-route`·`insta-dispatch-route`·`insta-dispatch-member-route`·`insta-scheduler-route`, 기준 `ai-webtoon-studio`, 사본 `ai-influencer-studio`·`four-cut-comics`). 프로그램마다 다르던 값(게시 기록 표·slug·이미지 확인 함수 파일)은 `src/lib/instagram/schedulerConfig.ts`의 `SCHEDULER_POSTS_TABLE`·`SCHEDULER_PROGRAM_SLUG`·다시 내보낸 `MAX_INSTA_CAPTION`/`validInstaPaths`로. **사본은 직접 고치지 말고** 기준(웹툰)만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
  - 동작 변경 없음(표 이름·slug·키 가림 형식 모두 이전과 같음). DB 변경 없음. 카드뉴스는 구조가 달라 제외. 플랜 `ai-webtoon-studio/docs/PLAN_20261020_INSTA_POSTING_SHARED.md`.
  - 검수: 세 프로그램 tsc·테스트(웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치.
  - **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 버전은 그대로이고, 이 프로그램을 다음에 배포할 때 함께 나가며 그때 버전 +0.01.
- **v1.17 (2026-10-20, Claude Code 윈도우) — 📚 회차 묶음 예약 · ⏰ 예약 대기 요약 (v1.16 추가개선 제안 진행)**:
  - **회차 묶음 예약**(`src/components/EpisodeBatchSchedule.tsx`): 게시 칸 안 「📚 여러 회차 한 번에 예약 (연재용)」 — 「프로젝트 저장(JSON)」 파일 여러 개를 골라 파일 이름 숫자 순서(1화 < 2화 < 10화)로, 첫 회차 시각부터 매일·3일·매주·2주 간격으로 한 번에 예약. 회차마다 표지+컷 앞 10장 = 게시물 1개, 캡션은 회차 제목·줄거리·해시태그. 그림이 없는 회차는 「건너뜀」 표시. 보내기 전에 화면에서 대기 한도(20건)·첫/마지막 회차 시각(10분 뒤~60일)을 검사해 경고하고 버튼을 막음(서버 검사는 그대로). 회차별 성공/실패 결과 표시.
  - **그리기·올리기 분리**(`src/lib/instagram/slideRender.ts`): v1.15의 `renderSlide`를 그대로 옮기고 `uploadSlides`(그리기 → 서명 업로드 주소 → 업로드)를 만들어 게시 칸·회차 묶음이 같은 코드 사용.
  - **컷이 없어도 게시 칸 표시**: 새 원고(컷 없음)에서도 안내 문구·게시 기록·예약 취소·회차 묶음 예약이 보임(전에는 칸이 숨음).
  - **대시보드 요약**(`src/components/ScheduledSummary.tsx`): 대시보드 메인(STEP 1) 맨 위 「⏰ 인스타 예약 n건 대기 · 다음 게시 ○월 ○일」 + 「게시 기록·예약 보기 →」(STEP 4로 이동 후 게시 칸 아래쪽 기록이 화면 아래에 오게 바로 이동). 대기 예약이 없으면 숨김.
  - 설정 창 문구 「결과 화면의」 → 「STEP 4(웹툰 제작)의 … 여러 회차는 「📚 여러 회차 한 번에 예약」」(v1.16 남은 점 처리).
  - 순수 함수 `slides.ts`: `parseEpisode`·`sortEpisodes`·`episodeTimes`·`MAX_BATCH_EPISODES` + 시험 3개(합 18개). **DB 구조 변경 없음**(version v1.17만, 마이그레이션 파일 끝에 기록).
  - 검수: 시험 18개·타입·빌드 통과. 배포 `ai-webtoon-studio-btcxr8na3` → 이동 방식 수정 후 `ai-webtoon-studio-bwvnv1fgm` Ready, DB v1.17. 크롬(**시험 회원 계정 `buylifemall@naver.com`** — 브라우저 로그인이 시험 계정으로 바뀌어 있어 그대로 일반 회원 권한으로 검수): 컷 없는 원고에서 게시 칸·안내·회차 묶음 보임 → 브라우저 안에서 만든 회차 파일 3개(10화·2화·1화 순으로 넣음)가 1화 → 2화 → 10화로 정렬, 10화 「건너뜀」, 매주 기본 10/27·11/3 19:00 → 첫 회차를 12/18로 바꾸면 「마지막 회차(12월 25일) 60일」 경고·버튼 막힘, 되돌리면 경고 사라짐 → **실제 예약 2건 등록**(✓ 1화 10/27·✓ 2화 11/3, 각 2장) → 게시 기록 「예약 2건 대기」 → 대시보드 요약 「⏰ 인스타 예약 2건 대기 · 다음 게시 10월 27일 19:00」 → 「게시 기록·예약 보기」로 STEP 4 이동 → 2건 모두 예약 취소 → 대시보드 요약 사라짐. 이동 위치는 처음 부드러운 이동이 중간에 끊겨(기록이 화면 밖) 바로 이동·아래쪽 맞춤으로 고쳐 재배포 후, 이 탭에서만 가짜 대기 1건을 돌려주게 해 다시 확인(게시 칸 아래쪽 = 화면 아래쪽). 취소된 시험 기록 2건(시험 계정 본인)은 30일 뒤 자동 삭제.
  - **하지 않은 것**: 실제 인스타 게시. 회차 묶음은 회차 수만큼 그림을 그려 올리므로 회차·컷이 많으면 몇 분 걸릴 수 있음(진행 문구 표시).
- **v1.16 (2026-10-20, Claude Code 윈도우) — ⏰ 인스타 예약 게시·게시 기록 + 장 미리보기(자동 포스팅 2차)**:
  - 플랜 `docs/PLAN_20261020_INSTA_SCHEDULE.md`(v1.15 추가개선 제안 ①②를 주인님이 붙여 넣어 진행 지시 — 운영 DB 표 추가 승인 포함). 기준: `ai-influencer-studio` v1.15 사본(원본 카드뉴스 v1.19·v1.24 + 실패 시 되돌리기). 지침: 루트 `docs/SCHEDULER_POLICY.md`.
  - 게시 칸: 「지금 게시 / 예약 게시」, 예약 날짜·시간(한국 시간 10분 뒤~60일), 실행 상태 줄(일시정지·재개·실행 방식 바꾸기 → 설정 창), 「최근 인스타 게시 기록(30일)」(예약됨·게시 중·게시됨·실패·취소, 게시물 보기, 예약 취소). 즉시 게시도 기록, 일시 오류 때 이미 올라갔는지 확인해 중복 게시 방지.
  - **장 미리보기**: 「올라갈 장 미리보기(n장)」 — 게시와 같은 `renderSlide`로 4:5 장을 그려 ‹ › 로 넘겨 봄. 장을 넘겨도 그림이 유지되도록 그림 주소 정리는 목록(urls)이 바뀔 때만.
  - 칸 제목의 카메라 아이콘·📤 이모지 겹침 정리(이모지만).
  - 설정 창(SettingsModal, 「API키등록·플랫폼연동」) 아래 「⏰ 예약 발행」: 실행 방식(Vercel 기본 / 내 cron-job.org) + 공용 cron-job.org 키 한 줄. 창이 길어져 세로 스크롤(`max-h-[90vh]`).
  - 서버: `src/lib/instagram/{schedule,cronJobOrg,memberScheduler}.ts`(사본, 접두어 `wts_`), `posting.ts`(기록·예약 실행·30일 정리·30분 멈춤 정리·24시간 지연 미게시·1회 재시도 전 중복 확인). API `/api/instagram/{posts,dispatch,dispatch-member,scheduler}` + `publish` 기록 추가. `vercel.json` 새로 만들어 crons 5분.
  - 운영 DB(ref `esgxyikcnnvmlhygjkth`): 표 `wts_insta_posts`·`wts_member_scheduler`(RLS 본인 읽기만, 쓰기는 서버만), version v1.16 — `supabase/migrations/20261020130000_insta_schedule_v1_16.sql`. 운영 Vercel `CRON_SECRET` 추가. `WTS_PLATFORM_SCHEDULER` 없음(= Vercel 방식 켜짐).
  - 검수: 시험 15개(장 만들기 6 + 예약 9)·타입·빌드 통과. 배포 `ai-webtoon-studio-gwivarlv1` Ready. 비로그인 새 주소 8개·잘못된 회원 토큰·잘못된 비밀값 401, Vercel 예약 호출 09:15(KST) 200. 크롬(관리자, 시험 원고는 이 브라우저에만): 사이드바 v1.16, 제목 아이콘 정리, 미리보기 1/3 → 2/3 넘김(1080×1350, 말풍선 표시), 예약 1건 등록 → 기록 「예약됨」·대기 1건 → DB `scheduled`·10:15 KST=01:15 UTC·저장소 3장 모두 1080×1350 → 예약 취소 → 「취소」·대기 0건·사진 3장 삭제(저장소 400). 설정 창 「⏰ 예약 발행」(Vercel 기본, 공용 cron-job.org 키 「등록됨」). 시험 원고 지움. 취소된 시험 기록 1건(관리자 본인)은 30일 뒤 자동 삭제.
  - **하지 않은 것**: 실제 인스타 게시(예약 실행 포함), 「내 cron-job.org」 전환(관리자 하루 호출 한도 보호).
  - 남은 작은 점: 설정 창 안내 문구가 「결과 화면의 📤 인스타그램에 게시」로 되어 있음(뜻은 STEP 4 화면) — 다음 배포 때 「STEP 4」로 다듬기.
- **v1.15 (2026-10-20, Claude Code 윈도우) — 📤 인스타그램에 바로 게시(자동 포스팅 1차: 즉시 게시)**:
  - STEP 4 화면 아래 「📤 인스타그램에 게시 (컷 캐러셀)」 — **1컷 = 캐러셀 1장**: 흰 4:5 판(1080×1350)에 컷 그림 전체 + 아래 대사 말풍선(최대 3줄, 넘치면 …)을 브라우저에서 그려 JPEG로 올림. 표지(넣기로 했을 때) + 그림 있는 컷을 원고 순서대로 최대 10장, 눌러서 빼기/넣기. 기본 캡션 = 제목·줄거리·해시태그(고칠 수 있음), 공개 게시 확인 체크 후 게시.
  - 긴 세로 원고를 잘라 올리는 방식은 컷·말풍선이 장 경계에서 잘려 채택하지 않음(플랜 `docs/PLAN_20261020_INSTA_AUTOPOST.md` 2절).
  - 인스타 연결은 INSTA에서 한 번 한 공용 값(`insta_accounts`) 재사용, 없으면 「INSTA에서 연결하기」. 게시 코드는 공용 기준 코드 `instagram-publish` 사본(`src/lib/instagram/publish.ts`), 연결값·게시·임시 사진 삭제는 `ai-influencer-studio` v1.14 사본.
  - 새 파일: `src/lib/instagram/{publish,memberAccount,posting,slides}.ts`, `src/app/api/instagram/{route,upload/route,publish/route}.ts`, `src/components/InstagramPublishPanel.tsx`, `tests/slides.test.mjs`(6개), `package.json` `test` 명령. 임시 사진 `insta-post-images/{userId}/webtoon-insta/{묶음}/NN.jpg` — 게시 뒤 삭제. **DB 구조 변경 없음**(버전만).
  - 검수: 시험 6개·타입·빌드 통과, 배포 `ai-webtoon-studio-ed1kcztkj` Ready, DB v1.15. 비로그인 새 주소 3개 401. 크롬(관리자 계정, https://ai-webtoon-automation.buylife.xyz): 사이드바 v1.15, 패널 「연결됨 @계정」, 브라우저에만 넣은 시험 원고(표지·가로 컷·긴 대사 세로 컷·대사 없는 컷)로 장 4개 번호·기본 캡션 확인 → **업로드·게시 요청을 이 탭에서 가로채** 실제 게시·저장 없이 만들어진 JPEG 4장 확인(모두 1080×1350, 컷 전체 보임, 말풍선 3줄 줄바꿈 정상), 흐름 순서(업로드 준비 → 4장 올리기 → 게시 요청)와 실패 안내 표시 확인. 로그인 상태 11장 요청 400·다른 회원 폴더 400·빈 목록 400, 업로드 경로 `내 id/webtoon-insta/묶음/01.jpg`. 시험 원고는 지움(원래 없음).
  - **하지 않은 것**: 실제 인스타 게시·실제 저장소 업로드(첫 회원 사용 때 확인). 2차 예약 게시는 인플루언서 v1.15 구조(표 추가 승인 필요)로 다음에.
- **v1.14 (2026-10-18, Antigravity CLI)**:
  - **크리에이티브 아틀리에 스타일 (웹툰 스튜디오 다크 변형)** 전면 적용 (`globals.css`, `layout.tsx`, `Header.tsx`, `Sidebar.tsx`, `StudioWorkspace.tsx`, STEP 1~4 및 `SettingsModal`).
  - 모바일(375px) 상단 헤더 및 슬라이드 오버레이 드로어 메뉴 구축 완료.
  - **비주얼 연동 & 사용 매뉴얼 (`GuideSection.tsx`) 완전 신설** (마스코트 배너, 4단계 파이프라인, 5대 화풍 가이드, 캔버스 안전영역, FAQ 5종).
  - 로컬 Turbopack 빌드 무결성 검증, Supabase DB v1.14 갱신 및 Vercel 프로덕션 배포 완료.
  - Microsoft Edge 포그라운드 실세션 검수 완료 (데스크톱/모바일 5종 캡처 보존).
- **v1.13 (2026-10-18, Claude Code)**: 대체 그림 원인 안내 (Gemini 실패 시 무료 대체 그림 원인 한 줄 안내).
- **v1.12 (2026-10-18, Claude Code)**: 이미지 생성 호출을 공용 기준 코드로 (`geminiImage.ts` 연동).
- **v1.11 (2026-10-17, Claude Code)**: 이미지 모델 최신 정식 교체 (`gemini-nano-banana-2.1`).
- **v1.08 (2026-10-15)**: AI 지시문에 한국 시간 현재 월 추가 (`koreaNowRule()`).
- **v1.05 (2026-10-12)**: 기본 이름 빈칸 처리 및 UI 상태 정리.
- **v1.02 (2026-10-12)**: "AI 웹툰 자동화" 공식 리브랜딩 및 SSO 커스텀 도메인 연동.
- **v1.01 (2026-10-11)**: 최초 릴리스 (Next.js 16, 4단계 파이프라인, JSON 백업).

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내역은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조:
  1. `WEBTOON-01`: 컷 이미지 위에서 드래그 앤 드롭으로 말풍선 위치/크기/폰트를 편집하는 캔버스 인라인 말풍선 에디터.
  2. `WEBTOON-02`: 완성된 웹툰 컷을 `shots`로 1클릭 전송하여 보이스 무빙툰 쇼츠 비디오로 변환하는 크로스 미디어 연계.
  3. `WEBTOON-03`: 캐릭터당 4종 표정 세트(기쁨/분노/슬픔/놀람) 프리셋 저장 라이브러리.
  4. `WEBTOON-04`: 컷 수가 길어질 때 우측 미니맵을 통한 컷 퀵 이동 네비게이터.

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **`shots` (YOUTUBE Shorts 자동화) 연계**:
   - 완성된 웹툰 컷(이미지, 대사, 연출)을 쇼츠 제작 파이프라인으로 전송하여 무빙툰 영상화.
2. **`four-cut-comics` (AI 4컷 만화 자동화) 연계**:
   - 롱스크롤 웹툰 중 하이라이트 4컷을 인스타 피드용 정방형 4컷 만화로 자동 변환.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃 제안
1. **캔버스 인라인 폰트/말풍선 에디터**: 컷 위에서 직접 말풍선 꼬리와 글꼴을 편집할 수 있는 인터랙티브 오버레이 UI.
2. **원고 미니맵 네비게이터**: 롱스크롤 작업 시 스크롤 위치를 시각적으로 표시해 주는 오른쪽 미니맵 바.

---

## 8. 관련 문서 링크
- [디자인 개발 플랜](docs/PLAN_20261018_DESIGN_RENEWAL.md)
- [디자인 핸드오프](docs/DESIGN_HANDOFF.md)
- [개선 및 특이사항](docs/IMPROVEMENTS.md)
- [개선 백로그](docs/IMPROVEMENT_BACKLOG.md)

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-012(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.18 — 회원 연동 정보 공용 저장: Instagram 공용 계정 먼저 읽기 (Claude Code 윈도우)
- `src/lib/instagram/memberAccount.ts` `getMemberInstagramAccount`가 공용 표 `member_platform_accounts`(platform `instagram`)를 먼저 보고, 로그인 방식에 맞는 게시 권한이 있고 재연결 필요가 아니면 그것을, 아니면 지금처럼 INSTA의 `insta_accounts`를 쓴다(카드뉴스 v1.26·인플루언서 v1.16과 같은 코드). 연결 화면이 없어 쓰기·해제 코드는 없음. 공용 부품 사본 `src/lib/memberIntegrations.ts`(`scripts/check-shared-modules.mjs` 등록). 테스트 18개 통과. 루트 `docs/MEMBER_INTEGRATIONS.md` §6.

## 2026-10-20 v1.19 — 인스타 예약 서버 코드 공용 사본 전환 · 일시정지 안전 처리 보강 · 예약 취소 중복 누름 방지 (Claude Code 윈도우)
- 공용 기준 코드 등록(2026-10-20): `insta-schedule-time`(schedule.ts)·`insta-member-scheduler`(memberScheduler.ts)·`insta-cronjob-org`(cronJobOrg.ts) — 기준 = `cardnews-studio`, 사본 = 인플루언서·웹툰·4컷. 프로그램마다 다른 값(사이트 주소·표 이름·토큰 앞글자·환경변수 이름·실행 주소·작업 이름)은 각 폴더 `src/lib/instagram/schedulerConfig.ts`(공용 아님). 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
- **일시정지 안전 처리 누락 보강**: v1.16 예약은 인플루언서 v1.15(그 수정 전 카드뉴스 사본)를 복사해 빠져 있었다 → 공용 사본으로 `pauseMemberScheduler`·`skipPausedMember` 반영, 회원 실행 주소가 일시정지·비cronjob 회원을 건너뜀, 일시정지 응답 `notice`·상태 줄 표시.
- 게시 칸 기록 「예약 취소」 중복 누름 방지.
- 검수(2026-10-20): 4개 모두 타입 검사·시험·빌드 통과, 순차 배포 Ready(카드뉴스 `cardnews-studio-73dn1lu4s`·인플루언서 `ai-influencer-studio-ohxzut5xz`·웹툰 `ai-webtoon-studio-85kgtktv9`·4컷 `four-cut-comics-74d8ph7yq`), DB 버전 4개 갱신(크롬 SQL Editor). 회원 실행 주소 가짜 토큰·설정 주소 비로그인 모두 401. 관리자 계정으로 인플루언서·웹툰·4컷 일시정지 경로 실행: 실행 중 → 일시정지(200) → 「일시정지됨」 → 재개(200) → 원래대로(Vercel 방식이라 cron-job.org 호출 없음). Vercel 5분 예약 호출 10:40 카드뉴스·인플루언서·웹툰·4컷 모두 200.

## 2026-10-20 v1.20 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.
- 인스타 공용 기준 코드(`insta-member-scheduler`, 기준 cardnews-studio) 사본 — `node scripts/check-shared-modules.mjs --sync`로 반영.

## 2026-10-22 v1.25~v1.26 — 「📊 최근 7일 게시」 그래프 (Claude Code 윈도우)
- 기획 단계(`activeTab === "concept"`)의 예약 요약 아래(`src/components/StudioWorkspace.tsx`)에 접힌 한 줄 「📊 최근 7일 게시 n건 · 그래프 보기」 → 펼치면 날짜별 그래프 + 막대 누르면 그날 게시한 글(캡션 앞부분·인스타 바로가기).
- 공용 기준 코드 사본(직접 고치지 말 것): `src/components/weekChart/InstaWeekPosts.tsx`(기준 insta_auto_poster)·`WeekReplyPanel.tsx`·`WeekReplyChart.tsx`·`src/lib/weekChart/bucket.ts`(기준 comment-inbox). 데이터는 기존 `/api/instagram/posts`(본인 최근 30건, 공용 `insta-posts-route` — 응답에 `caption` 추가). 게시 완료 뒤 이미지를 지우는 표라 썸네일은 없음.
- 검수: tsc·build, 커밋 `4ae8a4b9`·`3e7ecf43`·`bf0b8479`, 배포 `ai-webtoon-studio-p3adgzpfw`(v1.25) → `ai-webtoon-studio-4dzj067l9`(v1.26) READY, DB 반영, 크롬(시험 회원)에서 버전·접힌 한 줄·펼치기·막대 누르기 「이날 게시한 글이 없어요」. 게시 기록 0건이라 높이 있는 막대는 미확인. 비용: Vercel 빌드 2회(썸네일 바로잡기 다시 배포 1회 포함).

## 2026-10-22 ⏸ 보류 — 7일 그래프 글자 크게 (주인님 지시: 「놔뒀다가 다음에 수정할때 그때 같이 빌드」)
- 무엇: 공용 그래프 사본 `src/components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx` 글자 한 단계씩 크게(제목 14→16px, 합계 12→14px, 막대 위 건수 11→14px, 날짜·요일 10→12px, 흐린 글자 투명도 60→80%, 그날 목록도 한 단계씩). 커밋 `9479f0bc`로 저장소에는 이미 반영됨.
- **이 프로그램 단독 배포는 하지 않는다.** 다음에 이 프로그램을 다른 이유로 수정해 배포할 때 **함께 빌드**되며, 그때 버전 +0.01·DB 버전 갱신·크롬에서 그래프 글자 크기 확인 후 이 항목을 「배포됨(버전)」으로 바꾼다. 쓰레드 쇼핑제휴(v1.79)에는 이미 배포됨.

## 2026-10-22 v1.27 — 회원 Gemini 키를 브라우저에 두지 않기 (Claude Code 윈도우, 이미지 재비교 W2)
- **필독 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261022_KEY_SERVER.md`](docs/IMPROVEMENT_HANDOFF_20261022_KEY_SERVER.md)** (원인·바꾼 구조·검수·다른 프로그램에 남은 같은 패턴·지킬 것).
- 요약: 옛 `GET /api/user/key`가 키 원문을 내려주고 브라우저가 localStorage에 저장·Gemini를 직접 호출(글은 `?key=` 주소) → AI 호출을 서버 경로 `/api/ai/text`·`/api/ai/image`(권한 확인 + 서버에서 본인 키, 머리글 전송)로 옮기고, 키 경로는 `hasKey`만, 예전에 저장된 브라우저 키는 첫 접속 때 삭제. 설정 창 키 확인도 서버에서. 프롬프트·모델·무료 대체 렌더러는 그대로.
- 검수: tsc 0, 시험 22개(새 정적 검사 4개 포함), build, 배포 `ai-webtoon-studio-pvxt536dl` Ready, DB v1.27, 로그인 없는 호출 401, 크롬(시험 회원) 옛 키 삭제·`hasKey:true`·헤더 연결 표시·v1.27. 실제 생성 1회는 비용 승인 범위 밖이라 미확인.

## 2026-10-22 ⏸ 대기 — 게시 기록 API 「최근 7일 게시 완료만」 조회
- **⏸ 다음 빌드 때 함께 — 「최근 7일 게시 완료만」 조회(2026-10-22 주인님 지시: 따로 빌드하지 않고 이 프로그램을 다음에 수정·배포할 때 같이)**
  - 왜: 「📊 최근 7일 게시」 그래프(공용 `insta-week-posts`)가 게시 기록 API의 최근 30건(생성 순)만 받아서 세므로, 일주일에 30건 넘게 만들거나 예약이 많은 회원은 그래프·그날 목록이 덜 나온다.
  - 할 일: `src/app/api/instagram/posts/route.ts`의 GET에 `?week=1`을 받으면 `status=published`·`published_at` ≥ 한국 시간 6일 전 0시(`weekStartIso()`, `lib/weekChart/bucket.ts`)·`order(published_at desc)`·`limit(500)`로 돌려주게 추가(기존 응답은 그대로 — 예약 요약·기록 화면이 계속 씀). 그다음 공용 기준 `insta_auto_poster/src/components/weekChart/InstaWeekPosts.tsx`가 `postsUrl + "?week=1"`로 부르게 바꾸고 `node scripts/check-shared-modules.mjs --sync`. 이 파일은 공용 기준 코드 `insta-posts-route`의 **기준**이라, 고친 뒤 `--sync`하면 AI 인플루언서·네컷 사본도 같이 바뀐다(세 프로그램을 같은 묶음으로 배포).
  - 검수: 그래프 합계가 DB의 최근 7일 게시 완료 수와 같은지(30건 넘는 시험 데이터는 만들지 않고 쿼리 조건으로 확인), 막대 누르기·예약 요약 줄이 그대로인지. 배포 뒤 이 항목을 「배포됨(버전)」으로 바꾼다.
