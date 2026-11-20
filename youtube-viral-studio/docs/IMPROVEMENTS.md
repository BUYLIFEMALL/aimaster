# 개선사항 원장 — YOUTUBE VIRAL FINDER (youtube-viral-studio)

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | 모바일 | 휴대폰에서 메뉴가 전혀 없음(사이드바 `hidden md:flex`, 위쪽 바·☰ 없음) — 다른 화면 이동 불가 | `src/components/layout/Sidebar.tsx` | 높음 | **완료(v1.13, Windows 운영 검수 완료)** |
| 2 | 2026-10-17 | 보안·캐시 | `(dashboard)/layout.tsx`에 `fetchCache = "force-no-store"` 누락 | `src/app/(dashboard)/layout.tsx` | 높음 | **완료(v1.13, Windows 운영 검수 완료)** |
| 3 | 2026-10-17 | 디자인 | 흰 배경·하늘색 선택, 유튜브 느낌 약함, 로그인 밝음 | `globals.css`, `Sidebar.tsx`, `(auth)/login` | 중간 | **완료(v1.13, Windows 운영 검수 완료)** |
| 4 | 2026-10-17 | 편의성 | 「대시보드」 메뉴가 1번 메뉴와 같은 `/viral-shorts` | `Sidebar.tsx`, `app/page.tsx` | 중간 | **완료(v1.13, Windows 운영 검수 완료)** |
| 5 | 2026-10-17 | 데이터 | 즐겨찾기가 `localStorage`에만 저장 — 기기·브라우저 바꾸면 사라짐. 회원별 소유자 분리와 건별 30일 자동삭제는 이미 확정된 최상위 규칙이며, 적용 여부를 다시 결정하는 사항이 아님 | `favorites/page.tsx` | 높음 | 완료(v1.14). 주인님 DB/정리 승인 후 전용DB·owner RLS·30일 만료/자동 정리·기존 무소유 자료 열람/이전 차단, 운영 검수 |
| 6 | 2026-10-17 | 문서 | `AGENTS.md` 현재 버전 표기 v1.09 ↔ 코드 v1.12 불일치 | `AGENTS.md` §1 | 낮음 | 완료(v1.13 AGENTS/README 동기화) |
| 7 | 2026-10-17 | ① 로직·기능 | 검색 결과에 「채널 진단 보내기」 없음 — 터진 영상의 채널을 바로 깊게 분석할 수 없음 | 영상 카드·채널 카드 | 중간 | 제안 |
| 8 | 2026-10-17 | ① 로직·기능 | 같은 검색을 반복하면 매번 YouTube 할당량을 다시 씀 — 회원별 결과 임시 저장(30일 자동 삭제, 최상위 규칙)으로 재검색 비용 절감 | `api/youtube/*` | 중간 | 제안(DB 추가 — 승인 필요) |
| 9 | 2026-10-17 | ② UI·편의성 | 검색 전 빈 화면에 예시 키워드 칩(주식·다이어트·AI 등) 원클릭 검색 없음, 결과 정렬(VPH·vsRatio·점수) 토글 없음 | `viral-shorts/page.tsx` | 낮음 | 제안 |
| 10 | 2026-10-17 | ③ 타 프로그램 연계 | **`youtube-channel-consultant`의 「공략 채널 찾기」와 이 프로그램 「황금 채널 발굴」이 같은 기능**(구독자 1만 이하 + 평균 조회수 높은 채널) — 한쪽으로 합치거나 서로 링크 | `goldenChannels.ts` ↔ consultant `targets.ts` | 중간 | **완료(2026-10-17 v1.17)** — 공용 기준 코드 `youtube-golden-engine` 사본 사용(기준: consultant). 조건 4개(기간·길이·국가·검색 깊이) 추가. `docs/SHARED_MODULES.md` |
| 11 | 2026-10-17 | ③ 타 프로그램 연계 | 터진 쇼츠 → `shorts-viral-studio`(공식 분석→대본)로 영상 주소 넘기기, 황금 채널 → `youtube-channel-consultant` 채널 분석으로 넘기기, 터진 영상 제목 → `seo-thumbnail-pro` 메타데이터 전략 | 영상·채널 카드 | 중간 | 제안 |

