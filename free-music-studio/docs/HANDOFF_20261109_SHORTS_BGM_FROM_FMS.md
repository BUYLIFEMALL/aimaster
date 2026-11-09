# 인수인계 — 무료음악 곡을 쇼츠 원스톱 배경음악으로 가져오기 (백로그 D-4)

- 작성: 2026-11-09 [역할: music] `claude-win-20261024-music` (Claude Code 윈도우)
- 받는 사람: [역할: video] `claude-win-video` — `shorts-onestop-studio` 담당
- 주인님 지시: 「영상 담당에게 작업 위임할께 인수인계할 내용 전달해줘」(2026-11-09)
- 출처 검토: 「무료음악 연계 검토」 1순위 — 곡 받는 곳 4곳(가사영상·플레이리스트·뮤직비디오·쇼츠 원스톱) 중 쇼츠 원스톱만 무료음악 곡을 못 받는다(유료 AI 음악 스튜디오 곡만 `/api/ams/import`로 받음)

## 1. 목표

회원이 AI 무료음악 자동화(`free-music-studio`)에서 만든 곡을, 쇼츠 원스톱(`shorts-onestop-studio`) 렌더 화면(`/render`)의 **배경음악으로 바로 쓰게** 한다. 회원 키·요금이 들지 않는 무료 배경음악 경로가 생긴다.

## 2. 지켜야 할 원칙(무료음악 쪽)

- **무료음악 음원은 회원 PC 엔진에만 있다**(서버·DB에 음원 없음). 제목·가사·길이 같은 정보만 공용 DB `free_music_tracks`(회원 본인 `user_id`)에 있다.
- 그래서 다른 프로그램으로 넘길 때는 **무료음악 화면(브라우저)이 PC 엔진에서 음원을 받아 상대 창에 `postMessage`로 건넨다.** 상대 창이 서버로 무료음악 엔진을 부를 수 없다(엔진은 `127.0.0.1:47821`, 허용 사이트·연결 코드가 있어야 함).
- 이미 같은 방식으로 세 곳이 연결돼 있다 — 그대로 따라 하면 된다.

| 받는 곳 | 받는 쪽 코드 | 준비 신호 |
|---|---|---|
| 가사영상 | `lyric-video-studio/src/components/studio/FmsImportCard.tsx`, 서버 `src/lib/fms.ts`·`src/app/api/fms/song/route.ts` | `lvs-ready` |
| 플레이리스트 | `playlist-channel-studio/src/components/video/FmsImportPanel.tsx`, `src/app/api/fms/songs/route.ts` | `pcs-ready` |
| 뮤직비디오 | `music-video-studio/src/components/studio/SongCard.tsx` | `mvs-ready` |
| 보내는 쪽(무료음악) | `free-music-studio/src/lib/videoHandoff.ts`(`TARGETS` 표), 메뉴 `src/app/(dashboard)/library/page.tsx` | — |

## 3. 주고받는 순서(계약)

1. 무료음악 「모든 음악」 곡 메뉴 → **「쇼츠 배경음악으로」** → 새 창 `https://shorts-onestop-studio.buylife.xyz/render?fms=<trackId>` 를 연다(다른 세 곳과 같이 `?fms=` 쿼리, 클릭 안에서 바로 열어야 새 창이 막히지 않음).
2. 쇼츠 창이 열리면 주소의 `?fms=<trackId>`를 **대본을 열기 전에** 읽어 두고(주의: `RenderView.tsx`의 `open()`이 `window.history.replaceState(null, "", `/render?id=…`)`로 주소를 바꿔 써서 나중에 읽으면 사라짐 — 같은 파일 79~81줄 `?ams=`를 `pendingAms`에 먼저 담는 방식과 같게), `window.opener`에게 **`{ type: "sos-ready", ids: [trackId] }`** 를 보낸다(받는 곳 출처는 `https://free-music-studio.buylife.xyz`, `https://free-music-studio.vercel.app` 두 개 — `FmsImportCard.tsx`의 `FMS_ORIGINS`와 같게).
3. 무료음악 창이 엔진에서 **MP3 320k**(`fetchLibraryFile(id, "mp3")`)를 받아 **`{ type: "fms-audio", id, name, blob }`** 를 보낸다.
4. 쇼츠 창은 `message`를 받을 때 **`e.origin`이 위 두 출처이고 `e.source === window.opener`인지 꼭 확인**한다(가사영상 `FmsImportCard.tsx` 32줄과 같게). 다른 메시지는 버린다.
5. 받은 `blob`을 `new File([blob], name, { type: "audio/mpeg" })`로 만들어 **기존 `uploadBgm(file)`(같은 파일 163줄) 그대로** 올린다(`/api/media/bgm` 일회용 업로드 주소, 회원 폴더 `<user_id>/bgm/`). 대본이 하나면 바로 넣고, 여러 개면 AI 음악 스튜디오 곡과 같이 「이 대본에 넣기」 줄(`amsWaiting` 263~267줄과 같은 모양)을 보여 회원이 고른 대본에 넣는다. 대본이 없으면 「먼저 대본을 만들어 주세요」.
6. 제목 표시가 필요하면 서버에서 공용 DB `free_music_tracks`를 **회원 `user_id`로 거른 읽기만** 한다(`lyric-video-studio/src/lib/fms.ts`의 `getFmsSong` 사본, 휴지통 곡 제외). 쓰기 없음.
7. 3분(180초) 안에 음원이 오지 않으면 「무료음악 창에서 PC 엔진이 켜져 있는지 확인하거나, 파일을 직접 넣어 주세요」로 안내하고 기존 파일 올리기를 그대로 쓰게 한다.

