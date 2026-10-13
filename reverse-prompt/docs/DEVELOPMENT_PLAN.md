# AI 리버스 프롬프트 자동화 (reverse-prompt) — 분석 및 개발 플랜 (2026-10-13, 승인 대기)

> 상태: **분석·플랜 단계. 코드 미착수.** 참고 사이트: https://reverse-prompt-architect.vercel.app/ ("Reverse Prompt Architect", 개발자 GPT PARK).
> 분석 방법(핵심 원칙 14번): 공개 HTML(`index.html`), 메인 JS 번들(`/assets/index-Ccw_J4qu.js`, 487KB)을 통째로 내려받아 앱 코드 구간(시스템 지침·응답 스키마 3종·i18n 전문·컴포넌트·키 저장 로직)을 전부 정독했다. 소스맵·별도 API 엔드포인트는 없음(404) — 서버 없는 순수 클라이언트 앱이다. 내려받은 파일은 실행하지 않고 읽기만 했다.

## 1. 원본 분석

### 1-1. 한 줄 요약
이미지·동영상·오디오 파일 하나를 올리면 Gemini가 **전문가 관점으로 분해**해서, 다른 생성 AI(Midjourney / Sora·Veo·Runway / Suno·Udio)에 그대로 붙여 쓸 수 있는 **구조화된 JSON + 영문 프롬프트**를 돌려주는 "역설계 프롬프트 추출기"다. 서버 없이 브라우저에서 Gemini를 직접 호출하고, 결과 저장·기록은 없다.

### 1-2. 화면 구성 (단일 페이지)
헤더(도움말 · 설정 · KR/EN 토글, 뱃지 "Gemini 3.0 Pro", 제목, 부제) → **업로드 영역**(클릭/드래그, 점선 박스) → 업로드 후 **미리보기**(이미지/영상 플레이어/오디오 플레이어 + 삭제 버튼) → 분석 중 스피너("현실 분해 중…") → **결과**(제목·타겟 도구 배지·JSON 복사 / 추천 프롬프트 카드(+복사, 이미지는 부정 프롬프트) / 분석 요소 카드 그리드 / Raw JSON 패널) → 푸터(개발자 크레딧). 설정 모달(API 키 입력·연결 테스트·삭제), 도움말 모달(4개 섹션). 어두운 배경(gray-950) 테마, 폰트 Inter·JetBrains Mono, Tailwind CDN.

### 1-3. 처리 흐름과 로직
1. **파일 선택**(클릭·드롭): MIME으로 종류 판별 — `image/*`→IMAGE, `video/*`→VIDEO, `audio/*`→AUDIO, 그 외는 거부(alert). **500MB 초과 거부**. FileReader로 **base64 전체를 메모리에 올리고** `URL.createObjectURL`로 미리보기.
2. **분석 호출**: 0.6초 지연 후 `gemini-3.5-flash`에 `inlineData`(base64)+지시문, `systemInstruction`(역할 "Reverse Prompt Architect & Media Forensics Specialist"), `responseMimeType: application/json`, 종류별 `responseSchema`, `temperature 0.4`. 코드펜스 제거 후 `JSON.parse`.
3. **언어 규칙**: 설명 값은 선택 언어(KO/EN), `prompt` 계열 값(`prompt`·`video_prompt`·`audio_prompt`·`full_command`·기술 파라미터)은 항상 영어.
4. **시스템 지침 5규칙**: 세부 묘사("그냥 기타 ✕ → 리버브 걸린 디스토션 일렉기타 ○"), 영상은 시각+오디오 둘 다 분석(오디오를 무음으로 가정 금지), 전문 용어(시네마토그래피·음악이론·사진), 이미지는 시각 분석과 Midjourney 명령을 엄격히 분리, 프롬프트는 영어.
5. **결과 표시**: 종류별로 주 프롬프트(이미지: `full_command` 우선, 없으면 `prompt` / 영상: `video_prompt` / 오디오: `audio_prompt`)를 강조 카드에, 나머지는 카드 그리드로(`prompt` 포함 키·`full_command`는 제외, 객체는 하위 키 격자, 배열은 쉼표 연결). Raw JSON 전체 표시, JSON/프롬프트 복사(2초 "복사됨").
6. **API 키**: 설정 모달에서 입력 → `gemini-3.5-flash`에 "ping" 호출로 **연결 테스트** → `localStorage`에 저장. 저장 방식은 `btoa(문자열 뒤집기)`뿐이라 암호화가 아니다(화면에는 "암호화되어 저장"이라고 안내).

