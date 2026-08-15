# music — AI 음악 자동생성기

곡 설명(주제/분위기)을 입력하면 AI가 장르 스타일·제목·가사를 기획하고, Suno API로 실제 곡
(보컬판/인스트루멘탈판)을 자동 생성해주는 프로그램. AIMaster 플랫폼 회원 중 이 프로그램
이용 권한이 있는 모든 사용자가 각자 자신의 계정으로 쓸 수 있는 멀티테넌트 서비스다.

## 파이프라인 (Phase 1 — 현재 구현 범위)

1. **곡 기획** (`/plannings/new`): 곡 설명 + 보컬 성별(선택) + 언어를 입력하면 GPT가
   ①Suno 스타일 설명/제외 스타일 ②"한글 제목(English Title)" 형식 제목 + 설명을 기획한다.
2. **생성 요청** (`/plannings/[id]`): 보컬버전/인스트루멘탈버전 중 원하는 걸 체크하고
   "생성하기"를 누르면, GPT가 보컬판은 전체 가사를, 인스트루멘탈판은 Suno용 BGM 프롬프트를
   작성한 뒤 Suno `/generate`를 호출한다. 실제 생성은 비동기라 완료되면 웹훅으로 결과가 온다.
3. **웹훅 저장** (`/api/webhooks/suno`): Suno가 생성을 마치면 콜백을 보낸다. 오디오/커버이미지를
   우리 Storage(`music-audio`)에 영구 저장하고 트랙 상태를 갱신한다. 화면은 5초 간격으로
   자동 새로고침되며 완료를 반영한다.
4. **가사 수정 재생성**: 보컬판 트랙의 가사를 화면에서 직접 고친 뒤 "수정해서 재생성"을 누르면,
   기존 스타일/제목은 그대로 두고 수정된 가사로 Suno를 다시 호출한다(이력 보존을 위해 새
   트랙으로 저장).

## 설계 배경 — Make.com 자동화 시나리오 이식 (2026-08-15)

