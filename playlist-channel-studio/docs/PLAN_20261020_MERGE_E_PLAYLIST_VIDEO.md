# 개발 플랜 겸 인수인계 — 병합 E: Youtube Playlist 자동화(영상) → 플레이리스트 채널 제작 자동화 (2026-10-20, Claude Code 윈도우)

> **다른 CLI가 이어받을 때 이 문서부터 읽는다.** 진행 상태는 맨 아래 「8. 진행 상황」 표가 기준.
> 근거: `../../docs/analysis-youtube-consolidation-20261020/REPORT.md`. 같은 방식으로 끝낸 병합: C `../../youtube-viral-studio/docs/PLAN_20261020_MERGE_C_CONSULTANT.md`, D `../../thumbnail-master/docs/PLAN_20261020_MERGE_D_SEO_PRO.md`(3단계 절차·문서 목록·스크립트 참고).

## 0. 주인님 지시·결정
- 2026-10-20 병합 D 완료 후 「진행해줘」 → 병합 E 착수. 요금·권한 그대로, 회원 본인 계정·본인 API 키 최상위 규칙 유지. 이름은 2단계 전 확인(병합 C·D 때 짧은 이름 선호 — 후보 「YOUTUBE 플레이리스트 자동화」·「플레이리스트 채널 자동화」).

## 1. 기준 앱 — 보고서와 반대로 정정
| 구분 | 기준(남는 앱) | 들어오는 앱 |
|---|---|---|
| 프로그램 | 플레이리스트 채널 제작 자동화 `playlist-channel-studio` v1.14 · 유튜브 분야 · new | Youtube Playlist 자동화 `yt-playlist-studio` v1.14 · **음악 분야** · new |
| 주소 | https://playlist-maker.buylife.xyz | https://youtube-playlist.buylife.xyz |
| 구조 | 화면 분리(`/studio` `/projects` `/settings` `/guide`) + 프로젝트 DB `playlist_projects` + 서버 API(`/api/projects/*`, `/api/projects/[id]/generate`, `/api/user-key`) + 키 3종(Gemini·OpenAI·Claude) | **한 화면 앱**(`/` → `components/PlaylistStudioApp.tsx` 166줄이 편집·내보내기 등 보기 전환), 부품 약 3,060줄(`EditorStudio`·`ExportStudio`·`MediaCenter`·`ReferenceNotePanel`·`HelpModal`·`PlaylistGuideView`·`Sidebar`·`ApiKeyModal`), 렌더 `src/lib/render/` 약 950줄(브라우저 GPU MP4), 서버 API는 `/api/generate-bg`(나노바나나 배경)·`/api/user-key`뿐 |

보고서(§3)는 「렌더 엔진이 무거우니 영상 앱 기준」이었으나, 실제 렌더는 **브라우저 부품이라 통째로 새 화면으로 옮기기 쉽고**, 반대로 하면 프로젝트 DB·여러 화면을 한 화면 앱에 끼워 넣어야 해 작업이 큼 → **기준 = 채널 제작 앱**으로 정정. 유튜브 분야라 카탈로그 분야 변경도 불필요.

## 2. 조사 결과 (2026-10-20)
- 둘 다 Next 16(16.2.11 / 16.4.2)·Tailwind v4.
- 키 API: 둘 다 `checkProgramAccessApi` + 마스킹 키만 반환(보안 문제 없음). 영상 앱은 `gemini` 키만(배경 생성용), 채널 제작 앱은 gemini·openai·anthropic.
- DB: 영상 앱은 저장 표 없음(브라우저 작업) → **DB 이전 없음**. 채널 제작 `playlist_projects` 그대로.
- **권한: 두 프로그램 모두 143명, 완전히 같음** → 권한 이전 불필요. 구독 0.
- 공용 사본: 두 앱 모두 `lib/geminiImage.ts`·`lib/nanoBananaModels.ts`(공용 기준 코드 사본) — 영상 앱 것은 옮기지 않고 기준 앱 것을 씀(내용 동일 여부는 `scripts/check-shared-modules.mjs`로 확인).
- 외부 등록 주소 없음. 두 폴더 미커밋 변경·다른 CLI 작업 없음.

