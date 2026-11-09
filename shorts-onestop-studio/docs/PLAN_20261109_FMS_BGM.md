# 개발 플랜 — 무료음악 곡을 쇼츠 배경음악으로 받기 (v1.46, 무료음악 백로그 D-4)

- 작성: 2026-11-09 [역할: video] Claude Code(윈도우)
- 근거: `free-music-studio/docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md`(음악 담당 인수인계)
- 범위: 쇼츠 원스톱 **받는 쪽**만. 보내는 쪽(무료음악 메뉴)은 음악 담당 몫.

## 1. 확인한 사실

| 항목 | 현재 |
|---|---|
| 배경음악 올리기 | `/api/media/bgm` → 일회용 주소 → 회원 폴더 `<user_id>/bgm/`, API 상한 **10MB** |
| 버킷 상한 | `shorts-onestop-studio` 버킷 **30MB**(마이그레이션 0027), 오디오 형식 허용 |
| AI 음악 스튜디오 곡 | 이미 **15MB**까지 받음(`lib/amsSongs.ts` `MAX_BYTES`) |
| 링크로 곡 받기 | `?ams=` → 대본이 하나면 바로, 여러 개면 「이 대본에 넣기」를 고른 뒤 넣음(v1.40) |

## 2. 결정 (인수인계서 4절)

| 항목 | 결정 | 이유 |
|---|---|---|
| 크기 상한 | `/api/media/bgm` 상한 10MB → **15MB** | 무료음악 5분 MP3 320k ≈ 12MB. AI 음악 스튜디오와 같은 15MB로 맞춤. 버킷은 30MB라 **DB·버킷 변경 없음** |
| 서버 보관 | 기존 수동 올리기와 같음(30일 정리, 관리자·시험 계정 예외) | 회원이 직접 고른 곡 |
| 곡 수 | 1곡 | 쇼츠 배경음악은 1곡 |
| 제목 조회 API | **만들지 않음** | 무료음악 창이 보내는 `name`(곡 제목.mp3)으로 충분. 서버 DB 읽기·새 API가 필요 없어 범위가 줄어듦 |

## 3. 구현 (파일 1~2개)

1. `src/app/api/media/bgm/route.ts`: 상한 15MB, 안내 문구 「15MB 이하」.
2. `src/components/views/RenderView.tsx`
   - 주소의 `#fms=<trackId>`(UUID)를 읽음 → 대본 목록이 열리면 `window.opener`에 `{ type: "sos-ready", ids: [trackId] }`를 두 출처(`free-music-studio.buylife.xyz`·`.vercel.app`)로 보냄.
   - `message`는 `e.origin`이 두 출처 중 하나이고 `e.source === window.opener`이며 `type === "fms-audio"`, `id === trackId`, `blob instanceof Blob`일 때만 받음. 나머지는 버림.
   - 받은 음원은 메모리에 들고 있다가, 대본이 하나면 바로, 여러 개면 기존 「이 대본에 넣기」 줄(AI 음악과 같은 줄)에서 고른 대본에 기존 `uploadBgm`으로 올림 → 배경음악으로 선택됨 → 「[저장]을 눌러 주세요」.
   - 기다리는 동안 「🎵 무료음악에서 음악 파일을 받는 중…」. 180초 안에 안 오면 「무료음악 창에서 PC 엔진이 켜져 있는지 확인하거나, 파일을 직접 넣어 주세요」.
   - 무료음악 창에서 열리지 않았으면(`window.opener` 없음) 바로 직접 넣기 안내.
   - 대본이 없으면 「먼저 대본을 만든 뒤 다시 보내 주세요」(AI 음악과 같은 문구 방식).
3. 버전 v1.45 → **v1.46**(`lib/version.ts` + DB `programs.version`).

## 4. 받는 쪽 계약 확정값 (음악 담당에게 전달)

- 주소: `https://shorts-onestop-studio.buylife.xyz/render#fms=<trackId>`
- 준비 신호: `{ type: "sos-ready", ids: [trackId] }`
- 음원: `{ type: "fms-audio", id, name, blob }`(MP3, 15MB 이하)

## 5. 검수

1. `npx tsc --noEmit`, 기존 테스트.
2. 배포 뒤 ego 창, 시험 계정: 콘솔에서 가짜 출처로 보낸 `fms-audio`가 무시되는지 + 보내는 쪽 배포 뒤 실제 곡 → 배경음악 선택 → 짧은 MP4 렌더 소리 확인.
3. 엔진 꺼짐(음원 안 옴) 안내 문구.

## 6. 비용

- Vercel 빌드 **1회**(쇼츠). 무료음악 쪽 1회는 음악 담당. AI 호출 없음, 회원 비용 없음.
- 배포는 주인님 승인 뒤.
