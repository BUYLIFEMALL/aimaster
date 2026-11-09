# 인수인계 — 2026-11-09 음악 담당 세션 마무리 ([역할: music] `claude-win-20261024-music`, Claude Code 윈도우)

다른 CLI(Codex·agy·다른 Claude 세션)가 이 문서 하나로 이어서 작업할 수 있게 정리한다. 상세 버전 기록은 `free-music-studio/AGENTS.md` §4, 교훈은 `docs/ERROR_LESSONS.md` 2026-11-09 항목들.

## 1. 지금 상태(운영)

| 프로그램 | 운영 버전 | 배포 주소(이번) | 미배포 대기 |
|---|---|---|---|
| `free-music-studio` | v1.59 · 엔진 설치 파일 0.8.1 | `free-music-studio-6ck2jt91u` | 없음 |
| `ai-image-studio` | v1.34 | `ai-image-studio-lsnyhsput` | 없음 |
| `playlist-channel-studio` | v1.38 | `playlist-channel-studio-qyf2jm7xn` | 없음 |

- https://free-music-studio.buylife.xyz/songs
- https://ai-image-studio.buylife.xyz/gallery
- https://playlist-channel-studio.buylife.xyz/video

## 2. 오늘(2026-11-09) 한 일

1. **연주곡 장르 2단계(v1.58)**: 대분류 9개 = 연주곡 프리셋 분류와 같은 이름, 세부 49개(`src/lib/lyricTags.ts` `INSTRUMENTAL_GENRE_GROUPS`·`subGenresOf(genre, true)`·`instrumentalGenreHint`). 곡 만들기 연주곡 모드에 장르 칩, 프리셋 카드가 그 장르만, AI 작곡 기획(`/api/plan` `genre` → `planInstrumentals`)이 그 장르(세부) 안에서 짬. 노래↔연주곡 바꾸면 장르 비움. 시험 `tests/lyricTags.test.mjs` 2개 추가.
2. **함께 배포(v1.58)**: 단계 막대·AI 작사 접기(C-36), 넓은 화면 배치(C-35). 이미지 v1.34(내 PC 그림 갤러리 자동 저장), 플레이리스트 v1.38(추가 스티커 3개).
3. **곡 만들기 화면 왼쪽 메뉴 먹통 수정(v1.59)** — 아래 3절.
4. **상태 카드 「작업 대기열」 링크(v1.59)**: `src/components/songs/StudioStatusBar.tsx` 제목을 `/queue` 링크로, 「대기열 보기 →」 항상 표시.
5. 역할 파일 `docs/roles/music.md` 정리(끝난 항목 제거, 최근 완료 10개).

## 3. 꼭 알아야 할 버그와 재발 방지

- **증상**: 곡 만들기(`/songs`)에서만 왼쪽 메뉴·화면 안 링크·`router.push` 모두 안 됨. 오류 표시 없음.
- **원인**: `src/components/engine/MultiVersionPanel.tsx`에서 그릴 때마다 새로 만든 `engines` 배열을 `useEffect(() => setConsents(...), [engines])` 조건에 넣어 상태 갱신이 끝없이 반복 → Next.js 화면 전환이 끝나지 않음. v1.57(「여러 버전 한 번에」 도입)부터.
- **해결**: `engines`를 `useMemo(..., [queueMode, status])`로 고정.
- **재발 방지**: `useEffect`·`useMemo`·`useCallback` 조건 배열에 매번 새로 생기는 배열·객체·함수 결과를 넣지 않는다. 큰 화면 변경 뒤에는 배포 전에 `next dev`로 열어 브라우저 콘솔의 「Maximum update depth exceeded」 경고를 확인한다(운영판에서는 숨음).
- **내 PC 개발 서버 띄우는 법**(운영 DB): `process.loadEnvFile("D:/Antigravity/AIMaster/.env.local")` 뒤 `next dev -p 3107`을 자식 프로세스로 실행(`--env-file`은 Next가 거부). 로그인은 운영 사이트의 `sb-` 쿠키를 localhost에 옮김. `next dev`가 이 폴더 `AGENTS.md` 끝에 안내 블록을 덧붙이므로 끝나면 지운다.

## 4. 배포할 때 주의 — 다른 세션의 미커밋 변경

- 이 폴더에 **다른 세션의 미커밋 변경**이 있다: `src/components/songs/AlbumArtPanel.tsx`(`pickLocalArtVariant` 사용), `engine/src/imageArt.mjs`, `engine/tests/imageArt.test.mjs`, `tests/engine.test.mjs`, `desktop/build/icon.png`. 내 PC 그림 모델 고르기 관련으로 보이며, 아직 운영에 없다. **건드리지 말고 그 세션이 마무리하게 둔다.**
- `scripts/deploy.mjs`는 작업 폴더를 그대로 올리므로, 이 변경이 남아 있는 동안 배포하면 섞여 나간다. v1.59는 커밋된 코드만 꺼내 배포했다:
  1. `git archive HEAD free-music-studio | tar -x -C <스크래치>`
  2. `.vercel/` 복사, git 제외 파일 `public/downloads/AI-Free-Music-Engine-Setup-0.8.1.exe` 복사(빠지면 설치 파일 받기가 깨짐)
  3. 그 폴더에서 `npx vercel deploy --prod --yes --scope buylife`
  4. `node scripts/deploy.mjs free-music-studio --version-only --set-version --owner <세션>`
- 배포 출력은 처음부터 파일로 받는다. 결과가 안 보인다고 `deploy.mjs --go`를 다시 돌리면 빌드가 한 번 더 된다(오늘 v1.58에서 1회 낭비).

## 5. 남은 일(대기)

| 항목 | 기다리는 것 |
|---|---|
| C-17 트로트·성인가요 장르 | 주인님 「일단 대기」 — 마스터PC 한국어 트로트 실물 확인 뒤 |
| WAV → FLAC 통일 | 주인님 「일단 놔둬」 — 지시 있을 때만(ACE-Step·LeVo 2 = FLAC, YuE2·HeartMuLa·Stable Audio 3·마스터링 = WAV, 둘 다 무손실) |
| A-6 Apple Silicon 맥 엔진 | 맥 준비(엔진 0.7.7 이상) |
| B-6 LeVo 2 v2-medium | 공식 코드 공개(아직 404) |
| B-4 가사 시간 추가 비교 | 수동 정답 자료 |
| D-2 앨범 그림 모델 이름 | `ai-image-studio` 모델이 바뀔 때 |
| 실물 확인(선택) | 마스터PC에서 연주곡 장르 골라 AI 작곡 기획 1회 |

## 6. 다음 첫 단계

1. `node scripts/dev-requests.mjs list --role music`로 관리자 지시 확인
2. `docs/roles/music.md` → 이 문서 → `free-music-studio/docs/IMPROVEMENT_BACKLOG.md` 순서로 읽기
3. 배포 전 `git status --porcelain -- free-music-studio`로 다른 세션 미커밋 변경 확인(4절)

## 7. 비용(오늘)

- Vercel 빌드 5회: 무료음악 v1.58 2회(1회는 실수로 다시 실행), 이미지 1, 플레이리스트 1, 무료음악 v1.59 1. AI 호출 없음.
