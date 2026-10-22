# AI 음악 생성 스튜디오 — 플랫폼 조사·개발 가능성 분석·개발 플랜 (2026-10-23)

- 작성: Claude Code(윈도우), 요청: 주인님 「ai-image-studio처럼 음악 전용 자동화 프로그램을 새로 만들자 — 음악 생성 플랫폼 조사·강점/단점·개발 가능성 분석 후 플랜」
- 대상: ① AIMaster 운영(공용 DB `esgxyikcnnvmlhygjkth`). **이 문서는 분석·플랜 단계이며 코드·DB는 바꾸지 않았다.**
- 상태: **주인님 승인 대기** (이름·1차 연동 범위·비용)

## 0. 결론 요약

1. **2026-10 현재 "공식 API + 상업 이용 조건 명확 + 회원 본인 키로 연동"이 되는 음악 생성 플랫폼은 Google Lyria(Gemini API), ElevenLabs Eleven Music, Mureka, Stability Stable Audio, fal.ai(여러 모델 묶음)** 다섯 갈래다.
2. **Suno는 여전히 공개 API가 없다.** 2026-07 파트너 API 신청만 받기 시작했고, 9월 V6(워너·BMG·Believe 라이선스 모델)로 바뀌며 무료 등급 다운로드가 막혔다. 지금 쓰는 sunoapi.org는 비공식 중계다. → **(2026-10-23 주인님 결정: 「여긴 suno.org로 연계해서 사용하면 되」) 새 스튜디오도 기존 음악(SUNO)자동화와 같이 sunoapi.org로 Suno를 정식 1차 연동한다(회원 본인 sunoapi.org 키, 화면에 비공식 위험 배지는 달지 않음).** 공식 Suno API가 공개되면 어댑터만 교체할 수 있게 설계해 둔다.
3. **Udio는 제외**(공개 API 없음, UMG 합의 뒤 다운로드 중지). **MiniMax 직접 API도 제외**(2026-08-20 신규 가입 중단) — 단, fal.ai를 통한 MiniMax Music 2.5/2.6은 사용 가능.
4. 추천 방향: **새 프로그램 「AI 음악 스튜디오」(`ai-music-studio`, 이름 확정)를 ai-image-studio와 같은 "다중 모델 스튜디오" 구조로 만들고, 이 프로그램을 음악 모델 연동의 레퍼런스(기준) 프로그램으로 지정**한다. 기존 음악(SUNO)자동화(`music/`)는 Suno 정밀 기획 전용으로 유지하고, 겹치는 Suno 연동은 공용 기준 코드로 맞춘다.

## 1. 플랫폼 조사 (2026-10-23 확인)

가격은 공식 페이지 확인분(✅)과 제3자 자료(△)를 구분했다. 개발 착수 직전 공식 페이지로 다시 확인한다.

