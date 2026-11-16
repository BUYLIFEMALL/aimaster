# 개발 플랜 — boks-youtube-finder 1단계 병합 (2026-11-16, 영상 담당 `video`)

- 원본: https://github.com/boksajang/boks-youtube-finder (커밋 `3aacecf`, MIT — README 「MIT License © 2026 복사장 (Boksajang)」, package.json `license: MIT`)
- 대상: `youtube-viral-studio` v1.29 → v1.30(배포 때 한 번만 올림)
- 근거: [분석 보고서](ANALYSIS_20261116_BOKS_YOUTUBE_FINDER.md), [인수인계](HANDOFF_20261116_BOKS_FINDER_PORT.md)
- 배정: Codex(Master) 휴식 중 주인님 직접 배정(2026-11-16). Master 복귀 후 공식작업판 반영 요청.

## 1. 주인님 결정 (2026-11-16 채팅 선택)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 범위 | **1단계(YVS 본체)만 먼저**. 2단계(SVS·사본)·3단계(썸네일·원스톱 연결)는 1단계 뒤 |
| 2 | 떡상 기준 | **평소 조회수 중앙값 대비 배수를 기본 배수로 교체** |
| 3 | 쇼츠 길이 | **180초로 통일** |
| 4 | 종교 영상 | **기본 제외(켜짐)**, 검색어가 종교 단어면 자동 해제 |
| 5 | DB | **표 2개 추가 승인** — 회원별 YouTube 하루 사용량, 채널 업로드 통계 캐시 |
| 6 | AI 기획안 | **별도 버튼으로 추가**(기존 키워드 경쟁 리포트는 그대로) |

## 2. 원본 / AIMaster / 채택

| 기능 | 원본 | AIMaster(현재) | 채택·방법 |
|---|---|---|---|
| 평소 조회수 중앙값 판정 | `computeChannelBaseline`·`fetchChannelUploads` | 없음(구독자 대비만) | 원본 그대로 이식(`boks/core.ts`·`boks/search.ts`). 업로드 재생목록은 채널 ID에서 `UU…`로 바로 계산(채널 조회 part 그대로) |
| 떡상 판정·점수 | `buildVideos`(1만↑ & 3배↑, 하한 1,000, 「- Topic」 추정 제외) | 떡상 점수(배수35·VPH30·최신15·좋아요20) | 새 「떡상 탐색」은 원본 그대로. 기존 「쇼츠 떡상 트리거」는 점수의 배수 항목을 **평소 대비 배수**로 바꾸고(모르면 구독자 대비) 근거 표시 |
| 형식별 버킷 검색·보충 | `searchYouTube` | 쇼츠 한 번 검색 | 원본 그대로 |
| 인기 차트 빠른 시작 | `fetchPopularChart` + 프리셋 | 급상승 탭(롱폼) | 원본 그대로(검색 할당량 0) + 프리셋 6종 |
| 관련성·언어·해시태그 도배 필터 | `relevanceIssue`·`languageMismatch` | 없음 | 원본 그대로 |
| 종교 영상 제외 | `isReligious`·`isReligiousQuery` | 없음 | 원본 그대로, 기본 켜짐 |
| 기회 지수·키워드 TOP | `computeMarketAnalytics`·`extractTitleKeywords` | 없음 | 원본 그대로 |
| 트렌드·자동 결론 | `services/trends.js` 전체 | 대시보드 문구만 있고 계산 없음 | 원본 그대로(`boks/trends.ts`) |
| 산점도 | renderer `drawScatter`(Canvas) | 없음 | 로직만 참고해 SVG 컴포넌트로 다시 그림 |
| 목록 필터·정렬 | renderer `passesFilters`·`sortVideos` | 일부 | 로직만 참고해 React로 |
| 사용량 누적·차단 | `services/usage.js`(파일) | 요청 단위 표시만 | `quotaDay`·`nextResetMs` 그대로, 저장은 DB 표 |
| 채널 업로드 통계 캐시 | `channel-cache.js`(파일 24시간) | Next 캐시 10분 | DB 표, 회원별, 24시간 |
| 오류 안내·재시도 | `explainApiError` | 공용 `youtubeData.ts`(더 상위) | **AIMaster** 유지, `videoChartNotFound` 한 줄만 이 프로그램 쪽에서 보강 |
| 기간(24h·3일·직접 지정) | `calculatePublishedRange` | 7·30·90·365일 | 원본 그대로 |
| AI 기획안 | `buildPrompt`·`PLAN_SCHEMA`·`normalizeReport`·`extractJsonObject`(로컬 CLI 실행) | 키워드 리포트(자유 서술) | 프롬프트·스키마·검증 그대로, 실행은 **회원 본인 Claude 키** API |
| 로컬 CLI·Electron·파일 저장 | 있음 | 해당 없음 | 채택 안 함 |

## 3. 구현 순서

1. 순수 함수 이식 `src/lib/youtube/boks/{core,trends,quota,plan}.ts` + 시험 `tests/boks.test.mjs` → `node --test`
2. 서버 검색 `boks/search.ts`(공용 `youtubeRequest` 경유, 쿼터 계량, DB 캐시·사용량) + DB 마이그레이션(표 2개, RLS 회원 본인만)
3. API `POST /api/youtube/viral-finder`(검색·인기 차트), `GET`(오늘 사용량), `POST /api/ai/viral-plan`(Claude 기획안)
4. 화면 `/viral-finder` 「떡상 시장 탐색」: 조건·프리셋, 기회 지수, 키워드 TOP, 산점도, 트렌드 결론·막대, 영상 목록(필터·정렬·태그 복사), 제외 사유, 사용량, AI 기획안
5. 기존 화면 정리: 쇼츠 180초 통일(`metrics.ts` 2곳·`trendingVideos.ts`), 「쇼츠 떡상 트리거」 배수 → 평소 대비, 대시보드 요일·시간대 문구 연결, 머리 주석 기준 프로그램 표기 정정
6. `tsc`·시험·`npm run build` → 미배포 대기 또는 승인 배포

## 4. 검수

- 시험: 판정(중앙값·표본 부족·48시간·하한), 관련성(도배·언어·무관), 종교, 기회 지수, 키워드 추출, 기간 계산, 트렌드 결론, 사용량 날짜, 기획안 JSON 파싱·정규화
- 화면: 시험 계정 실제 로그인 후 ego lite에서 데스크톱·휴대폰 폭 확인(회원 본인 YouTube 키 사용, 검색 1회 ≈ 100~300유닛 + 평소 조회수 50~80유닛)
- AI 기획안 실호출은 시험 계정 본인 키 + 가장 저렴한 Claude 모델 1회, 실행 직전 승인

## 5. 비용

| 항목 | 내용 |
|---|---|
| 개발 | 원본 내려받기·코드 읽기 무료 |
| 회원 YouTube 쿼터 | 「전체」 검색 = 버킷 3개 × 100 + 보충, 쇼츠·롱폼만이면 1~2회. 평소 조회수 +50~80유닛(24시간 캐시) — 화면에 예상 사용량 표시 |
| 회원 AI | 기획안 버튼을 누를 때만 회원 본인 Claude 키 1회 |
| 운영 | DB 표 2개(작음), Vercel 빌드 1회(배포 전 승인) |

## 6. 안 하는 것

- 2·3단계(별도 작업), 로컬 CLI 실행, 파일 저장, 운영자 키 사용