## 2026-10-17 Codex(Windows) — Windows 검수 발견·추가개선 3대 항목

디자인 v1.13 운영 Edge 검수 완료. 증거·배포는 WINDOWS_HANDOFF_20261017.md에 기록했습니다. 기존 항목1~4 완료. AGENTS 버전·다크 지침은 정리했습니다.

1. **로직·기능(높음):** 전역 localStorage 즐겨찾기에는 회원 소유자/생성일/30일 만료가 없습니다. 같은 브라우저의 회원 간 노출 가능성을 먼저 해소하고, 회원별 저장/RLS/조회 만료 차단/정리 실행을 함께 설계합니다. 무소유 기존 자료 자동 귀속·기간 연장 금지. DB 변경·기존 자료 삭제는 승인 범위 확인. 자동 검색3화면과 url 쿼리 원본 찾기는 진입 시 API를 호출하므로 선택 실행·한도 안내를 검토합니다. ChannelCard의 점수 없음→85점 기본값도 수정 제안입니다.
2. **UI·편의:** 가이드 FAQ에 겨울 한도 충전17시를 추가해 대시보드 안내와 맞추고, vsRatio만으로 알고리즘 유입을 확정하는 표현을 추정치로 고칩니다. 즐겨찾기 화면에 회원별 저장 방식·만료일까지 알려 주는 설계를 제안합니다. 이번 디자인 인수 범위에서는 미구현입니다.
3. **타 프로그램 연계:** Youtube Playlist 자동화(https://youtube-playlist.buylife.xyz)의 README/AGENTS/개선 대장, src/components/PlaylistStudioApp.tsx를 조사했습니다. 현재 media/editor/export/guide 탭이며 참고 URL 메모를 받는 기능은 없습니다. Viral Finder의 선택 영상 URL·제목을 회원이 확인한 참고 메모로 전달하는 새 기능을 제안합니다. 유튜브 영상·음원 다운로드, 타인 API 키/결과 공유, 자동 게시를 포함하지 않습니다. 두 프로그램 모두 본인 인증/키와 건별30일 보관을 지키는 별도 플랜이 필요합니다. 상대 프로그램 개선 원장에도 기록했습니다.

추가 기술 과제: ESLint9 설정 파일 없음, 개발 의존성 braces3.0.3 경로 high5 잔여(운영 의존성0). 정상 lint/보안 전체 완료로 해석하지 않습니다. 증거: docs/evidence/dependency-audit-*.json 및 WINDOWS_HANDOFF_20261017.md.

### Windows 코드 점검 추가 근거

발굴3페이지에서 VideoCard/ChannelCard의 onBookmark 저장 콜백을 넘기지 않고, 실제 localStorage.setItem 호출도 없습니다. 즐겨찾기 버튼은 카드 내부 표시만 바꾸므로 새로고침 후 저장 보장을 할 수 없습니다. 보관함의 개별 북마크 해제도 저장 콜백이 없습니다. 회원별 저장/30일 보완 작업에서 추가·해제·새로고침·다른 회원 전환·기한 경계를 함께 검수해야 합니다. 이번 테스트는 합성 카드 콜백까지이며 운영 보관 성공을 주장하지 않습니다.

## 2026-10-17 Codex — v1.14 후속 구현

#5 회원별DB/30일 보관·실제 저장해제 구현 및 승인된 운영 DB 적용, 자동검색 제거, 85점 기본값 삭제, 가이드/CSV 보완, lint 설정 복구. 운영 배포/재검수 완료. #9의 키워드 칩·정렬 드롭다운은 원래 구현돼 있으므로 신규 기능으로 중복 개발하지 않았습니다. Playlist 메모 복사는 추가했으며 수신 칸은 다음 작업으로 이어갑니다. 후속 과제: 최신1000건 조회 페이지 나눔, 기존 lint경고74·개발 의존성high5. [상세](IMPROVEMENT_HANDOFF_20261017_V114.md).

## 2026-10-17 종료 — Playlist 연계 완료

위 v1.14 기록의 수신 대기는 Playlist v1.08 운영 배포/DB 동기화와 일반 회원 Edge10검사로 해소됐습니다. 제목/URL 읽기 전용 참고 메모이며 실제 미디어/AI/게시 실행 없음. 미해결은 IMPROVEMENT_BACKLOG.md에 구분했습니다. https://youtube-playlist.buylife.xyz

## 2026-10-17 Claude Code(윈도우) — 개발 도구 보안 경고 high 5 조사
- 결과: 상류(braces·Next 검사 플러그인)에 고친 버전이 없어 수용. 운영 영향 없음(운영 audit 0). 근거 `AGENTS.md` 같은 날 항목, 대기 목록 갱신.

## 2026-10-17 Claude Code(윈도우) — v1.15 코드 규칙 경고 74 → 0
- 상세 `AGENTS.md` 「v1.15」. 다음: 즐겨찾기 1,000건 페이지 나눔(대기 목록 순서).

## 2026-10-22 (v1.23, Claude Code 윈도우) — 영상 요약 대사의 마크다운 표시
- 근거: 크롬 확인 — 「영상 요약」 대사 절이 「- **진행자**: "…"」처럼 목록 기호·굵은 글씨 표시와 함께 와서, 원스톱 참고 자료에도 그대로 들어감(넘기기·베끼기 검사에는 지장 없음).
- 다음 첫 단계: `src/lib/ai/summaryScript.ts` `summaryScriptOf`에서 줄 앞 `- `·`**` 표시를 걷어 내기(화자 이름은 남김) — 다음 배포 때 함께.
- 2026-10-22 처리(v1.24): `summaryScriptOf`에서 목록 기호·굵게 표시 걷기 배포.

## 2026-10-22 (Claude Code 윈도우) — 대본 분석 → 썸네일 SEO 보내기는 하지 않음
- 근거: 「✨ AI 떡상 대본 분석」 결과는 남의 영상 분석(원본 대사 `transcript`·따라 하기 틀 `copycatTemplate`)이라, 그걸로 썸네일 「SEO 전략」(내 영상 제목)을 만들면 베끼기에 가까움. 쇼츠 바이럴·원스톱처럼 회원 본인 대본이 있는 곳만 썸네일로 보냄.

## 2026-11-13 전체 점검에서 발견 (정책 담당 세션 `claude-win-20261112-policy`)
### 1) 프로그램 로직·기능
- 쇼츠 대본 분석 오류 문구가 「[설정 > YouTube API 키] 메뉴에서 AI 키를 등록해주세요」라고 안내하지만(`src/app/api/youtube/analyze-script/route.ts:31`), 이 프로그램 설정 화면에는 AI 키 입력 칸이 없고 메인 사이트 `/api-settings`에서 등록합니다. 영상 카드의 「API 키 등록하러 가기 →」도 `/settings`로 갑니다(`src/components/common/VideoCard.tsx:217`). 이번에 설정 화면에 메인 사이트 링크를 넣어 한 번 더 이동하면 되지만, 오류 문구 자체를 「메인 사이트 API 설정에서 Gemini 또는 OpenAI 키 등록」으로 바꾸는 편이 정확합니다. 우선순위 중간. 상태: 제안.
- 보관함 30일 정리가 관리자·시험 계정(`profiles.retention_exempt`)을 빼지 않습니다 — DB 정리 함수가 모든 행을 지우고(`supabase/migrations/20261017025253_yvs_member_favorites.sql:28`), 조회도 30일 이내만 보여 줍니다(`src/app/api/favorites/route.ts:14`). 우선순위 중간(2026-11-03 주인님 지시: 두 계정은 모든 프로그램에서 30일 열외). **상태: SQL 작성, 적용 대기 + 조회 코드 이번에 고침(미배포)**(2026-11-13) — `supabase/migrations/20261113120000_yvs_favorites_retention_exempt.sql`(정리 함수·조회 정책에서 예외 회원 제외, 운영 DB 미적용), `src/app/api/favorites/route.ts`·`src/components/favorites/FavoritesProvider.tsx`·`src/app/(dashboard)/favorites/page.tsx`가 예외 회원은 30일 지난 자료도 숨기지 않음(`src/lib/retentionExempt.ts`).
### 2) 화면·가독성·사용 편의
- 설정 화면의 AI 엔진 칸이 Claude 키만 쓰는 것처럼 적혀 있었습니다(실제는 대본 분석 Gemini/OpenAI, 채널·키워드 분석 세 엔진 — `src/app/api/youtube/analyze-script/route.ts:25-26`, `src/lib/ai/models.ts`). 상태: 이번에 고침(미배포).
- 설정 화면 맨 위 제목이 「보안 키 금고 (Security Key Vault)」라 좌측 메뉴 이름 「API키등록·플랫폼연동」과 다릅니다. 공통 표준 이름에 맞추면 찾기 쉽습니다. 우선순위 낮음. 상태: 제안.
### 3) 다른 자동화 프로그램과 연계
- 「🎬 이 대사로 쇼츠 만들기」로 AI 쇼츠 원스톱 `/topic`에 대사를 넘기는 연계는 이미 있습니다(`src/components/ai/AiPanels.tsx:140`, `src/components/analysis/ScriptAnalysisModal.tsx:284`). 매뉴얼이 이 버튼 이름과 달랐던 것을 이번에 맞춤.
- 「협업 크리에이터 찾기」 결과(공개 연락처)를 메일·알림 발송 프로그램으로 넘기는 흐름은 아직 없습니다. 마케팅 수집 예외 지정 여부부터 확인해야 하므로 아이디어로만 남깁니다. 상태: 제안(미확인).
### 4) 매뉴얼과 실제 기능의 차이 (이번에 고친 것 / 남은 것)
- 이번에 고침(미배포): 매뉴얼에 키 등록부터 메뉴별 사용 순서까지의 「처음 시작하기」가 없었음 → 추가 / FAQ 6의 「'쇼츠 영상 제작하기 ➔' 버튼·킬러 훅과 씬별 대본·1분 만에 1080×1920」은 실제와 달라 「🎬 이 대사로 쇼츠 만들기」·대사 전달로 정정 / AI 키 종류, 보관함 30일·1,000개 질문 추가.
- 남은 것: 매뉴얼 헤더 「유튜브 황금 법칙 브리프」와 3단계 인포그래픽의 「VPH 5배」「20~50배」 같은 수치는 화면 필터 기본값과 대조하지 못했습니다(미확인). 매뉴얼에 「내 채널 진짜 지표」 쪽 매뉴얼(1c4181ac) 링크는 설정 화면에만 넣었습니다.
### 5) 정책 점검 (`node scripts/pending-check.mjs youtube-viral-studio`)
- 저작권 고지: 경고 없음.
- 저장공간 위젯 한 줄 미적용 — 다음 배포 때 레이아웃에 함께. 상태: 대기.
- 범위 없는 `signOut()` 2곳(`src/app/api/auth/logout/route.ts:6`, `src/lib/actions/auth.ts:43`) — `signOut({ scope: "local" })`로. 상태: 대기.
- 서버 로그인 기기 정보 미전달 — 서버용 Supabase 클라이언트에 `global.headers["User-Agent"]`. 상태: 대기.
- 30일 정리 예외 회원: 위 1) 두 번째 항목 → SQL 작성, 적용 대기 + 조회 코드 이번에 고침(미배포).

