# 보류 패치 — 쓰레드 콘텐츠 운영 작성 탭 「📷 무료 사진」 (2026-10-23, Claude Code 윈도우)

주인님 승인(빌드 1회) 받고 구현했으나, 작업 도중 **다른 Claude Code 세션이 같은 폴더(`threads-content-ops/`)에서 「기획 앱 기능 합치기 v2.15」를 진행 중**인 것을 발견해(같은 폴더 동시 작업 금지) 배포하지 않고 폴더에서 빼 둔 변경입니다. tsc는 통과했고, 빌드·시험·화면 검수는 아직 안 했습니다.

## 다시 적용하는 법 (다른 세션이 작업을 끝내고 ACTIVE_WORK에서 줄을 지운 뒤)
1. `git apply docs/pending-patches/threads-content-ops-free-photo-20261023/tco.patch` — `AttentionComposer.tsx`(글 후보 카드 「🎬 내 영상 추가」 옆 `<FreePhotoPicker …>`), `WebSetup.tsx`(「📷 글 첨부 무료 사진 (선택)」 키 칸·연결 확인), `web-actions.ts`(`searchFreePhotos`·`addFreePhoto`, `CREDENTIAL_PROVIDERS`·`saveMemberCredentials`에 pixabay·pexels), `lib/apiKeys.ts`(키 종류). 그 사이 파일이 바뀌어 안 맞으면 패치 내용을 보고 손으로 옮긴다.
2. `FreePhotoPicker.tsx`·`PhotoKeyCheck.tsx`를 `threads-content-ops/app/threads-content-ops/`로 복사.
3. 공용 사본: `cp insta_auto_poster/src/lib/cardnews/photoSearch.ts threads-content-ops/lib/photoSearch.ts`, `scripts/check-shared-modules.mjs`의 `free-photo-search` copies에 `"threads-content-ops/lib/photoSearch.ts"` 추가 → `node scripts/check-shared-modules.mjs`.
4. 버전은 그때의 다음 번호(지금 기준 v2.16, 코드 `lib/version.ts` + DB), `npm test`·tsc·빌드 → 배포(빌드 1회, 비용 사전 승인) → 크롬 검수(관리자 본인 Pixabay 키: 작성 탭 → 글 생성 결과 카드 「📷 무료 사진」 → 검색 → 추가 → 저장 경로 `ai-image-generations/<회원>/threads-content-ops/up/…jpg` 확인, 설정 연결 확인; 글 생성은 AI 비용이 들므로 기존 결과·초안 화면에서 하거나 비용 승인 후).

## 설계 요점
- 고른 사진은 서버가 받아 직접 올린 이미지와 같은 회원 `up` 폴더에 저장 → 기존 30일 정리(`lib/mediaCleanup.ts`)가 그대로 지움.
- Threads가 받는 JPEG·PNG(8MB, `MAX_IMAGE_BYTES`)만 저장, 그 밖은 「다른 사진을 골라 주세요」.
- 상품이 연결된 글이면 「상품 글은 상품 사진이 먼저입니다」 안내. 검색어 Enter `preventDefault()`. 첨부 최대 `MAX_MEDIA`(20).
