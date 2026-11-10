# 개발 플랜 — 「내 자료함」 1단계 (같은 계정 안 프로그램 간 자료 재사용, 음악 3종부터)

> 2026-11-11 주인님 요청·결정. 근거 분석: [`analysis-member-library-20261111/REPORT.md`](analysis-member-library-20261111/REPORT.md)
> 상태: **승인됨(2026-11-11 주인님 「승인, 진행」) — 구현 진행 중**

## 1. 결정 사항(주인님, 2026-11-11)
| 항목 | 결정 |
|---|---|
| 보관 기간 | 기본 30일(원본과 같음). **관리자가 보관 연장을 지정한 프로그램은 1년**(TOP_RULE §8 「보관 기간 지정 목록」 기준), **관리자·시험 계정은 삭제 제외** |
| 발행 콘텐츠 | **블로그·인스타·쓰레드·유튜브 등에 실제 발행된 콘텐츠는 발행일로부터 1년, 생성만 한 콘텐츠는 30일** — 메인 규칙으로 등록(TOP_RULE §0 맨 위). 자료함은 원본 삭제를 따라가므로 자동 적용 |
| 공개 저장소 자료 | 공개 주소 그대로(자료함 목록 자체는 본인만) |
| 회원 PC에만 있는 자료 | 나중에(1단계는 서버에 있는 자료만) |
| 첫 범위 | 음악 3종 — `ai-music-studio`, `music`(Suno), `free-music-studio` |

## 2. 핵심 설계 — 원본이 지워지면 자료함 줄도 함께 지운다
- 공용 표 `member_assets` 한 개(목록 색인). **파일은 옮기지 않는다**(원본 버킷 그대로, 열 때 서버가 1시간 서명 주소).
- 음악 3종 원본 표에 **DB 트리거**를 단다: 곡이 완성되면 `member_assets`에 줄을 넣고, 원본 줄이 지워지면 자료함 줄도 지운다.
  → 자료함 보관 기간이 **각 프로그램의 정리 규칙을 자동으로 따른다**(30일 / 지정 프로그램 1년 / 두 계정 무기한). 기간을 자료함에서 따로 계산하지 않아 규칙이 어긋날 일이 없다.
  → **음악 프로그램 코드는 고치지 않고, 다시 배포하지도 않는다**(DB만). 음악 담당 세션 작업과 겹치지 않는다.
- 이미 있는 곡은 마이그레이션에서 한 번 채워 넣는다(지금 남아 있는 완성곡만).

### `member_assets` 칸(안)
`id`, `user_id`(회원), `source_slug`(만든 프로그램), `kind`(`audio`·`image`·`video`·`text`·`file` — 1단계는 `audio`), `title`, `bucket`·`path`(비공개 저장소) 또는 `url`(공개 주소·외부 주소), `source_table`·`source_id`·`source_index`(원본 위치), `duration_s`, `bytes`, `meta`(가사·스타일 요약 등 jsonb), `created_at`.
- RLS: **회원 본인 줄만 읽기**, 쓰기는 트리거·서버 키만(회원이 직접 넣거나 고칠 수 없음).
- 다른 회원과 공유 없음(최상위 격리 규칙). `ai-work-workspace` 초대 공유 예외와는 무관.

### 음악 3종별 등록 규칙
| 프로그램 | 원본 | 넣는 시점 | 파일 |
|---|---|---|---|
| `ai-music-studio` | `ams_generations`(`outputs` 배열의 곡마다 한 줄) | `status`가 `completed`가 될 때 | 비공개 `ai-music-studio` 버킷 경로 |
| `music`(Suno) | `music_track_variants`(곡 버전마다 한 줄, 제목은 `music_tracks`) | 버전 줄이 생길 때 | `music-audio` 경로(우리 저장소 주소면 경로로, Suno 임시 주소면 `url` + 「곧 만료」 표시) |
| `free-music-studio` | `free_music_tracks` | 곡 줄이 생길 때(휴지통 제외) | **음원은 회원 PC에만 있음** → 자료함에는 「곡 정보·가사(음원은 무료음악 프로그램에서)」로 표시 |

