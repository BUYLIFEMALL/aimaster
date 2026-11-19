# MOV-VIDEO-VIRAL-PHASE2-SCOPE 결과 — 떡상 분석 2단계 첫 독립 단위 범위 — Claude(Movie) `claude-win-video` [역할: video]

| 항목 | 값 |
|---|---|
| 작업 / 시도 / 계획 / 배정 | MOV-VIDEO-VIRAL-PHASE2-SCOPE / A1 / P9 / 1 |
| CAT / ROLE / WORKSPACE | 유튜브(영상) / CC-MOVIE-01 / 등록된 기존 AIMaster 세션(메인 윈도우 `D:\AIMaster`) |
| 허용 경로 | `youtube-viral-studio` 2단계 범위와 기존 검수 근거 읽기(이 문서) |
| 기준 / 검수 | c6cc58891 / CX-MASTER-01 |
| 제출 상태 | ready_review |

## 1. 1단계 수락 근거
| 근거 | 위치 @SHA | 내용 |
|---|---|---|
| 플랜·주인님 결정 | `youtube-viral-studio/docs/PLAN_20261116_BOKS_FINDER_PORT.md` @87ebcae7d | 1단계(YVS 본체)만 먼저, 2단계(SVS·사본)·3단계(썸네일·원스톱 연결)는 1단계 뒤 |
| 구현·시험 | 같은 폴더 `docs/IMPROVEMENTS.md` @86dc04259(2026-11-16 처리 결과) | `src/lib/youtube/boks/{core,trends,quota,plan,search}.ts` 이식, `node --test tests/boks.test.mjs` 11/11, tsc·build 통과, 합성 데이터 화면 검수 |
| 배포 | 같은 문서 「v1.30 운영 배포」 | 커밋 `87ebcae7d` + `1fe195bdf`, 빌드 `youtube-viral-studio-i71hni371` Ready, DB v1.30 |
| DB·운영 확인 | `docs/roles/video.md` @8d3f0b005 「대기 중」 첫 줄 | DB 2표 운영 적용·읽기 확인(11-17, 요청함 1c7b6dda), 실제 검색·AI 기획안 운영 확인(11-18) → 「1단계 검수 완료」 |

→ 1단계는 배포·DB·운영 확인까지 닫혀 있고, 2단계는 별도 배정 대상으로만 남아 있습니다.

## 2. 2단계 원래 범위와 이번에 고른 첫 단위
원래 2단계(`docs/HANDOFF_20261116_BOKS_FINDER_PORT.md` @51773b558 §2): `shorts-viral-studio`(SVS) + 쇼츠 사본 4곳(`threads-content-ops`·`ai-auto-blog`·`tistory-auto-blog`·`naver-blog-agent`)에 관련성·종교 거르기, (선택) 평소 조회수 중앙값 판정 — 공용 기준 코드로 등록 후 사본으로.

| 후보 | 새 호출 | 1단계와 겹침 | 판정 |
|---|---|---|---|
| **2-1 관련성·언어·종교 거르기를 공용 기준 코드로 떼어 SVS에 적용** | **0** — SVS는 이미 `videos.list part=snippet,statistics,contentDetails`(`shorts-viral-studio/src/lib/youtube/api.ts` @237741cc3 42~78줄)로 제목·설명·태그·음성 언어를 받고 있어, 받은 결과를 거르기만 함 | 없음(1단계 함수는 그대로, 위치만 공용 파일로) | **첫 단위로 추천** |
| 2-2 평소 조회수 중앙값 판정을 SVS에 | 있음 — 채널당 `playlistItems`+`videos` 약 +50~80유닛, 캐시 표 필요 | 1단계 캐시 표 재사용 여부 결정 필요 | 2-1 뒤, 별도 승인 |
| 2-3 사본 4곳 적용 | 0 | — | 각 담당 몫 — `IMPROVEMENTS.md` 「담당께」 요청만 |

## 3. 첫 단위 2-1 범위
### 3-1 바꿀 파일
| 파일 | 내용 |
|---|---|
| `youtube-viral-studio/src/lib/youtube/relevanceFilter.ts`(새, **공용 기준**) | `boks/core.ts` 202~365줄의 `relevanceIssue`·`languageMismatch`·`isReligious`·`isReligiousQuery`와 보조 함수·정규식을 그대로 옮김(출처 주석·MIT 그대로). 입력 타입을 `RawFinderVideo`가 아닌 최소 구조 `{title, channelTitle, description, tags, defaultAudioLanguage, defaultLanguage}`로 |
| `youtube-viral-studio/src/lib/youtube/boks/core.ts` | 위 함수들을 지우고 새 파일에서 다시 내보냄(`export { … } from "../relevanceFilter"`) — **동작 변화 0** |
| `youtube-viral-studio/tests/relevanceFilter.test.mjs`(새) | 도배·언어·무관·종교·종교 검색어 자동 해제 |
| `shorts-viral-studio/src/lib/youtube/relevanceFilter.ts`(사본, `--sync`로만) | — |
| `shorts-viral-studio/src/lib/youtube/api.ts` | `searchShorts`에서 `videos.list` 결과를 지표 계산 전에 거름. 검색어·`relevanceLanguage:"ko"`(이미 고정값) 사용. 돌려주는 값에 제외 수(사유별)를 덧붙임 |
| `shorts-viral-studio/src/lib/actions/svs.ts`·검색 화면 | 「종교 영상 제외」 토글(기본 켬, 검색어가 종교 단어면 자동 해제 — 1단계 주인님 결정 4), 「제외 N건(도배 a·다른 언어 b·무관 c·종교 d)」 한 줄 |
| `shorts-viral-studio/tests/relevance.test.mjs`(새) | 가짜 `videos.list` 응답으로 거르기·제외 수 |
| 공용 등록 `docs/SHARED_MODULES.md`·`scripts/check-shared-modules.mjs` | 모듈 `youtube-relevance-filter`(기준 YVS, 사본 SVS) — **공용 파일이라 Master 점유 필요** |
| 사본 4곳 담당 프로그램 `docs/IMPROVEMENTS.md` | 「영상 담당이 드림 — 필요하면 `--sync` 사본 추가」 요청 줄만(코드 편집 0) |
| 버전 | 배포 때만: SVS `src/lib/version.ts` v2.01→v2.02 + DB. YVS는 동작 변화 0이라 다음 YVS 배포 때 함께(미배포 대기) |