| 플랫폼 | 공식 API | 대표 모델 | 보컬·가사 | 최대 길이 | 단가 | 상업 이용 | 회원 키 연동 |
|---|---|---|---|---|---|---|---|
| **Google Lyria** (Gemini API) | ✅ 있음 | `lyria-3.5`(풀곡), `lyria-3-clip-preview`(30초), Lyria RealTime(스트리밍) | ✅ 보컬·가사·[Verse] 태그·타임스탬프 구성, 이미지(최대 10장)로 작곡 | 수 분(프롬프트로 지정) | ✅ 풀곡 $0.08 / 30초 $0.04, 무료 등급 없음 | 유료 API 출력, SynthID 워터마크 포함 | **Gemini 키 재사용(이미 많은 회원이 등록)** |
| **ElevenLabs Eleven Music** | ✅ 있음 | `music_v2_5`(최신), v2, v1 | ✅ 보컬/연주, 다국어, 구간 편집·작곡 계획 | 3초~5분 | ✅ $0.15/분 | ✅ Starter($6/월)부터 거의 모든 상업 용도(영화·TV·게임 일부는 엔터프라이즈) | 새 키 `elevenlabs`(TTS 프로그램과 공용 가능) |
| **Mureka** (쿤룬) | ✅ 있음(platform.mureka.ai) | V9(기본), O2(최고급), V9.5(2026-08-31) | ✅ 가사 중심 노래, 스템 분리(별도 요금) | 풀곡 | △ 곡당 약 $0.045, **선불 충전 $30부터** | 유료 API 출력 | 새 키 `mureka` |
| **Stability Stable Audio** | ✅ 있음 | Stable Audio 2.5 / 3.0 | ❌ 연주곡·효과음 중심(가사 없는 보컬만) | 3분(2.5)/6분(3.0) | △ 2.5 $0.20/회 | 연매출 100만 달러 미만 커뮤니티 라이선스 | 새 키 `stability`(ai-image-studio 키 재사용) |
| **fal.ai** (중계 플랫폼) | ✅ 있음 | ✅ ElevenLabs Music($0.80/분), MiniMax Music 2.6·2.5($0.15/곡), MiniMax 2.0($0.03), Lyria 2($0.10/30초), Lyria 3/3 Pro, Stable Audio 2.5, ACE-Step(오픈소스), CassetteAI | 모델별 | 모델별 | ✅ 위 가격(페이지 표기분) | 모델별 약관 | **fal 키 재사용(ai-image-studio 공용)** — 키 하나로 여러 모델 |
| Replicate (중계) | ✅ 있음 | MusicGen, Stable Audio, ACE-Step 등 | 모델별 | 모델별 | 초당 과금 | 모델별(MusicGen 가중치는 비상업) | `replicate` 키 재사용 |
| **Suno** | ❌ 공개 API 없음(2026-07 파트너 신청만) | V6 / V6-wild / V6-mini(2026-09-09, 라이선스 학습) | ✅ 최고 수준 노래 | 풀곡 | △ 비공식 중계 곡당 약 $0.055~0.06 | 공식 앱 유료 등급만, 비공식 API는 약관 위험 | 기존 `music/`의 sunoapi.org 키 재사용(위험 안내) |
| Udio | ❌ 없음 | — | — | — | — | UMG 합의 뒤 다운로드 중지, 라이선스 재출시 대기 | **제외** |
| MiniMax 직접 | ⚠️ 2026-08-20 신규 가입 중단 | Music 3.0(가중치 공개, 라이선스 논란) | — | — | — | — | **제외**(fal 경유만) |
| 오픈 가중치 직접 운영(ACE-Step·Stable Audio Open·MiniMax Music3·YuE) | 자체 GPU 필요 | — | — | — | GPU 서버 비용 | 모델별 | **제외** — 운영자 서버 비용이 생겨 프리미엄 대상이 되고, Vercel에서 못 돌림. fal 경유로 대체 |

### 1-1. 플랫폼별 강점·단점

| 플랫폼 | 강점 | 단점 |
|---|---|---|
| Google Lyria 3.5 | 가장 싸다($0.08/풀곡), 회원 대부분이 Gemini 키를 이미 등록, 가사·구간 태그·이미지로 작곡, 44.1kHz | 무료 등급 없음, 한 번에 생성(대화식 수정 불가), 아티스트 목소리·저작권 가사 요청 차단, 길이 제어가 프롬프트 의존 |
| ElevenLabs Music v2.5 | 상업 이용 조건이 가장 명확, 최대 5분, 구간별 편집·작곡 계획, 음성(TTS)과 같은 키 | 분당 과금이라 긴 곡은 비쌈(3분 $0.45), 상업 이용은 유료 플랜 필요 |
| Mureka | 가사 중심 노래 품질 좋음(연주곡 평가 상위), 스템 분리, 곡당 저렴 | 선불 충전($30~) 진입 장벽, 공식 단가표 비공개, 한국어 가사 품질 미검증 |
| Stable Audio | 연주곡·효과음·루프에 강함, 최대 6분(3.0) | 가사 노래 불가, 대형 모델은 가격 비공개 |
| fal.ai | 키 하나로 MiniMax·ACE-Step·Lyria·Stable Audio·ElevenLabs까지, 대기열·웹훅 구조가 이미 ai-image-studio에 있음, ACE-Step은 매우 저렴 | 중계 수수료(ElevenLabs는 직접보다 5배 비쌈 $0.80/분), 모델 목록이 자주 바뀜 |
| Suno(비공식) | 노래 품질·한국어 가사 체감 최고, 기존 `music/` 코드·회원 키 있음 | 비공식이라 언제든 막힐 수 있고 약관 위험, V6 라이선스로 이용 조건 변경, 공식 API 출시 시 교체 필요 |

