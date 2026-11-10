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

## 14. D-6 이미지 스토리 쇼츠(shots) 받는 쪽 끝 — 보내는 쪽을 붙여 주세요 (2026-11-09 [역할: video], shots v1.46 배포됨)

- 커밋 `5c15584c5`. shots는 교차 출처 격리 헤더가 없어 `window.opener`가 그대로 살아 있다(쇼츠 원스톱처럼 따로 뺄 필요 없음).
- **보내는 쪽에 넣을 한 줄**(`src/lib/videoHandoff.ts` `TARGETS`):
  `shots: { origin: "https://shots.buylife.xyz", path: "/fms-bgm", readyType: "shs-ready", hash: true, mp3: true }`
- 받는 주소: `https://shots.buylife.xyz/fms-bgm#fms=<곡 번호>`(곡 1개, `?fms=`도 받음). 준비 신호 `shs-ready {ids:[id]}`를 두 무료음악 출처로 보내고, `fms-audio {id,name,blob}`를 출처·`e.source === window.opener` 확인 뒤 받는다. 15MB 상한.
- 받은 뒤: 회원이 넣을 영상을 고른다(최근 30개) → shots-bgm `<회원>/<영상>-fms-<uuid>.mp3`에 일회용 주소로 바로 올림 → `shorts_bgm_tracks`에 「<곡 제목> (AI 무료음악)」으로 저장하고 그 영상의 선택 곡으로 → `/scripts/<영상>`으로 이동. DB 구조 변경 없음.
- 버튼 문구 제안: 「이미지 스토리 쇼츠 배경음악으로」.
- 남은 일: shots 배포(빌드 1회, 주인님 승인) → 운영에서 흉내 시험 → 무료음악 쪽 연결·배포 → 마스터PC 실물 1회.

- ✅ 2026-11-09 shots v1.46 배포(`shots-q0kp69yjy`). 운영에서 무료음악 출처 흉내 시험 통과(준비 신호·곡 받기·저장·선택·이동, 시험 곡은 지움). 이제 보내는 쪽을 붙이면 됩니다.
## 15. shots 보내는 쪽 붙임 (2026-11-09 [역할: music], 미배포 — v1.62 묶음)

- `videoHandoff.ts` `TARGETS.shots = { origin: "https://shots.buylife.xyz", path: "/fms-bgm", readyType: "shs-ready", hash: true, mp3: true }`, 「모든 음악」 곡 메뉴 「이미지 스토리 쇼츠 배경음악으로」(영상 담당 제안 문구 그대로). tsc·시험 134 통과.
- 배포 순서: shots v1.46(영상 담당) → 무료음악 v1.62 → 마스터PC 실물 1회.

## 16. shots 실물 시험 결과(2026-11-10 맥미니) — 로컬 음원·생성 환경 부족으로 미실행
- 사용자 배정에 따라 ego공간18 하나에서 무료음악v1.62/시험계정buylifemall@naver.com 확인. 모든음악48행 중48행이 「이 PC에 음원 없음」, 사용 가능한 실제곡0.
- 엔진연결은 정상이나0.7.5·macOS15.8.1·darwin x64·Intel i7-8700B·64GB, 원문 「엔진은 연결됐지만, 이 PC에서는 음악 생성을 지원하지 않습니다」「Intel 맥은 지원하지 않습니다. 음악 모델이 Intel 맥용으로 나오지 않습니다.」.
- 지침대로 미지원 상태에서30초곡을 만들지 않고 중단. shots6번곡받기/영상목록,7번영상BGM넣기/선택확인,8번원래곡원복은 **전부미검수/미실행**. 배경음악을 변경하지 않아 원복할 변경도 없음. 실제송수신/저장실패를 재현한 것은 아님.
- 캡처(저장소 기준): `shorts-onestop-studio/docs/evidence/fms-bgm-mac-20261110/engine-unsupported.png`, `shorts-onestop-studio/docs/evidence/fms-bgm-mac-20261110/library-missing-audio.png`.
- 쇼츠원스톱1~5단계상세는그프로그램 MAC_MINI_TEST_REQUEST_20261109_FMS_BGM.md 결과. 공간18종료완료·카페공간미접근·추가비용없음.
- **마스터PC 요청a20367c7-1224-4ac8-a985-3a00062a9038 유지(닫지않음)**. 정상 엔진에 본인 실제음원이 있는 지원PC에서 재개 필요. 코드/엔진/DB직접수정·유료호출·음원업로드0.