### 1-4. 종류별 출력 스키마 (우리 버전의 기준)
| 종류 | 대상 도구 | 필수 구조 |
|---|---|---|
| 이미지 | Midjourney | `visual_analysis{subject_details, environment, lighting_style, color_grade[], composition_guide, artistic_style}` + `midjourney_data{prompt, negative_prompt, parameters{aspect_ratio, stylize 0–1000, chaos 0–100, weird 0–3000, version, tile}, full_command}` |
| 동영상 | Sora / Veo / Runway | `cinematography{camera_movement, shot_type, camera_angle, lens_characteristics}`, `visuals{subject_action, lighting_atmosphere, color_palette, visual_style}`, `editing{pacing, transition_style}`, `audio_atmosphere{sound_design, music, dialogue}`, `video_prompt` |
| 오디오 | Suno / Udio | `musical_structure{genre_main, sub_genre, key_scale, bpm, time_signature}`, `instrumentation{lead[], rhythm[], bass, drums}`, `vocal_layer{presence, gender, style}`, `emotional_profile{mood, energy_level}`, `audio_prompt` |

### 1-5. i18n 문구 (한국어 UI 기준 전문 확보)
제목 "리버스 프롬프트 아키텍트", 부제 "이미지, 동영상, 오디오 파일을 업로드하여 Midjourney, Sora, Suno용 전문 생성 프롬프트(JSON)를 추출하세요.", 업로드 "클릭하거나 드래그하여 업로드 / 지원 형식: 이미지(JPG,PNG), 동영상(MP4,WEBM), 오디오(MP3,WAV)", 로딩 "현실 분해 중… 패턴, 조명, 시간 데이터 분석 진행 중", 결과 "분석 결과 / 타겟 도구 / JSON 복사 / 추천 프롬프트(English) / 부정 프롬프트(Negative) / 분석 요소 상세 / Raw JSON 출력", 도움말 4섹션(작동 원리·지원 형식·오디오 분석·개인정보 보호). 우리 앱은 문구를 새로 쓰되 의미 구조는 유지한다.

### 1-6. 결함·한계 (우리 버전에서 해결)
1. **키 보안**: 키를 브라우저 localStorage에 거의 평문(뒤집은 base64)으로 보관 — "암호화" 표기는 사실과 다름. 우리: 서버 `user_api_keys` + 서버에서만 호출.
2. **대용량 처리 불가**: 500MB까지 받겠다면서 base64 인라인 전송 → Gemini 인라인 한도(요청 약 20MB)와 브라우저 메모리에서 큰 영상은 실패하는데 사유를 알려 주지 않음. 우리: 임시 업로드 + Files API.
3. **모델 표기 불일치**: 화면은 "Gemini 3.0 Pro"인데 실제 호출은 `gemini-3.5-flash`.
4. **오류 처리**: `alert()` 사용, 응답 JSON 검증 없음(파싱만), 안전 필터·한도·키 오류를 구분하지 않음.
5. **기록·재사용 없음**: 새로고침하면 결과가 사라지고, 같은 파일을 다른 옵션으로 다시 분석하려면 재업로드.
6. **옵션 부재**: 이미지 분석 시 대상 도구(Midjourney 외 DALL·E/Flux/Stable Diffusion), 영상 분석 시 구간·초점, 프롬프트 길이/스타일을 고를 수 없음. 사용자가 결과를 수정·재생성할 수 없음.
7. 영상 분석 시 프레임 수·길이 제어 없음(전체 전송), 오디오 파일에 대한 시간 구간 분석 없음.
8. 어두운 고정 테마·개발자 크레딧 하드코딩 — AIMaster 흰색 규격과 불일치.

### 1-7. 확인한 사실
- `gemini-3.5-flash`는 운영자 본인 키로 호출해 정상 응답(2026-10-13), `gemini-3.1-pro-preview`도 정상. `@google/genai`의 Files API(`ai.files.upload`) 사용 가능.
- 이 플랫폼에는 이미 **`style-dna-analyzer`**(이미지 한 장 → 카메라·조명·스타일 DNA·색상 팔레트·마스터 프롬프트)와 **`ai-audio-analyzer`**(음성/음악 분석·회의록)가 있다. 겹치는 부분은 있으나 성격이 다르다: 이 프로그램은 **"세 종류 미디어 → 타 AI 생성 도구용 프롬프트 JSON"**이라는 생성 도구 연결에 초점을 둔 별도 프로그램으로 둔다(카탈로그에 목적을 분명히 구분해 표기).