## 2. AIMaster에서의 개발 가능성 분석

| 항목 | 판단 | 근거·대응 |
|---|---|---|
| 회원 본인 키 원칙(최상위 규칙) | ✅ 충족 | 모든 플랫폼이 회원 개인 키로 호출 가능. 운영자 키 없음, 폴백 없음. 키는 `user_api_keys`(공용)·`integration_catalog`에 `elevenlabs`·`mureka` 새 항목만 추가하고 나머지(gemini·fal·replicate·stability·suno)는 재사용 |
| Vercel 300초 제한 | ⚠️ 설계 필요 | 곡 생성은 30초~3분. **비동기 작업(작업 행 → 대기열/콜백 → 결과 저장)** 으로 만든다: fal은 queue+웹훅, Suno는 콜백(기존 `music/` 방식), Lyria·ElevenLabs는 서버 함수 1회 호출(최대 약 2분) 후 `waitUntil`로 저장. `timeoutMs × (retries+1)` 계산, 유료 생성은 `retries: 0`(이중 과금 방지) |
| 응답 4.5MB 제한 | ⚠️ 설계 필요 | 음원(3~10MB)을 함수 응답으로 넘기지 않고 서버에서 Supabase Storage 비공개 버킷에 올린 뒤 10분 서명 주소로 재생·다운로드 |
| 데이터 격리·30일 삭제 | ✅ | `music_studio_jobs`·`music_studio_tracks` 테이블 `user_id`+RLS, 회원별 저장 경로, 공용 `cleanupUsageLog`로 30일 자동 삭제 cron |
| 운영자 비용(프리미엄 여부) | ✅ 프리미엄 아님 | 생성 비용은 전부 회원 키. 운영자 부담은 저장 용량(곡당 3~10MB × 30일)뿐 |
| 이미지 스튜디오 구조 재사용 | ✅ | `ai-image-studio/lib/providers/{types,registry,adapters/*}` 구조를 음악용으로 옮김(모델 옵션 스키마 → 화면 자동 생성) |
| 기존 음악 프로그램과 겹침 | ⚠️ 정리 필요 | `music/`(Suno 정밀 기획 + Suno 생성)와 Suno 생성 기능이 겹친다 → Suno 어댑터는 공용 기준 코드 1개로 맞추고(`SHARED_MODULES.md` 등록), 새 스튜디오는 「여러 모델로 빠르게 만들고 비교」, `music/`은 「Suno용 정밀 기획」으로 역할을 나눈다 |
| 법적 위험 | ⚠️ 안내 필요 | Suno는 주인님 결정으로 sunoapi.org 정식 연계(배지 없음, 공식 API 공개 시 어댑터 교체 — 내부 기록만), 플랫폼별 상업 이용 조건을 모델 카드에 표시, 아티스트 이름 모방 프롬프트는 각 플랫폼 필터에 맡기고 화면에서도 안내 |

## 3. 기존 프로그램에서 가져올 것 / 보강할 단점