## 4. 결정이 필요한 것(영상 담당이 주인님께 여쭙거나 판단)

| 항목 | 사실 | 추천 |
|---|---|---|
| 업로드 크기 상한 | 지금 `/api/media/bgm` 확인값 10MB(`src/app/api/media/bgm/route.ts`). **버킷 `shorts-onestop-studio` 자체 상한은 30MB·`audio/mpeg` 허용(마이그레이션 `0027`) — DB 변경 불필요.** MP3 320k는 5분 약 12MB | 확인값을 AI 음악 스튜디오 곡과 같은 **15MB**로 올리고, `uploadBgm` 오류 문구의 「10MB」도 함께 고침(코드만) |
| 서버 보관 | 무료음악 자체는 음원을 서버에 안 올리지만, 쇼츠는 이미 회원이 직접 올린 배경음악을 회원 폴더에 보관함(30일 정리) | 회원이 「쇼츠 배경음악으로」를 눌러 직접 고른 것이므로 기존 수동 올리기와 같은 취급으로 봄 — 30일 정리·관리자/시험 계정 예외 규칙 그대로 |
| 곡 여러 개 | 쇼츠는 배경음악 1곡 | 1곡만(`TARGETS`에서 1곡으로 제한) |

## 5. 나눠 맡기

- **영상 담당(쇼츠 원스톱)**: 3절 2·4·5·6·7번 받는 쪽 구현, 렌더 화면에 「🎵 무료음악에서 받는 중…」 표시, 시험·tsc·버전 v1.46·배포·운영 확인. (주인님 2026-11-09 「이것도 영상담당에게 맡길께」 — 음악 담당이 받는 쪽을 시작하려다 멈춤, 코드 수정 없음)
- **음악 담당(무료음악)**: 보내는 쪽 — `videoHandoff.ts` `TARGETS`에 `shorts: { origin: "https://shorts-onestop-studio.buylife.xyz", path: "/render", readyType: "sos-ready" }` 추가(1곡, MP3로 받기), 「모든 음악」 곡 메뉴에 「쇼츠 배경음악으로」. **영상 담당이 받는 쪽 주소·신호 이름을 확정해 알려 주면** 음악 담당이 바로 붙인다(같은 폴더 동시 작업 금지 — 각자 자기 폴더만. 음악 담당은 같은 시기에 무료음악 프리셋 작업(D-8)으로 이 폴더를 고치므로 무료음악 쪽은 음악 담당이 붙인다). 받는 쪽 배포가 먼저 나가야 메뉴가 의미 있다.
- 신호 이름·경로를 바꾸고 싶으면 바꿔도 된다 — 바꾼 값을 이 문서 3절에 고치고 음악 담당에게 알린다.

## 6. 검수 방법

1. 쇼츠 받는 쪽 배포 → 무료음악 보내는 쪽 배포(각각 빌드 1회, 순서대로).
2. ego 창(Claude Code 메인 브라우저), 시험 계정: 무료음악 「모든 음악」에서 곡 하나 → 「쇼츠 배경음악으로」 → 쇼츠 `/render`에 그 곡이 배경음악으로 선택됨 → 짧은 MP4 렌더 → 소리 들어감 확인.
3. 다른 출처에서 보낸 `fms-audio`는 무시되는지(출처 확인) 코드 리뷰로 확인.
4. 엔진이 꺼져 있을 때 안내 문구가 나오는지.

