# 플레이리스트 채널 제작 자동화 — 인수인계 (AGENTS.md)

> 다른 CLI가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다.

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | 플레이리스트 채널 제작 자동화 / `playlist-channel-studio` |
| 현재 버전 | **v1.06** (`src/lib/version.ts` = `package.json` = DB `programs.version`) |
| 라이브 | https://playlist-channel-studio.buylife.xyz (옛 `*.vercel.app` 유지) |
| Vercel | 팀 `buylife`, 프로젝트 `playlist-channel-studio` (CLI 업로드 배포) |
| 배지·카테고리 | FREE + new, 유튜브, 최소 등급 일반, 요금제 1·2·3개월 등록 |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Supabase(DB+Storage) · `@google/genai` · `sharp` |
| 비용 | **회원 본인 키**(Gemini / OpenAI / Anthropic Claude, `user_api_keys`의 provider `gemini`·`openai`·`anthropic`)로 서버 호출 → 운영자 AI 비용 없음. 저장소(썸네일)는 운영자 부담 → 사용자당 프로젝트 30개 + 1280x720 JPEG |
| 참고 원본 | ai-playlist-creator-bice.vercel.app (HTML·번들 전체 분석, 흐름·옵션 참고, 프롬프트·문구는 새로 작성, 제작자 크레딧 미복제) |

## 2. 무엇을 하는가
① 장르(기본 14개 + 추천 9개 = 카드 23개 + 직접 입력) → ② 제목 10개(`playlist 이모지 한국어 문장 | 영어키워드 & 영어키워드` 형식 검증·보정, 직접 쓰기 가능) → ③ 4개 탭
- **Suno 프롬프트**: 변형 3개, 각 900자 미만(서버가 쉼표 단위로 자름).
- **가사**: 언어 5종(ko/en/ja/es/fr), 이중 언어 비율 10~90%, 곡 1~20, 은유 4단계, 곡 구조 15종(자동=장르 BEST), 인트로/아웃트로 가사, 연주곡 모드, 주제 메모. 곡 계획을 먼저 뽑고 4곡씩 병렬로 작성(곡 겹침 방지, 최대 300초).
- **유튜브 메타데이터**: 설명글, 해시태그 5개(`#playlist` 맨 앞), 키워드 15개.
- **썸네일**: 스타일 7종 배경(글자 없이 생성) + 인물 참고 이미지(저장 안 함) + 글꼴 14종·크기·색·굵기·위치로 Canvas 합성, PNG/JPG 저장, 프롬프트 복사, 수정 요청 재생성(현재 썸네일을 참조 이미지로 사용).
- 모델 선택: 텍스트 Gemini 2.5 Flash/Flash-Lite · GPT-4o mini/4o · Claude Haiku 5.5/Sonnet 5.5, 이미지 나노바나나/프로 · gpt-image-1(Claude는 이미지 불가). 선택은 브라우저 localStorage(편의용).
- 사용량: 호출 응답의 토큰·시간으로 예상 비용을 이 브라우저 localStorage에 기록·표시(실제 청구액과 다를 수 있음).

## 3. 구조
```
src/lib/playlist/types.ts     상수(장르·언어·구조·스타일·글꼴·모델·한도)와 타입
src/lib/playlist/prompts.ts   프롬프트(연도 규칙·한국인 묘사 기본·JSON 응답)
src/lib/playlist/validate.ts  AI 응답 정리 순수 함수(제목 형식·900자·해시태그·옵션 보정·비용)
src/lib/llm.ts                Gemini(SDK)·OpenAI·Claude(REST) JSON 호출, 이미지(Gemini/OpenAI) 생성, 오류 한국어화, needKeyBody
src/lib/apiKeys.ts            공급사별 본인 키 조회·저장·삭제(폴백 없음)
src/lib/routeGuard.ts         requireAccess / requireAccessAndKey(provider)
src/lib/projects.ts           소유 확인, 비공개 버킷 업로드/서명 URL, sharp 정규화
src/app/api/projects          목록·생성(30개 제한)
src/app/api/projects/[id]     조회·PATCH(제목 선택·썸네일 글자 설정)·삭제(파일 포함)
src/app/api/projects/[id]/generate  kind = titles|suno|lyrics|meta|thumbnail (모델의 공급사 키를 확인)
src/app/api/user-key          공급사별 키 GET/POST/DELETE
src/components/studio/*       StudioWorkspace(흐름) · ContentTabs(Suno/가사/메타) · ThumbnailTab(Canvas) · useAi(모델·사용량·키 안내 모달) · common
```
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드. 모든 API route에 `dynamic/fetchCache` 두 줄, 모든 쿼리에 `user_id` 필터.
- 제목을 바꾸면 Suno·가사·메타·썸네일(파일 포함)을 비운다(제목에 맞춘 결과이므로).

