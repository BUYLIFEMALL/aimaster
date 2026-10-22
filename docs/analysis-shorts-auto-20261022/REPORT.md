# 외부 무료배포 프로그램 `shorts-auto`·`15_cardnews` 비교 분석 (2026-10-22)

> **주인님 지시**: 「https://github.com/nam-ai-trend/shorts-auto 설치 진행해줘. 설치 후 기존 쇼츠 자동화와 차별점을 분석해서 다른 프로그램과 병합할지 독립 운영할지 결정하자」 + 참고 영상(유튜브 `KR3t_vMePn8`)·관련 블로그 글(카드뉴스 `15_cardnews`).
> **대상**: ① AIMaster 운영 프로그램과 외부 저장소의 비교. **코드·DB 변경 없음 — 분석만**(DB ref `esgxyikcnnvmlhygjkth`는 읽지도 않음, 역량 지도·소스로 판단).
> **결정(2026-10-22 주인님 확정)**: **독립 프로그램을 만들지 않고 기능만 기존 프로그램에 흡수한다.** 첫 묶음은 ①쇼츠 제작 고급화(`shorts-onestop-studio`).
> 작성: Claude Code(윈도우). 기준 HEAD `becbae10`.

## 0. 결론 먼저

- `shorts-auto`는 「떡상 쇼츠 분석 → 대본 → 목소리 복제 TTS → 장면 AI 동영상 → Remotion 합성」을 **회원 PC에서 도는 Python+React 로컬 도구**로 묶은 것이다.
- 앞 4단계(찾기·분석·대본)는 `shorts-viral-studio`와 겹치고, 우리 쪽이 더 낫다(Gemini가 영상을 직접 봄, 소재 6개, 30일 저장).
- **우리에게 없는 것은 ① 장면별 AI 동영상과 장면 이어 붙이기 ② 본인 목소리 복제 ③ 단어 단위 자막 세 가지**다. 이것만 우리 방식(회원 본인 키·웹·브라우저 합성)으로 새로 구현해 `shorts-onestop-studio`에 넣는다.
- `15_cardnews`(같은 작성자)의 「인기 릴스 수집 → 원본 뜯어보기 → 재해석 관점 3개 추천」은 `auto-instagram-posting`에 넣을 두 번째 묶음 후보다.

## 1. 설치·검수 기록 (분석용, 저장소 밖)

| 항목 | 결과 |
|---|---|
| 위치 | `D:\PDS\Program_dev\shorts-auto` (커밋 `5ebd3dda`, 2026-10-20) — AIMaster 저장소에 넣지 않음 |
| 노드 패키지 | `pnpm install` 성공(332개, esbuild 설치 스크립트는 pnpm이 막음) |
| 파이썬 | PC 기본 Python 3.14에서 `pydantic-core` 2.23.4 설치 실패 → `uv run --python 3.12`로 해결(PC 설정 변경 없음) |
| 백엔드 시험 | pytest 164 통과 / 3 실패 — 실패 3개는 `/tmp/...`를 절대 경로로 보는 맥 기준 검사라 윈도우에서만 틀림(기능 결함 아님) |
| 화면 시험·빌드 | vitest 17/17 통과, `vite build` 성공 |
| 실행 | 백엔드 8000·화면 5173 따로 실행, 메인 크롬에서 `http://localhost:5173` 대시보드 표시 확인(화면 문구 영어) |
| 원본 결함 | `pnpm dev`가 윈도우에서 동작 안 함(`import.meta.url`과 `file://${argv[1]}` 비교 실패) / `setup:higgsfield-mcp`가 가리키는 `tools/higgsfield-mcp/server.mjs`가 저장소에 없음 / ffmpeg 필요(이 PC 미설치) |
| 실행하지 않은 것 | `setup:higgsfield-mcp`(Codex·Antigravity 설정 파일을 고침), 모든 유료 API 호출. **비용 0원** |
| 라이선스 | 라이선스 파일 없음(=모든 권리 보유). 작성자 저장소 15개 중 MIT는 `scholar-megasearch` 1개. 블로그 글은 CC 저작자표시-비영리-변경금지 → **코드·프롬프트는 옮기지 않고 기능만 참고**(핵심 원칙 21) |
| 참고 영상 | 「캡컷 없이 유튜브 쇼츠 100% 자동화 하는 방법 공개(무료제공)」, 「유료 프로모션 포함」(Higgsfield 협찬) |

## 2. `shorts-auto` 실제 흐름 (코드 근거)