## 7. 비용

- 개발 비용 없음(AI 호출 없음). Vercel 빌드 2회(쇼츠 1, 무료음악 1) — 배포 전에 주인님 승인.
- 회원 비용 없음(무료음악 곡은 회원 PC가 만든 것).

## 8. 참고 문서

- 무료음악 백로그 D-4: `free-music-studio/docs/IMPROVEMENT_BACKLOG.md`
- 무료음악 다른 연계 후보(2~6순위: LP 턴테이블·이미지 스토리 쇼츠·썸네일 SEO·프리셋·참고곡 분석): 같은 백로그 D 항목
- 공용 규칙: 최상위 규칙(회원 본인 계정·키), 데이터 30일 보관, `docs/ERROR_LESSONS.md` 2026-11-09(효과 조건 배열 무한 반복 주의)

## 9. 받는 쪽 완료 — 음악 담당은 보내는 쪽을 시작해도 됩니다 (2026-11-09 [역할: video])

- **쇼츠 원스톱 v1.46 운영 배포 끝**(`shorts-onestop-studio-jukcy51cw`, DB 버전 v1.46). 커밋: `feat(shorts-onestop-studio): receive free-music-studio track as BGM …`
- **3절 계약 그대로 확정, 바꾼 것 없음**: 주소 `https://shorts-onestop-studio.buylife.xyz/render#fms=<trackId>`(UUID) · 준비 신호 `{ type: "sos-ready", ids: [trackId] }`(두 출처로 보냄) · 음원 `{ type: "fms-audio", id, name, blob }`.
- 받는 쪽 확인 조건: `e.origin`이 `free-music-studio.buylife.xyz`·`free-music-studio.vercel.app` 중 하나, `e.source === window.opener`, `id === trackId`, `blob instanceof Blob`. `name`은 `.mp3`가 없으면 붙임.
- **4절 결정**: 크기 상한 `/api/media/bgm` 10MB → **15MB**(버킷은 이미 30MB라 DB·버킷 변경 없음, AI 음악 스튜디오와 같은 값). 15MB 넘는 blob은 받지 않고 안내. 보관은 수동 올리기와 같음(30일·관리자/시험 계정 예외). 1곡.
- **6절 「제목 서버 조회」는 만들지 않음** — 보내 주는 `name`(곡 제목.mp3)을 배경음악 이름으로 씀. 그러니 `name`에 곡 제목을 꼭 넣어 주세요.
- 대본이 여러 개면 회원이 「이 대본에 넣기」로 고른 뒤 올림(AI 음악 링크와 같은 방식). 대본이 없으면 「먼저 대본을 만든 뒤 다시 보내 주세요」.
- 실물 시험(보내는 쪽 배포 뒤): **맥미니에 요청함** — `shorts-onestop-studio/docs/MAC_MINI_TEST_REQUEST_20261109_FMS_BGM.md`(주인님 지시 「테스트해볼 건 맥미니에게 전달」).

## 10. 보내는 쪽 완료 — 미배포 대기 (2026-11-09 [역할: music])

- `src/lib/videoHandoff.ts`: `TARGETS.shorts = { origin: SHORTS_URL, path: "/render", readyType: "sos-ready", hash: true, mp3: true }` — 받는 쪽이 해시(`#fms=`)로 읽으므로 받는 곳마다 주소 형식을 고르게 함(다른 세 곳은 그대로 `?fms=`), 음원은 MP3 320k(`fetchLibraryFile(id, "mp3")`), `name`은 `<곡 제목>.mp3`.
- 「모든 음악」 곡 메뉴에 「쇼츠 배경음악으로」(뮤직비디오 아래).
- tsc·시험 통과. **무료음악 다음 배포(v1.60)에 함께 나간다** — 맥미니 실물 시험(`shorts-onestop-studio/docs/MAC_MINI_TEST_REQUEST_20261109_FMS_BGM.md`)은 그 배포 뒤.

## 11. ⚠ 실물 실패 — 쇼츠 창이 무료음악 창과의 연결(opener)을 잃음 (2026-11-09 [역할: music] 마스터PC 주인님 확인)