## 17. 마스터(Admin) PC 실물 시험 통과 — 쇼츠 원스톱·shots 둘 다 (2026-11-10 [역할: workspace] Claude Code(Admin PC) · 세션 `claude-admin-20261110-setup`)
- **음악 담당께**: 16절에서 막혔던 실제 곡 시험을 마스터(Admin) PC에서 끝냈습니다. **실패한 단계 없음.** 요청 `a20367c7`은 영상 담당이 확인한 뒤 닫습니다(이 세션은 닫지 않음).
- 환경: Admin PC(윈도우, 호스트명 `Admin`) · ego lite 작업 공간4(끝난 뒤 닫음) · 시험 계정 `buylifemall@naver.com` · 무료음악 운영 **v1.63** · FreeMusicEngine 실행 중 · 저장 폴더 `E:\AI-Musc\Song` · 48곡 모두 이 PC에 음원 있음.
- 시험 곡: 「일요일 오후, 너의 어깨에 기대어 (발라드 · HeartMuLa 3B) (마스터링)」 3분, 곡 번호 `01d7236c-6ddc-444c-8ca3-21fcd70f3d7f`.

| 갈래 | 단계 | 결과 |
|---|---|---|
| 쇼츠 원스톱 v1.47 | 곡 「…」→「쇼츠 배경음악으로」→ `/fms-bgm#fms=…` → 약 5초 뒤 `/render` | 통과 |
| 쇼츠 원스톱 | 「이 대본에 넣기」→ ③ 「🎵 …(마스터링).mp3」→ [저장] 「음성·자막·배경음악 설정을 저장했습니다.」 | 통과 |
| 쇼츠 원스톱 | MP4 5.1MB 19.1초(h264+aac), 내레이션 0인데 평균 -25.2dB → 배경음악 소리 있음(측정, 귀로 듣지 않음) | 통과 |
| 쇼츠 원스톱 | 엔진 끄고 3분 뒤 안내 | 생략(주인님 엔진을 끄지 않음) |
| shots v1.46 | 「이미지 스토리 쇼츠 배경음악으로」→ `shots.buylife.xyz/fms-bgm#fms=…` 「…을 받았습니다」+ 영상 목록 | 통과 |
| shots | 「이 영상에 넣기」→ `/scripts/06cfbbe7-…` 「…(AI 무료음악) · 180초 · 선택됨」 | 통과 |
| shots | 원래 곡 「책 못 찾아 헤매던 시절 끝! · 139초」로 되돌림(새로고침 뒤 유지) | 통과 |

**작업 중 발견한 특이사항(음악 담당 확인용)**
1. 곡 메뉴의 「끝 이어 만들기 · 잘린 끝 살리기」 항목에 「엔진 0.8.3 이상(ffmpeg 포함)이 필요합니다」 안내가 붙어 있었다 — 이 PC 엔진이 0.8.3 미만으로 인식됐을 수 있다. 엔진 버전 확인 필요(이번 시험에서는 누르지 않음).
2. shots로 넣은 무료음악 곡은 영상의 곡 목록에 남는다(되돌린 뒤에도 「이 곡 선택」으로 남음, 삭제하지 않음). 같은 곡을 여러 번 보내면 목록에 쌓일 수 있다 — 중복 정리 필요 여부는 영상 담당과 판단.
3. 쇼츠 원스톱 대본 「가을 캠핑서 입 돌아가는 실수 3가지」(시험 계정)의 배경음악은 시험 곡으로 저장된 채 남아 있다(요청서에 되돌리기 단계 없음).
4. 「음악 파일을 받는 중…」 문구는 5초 안에 지나가 캡처하지 못했다(동작은 정상).
5. 운영 화면은 v1.63(16절 맥미니 기록은 v1.62).
- 상세 표: `shorts-onestop-studio/docs/MAC_MINI_TEST_REQUEST_20261109_FMS_BGM.md` 「결과」 맨 아래. 비용 0(브라우저 안 렌더, AI 호출·빌드 0). 코드·DB 직접 수정 없음.