## 2. 제품 정의 (결정 사항 — 되묻지 않고 확정)
| 항목 | 결정 | 이유 |
|---|---|---|
| 이름 / slug | **AI 리버스 프롬프트 자동화** / `reverse-prompt` | 플랫폼 명명 관례. 폴더·slug·Vercel 프로젝트·도메인(`reverse-prompt.buylife.xyz`)을 처음부터 통일. 구현 때 `reverse-prompt.vercel.app` 선점 여부를 먼저 확인하고, 선점이면 도메인만 공식 주소로 사용 |
| AI 호출 | 서버 경유 + **회원 본인 Gemini 키**, 키 없으면 안내(폴백 금지) | 최상위 규칙 |
| 모델 | 기본 `gemini-3.5-flash`(원본과 동일, 빠르고 멀티모달), 옵션으로 `gemini-3.1-pro-preview`(정밀), 실패 시 `gemini-2.5-flash` 폴백. 화면에는 실제 모델명을 표기 | 표기·실제 일치 |
| 파일 처리 | **브라우저 → Supabase Storage 비공개 임시 버킷 직접 업로드**(경로 `<uid>/…`, 첫 폴더=본인 uid 정책) → 서버가 읽어 **Gemini Files API로 올려 분석** → 완료 즉시 임시 파일 삭제(+크론/열 때 정리) | Vercel 본문 4.5MB 한도 회피(ERROR_LESSONS 2026-10-07 큰 파일 업로드 선례), 키는 서버에만 |
| 크기 제한 | 이미지 20MB, 오디오 50MB, 동영상 50MB(및 길이 안내). 초과 시 사유와 줄이는 방법 안내 | 저장소·응답 시간 현실 반영(원본의 500MB는 사실상 동작 불가) |
| 기록 | 분석 **결과(JSON·옵션·파일명·썸네일 작은 이미지만)**는 회원별 DB에 저장(최대 100건), 원본 파일은 저장하지 않음 | 재사용·개인정보 최소화 |
| 접근 | FREE 아님(일반 이상 + 관리자 부여 사용기간), 기본 요금제 1·2·3개월 | AI 기능 프로그램 기본 정책 |
| 화면 | 흰색 베이스 표준 사이드바(번호형 흐름 ①파일 올리기 ②분석 옵션 ③결과·기록, API키등록·플랫폼연동, 연동 & 사용 매뉴얼), KO/EN 토글 | 플랫폼 규격 |
| 프롬프트 | 당해 연도 주입(규칙 8), 한국어 설명/영어 프롬프트 규칙 유지, 인물 묘사는 분석 대상 그대로(생성 프롬프트에 한국인 기본 규칙은 적용하지 않음 — 원본 파일의 실제 인물을 묘사하기 때문) | 정확한 역설계 |

## 3. 기능 범위

### v1.01 (원본 동등 + 결함 해결)
1. 업로드: 클릭/드래그/붙여넣기(Ctrl+V 이미지), 종류 자동 판별, 형식·크기 검사, 진행률 표시, 미리보기(이미지·영상·오디오), 교체/삭제.
2. 분석 옵션: 언어(KO/EN), 모델(Flash/Pro), 이미지 대상 도구(Midjourney 기본 / DALL·E·GPT Image / Flux·Stable Diffusion 자연어형), 영상 대상(Sora / Veo / Runway / Kling 공통형), 오디오 대상(Suno / Udio), 프롬프트 길이(간결/표준/상세), 사용자 메모(추가 지시, 예: "배경 위주로").
3. 분석 결과: 종류별 스키마 **검증·정규화**(누락 필드 보정, 숫자 범위 clamp: stylize/chaos/weird, 형식 어긋나면 1회 재시도), 추천 프롬프트 카드(복사, 이미지는 부정 프롬프트·`full_command`), 분석 요소 카드, Raw JSON, 내보내기(JSON 복사/파일 저장, Markdown 요약 복사).
4. **다시 분석**: 같은 임시 파일을 옵션만 바꿔 재분석(결과 화면에서 업로드 없이), 결과 일부 문구 편집 후 프롬프트 재조합.
5. 기록: 최근 분석 목록(제목·종류·날짜), 열기·삭제·즐겨찾기.
6. 안전·오류: 키 없음/한도/안전 필터/형식 오류/크기 초과를 구분한 한국어 안내(alert 사용 안 함), 취소 버튼.
7. 설정: API키등록·플랫폼연동 표준 화면(Gemini 키 1종) + 연동 매뉴얼 팝업, 사용 매뉴얼 페이지.