| 단계 | 근거 파일 | 실제 동작 |
|---|---|---|
| 레퍼런스 찾기 | `apps/api/app/references/youtube.py` | YouTube Data API 검색, 조회수÷구독자(`sort_by_vs_ratio`) 정렬, 쇼츠 직링크 |
| 음성·받아쓰기 | `references/audio.py`, `references/openai_clients.py` | `yt-dlp`로 원본 음성 다운로드 → Whisper 전사 |
| 분석 | `references/analysis.py` | GPT(`gpt-4.1-mini`)로 첫 3초 후킹·텐션 곡선·리메이크 주제 5개 |
| 대본 | `scripts/generation.py` | 초안 A(상식파괴형)·B(스토리텔링형) + 제목 3개, TTS용 검사 |
| TTS | `production/service.py` `generate_tts_for_project` | 회원 PC의 Qwen3-TTS Gradio 서버(`/generate_voice_clone`)로 목소리 복제 → ffmpeg 1.2배속 |
| 자막·장면 | `align_subtitles_and_scenes_for_project`, `calibrate_scenes_with_stt` | 음성을 다시 Whisper로 단어 시간 추출 → GPT로 숫자·영문 표기 교정 → 전환어 기준 4~8장면 |
| 장면 이미지·영상 | `_run_higgsfield_generate`, `generate_scene_video_for_project` | 로그인된 `higgsfield` CLI 호출(Kling O3 첫·끝 프레임 기본, Seedance·Minimax), 앞 장면 마지막 프레임을 다음 장면 첫 프레임으로(`pass_continuity_frame_to_next_scene`), 실패 시 대체 이미지 |
| 합성 | `production/renderer.py`, `apps/remotion/` | ffmpeg 연결 + Remotion으로 0~2초 제목 카드·자막·BGM → `final.mp4` |
| 업로드 | 없음 | — |

## 3. 표 3개 (매뉴얼 §5-1 양식)

### §1 프로그램별 분석

| # | 프로그램 | 핵심 로직·기능 | 저장 / AI / 키 | 장점 | 단점·한계 | 권한 회원 |
|---|---|---|---|---|---|---|
| 외부 | `shorts-auto` (로컬, 버전 0.1.0) | 위 §2 | 로컬 폴더 / OpenAI·Higgsfield·Qwen3-TTS / `.env` | AI 동영상 장면·장면 이어 붙이기, 목소리 복제, 단어 단위 자막·표기 교정 | 회원 PC·GPU TTS 서버·CLI 필요, `yt-dlp` 원본 다운로드(약관 위험), 업로드 없음, 라이선스 없음, 윈도우 실행 결함 | 해당 없음 |
| 51 | `shorts-viral-studio` v1.10 | 떡상 등급 계산 → Gemini 영상 분석 → 소재 6개 → 대본·제작 프롬프트 | 공용 DB 30일 / Gemini·GPT·Claude / 회원 본인 키 | 영상 직접 분석, 근거 지표 | 제작(영상)은 없음, 다른 프로그램으로 넘기기 없음 | 운영 |
| 83 | `shorts-onestop-studio` v1.22 | 주제 → 대본 → 스톡·AI 이미지 배경 → OpenAI/Gemini TTS → 브라우저 MP4 → 유튜브 업로드·예약 | 공용 DB·Storage / OpenAI·Gemini·Pexels·Pixabay / 회원 본인 키 | 서버 합성 비용 0, 업로드·예약, 일괄 제작 | 배경이 정지 이미지·스톡, 본인 목소리 없음, 문장 단위 자막 | 공개 |
| 52 | `auto-shorts-posting`(Shots) v1.28 | 주제 → 6장면 이미지 → Suno 음악 → 영상 → 쇼츠·릴스 업로드 | 공용 DB / 나노바나나·Suno·ElevenLabs(JSON2Video) | 릴스 동시 게시 | 이미지 스토리형 | 운영 |
| 외부 | `15_cardnews` (로컬, 라이선스 없음) | Apify 릴스·계정·네이버 뉴스 수집 → Whisper·GPT Vision 뜯어보기 → 7관점 중 3개 추천 → 4~10장 자동 확장 → Playwright PNG | 로컬 / OpenAI·Apify | 경쟁 콘텐츠 역분석·재해석 | 게시 없음, 고정 템플릿, 인스타 수집 약관 회색 지대 | 해당 없음 |
| 77 | `auto-instagram-posting` v1.42 | URL·RSS·Perplexity 수집 → 피드·카드뉴스(글자 없는 배경+한글) → 즉시·예약 게시 | 공용 DB / Gemini·OpenAI / 본인 키·Meta 앱 | 제작·게시·기록 통합 | 경쟁 콘텐츠 역분석·재해석 없음 | 운영 |

