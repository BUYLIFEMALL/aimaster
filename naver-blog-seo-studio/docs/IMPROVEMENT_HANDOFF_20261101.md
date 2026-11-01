# 인수인계 — v2.22 작업실 → SEO 병합 마무리 (2026-11-01)

> [역할: mac-mini] Claude Code(맥미니) `claude-mac-20261101-blog` · 플랜 [PLAN_20261101_WORKROOM_MERGE.md](PLAN_20261101_WORKROOM_MERGE.md) · 주인님 승인(빌드 1회·시험 이미지 1장·문체 분석 1회).
> 상태: **코드·로컬 시험 완료, ⏸ 미배포 대기**(2026-11-01 주인님 「배포는 모아서 하고 다음 작업에 꼭 필요할 때만 승인 요청」). 코드 버전은 v2.21 그대로 — 다음에 SEO를 배포하는 세션이 아래 순서로 함께 내보낸다.

## 한 일
| 기능 | 내용 | 파일 |
|---|---|---|
| 이미지별 참고 사진 | 본문 이미지 노드마다 「📷 이 이미지만 참고 사진」(최대 5장). 노드 사진이 있으면 그것만, 없으면 공통 참고 사진(합치지 않음 → 장수·4.5MB 요청 한도 그대로). 브라우저 상태만, 열쇠 「원고 id/칸」, 노드 삭제 시 함께 지움, 서버 저장 없음. 서버 API 변경 없음(원래 요청마다 refs를 받음) | `lib/imageOptions.ts` `pickImageRefs`, `components/studio/ImageOptionsPanel.tsx` `RefPicker`(공통 패널도 사용), `useStudio.ts` `nodeRefs`, `NewDraftView.tsx` |
| 문체 글 20·30개 | 수집 개수 5·10·20·30(`readStyleDepth`, 그 밖의 값은 예전 기본 10). 본문 읽기 5개씩 나눠서. AI 입력은 글 본문 합계 18,000자 안에서 나눔(`postCharLimit`: ≤10개는 예전과 같은 1,800자, 20개 900, 30개 600) | `lib/style.ts`, `app/api/styles/route.ts`, `lib/naverRss.ts`, `lib/ai/stylePrompt.ts`, `StyleView.tsx` |
| 문체 주제 정보 | 분석 JSON에 `topics`(≤3)·`subtopics`(≤5) 요청, AI가 준 경우에만 저장·표시(「블로그 주제」). **승인 지문 항목이 아님** — 넣으면 기존 승인 문체가 모두 무효가 되기 때문. 생성 지시문(styleSection)에는 넣지 않음(기존 글 결과 불변) | `lib/style.ts` `normalizeStyle`, `lib/ai/stylePrompt.ts`, `StyleView.tsx` |
| 버전 | 올리지 않음(미배포). 배포 때 `lib/version.ts`·`extension/manifest.json`을 v2.22로(확장 코드 변경 없음) | |

## 검수(맥미니)
- `tsc --noEmit` 통과, `node --test tests/*.test.mjs` **133/133 통과**(새 시험 6개: 노드 사진 우선·공통 대체·장수 상한, 수집 개수 허용값, 글당 길이·18,000자 상한, 주제 정보 상한·지문 불변).
- 화면 검수·실제 AI 호출은 배포 뒤.

## 다음에 SEO를 배포하는 세션의 순서
0. `lib/version.ts` `APP_VERSION`·`extension/manifest.json` `version`(2.22.0)·`version_name`(v2.22) 올리기
1. `cd naver-blog-seo-studio && npm run build` → `npm run extension:archive`(ZIP·버전 파일 v2.22)
2. `vercel deploy --prod --yes`(팀 `buylife`, 동시 빌드 없을 때)
3. DB: `update programs set version='v2.22', extension_version='v2.22', updated_at=now() where slug='naver-blog-seo-studio';`(다운로드 주소는 기존 값 유지 확인)
4. `node scripts/check-extension-release.mjs naver-blog-seo-studio` → OK
5. 맥미니에 화면 검수 요청(시험 계정 `buylifemall@naver.com`: 노드별 참고 사진 이미지 1장, 문체 30개 분석 1회)