## 2026-11-16 영상 담당께 — boks-youtube-finder 기능 병합 (분석 세션 `claude-win-20261116-boks-yt`)

- 주인님 지시로 외부 오픈소스(MIT) 분석 완료, 영상 담당에게 구현 배정. 상태: **구현 전 — 플랜·결정 먼저**.
- 넣을 것(본체): 채널 평소 조회수 중앙값 기준 떡상 판정, 관련성·종교 필터, 형식별 버킷 검색, 인기 차트 프리셋, 기회 지수·산점도·제목 키워드 TOP·트렌드 결론(요일·시간대 — 대시보드 문구만 있고 코드 없던 것 해소), 키별 하루 사용량 누적·차단, 근거 수치 기반 AI 기획안.
- 함께 해결: 쇼츠 길이 기준 60·90·180초 혼재 → 통일 여부 결정. 위 #8(검색 결과 임시 저장)·#9(정렬 토글)와 겹침.
- 인수인계: [`HANDOFF_20261116_BOKS_FINDER_PORT.md`](HANDOFF_20261116_BOKS_FINDER_PORT.md) · 분석: [`ANALYSIS_20261116_BOKS_YOUTUBE_FINDER.md`](ANALYSIS_20261116_BOKS_YOUTUBE_FINDER.md)

