# 개발 플랜 (2026-10-19, Claude Code 윈도우): 「사진을 읽지 못했어요」 공용 부품 `image-file-check` + 인물사진 꺼진 버튼 이유 안내

> 상태: 주인님이 추가개선 제안 1·2를 인용해 진행 지시 → 진행.

## 운영 실측 (깨진 JPG 4KB를 페이지 안에서 만들어 사진 칸에 넣음 — 서버 전송·AI 비용 없음, 메인 크롬)
| 프로그램 | 지금 동작 |
|---|---|
| portrait-photo | 깨진 그림 아이콘만, 안내 없음, [만들기] 켜진 채 |
| image-convert-studio | 깨진 미리보기로 목록에 들어가고 [변환] 표시, 안내 없음 |
| photo-remake-studio | 안내는 나오나 브라우저 영어 원문 「The source image could not be decoded.」 |
| banana-canvas | (코드) 깨진 파일을 그대로 서버 업로드 → AI 단계에서야 실패 |
| fashion-style·ai-influencer-studio·allinone-graphic·seo-thumbnail-pro·four-cut-comics·emotion-writer·style-dna-analyzer | 적용할 때 프로그램별 확인 |

## 구현
1. 기준 `portrait-photo/src/lib/imageFileCheck.ts` — `checkImageFile`(createImageBitmap 실패 시 Image로 한 번 더, 둘 다 실패해야 실패 — 정상 사진 오판 방지, 확인 수단 없는 환경은 통과), `splitReadableImages`, `IMAGE_READ_FAIL_MESSAGE`. 테스트 `tests/imageFileCheck.test.mjs`.
2. `scripts/check-shared-modules.mjs`·`docs/SHARED_MODULES.md` 등록, 프로그램 적용 때마다 사본 추가 → `--sync`.
3. 프로그램마다 사진을 받는 곳에서 먼저 검사 → 깨졌으면 안내하고 받지 않음. tsc·테스트·빌드·배포·+0.01, **한 곳씩 순차**.
4. (제안 2) 인물사진 v1.29: 꺼진 [인물 사진 만들기] 아래 이유 한 줄(사진 없음 / 동의 미체크) — 같은 배포로 묶음.

## 검수·비용
- 프로그램마다 깨진 사진 → 한글 안내 확인(브라우저 테스트 또는 운영 실측). AI 비용 없음. 배포는 프로그램 수만큼 순차.
