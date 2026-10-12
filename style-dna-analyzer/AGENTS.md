# STYLE DNA ANALYZER (style-dna-analyzer) — 작업 인수인계

> 먼저 읽을 것: 루트 `CLAUDE.md`(핵심 원칙, 특히 최상위 규칙 0번·본인 키 규칙), `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`.
> **개발·테스트·디버깅·검증은 실제 Chrome을 띄워 화면을 같이 보며 한다**(루트 `CLAUDE.md` §13, `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md` 8-1-1).

## 1. 개요와 현황 (2026-10-12, v1.05)
- 이미지 한 장을 올리면 AI가 **카메라·조명·스타일 DNA**를 분석하고, **실제 픽셀로 색상 팔레트**를 계산하며, **영어·한국어 마스터 프롬프트**를 만든다. 「유전자 복제」(스타일 그대로 재현, 피사체 자리표시자 `[INSERT SUBJECT HERE]`/`[주제 입력]`)와 「유전자 변이」(지침에 따라 변형, 0~100% 변이 강도 슬라이더) 두 모드.
- 라이브: https://style-dna-analyzer.buylife.xyz (Vercel 프로젝트 `buylife/style-dna-analyzer`, alias style-dna-analyzer.vercel.app). 기반: `cardnews-studio` 복사(권한 판정·SSO 쿠키·설정 화면·BYOK 구조 동일). 원본 레퍼런스: `https://style-dna-3.vercel.app/` (스크린샷 1:1 일치 3단 스튜디오 레이아웃 + 위아래 왕복 스캔 레이저 빔 애니메이션 + 전수 JS 번들 스크래핑 역분석 100% 로직 융합).
- DB: `programs.slug='style-dna-analyzer'`, 카테고리 멀티미디어, 최소 등급 일반, 배지 `new`, 표준 요금제 1·2·3개월(1/2/3만원). 마이그레이션 `0001`(테이블+버킷), `0002`(등록), `0004`(레이아웃), `20261012062000_v1_03_features.sql`, `20261012073000_v1_04_studio_layout.sql`, `20261012074000_v1_05_scan_animation.sql`(버전 v1.05).

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

## 6-1. v1.02 (2026-10-11) 데스크톱 레이아웃 수정
- 실제 데스크톱 화면(1368px)에서 1단계 결과가 입력 카드(360px)·결과·팔레트 세 칸으로 좁게 나뉘어 제목·재현도 글자가 세로로 눌리는 문제를 발견(스크립트 검수로는 안 보이고 화면 캡처로만 보임). 입력 카드를 위쪽 2열(왼쪽: 업로드·모드, 오른쪽: 지침·AI·시작 버튼)로, 결과를 아래 전체 폭으로 바꾸고 `ResultView` 바깥 2열은 `xl`부터만 적용. 마이그레이션 `0004_v1_02_layout.sql`. 화면 확인: 1단계·2단계·3단계 데스크톱 모두 정상.

## 6-2. v1.03 (2026-10-12) 원본(`style-dna-3.vercel.app`) 정밀 역분석 기반 100% 로직 융합 및 확장
- **원본 번들 JS 전수 스크래핑 & 역분석**: `index-BGjzrCkN.js` (655KB) 통째로 다운로드 분석 (`scratch/style_dna_analysis/`).
  - 시스템 인스트럭션 `ZE`, JSON 출력 스키마 `WE`, 112개 한국어 번역 리소스 `te.ko`, API 핸들러 `kL`/`GL`/`HL` 전수 분석.
- **핵심 확장 구현 내역**:
  1. **변이 강도 슬라이더 (0~100%)**:
     - `0~30%`: 안정적 미세 변형 (Stable)
     - `31~70%`: 하이브리드 균형 변형 (Hybrid)
     - `71~100%`: 실험적 파격 변형 (Chaotic)
     - 프롬프트 엔진 및 결과 뷰에 실시간 변이 배지 및 즉시 재변이 위젯 연동.
  2. **원본 참조 이미지 태그 강제 주입 토글 (`[첨부 이미지]` / `[Attached Image]`)**:
     - 미드저니/Gemini 등 멀티모달 프롬프트에서 원본 이미지를 직접 참조할 수 있도록 태그 주입 옵션 기본 활성화.
  3. **타겟 이미지 생성 모델 최적화**:
     - Midjourney v6, Stable Diffusion 3, Flux 1, Gemini/Imagen 3 타겟 모델별 맞춤형 파라미터 및 프롬프트 문법 자동 튜닝.
  4. **12종 화면 비율 (Aspect Ratio) 풀 지원**:
     - 1:1, 16:9, 9:16, 4:3, 3:4, 21:9, 9:21, 3:2, 2:3, 4:5, 5:4, 2:1 등 전 비율 감지 및 프롬프트 매핑.
  5. **리치 구조 청사진 & 활용 팁 HTML 렌더링**:
     - `<b class="text-indigo-600">`, `•` 불릿 등 원본 시각화 구조를 안전하게 렌더링하도록 DOMPurify 기반 RichHtml 뷰어 적용.
  6. **이용 가이드 & 핵심 팁 모달 (`HelpGuideModal`)**:
     - 원본 `te.ko`의 5단계 가이드와 3대 스타일 추출 꿀팁(고해상도 피사체 명확, 톤앤매너 집중, 반복 생성 일관성) 내장.
  7. **3단계 테스트 랩 프롬프트 커스텀 편집 및 확대 줌(Zoom) 모달**:
     - 피사체 자동 합성 외에 사용자가 직접 프롬프트 편집(`customPrompt`) 가능.
     - 원본/생성 이미지 나란히 비교 시 클릭하여 고해상도 확대 및 다운로드 팝업 지원.