### 2026-11-20 미배포 대기 — 2단계 2-1 첫 단위: 관련성·언어·종교 거르기 기준 모듈 분리 (영상 담당 `claude-win-video`, MOV-VIDEO-VIRAL-PHASE2-SCOPE A2)
- `src/lib/youtube/boks/core.ts`의 `relevanceIssue`·`languageMismatch`·`isReligious`·`isReligiousQuery`와 보조 함수를 **그대로** 새 파일 `src/lib/youtube/relevanceFilter.ts`로 옮기고, core.ts는 같은 이름으로 다시 내보냄 → 동작·YouTube 호출 수 변화 0. 입력 타입 `RelevanceInput`만 `RawFinderVideo`에서 뽑던 것을 같은 필드의 독립 정의로.
- 시험: `tests/relevanceFilter.test.mjs` 새 5개 + 기존 `boks.test.mjs` 11개(시험에서만 확장자 없는 경로를 `.ts`로 찾게 `registerHooks` — creatorFinder 시험과 같은 방식) 통과, `tsc --noEmit` 통과. 전체 71 중 67 통과·실패 4는 기존 `favorites.test.mjs`(11-16 기록, 정책 담당 몫).
- 배포: 동작 변화가 없어 다음 YVS 배포 때 함께(버전은 그때 +0.01). 공용 등록·SVS 연결은 별도 배정.
- **미배포 대기(2026-11-20, MOV-SVS-YVS-LOCAL-DEPS)**: Next.js 보안 업그레이드 `next`·`eslint-config-next` `16.4.2` → `16.4.6`(고정값 유지, `package.json`·`package-lock.json`만, 커밋 `77987f7f2`). 내 PC `npm run build` exit 0(`SecurityFatalError` 정지 해소)·`tsc` 0·단위 시험 67/71 — 실패 4건은 기존 `tests/favorites.test.mjs`(업그레이드 전과 동일, 정책 담당 `0a91cba19` 원인, 이번 변경과 무관)라 별도 처리. 맥미니 정적 검수 PASS. 운영 배포·Vercel 빌드 미실행 — 다음 YVS 배포 때 함께.

