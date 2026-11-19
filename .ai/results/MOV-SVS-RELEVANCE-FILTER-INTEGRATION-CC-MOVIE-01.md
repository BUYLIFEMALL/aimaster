# MOV-SVS-RELEVANCE-FILTER-INTEGRATION 결과 — 쇼츠 분석기 검색에 관련성·언어·종교 거르기 연결 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-SVS-RELEVANCE-FILTER-INTEGRATION / A1 / P9 / 1 |
| CAT / ROLE / WORKSPACE | 유튜브(영상) / CC-MOVIE-01 / 등록된 기존 AIMaster 세션(메인 윈도우 `D:\AIMaster`) |
| 허용 경로 | `shorts-viral-studio` 관련성 필터 연결·시험 + 공용 등록 두 파일의 해당 항목 |
| 기준 / 검수 | b40b18f37 / CX-QA-01 |
| 점유 | 등록 `2792d3396` → 해제(이 결과와 같은 시점) |
| 결과 SHA | 코드·등록 스크립트 `929ff67bb`(9파일) · 공용 문서 `089ca9e02`(1파일), 미푸시 |
| 제출 상태 | ready_review |

## 1. 바꾼 것
| 파일 | 내용 |
|---|---|
| `scripts/check-shared-modules.mjs` | `youtube-relevance-filter` 한 항목(기준 `youtube-viral-studio/src/lib/youtube/relevanceFilter.ts`, 사본 `shorts-viral-studio/src/lib/youtube/relevanceFilter.ts`) |
| `docs/SHARED_MODULES.md` | 등록 표에 같은 한 줄(쇼츠 사본 4곳은 각 담당 결정으로 적음) |
| `shorts-viral-studio/src/lib/youtube/relevanceFilter.ts`(새) | `--module youtube-relevance-filter --sync`로만 생성, 기준과 바이트 동일 |
| `shorts-viral-studio/src/lib/youtube/shortsSearch.ts`(새, 순수) | 검색 순서 `runShortsSearch(params, call)` + `filterShortsItems` + `describeExcluded`·`excludedTotal`. 검색 조건 값은 옛 `searchShorts`와 동일 |
| `shorts-viral-studio/src/lib/youtube/api.ts` | `searchShorts`가 `runShortsSearch(params, ytFetch)`만 호출(50줄 → 3줄), 반환 `{videos, excluded}` |
| `shorts-viral-studio/src/lib/actions/svs.ts` | `searchShortsAction` 반환 타입 `SearchShortsResult`, `includeReligion`은 `true`일 때만 켬 |
| `shorts-viral-studio/src/types/svs.ts` | `SearchParams.includeReligion?`, `SearchExcluded`, `SearchShortsResult`, 프로젝트 `search.includeReligion?`(선택 — 옛 프로젝트 그대로 열림) |
| `shorts-viral-studio/src/components/studio/SearchStep.tsx` | 「종교 영상 제외」 토글(기본 켬), 결과 머리 「· 제외 N건(…)」, 다 걸러지면 「조건에 맞는 쇼츠가 없습니다 — 제외 N건(…). 검색어를 바꾸거나 「종교 영상 제외」를 꺼 보세요.」, 안내 문구 한 줄 보강 |
| `shorts-viral-studio/tests/relevance.test.mjs`(새) | 국소 모의 시험 6개 |
| `shorts-viral-studio/docs/IMPROVEMENTS.md` | 맨 위 미배포 대기 기록 |

## 2. 인수 조건별 판정
| 조건 | 판정 | 근거(명령 · 종료코드) |
|---|---|---|
| 기준 파일·SVS 사본 일치 | PASS | `node scripts/check-shared-modules.mjs --module youtube-relevance-filter` → `OK` · 0, 전체 `node scripts/check-shared-modules.mjs` → 「모든 사본이 기준과 같고…」·불일치 0 · 0, `cmp` 동일 |
| 호출 수 불변 | PASS | `tests/relevance.test.mjs` 「호출 수 그대로」: 순서 `search·videos·channels` 각 1회, `search` 조건 객체가 옛 값과 완전히 같음(`regionCode KR`·`relevanceLanguage ko`·`videoDuration short`·`maxResults 50`), 채널 조회 id는 남은 7개 영상 채널만. 다 걸러지면 `channels` 0회, 결과 0개면 `search` 1회만 |
| 토글 | PASS | 같은 시험: `includeReligion: true` → 8개(종교 0 제외), 검색어 「찬양」이면 토글 꺼도 종교 영상 남김 |
| 제외 수 | PASS | 같은 시험: 10개 → 7개, `{spam:1, language:1, offtopic:0, religion:1}`, 문구 「제외 3건(해시태그 도배 1 · 다른 언어 1 · 종교 1)」 |
| 빈 결과 | PASS | 같은 시험: 다 걸러지면 `videos: []` + 제외 2(오류 아님), 결과 0개면 제외 0·문구 없음. 화면 문구는 코드 대조 |
| 국소 모의 검수 | PASS | `node --test tests/relevance.test.mjs` 6/6 · 0, 기존 `npm test`(access·youtubeData) 17/17 · 0, `npx tsc --noEmit -p .` · 0. 기준 쪽 `youtube-viral-studio` `boks`+`relevanceFilter` 16/16 · 0 |

## 3. 지킨 범위
- 다른 사본(threads-content-ops·ai-auto-blog·tistory-auto-blog·naver-blog-agent) 0, 즐겨찾기 정책 0, 새 외부 호출 0, 새 의존성 0(`esbuild`가 SVS에 없어 설치 대신 검색 순서를 순수 함수로 분리해 가짜 호출로 시험), 빌드·배포·push 0, 운영 호출 0, 비용 0.

## 4. 미확인·남은 일
- `npm run build`(Next 번들, 클라이언트 화면이 `shortsSearch.ts`를 불러 거르기 정규식이 화면 묶음에 들어가는 크기 영향) — 배정상 빌드 제외, 다음 SVS 배포 전 로컬 확인.
- 실제 화면(토글·제외 줄)과 실제 YouTube 응답 — 배포 뒤 시험 계정 본인 키로 검색 1회(약 102유닛).
- 기준 파일 머리 주석의 「다른 프로그램 사본·공용 등록은 아직 하지 않음(별도 배정)」 한 줄은 이번 등록으로 낡음 — 기준 파일(YVS)은 이번 허용 경로가 아니라 고치지 않음. 다음 기준 수정 때 함께 고치고 `--sync`.
- 작업 중 셸이 템플릿 문자열의 백틱을 명령으로 해석해 `SearchStep.tsx` 한 줄이 비었던 것을 곧바로 발견해 고침(커밋 전, 최종 diff로 확인).

## 5. 다음 역할
CX-QA-01 국소 검수 → CX-MASTER-01 판정 → SVS 다음 배포 묶음(빌드 1회 승인 필요, 버전 v2.01→v2.02).
