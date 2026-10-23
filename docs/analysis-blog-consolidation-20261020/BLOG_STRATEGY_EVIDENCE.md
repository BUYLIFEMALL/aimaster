# 키워드·SEO·작업실 근거

기준 커밋 `cde4c6fa`. 상세 기능은 화면 이름이 아니라 아래 코드의 입출력으로 판정했습니다.

| 대상 | 근거 | 확인 내용·한계 |
|---|---|---|
| 키워드 버전 | `blog-keyword/src/lib/version.ts:1` | v1.05 |
| 기능 9종 | `blog-keyword/src/lib/kw/types.ts:3`, `:29` | 자동완성·연관어·상위 블로그·경쟁력·오늘 전략·다각도·뉴스·트렌드·프롬프트 50개. 완성형 글/이미지/발행 도구는 아님 |
| 실측·AI 추정 분리 | `blog-keyword/src/lib/kw/features.ts:41`, `:163` | 검색광고 PC/모바일 검색수, 검색 API 문서수, DataLab 상대 추이와 AI 기회점수 분리. 키/권한·실측 응답이 없는 값은 비어 있거나 notes 안내 |
| ‘상위 블로그’ 범위 | 같은 파일 `:139` | 검색 API 10건의 제목/링크/요약을 AI에 전달. 전체 본문·이미지 개수까지 크롤링한 분석은 아님 |
| 그라운딩 | `blog-keyword/src/lib/gemini.ts:55`, `:68`, `:74` | 일부 기능에서 googleSearch와 출처를 받음. 출처가 있다는 사실만으로 답변의 모든 주장이 검증된 것은 아님 |
| 공급사 | 같은 파일, `src/lib/kw/features.ts:18` | 키워드 AI는 Gemini 중심. 올인원 3공급사 선택과 다름. 본인 키 없이 운영자 키로 바꾸는 경로로 이식 금지 |
| 저장/보관 | `blog-keyword/src/lib/reports.ts:6`, `:24`, `:38` | 본인 기록, 일반 100건 초과 정리, 즐겨찾기 제외. 개수 정리는 30일 만료와 다름. 이 파일에 날짜 만료 필터는 없음 |
| SEO 버전 | `naver-blog-seo-studio/lib/version.ts:5` | v1.80. AGENTS 상단 v1.61·옛 README 특정 기능 버전은 최신 앱 전체 버전이 아님 |
| 신작·리뉴얼 3종 | `naver-blog-seo-studio/README.md` 「기존 글 최적화 3가지 모드」, `app/api/drafts/optimize/route.ts:12`, `analyze/route.ts:11`, `extract/route.ts:109` | 내 글 의미 보존 편집, 붙여넣기 분석 후 새 구성, 공개 URL 추출 후 재작성. URL 추출과 사실의 최신성 확인은 다름 |
| 개인 경험/FAQ | `naver-blog-seo-studio/app/api/drafts/generate/route.ts:20`, `lib/ai/generator.ts:80` | 경험 메모, 페르소나, 문체, FAQ. 제공 자료 없이 최신 사실을 지어내지 말고 확인 필요 표시를 요구 |
| 목표 분량 | `naver-blog-seo-studio/lib/ai/generator.ts:107` | 권장 2,000~3,500자, 짧으면 최대 2회 보강. 실제 1,500자 이상은 lengthNotice와 저장 허용. 옛 README의 ‘2천자 미만 무조건 거절’과 차이 |
| 무료 점검 | `naver-blog-seo-studio/lib/seoQuality.ts:23`, `:69`, `:88` | 키워드·분량·문단·확인 필요·상투어·FAQ·이미지 규칙과 빈출어. 네이버 공식 SEO 점수/노출 확률이 아님 |
| 이미지 위치 편집 | `naver-blog-seo-studio/README.md` 「선택형 3장·4장 이미지와 블로그(원문) 편집기」, `lib/ai/contentVisuals.ts` | 본문 핵심 문장 기준 이미지 배치·순서 변경·개별 재생성. 대표/본문 3~4장 중심 워크플로우 |
| 보관·이미지 | `naver-blog-seo-studio/lib/draftRetention.ts:30` | 생성일 30일 기준 초안/제목 기록, 관련 이미지 경로 정리. 운영 cron 실행 이력은 이번 미조회 |
| 작업실 버전 | `blog-workroom/src/lib/version.ts:2` | v1.11. AGENTS 첫 줄 v1.06은 옛 설명, 아래 변경 이력과 코드가 최신 |
| 내 문체 | `blog-workroom/src/lib/actions/style.ts:14`, `:34`, `:46` | 내 RSS/본문 또는 표본→문체·구조·독자·표현 분석→승인. 일반 페르소나 선택보다 개인화 수준이 높음 |
| 벤치마킹 | `blog-workroom/src/lib/actions/bench.ts:35` | 상대 블로그 RSS 10개와 본문 3개를 읽고 패턴/키워드를 분석. 검색 API 제목/요약만 보는 분석과 구분 |
| 근거 자료 | `blog-workroom/src/lib/actions/research.ts:23`, `:41` | 블로그 5건·뉴스 5건, AI가 내놓은 근거 구절이 실제 자료에 있는지 확인, 원문 연속 25자 복제 의심을 걸러냄. 25자는 간이 유사도 기준이며 권리 판단/완전한 표절 검사 아님 |
| 단계별 저장 | `blog-workroom/src/lib/actions/write.ts:23`, `:38` | 자료 승인 후 구성, 구간별 생성/저장, 중지 후 남은 구간 이어쓰기 |
| 최종 게이트 | 같은 파일 `:56`, `:70` | 검수 인용이 본문에 실제 있는지, 검수 중 수정 여부·해시 일치·필수 수정 0개·확인란을 검사. 원문 사실을 전부 증명하는 시스템은 아님 |
| 이미지 노드 | `blog-workroom/src/lib/actions/image.ts:18`, `:38` | 대표+본문 5~10 노드, 공통 참고 이미지 최대 10장, 한 노드씩 생성/실패 저장. `/images`에서 글을 붙여 넣는 독립 단계 |
| 저장/공개 URL | `blog-workroom/src/lib/store.ts:16`, `:32`, `src/lib/actions/image.ts:57` | 본인 user_id 조회·종류별 개수 제한. 공개 URL 반환 경로가 있으며 store에는 30일 날짜 필터가 없음. 운영 정책 확인 필요 |