| 가져올 곳 | 가져올 것 |
|---|---|
| `ai-image-studio` | 공급자·모델 등록 구조, 모델별 옵션 자동 화면, 모델 비교 화면 배치, 설정 화면(API키등록·플랫폼연동) |
| `music/` (음악(SUNO)자동화) | sunoapi.org 어댑터·콜백·잠금(`syncLock`)·저장(`trackSync`·`storageSign`)·30일 정리, 가사 형식(`lyricsFormat`), AI 3사 가사 작성 |
| `lyric-video-studio`·`playlist-channel-studio`·`vinyl-lp-studio`·`ai-mastering-studio` | 연계 버튼(만든 곡을 바로 넘김) |
| 공용 | `lib/memberIntegrations.ts`, `cleanup-usage-log`, `browser-mp4-encoder`(필요 시 미리보기 영상) |

| 기존 단점 | 새 스튜디오의 보강 |
|---|---|
| 음악 생성이 Suno 하나(비공식)에만 의존 | 공식 API 4곳 + fal 다중 모델, Suno가 막혀도 동작 |
| 모델 품질을 비교할 수 없음 | 같은 프롬프트로 2~3개 모델 동시 생성 → 나란히 듣고 고르기 |
| 곡마다 비용을 모름 | 생성 전 모델별 예상 비용 표시(회원 본인 계정 청구) |
| 상업 이용 조건이 흩어져 있음 | 모델 카드마다 「상업 이용 가능 조건」 표시 |

## 4. 프로그램 이름 — **확정: 「AI 음악 스튜디오」(`ai-music-studio`) (2026-10-23 주인님 지시: 「이 자동화 프로그램은 AI 음악 스튜디오 로 하자」)**

아래는 확정 전 후보 기록이다.

| 순위 | 이름 | slug | 강조점 |
|---|---|---|---|
| **1 (추천)** | **AI 음악 스튜디오 자동화** | `ai-music-studio` | 「AI 이미지 자동화」와 짝, 여러 모델로 음악을 만드는 스튜디오라는 뜻이 바로 보임 |
| 2 | 멀티 AI 작곡 자동화 | `multi-ai-composer` | 여러 AI 비교 강조 |
| 3 | AI 송메이커 자동화 | `ai-song-maker` | 노래(보컬곡) 강조 — 연주곡·효과음이 덜 드러남 |
| 4 | AI 배경음악·노래 생성 자동화 | `ai-bgm-song-studio` | 유튜버 배경음악 수요 강조, 이름이 김 |
| 5 | AI 사운드 스튜디오 | `ai-sound-studio` | 효과음까지 포함, 「음악」이 덜 드러남 |

- 추천 이유: 기존 「음악(SUNO)자동화」와 겹치지 않고(그쪽은 Suno 기획), 이미지 레퍼런스 프로그램과 이름 짝이 맞는다. slug·폴더 `ai-music-studio`는 저장소·카탈로그에 없음을 확인했다.
- 카드 한 줄 요약 예시(55자): **「Lyria·ElevenLabs·Suno 등 여러 AI로 노래·배경음악을 만들고 나란히 들어 비교하는 음악 스튜디오」**

## 5. 화면·기능 구성 (1차 v1.01)

좌측 메뉴(스튜디오형 「포커스 스튜디오 스타일」 계열, 767px 이하 ☰ 접는 메뉴):
1. **🎵 음악 만들기** — 모델 선택(카드: 품질·길이·단가·상업 조건), 곡 설명, 장르·분위기 칩, 보컬/연주곡, 언어, 길이, 가사 직접 입력 또는 「AI 가사 쓰기」(회원 Gemini/OpenAI/Claude 키), 모델별 고급 옵션(자동 화면), 생성 전 예상 비용
2. **⚖️ 모델 비교** — 같은 설명으로 최대 3개 모델 동시 생성 → 파형·재생·별점·「이 곡 고르기」
3. **📁 내 보관함** — 곡 목록·재생·다운로드(MP3/WAV)·가사·사용 모델·비용 기록, 30일 자동 삭제 안내, 다른 프로그램으로 보내기(가사영상·플레이리스트·LP·마스터링)
4. **🔑 API키등록·플랫폼연동** — Gemini·ElevenLabs·fal·Suno(sunoapi.org 키)·Mureka·Stability, 하단 연동 매뉴얼 박스
5. **📖 연동 & 사용 매뉴얼** — 8대 매뉴얼 스타일·Step 1~4 카드