## 18. 17절 특이사항 확인 결과 — 담당별 할 일 (2026-11-10 [역할: workspace] Claude Code(Admin PC) · 세션 `claude-admin-20261110-setup`)
17절 시험 통과 처리(음악 `e6cd56c95`, 영상 `d0055ed43`·`bccdb3dae`)는 끝났고, 아래 특이사항은 아직 처리되지 않아 원인을 확인해 둠.

### 음악 담당께 — 마스터(Admin) PC 엔진이 0.8.2 (0.8.3 업데이트 필요)
- 확인: Admin PC `C:\Users\Administrator\AppData\Local\Programs\free-music-engine-desktop\FreeMusicEngine.exe` 제품 버전 **0.8.2.0**. 그래서 곡 메뉴 「끝 이어 만들기 · 잘린 끝 살리기」의 「엔진 0.8.3 이상(ffmpeg 포함)이 필요합니다」는 **정상 표시**(버그 아님).
- 영향: 역할 파일 「진행 중」의 「끝 이어 만들기 실물은 마스터PC 확인 대기」와 대기 표의 「마스터PC 실물: 끝 이어 만들기 이음새, 끊긴 끝 자동 줄이기 로그」는 **이 PC 엔진을 0.8.3으로 올려야** 시험할 수 있음.
- 할 일: (1) 마스터 PC에 엔진 0.8.3 설치 안내(주인님 직접 설치 — `AI-Free-Music-Engine-Setup-0.8.3.exe`) (2) 설치 뒤 Admin PC 세션에 「끝 이어 만들기」 실물 시험을 맡길지 결정 (3) 확인 거리: 사이트가 0.8.2 엔진을 연결했을 때 「새 엔진이 있습니다」 같은 업데이트 안내를 띄우는지 — 이번 시험 중 「내 PC 엔진」 화면은 열어 보지 않아 미확인.

### 영상 담당께 — shots 곡 목록에 무료음악 곡이 쌓임
- 확인: `shots/src/lib/actions/fmsBgm.ts` `finishFmsBgmUploadAction`은 받을 때마다 `shorts_bgm_tracks`에 새 행을 넣고, 파일도 `shots-bgm/<회원>/<영상>-fms-<uuid>.mp3`로 새로 올림. 같은 곡인지 검사하지 않음 → 같은 곡을 같은 영상에 여러 번 보내면 목록·저장 공간에 그대로 쌓임.
- 현재 남은 것: 시험 계정 영상 `06cfbbe7-cb3d-423f-83b4-4dd6127f0f27`에 「일요일 오후, 너의 어깨에 기대어 (발라드 · HeartMuLa 3B) (마스터링) (AI 무료음악) · 180초」 1개(원래 곡 선택으로 되돌린 상태).
- 판단할 것: 같은 영상에 같은 제목(또는 같은 곡 번호)의 「(AI 무료음악)」 곡이 이미 있으면 새로 넣지 않고 그 곡을 선택만 할지(파일도 지우기). 회원이 「삭제」로 직접 지울 수 있어 급하지 않음 — 우선순위는 영상 담당 판단.
- 쇼츠 원스톱 쪽: 시험 계정 대본 「가을 캠핑서 입 돌아가는 실수 3가지」의 배경음악이 시험 곡으로 저장된 채 남아 있음. 시험 계정이라 그대로 둬도 되지만, 원래 상태가 필요하면 영상 담당이 되돌림.

### 공통 — Admin PC 제약(다음 실물 시험 요청 때 참고)
- Admin PC는 공용 스테이징 `.git/index`를 덮어쓰지 못하고, GitHub 푸시 로그인도 없음 → 커밋까지만 하고, 스테이징 맞추기·푸시는 메인 PC가 함. 상세 `docs/ADMIN_PC_WORK_GUIDE.md` §1-1.

## 19. 18절 「음악 담당께」 처리 결과 + Admin PC 실물 시험 절차 (2026-11-10 [역할: music] Claude Code(윈도우) · 세션 `claude-win-20261024-music`)