- **검수**: `npm test` 23개 전체 통과, `npm run lint` 0 에러, Next.js Turbopack 빌드 성공, Vercel 프로덕션 배포 완료.

## 6-3. v1.04 (2026-10-12) 원본 스크린샷 1:1 일치 3단 스튜디오 분석기 레이아웃 개편 및 듀얼 테마
- 주인님 요청: 전달받은 원본 V3 스크린샷(`orca-paste-1791790195484...png`)의 3열 스튜디오 레이아웃 형태 100% 매칭 구현.
- **3단 분할 레이아웃 구조**:
  - **좌측 컬럼 (~22%)**: `이미지 소스 선택` + `📷 카메라 & 렌즈` + `🔆 조명 시퀀싱` + `⚙️ 시스템 가이던스`.
  - **중앙 메인 컬럼 (~53%)**: `스마트 스캔 이미지 뷰어` + `심층 분석 리포트`.
  - **우측 컬럼 (~25%)**: `🎨 미학적 팔레트` + `🧬 스타일 DNA` + `아이덴티티 일치 확률(96.5%)` + `추출된 키워드`.
- **듀얼 테마 지원**: 상단 헤더에 `🌙 Studio Dark` / `☀️ Clean Light` 토글 스위치 제공.

## 6-4. v1.05 (2026-10-12) 위아래 왕복 스캔 레이저 빔 애니메이션 및 유전자 해독 중 인디케이터
- 주인님 요청: "이미지 스캔할때는 위에서 아래위로 스캔하는 에니메이션을 구현해주고" + 전달받은 스크린샷(`orca-paste-1791790254634...png`) 1:1 일치 구현.
- 원본 번들 JS(`FL` 컴포넌트) 및 CSS(`index-DWYQku-l.css`의 `.scanline`) 분석 결과 반영:
  1. **위아래 왕복 스캔 레이저 라인 (`scanLaserBounce`)**:
     - 0% ➔ 100% ➔ 0%로 끊김 없이 부드럽게 위아래로 왕복하는 네온 사이언 레이저 빔.
     - 양 끝 투명, 중심부 네온 사이언(#00f0ff) 그라데이션 및 `shadow-[0_0_16px_rgba(0,240,255,0.85)]` 발광 효과.
     - 레이저 라인 상단에 따라붙는 은은한 광선 잔상(트레일) 오버레이.
  2. **중앙 "유전자 해독 중..." 인디케이터 오버레이**:
     - 스캔 중 이미지 `brightness-50 backdrop-blur-[2px]` 딤 처리.
     - 외곽 360도 회전하는 점선 원형 링 (`scanRotateRing`) + 내부 펄스 `Dna` 나선 아이콘.
     - `tracking-[0.28em] text-xs font-mono font-black text-cyan-300 animate-pulse` 네온 타이틀 `유전자 해독 중...`.
  3. **좌측 파라미터 대기 표시**:
     - 스캔 중일 때 좌측 카메라 & 조명 항목들을 스크린샷과 동일하게 `---` (대시 3개)로 표시.
     - 버튼 텍스트 `시퀀싱 중...` (스피너 아이콘)으로 전환.
- **검수**: `npm test` 23개 통과, `npm run lint` 0 에러, Next.js Turbopack 빌드 성공. Vercel 배포 완료.

## 7. 알려진 한계·다음 작업
- 일반 회원 검수 완료(2026-10-11, 실제 Chrome에서 `buylifemall@naver.com` 로그인): 사용기간(검수용 2026-11-10까지)을 부여한 뒤 보관함이 비어 보임(관리자 분석이 안 보임 = 회원별 분리), 1단계 업로드→분석 시작→본인 Gemini 키로 분석 완료(결과·팔레트·DNA 표시). 검수용 사용기간과 이 계정의 분석 1건은 남아 있다(필요 시 정리).
- 전용 카탈로그 썸네일: 2026-10-11 제작·등록 완료(`program-images/catalog/style-dna-analyzer-thumbnail.jpg`, `scripts/generate-program-thumbnail.mjs`, 주인님 요청으로 관리자 키 사용·1회 생성, 마이그레이션 `0003_thumbnail.sql`).
- 한 번에 이미지 1장만 분석(배치 분석 없음). 색감 일치율은 색 분포 비교일 뿐 구도·형태 유사도는 아니다.
- v1.02 후보: 분석 결과 PDF/텍스트 내보내기, 보관함 검색·태그, 생성 이미지 저장, 비교 보기 확대.

## 8. 배포
```
cd style-dna-analyzer
npm test && npm run build
vercel deploy --prod --yes --scope buylife
```
환경변수(Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`(값은 저장소에 두지 않는다). 도메인 `style-dna-analyzer.buylife.xyz`는 `vercel domains add`로 연결 완료. 배포할 때마다 버전(`src/lib/version.ts`·`package.json`·DB `programs.version`·마이그레이션 SQL)을 함께 올린다.