연동 모델(1차 → 2차):

| 단계 | 공급자 | 모델 |
|---|---|---|
| 1차 | Gemini | `lyria-3.5`, `lyria-3-clip-preview` |
| 1차 | ElevenLabs | `music_v2_5` |
| 1차 | fal | MiniMax Music 2.6, ACE-Step, Stable Audio 2.5, Lyria 2 |
| 1차 | Suno(sunoapi.org 연계, 주인님 결정) | V6 / V6-wild / V6-mini — `music/` 어댑터 공용화 |
| 2차 | Mureka | V9 / O2 (+스템) |
| 2차 | Stability 직접 | Stable Audio 2.5/3.0 |
| 2차 | Lyria RealTime | 실시간 잼(브라우저 스트리밍) — 실험 기능 |
| 대기 | Suno 공식 API | 파트너 API 공개 시 비공식 어댑터 교체 |

## 6. 구현 순서·검수

| 단계 | 작업 | 검수 |
|---|---|---|
| 1 | 폴더 `ai-music-studio/` 생성(Next.js, `music/` 뼈대 복사), `lib/version.ts` v1.01, `access.ts`(requireProgramAccess·checkProgramAccessApi, force-dynamic) | `tsc`·빌드 |
| 2 | `lib/providers/`(types·registry·adapters: gemini-lyria·elevenlabs·fal·suno) — 모델 연동 부분만, 프롬프트는 이 프로그램 고유 | 어댑터 단위 시험(요청 본문 모양·모의 응답) |
| 3 | DB 마이그레이션: `music_studio_jobs`/`music_studio_tracks`(user_id+RLS), 비공개 버킷 `music-studio-tracks`, `integration_catalog`에 elevenlabs·mureka | SQL 파일 `ai-music-studio/supabase/migrations/` |
| 4 | 비동기 생성 API(작업 생성 → 공급자 호출 → 콜백/대기열 → 저장 → 상태 조회), 이중 과금 방지 잠금 | 모의 공급자로 전체 흐름 시험 |
| 5 | 화면 5종 + 모바일, 모델 비교, 보관함·서명 주소 재생 | 크롬 실제 창 데스크톱·390px |
| 6 | 30일 정리 cron(공용 cleanup-usage-log), 다른 음악 프로그램 연결 버튼 | 시험 |
| 7 | Suno 어댑터 공용 기준 코드 등록(`music/` 기준 → 사본), `SHARED_FEATURE_MAP`에 「음악 생성 연동 = ai-music-studio 기준」 등록 | `check-shared-modules.mjs` |
| 8 | Vercel 프로젝트 생성·`ai-music-studio.buylife.xyz`·환경변수, `programs` 등록(app_url·요금제 3단계·상세 소개·detail_sections·썸네일), VIP 자동 부여 확인 | 배포 후 실제 로그인 생성 시험 |
| 9 | 인수인계 6종·역량 지도 카드·HANDOFF | — |

## 7. 비용 (사전 보고)