## 4. DB (공용 Supabase `esgxyikcnnvmlhygjkth`)
- `playlist_projects` (user_id, genre, title, titles jsonb, content jsonb{suno,lyrics,meta}, status[created|titled|content], thumb_path, thumb_settings, thumb_prompt) — RLS owner-only. 마이그레이션 `supabase/migrations/0001_playlist_tables.sql`(적용 완료), 등록 `0002_register_program.sql`.
- Storage 버킷 `playlist-thumbs`(비공개, 4MB): `<user_id>/<project_id>/thumb.jpg`.

## 5. 동작 메모 (원본과 다르게 한 점)
- 키: 원본은 브라우저 localStorage(base64)+직접 호출 → 서버 호출·회원 본인 키·공급사별 안내 모달.
- 결과: 원본은 새로고침하면 사라짐 → 프로젝트 저장, `?p=<id>` 이어보기.
- 썸네일: 이미지에는 글자를 넣지 않고 화면에서 합성(한글 깨짐 방지). 원본의 "LiteLLM Proxy Monitor" 가짜 이름·제작자 크레딧은 가져오지 않음.
- 화면 언어 전환(KR/EN)은 v1.02에서 구현하지 않음(한국어 고정).

## 6. 배포·운영 절차
1. `npm test` → `npm run build`. 2. 버전 +0.01(`src/lib/version.ts`의 `APP_VERSION` **줄만**) + `package.json` + DB `update programs set version=… where slug='playlist-channel-studio'` + 이 문서. 3. `cd playlist-channel-studio && vercel deploy --prod --yes --scope buylife`. 4. 경로를 지정해 커밋 후 `git push origin master`. 5. 라이브 새로고침해 사이드바 버전 확인.
- 환경변수 4개는 `scripts/add-playlist-channel-vercel-env.mjs`로 등록 완료. 카탈로그 썸네일은 `scratch/make_playlist_thumb.mjs`(운영자 본인 계정의 본인 Gemini 키 1회, 임시).

## 7. 알려진 한계·남은 일
- 검수(2026-10-13, 관리자 계정 본인 키 3종 등록 상태): 장르→제목 10개→선택→Suno 3종(900자 미만)→가사 3곡(이중 언어)→메타데이터→썸네일 생성·글자 합성(한국인 인물, 글꼴 적용)→Claude Haiku 5.5 텍스트 호출 200→키 미등록 안내 모달(fetch 모의)→모바일 폭 가로 넘침 없음→프로젝트 삭제(목록 0건). 시험 데이터는 삭제함.
- **미확인**: 일반 회원(`buylifemall@naver.com`) 계정 시험, 터치 기기, 시험은 모두 관리자 계정(본인 키 3종)에서만 했다.
- 화면 언어 KR/EN 전환 미구현. 원본의 곡 구조 15종·장르 10종·스타일 7종·글꼴 14종은 목록을 새로 구성함(원본과 이름이 다를 수 있음).
- 같은 폴더를 다른 CLI도 쓴다: 커밋은 경로를 지정(`git commit -- playlist-channel-studio …`).

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01** 신규 구축·테이블/버킷 마이그레이션 적용·첫 배포·도메인 연결·프로그램 등록(FREE+new, 유튜브).
- **2026-10-13 v1.05** 20곡 시험에서 재시도 후에도 4곡이 비는 현상 → 모델이 묶음 안에서 곡 번호를 다시 1부터 매기는 경우를 대비해 "번호가 이 묶음에 있으면 그대로, 아니면 순서로" 짝짓도록 보정.
- **2026-10-13 v1.04** 가사 20곡 시험에서 4곡이 누락되던 문제 수정: 실패하거나 빠진 곡은 한 번 더 시도(최대 2회). 실제 시험(관리자 본인 키): OpenAI GPT-4o mini 제목·GPT-4o 메타데이터 200, gpt-image-1 썸네일 22초·나노바나나 프로 썸네일 20초 성공, 가사 20곡 약 19초.
- **2026-10-13 v1.03** 장르 확장: 참고 사이트의 Pop·Study/Focus·Workout·Meditation 추가 + 추천 장르 9개(수면/앰비언트·카페 보사노바·드라이브 신스웨이브·클래식 피아노·힙합·록/밴드·트로트·캐럴/시즌·트로피컬/레게), 화면은 기본/추천 구역으로 나눔, 장르별 BEST 곡 구조 지정.
- **2026-10-13 v1.02** 모델 안내 문구 중복("Gemini·Gemini") 수정, 카탈로그 썸네일 등록, 인수인계·매뉴얼 문서 작성.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.06)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.
