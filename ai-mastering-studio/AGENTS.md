# AI 마스터링 스튜디오 — 인수인계 (AGENTS.md)

> 다른 CLI가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다.

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | AI 마스터링 스튜디오 / `ai-mastering-studio` |
| 현재 버전 | **v1.03** (`src/lib/version.ts` = `package.json` = DB `programs.version`) |
| 라이브 | https://ai-mastering-studio.buylife.xyz |
| Vercel | 팀 `buylife`, 프로젝트 `ai-mastering-studio` (CLI 업로드 배포) |
| 배지·카테고리 | FREE + new, 음악, 최소 등급 일반, 요금제 1·2·3개월 등록, VIP 등급 표에 추가(VIP=모든 프로그램) |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Web Audio(OfflineAudioContext) · `jszip` · `@google/genai` |
| 저장소·DB | **없음** — 오디오는 서버로 전송·저장하지 않고 브라우저에서만 처리(운영 비용 없음) |
| AI | 마스터링 설정값 제안(AI 로직 생성기)만 서버가 회원 **본인 키**(`user_api_keys`의 gemini/openai/anthropic)로 호출. 키 없으면 안내(폴백 없음). 프리셋·수동 조정·처리는 키 불필요 |
| 참고 원본 | gpt-park-mastering-studio-99gg.vercel.app (번들 전체 분석: 처리 순서·프리셋 12종 값·AI 스키마 참고, 문구·구현은 새로 작성, 제작자 크레딧·브라우저 base64 키 저장 미복제) |

## 2. 무엇을 하는가
WAV(최대 20곡·파일당 150MB)를 올려 같은 설정으로 일괄 처리 → 곡별 WAV 저장 또는 ZIP. 설정은 12종 사운드 프로필(범용·스트리밍·클럽용·파이어·펀치·선명함·팟캐스트·빈티지 온기·테이프·내추럴·공간감·시네마틱), AI 로직 생성기(원하는 소리를 글로 → JSON 설정값 + 한국어 설명), 정밀 랙(EQ·새추레이션·컴프레서·스테레오 이미저·리미터 슬라이더)으로 정한다. 입력/결과 파형과 피크·평균(RMS) 레벨을 비교하고 설정이 바뀌면 "다시 처리하세요" 안내를 띄운다.

## 3. 신호 처리 (`src/lib/mastering/`)
1. 입력 피크를 0.35로 평준화(`normalizeGain`) → `engine.ts`의 OfflineAudioContext: lowshelf 100Hz · peaking 1.5kHz(Q) · highshelf 8kHz → 새추레이션(원음과 웨이브셰이퍼를 harmonics 비율로 병렬 혼합, `saturationCurve`) → DynamicsCompressor(knee 12).
2. 렌더 후 순수 코드(`dsp.ts`, 테스트 대상): `applyStereoWidth`(M/S, 100%=원본) → `applyLimiter` → `encodeWav16`.
3. **리미터는 원본과 다르게 구현**: 원본은 엔벨로프 추적이라 순간 피크가 실링을 넘었다(시험에서 확인). 여기서는 룩어헤드 10ms 구간의 최솟값 게인 + 과거 평균(어택) + 릴리즈 곡선으로 **어떤 샘플도 ceiling 이하**를 보장하고, 채널을 묶어(링크) 같은 게인을 적용한다. 5분 스테레오 처리 약 0.6초.
4. `params.ts`: 슬라이더 범위(`RANGES`)·AI 안전 범위(`AI_RANGES`)·프리셋 12종·`clampParams`/`cleanAiPreset`(AI 응답 보정)·AI 프롬프트(당해 연도 규칙, 설명은 한국어).

## 4. 구조
```
src/lib/mastering/{models,params,dsp,engine}.ts   모델·설정·순수 신호처리·브라우저 렌더
src/lib/llm.ts            Gemini(SDK)·OpenAI·Claude(REST) JSON 호출, 오류 한국어화, needKeyBody
src/lib/apiKeys.ts / routeGuard.ts   공급사별 본인 키(폴백 없음), 접근 판정 + 키 확인
src/app/api/ai-preset     POST — 설정값 제안(접근 권한·본인 키 확인, 응답 보정)
src/app/api/user-key      공급사별 키 GET/POST/DELETE
src/components/studio/    MasteringStudio(흐름·일괄 처리·ZIP) · Rack · Waveform
```
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드. 모든 API route에 `dynamic/fetchCache` 두 줄.

## 5. 동작 메모 (원본과 다르게 한 점)
- 키: 원본은 브라우저 localStorage(base64)+직접 호출 → 서버 호출·회원 본인 키·공급사 3종 선택.
- 리미터: 위 3번. 스테레오 너비는 mid/side를 0.5배로 정규화(레벨 변화 없음).
- 파일 이름 충돌 시 ZIP 안에서 `(2)`를 붙임. 화면 언어 전환(KR/EN)은 구현하지 않음(한국어 고정).
- 올린 곡·결과는 메모리에만 있어 새로고침하면 사라진다(안내 문구 있음).

## 6. 배포·운영 절차
1. `npm test` → `npm run build`. 2. 버전 +0.01(`src/lib/version.ts`의 `APP_VERSION` **줄만**) + `package.json` + DB `update programs set version=… where slug='ai-mastering-studio'` + 이 문서. 3. `cd ai-mastering-studio && vercel deploy --prod --yes --scope buylife`. 4. 경로를 지정해 커밋 후 `git push origin master`. 5. 라이브 새로고침해 사이드바 버전 확인.
- 환경변수 4개는 `scripts/add-ai-mastering-vercel-env.mjs`로 등록 완료. 카탈로그 썸네일은 임시 스크립트(운영자 본인 계정의 본인 Gemini 키 1회)로 `program-images` 버킷에 올림.

## 7. 알려진 한계·남은 일
- 검수(2026-10-13, 관리자 계정): 시험용 스테레오 WAV 3곡 업로드 → 클럽용 프리셋 → 일괄 처리(3곡 4초, 피크 -15.7→-0.3dB·실링 -0.3과 일치) → 결과 WAV 헤더(RIFF/16bit/2ch/44.1kHz)·재디코딩 6.00초 → ZIP(3곡 2.2MB) → AI 로직 생성기(Gemini 2.5 Flash, 설정값 변경·한국어 설명) → 설정 변경 시 "다시 처리" 안내 → 모바일 폭 가로 넘침 없음. 자동 테스트 21개(리미터는 임펄스 피크·좌우 균형 포함).
- **미확인**: 일반 회원(`buylifemall@naver.com`) 계정 시험, 실제 음악 파일의 청감(귀로 듣는 품질 비교), 24bit/32bit float·MP3 등 다른 형식 입력과 긴 곡(수십 분)의 메모리, OpenAI·Claude 모델로 AI 제안, 터치 기기.
- 개선 후보: 24bit WAV 출력, LUFS(통합 라우드니스) 측정, 사용자 프리셋 저장(DB), 참고 곡 비교, 화면 언어 전환.
- 같은 폴더를 다른 CLI도 쓴다: 커밋은 경로를 지정(`git commit -- ai-mastering-studio …`).

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01** 신규 구축·프로그램 등록(FREE+new, 음악)·VIP 등급 표 추가·도메인 연결·첫 배포·카탈로그 썸네일.
- **2026-10-13 v1.02** ZIP 파일 이름을 내 컴퓨터 날짜(YYYYMMDD)로 변경, 인수인계·매뉴얼 문서 작성.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (ai-mastering-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