## 이번 검사 범위

- `naver-blog-seo-studio`: `node --test tests/seo-quality.test.mjs` **7/7 통과**. 점검 규칙/전략 목록 회귀 검사, 유료 호출 없음.
- 올인원·작업실의 정식 tsx 테스트 실행은 이 제한 환경에서 `uv_os_get_passwd ENOMEM`으로 테스트 로더가 시작되지 않았습니다. 앱 로직 결함으로 판정하지 않습니다.
- tsx 없이 작업실/키워드 테스트를 직접 실행하면 각각 `@/lib` 별칭·확장자 없는 import를 해석하지 못했습니다. 대체 검사가 통과했다고 보고하지 않습니다. 원본 테스트나 설정을 수정하지 않았습니다.
- 따라서 문서에 기록된 과거 31개/9개/13개 통과와 이번 실행 결과는 구분합니다. 전체 앱 빌드·일반 회원 E2E·실측 API 호출은 이번 미실행입니다.

## 공식 문서와 수치 해석

- DataLab ratio는 해당 조회 결과 안에서 최대를 100으로 한 상대값입니다. 월간 검색 횟수와 동일하지 않습니다. [네이버 통합 검색어 트렌드 공식 문서](https://developers.naver.com/docs/serviceapi/datalab/search/search.md).
- 블로그 검색 API는 sim/date 정렬의 검색 결과와 total을 반환합니다. 프로그램에서 이를 별도로 측정하지 않은 개인화 통합검색 노출 순위·블로그 지수로 바꾸어 해석하면 안 됩니다. [네이버 블로그 검색 공식 문서](https://developers.naver.com/docs/serviceapi/search/blog/blog.md).
