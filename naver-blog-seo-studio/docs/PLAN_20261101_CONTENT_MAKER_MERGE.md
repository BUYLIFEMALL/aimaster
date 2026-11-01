# 플랜 — 콘텐츠 제작 → SEO 병합 (블로그 병합 ④)

> 2026-11-01 주인님 승인(「④번 콘텐츠 제작 분석과 플랜 진행해」 → ZIP은 「첫번째로 진행해」). 작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini].
> 대상: ① AIMaster 운영. 미배포 대기 중인 작업실 병합분([PLAN_20261101_WORKROOM_MERGE.md](PLAN_20261101_WORKROOM_MERGE.md))과 함께 v2.22로 한 번에 배포.

## 분석 — `blog-content-maker` v1.12 기능별 판단
| 기능 | 다른 곳 | 판단 |
|---|---|---|
| 제목 10개·작성 모드 5가지·다시 쓰기·점검·수정 이력 | SEO(제목·구성 양식·전개 구조·다시 쓰기 3모드·품질 점검·AI 검수·B-6) | 이미 있음 |
| 네이버 입력 | SEO가 입력·발행·예약·기록까지 | SEO가 더 나음 |
| 제품 사진 합성(「제품 형태·특징 보존 합성」 지시, `blog-content-maker/src/lib/ai.ts` 76줄) | SEO 참고 사진은 「분위기만, 따라 그리지 말 것」(`REF_RULE`) — 반대 | **가져옴** |
| 이미지 포함 ZIP(`index.html`·`article.md`·이미지·`sources.json`) | SEO는 TXT·MD·HTML 글만 | **가져옴** |
| 영상 첫·끝 장면 정지 이미지(MP4 없음) | `ai-video-studio`가 `start_image`·`end_image`를 직접 올려 영상 생성. 프로그램 간 넘기기 입구 없음 | 가져오지 않음 → 공통 아이디어 표 후보 |

## 구현
1. **참고 사진 용도** — `mood`(기본, 지시문 예전과 같음) / `product`(제품 형태·색·특징 보존 합성, 로고·글자 새로 만들지 않음). 공통 참고 사진·이미지별 참고 사진 모두. 값 검사 `readImageRefMode`.
2. **ZIP(글+이미지)** — 브라우저에서 묶음(Vercel 응답 4.5MB 한도 때문에 서버 생성 안 함). 라이브러리 없이 무압축(STORE) ZIP 직접 작성 `lib/zipStore.ts`(CRC32·UTF-8 표시). 구성 `index.html`(이미지 상대 경로)·`article.md`·`images/`. 이미지는 기존 회원 본인 주소 `/api/drafts/[id]/image`로 받음. 서버 API 추가 없음.
3. 문서·공통 아이디어 표·미배포 목록.

## 검수
`tsc --noEmit`, `node --test`(지시문 불변·제품 모드·잘못된 값, ZIP을 실제 `unzip`으로 풀어 내용 대조). 배포 뒤 맥 크롬에서 「제품 그대로 넣기」 이미지 1장, ZIP 내려받기·풀기.

## 비용
개발·시험 무료. 추가 빌드 없음(v2.22 묶음). 배포 뒤 이미지 1장(시험 계정 Gemini, 약 0.04달러).