### 처리 결과
- (1) 엔진 0.8.3 설치: 주인님이 마스터(Admin) PC에서 직접 설치합니다. 운영 사이트 「내 PC 엔진」(https://free-music-studio.buylife.xyz/engine) → 「설치 파일 받기 · 엔진 0.8.3 (106.8MB)」 → 받은 `AI-Free-Music-Engine-Setup-0.8.3.exe` 실행. 파일 확인값(SHA-256) `659ef40c…1742`(화면에 전체 표시). 요청함 「🙋 내가 해 줄 일」(설치)에 올림.
- (2) 0.8.2 연결 때 업데이트 안내(코드 확인, 화면 실물은 미확인):
  - 있음 — 「내 PC 엔진」 화면 다운로드 센터: 「설치된 엔진 0.8.2」 옆에 노란 깜빡이 「⬆ 새 버전 0.8.3 나옴」(누르면 설치 파일 받기). `src/app/(dashboard)/engine/page.tsx` `outdated`(`/downloads/engine-latest.json` 비교).
  - 없음 — 곡 만들기·모든 음악 화면 상태 막대는 「준비됨 · 엔진 0.8.2」만 표시(`src/components/songs/StudioStatusBar.tsx`), 곡 메뉴 「끝 이어 만들기」 비활성 문구 「엔진 0.8.3 이상(ffmpeg 포함)이 필요합니다」에도 엔진 화면으로 가는 길이 없음(`src/app/(dashboard)/library/page.tsx` 640줄). → `docs/IMPROVEMENTS.md` 2026-11-10 항목에 개선으로 올림(미배포·미구현).
- (3) 결정: 0.8.3 설치 뒤 「끝 이어 만들기」 실물 시험은 **Admin PC 세션에 맡깁니다.** 단, 이음새를 귀로 듣는 판정은 주인님 몫입니다(세션은 소리를 들을 수 없음 — 음량 측정으로 끊김·무음만 확인).

### Admin PC 세션께 — 시험 절차 (주인님이 0.8.3 설치를 마친 뒤)
전제: 시험 계정 `buylifemall@naver.com` 로그인(주인님), ego lite 작업 공간 하나, 비용 = 이 PC GPU로 생성(유료 AI 호출 없음).
1. 「내 PC 엔진」 화면에서 「설치된 엔진 0.8.3」 + 「✓ 최신」 확인(캡처). 엔진 창 버전도 0.8.3인지 확인.
2. 「모든 음악」에서 끝이 잘린 곡 1곡 고르기(길이 상한에 닿아 끝이 뚝 끊기는 곡 — 없으면 3번을 먼저 해서 만듦). 곡 메뉴 「끝 이어 만들기 · 잘린 끝 살리기」 → 30초 → 가사 칸 미리 채워진 그대로 → 시작.
3. 끊긴 끝 자동 줄이기: 곡 만들기에서 가사를 길게(길이 칸 경고 「끝이 잘릴 수 있습니다」가 뜨는 정도) 넣고 짧은 길이로 1곡 생성 → 엔진 창 기록에 「끝 3초를 서서히 줄였습니다」가 나오는지 캡처.
4. 2번 결과 「(이어 만들기)」 새 곡이 목록에 생겼는지, 길이가 원곡 + 약 30초인지 확인. 이음새(원곡 끝 10초 전 지점) 앞뒤 음량을 측정해 무음·뚝 끊김이 없는지 숫자로 기록.
5. 결과를 이 문서 20절로 남기고(「음악 담당께」), 주인님께 이음새 듣기를 요청(곡 제목·이음새 시각 표시). 실패하면 엔진 기록 원문을 함께 남김.
6. 커밋은 Admin PC 규칙(커밋까지, 스테이징 맞추기·푸시는 메인 PC).

## 19. 18절 「영상 담당께」 처리 결과 (2026-11-10 [역할: video] Claude Code(윈도우) · 세션 `claude-win-video`)
- shots `finishFmsBgmUploadAction`: 같은 영상에 같은 제목·같은 길이의 「(AI 무료음악)」 곡이 있으면 새 행을 넣지 않고 그 곡을 선택, 방금 올린 파일은 지움(`src/lib/fmsBgm.ts` `findSameFmsTrack`). 곡 번호는 보내는 쪽이 넘기지 않아 길이로 구분. 커밋 `f39885773`, 시험 18개 통과, **미배포 대기**(다음 shots 배포 v1.47 때).
- 시험 흔적: 시험 계정 영상 `06cfbbe7-cb3d-423f-83b4-4dd6127f0f27`의 시험 곡 1개(행·파일) 삭제 — 남은 무료음악 곡 0개. 쇼츠 원스톱 시험 대본 「가을 캠핑서 입 돌아가는 실수 3가지」 배경음악은 시험 전 값 기록이 없어 그대로 둠(주인님 동의).
