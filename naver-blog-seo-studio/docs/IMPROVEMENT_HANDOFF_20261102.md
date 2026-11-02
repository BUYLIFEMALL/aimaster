# naver-blog-seo-studio — 2026-11-02 v2.24 배포 요청 (맥미니 → 윈도우)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 2026-11-02
요청: 주인님 채팅 지시 「윈도우에 v2.24 배포 요청해」(2026-11-02) — **Vercel 빌드 1회 승인으로 봄**. 범위를 넘으면(빌드 실패로 재배포 등) 주인님께 다시 여쭐 것.

## 이번 배포에 들어가는 커밋 (모두 미배포, `docs/PENDING_DEPLOYS.md` SEO 3줄)

| 구분 | 내용 | 커밋 |
|---|---|---|
| 웹 | 30일 정리에서 예외 회원 제외 | `3fa97c0f4` |
| 확장 | 백그라운드가 예약 작업을 거절하던 문제 | `defc197f0` |
| 확장 | 문단 블록이 한 문단으로 붙던 문제(맥 Enter 우회 3건 되돌림 포함) | `ad2c8f9d6` |
| 확장 | 「작성 중인 글이 있습니다」 창 자동 「취소」 | `31120a406` |
| 확장 | 예약 뒤 글 목록으로 넘어가면 글쓰기 화면을 다시 열어 예약 확인 | `62ff4d37f` |
| 확장 | 블로그 ID 기억·로그인한 본인 블로그 ID 확인 | `6fc9aebaa`·`314b2b32b`·`e3fae47fd` |
| 웹 | 이미 실행한 원고 재전송 시 409 「복제해서 쓰세요」 | `f2729ea9b` |
| 웹 | 실패·멈춘 실행 원고 삭제 가능 | `3c73f4d50` |
| 확장 | 자동 포스팅·예약·결과 확인 결과를 버튼 바로 아래 결과 칸에 표시 | `81d22fdd8` |
| 확장 | 본문 이미지만 있는 원고의 잘못된 「불러오지 못했습니다」 | `916f19634` |
| 웹+확장 | 불러올 수 없는 원고를 목록에 [발행됨]·[예약됨] 등으로 표시·이유 안내 | `fca1caee8` |
| 웹 | 생성 기록 칸 찌그러짐·보낸 원고의 잘못된 「미전송」 | `ad62b1a1a` |
| 웹 | 복제 때 대표·본문 이미지 파일도 새 원고 폴더로 복사 | `40c2806d0` |

맥미니 검사: `node --test tests/*.test.mjs` 156 통과, `tsc --noEmit` 통과, 바뀐 파일 린트 통과(`components/studio/useStudio.ts:105` 오류 1건은 기존 것).

## 윈도우 CLI 다음 첫 단계 (순서대로)

1. `git pull` 후 위 커밋이 모두 있는지 확인(맥미니 커밋은 아직 푸시 전일 수 있음 — 윈도우가 묶어서 푸시).
2. 팀 `buylife`에 빌드 중·대기 중 배포가 없는지 확인, `docs/ACTIVE_WORK.md`에 내 줄 추가.
3. `lib/version.ts` `APP_VERSION`을 `v2.24`로.
4. `cd naver-blog-seo-studio && npm run extension:archive` — manifest `2.24.0`/`v2.24`와 ZIP 재생성(배포 전에 직접 실행해야 함, `prebuild`에 없음).
5. `node --test tests/*.test.mjs` · `npx tsc --noEmit` · `npm run build` (로컬, 무료).
6. `vercel deploy --prod --yes` → Ready 확인(시간 초과로 보이면 `vercel inspect`).
7. DB: `update programs set version='v2.24', extension_version='v2.24', extension_download_url='<최신 ZIP 주소, 기존과 같은 경로>', updated_at=now() where slug='naver-blog-seo-studio';`
8. 루트에서 `node scripts/check-extension-release.mjs naver-blog-seo-studio` → `OK`.
9. 문서: `docs/PENDING_DEPLOYS.md` SEO 3줄을 배포 기록으로 옮김, `AGENTS.md` 맨 위 v2.24 항목, `docs/BLOG_FEATURE_MATRIX.md` SEO 예약 칸 「검수 완료(미배포)」 → 배포 완료, `docs/program-descriptions/BLOG_COPY_DRAFT_2026-11-01.md`의 SEO 예약 문구 메인 반영 가능 표시.
10. 배포 뒤 웹 확인(시험 계정 `buylifemall@naver.com`, 비용 없음):
    - 생성 기록: 결과 안내가 줄 아래 전체 폭, 보낸 원고가 「확장 전송됨 · 입력 전」.
    - 이미지 있는 원고 「복제」 1회 → 복사본에 대표·본문 이미지가 보이는지, 원본을 지워도 복사본 이미지가 남는지(Storage `회원ID/새 원고ID/` 폴더).
11. 맥미니에 알림: 확장 화면 확인(결과 칸·이미지 안내·[예약됨] 표시)은 맥미니가 ego에서 ZIP 다시 받기 → 덮어쓰기 → 새로고침 뒤 확인.

## 회원 안내
확장 수정이 포함되므로 회원은 ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → 확장 관리 화면에서 새로고침이 필요하다. 사이드패널의 새 버전 알림이 v2.24를 안내한다.
