# STYLE DNA ANALYZER (style-dna-analyzer) — 작업 인수인계

> 먼저 읽을 것: 루트 `CLAUDE.md`(핵심 원칙, 특히 최상위 규칙 0번·본인 키 규칙), `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`.
> **개발·테스트·디버깅·검증은 실제 Chrome을 띄워 화면을 같이 보며 한다**(루트 `CLAUDE.md` §13, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md` 8-1-1).

## 1. 개요와 현황 (2026-10-11, v1.01)
- 이미지 한 장을 올리면 AI가 **카메라·조명·스타일 DNA**를 분석하고, **실제 픽셀로 색상 팔레트**를 계산하며, **영어·한국어 마스터 프롬프트**를 만든다. 「유전자 복제」(스타일 그대로 재현, 피사체 자리표시자 `[INSERT SUBJECT HERE]`/`[주제 입력]`)와 「유전자 변이」(지침에 따라 변형) 두 모드.
- 라이브: https://style-dna-analyzer.buylife.xyz (Vercel 프로젝트 `buylife/style-dna-analyzer`, alias style-dna-analyzer.vercel.app). 기반: `cardnews-studio` 복사(권한 판정·SSO 쿠키·설정 화면·BYOK 구조 동일). 참고 원본: 구글 AI 스튜디오 앱 "스타일 DNA 분석기 V3"(캡처로만 확인, 코드 없음 — 기능·화면 구성을 참고해 직접 구현).
- DB: `programs.slug='style-dna-analyzer'`, 카테고리 멀티미디어, 최소 등급 일반, 배지 `new`, 표준 요금제 1·2·3개월(1/2/3만원). 마이그레이션 `supabase/migrations/0001`(테이블+버킷), `0002`(등록).

## 2. 흐름 (사이드바 번호 = 사용 순서)
- **보관함(대시보드)**: 분석 목록(썸네일·팔레트 띠), 열기/삭제(삭제는 화면 안 확인 버튼, 브라우저 대화상자 없음).
- **1 이미지 분석** `/analyze`: 업로드(클릭·끌어다 놓기, 브라우저에서 긴 변 1600px JPEG로 축소) → 모드·시스템 지침·분석 AI 선택 → 결과(제목, 키워드, AI 추정 재현도, 구조 청사진·스타일 분석·활용 팁, 카메라·조명, 팔레트 도넛, 스타일 DNA 막대, 마스터 프롬프트 EN/KO + 복사 버튼). 결과는 자동으로 보관함에 저장.
- **2 프롬프트 보정** `/refine`: 피드백(빠른 선택 칩 포함)으로 EN·KO 프롬프트를 함께 고침, 보정 기록(최대 20개) 보관.
- **3 결과 테스트** `/test`: 피사체를 넣어 Gemini 이미지 1장 생성(원본 참고로 함께 보내기 옵션), 원본과 나란히 표시 + **색감 일치율(측정)**.
- **API키등록·플랫폼연동** `/settings`.

## 3. 파일 구조
- `src/lib/dna/` — `types.ts`(결과 타입·모드·`nearestAspectRatio`), `palette.ts`(**순수 함수**: `paletteFromRgba`, `histogramSimilarity`), `imageFile.ts`(브라우저: 축소·색감 비교), `records.ts`(DB 행↔기록·공개 URL), `apiGuard.ts`(권한·본인 키·AI 검증).
- `src/lib/ai/` — `dnaPrompts.ts`(분석·보정 프롬프트, JSON 정리 `parseAnalysis`/`parseRefine`, 테스트용 최종 프롬프트), `llm.ts`(Gemini/OpenAI/Claude REST, **이미지 입력 `image` 지원**), `image.ts`(`generateImage`, 참고 이미지 지원), `imageModels.ts`(2K·1K), `models.ts`, `imageOptimize.ts`(sharp WebP).
- `src/app/api/` — `analyze`, `refine`, `test-image`, `analyses`(목록), `analyses/[id]`(조회·삭제), `settings/api-keys`, `auth/logout`. 모든 라우트 `force-dynamic` + `force-no-store`, 쓰기·유료 호출은 `authorize()`(프로그램 이용 권한) + 본인 키만(폴백 없음).
- `src/components/dna/` — `AnalysisProvider`(현재 분석·등록 키 현황·AI 선택), `ui.tsx`, `ResultView.tsx`.

## 4. DB·저장소 (2026-10-11 적용)
- 테이블 `sda_analyses`(id, user_id, title, mode, guidance, engine, image_path, aspect_ratio, palette, result, history, 시각) — RLS 4개 owner-only, 서버도 항상 `user_id`로 한정. 회원당 최대 100개.
- 버킷 `style-dna-images`(공개 읽기, 5MB, 서버(서비스 키)만 업로드·삭제, 경로 `<user_id>/<uuid>.webp` — 추측 불가능한 URL). 원본은 긴 변 1600px WebP로 저장하고, 삭제 시 파일도 함께 지운다(본인 폴더만).
- 생성한 테스트 이미지는 **저장하지 않는다**(응답으로만 전달, 내려받기 버튼 제공).

## 5. 규칙·주의
- 모든 AI 호출은 회원 본인의 Gemini/OpenAI/Claude 키(`user_api_keys`)만 사용한다. 분석·보정은 세 공급사 중 선택(모두 이미지 입력 지원 모델), 결과 테스트의 이미지 생성은 Gemini 키 필수.
- 팔레트는 AI 추측이 아니라 서버에서 sharp로 읽은 실제 픽셀로 계산한다. **"AI 추정 재현도"는 AI가 스스로 짐작한 값**이고 실측이 아니다(화면에 그렇게 표시). 실측은 3단계 **색감 일치율**(색 분포 겹침만 비교, 구도·형태·인물 닮음은 반영하지 않음).
- 사람 신원(이름·유명인)은 추측하지 않도록 분석 프롬프트에 명시. 이미지 생성 프롬프트는 인물이 나오면 기본 한국인(핵심 원칙 3번), 연도 규칙(핵심 원칙 8번)은 분석·보정 시스템 프롬프트에 주입.
- 사용자 입력(지침·피드백·피사체)은 꺾쇠를 제거하고 `<data>`로 감싸 프롬프트 주입을 막는다.
- **sharp 운영 주의**: `next.config.ts`의 `serverExternalPackages: ["sharp"]` + `outputFileTracingIncludes`(`@img/sharp-libvips-linux-x64`, `@img/sharp-linux-x64`)가 없으면 Vercel 함수에서 `libvips-cpp.so.8.18.7` 로드 실패로 500 HTML이 나온다(`docs/ERROR_LESSONS.md` 2026-10-11 항목).

## 6. 검수 기록 (2026-10-11, v1.01)
- 자동: `npm test` 21개(팔레트·색감 일치율·비율 선택·프롬프트·JSON 정리·세 공급사 이미지 페이로드·권한 판정 8개), `npm run build`, `tsc` 통과.
- 실제 로그인 Chrome(관리자 `buylifemall@gmail.com`, 본인 키)에서 화면으로 확인: 업로드 → 분석 35초(Gemini 3.7 Flash, 16:9 감지, 팔레트·DNA 막대·프롬프트 표시) → 보관함 카드·열기 → 보정(7.8초, 새 프롬프트·기록) → 결과 테스트(피사체 없으면 400 안내, 한국인 인물 이미지 생성, 색감 일치율 65.7% 표시) → 모바일 폭(약 500px) 화면 정상.
- 첫 배포는 sharp libvips 누락으로 `/api/analyze`가 500 HTML이었고, `next.config.ts` 수정 후 재배포해 해결.

## 7. 알려진 한계·다음 작업
- 일반 회원(`buylifemall@naver.com`) 화면 직접 검수는 하지 않았다(권한 판정은 cardnews-studio와 같은 사본·단위 테스트). 필요하면 사용기간을 부여한 뒤 확인.
- 전용 카탈로그 썸네일 미등록(관리자 Gemini 키 사용에 주인님 확인이 필요해 보류) — 등록 전에는 기본 이미지.
- 한 번에 이미지 1장만 분석(배치 분석 없음). 색감 일치율은 색 분포 비교일 뿐 구도·형태 유사도는 아니다.
- v1.02 후보: 분석 결과 PDF/텍스트 내보내기, 보관함 검색·태그, 생성 이미지 저장, 비교 보기 확대.

## 8. 배포
```
cd style-dna-analyzer
npm test && npm run build
vercel deploy --prod --yes --scope buylife
```
환경변수(Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`(값은 저장소에 두지 않는다). 도메인 `style-dna-analyzer.buylife.xyz`는 `vercel domains add`로 연결 완료. 배포할 때마다 버전(`src/lib/version.ts`·`package.json`·DB `programs.version`·마이그레이션 SQL)을 함께 올린다.