사용자가 `D:\PDS\`에서 Make.com(Integromat) + Airtable로 운영하던 Suno 음악 자동화 시나리오
5개(`01` 기획+생성호출, `02` 음악저장, `03` 가사수정, `31` 대량생성, `41` 리믹스)를 AIMaster
서브프로젝트로 이식한 것이다. Make.com은 "관리자 1인이 Airtable 버튼을 눌러 실행"하는 구조였고,
이를 AIMaster의 멀티테넌시 SaaS 구조(로그인/구독권한/본인 API 키/RLS 격리)로 다시 짰다.

사용자가 실제로 쓰던 Airtable 베이스(`appMlz5xmVveBaUNk`)를 직접 열어 필드 구조를 검증했다 —
그 과정에서 "Vocal" 필드가 보컬/인스트루멘탈 선택 토글이 아니라 "보컬 성별"(여성/남성) 선호도
이고, 실제로는 매 기획마다 보컬판과 인스트루멘탈판이 기본적으로 함께 생성되는 구조라는 걸
확인해서 반영했다.

### Make.com 시나리오 전체 구조 (참고용, Phase 1은 `01`/`02`/`03`만 구현)

| # | 이름 | 하는 일 | Phase |
|---|------|---------|------|
| `01` | 기획+음악생성호출 | GPT로 스타일/제외스타일 → GPT로 제목/설명 → 보컬판(가사)과 인스트루멘탈판(BGM 프롬프트)을 Suno `/generate`로 호출 | **Phase 1** |
| `02` | 음악저장 | Suno 웹훅 콜백 수신 → taskId로 레코드 찾기 → 오디오 2개(variant)+커버이미지 저장 | **Phase 1** |
| `03` | 가사수정 | 가사를 수정하면 기존 스타일/제목 유지한 채 Suno를 다시 호출 | **Phase 1** |
| `31` | 대량생성 | 반복 횟수만큼 GPT로 서로 다른 스타일을 순차 생성하며 매번 새 곡 요청 | Phase 2 |
| `41` | Remix | 기존 오디오 업로드 + 원하는 느낌 → Suno `/generate/upload-cover`로 리믹스 생성 | Phase 2 |

### 주요 설계 결정

- **Suno 클라이언트/BGM 프롬프트 재사용**: `shots/src/lib/ai/music.ts`의 요청/에러 처리 구조와
  `shots/src/lib/ai/script.ts`의 `BGM_SYSTEM_PROMPT`(감정→음악 속성 변환 규칙)를 그대로 재사용
  했다. 단 shots는 완료 여부를 **폴링**으로 확인하지만, music은 Make.com 원본과 동일하게
  **웹훅 콜백**으로 받는다 — AIMaster 최초의 진짜 외부 웹훅 수신 라우트다.
- **웹훅은 세션이 없다**: `/api/webhooks/suno`는 `checkProgramAccessApi()`를 쓸 수 없다. taskId가
  우리 DB의 실제 `music_tracks` 레코드와 매칭되는지로만 신뢰성을 확보하고, `createAdminClient()`
  (service role)로 RLS를 우회해 `record.user_id` 기준으로만 갱신한다.
- **콜백은 여러 번 온다**: Suno 콜백의 `callbackType`은 `text`→`first`→`complete` 순으로 온다.
  Make.com 원본은 이 구분 없이 처리하지만, 여기서는 `complete`일 때만 최종 저장해서 중간 콜백이
  빈 데이터로 덮어쓰는 걸 방지했다.
- **트랙 이력 보존**: 가사 수정 재생성은 Make.com 원본처럼 기존 레코드를 덮어쓰지 않고, 새
  `music_tracks` row를 만들어 이전 생성 결과도 남긴다(shots/shop-detail-page의 재생성 이력
  패턴과 동일).
- **장르 참고 목록 압축**: 스타일 생성 프롬프트(`lib/ai/musicPrompts.ts`)의 장르 참고 목록은
  원본 시나리오가 수천 단어짜리 태그 나열을 썼지만, 유지보수를 위해 대표 태그로 압축했다 —
  GPT가 자유롭게 장르를 조합하는 방식이라 생성 품질 차이는 크지 않다.

## 환경 변수

`.env.local.example` 참고 — Supabase 접속 정보, `NEXT_PUBLIC_MAIN_SITE_URL`(로그인/권한 없을 때
리다이렉트할 AIMaster 루트 사이트), `NEXT_PUBLIC_SITE_URL`(이 앱 자기 자신의 배포 주소 — Suno
콜백 URL `${NEXT_PUBLIC_SITE_URL}/api/webhooks/suno`을 만드는 데 쓰인다. **루트 사이트가 아니라
반드시 이 서브프로젝트 자신의 배포 주소여야 한다** — threads/insta_auto_poster의 OAuth 콜백과
동일한 구분 원칙. 배포 전에는 로컬 주소라 웹훅이 실제로 도달하지 않는다)만 있으면 된다.
GPT/Suno API 키는 관리자 환경변수로 등록하지 않는다 — 각 사용자가 `/settings`에서 본인 키를
등록한다.

## DB 마이그레이션

- `supabase/migrations/0001_music_tables.sql` — `music_plannings`/`music_tracks`/
  `music_track_variants` 3개 테이블 + RLS owner-only 정책
- `supabase/migrations/0002_storage.sql` — `music-audio`(public) 버킷 + storage 정책

`user_api_keys`의 `openai`/`suno` provider는 `auto-detail-page/supabase/migrations/
0001_multitenancy.sql`에서 이미 전체 제약에 등록해뒀으므로 이 프로젝트에서 다시 추가하지 않았다.

## 배포 정보

- Vercel 프로젝트: `buylife/music` — 프로덕션 URL `https://music-rho-virid-22.vercel.app`
- `programs` 테이블: `slug = "music-automation"`, 카테고리 `음악(music)`으로 등록 완료, `app_url`도
  위 프로덕션 URL로 반영됨
- 배포 시 Vercel 환경변수(Production)에 `NEXT_PUBLIC_SITE_URL`을 실제 배포 도메인으로 반드시
  맞춰야 한다 — Suno 웹훅 콜백 주소가 이 값으로 만들어지는데, `NEXT_PUBLIC_`은 빌드 타임에
  번들에 박히므로 값을 바꾸면 재배포(재빌드)까지 해야 반영된다(2026-08-15, 첫 배포 때 이 값을
  빼먹어서 콜백이 AIMaster 루트 사이트로 잘못 가는 바람에 생성된 곡이 화면에 반영되지 않는
  버그가 있었음 — `scripts/fix-stuck-track.mjs`로 그때 막혀있던 트랙을 수동 복구함)

## 남은 과제

- Phase 2: 대량생성(`31`), 리믹스(`41`)
- Phase 3(제안): 곡 연장(`/generate/extend`), 보컬/반주 추가, Stem 분리(`/vocal-removal`),
  가사 타임스탬프, WAV 변환, 크레딧 조회(`/generate/credit`), 나노바나나 커버아트 교체,
  완성곡을 threads/insta_auto_poster/shots로 홍보 게시 연계
