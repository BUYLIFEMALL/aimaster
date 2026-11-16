# 인수인계 — boks-youtube-finder 기능 병합 (영상 담당께, 2026-11-16)

- 받는 사람: 영상 담당 `video` — Claude(Movie), 세션 `claude-win-video`
- 보낸 사람: 분석 세션 `claude-win-20261116-boks-yt` (주인님 지시로 분석만 함, 코드·DB 변경 없음)
- 상태: **분석 완료 · 범위 1차 정리 · 구현 전**. 플랜과 결정 항목을 주인님께 먼저 여쭌 뒤 구현한다(외부 소스 분석·이식 규칙 넷째).
- 분석 보고서(먼저 읽기): [`ANALYSIS_20261116_BOKS_YOUTUBE_FINDER.md`](ANALYSIS_20261116_BOKS_YOUTUBE_FINDER.md) — §0 프로그램별 적합성, §1 기능 18개 판정표, §2 이식 방식, §3 비용

## 1. 무엇을 하는가

외부 오픈소스 [boksajang/boks-youtube-finder](https://github.com/boksajang/boks-youtube-finder)(커밋 `3aacecf`, **MIT**, Electron 앱)의 떡상 판정·결과 걸러내기·시장 분석 로직을 **원본 코드 그대로 TypeScript로 옮겨** AIMaster 유튜브 프로그램에 넣는다. 새 프로그램은 만들지 않는다.

## 2. 범위 (분석 세션 권장안 — 주인님 최종 확인 필요)

| 단계 | 대상 | 넣을 것 |
|---|---|---|
| 1 (본체) | `youtube-viral-studio` | 평소 조회수 중앙값 판정, 관련성·종교 필터, 형식별 버킷 검색, 인기 차트 프리셋 확장, 기회 지수·산점도·제목 키워드 TOP·트렌드 자동 결론(요일·시간대 포함), 키별 하루 사용량 누적·차단, 근거 수치 기반 AI 기획안(회원 본인 Claude 키) |
| 2 (검색 품질만) | `shorts-viral-studio` + 쇼츠 사본 4곳(`threads-content-ops`·`ai-auto-blog`·`tistory-auto-blog`·`naver-blog-agent`) | 관련성·종교 필터, (선택) 평소 조회수 중앙값 판정 — 공용 기준 코드로 등록 후 사본으로. 사본 4곳은 **각 담당 세션 몫**이므로 직접 고치지 말고 그 프로그램 `docs/IMPROVEMENTS.md` 「○○ 담당께」로 요청 |
| 3 (연결만, 시점은 주인님 결정) | `thumbnail-master`, `shorts-onestop-studio` | YVS의 떡상 제목 패턴·키워드·태그 → 썸네일 SEO 참고 자료 / YVS 기획안 → 쇼츠 원스톱 「이 주제로 만들기」 |
| 제외 | `shots`·`playlist-channel-studio`·`youtube-auto-reply`·`lyric-video-studio`·`trending-product-finder` | 넣지 않음(이유: 보고서 §0-2) |

## 3. 플랜에서 주인님께 여쭐 결정 항목 (답을 받은 뒤 구현)

1. 위 범위(1단계 본체 / 2단계 검색 품질 / 3단계 연결)와 3단계 시점 — 이번에 함께 / 1단계 뒤
2. 떡상 기준: 평소 대비 중앙값을 기본 배수로 교체(권장) / 기존 구독자 대비 유지 + 열만 추가
3. 쇼츠 길이 기준 180초로 통일(권장) — 지금 YVS 안에서 60·90·180초가 섞여 있음(`src/lib/youtube/metrics.ts:19-23`, `viralShorts.ts:108`, `trendingVideos.ts:61,139`, `consultant/youtube/metrics.ts:21-22`)
4. 종교 영상 제외 기본값(원본은 켜짐)
5. DB 추가: 회원별 YouTube 사용량 표 + 채널 업로드 통계 캐시 표(회원 격리·RLS·30일 정리, `retention_exempt` 회원 제외)
6. AI 기획안: 기존 키워드 경쟁 리포트를 원본식 JSON 기획안으로 교체 / 별도 버튼 추가

## 4. 이식 방법

- 원본 받기: `git clone --depth 1 https://github.com/boksajang/boks-youtube-finder.git` — **저장소 밖 임시 폴더**에. 실행(`npm install`·`npm start`)하지 않고 읽기만.
- 옮길 원본 함수(대부분 순수 함수):
  - `services/youtube.js`: `computeChannelBaseline`, `fetchChannelUploads`, `buildVideos`, `searchYouTube`(버킷·보충 검색 부분), `fetchPopularChart`, `relevanceIssue`, `languageMismatch`, `isReligious`/`isReligiousQuery`, `computeMarketAnalytics`, `extractTitleKeywords`, `calculatePublishedRange`
  - `services/trends.js` 전체(`computeTrends`, `buildFindings`)
  - `services/usage.js`의 `quotaDay`·`nextResetMs`(저장은 파일 → DB로)
  - `services/ai-cli.js`의 `buildPrompt`·`PLAN_SCHEMA`·`normalizeReport`·`extractJsonObject`(실행 부분 `buildInvocation`·CLI 찾기는 옮기지 않음)
  - `renderer.js`의 `drawScatter`·`passesFilters`·`sortVideos`는 **로직만** 참고해 React로 다시 그림
- 둘 곳(제안): `youtube-viral-studio/src/lib/youtube/boks/*.ts`. API 호출은 원본 `apiGet` 대신 기존 공용 기준 코드 `src/lib/youtube/youtubeData.ts`를 거치게 바꾼다(쿼터 계측·오류 안내·재시도는 AIMaster 쪽이 더 상위 — 보고서 §1 #13).
- 옮긴 파일 머리 주석에 출처(저장소·커밋 `3aacecf`·원본 파일명), `youtube-viral-studio/NOTICE.md`에 MIT 문구(원본에 LICENSE 파일이 없으므로 README의 「MIT License © 2026 복사장 (Boksajang)」과 package.json `license: MIT`를 근거로 적음).
- 원본에 시험 코드가 없다 → 옮기면서 `tests/`에 판정·필터·기회 지수·키워드 추출·트렌드 시험을 새로 쓴다(기존 `tests/goldenEngine.test.mjs` 방식).
- 2단계에 갈 때 공용 기준 코드 등록: `youtube-relevance-filter`, `youtube-channel-baseline`(`docs/SHARED_MODULES.md`·`SHARED_FEATURE_MAP.md` 갱신, `node scripts/check-shared-modules.mjs --sync`).

## 5. 지켜야 할 규칙

- 회원 본인 YouTube 키(`user_api_keys` `youtube_api_key`)와 본인 Claude 키(`anthropic`)만 사용, 운영자 키로 대신 쓰지 않음.
- 새 API 라우트에는 `checkProgramAccessApi()` + `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`.
- 캐시는 회원(또는 키)별로 나눠 다른 회원 결과가 섞이지 않게.
- 쿼터: 평소 조회수 계산은 채널당 `playlistItems` 1 + `videos` 묶음 조회가 늘어남(50개 영상·채널 40개 기준 약 +50~80유닛). 채널 업로드 통계 24시간 캐시로 줄이고, 화면에 예상 사용량 표시.
- 0번 규칙: 시작할 때 `node scripts/apply-source-notice.mjs --check youtube-viral-studio`.
- 배포는 작은 수정 모아서, 빌드 전 비용 승인, 한 번에 하나씩. 버전 +0.01(`src/lib/version.ts` + DB `programs.version`).
- 저장공간 위젯 한 줄(`storage-widget.js`)이 빠져 있으면 다음 배포 때 함께.
- 시험 유료 호출은 가장 저렴한 모델·최소 횟수, 실행 전 승인.

## 6. 알아 둘 점 (분석 중 발견)

- YVS 대시보드 키워드 분석 설명에 「최적 게시 요일/시간대」가 적혀 있으나 계산 코드가 없다(`src/app/(dashboard)/dashboard/page.tsx:61`) → 1단계 트렌드 이식으로 해소.
- `youtubeData.ts:5`·`goldenEngine.ts:5` 머리 주석의 기준 프로그램이 아직 `youtube-channel-consultant`로 적혀 있다(문서상 기준은 2026-10-20부터 YVS) — 손댈 때 고치기.
- `shorts-viral-studio` 버전은 코드 `v2.01`, 프로그램 비교표는 `v2.0`.
- 외부 프로그램 개발분석표(`docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md`)에 이 원본 카드가 아직 없다 — 플랜 확정 때 카드 추가(유튜브 분야 첫 「떡상 탐색류」 카드).

## 7. 다음 첫 단계

1. `docs/ACTIVE_WORK.md`·`git status --porcelain -- youtube-viral-studio` 확인 후 내 줄 등록
2. 분석 보고서와 이 문서 읽기 → 원본 내려받아 §4 함수 확인
3. `docs/PLAN_20261116_BOKS_FINDER_PORT.md` 작성(원본/AIMaster/채택·이유 표 + §3 결정 항목 + 비용) → 주인님께 보고·결정 받기
4. 결정 뒤 1단계부터 구현 → 시험 → 미배포 대기 또는 승인 배포 → 프로그램 비교표·역할 파일·HANDOFF 갱신