### 2026-11-16 처리 결과 (영상 담당 `video`, 세션 `claude-win-video`) — **미배포 대기(v1.30 예정)**
- 주인님 결정(채팅 선택): 1단계만 · 평소 대비 중앙값을 기본 배수로 · 쇼츠 180초 통일 · 종교 기본 제외 · DB 표 2개 승인 · AI 기획안은 별도 버튼. 플랜: [`PLAN_20261116_BOKS_FINDER_PORT.md`](PLAN_20261116_BOKS_FINDER_PORT.md)
- 새 메뉴 「떡상 시장 탐색」(`/viral-finder`): 키워드 검색(형식별 버킷·보충) / 인기 차트 프리셋 6종(검색 횟수 0), 평소 대비 판정, 관련성·언어·종교 거르기와 제외 사유, 기회 지수, 제목 키워드 TOP(누르면 목록 거름), 산점도(SVG), 자동 결론, 요일·시간대·길이·채널 규모·제목 패턴 차트, 태그 TOP 복사, 목록 필터·정렬, 회원 본인 Claude 키 AI 기획안(JSON 검증).
- 원본 이식: `src/lib/youtube/boks/{core,trends,quota,plan,search}.ts`, 출처 주석 + `NOTICE.md`(MIT). HTTP는 공용 `youtubeData.ts` 경유.
- 기존 화면: 「쇼츠 떡상 트리거」 배수를 평소 대비로(모르면 구독자 대비, 카드에 「평소대비/구독대비」 표시), 쇼츠 판정 180초 통일(`metrics.ts` 2곳·`trendingVideos.ts`·`viralShorts.ts`·`sourceFinder.ts`), 대시보드 키워드 분석 카드의 「요일/시간대」 문구 정정 + 새 카드.
- 시험: `node --test tests/boks.test.mjs` 11/11, 기존 시험 합계 62/66(아래 보관함 4건은 원래부터 실패), `tsc` 통과, `npm run build` 통과. 화면: 합성 데이터 검수 장치(`node tests/finder-fixture-serve.mjs`)를 ego lite로 1440·375px 확인 — 가로 넘침 0, 외부 호출 0, 증거 `docs/evidence/v130/`.
- **남은 것**
  - DB SQL 적용 대기: `supabase/migrations/20261116120000_yvs_viral_finder_usage_cache.sql`(이 세션에는 운영 DB DDL 도구가 없음). 적용 전에도 화면은 동작하고 사용량 누적·미리 막기·채널 24시간 캐시만 빠짐.
  - 실제 YouTube 키로 운영 화면 검수(시험 계정 로그인 필요, 검색 1회 약 300~600유닛 + 평소 조회수 50~80유닛), AI 기획안 실호출 1회(가장 저렴한 Claude 모델, 실행 전 승인).
  - 매뉴얼(`/guide`)에 새 메뉴 설명 추가 — 다음 손볼 때.
  - `youtubeData.ts` 머리 주석의 기준 프로그램 표기(옛 consultant) 정정 — 고치면 다른 담당 사본 5곳이 함께 바뀌므로 다음 공용 모듈 수정 때 묶어서.
  - 2·3단계(쇼츠 공식 분석기·사본 4곳 검색 품질, 썸네일·원스톱 연결)는 별도 배정.