## 3. 단계
### 1단계 — 영상 만들기 화면 이식 (채널 제작 v1.15)
1. 영상 앱 부품을 `src/components/video/`로, 렌더 `src/lib/render/`·`src/lib/referenceNote.ts`를 `src/lib/video/`(이름 겹침 시)로, API `/api/generate-bg`를 같은 경로로 복사 → import 경로 바꾸기(병합 C의 `merge_c.mjs` 방식).
2. 새 화면 `/video`(「영상 만들기」): `PlaylistStudioApp`에서 **키 입력 모달(`ApiKeyModal`)·자체 사이드바는 빼고**(키는 기준 앱 `/settings`, 메뉴는 기준 앱 좌측 메뉴) 편집·내보내기 보기만 남긴다.
3. 기준 앱 좌측 메뉴·대시보드에 「영상 만들기」 단계 추가: 기획(제목·가사·썸네일) → Suno에서 곡 생성(외부) → 영상 만들기.
4. 검수: tsc·build, 크롬에서 `/video` 열기·음악 파일 넣기·미리보기(렌더 끝까지는 시간이 길면 짧은 곡으로 1회), 배경 AI 생성은 생략 가능(유료 이미지).
### 2단계 — 이름·매뉴얼·공지 띠 (v1.16)
- 이름(주인님 확정), 매뉴얼에 영상 만들기(영상 앱 `PlaylistGuideView`·`HelpModal` 내용) 합치기, 공지 띠 사본(Tailwind v4라 사용 가능).
### 3단계 — 옛 영상 앱 정리 (주인님 확인 후)
- 영상 앱 `next.config`: `/`·`/guide`·`/login` → 기준 앱 `/video`·`/guide`·`/login`, `/api/*` rewrite(같은 경로).
- DB 백업(`docs/analysis-youtube-consolidation-20261020/backup-programs-before-merge-e.json`) → 영상 앱 `is_active=false`·[병합됨], 기준 앱 이름·소개 다시 쓰기, 메인 `/programs/yt-playlist-studio` → `/programs/playlist-channel-studio`, 공용 점검 스크립트에서 영상 앱 사본 정리, 역량 지도·공용 문서·DESIGN.md.

## 4. 비용
- 유료 API 시험 없음(배경 AI 생성 생략). Vercel 빌드 단계마다 1회 + 3단계 옛 앱 1회.

## 5. 위험·주의
- 렌더는 브라우저 메모리를 많이 씀 — 이식 후 같은 브라우저(크롬·엣지)에서 짧은 곡으로 확인. 렌더 중 탭 유지 안내 유지.
- 영상 앱의 이미지 프롬프트(배경 프리셋)는 프로그램 고유 — 공용화하지 않고 그대로 옮긴다(`docs/IMAGE_PROMPT_RULES.md`).
- 배포 직전 「미배포 사본」 확인, 공용 문서는 내 줄만, 배포 주소 접두어 함정(`ERROR_LESSONS.md` 2026-10-20).

## 6. 결과물
- 기준 앱 `AGENTS.md`·`README.md` 7대 항목, 인수인계, 영상 앱 `AGENTS.md` 「병합됨」, 루트 HANDOFF, 역량 지도.

## 7. 다음 첫 단계 (이어받는 CLI)
1. `docs/ACTIVE_WORK.md` 확인 → 2. 아래 표에서 주인님 플랜 확인 여부 확인 → 3. 1단계 1번(영상 앱 부품·렌더 복사 스크립트).

## 8. 진행 상황
| 날짜 | CLI | 한 일 | 상태 |
|---|---|---|---|
| 2026-10-20 | Claude Code(윈도우) | 병합 E 조사(구조·키 API 안전·권한 143명 동일·DB 이전 없음), **기준 앱 정정(채널 제작 앱)**, 이 플랜 작성 | ✅ 분석·플랜 완료 / ⏳ **주인님 플랜 확인 대기, 코드 변경 없음** |
