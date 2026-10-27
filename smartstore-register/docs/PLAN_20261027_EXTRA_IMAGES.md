# 플랜 — 추가 이미지(대표 외 사진) 자동 넣기 (v1.10)

> 2026-10-27 주인님 승인(「진행해」). 작성: Claude Code 윈도우 `claude-win-sdp` · 역할 `ecommerce-image`.

## 문제
확장은 대표 이미지 1장만 넣고, 「추가 이미지」(최대 9장)는 회원이 손으로 올렸다.

## 넣을 사진
- 상세페이지 상품의 참고 이미지(`shop_products.reference_image_urls`, 회원이 올린 실제 상품 사진) 중 **회원 본인 폴더 경로만**, 앞에서부터 최대 9장.
- 없으면 단계를 만들지 않는다(추가 이미지는 필수가 아님).
- AI 섹션 이미지는 넣지 않는다 — 글자가 든 이미지는 스마트스토어 대표·추가 이미지 기준(글자·과한 꾸밈 자제)에 걸릴 수 있다.

## 화면 구조 (저장본 `D:\PDS\Program_dev\smartstore_create\네이버 스마트스토어센터_상품이미지등록.html`)
- 「이미지 등록」 링크 2개: 대표 `a[ng-click="vm.openUploadModal()"][data-nclicks-code="image.repre"]`, 추가 `…[data-nclicks-code="image.add"]`.
- 창 안 「내 사진」 = `ngf-select="vm.uploadImagesFromDevice($files, $invalidFiles)"`, `ngf-multiple="vm.isMultiple"`, **한 번에 총 20MB**(`ngf-max-total-size`) → 18MB 이하 묶음으로 나눠 여러 번 올린다.
- 9장을 다 채우면 추가 버튼이 사라진다(`vm.isMaxUploaded()`).

## 구현
1. `fields.ts`: 동작 `extra_images`(확장 v1.10 이상), 단계 「추가 이미지 N장」(N ≤ 9), 칸 미리보기 표시.
2. `data.ts`: `reference_image_urls` 읽기, 본인 폴더 경로만 최대 9개(`ownExtraPaths`).
3. `/api/extension/task`: `extraImages`(15분 서명 주소) 함께 보냄 — 옛 확장은 모르는 칸이라 무시, 새 동작이 든 작업은 v1.10 미만 확장에 넘기지 않음.
4. 확장: 대표 이미지 다음 `extraImages` 명령 — 추가 버튼 → 파일 칸에 묶음 넣기 → 창 닫힘 대기. 실패하면 실패 칸으로 기록(다른 칸은 계속, 실패가 있으면 저장 버튼 안 누름 — 기존 규칙).

## 검수
- 시험: 0장(단계 없음)·3장·12장(9장으로), 확장 최소 버전 v1.10.
- tsc·build, 주인님 PC 「입력만」 1회(추가 이미지 칸에 사진이 들어가는지 캡처·작업 기록).

## 비용·버전
Vercel 빌드 1회(보정 끝난 뒤), AI·DB 없음. v1.09 → v1.10(확장·ZIP·DB 함께).