### 후속
영상 구간 지정 분석(시작~끝 초), 여러 파일 일괄 분석, 분석 결과로 바로 이미지 생성(별도 프로그램 연결), 프롬프트 즐겨찾기 폴더, 영어 UI 문구 정리.

## 4. 아키텍처
- Next.js 16 App Router + TS, 순수 CSS. `landing-architect`/`fashion-style`/`ui-canvas`의 골격(접근 판정·사이드바·키 관리·로그인·`/open`·도메인 SSO 쿠키)을 그대로 복사해 시작.
- `src/lib/rpa/`(순수 로직, 단위 테스트): `schemas`(3종 정의·검증·정규화), `prompts`(시스템 지침·종류별 지시문·옵션 반영), `media`(MIME 판별·크기 제한·경로 검증), `export`(JSON·Markdown).
- 서버 API(전부 `checkProgramAccessApi` + `force-dynamic`): `POST /api/upload/sign`(임시 업로드 서명 URL·경로 발급·종류/크기 검증), `POST /api/analyze`(경로 소유 검증 → Storage에서 읽기 → Files API 업로드 → generateContent → 검증·저장 → 임시 파일 삭제, `maxDuration` 300), `GET/PATCH/DELETE /api/history`, `/api/keys`, `/api/cleanup`(CRON 또는 열 때 본인 몫 정리).
- DB: `reverse_prompt_history(id, user_id, title, media_type, mime, file_name, options jsonb, result jsonb, prompt text, thumb text(≤30KB data URL), favorite bool, created_at)` + RLS owner-only(서버는 service role + `user_id` 필터). Storage 비공개 버킷 `reverse-prompt-tmp`(첫 폴더=uid 정책, 파일 크기 제한 50MB).
- 환경변수 새로 추가 없음(공용 Supabase 3종만). Vercel 프로젝트·도메인은 프로그램별 신규 생성.

## 5. 등록·썸네일
`programs` 등록(slug `reverse-prompt`, 카테고리 멀티미디어, 최소 등급 일반, 배지 `new`, `app_url`, v1.01) + 요금제 3종 + VIP 등급 접근. 썸네일은 `PLATFORM_PATTERNS.md §13` 템플릿 + `scripts/generate-program-thumbnail.mjs`(한국인 실사 16:9: 이어폰·태블릿·카메라 화면에 분석 카드 암시).

## 6. 단계
| 단계 | 내용 | 검증 |
|---|---|---|
| 0 | 골격 복사·인증·접근·사이드바·키 관리·DB·버킷 | 로그인→권한→키 등록 |
| 1 | 스키마·프롬프트·미디어 규칙 순수 로직 + 단위 테스트 | `npm test` |
| 2 | 업로드 서명·분석·기록 API, Files API 연동, 오류 분류 | 모의 + 실제 1회씩(이미지/오디오/영상) |
| 3 | 화면(업로드·옵션·결과·기록) | 보이는 Chrome 하네스 + 운영 로그인 화면 |
| 4 | 매뉴얼·등록·썸네일·도메인·배포·인수인계 | 라이브 점검, 커밋·푸시 |

## 7. 리스크
1. **대용량 영상 처리 시간/비용**: Files API 업로드+처리 대기(상태 PROCESSING 폴링) 최대 수 분 → 진행 표시, 길이·크기 상한, 시간 초과 시 안내.
2. **개인정보·권리**: 사용자가 올린 사진/영상 임시 보관 → 분석 직후 삭제, 비공개 버킷, 매뉴얼에 타인 저작물·초상 주의 문구.
3. **응답 형식 불안정**: 스키마 강제 + 검증 + 1회 재시도.
4. **Gemini 모델명 변동**: 모델 체인 상수화, 화면에 실제 사용 모델 표시.
5. **유사 프로그램 중복**: `style-dna-analyzer`·`ai-audio-analyzer`와 역할 구분을 카탈로그 설명에 명시.

## 8. 승인 요청 사항
위 플랜대로 구현을 시작해도 되는지 확인이 필요합니다("진행해줘"). 구현 시 새로 하는 외부 영향 작업: 비공개 임시 Storage 버킷 1개와 히스토리 테이블 1개 생성, Vercel 프로젝트·도메인 신규, 썸네일 생성(Gemini 이미지 1회).
