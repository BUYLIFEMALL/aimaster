# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 음악 자동생성기(music)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때
준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 threads/insta_auto_poster/shop-detail-page와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (GPT 곡 기획/가사 생성, Suno 곡 생성 등)

---

## 🎯 프로젝트 목적

곡 설명(주제/분위기)을 입력하면 AI가 장르 스타일·제목·가사를 기획하고, Suno API로 실제 곡
(보컬판/인스트루멘탈판)을 자동 생성해주는 프로그램. 가사만 수정해서 재생성할 수도 있다.

**기존에 Make.com(Integromat) + Airtable로 운영하던 자동화 시나리오
(`D:\PDS\01/02/03/31/41 🟡🎵Suno자동화*.blueprint.json`)를 AIMaster 서브프로젝트로 이식한
것**이다 — 자세한 배경은 README.md "설계 배경" 참고. 멀티테넌시 스캐폴딩(로그인/API 키
정책/Supabase 클라이언트 등)은 shop-detail-page의 검증된 패턴을 그대로 재사용했다.

shots(유튜브 쇼츠)의 기존 Suno 연동(`shots/src/lib/ai/music.ts`)과는 목적이 다르다 — shots는
쇼츠 한 편의 배경음악(인스트루멘탈 전용, 폴링 방식)만 만드는 부속 기능이고, music은 가사가
있는 완성곡을 포함해 독립적으로 곡을 기획·생성·관리하는 전용 프로그램이다.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `music/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `music/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

music은 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub
구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- music은 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "music-automation"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다. **단, `app/api/webhooks/suno/route.ts`는 예외다** — Suno가
  보내는 진짜 외부 콜백이라 로그인 세션 자체가 없으므로 이 검사를 쓸 수 없다(아래 "웹훅 설계"
  참고).
- 사용자 소유 데이터 테이블(`music_plannings`, `music_tracks`, `music_track_variants`)은
  `user_id` + RLS owner-only 정책으로 격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `openai`(곡 기획/가사 생성) + `suno`(실제 곡 생성) 두 provider를
  쓴다. 본인 키가 없으면 `/settings`로 안내하고 생성을 막는다.
- 생성된 오디오/커버이미지는 전부 `music-audio`(public) Storage 버킷의
  `{user_id}/{trackId}/{variantIndex}.{mp3|jpg}` 경로에 저장한다.

### 웹훅 설계 (AIMaster 최초의 진짜 외부 웹훅 수신 라우트)

Suno(`api.sunoapi.org`)는 곡 생성이 끝나면 우리가 넘긴 `callBackUrl`(`/api/webhooks/suno`)로
POST 콜백을 보낸다. 이 라우트는:
- 로그인 세션이 없으므로 `checkProgramAccessApi()`를 못 쓰고, `task_id`가 우리 DB의 실제
  `music_tracks` 레코드와 매칭되는지로만 신뢰성을 확보한다(Suno/Make.com 원본도 별도 서명
  검증이 없다).
- `createAdminClient()`(service role, RLS 우회)로 taskId 매칭 후 `record.user_id` 기준으로만
  갱신한다.
- Suno 콜백은 `callbackType`이 `text` → `first` → `complete` 순으로 여러 번 오므로,
  **`complete`일 때만 최종 저장 처리**하고 나머지는 무시한다(중간 콜백에서 빈 데이터로 잘못
  덮어쓰는 걸 방지 — 원본 Make.com 시나리오보다 안전하게 구현한 부분).

## 📦 Make.com 시나리오 이식 현황 (Phase 진행 상태)

| Phase | 대응 시나리오 | 상태 |
|-------|---------|------|
| 1 | `01`(기획+생성호출), `02`(음악저장/웹훅), `03`(가사수정 재생성) | ✅ 구현 완료 |
| 2 | `31`(대량생성 — "생성 개수(대량생성)" 1~10곡 옵션으로 구현) | ✅ 구현 완료 |
| 2 | `41`(리믹스 — 업로드 오디오를 새 스타일로 커버) | ⏳ 예정 |
| 3 | 곡 연장(Extend) — `extendTrackAction()`, Suno `/generate/extend`, `defaultParamFlag:false`로 원본 파라미터 자동 재사용 | ✅ 구현 완료 |
| 3 | 보컬/반주 분리(Stem), 보컬-반주 추가(Add Vocals/Instrumental), 타임스탬프 가사, WAV 변환, 크레딧 조회 등 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 사용자와 합의함. 새 Phase를 시작할 때는
이 표를 갱신할 것.
