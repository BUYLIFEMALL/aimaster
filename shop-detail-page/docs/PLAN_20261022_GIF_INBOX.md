# 플랜 2026-10-22 — GIF 자동화 → 상세페이지 섹션으로 GIF 보내기 (상세 v1.28 · GIF v1.14, Claude Code 맥미니, 주인님 승인 「진행해」)

## 문제
회원은 GIF를 만든 뒤 내려받았다가 상세페이지 섹션에 다시 올려야 했고, 섹션 올리기는 JPG·PNG·WEBP만 받아 GIF는 아예 넣을 수 없었다.

## 방식 — 브라우저 창끼리 넘기기(postMessage, 서버 없음)
GIF 완료 줄 「🛍 상세페이지로」 → `https://shop-detail-page.buylife.xyz/products/gif-inbox` 새 창 → 받는 창이 「준비됨」 → GIF 창이 파일(Blob) 전송 → 상품·섹션 고르기 → 기존 섹션 직접 올리기 경로(`uploadCustomSectionImage` + `addCustomSectionImageAction`, 본인 폴더·`requireProgramAccess`).
두 창 모두 상대 주소가 정확히 일치할 때만 받음. 약속은 공용 기준 코드 `gif-handoff`(기준 `shop-detail-page/lib/gifHandoff.ts`, 사본 `video-to-gif/lib/gifHandoff.ts`).
버리는 방식: GIF 앱이 상세페이지 버킷·DB에 직접 쓰기(프로그램끼리 서로의 저장소에 쓰게 됨). 두 앱 모두 `Cross-Origin-Opener-Policy` 머리글이 없어 창 연결이 유지됨(2026-10-22 curl 확인).

## 상세페이지 v1.28
- `lib/gifHandoff.ts`(새, 기준) · `app/(dashboard)/products/gif-inbox/page.tsx` + `components/products/GifInbox.tsx`(새, GIF 받기 화면 — 직접 열면 안내)
- `lib/uploadImageClient.ts`: 섹션 이미지에 GIF 허용(10MB). 상품 사진(AI 분석용)은 그대로. `SectionImageGrid` 파일 칸도 GIF.
- 섹션 ZIP: GIF(머리 `GIF8`)는 원본 그대로 `.gif`. 긴 PNG·HTML은 첫 장면 — GIF 섹션이 있으면 안내 한 줄.
- GIF 섹션은 「✏️ 문구」 숨김(다시 그리면 움직임이 사라짐).
- S-22-18 배지 안내 한 줄(편집 창·FAQ), FAQ 「움직이는 GIF도 섹션에 넣을 수 있나요?」 추가.
## GIF v1.14
- `lib/gifHandoff.ts`(사본), 완료 줄 「🛍 상세페이지로」(대기 먼저 → 신호 받으면 파일 전송, 10초 넘으면 로그인 안내, 창 닫히면 정리), 좁은 화면 완료 줄 배치(버튼 묶음 아래 줄, 크기 글자 줄바꿈 금지).

## 검수
- 메시지 검사 시험 12가지(node, 스크래치 폴더) 통과, 공용 모듈 점검 `gif-handoff` OK, 두 앱 tsc 0·eslint 0.
- 배포(상세 → GIF 순서) 뒤 맥미니 크롬: 보내기 → 섹션 넣기 → 섹션에서 움직이는지, 섹션 ZIP 안 `.gif`, 문구 버튼 숨김, 받는 창 직접 열기 안내, 500px 폭.

## 비용
Vercel 빌드 2회, AI 0회, 저장 용량 GIF를 넣을 때만 회원 본인 폴더 1개(30일 정리).