### 3-2 비용
| 항목 | 값 |
|---|---|
| YouTube 할당량 | 추가 0(이미 받은 결과를 거름) |
| AI | 0 |
| DB | 변경 0 |
| Vercel 빌드 | 구현·시험 단계 0. 배포 시 SVS 1회(그때 사전 승인) |

### 3-3 인수 조건
| # | 조건 | 확인 방법 |
|---|---|---|
| 1 | YVS 동작 변화 0 | 기존 `tests/boks.test.mjs` 11/11 그대로 통과, `tsc` 통과 |
| 2 | 새 공용 함수 시험 | `node --test youtube-viral-studio/tests/relevanceFilter.test.mjs` — 도배(해시태그 위주) → spam, 한글 거의 없음 → language, 검색어와 무관 → offtopic, 종교 단어 → 제외, 종교 검색어 → 자동 해제 |
| 3 | 사본 일치 | `node scripts/check-shared-modules.mjs` 전부 OK |
| 4 | SVS 거르기 | `node --test shorts-viral-studio/tests/relevance.test.mjs` — 가짜 응답 10개 중 도배·외국어·종교 각 1개 → 7개 남음·제외 수 3(사유별), 토글 끄면 종교 1개 다시 포함 |
| 5 | 호출 수 그대로 | 같은 시험에서 가짜 `ytFetch` 호출 횟수가 바꾸기 전과 같음(search 1·videos 1·channels 1) |
| 6 | 빈 결과 | 모두 걸러지면 「조건에 맞는 쇼츠가 없습니다 — 제외 N건」, 오류로 보이지 않음 |
| 7 | 타입·빌드 | 두 프로그램 `tsc`, SVS `npm run build`(로컬, 무료) |
| 8 | 화면(배포 뒤, 별도 승인) | ego, 시험 계정 본인 YouTube 키로 검색 1회(약 102유닛)·제외 줄 표시 — 이번 단위의 완료 조건에는 넣지 않음 |

### 3-4 실행 금지 범위
- 운영 YouTube 호출·AI 호출·배포·DB 변경(위 8은 배포 승인 뒤 별도).
- 사본 4곳(`threads-content-ops`·`ai-auto-blog`·`tistory-auto-blog`·`naver-blog-agent`) 코드 편집 — 요청 줄만.
- 평소 조회수 중앙값(2-2)·3단계 연결(썸네일·원스톱)·YVS 화면 변경.
- 공용 등록 파일은 Master 점유 배정 전에 고치지 않음.

## 4. 함께 지시받은 확인 — 낱말 시각 기록
- `shorts-onestop-studio/docs/IMPROVEMENTS.md` 5줄과 `docs/PLAN_20261111_WORD_TIMING_AFTER_WHISPER.md` 6줄이 「시험 계정으로 1회 시험 남음」으로 남아 통과 결과가 빠져 있었음(누락 확인) → 같은 커밋에서 이어 적음: 시험 계정·운영 v1.59·Gemini Flash-Lite 음성, 낱말 12/12, 모두 7.52초 안, 쉼 구간 대조 0.3초 이내(4.88초↔4.83초), 요청함 32673863 승인완료. 근거는 이전 대화 기록의 시험 보고(새 호출 0).

## 5. 판정
| 조건 | 판정 |
|---|---|
| 현재 1단계 수락 근거 | PASS(1절) |
| 2단계 첫 독립 구현의 파일·비용·인수 조건 | PASS(3-1~3-3) |
| 실행 금지 범위 | PASS(3-4) |
| 구현·운영 호출·빌드·배포 | NOT_RUN(범위 밖) |

- 실행: 파일 읽기·`git grep`·`git log -1 -- <경로>`(종료코드 0). 운영·AI·빌드·배포 0, 비용 0.
- 다음 역할: CX-MASTER-01이 2-1 배정(공용 등록 파일 점유 포함) → CC-MOVIE-01 구현·로컬 시험 → CX-QA-01 정적 검수 → SVS 배포 승인.