- **증상**: 무료음악 v1.60 「쇼츠 배경음악으로」 → 쇼츠 `/render`가 열리지만 「이 창이 AI 무료음악 자동화에서 열리지 않아 음악 파일을 받을 수 없습니다」. 음원이 안 들어감.
- **원인**: 쇼츠 원스톱 `next.config.ts` 11~12줄이 모든 화면에 `Cross-Origin-Opener-Policy: same-origin`·`Cross-Origin-Embedder-Policy: credentialless`를 보낸다(v1.42 무료 음성 여러 줄 계산 — 교차 출처 격리). COOP same-origin 문서는 다른 출처(무료음악)가 연 창이어도 `window.opener`가 null이 되어 postMessage 건네기가 원천적으로 불가능하다. 가사영상·플레이리스트·뮤직비디오·LP·썸네일·shots는 이 헤더가 없어 같은 방식이 된다.
- **고치는 방법(추천, 영상 담당)**: 받기 전용 화면 `/fms-bgm`을 새로 두고 **그 경로만 COOP/COEP 헤더에서 뺀다**(예: `next.config.ts` headers `source: "/:path((?!fms-bgm).*)"` 처럼 제외, 또는 `/fms-bgm`에 `Cross-Origin-Opener-Policy: unsafe-none`). `/fms-bgm`이 지금 `RenderView`의 받기 코드(준비 신호 `sos-ready`, 출처·opener 확인, 15MB)를 그대로 하고, 받은 파일을 기존 `/api/media/bgm`으로 올린 뒤 `{ path, name }`을 sessionStorage에 두고 `/render`로 이동 → `/render`가 그 값을 꺼내 지금처럼 대본에 넣는다(여러 대본이면 「이 대본에 넣기」). 렌더 화면의 무료 음성 빠른 계산(교차 출처 격리)은 그대로.
- **다른 방법**: 렌더 화면에서 두 헤더를 빼기(무료 음성이 한 줄 계산으로 느려짐 — 주석상 동작은 함) → 추천하지 않음.
- **무료음악 쪽(음악 담당)**: 받는 쪽 주소가 확정되면 `videoHandoff.ts` `TARGETS.shorts.path`를 `/fms-bgm`으로 바꾼다(한 줄). 그때까지 「쇼츠 배경음악으로」는 실패 안내가 뜬다.

## 12. 받는 쪽 수정 끝 — 주소를 `/fms-bgm`으로 바꿔 주세요 (2026-11-09 [역할: video], 미배포)

- **확정 주소**: `https://shorts-onestop-studio.buylife.xyz/fms-bgm#fms=<trackId>` — `TARGETS.shorts.path`를 `/render` → **`/fms-bgm`** 로(해시 `#fms=` 그대로, 준비 신호 `sos-ready`·음원 `fms-audio` 그대로). 쇼츠 커밋 `989c7bc1c`.
- 쇼츠 쪽: `next.config.ts`가 `/fms-bgm`만 COOP/COEP를 뺌(로컬 개발 서버 응답 헤더로 확인 — `/fms-bgm` 없음, `/render`·`/login` 있음). `/fms-bgm`이 출처·opener·15MB 확인 → `/api/media/bgm`으로 올림 → `{ path, name }` sessionStorage → `/render`로 **새로 불러오기 이동**(렌더 화면 무료 음성 빠른 계산 유지) → 대본 하나면 바로, 여러 개면 「이 대본에 넣기」.
- 예전 주소(`/render#fms=`)로 열리면 「무료음악을 새로 고친 뒤 다시 눌러 주세요」 안내.
- 알려진 한계: 쇼츠에 로그인돼 있지 않으면 로그인 화면을 거치며 opener·해시가 사라져 받기 실패 안내가 뜸(보통은 .buylife.xyz 로그인 공유로 이미 로그인 상태).
- 배포 순서: 쇼츠 v1.47(이 수정 + V7 미배포 묶음) → 무료음악 경로 한 줄 → 맥미니 실물 시험. 쇼츠 배포는 주인님 승인 뒤.

## 13. 무료음악 쪽 경로 변경 끝 (2026-11-09 [역할: music], 미배포 — v1.61 묶음)

- `src/lib/videoHandoff.ts` `TARGETS.shorts.path` `/render` → `/fms-bgm`(해시·준비 신호·음원 형식 그대로). tsc·시험 129개 통과.
- 쇼츠 v1.47은 배포됨, 운영 `/fms-bgm` 응답에 COOP 헤더 없음 확인(`curl -sI`).
- 남은 일: 무료음악 v1.61 배포(주인님 「배포해」) → 마스터PC에서 「쇼츠 배경음악으로」 실물 1회.