## 남은 일
- 배포·DB·ZIP(윈도우), 배포 뒤 맥미니 크롬 화면 검수.
- 작업실(`blog-workroom`)은 그대로 둔다(주소·데이터 유지, 신규 개발 중단). 「SEO로 옮겨 쓰세요」 안내 배너는 주인님 결정 뒤 별도.

---

## 추가 — 블로그 병합 ④ 콘텐츠 제작 → SEO (같은 날, 같은 미배포 묶음)
> 플랜 [PLAN_20261101_CONTENT_MAKER_MERGE.md](PLAN_20261101_CONTENT_MAKER_MERGE.md) · 주인님 승인(ZIP은 라이브러리 없이 직접 작성). 상태: **코드·로컬 시험 완료, ⏸ 미배포 대기(v2.22에 합침)**.

| 기능 | 내용 | 파일 |
|---|---|---|
| 참고 사진 용도 | 「분위기만 참고(기본, 지시문 예전과 한 글자도 같음)」/「제품 그대로 넣기」(제품 모양·색·재질·특징 보존, 제품 자체 라벨은 유지, 다른 글자·로고·워터마크·얼굴은 넣지 않음 — `PRODUCT_REF_RULE`). 공통 참고 사진은 패널의 선택 상자, 이미지별 참고 사진은 노드의 「제품 그대로 넣기」 체크. API 2곳이 `refMode`를 받음(`readImageRefMode`, 잘못된 값은 기본) | `lib/imageOptions.ts`, `lib/ai/nanoBanana.ts`, `app/api/images/generate`·`regenerate-content`, `ImageOptionsPanel.tsx`, `TitleView.tsx`, `NewDraftView.tsx`, `useStudio.ts` |
| ZIP(글+이미지) | 「파일로 내보내기」에 「ZIP(글+이미지)」. 편집기 블록 순서대로 `index.html`(이미지 상대 경로)·`article.md`·`images/NN.확장자`. **브라우저에서 묶음**(Vercel 응답 4.5MB 한도 — 2K 이미지 7장이면 넘음), 이미지는 화면이 쓰는 회원 본인 주소로 받음, 받지 못한 이미지는 건너뛰고 장수 안내. 서버 API 추가 없음 | `lib/zipStore.ts`(무압축 ZIP·CRC32·UTF-8 이름 표시), `lib/draftExport.ts`(`toPackageHtml`·`toPackageMarkdown`·`packageImageName` — 기존 TXT·MD·HTML 출력 불변), `useStudio.ts` `exportDraftZip`, `NewDraftView.tsx` |
| 가져오지 않음 | 영상 첫·끝 장면 이미지 — `ai-video-studio`가 첫·끝 장면 이미지를 직접 올려 영상까지 만듦. 프로그램 간 이미지 넘기기는 공통 아이디어 표 후보 | — |

검수(맥미니): `tsc --noEmit` 통과, `node --test tests/*.test.mjs` **143/143 통과**(새 시험 10개: 지시문 불변·제품 모드·값 검사·요청 전달, CRC32 표준값·ZIP 구조, 맥 `unzip`으로 실제 풀기, 한글 이름은 Python 표준 해석기로 확인, 패키지 HTML·MD 순서·이스케이프).
알아 둘 점: 맥 기본 `unzip`(6.0)은 ZIP의 UTF-8 이름 표시를 무시해 한글 이름을 깨뜨린다 — 그래서 ZIP 안 파일 이름은 영문·번호만 쓴다.
배포 뒤 화면 검수 추가: 「제품 그대로 넣기」 이미지 1장(시험 계정 Gemini, 승인됨), ZIP 내려받기·풀기(비용 없음).

---

## 배포 결과 (2026-11-01, 윈도우 `claude-win-20261101-blog`)
SEO v2.22 운영 반영, DB·확장 ZIP 대조 OK. 남은 일: 맥미니 화면 검수.
