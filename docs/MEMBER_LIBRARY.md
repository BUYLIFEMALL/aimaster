# 「내 자료함」 사용 안내 — 다른 프로그램에서 만든 자료 가져다 쓰기 (공용 컴포넌트 `member-assets-client`)

> 2026-11-11 등록 · 주인님 요청 「같은 계정이라면 다른 프로그램에서 만든 데이터, 콘텐츠, 이미지, 음악, 영상, 파일 등을 조회하거나 가져와서 재사용」
> 플랜·단계별 결과: [`PLAN_20261111_MEMBER_LIBRARY.md`](PLAN_20261111_MEMBER_LIBRARY.md) · 분석: [`analysis-member-library-20261111/REPORT.md`](analysis-member-library-20261111/REPORT.md)
> 회원 화면: https://www.buylife.xyz/library

## 1. 구조 한눈에
- 공용 표 **`public.member_assets`** = 회원 본인 생성물 목록(색인). **파일은 각 프로그램 버킷에 그대로** 있고, 열 때 서버가 1시간 서명 주소를 만든다.
- **등록은 DB 트리거가 한다** — 프로그램 코드가 직접 넣지 않는다(0059 음악 · 0060 이미지 · 0061 영상·블로그 원고). 원본 줄이 지워지면 자료함 줄도 함께 지워져 **보관 기간이 원본 규칙을 그대로 따른다**(생성만 30일 · 발행 1년 · 지정 프로그램 1년 · 관리자·시험 계정 무기한).
- 읽기 권한: 회원 본인 줄만(RLS). 쓰기: 트리거·서버 키만. 다른 회원과 공유 없음.

| 종류 | 연결된 프로그램(2026-11-11) |
|---|---|
| 음악 `audio` | `ai-music-studio`, `music-automation`(Suno), `free-music-studio`(음원은 회원 PC — `localOnly`) |
| 이미지 `image` | `ai-image-studio`, `banana-canvas`, `portrait-photo`, `thumbnail-master` |
| 영상 `video` | `ai-video-studio`(생성·편집), `music-video-studio` |
| 글 `text` | `naver-blog-agent`, `naver-blog-seo-studio`, `tistory-auto-blog`, `ai-auto-blog`, `naver-blog-allinone`, `wp-blogger-auto` |

## 2. 내 프로그램에서 가져다 쓰기 (4단계)
1. **사본 붙이기**: 기준 `lib/library/memberAssets.ts`(메인 사이트)를 내 프로그램의 `src/lib/memberAssets.ts`(또는 `lib/`)로 복사하고, `scripts/check-shared-modules.mjs`의 `member-assets-client` `copies`와 [`SHARED_MODULES.md`](SHARED_MODULES.md) 표에 경로를 추가한다. 사본은 직접 고치지 않는다(기준만 고치고 `--sync`).
2. **서버 API 하나**: 로그인·권한 확인(`checkProgramAccessApi`) 뒤 서버 키 클라이언트로 목록을 돌려준다.
   ```ts
   import { listMemberAssets } from "@/lib/memberAssets";
   const items = await listMemberAssets(createAdminClient(), user.id, { kind: "audio", limit: 60 });
   // 특정 프로그램만: { kind: "image", sourceSlugs: ["ai-image-studio", "banana-canvas"] }
   return NextResponse.json({ items }); // playUrl은 1시간 서명 주소
   ```
3. **화면 「내 자료함에서 가져오기」**: 목록을 보여 주고, 고른 자료의 **`sourceRef`**를 내 프로젝트에 저장한다(`id`가 아니라 `sourceRef` — 미디어 줄은 원본이 고쳐지면 다시 만들어져 `id`가 바뀔 수 있다).
4. **다시 열 때**: `signMemberAssetByRef(admin, user.id, sourceRef)`로 새 서명 주소를 받는다. `null`이면 원본이 지워졌거나 내 자료가 아니다 → 「원본이 지워졌습니다(보관 기간 만료)」 안내.

## 3. 지킬 것
- 서버에서만 부르고(서버 키 클라이언트), 항상 **로그인 회원 id**로 거른다. 브라우저가 보낸 회원 id·경로를 믿지 않는다.
- 파일이 필요하면(예: 인스타 게시용 공개 주소) 서명 주소로 받아 **내 버킷의 회원 폴더(`{user_id}/…`)로 복사**해 쓴다 — 원본 버킷에 쓰거나 원본을 지우지 않는다.
- `localOnly`(무료음악 음원)는 서버에 파일이 없다 → 「무료음악 프로그램에서 보내 주세요」 안내.
- `external`(Suno 임시 주소)은 약 14일 뒤 재생이 안 될 수 있다.
- 글(`text`)은 파일이 없고 `title`·`excerpt`·`status`·`published`·`playUrl`(발행 주소)만 있다 — 본문 전체가 필요하면 원본 프로그램 표를 회원 id로 직접 읽는다(`sourceRef`의 표·번호 사용, 숫자 id 표는 `md5('표:'||id)::uuid`라 원본 번호로 되돌릴 수 없으니 원본 표에서 같은 회원의 줄을 찾을 것).

## 4. 새 프로그램을 자료함에 연결하려면(등록 쪽)
- 원본 표에 트리거를 단다(0059~0061의 `member_assets_sync_*` 패턴 복사). **트리거 안에는 실패할 수 있는 형 변환·날짜 변환을 넣지 않는다**(트리거 오류 = 원본 저장 실패). 경로가 `{user_id}/`로 시작하는 파일만 넣는다. 기존 자료는 원본을 건드리지 않는 `insert … select`로 채운다.
- 연결 뒤 [`PLAN_20261111_MEMBER_LIBRARY.md`](PLAN_20261111_MEMBER_LIBRARY.md)와 위 1번 표, 그 프로그램 `docs/IMPROVEMENTS.md`(담당 안내)를 갱신한다.

## 5. 지금 가져다 쓰기 후보 (담당께 요청 — 2026-11-11)
| 받는 프로그램 | 가져올 자료 | 지금 방식 → 바꿀 점 | 담당 |
|---|---|---|---|
| `lyric-video-studio` · `playlist-channel-studio` · `music-video-studio` · `shorts-onestop-studio` · `ai-video-studio`(편집 — **✅ v1.35 적용 2026-11-11**, 참고 구현 `ai-video-studio/lib/edit/librarySongs.ts`·`app/api/edit/songs`) | 음악 3종 | 프로그램마다 `amsSongs.ts`·`sunoTracks.ts`·`fmsTracks.ts` 등 3종 읽기 코드 → `listMemberAssets({ kind: "audio" })` 하나로(곡 가사 시간 등 원본 고유 정보가 필요한 곳은 기존 코드 유지) | 영상·음악 |
| 영상 프로그램(썸네일·배경) | 이미지 4종 | `thumbnailPicks.ts`(썸네일만) → 이미지 전체 | 영상 |
| `insta_auto_poster` 등 SNS 게시 | 이미지·영상 | 각 스튜디오별 보내기 → 「내 자료함에서 가져오기」 + 공개 버킷 복사 | 인스타·디자인 |
| 블로그 프로그램 | 이미지 | 본문 이미지 새로 생성 → 자료함 이미지 고르기 | 블로그 |