| 구분 | 항목 | 예상 | 누구 부담 | 승인 |
|---|---|---|---|---|
| 개발 시험 | Lyria 3 Clip 30초 3회 + Lyria 3.5 풀곡 2회 | 약 $0.28 | 시험 계정 본인 Gemini 키 | 필요 |
| 개발 시험 | ElevenLabs 10초 3회 | 약 $0.08 | 시험 계정 본인 키(미등록이면 주인님 등록 필요) | 필요 |
| 개발 시험 | fal ACE-Step·MiniMax 2.6 각 1~2회 | 약 $0.35 | 시험 계정 본인 fal 키 | 필요 |
| 개발 시험 | Suno V6-mini 1회 | 약 $0.06 | 시험 계정 sunoapi 키(현재 미등록 기록 있음) | 필요 |
| 개발 시험 합계 | | **약 $1 미만** | | |
| 배포 | Vercel 빌드 | **3~5회**(신규 프로젝트 첫 배포 + 수정) | 운영자 | 필요 |
| 운영 인프라 | Supabase 저장 용량 | 곡당 3~10MB × 30일 보관 — 기존 요금제 범위 예상 | 운영자 | — |
| 운영 인프라 | 도메인·서버 | 없음(와일드카드 DNS, 별도 서버 없음) | — | — |
| 회원 부담 | 곡 생성 | Lyria $0.08/곡, ElevenLabs $0.15/분, fal MiniMax $0.15/곡·ACE-Step 수 센트, Mureka 약 $0.045/곡(선불 $30~), Suno 비공식 약 $0.06/곡 | 회원 본인 키 | — |

- Mureka(2차)는 시험하려면 최소 $30 선불 충전이 필요 → 2차 진행 때 따로 여쭌다.

## 8. 버전·배포·인수인계 산출물

- 버전: 새 프로그램 `v1.01`(코드 `lib/version.ts` + `programs.version`)
- 배포: 대량 신규 개발 → 예외 ①로 완성 시 배포(한 번에 하나씩)
- 산출물: `ai-music-studio/` 의 AGENTS.md·README.md·docs/IMPROVEMENTS.md·IMPROVEMENT_BACKLOG.md·DESIGN_HANDOFF.md·이 플랜 사본, 루트 `PROGRAM_CAPABILITY_MAP.md` 카드, `SHARED_FEATURE_MAP.md`·`SHARED_MODULES.md`, `HANDOFF.md`

## 9. 확인이 필요한 결정

1. ~~이름~~ → **확정: 「AI 음악 스튜디오」(`ai-music-studio`, 2026-10-23)**
2. 1차 연동 범위: Lyria + ElevenLabs + fal + Suno(sunoapi.org 연계 — **Suno 연계 방식은 2026-10-23 확정**) 4갈래로 시작할지
3. 기존 「음악(SUNO)자동화」와의 관계: 둘 다 유지(역할 분리)할지, 나중에 병합할지
4. 비용: 시험 약 $1 미만(시험 계정 본인 키) + Vercel 빌드 3~5회 승인

## 출처

- Gemini API 가격·음악 생성 문서: https://ai.google.dev/gemini-api/docs/pricing , https://ai.google.dev/gemini-api/docs/music-generation
- ElevenLabs Music 문서·API 가격: https://elevenlabs.io/docs/overview/capabilities/music , https://elevenlabs.io/pricing/api
- fal 음악 모델 목록: https://fal.ai/explore/text-to-music-apis
- Suno API 파트너 프로그램: https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/
- Suno V6 라이선스 모델: https://thenextweb.com/news/suno-v6-warner-bmg-believe-licensed-models
- Suno 비공식 API 위험: https://sonilo.com/blog/guides/official-suno-api-saas-builders-2026
- MiniMax API 신규 중단·가중치 공개: https://mer.vin/news/minimax-music-3-is-open-weight-but-not-open-for-business/
- Mureka API: https://invideo.io/blog/mureka-ai-music-generator/ , https://wavespeed.ai/blog/audio-and-voice-models/mureka-v9-5-music-api/
- Stable Audio 라이선스: https://stability.ai/membership , https://www.eweek.com/news/stability-ai-stable-audio-3/
- Udio 현황: https://dynamoi.com/pl/learn/ai-music-distribution/is-udio-music-still-downloadable
- 종합 비교: https://www.cometapi.com/ai-music-api-pricing/ , https://musicapi.ai/blog/best-ai-music-api-2026