- **발견(다른 세션 몫)**: `tests/favorites.test.mjs` 4건 실패 — 커밋 `0a91cba19`(정책 담당)가 보관함 API에 `isRetentionExempt`(profiles 조회)를 넣었는데 시험의 가짜 DB가 `profiles`를 모름. 시험 가짜 DB에 `profiles` 응답 추가 필요. 정책 담당께. **→ 처리함(2026-11-20, 영상 담당 `claude-win-video`)**: `tests/favorites.test.mjs` 가짜 DB에 `profiles.retention_exempt` 응답 추가 + 예외 회원은 30일 지난 자료가 보이고 저장 때 지워지지 않는 시험 1개 추가 → 보관함 시험 9/9, 전체 72/72. 소스 변경 없음(시험만, 배포 불필요).

### 2026-11-16 v1.30 운영 배포 (영상 담당)
- 주인님 「유튜브 떡상 분석 v1.30 배포 진행해」 → 빌드 1회 `youtube-viral-studio-i71hni371`(`dpl_6ZW5BA88C1vb6cfUtmUY2u5QcJR3`) Ready, 운영 https://youtube-viral-studio.buylife.xyz , DB `programs.version` v1.29→v1.30, 프로그램 비교표 버전 갱신. 커밋 `87ebcae7d`(기능) + `1fe195bdf`(버전·저장공간 위젯·로그아웃 local·서버 User-Agent — `pending-check` 대기 0).
- 운영 확인: 비로그인 `/viral-finder` → 로그인으로 이동(307), `/api/youtube/viral-finder`·`/api/ai/viral-plan` 401. ego lite 로그인 화면에서 v1.30·새 메뉴·위젯 스크립트 확인.
- **미검수**: ego에 로그인된 계정이 관리자 계정이라 시험 계정 규칙대로 실제 YouTube 검색·차트 실행은 하지 않음 → 시험 계정(`buylifemall@naver.com`)으로 다시 로그인되면 인기 차트(검색 횟수 0, 약 80유닛) → 키워드 검색 순서로 확인. AI 기획안 실호출 1회는 그 뒤 승인 받아서.
- DB SQL 적용 대기 그대로(요청함 DB 항목).