## 3. 화면 — 메인 사이트 「내 자료함」
- 주소 `https://www.buylife.xyz/library`(로그인 필요, 회원 메뉴에 연결). 종류 탭(1단계는 음악), 프로그램별 거르기, 미리 듣기(서명 주소), 「만든 곳에서 열기」, 「남은 보관 기간」 표시(원본 규칙 기준 안내).
- ~~서버 API~~ → **구현(2026-11-11)**: 별도 API 없이 서버 화면(`app/(dashboard)/library/page.tsx`)이 `lib/library/memberAssets.ts`로 본인 목록을 읽고 버킷별로 한 번에 서명(`user_id` 일치 + 경로 `{user_id}/` 재확인). 다른 프로그램용 API·공용 컴포넌트는 2단계.
- **적용 결과(2026-11-11)**: 운영 DB `0059` 적용 — 자료함 줄 = 원본 기대값(AI 음악 21 · Suno 50 · 무료음악 57), 공개 키로 읽기 0줄, 시험 곡 넣기→1줄·지우기→0줄(원본 삭제 연동 확인).
- 디자인: 메인 사이트 기존 테마(다크 럭셔리) 그대로, 모바일 767px 대응.

## 4. 다른 프로그램이 가져다 쓰는 방법(1단계는 준비만)
- 공용 컴포넌트 `member-assets-client`(기준 코드 1개 + 사본, `check-shared-modules`)에 `listMemberAssets(userId, { kind })`·`signMemberAsset(userId, id)` — 영상 4개 프로그램의 음악 3종별 읽기 코드(`amsSongs.ts`·`sunoTracks.ts`·`fmsTracks.ts` 등)를 나중에 이 하나로 바꿀 수 있다.
- **1단계에서는 영상 프로그램을 바꾸지 않는다**(담당 세션 몫, 효과 확인 뒤 담당께 요청). 지금 있는 가져오기 기능은 그대로 동작.

## 5. 구현 순서와 검수
1. 마이그레이션 `0059_member_assets.sql`: 표·RLS·트리거 3종(넣기·지우기)·기존 곡 채우기 → 운영 DB 적용 전 **Lab DB(AIMaster_dev)에 같은 구조로 시험**하지 않고, 운영 적용 뒤 조회로 줄 수 대조(원본 완성곡 수 = 자료함 줄 수).
2. 메인 사이트 `/library` 화면·API → `tsc`·빌드 → 순서대로 배포(빌드 1회).
3. 검수(ego, 관리자 계정): 자료함에 세 프로그램 곡이 보이는지, 미리 듣기 재생, 다른 회원 줄이 안 보이는지(시험 계정 비교), 원본을 지우면 자료함에서도 사라지는지(시험 데이터 1건).
4. 인수인계: 이 플랜·REPORT·`SHARED_MODULES.md`·음악/영상 담당 「담당께」 요청·HANDOFF.

## 6. 비용
| 항목 | 내용 |
|---|---|
| Vercel 빌드 | 메인 사이트 1회(검수에서 고칠 일이 생기면 +1) |
| DB | 표 1개·트리거(무료) |
| AI 호출 | 없음 |
| 음악·영상 프로그램 재배포 | 없음 |

## 7. 안 하는 것(1단계)
회원 PC 자료 올리기, 이미지·영상·글 연결(2단계부터), 영상 프로그램 가져오기 교체, 자료함 전용 복사 보관.