공통 구조: 우리 프로그램은 모두 회원 본인 키·공용 권한 판정을 쓰고, 외부 두 저장소는 로컬 `.env` 키라 그대로 들여올 수 없다.

### §2 병합 결정 (외부 2개 → 새 프로그램 0개, 기능만 흡수)

| 묶음 | 흡수 대상(→ 기준) | 남는 기준(이유) | 가져올 장점 | 버릴 단점(이렇게 해결) | 우선순위 |
|---|---|---|---|---|---|
| ① 쇼츠 제작 고급화 | `shorts-auto` 제작 단계 → `shorts-onestop-studio` | 원스톱(웹·업로드·예약·브라우저 합성 이미 있음) | 장면 AI 동영상(첫·끝 프레임 이어 붙이기), 본인 목소리 복제, 단어 단위 자막·표기 교정 | 로컬 CLI·GPU 서버 → 회원 본인 fal·ElevenLabs 키 API / Remotion·ffmpeg → 기존 브라우저 MP4 / 긴 생성 → 대기열 제출·조회 | **1순위(확정)** |
| ①-보조 | `shorts-auto` 대본 A/B → `shorts-viral-studio` | 분석 기능은 이미 우위 | 초안 두 유형 비교, 대본을 원스톱으로 넘기기 | `yt-dlp` 원본 다운로드 → 기존 Gemini 영상 분석 유지 | ① 이후 |
| ② 인스타 레퍼런스 분석 | `15_cardnews` → `auto-instagram-posting` | INSTA(제작·게시 통합) | 인기 릴스·계정 수집, 카드뉴스 이미지 글자 읽기, 재해석 관점 3개, 원본 항목 수에 맞춘 장수 제안 | Apify는 회원 본인 토큰·본인 책임 안내, 고정 템플릿 → 기존 카드뉴스 스튜디오 | ✅ 2026-10-22 INSTA v1.49 — 관점·장수·캡처 분석은 이미 있었고(떡상 리메이크), 「릴스 영상 올리기」(브라우저에서 장면·소리 추출, Gemini가 말까지 분석) 추가. 자동 수집은 인스타그램 로그인 토큰에 `business_discovery`가 없어 보류 |

### §3 독립으로 남길 프로그램

| 프로그램 | 남기는 이유 | 겹쳐 보이는 프로그램과 다른 점 | 제안 |
|---|---|---|---|
| `shorts-viral-studio` | 기획(분석·소재·대본) 전용 | 원스톱은 제작·업로드 전용 | 대본 → 원스톱 넘기기 버튼만 추가 |
| `shorts-onestop-studio` | 제작·업로드 기준 | Shots는 이미지 스토리+음악형 | 묶음 ① 흡수 |
| `auto-shorts-posting` | 이미지 스토리·릴스 동시 게시 | 원스톱과 영상 형식이 다름 | 목소리 복제가 안정되면 사본으로 확장 검토 |

## 4. 진행 방식·비용

- 묶음마다 [개발 플랜](../../shorts-onestop-studio/docs/PLAN_20261022_AI_VIDEO_SCENES.md) → 구현 → 무료 시험 → 배포 1회 → 크롬 실세션 → 인수인계 순서.
- 새 프로그램·새 DB 표 없음(묶음 ①은 기존 원스톱 저장 구조에 장면 영상 경로만 추가 예정 — 플랜에서 확정).
- 회원 부담(회원 본인 키, fal 공식 페이지 2026-10-22 확인, 날짜 표시 없어 구현 직전 재확인): Kling O1 첫·끝 프레임 $0.112/초(5초 장면 약 $0.56), Seedance 1.5 Pro 약 $0.05/초(5초 약 $0.26). 6장면 쇼츠 1편 약 $1.6~$3.4. 목소리 복제는 ElevenLabs Starter($5~6/월)부터.
- 운영자 비용: Vercel 빌드(배포 1회당), 영상 파일 저장 용량(기존 30일 자동 삭제 적용).

## 5. 확인 필요(주인님 결정)

1. ~~방향 확정~~ — 2026-10-22 확정(기능만 흡수, 독립 프로그램 없음).
2. 묶음 ① 개발 플랜 승인과 시험 비용(시험 회원 본인 fal 키로 짧은 장면 1~2개).
3. 묶음 ②(인스타 레퍼런스 분석)는 ① 완료 뒤 플랜 보고.

근거: 외부 소스 정적 읽기·설치 시험, 역량 지도(`docs/PROGRAM_CAPABILITY_MAP.md` 51·52·77·83번), 원스톱 소스(`src/lib/pipeline.ts`·`tts.ts`·`voice.ts`), 이미지 기준 `ai-image-studio/lib/providers/adapters/fal.ts`.
