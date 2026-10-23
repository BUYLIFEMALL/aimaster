# BLC-10 문단별 본문 이미지 노드·개별 재생성 — 개발 플랜 (2026-10-22, 주인님 승인)

## 문제 (v1.98까지)
- 「본문 이미지 N장 다시 생성」이 문장 고르기부터 전부 새로 하고 모든 파일을 지운 뒤 배치도 처음부터 다시 만듦 → 하나 고치려다 전부 바뀜. 중간에 한 장 실패하면 이미 만든 장까지 버림(비용만 나감).
- 「이 이미지만 다시 생성」은 저장된 프롬프트를 그대로 써서 요청을 고칠 수 없음.
- 「전송 제외」는 화면 블록만 빼고 기록·파일은 남음(복원 방법도 없음). 특정 문단에 이미지를 넣을 수 없음.
- 전체 재생성 직후 배치는 DB에 저장되지 않아 새로고침하면 어긋남. 편집기 이미지에 버전 값이 없어 다시 만든 뒤 최대 5분 옛 사진.

## 설계 (작업실 blog-workroom `src/lib/actions/image.ts` 방식 + 보강)
- 칸 번호(content-1~3)를 노드 번호로 그대로 사용 → 크롬 확장·자동 발행 코드 변경 없음. 최대 3장 유지.
- 「구성 정하기(글 AI 1회) → 노드마다 이미지 1장」으로 나눔. 서버 요청 하나에 이미지 최대 1장 → 시간 초과·실패해도 만든 장은 남음.
- 노드 하나만 저장: 저장 직전 최신 원고를 다시 읽어 그 노드(이미지·블록 위치)만 반영, saveRevision이 다르면 다시 읽어 최대 3번(`lib/imageNodeStore.ts`). 블록(`contentBlocks`)도 함께 저장 → 새로고침 복원.
- 작업실에 없던 보강: 노드 삭제(기록·블록·파일 함께), 다시 만들 때 옛 파일 삭제, 노드별 요청 저장, 확장 목록에서 이미지 없는 노드 제외.

| 기능 | 경로 | AI |
|---|---|---|
| 빈 칸 구성(목표 장수까지 모자란 칸만, 기존 문장 제외) | `POST /api/images/plan-content` | 글 1회 |
| 노드 하나 만들기/요청 고쳐 다시 만들기 | `POST /api/images/regenerate-content` (`request` 선택) | 이미지 1장 |
| 노드 삭제 | `POST /api/images/delete-content` | 없음 |
| 이 문단에 이미지 | `POST /api/images/add-content` → 이어서 regenerate | 글 1회 + 이미지 1장 |
| (삭제) 옛 일괄 생성 | `/api/images/generate-content` | — |

순수 규칙: `lib/imageNodes.ts`(freeSlots·upsertNode·removeNode·placeNodeBlock·removeNodeBlock·cleanRequest·nodePrompt), 시험 `tests/image-nodes.test.mjs`.

## 하지 않는 것(후보)
- 4장 이상(확장 수정 필요), 내 사진 업로드로 교체, 통짜 본문 입력칸에서 고쳤을 때 이미지 위치 지키기.

## 비용(승인)
- 빌드 1~2회, 이미지 약 5장(가장 저렴한 NanoBanana Standard 1K), 글 AI 2회(gpt-4o-mini), DB 표 변경 없음.

## 버전
- v1.99 (코드·확장 manifest·ZIP·DB). 같은 작업 안의 표시 한 줄 수정 재배포는 v1.99 유지.