## 8. 2단계 — 이미지 스튜디오 4개 연결 (2026-11-11 주인님 「2단계 이미지 스튜디오도 연결 진행해」)
- 방식: 1단계와 같음(DB 트리거 + 원본 삭제 연동, 프로그램 코드·배포 변경 없음). 마이그레이션 `supabase/migrations/0060_member_assets_images.sql`.
| 프로그램 | 원본 | 파일 |
|---|---|---|
| `ai-image-studio` | **공용 `usage_logs`**(`action='image_generation'`, 이 프로그램 번호 줄만 — 조건부 트리거라 다른 프로그램 기록에는 영향 없음) `metadata.image_path`, 옛 기록은 공개 주소에서 경로 추출 | `ai-image-generations` |
| `banana-canvas` | `banana_canvas_results.outputs[].path` | `banana-canvas-files` |
| `portrait-photo` | `portrait_photo_saved.path` | `portrait-photo-files` |
| `thumbnail-master` | `thumbnail_master_projects.images_a/b.versions[].path`(A안 0~, B안 100~, 버전이 밀려나면 다시 맞춤) | `thumbnail-master-images` |
- 트리거 안전: 날짜 변환 등 실패할 수 있는 처리를 넣지 않음(트리거 오류 = 원본 프로그램 저장 실패이므로).
- 화면: `/library`에 종류 탭(전체·음악·이미지), 이미지는 미리보기 격자(서명 주소 1시간, 누르면 원본 크기).
- 결과: 운영 적용 — 이미지 자료 = 기대값(AI 이미지 6 · 바나나 2 · 썸네일 5 · 인물사진 0), 전체 141, 인물사진 시험 줄 넣기 1→지우기 0. `tsc` 0·로컬 빌드 통과.
- 담당 안내: 이미지 담당(역할 `ecommerce-image`) — 위 표의 칸 이름·경로 규칙을 바꾸면 트리거 함수(`member_assets_sync_ais/banana/portrait/thumb`)도 함께 고칠 것.

## 9. 3단계 — 영상 2개 + 블로그 원고 6개 연결 (2026-11-11 주인님 「3단계 영상·블로그 원고 연결 진행해」)
- 마이그레이션 `supabase/migrations/0061_member_assets_video_text.sql`, 방식 동일(트리거 + 원본 삭제 연동, 프로그램 코드·배포 변경 없음).
| 종류 | 프로그램 | 원본 |
|---|---|---|
| 영상 | `ai-video-studio` | `avs_generations.outputs[].path`(완성만) · `avs_edits.output_path` — 버킷 `ai-video-studio` |
| 영상 | `music-video-studio` | `mvs_renders.output_path` — 버킷 `music-video-studio` |
| 글 | `naver-blog-agent` · `naver-blog-seo-studio` · `tistory-auto-blog` · `ai-auto-blog` · `naver-blog-allinone` · `wp-blogger-auto` | `nba_posts` · `naver_blog_seo_drafts` · `tistory_posts`(숫자 id) · `blog_posts`(숫자 id) · `aio_posts` · `wba_posts` |
- 글은 파일이 없어 제목·발췌(200자)·원본 상태·발행 여부·발행 주소(공개 주소만)를 저장. 발행된 원고는 「발행됨 · 1년 보관」 표시. 내용이 자주 바뀌므로 같은 줄을 고쳐 씀(자료함 id 유지).
- 숫자 id 표는 `md5('표:'||id)::uuid`로 고정 번호(표 구조 변경 없음). 트리거 인자는 모두 명시 변환(`::text`) — 표마다 칸 형식이 달라도 원본 저장이 실패하지 않게.
- 제외: `shorts-onestop-studio`(완성 영상이 아닌 프로젝트 설정) — 완성 영상을 서버에 저장하게 되면 추가.
- 결과(운영): 영상 25(AI 영상 24 · 뮤직비디오 1), 글 107(34·25·19·15·6·8), 발행 12, 전체 272. 넣기→고치기→지우기 시험: `blog_posts`·`nba_posts`·`wba_posts` 통과(1줄·제목 갱신·0줄), `tistory_posts`는 같은 값 저장으로 트리거 오류 없음 확인(작성자 연결 때문에 가짜 줄 불가). 실제 사용 중 무료음악 곡 1개 삭제가 자료함에도 반영됨(57→56). `tsc` 0·로컬 빌드 통과.
- 화면: `/library` 탭 전체·음악·이미지·영상·글, 영상은 재생기, 글은 발췌·상태·「발행된 글 보기」.
