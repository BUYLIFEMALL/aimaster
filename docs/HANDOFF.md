# 작업 인수인계 현황판 (HANDOFF.md)

## 메인 개발 방식 명명·공통 인수인계 문서 (2026-10-10)

- 주인님이 네이버 개발 방식을 **「AI 에이전트 기반 자율 개발·검수·배포」**로 명명하고 모든 프로그램·다른 CLI가 활용하도록 메인 지침으로 지정했습니다. 공통 전문: [`AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md`](AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md).
- 공통 전문에 실제 도구·권한 범위·조사·구현·자동 검사·실제 로그인 Chrome·운영 검증·커밋/푸시/배포·확장 ZIP·데이터 보존·실패 처리·시작/완료 양식을 정리했습니다. 네이버 v1.58~v1.62 사례의 확인 범위와 최종 발행 미실행, 별도 자동 저장 후속 문제를 구분했습니다.
- 루트 AGENTS.md 핵심 원칙14·CLAUDE.md 핵심 원칙13 및 README, 네이버 AGENTS/README/CONTINUATION에 연결했습니다. 이번 변경은 지침·문서만이며 네이버 코드/DB/확장 버전은 v1.62 유지입니다. 문서 내부 및 진입점 링크28개·15절 구조·코드 블록·공백 검사 통과, 루트 `npm run build` 성공(기존 `ignoreBuildErrors` 설정으로 타입 검사 생략 — 타입 통과를 주장하지 않음). 커밋·푸시·배포 후 운영 확인 결과는 아래에서 마감합니다.

## 네이버 블로그 에이전트 v1.62 — 실제 웹 설정 검수·배포 완료 (2026-10-10)

- **최종 실제 검수·배포 완료:** v1.62 웹→확장→네이버 카테고리13개 조회, ID29 선택, 태그10개·중복 입력/재적용10개, 웹 설정 저장·재조회·새로고침 복원 및 저장값 실제 네이버 적용 통과. 저장 전 전송 차단/저장 후 해제 정상. 본문·이미지4장 지문 동일, 기존 원고/상태 보존, 최종 발행 없음.
- 코드 0f42854b→5e5629f6→70958c55·origin/master 푸시 완료. 프로덕션 dpl_4uqhK9tSxbr1nvk62keN9jUdFLjq READY, DB/프로그램/확장/라이브 ZIP v1.62 일치(릴리스 검사 실패0/경고0), ZIP HTTP200·핵심5파일 해시 일치, 공개 버전 API200. PC 확장 v1.62 새로고침 완료. 상세 검수 보고: docs/CATEGORY_TAG_VERIFICATION_2026-10-10.md.

## 네이버 블로그 에이전트 v1.61 — 발행 카테고리·태그 (2026-10-10)

- 생성 결과·보관함 「발행 설정」에서 실제 네이버 카테고리 조회, 원고별 선택 저장, 블로그 기본값 선택 저장, 태그 추가/삭제를 지원합니다. 기존 research_summary·tags·default_category 사용, 스키마 변경 없음, 원고 본문·이미지 보존.
- 조회는 웹 회원=확장 연결 회원 및 대상 블로그 일치 검증. 설정 저장은 원고 소유자·이용 권한 검사, 대기/발행 중 변경 및 동시 대기 전환 차단. 선택 설정 저장 후 발행 전송하도록 안내합니다.
- 실제 본인 Chrome 검수: 카테고리 13개 조회, ●AI자동화(ID29) 선택, 태그10개 및 재적용10개, 원고32/32·이미지4장(중복0)·본문 전체 검증 통과. 최종 발행 없음. 배포 후 웹 저장·재조회·라이브 ZIP 검수 예정. 상세: naver-blog-agent/AGENTS.md 및 docs/CONTINUATION.md.


## 네이버 블로그 에이전트 — 이미지 중복·입력 중단 수정 및 실제 검수 (2026-10-10, v1.60)

- 실패 원인: 스마트 편집기가 대표를 첫 본문 이미지로 사용해 마지막 본문 이미지가 누락. 확장 변환은 대표를 표지/본문에 중복 삽입하고, 중복 URL의 자산 파일명 `blog_img_title.png`와 검증 이름 `blog_img_1.png`가 달라 두 번째 사진에서 중지.
- 수정: 본문 이미지 전용 매핑, 기존의 정확히 한 칸 밀린 HTML 배치 복구, URL 중복 방어, 업로드/검증 파일명 통일, 이미지 업로드 시간 초과 재시도 금지. 기존 DB 원고·이미지 보존. 입력·검증 `writeArticle()`을 최종 발행 `publish()`과 분리.
- v1.59 코드 `34c023ab`·푸시·프로덕션 READY, DB/ZIP 일치 및 기존 원고 보존 확인. 주인님 Chrome 화면 제어 복구 후 실제 검수에서 이모지 뒤 설명 소실을 추가 재현 → v1.60에서 이모지 별도 입력·복합 이모지 보존, 늦게 뜨는 이어쓰기 창 처리 후 빈 편집기 안정 확인으로 수정했습니다.
- **실제 네이버 검수 통과:** 본인 연결 계정의 새 편집기 `writeArticle()` 32/32, 대표 1+본문 3=4장, 고유 4·중복 0, 인용구 5, 마지막 문장·`imageAi`·전체 원고 `verify` 확인. 최종 발행하지 않음. 빌드·확장/편집 저장 검사·JS 문법 검사 통과. 최신 결과는 `naver-blog-agent/AGENTS.md` v1.60 및 `docs/CONTINUATION.md` 참고. 라이브 https://naver-blog-agent.vercel.app .
- v1.60 코드 `a134f3ab`·푸시·프로덕션 READY(`dpl_3X9pYRbJMcjcP8AdCnttUhTmS2zf`) 완료. DB/확장/ZIP v1.60 일치(실패 0/경고 0), ZIP 200·핵심 4개 파일 해시 일치, 기존 원고/이미지/상태 보존. PC 확장도 새로고침 완료. 후속 작업은 별도 자동 저장 누락/성공 배지·중복 생성 ID 문제입니다.

## 메인 핵심 지침 — 작업 완료 절차·결과 보고 필수화 (2026-10-10)

- 주인님 재확정: 작업 후 검수 → 커밋 → 푸시 → 해당 프로그램 프로덕션 배포 → 배포 후 확인 → 결과 보고까지 수행합니다. 루트 `AGENTS.md` 핵심 원칙 13번·§2와 `CLAUDE.md` 핵심 원칙 12번·작업 자율성 지침에 같은 내용으로 반영했습니다.
- 보고 항목: 변경 내용·검수 결과·커밋 번호·푸시·배포 결과·버전·라이브 링크·남은 작업. 실패는 복구하고, 복구할 수 없으면 원인·완료/미완료 단계를 명시합니다. 기존 특수 작업 승인·클라우드 제한은 유지합니다.

## 네이버 블로그 에이전트 — 결과 버튼 오른쪽 정렬·저장 버튼 강조 (2026-10-10, v1.58)

- 주인님 화면 요청에 따라 결과 카드의 상태 정보와 작업 버튼을 두 줄로 분리하고, 버튼 줄은 오른쪽 정렬·좁은 화면 줄바꿈으로 변경했습니다. 「보관함 저장」은 파란 배경·흰 글자·키보드 초점 표시로 강조했습니다.
- 코드 커밋 `f0a28a61`·푸시·프로덕션 READY 배포 완료(`dpl_DRp7F8eSpP2XTLR1XUUopdUNS8tr`). 빌드 통과·변경 화면 ESLint 오류 0/경고 25. 실제 로그인 Chrome의 새 탭에서 저장된 원고를 열어 v1.58·오른쪽 정렬·파란 저장 버튼·흰 글자를 확인했습니다. 프로그램/패키지/확장/라이브 ZIP/DB v1.58 일치, 확장 검증 실패 0·경고 0. 라이브 https://naver-blog-agent.vercel.app . 배포 시 `--scope buylife` 명시. 상세는 해당 프로그램 `AGENTS.md`.
- 앞선 점검의 별도 후속 작업: 개별 이미지 추가/제거 자동 저장 누락, 저장 결과와 무관한 자동 저장 배지, 초기 임시 ID→서버 UUID 전환 중 중복 원고 생성 가능성. 이번 UI 변경에서 저장·발행 동작은 수정하지 않았습니다. 주인님이 수동 저장한 해당 원고의 이미지 URL 4개는 서버 반영 확인 완료.

## 보안 마무리 — BLOG RLS 적용·v1.39 운영 배포 완료 (2026-10-10)

- BLOG 글 GET/PUT/DELETE의 로그인·이용 권한·본인 필터·no-store, 소유자 없는 글 접근 차단, 상세 화면 서버 게이트·인증 없는 SDK 조회 제거, 관리자 카테고리 API, 서버 키 공개 키 폴백 제거. 코드 커밋 `01bb999f`·푸시·프로덕션 배포 완료, 운영 DB·확장·라이브 ZIP v1.38 일치(검증 실패/경고 0). 최종 빌드·타입·39개 검사 통과, 신규 린트 오류 0건(기존 7건·경고 3건). 운영 API 비로그인 401+no-store+캐시 MISS, 상세 화면 307 확인. Google Fonts 네트워크 실패는 저장소 로컬 Geist 글꼴로 해결.
- **주인님 승인 후 운영 RLS 적용 완료**: `ai-auto-blog/supabase/migrations/20261009164750_blog_personal_access_hardening.sql`. 7개 테이블 익명/PUBLIC 권한 제거·본인 행/본인 글 연결만 허용·관리자만 공통 분류 변경·댓글/좋아요 쓰기 차단. authenticated TRUNCATE/REFERENCES/TRIGGER도 회수. 게시글 20(미귀속 7)·작성자 11·글감 60·분류 10·연결 16·댓글/좋아요 0, 전체 행 지문 7곳 일치. DB 역할 검증 27개·REST 익명 401 차단 7곳 통과. v1.39 코드 커밋 `d0e014b5`·푸시·운영 배포 완료, DB/확장/라이브 ZIP v1.39 일치(검증 실패·경고 0). 운영 API 401+no-store+캐시 MISS, 상세 페이지 307 확인. 버전 마이그레이션 `20261009165944_blog_bump_version_v1_39.sql`.
- Vercel 메타데이터 점검: 32개 중 서버 키 있는 29개, 28개는 변수 변경 이후 READY production. **타로만 최신 배포가 키 변경보다 앞섬**, 재배포는 도구 승인 정책 never로 거부. 키 값을 열지 않았으므로 실제 키 일치·회원 동작 검수를 증명한 것은 아님. 옛 키 폐기는 타로 재배포·회원 검수 이후 승인받아 진행.
- 루트 `scripts/audit-supabase-key-rotation.mjs`: 추적 텍스트 2,889개에서 패턴상 내장 서비스 키 없음, 로컬 설정 18개에 알려진 옛 키 없음. 새 키 임시 파일은 저장소 밖에 아직 존재. Supabase는 ACTIVE_HEALTHY이나 브라우저 ENOMEM으로 사용량 경고·폐기 상태 확인 못 함.
- **미완료**: 실제 BLOG 회원 화면 검수, 타로 재배포·회원 동작 검수, 옛 키 폐기·임시 키 파일 삭제, Supabase 사용량 화면 확인. 브라우저 복구·루트 시험 계정 실제 로그인 성공. BLOG 자체 저장된 정보 자동 입력이 없어 주인님께 로그인 확인 요청. 라이브 https://ai-auto-blog-one.vercel.app . 자세한 재개 절차: `ai-auto-blog/docs/SECURITY_REVIEW_2026-10-10.md`.

## Threads 콘텐츠 운영 자동화 — 쿠팡 키 없는 상품 직접 등록 (2026-10-10, v1.92)

- 쇼핑제휴 `/products` 참고 기능을 이식: 쿠팡 검색 아래 5단계 안내·HTML/링크 붙여넣기·상품명/사진 자동 채움·수정·메모·**상품 등록**. 이전 쿠팡 링크 폼 통합, 네이버 직접 등록 버튼명도 상품 등록. 직접 등록은 쿠팡 API·키 사용 없음.
- 서버 재검사·본인 계정·중복·한도 유지, 쿠팡 CDN만 제한해 배너 사진 추출(순수 JS jpeg-js), 사진 실패 시 상품 저장 유지+경고. 기존 본인 첨부 경로에 저장해 30일 정리 정책 유지. DB 스키마 변경 없음.
- 빌드·28개 검수 통과, 신규 타입/린트 오류 없음(기존 타입 4건·img 경고 유지). 상세: `threads-content-ops/AGENTS.md` v1.92. 서비스: https://www.buylife.xyz/threads-content-ops?tab=sources.

## Threads 콘텐츠 운영 자동화 — 설정 저장 버튼 글자 대비 (2026-10-10, v1.91)

- `WebSetup`의 공통 API 키·앱 정보 저장 버튼도 `text-white` 덮어쓰기 때문에 글자가 검게 표시됐습니다. 명시적 흰 글자로 고치고 비활성 상태는 회색 배경·진한 회색 글자로 표시합니다. 키보드 초점·마우스 올림 표시도 추가했습니다. 저장 기능·키·계정 연결 변경 없음. 변경 파일 린트 오류 0건.
- 버전 데이터만 변경(스키마 변경 없음). 상세: `threads-content-ops/AGENTS.md` v1.91. 서비스: https://www.buylife.xyz/threads-content-ops?tab=settings.

## Threads 콘텐츠 운영 자동화 — 카드 버튼 글자 대비·예시 디자인 (2026-10-09, v1.90)

- 실제 화면에서 새 버튼 글자가 안 보이는 원인은 밝은 화면의 `.text-white` 글자색 덮어쓰기였습니다. 페르소나 두 버튼·선택 배지를 `text-[#ffffff]`로 고정했습니다. 주인님 예시처럼 카드 간격·여백·제목·알약 배지, 선택 초록 배경/테두리/버튼, 미선택 파란 불러오기·검은 즉시 생성으로 맞췄습니다. 생성 동작은 v1.89 유지.
- v1.89 로그인 실제 화면에서 기본값 채워짐·전환 및 직접 수정한 주제·독자·경험의 유지 확인 완료. 유료 생성·외부 발행 시험 없음. 상세: `threads-content-ops/AGENTS.md` v1.90. 서비스: https://www.buylife.xyz/threads-content-ops?tab=create.

## Threads 콘텐츠 운영 자동화 — 페르소나 불러오기·수정 후 생성 (2026-10-09, v1.89)

- 여섯 카드의 왼쪽 불러오기·오른쪽 즉시 생성 버튼. 불러오면 아래 주제·시점/말투·독자 입력란을 채우고, 수정 후 **입력된 템플릿으로 글 생성하기**는 현재 입력·경험·상품·참고글을 사용합니다. 선택 카드 즉시 생성도 수정 값을 유지합니다. 불러오기는 AI 호출 없음, 새 선택 즉시 생성은 상태 갱신 전 값 방지, ref로 중복 클릭 방지.
- 서버 선택적 말투 입력, 기존 요청 기본값 호환. 모의 검사 19개·신규 린트/타입 오류 0건(기존 타입 4건·img 경고 1건). 실제 유료 AI 생성·외부 발행 시험은 수행하지 않았습니다. DB 스키마 변경 없음. 상세: `threads-content-ops/AGENTS.md` v1.89. 서비스: https://www.buylife.xyz/threads-content-ops?tab=create.
- 앞선 v1.88 배포 로그인 화면에서 완료 2건·대기 6건, 본문 수정 열기·취소 및 완료 필터·링크 확인 완료.

## Threads 콘텐츠 운영 자동화 — 수정·지금 발행·포스팅완료 (2026-10-09, v1.88)

- 별도 추가 요청 처리: 저장 왼쪽 수정 버튼·본문 편집·수정 취소, 지금 발행 이름·실제 Threads 발행 연결·진행 표시, 완료 글을 보관함에 유지(상태·시각·게시글 링크), 상단 포스팅완료 집계·상태 필터. 메인 대시보드에도 포스팅완료 표시. 집계는 회원별 전체 DB 기준, 보관함 목록은 최근 300건입니다.
- 저장 대상의 실제 갱신, 발행 조건부 상태 변경·동시 요청 중복 방지, 안전한 오류 반환을 추가했습니다. 외부 게시 성공 후 DB 기록 실패는 재발행 가능한 failed로 돌리지 않습니다. 모의 검수 16개·변경 파일 린트/타입 오류 0건. 실제 외부 포스팅 시험은 수행하지 않았습니다. 기존 범위 밖 타입 오류 4건 유지. DB 스키마 변경 없음, 코드·DB 버전 v1.88 동기화.
- 상세: `threads-content-ops/AGENTS.md` v1.88, 검수: `node --test threads-content-ops/tests/draft-actions.test.cjs`. 서비스: https://www.buylife.xyz/threads-content-ops?tab=manage.

## Threads 콘텐츠 운영 자동화 — 미분류 기본 카테고리 (2026-10-09, v1.87)

- 글감 수집(`?tab=viral`)·보관함에 미분류 칩을 0건이어도 항상 표시하고, 공통 카테고리 관리 창에 삭제·이름 변경할 수 없는 기본 항목과 건수를 추가했습니다. 카테고리 미선택 콘텐츠는 기존 `category_id = null` 저장 규칙에 따라 자동으로 포함됩니다. 기존 미분류 콘텐츠도 바로 표시됩니다.
- 루트 빌드 성공, 변경 파일 ESLint 오류 0건(기존 img 경고 1건), 변경 파일 타입 오류 0건. 기존 범위 밖 타입 오류 4건은 유지. 배포 전 로그인 화면에서 미분류 글감 5건 확인. DB 스키마 변경 없음, 코드·DB 버전 v1.87 동기화 및 재조회 완료.
- 위치: `ViralCollector.tsx`, `DraftComposer.tsx`, `ViralCategoryManager.tsx`, `web-actions.ts`. 버전 동기화 스크립트: `threads-content-ops/scripts/sync-program-version.mjs`. 상세: `threads-content-ops/AGENTS.md` v1.87. 서비스: https://www.buylife.xyz/threads-content-ops?tab=viral.

## 최상위 규칙(본인 계정·본인 API) 이행 (2026-10-09) — 4건 처리 완료, 로그인 후 확인 대기

- 처리: `shots` v1.04(운영자 AI 키 폴백 삭제), `threads-affiliate-poster` v1.49(네이버 트렌드·검색을 회원 본인 키로), `insta_auto_poster` v1.04(Facebook 연결도 회원 본인 Meta 앱), `real_estate_sales` v1.05(공공데이터 키 선택 등록, 없으면 공용 키 — 무료 키 예외), `blog_auto_poster`(운영자 전용 도구로 표기). 메인 지침 맨 위에 최상위 규칙, 맨 아래에 무료 키 예외 조항(계정당 한도가 있으면 본인 키) 추가.
- 환경변수 점검: 33개 Vercel 프로젝트에서 운영자 AI 키 없음 확인(남은 것은 redirect URI·모델명·플랫폼 자체 SMTP/Payapp·승인된 공공데이터 키뿐).
- 남은 일: ① 4개 프로그램의 로그인 후 실제 동작을 `buylifemall@naver.com`으로 확인 ② 인스타 연결 방식 변경(본인 Meta 앱 필요) 회원 공지 ③ Supabase 새 키로 앱들이 정상 동작하는지 확인 후 옛 키 `aimaster` 폐기·키 파일 삭제 ④ Supabase "EXCEEDING USAGE LIMITS"(2026-10-20 제한) 화면 확인.

## 크롬 확장 운영 규칙 신설 (2026-10-09, 모든 CLI 공통)

- 루트 `CLAUDE.md` 핵심 원칙 10번 / `AGENTS.md` 11번: 프로그램 업데이트 시 `extension/` 폴더·다운로드 ZIP·DB 버전을 같은 작업에서 함께 갱신하고 배포 후 ZIP 안 `version_name`까지 검증. 설치된 확장은 자동 갱신되지 않으므로 보고에 재설치 안내 포함. `programs.extension_download_url`/`extension_version` 칸을 추가하고 확장이 있는 5개 프로그램 값을 모두 채움(`naver-blog-agent/supabase/migrations/0051`, 나머지 4개는 SQL로 입력). 상세 규칙·프로그램별 주소: `docs/EXTENSION_RELEASE_RULES.md`, 검증: `node scripts/check-extension-release.mjs`(5개 OK, `naver-blog-auto-poster-web`만 manifest `version_name` 없어 WARN). 메인 사이트 프로그램 상세 다운로드 버튼은 2026-10-09 구현됨.

## 네이버 블로그 에이전트 — 보관함(/queue) 콘텐츠가 안 보이던 건 (2026-10-09, 복구 완료)

- 원인: v1.49가 `nba_posts`를 만들면서 `/api/posts`가 SEO 스튜디오 테이블 폴백에서 새 테이블로 바뀜. 그동안 보관함에 보이던 53건은 `buylifemall@naver.com`의 SEO 스튜디오 원고였다(원본 그대로 있음). 주인님 승인 후 `naver-blog-agent/supabase/migrations/0053_import_seo_drafts_to_nba_posts.sql`로 53건을 `nba_posts`에 복사 완료(원본 유지, `research_summary.imported_from`으로 구분, 상태는 draft, 블로그 ID는 임시값 `myblog_sample`). 자세한 내용은 `docs/ERROR_LESSONS.md` 최상단.

## 네이버 블로그 자동화(Web) 확장 (naver-blog-auto-poster-web v1.02, 2026-10-09) — 버전 정렬 + 새 버전 배너

- manifest `version_name: v1.02`/`version: 1.2.0`, 루트 `whoami`가 `latestVersion`/`downloadUrl` 반환(`lib/naverBlogAutoPosterWebExtension.ts`), 사이드패널 배너, `npm run test:poster-web-update`. GitHub 릴리스 ZIP(고정 파일명 `…Extension-0.1.0.zip`) 교체 후 재다운로드 해시 일치 확인. DB `programs.version` v1.01→v1.02, `extension_version` v1.02. 폴더 `AGENTS.md` §9-1 참고.

## 네이버 블로그 SEO 스튜디오 (naver-blog-seo-studio v1.60, 2026-10-09) — 확장 새 버전 배너

- `whoami`에 `latestVersion`/`downloadUrl` 추가, 사이드패널에 "새 버전이 나왔습니다" 배너(더 높을 때만, 우리 사이트 `/downloads/` 주소만 허용), `npm run test:update-banner`. 배포 전 `npm run extension:archive`로 ZIP을 직접 만들어야 함(prebuild 아님). DB `version`/`extension_version`/`extension_download_url` v1.60으로 갱신, `check-extension-release.mjs` OK.

## 플랫폼 메일 발송 안전장치 (2026-10-09) — 운영자 Gmail 한도 보호

- 루트 `lib/email/sender.ts`(가입 환영·결제·문의·만료 알림, 운영자 SMTP)에 안전장치 추가: `lib/email/guard.ts`(판단 규칙·오류 분류), `lib/email/guardStore.ts`(기록 표 `platform_email_log` 읽기·쓰기, 마이그레이션 `supabase/migrations/0020_platform_email_log.sql`, 운영 DB 적용 완료). ① Gmail 한도·인증 오류(421·450·452·454·535, 5.4.5, 429 등)가 나면 **30분간 모든 발송 중단**(재시도 없음) ② 같은 수신자·종류·제목은 **10분 안에 중복 발송 안 함** ③ 수신자별 하루 상한(환영 1·접수확인 3·결제/만료 5·관리자 문의 20)과 하루 전체 상한 **300통**(환경변수 `EMAIL_DAILY_LIMIT`로 변경) ④ 기록 표를 못 읽어도 메일은 평소처럼 나감 ⑤ 기록은 30일만 보관(매일 만료 알림 크론이 정리). 공개 API `POST /api/support`에 이메일 형식·길이 검사 추가. 테스트 `npm run test:email-guard`.
- 범위: **루트 운영자 SMTP만** 해당. 회원이 등록한 SMTP를 쓰는 서브 프로그램(`stepmail` 등)은 회원 본인 계정이라 이번에 손대지 않음. Make 시나리오(저장소 밖)는 Make에서 직접 수정해야 함.

## Gmail 호출 점검 (2026-10-09) — 프로그램 중 Gmail을 계속 호출하는 곳은 없음

- 저장소 전체: Gmail API·IMAP으로 메일을 읽거나 폴링하는 코드는 **없다**. 메일은 모두 SMTP로 "보낼 때만" 연결한다. 발송 코드: 루트(`lib/email/sender.ts` — 가입 환영·결제·문의·만료 알림, 운영자 SMTP), `stepmail`(예약 발송), `booking-reminder`(15분 크론이지만 대상이 있을 때만 SMTP 연결), `crm-google-form`(하루 1회 팔로우업), `kakao_auto_poster`(예약 리포트 알림·카카오 실패 대체), `trending-product-finder`(변동 감지 시에만). 회원이 등록한 SMTP(본인 Gmail 포함)를 쓰므로 운영자 Gmail 한도와 무관(최상위 규칙 유지).
- 최근 24시간 실제 발송: stepmail 0건(마지막 2026-10-03, 누적 50), booking 0, crm 0. 운영자 Gmail(`buylifemall@gmail.com`)을 SMTP로 등록한 스텝메일 캠페인은 0개. 가입 30명/7일, 결제·만료 알림 0건이라 플랫폼 메일량도 하루 한 자릿수.
- **Make 계정(BUYLIFE, 시나리오 500개)**: Gmail 모듈을 쓰는 시나리오 16개 중 자동 실행은 2개. 실제로 도는 것은 **`01🟢공구신청접수|Webhook>GSheet>Gmail 확인메일`(id 4965923, 2026-10-09 03:00 UTC 생성)** 하나 — 웹훅 → 구글시트 한 줄 추가 → Gmail 확인메일 → 시트 상태 갱신. 오늘 03:01~03:38 UTC에 9번 실행되어 **8번이 Gmail `[429] User-rate limit exceeded`(Retry after 약 +15분)로 실패, 마지막 1번만 성공**. 재시도할 때마다 대기 시각이 뒤로 밀렸다(03:16→03:48). 첫 실행부터 제한 상태였던 점은 이 계정의 다른 Gmail 사용(Make 연결 `4875841`을 쓰는 곳, 개인 사용 등)을 Google 계정 활동 기록에서 확인해야 알 수 있다.
- **주의(위험)**: 위 시나리오의 웹훅 주소를 아는 사람은 누구나 `email` 값을 넣어 **운영자 Gmail로 임의 주소에 메일을 보낼 수 있다**(스팸 중계·한도 소진·계정 정지 위험). 인증값(비밀 토큰 검사) 또는 수신자 제한이 필요하다. 시나리오는 저장소 밖(Make)에 있어 코드로는 못 고치고 주인님이 Make에서 수정해야 한다.
- **Make 추가 점검(2026-10-09, 500개 한도 보완)**: Gmail 전용 연결(`BUYLIFE's Gmail connection` id 4875841, 오늘 생성)을 쓰는 시나리오는 3개뿐(`공구신청접수` 웹훅 방식·활성, `ChatGPT | 고객 문의 자동접수`·`검증 | 고객문의 …` 비활성), 모두 오늘 만든 것. 구형 연결(`Google Restricted` id 4266804, 389개 시나리오 연결)로 Gmail 모듈을 쓰는 것을 `#Email` 폴더(17개)와 이름에 메일·신청·문의가 들어간 시나리오로 확인한 결과 **현재 활성이면서 주기적으로 Gmail을 호출하는 시나리오는 없다**. 단 **켜면 Gmail을 10~15분마다 호출하게 설계된 비활성 시나리오가 다수 있다**(켜지 말 것 / 안 쓰면 삭제): `3976480 Gmail 특정 메일 자동으로 라벨 추가하기`(15분마다 새 메일 확인), `3353598 Gmail>첨부파일>GDrive`(15분), `3266885 환영메세지|배열사용`(15분), `2572939 잠재고객 모집+관리(N)`(10분, 시간대 제한), `2567944 잠재고객에게 리마인드 메일보내기`(30분), `3319546 이메일관리 자동화`·`3376158`·`3353544`(15분, IMAP), `3978778 11🟢이메일 자동분류`(매일 09:00, IMAP·오류 상태), `2859419`(Airtable 10분)·`3362046`(Airtable 15분). 활성 중인 Gmail 관련 시나리오는 `4965923`(웹훅)과 `4724757`(구글폼 응답 시 발송, on-demand)뿐. 못 본 범위: 첫 500개와 위 폴더 밖의 약 140개(구형 연결 사용, 이름에 메일 단서 없음, 대부분 이미지·블로그 자동화로 추정).

- **Make 전수 확인 완료(2026-10-09, 폴더별 조회)**: 전체 시나리오 1,301개 중 약 1,180개를 직접 확인(미확인 약 120개는 이미지·영상·음악 폴더 `$Image|*`·`%Shots|*`·`$LLM|*`·`#Suno` 등으로 이름에 메일 단서 없음). 결과 **켜져 있으면서 스스로(주기적으로) 실행되는 시나리오 183개는 웹훅(immediately) 181개와 15분 간격 2개(이미지·인스타)뿐이고, Gmail/IMAP을 호출하는 것은 없다.** 메일을 보내는 활성 시나리오는 웹훅 `4965923`과 수동(on-demand) 실행용(`Stepmail` 2종, `@GoogleForm…`, `@GSheet(고객DB)>Gmail발송`, `@노트북 LM 팟캐스트`, `13🟢📰…Naver(email)` 등)뿐이다. **꺼져 있지만 켜면 주기적으로 메일 서버를 호출하는 시나리오**(추가 목록): `T_IL` 폴더의 `6. 특정 키워드 이메일 라벨 붙이기`(Gmail 새 메일 확인 15분)·`7. Email 내용 AI로 요약 후 Slack 알림`(IMAP 15분)·`고객 문의 내용 AI로 요약본 받기`(15분), `Study` 폴더의 `나의 셀프다이어리 만들기`·`고양이`·`팀원들 응원 메세지 보내기`·`고양이 정보 저장하기`(15분마다 Gmail 발송), `WORK`의 `My Diary`(매일 09:00 Gmail 발송). 이전 항목의 `#Email` 폴더 목록과 함께 **켜지 말 것**.
- **Make 정리(2026-10-09, 주인님 지시 "테스트용이었다")**: 웹훅 시나리오 `공구신청접수`(4965923)와 꺼진 Gmail·메일 폴링 시나리오 18개를 삭제함(`#Email`·`#CRM`·`T_IL`·`Study` 폴더 등). **삭제하지 못하고 남은 2개**(자동 권한 검사가 거부, 둘 다 꺼진 상태라 호출 없음): `3259487 고양이`(Study), `3266378 My Diary`(WORK, 매일 09:00 Gmail 발송 설정) — 주인님이 Make에서 직접 삭제하거나 허용 후 재시도. 오늘 만든 테스트 시나리오 `4965940`(ChatGPT | 고객 문의 자동접수)·`4965949`(검증 | 고객문의 …)는 요청 범위 밖이라 그대로 둠(둘 다 꺼짐).
- 못 확인한 것: Supabase Auth 메일(가입 확인·비밀번호 재설정)의 SMTP 설정(대시보드 값), 루트 Vercel `SMTP_HOST` 실제 값(민감값이라 안 보임, 로컬 `.env.local`은 `smtp.gmail.com`).

## 메인 사이트 프로그램 상세 — 확장 다운로드 버튼 (2026-10-09)

- `app/(main)/programs/[slug]/page.tsx`가 `programs.extension_download_url`/`extension_version`을 읽어 이용 권한이 있는 회원에게만 "크롬 확장 ZIP 다운로드"(설치 방법 안내 포함)를 보여줌. 주소는 https일 때만. 확장 배포 때 DB 칸 갱신이 곧 버튼 갱신(`docs/EXTENSION_RELEASE_RULES.md`).

## 전체 소유권·권한 점검 (2026-10-09) — ai-image-studio access는 v1.06 수정, 박힌 서비스 키는 주인님 조치 대기

- `ai-image-studio` v1.06: 게스트 우회·항상 허용·타인 키 폴백 제거, 로그인 필수, 공용 프롬프트 쓰기는 관리자만(`buylifemall@gmail.com`). **남은 문제**: 같은 폴더 `lib/supabase/server.ts`에 관리자 서비스 키가 base64로 박혀 있고 Vercel에 환경변수가 없음 — 새 키 발급 → Vercel 등록 → 코드에서 삭제 → 기존 키 폐기 순서로 처리(`docs/ERROR_LESSONS.md` 최상단). 나머지 upsert/update/delete 점검은 이상 없음.

## 네이버 블로그 에이전트 — 실제 Chrome 시험 발행 성공 (2026-10-09, v1.52)

- 확장 연결 → 비공개 시험 발행 → 웹 `published`/`post_url` 반영까지 실제로 확인(DB 조회). 미검증: 전체공개·이미지 포함·예약·연속 발행. 53건 블로그 ID는 `buylifemall`로 교체 완료(`0057`, 이미지 0개). 남은 일: 메인 사이트 상세 다운로드 버튼, "수집소" 표기 정리는 v1.56에서 완료. 상세: `naver-blog-agent/AGENTS.md`.

## 네이버 블로그 에이전트 (naver-blog-agent v1.51, 2026-10-09) — 발행 공개 범위(기본 비공개)

- 발행 공개 범위 선택 구현: `nba_posts.publish_visibility`(`0054`), `/queue` 상단 선택(기본 비공개), 서버 페이로드는 `public`일 때만 전체공개. 확장 예약 확인 기본값도 비공개로 바꿔 ZIP v1.51 재생성(회원은 ZIP 재설치 필요). 실제 네이버 비공개 시험 발행은 Chrome 확인 대기. 상세: `naver-blog-agent/AGENTS.md` v1.51, `docs/ERROR_LESSONS.md` 최상단.

## 네이버 블로그 에이전트 (naver-blog-agent v1.50, 2026-10-09) — 확장 새 버전 알림

- `GET /api/extension/version` + 확장 `checkUpdate`(6시간마다·시작/설치 시) + 팝업 배너 + 아이콘 `NEW`. 알림이 들어간 확장은 회원이 한 번 직접 재설치해야 함. DB 갱신 SQL에 `extension_version`/`extension_download_url` 포함. 이식 방법: `naver-blog-agent/docs/CONTINUATION.md` v1.50. ※ 2026-10-09 정정: `ai-auto-blog`는 이미 배너가 있었고 `tistory-auto-blog`는 문구만 있었음. `naver-blog-seo-studio`는 v1.60에 추가 완료. 현황표는 `docs/EXTENSION_RELEASE_RULES.md`. `naver-blog-auto-poster-web`도 v1.02, `tistory-auto-blog`도 v1.54(배너)에 추가 완료 — 확장 5개 모두 알림 있음.

## 네이버 블로그 에이전트 (naver-blog-agent v1.49, 2026-10-09) — 회원별 DB 이관

- 계정·콘텐츠 분류를 회원별 DB로 이관(서버 기준, 브라우저는 캐시). **프로덕션 DB에 `nba_*` 핵심 테이블이 없던 것을 발견해 생성**(`0049`). 정리 크론이 SEO 스튜디오 원고 테이블을 지우던 코드 제거. **`CRON_SECRET`은 2026-10-09 주인님이 직접 등록(Production, Sensitive)하고 재배포함. 남은 일: 첫 크론(매일 18:00 UTC) 200 응답을 Vercel 로그로 확인, 실제 Chrome·발행 시험.**

## 네이버 블로그 에이전트 (naver-blog-agent v1.48, 2026-10-09) — ESLint · CRON_SECRET 점검

- `eslint.config.mjs` 추가, `npm run lint` 오류 0건(경고 163건 기준선). **프로덕션에 `CRON_SECRET` 없음 → 30일 자동 삭제 크론이 401로만 끝남. 환경변수 추가 승인 대기.** 남은 일: 6번(회원별 DB 이관, 스키마 승인).

## 네이버 블로그 에이전트 (naver-blog-agent v1.47, 2026-10-09) — 연도 정책

- 올해(생성 시점) 기준. 제목·태그 등은 과거 연도 전부 올해로, 본문은 과거 사실 보존(`src/lib/yearPolicy.ts`, `npm run test:years`). 남은 일: 6번(회원별 DB 이관, 스키마 승인), 7번(ESLint·CRON_SECRET).

## 네이버 블로그 에이전트 (naver-blog-agent v1.46, 2026-10-09) — Reviewer 보강

- 본문 전체 검수, 글자수 코드 판정, 파싱 실패≠PASS(`UNKNOWN`). 다음은 5번 연도 치환(올해 기준, v1.47).

## 네이버 블로그 에이전트 (naver-blog-agent v1.45, 2026-10-09) — Writer 입력 보강

- Writer에 주제·키워드·발행 목적을 직접 전달, 페르소나 즉시 생성 시 이전 주제가 섞이던 문제 수정. 다음은 4번(Reviewer, v1.46).

## 네이버 블로그 에이전트 (naver-blog-agent v1.44, 2026-10-09) — 모델 매핑 정직화

- 선택한 AI 모델 ID를 그대로 호출(`src/lib/ai/models.ts`). 옛 모델로 몰래 치환하던 매핑 삭제, `npm run test:models` 추가. 연도 정책은 "글 생성 시점의 올해"로 결정(5번, 미구현). 다음은 3번(v1.45).

## 네이버 블로그 에이전트 (naver-blog-agent v1.43, 2026-10-08) — 확장 ↔ 웹 큐 연결

- 확장이 데스크톱 로컬 브리지 대신 웹 `/api/extension/*`(auth·task·status·finish)로 동작합니다. 블로그 ID는 확장 팝업에서 입력합니다(연결 시 같은 `blog_id`의 대기 글만 가져옴). 티스토리 코드·권한과 `127.0.0.1` 권한을 제거했습니다.
- 원고 변환: 번호형 이미지 자리표시자, HTML 원고 변환, 콘텐츠 분류는 네이버 카테고리로 넘기지 않음. 상세는 `naver-blog-agent/docs/CONTINUATION.md` 최상단.
- 검수: `npm run test:extension` 포함 5개 테스트·빌드 통과. **실제 Chrome 설치·페어링·네이버 발행은 미검수**(승인 필요). 남은 과제 2번(모델 매핑 정직화)부터 이어갑니다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.48, 2026-10-08)

- **상품 관리의 "상품·상세페이지 분석으로 등록" 기능 삭제(주인님 지시)**: `/products`는 링크·검색 등록만 남았다. 모드 토글, 4개 플랫폼 폼의 analyze 분기, 사용방법/가이드의 분석 안내를 제거했다.
- 서버 코드(`analyzeProductImagesAction`, `productAnalyzer.ts`, `detailPages.ts`)와 `EnrichmentFields.tsx`는 미사용 상태로 남겨뒀다(기존 manual 상품의 상세 발췌 반영 유지). 완전 삭제는 주인님 승인 후. 상세는 `threads-affiliate-poster/AGENTS.md` 34번.
- `programs.version`·`version.ts`는 `v1.48`, SQL은 `threads-affiliate-poster/supabase/migrations/0008_bump_version_v1_48.sql`.

## Threads AI 기획기 (threads-easy-planner v1.41, 2026-10-08)

- **상황별 페르소나 원클릭 생성에 `🌿 고부간 갈등 공감형`을 추가했다.** 키워드가 비어 있어도 명절·시댁 문화·육아 방식의 차이 속에서 내 감정과 경계를 지키는 대표 소재로 바로 생성한다.
- 생성 프롬프트는 특정 가족의 악마화, 폭로성 서사, 갈등 조장을 금지하고, 각자의 경계를 존중하는 현실적인 1인칭 공감 썰만 만들도록 제한했다. 사용 매뉴얼에도 새 카드를 반영했다.
- `src/lib/version.ts`와 `programs.version`은 `v1.41`로 동기화한다. SQL은 `threads-easy-planner/supabase/migrations/0011_tep_bump_version_v1_41.sql`.
- **다음 CLI 재개 문서:** `threads-easy-planner/docs/CONTINUATION.md`를 새로 만들었다. 다음 작업자는 이 문서와 해당 폴더 `AGENTS.md`를 먼저 읽고, `threads-easy-planner/`만 명시적으로 스테이징한다.

## 네이버 블로그 에이전트 (naver-blog-agent v1.42, 2026-10-08)

### 최종 마감 — 다른 CLI 재개 문서 보강

- `naver-blog-agent/docs/CONTINUATION.md` 맨 위에 v1.29~v1.42 작업 순서/기능 커밋, 최종 UI/데이터 연결, 실제 검수 결과와 한계, 주의사항·남은 과제·재개 명령을 모았습니다. 프로젝트 AGENTS/README 및 루트 PROGRESS를 최신 요약과 연결했습니다.
- 기능은 v1.42 그대로입니다. 최신 기능 커밋 `0db81a1d`는 origin/master 푸시·프로덕션 READY 확인 완료입니다. 문서만 보강한 커밋 후 같은 버전을 재배포하며 다른 CLI 파일은 보존합니다.
- v1.42 로컬 4개 테스트/빌드 통과, 로그인 운영 화면에서 버튼 파란색/선택 초록색 및 조건 적용 확인 후 원래 선택 복구. ZIP 200, 비로그인 루트 307, 배포 error 로그 없음. 유료 AI 생성·회원 데이터 삭제·실제 네이버 발행은 실행하지 않았습니다.
- **우선 남은 과제:** `src/lib/ai/models.ts`의 선택 모델→구형 모델 치환, `extension/background.js`의 `127.0.0.1:46321` 의존/웹 큐 실제 연결. Writer 원본 입력 직접 전달·Reviewer 전체 본문/실패 판정·글자수 및 회원별 계정/분류 이관은 별도 범위입니다. 이번 문서 마감에서 코드는 변경하지 않습니다.

### 후속 v1.42 — 페르소나 조건 불러오기 버튼 색상/선택 상태

- 미선택은 파란색 실제 버튼, 선택 항목은 초록색 `✓ 선택됨`입니다. 기존 조건 적용/카드 선택/즉시 생성 핸들러는 유지하며 조건 버튼만으로 생성/발행하지 않습니다.
- `type="button"`, 클릭 전파 차단, `aria-pressed`, 키보드 포커스 표시 및 생성 중 잠금. `test:personas`에서 6개 항목 실제 JSX/조건 핸들러의 색상 전환·조건 적용·중복 호출 방지를 모의 검수합니다. 기존 테스트/빌드 및 소스/확장/DB 표시 버전 v1.42 동기화.

### 후속 v1.41 — 카테고리 아래 설명 삭제로 기획 폼 행 높이 정리

- 공유 분류 안내·현재 기획 카테고리 문구와 도움말 블록/여백을 제거했습니다. 삭제된 블록을 참조하던 `aria-describedby`도 제거했습니다. 기존 값·공유 분류 관리·2열 배치는 유지합니다.
- 카테고리 테스트에 설명/블록/잔존 참조 부재 검사를 추가했습니다. 카테고리/메뉴/문체 테스트 및 빌드로 검수합니다. 소스/패키지/확장/DB 표시 버전 v1.41이며 회원 데이터·유료 생성은 변경하지 않습니다.

### 후속 v1.40 — 불필요한 계정·카테고리 메뉴/화면 제거

- 사이드바 `계정·카테고리 관리` 및 대시보드의 같은 작업 카드를 제거했습니다. 핵심 흐름은 수집/생성/보관함 1~3, 계정 연결은 `/settings`입니다. 관련 링크/사용 매뉴얼도 갱신했습니다.
- `/accounts`에는 설정 화면 리다이렉트만 남겼으며 계정 부분을 `NaverAccountManager`로 분리했습니다. 설정에서 라우트를 import하지 않습니다. 기존 계정·옛 메뉴·공유 콘텐츠 분류 데이터는 삭제/이관하지 않습니다.
- `test:navigation`(계정 실제 핸들러·기존 필드 보존·메뉴 제거·리다이렉트), 기존 카테고리/문체 테스트 및 빌드 통과. 실제 회원 데이터 삭제·유료 생성·발행 없음. 소스/패키지/확장/DB 표시 버전 v1.40.

### 후속 v1.39 — 블로그 ID·카테고리 / 주제·목적 2열 배치 (2026-10-08)

- 주인님 지정대로 첫 행은 블로그 ID 왼쪽·카테고리 선택/관리 오른쪽, 두 번째 행은 특정 주제 왼쪽·발행 목적/독자 타깃 오른쪽입니다. 키워드는 아래 전체 너비입니다. 입력 높이 40px 및 좁은 화면 세로 전환을 적용했습니다.
- 기존 입력값·카테고리 관리 모달·생성/저장 로직은 유지합니다. JSX 행/순서/높이/반응형 구조·기존 카테고리/문체 테스트·빌드 통과입니다.
- 인수인계·소스·패키지·확장 ZIP·DB 표시 버전 v1.39. 유료 생성·최종 발행은 실행하지 않습니다.

### 후속 v1.38 — 카테고리 관리 버튼 위치 및 기획 폼 정렬 (2026-10-08)

- 생성 화면 카테고리 선택 상자 바로 오른쪽에 관리 버튼을 배치했습니다. 두 입력 높이는 40px, 좁은 화면에서는 세로 배치합니다.
- 특정 주제는 아래 전체 너비 행, 검색 키워드·발행 목적 및 독자 타깃은 다음 행의 같은 2열 그리드로 정렬했습니다. 기존 값·관리 모달·제출 및 저장 로직은 그대로입니다.
- 카테고리 모의 테스트에 JSX 행/순서/반응형 구조 검사 추가, 문체 테스트·빌드 통과. 인수인계·소스·패키지·확장 ZIP·DB 표시 버전 v1.38. 유료 생성·최종 발행은 실행하지 않습니다.

### 후속 v1.37 — 생성 화면 직접 카테고리 관리 (2026-10-08)

- `카테고리 선택` 옆에 수집소와 같은 `카테고리 추가·수정·삭제 (순서 정렬)` 버튼을 추가했습니다. 세 화면에서 동일 `CategoryManagementModal`과 공유 저장 훅을 사용합니다.
- 생성 화면에서 선택 항목을 수정하면 ID 기준으로 이름을 따라가고 삭제하면 선택을 해제합니다. 기존 원고·글감 본문은 삭제하지 않으며 기존 기록 분류명 일괄 변경도 하지 않습니다. 브라우저 저장 방식과 데이터 출처는 v1.36 그대로입니다.
- 저장 실패 시 완료 처리 방지, 순서 변경 객체 불변성, 생성 폼과 모달 입력 폼 분리를 검수했습니다. 카테고리 실제 핸들러 모의 테스트·문체 테스트·빌드 통과. 소스·패키지·확장 ZIP·DB 표시 버전 v1.37. 유료 생성·최종 발행은 실행하지 않습니다.

### 후속 v1.36 — 사용자 콘텐츠 분류 상호 연동 및 이름 정정 (2026-10-08)

- 생성 폼의 이름은 주인님 요청대로 `카테고리 선택`입니다. 보관함(`/queue`)·수집소(`/collector`)에서 등록한 `nba_collector_categories`를 읽습니다. v1.35의 계정별 네이버 메뉴 연결은 잘못 해석한 구현으로 교체했습니다.
- `contentCategories.ts`·`useContentCategories.ts`를 세 화면이 공통 사용합니다. 추가·수정·삭제·정렬 결과를 같은 목록으로 읽고 다른 탭 변경/창 활성화도 반영합니다. 생성 결과 편집기도 같은 목록입니다. 계정·페르소나를 바꿔도 분류를 유지하며 생성/원고 저장 요청으로 전달합니다.
- `test:categories`, `test:writing-styles`, `npm run build` 통과. 유료 생성과 네이버 최종 발행은 실행하지 않습니다. 기존 브라우저 목록 재사용이며 회원별 DB 이관/다른 기기 동기화는 별도 과제입니다. 소스·패키지·확장 ZIP·DB 표시 버전 v1.36.

### 후속 v1.35 — 등록 카테고리 선택 상자 (2026-10-08)

> 아래 목록 출처는 잘못된 해석이었으며 v1.36에서 교체되었습니다. 현재 구현 기준으로 사용하지 마세요.

- 생성 폼의 카테고리 직접 입력칸을 현재 블로그 계정의 등록 목록 드롭다운으로 교체했습니다. 선택 시 등록된 키워드·발행 목적을 함께 불러오고, 빈 계정 전환 시 이전 계정의 값이 남지 않게 했습니다. 주제·말끝·문체는 유지합니다.
- 데이터 출처는 기존 `/accounts`의 브라우저 저장 `nba_accounts_local`입니다. 회원별 서버 동기화는 이번 UI 변경에 포함하지 않았습니다. 수집소/보관함 분류 목록과도 구분합니다.
- `npm run test:categories`는 실제 TSX 핸들러와 폼 전달을 모의 검수하며 유료 AI 호출이나 네이버 최종 발행은 하지 않습니다. 코드·패키지·확장 ZIP·DB 표시 버전은 v1.35로 맞춥니다.
- 세부 재개 지침·별도 후속 과제는 `naver-blog-agent/docs/CONTINUATION.md`에 남겼습니다. 다른 CLI의 Threads 작업은 수정하지 않습니다.

### 후속 v1.34 — 말끝·문체 확장 (2026-10-08)

- 생성 버튼 위 흰색 박스에서 말끝 4종과 문체 8종을 독립 선택하고 표현 예시를 확인합니다. 페르소나·계정·카테고리 변경 및 즉시 생성에서도 선택을 유지합니다.
- `naver-blog-agent/src/lib/ai/writingStyles.ts`는 선택지·검증·예시·안전 지침의 단일 기준입니다. 생성 API가 잘못된 선택을 400으로 거부하며 Writer/Humanizer/Reviewer가 동일한 회원 선택을 전달받습니다.
- `npm run test:writing-styles`: 32조합·기본값 호환·API 검증·권한 차단을 실제 유료 호출 없이 검사합니다. 실제 LLM 응답의 문체 품질 검수와 구분합니다.
- 기존 모델 기본값 저장 범위는 변경하지 않았습니다(모델·비율·장수만 저장). 말끝·문체 저장을 추가하려면 별도 요청과 DB 스키마 변경 승인부터 확인합니다. 자세한 기록은 프로젝트 `AGENTS.md`·`docs/CONTINUATION.md`입니다.

### 후속 v1.33 (2026-10-08)

- 글·이미지 모델 선택과 공통 저장 버튼을 생성 폼 바깥, 생성 시작 버튼 바로 아래의 흰색 독립 박스로 이동했다. 저장은 현재 두 모델의 설정 및 이미지 비율·장수만 반영하고 생성·발행을 실행하지 않는다.
- 저장 상태/변경 상태를 비교 표시하고, 저장된 값을 불러오는 동안 모델 변경과 생성 실행을 막아 값 덮어쓰기 경합을 방지했다. 저장 API와 `nba_generation_preferences` 테이블은 v1.32 구현을 그대로 재사용한다.
- 작업 기록·재개 기준은 `naver-blog-agent/AGENTS.md`, `README.md`, `docs/CONTINUATION.md`에 반영한다. 소스·확장·패키지·DB 버전 v1.33 동기화.

- **회원별 기본 생성 모델 저장 (v1.32)**:
  - 콘텐츠 생성 화면에서 선택한 GPT/Claude/Gemini 글 생성 모델과 NanoBanana/GPT Image/FLUX/Z-Image 모델·비율·장수를 `기본 모델 설정 저장`으로 한 번에 저장한다.
  - `nba_generation_preferences`는 `user_id` 단일 키 + owner-only RLS로 회원별로 격리했고, `/api/generation-preferences`는 프로그램 이용 권한과 등록된 모델 조합을 검증한다.
  - 다음 CLI는 `naver-blog-agent/AGENTS.md`, `docs/CONTINUATION.md`를 먼저 읽고 모델 레지스트리를 바꿀 때 저장 API 검증 규칙도 함께 갱신해야 한다.

## 네이버 블로그 에이전트 (naver-blog-agent v1.31, 2026-10-08)

- **계정·카테고리 관리 분리 (v1.31)**:
  - 네이버 블로그 계정 연결·추가·수정·삭제 UI는 `/settings`의 `API키등록·플랫폼연동`으로 이동했다.
  - `/accounts`는 카테고리·키워드 관리 전용으로 정리했으며, 여러 블로그 계정은 상단 드롭다운에서 선택한다.

- **사이드바 연결 메뉴 위치 조정 (v1.30)**:
  - `Sidebar.tsx`에서 `justify-between` 하단 고정을 제거했다. 4번 메뉴는 `계정·카테고리 관리`로 명확히 표기하며, API키등록·플랫폼연동, 연동 매뉴얼, 로그인 계정, 로그아웃은 그 바로 아래에 표시된다.

- **API·확장 이용 권한 검증 (v1.29)**:
  - 글감 수집·글/이미지 생성·이미지 업로드·원고 보관함·API 키·확장 페어링 API에 `checkProgramAccessApi()`를 적용했다. 인증 실패는 리다이렉트가 아닌 JSON 401/403으로 반환한다.
  - 확장 토큰은 발행 작업 수신과 결과 반영 전 `evaluateProgramAccessForUser()`로 토큰 소유자의 현재 권한을 다시 확인한다.
  - 다음 단계는 **수집 글감과 카테고리의 localStorage 의존을 회원별 Supabase DB로 전환**하는 일이다. 실제 테이블·RLS·기존 브라우저 데이터 이관 방안을 확인한 뒤 진행하며, 예시 데이터가 실제 수집 결과처럼 표시되지 않도록 빈 상태 UI로 교체한다.

- **좌측 사이드바(`Sidebar.tsx`) 번호형 작업 흐름(1~4) 및 API키등록·플랫폼연동 구분선 분리 표준 레이아웃 적용 (v1.28, 주인님 확정)**:
  - 배경: 주인님의 "이것 처럼 좌측 메뉴에 api키 등록 플랫폼 연동을 구분해줘" 요청 및 스크린샷(`orca-paste-1791431348408-988326c8-fb5d-4ec3-b51c-e2d896e68030.png`) 지시에 따라 `threads-content-ops` 및 `docs/SIDEBAR_LAYOUT_STANDARD.md` 표준 사이드바 정보 구조와 100% 동일하게 UI 개편.
  - 조치:
    1) **최상단 대시보드 (`/dashboard`)**: `LayoutDashboard` 아이콘과 함께 직관적인 진입점 배치.
    2) **핵심 작업 흐름 (번호 배지 1~4 & 세로 연결선)**:
       - 1: `🔥 떡상 콘텐츠 수집` (`/collector`, `Flame`)
       - 2: `✏️ 콘텐츠 생성` (`/`, `PenLine`)
       - 3: `↗️ 콘텐츠 보관함` (`/queue`, `Send`)
       - 4: `👥 계정 운영정보` (`/accounts`, `UsersRound`)
       - 활성 상태 시 브랜드 오렌지(`bg-amber-500 text-white`) 원형 번호 배지 및 `bg-amber-50 text-amber-900` 배경 하이라이트.
    3) **하단 구분선 및 연동/유틸리티 분리**:
       - `<hr>` 구분선(`border-t border-neutral-200`) 하단에 `🔑 API키등록·플랫폼연동`(`KeyRound`) 및 `📖 연동 & 사용 매뉴얼`(`BookOpen`) 배치.
       - 로그인 계정 이메일(`userEmail`) 및 `[-> 로그아웃`(`LogOut`) 버튼 통합.
  - `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0028_bump_version_v1_28.sql`을 `v1.28`로 동기화.
  - **다음 CLI 재개 문서:** `naver-blog-agent/docs/CONTINUATION.md`를 신설했다. 다음 작업자는 이 문서와 해당 폴더 `AGENTS.md`를 먼저 읽고, `naver-blog-agent/`만 명시적으로 스테이징하여 작업한다.

## 네이버 블로그 에이전트 (naver-blog-agent v1.27, 2026-10-08)

- **연동 & 실전 사용 매뉴얼(`/guide`) 전면 개편 및 최신 구현 기능 집대성 (v1.27, 주인님 확정)**:
  - 배경: 주인님의 "지금까지 구현내용을 바탕으로 연동 & 사용매뉴얼 내용을 수정보완해줘" 지시에 따라 v1.01 구버전 매뉴얼에서 v1.26까지 개발된 모든 최신 기능과 정책을 반영하여 전면 개정.
  - 조치:
    1) **핵심 안전성 안내 강화**: 실제 크롬 브라우저 세션 기반 인간 모사 타이핑(30~120ms 랜덤 딜레이), 17대 블로그 윤문(Humanizer), 2026년 당해 연도 3중 Safe-guard.
    2) **최초 1회 연동 준비 (A)**: 최신 v1.27 크롬 확장 ZIP 다운로드, 8자리 페어링 코드 연결, AI API 키 자동 연동 확인.
    3) **실전 4단계 워크플로우 (B)**:
       * 1단계: 🔥 떡상 글감 수집소 (실시간 트렌드, 뉴스 속보, URL 분석 + 카테고리 태깅 + 초록색 책갈피 보관함 영구 보호 + 원클릭 글 생성 연계).
       * 2단계: ✍️ 5단계 AI 글 생성 & 멀티 AI 이미지 스튜디오 (GPT-4o/Claude/Gemini 엔진 선택, 4대 이미지 모델 선택, 서버 DB 100% 자동 영구 저장).
       * 3단계: 📑 원고 보관함 & 스마트 에디터 원고 편집 (Tiptap 듀얼 위지윅/코드 에디터, PC 사진 드래그 첨부, ✨ AI 이미지 추가 생성, 카테고리별 탭 필터 및 일괄 이동).
       * 4단계: 🚀 크롬 확장의 스마트에디터 ONE 자동 타이핑 & 네이버 발행 (제목, 문단, 소제목, 줄바꿈, 이미지 삽입, 카테고리/태그 자동 세팅).
    4) **30일 보관 및 자동 삭제(Content Retention) 정책 안내 (C)**: D-xx 잔여 일수 배지, 글감 보관함 영구 보호 안내, 네이버 발행 글은 100% 영구 보존됨을 명시.
    5) **계정·카테고리 관리 & 운영 대시보드 활용 & FAQ 6종**: 다중 블로그 ID 등록, 발행 큐 대기열 활용법, 최근 원고 열기 퀵 복원, FAQ 전면 보강.
  - `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0027_bump_version_v1_27.sql`을 `v1.27`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.26, 2026-10-08)

- **사이드바 메뉴 순서 및 대시보드 퀵 액션 카드 순서 개편 — `👥 네이버 계정·카테고리` 메뉴를 `📑 생성 원고 보관함 & 발행 큐` 밑으로 재배치 (v1.26, 주인님 확정)**:
  - 배경: 주인님의 "네이버 계정,카테고리 메뉴를 생성 원고 밑으로 내려줘" 지시에 따라 작업 순서 흐름(대시보드 ➔ 글감 수집 ➔ 글 생성 ➔ 원고 보관/발행 ➔ 계정/카테고리 설정)에 맞춰 내비게이션 재정렬.
  - 조치:
    1) **사이드바 내비게이션 (`Sidebar.tsx`)**: `MENU_ITEMS` 배열에서 `href: "/accounts"` 항목을 `href: "/queue"`("📑 생성 원고 보관함 & 발행 큐") 뒤로 이동.
       - 개편된 사이드바 메뉴 순서: `📊 운영 대시보드` ➔ `🔥 글감 수집` ➔ `✍️ 블로그 글 자동 생성` ➔ `📑 생성 원고 보관함 & 발행 큐` ➔ `👥 네이버 계정·카테고리` ➔ `🔑 API키등록·플랫폼연동` ➔ `📖 연동 & 사용 매뉴얼`.
    2) **대시보드 원클릭 빠른 작업 카드 (`dashboard/page.tsx`)**: 작업 3번을 `📑 생성 원고 보관함 & 발행 큐`(`/queue`), 작업 4번을 `👥 계정 & 카테고리 관리`(`/accounts`)로 교체하여 사이드바와 1:1 완벽 동기화.
  - `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0026_bump_version_v1_26.sql`을 `v1.26`으로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.25, 2026-10-08)

- **생성 콘텐츠(글감, 본문 원고, 이미지) 30일 보관·자동 삭제 시스템 및 관련 공지 구축 (v1.25, 주인님 확정)**:
  - 배경: 주인님의 "항목은 글감, 본문, 이미지 등 생성된 콘텐츠 자동 삭제 기능이야. 다른 블로그쪽(ai-auto-blog) 어떻게 작업했는지 확인하고 진행해" 지시에 따라 `ai-auto-blog`의 30일 보관 표준 패턴을 그대로 이식.
  - 조치:
    1) **30일 보관 유틸리티 (`src/lib/retention.ts`)**: `RETENTION_DAYS = 30`, 잔여 일수 계산(`retentionDaysLeft`), 만료일 계산(`retentionDeleteAt`), 커트오프 판정(`retentionCutoff`).
    2) **공지 배너 컴포넌트 (`ContentRetentionNotice.tsx`)**: 원고 보관함(`/queue`), 글감 수집소(`/collector`), 메인 글 생성기(`/`)에 30일 자동 삭제 정책 및 보관함 영구 보호 안내 공지 배너 탑재.
    3) **항목별 잔여 일수 배지**: 원고 목록 및 글감 목록에 `🗓️ D-xx (xx일 후 자동삭제)` 배지 제공 (7일 이하 시 경고색 표시), 보관된 글감에는 `🛡️ 영구 보관 (삭제 보호)` 배지 표시.
    4) **서버측 자동 정리 Cron (`src/app/api/cron/cleanup/route.ts`) & Vercel Cron (`vercel.json`)**: 30일 경과 DB 원고 및 Storage 이미지 파일 매일 새벽 자동 정리.
  - `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0025_bump_version_v1_25.sql`을 `v1.25`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.24, 2026-10-08)

- **원고 보관함 & 발행 큐(`/queue`) 떡상 글감 수집소(`/collector`) 카테고리 연계 분류 및 관리 기능 추가 (v1.24, 주인님 확정)**:
  - 배경: 생성된 본문의 카테고리 분류 기능이 `🔥 떡상 글감 수집소`와 유기적으로 연계되어 일관성 있게 관리될 수 있도록 요청.
  - 조치:
    1) **카테고리 공유 & 필터 바**: `nba_collector_categories` 및 기본 카테고리를 공유하며, 보관함 상단에 카테고리별 원고 건수 배지 칩 탭 바와 `[⚙️ 카테고리 관리]` 모달 연동.
    2) **원고별 인라인 카테고리 변경**: 각 원고 목록 카드에서 카테고리 드롭다운을 통해 즉시 다른 카테고리로 변경 가능 (로컬 및 `/api/posts` PUT 자동 동기화).
    3) **체크박스 다중 선택 & 카테고리 일괄 이동 (Bulk Move)**: 여러 원고를 선택한 뒤 일괄 카테고리 이동, 일괄 발행 큐 등록, 일괄 삭제 지원.
    4) **스마트 에디터(`BlogSmartEditorModal`) 및 상세 뷰어 카테고리 연계**: 에디터와 상세 뷰어 내에서도 카테고리 수정 지원.
    5) **상호 내비게이션 강화**: 보관함 상단에 `[🔥 떡상 글감 수집소]` 바로가기 링크 배치.
  - `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0024_bump_version_v1_24.sql`을 `v1.24`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.23, 2026-10-08)

- **대시보드 원클릭 빠른 작업 네비게이션 순서 개편 — `🔥 떡상 글감 수집소` 좌측 최우선 배치 (v1.23, 주인님 확정)**:
  - 배경: 대시보드 메인 화면의 "원클릭 빠른 작업 시작" 카드 중 2번째에 위치하던 `🔥 떡상 글감 수집소` 카드를 맨 왼쪽(1번째)으로 이동하여, `글감 발굴` ➔ `글 생성`으로 이어지는 사용자의 작업 흐름과 사이드바 메뉴 순서에 일치하도록 개선.
  - 조치:
    1) `dashboard/page.tsx` 빠른 작업 그리드 1번을 `🔥 떡상 글감 수집소`, 2번을 `✍️ 블로그 글 자동 생성`으로 변경.
    2) `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0023_bump_version_v1_23.sql`을 `v1.23`으로 동기화.


## 네이버 블로그 에이전트 (naver-blog-agent v1.22, 2026-10-08)

- **사이드바 메뉴 순서 개편 — `📊 운영 대시보드` 메뉴 최상단 배치 (v1.22, 주인님 확정)**:
  - 배경: 주인님의 "운영 대시보드 메뉴를 맨위로 올려줘" 요청에 따라 사이드바 내비게이션 순서 개편.
  - 조치:
    1) `naver-blog-agent/src/components/layout/Sidebar.tsx`:
       - `MENU_ITEMS` 배열에서 `/dashboard`("📊 운영 대시보드") 항목을 첫 번째(최상단)로 이동.
       - 전체 메뉴 체계: `📊 운영 대시보드` ➔ `🔥 글감 수집` ➔ `✍️ 블로그 글 자동 생성` ➔ `👥 네이버 계정·카테고리` ➔ `📑 생성 원고 보관함 & 발행 큐` ➔ `🔑 API키등록·플랫폼연동` ➔ `📖 연동 & 사용 매뉴얼`.
    2) `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0022_bump_version_v1_22.sql`을 `v1.22`로 동기화.


## 네이버 블로그 에이전트 (naver-blog-agent v1.21, 2026-10-08)

- **Supabase DB 원고 영구 저장 서버 API(/api/posts) 구축 & 원고 보관함 실시간 양방향 연동 (v1.21, 주인님 확정)**:
  - 배경: 주인님의 "왜 여기에 완성본을 저장하는 기능이 구현안되어 있어?" 지적에 따라 브라우저 임시 localStorage에만 의존하던 기존 저장 구조를 해결하고, 어떤 환경/기기에서도 작성한 블로그 글이 영구 보존되도록 서버 DB 연동 완성.
  - 조치:
    1) `naver-blog-agent/src/app/api/posts/route.ts`:
       - `GET`, `POST`, `PUT`, `DELETE` 핸들러 신설.
       - `force-dynamic`, `force-no-store` 캐싱 방지 선언 및 `createAdminClient()` 활용 안전한 RLS 격리(owner-only).
       - Dual Storage Adapter 패턴 적용으로 `nba_posts` / `naver_blog_seo_drafts` 모두 완벽 호환 보장.
    2) `naver-blog-agent/src/app/(dashboard)/page.tsx`:
       - 글 생성 및 이미지 생성 완료 시 서버 `/api/posts`로 즉시 자동 영구 저장.
       - 수동 저장(`handleSaveDraft`) 및 발행 전송(`handlePublishToQueue`) 시 서버 DB 즉시 저장 및 큐 전환.
       - 페이지 로드 시 서버 DB의 최신 원고 개수로 상단 보관함 배지 실시간 동기화.
    3) `naver-blog-agent/src/app/(dashboard)/queue/page.tsx`:
       - 마운트 시 서버 `/api/posts`에서 실시간 원고 로드 및 로딩 스피너 제공.
       - 목록 헤더 바에 `[🔄 새로고침]` 버튼 신설.
       - 스마트 에디터 수정(`handleSaveEditor`), 삭제(`handleDelete`), 즉시 발행(`handlePublishNow`) 모두 서버 DB와 실시간 동기화.
    4) `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version` 및 마이그레이션 `0021_bump_version_v1_21.sql`을 `v1.21`로 동기화.


## 네이버 블로그 에이전트 (naver-blog-agent v1.20, 2026-10-08)

- **생성 콘텐츠 영구 자동 저장(Auto-save) & 전용 원고 보관소(/queue) 전면 개편 (v1.20)**:
  - 배경: 주인님의 "생성된 콘텐츠는 어디에서 볼수 있지? 저장 안해놓나?" 질문에 대한 조사 결과, ① 글 생성 시 자동으로 보관함에 들어가지 않고 수동 저장 버튼을 눌러야만 했던 점, ② 사이드바 메뉴명이 "발행 대기 큐 & 이력"으로 되어 있어 보관함인지 인지하기 어려웠던 점, ③ `/queue` 페이지에서 본문/이미지 상세 열람 및 복사/수정 기능이 없었던 점을 완전 개선.
  - 조치:
    1) `naver-blog-agent/src/app/(dashboard)/page.tsx`:
       - 글 생성(`executeGeneration`) 및 이미지 생성(`generateImagesFor`) 완료 즉시 `savePostToStorage`를 통해 로컬 보관함(`nba_saved_posts`)에 100% 자동 영구 저장. 새로고침이나 창 종료 후에도 데이터 영구 보존.
       - 결과 카드 상단에 "✅ 보관함 자동 저장됨" 배지 추가.
       - 메인 타이틀 우측에 `[📑 생성 원고 보관함 (${savedPostCount}건)]` 퀵 링크 및 `[최근 원고 열기]` 모달 탑재. 모달에서 원하는 원고 클릭 시 메인 결과 화면으로 즉시 로드.
    2) `naver-blog-agent/src/components/layout/Sidebar.tsx`:
       - 사이드바 메뉴 명칭을 `📑 생성 원고 보관함 & 발행 큐`로 직관화 (설명: "생성된 글 열람·편집·스마트에디터 발행").
    3) `naver-blog-agent/src/app/(dashboard)/queue/page.tsx`:
       - 전용 원고 보관소 페이지로 전면 업그레이드:
         * 상태별 요약 카드 (전체, 임시보관, 발행대기, 발행완료 건수).
         * 원고 카드 목록: 대표 썸네일 미리보기, 제목, 요약 프리뷰, 글자 수, 태그 배지.
         * 액션 버튼: `[👁️ 열람]` (소제목 및 인라인 이미지 전체 상세 모달 뷰어), `[📋 복사]`, `[✏️ 편집]` (`BlogSmartEditorModal` 즉시 수정 연동), `[🚀 발행 전송]` (스마트에디터 ONE 자동 발행 큐 전송), `[🗑️ 삭제]`.
    4) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0020_nba_bump_version_v1_20.sql`을 `v1.20`으로 동기화.
    5) Chrome 확장 최신 번들 `naver-blog-agent-extension-v1.20.zip` 및 `latest.zip` prebuild 자동 생성 완료.

## 네이버 블로그 에이전트 (naver-blog-agent v1.19, 2026-10-08)

- **스마트 에디터(수정·편집) 듀얼 위지윅 편집기 구축 (`ai-auto-blog` 레퍼런스 이식, v1.19)**:
  - 배경: 주인님의 "본문에 이미지는 잘 들어갔어. 생성된 본문 편집기능을 추가해줘. https://ai-auto-blog-one.vercel.app/posts/110/edit 편집기 참고해서 이렇게 기능 구현해주면되" 요청에 따른 스마트 에디터 전면 이식 및 연동.
  - 조치:
    1) `naver-blog-agent/src/components/RichTextEditor.tsx`:
       - Tiptap 기반 풀 위지윅 에디터 탑재 (H1~H3, Bold, Italic, Underline, Strikethrough, Highlight, Code, 11색상 팔레트 Color Picker, 정렬, 글머리기호, 번호목록, 인용, 구분선, 표 3x3, YouTube 삽입, 하이퍼링크 삽입, Undo/Redo).
       - PC 이미지 파일 첨부: 로컬 파일 선택 시 `/api/upload-image`를 통해 Supabase Storage `ai-image-generations` 버킷에 안전 업로드 후 에디터에 즉시 인라인 삽입.
       - ✨ AI 이미지 즉시 생성 삽입: 툴바 팝오버에서 원하는 피사체/상황 한글 프롬프트 입력 시 `/api/generate-image`를 호출해 커서 위치에 즉시 삽입.
    2) `naver-blog-agent/src/components/BlogSmartEditorModal.tsx`:
       - `ai-auto-blog/posts/[id]/edit` 페이지와 동일한 듀얼 모드 편집 화면 구축:
         * 블로그 제목 (인풋) 및 요약문 (textarea) 실시간 편집.
         * 추천 SEO 검색 태그 칩 삭제(`×`) 및 신규 태그 추가.
         * `[🎨 비주얼 스마트 위지윅]` 탭: 서식 툴바 + 이미지 + AI생성 + 유튜브 + 표 + 링크.
         * `[💻 코드 / 텍스트]` 탭: 마크다운 서식 도구 + 텍스트에어리어 직접 편집.
         * `[✓ 편집 완료 및 본문 적용]` 클릭 시 상위 결과 객체에 즉시 반영.
    3) `naver-blog-agent/src/app/(dashboard)/page.tsx`:
       - 결과 카드 상단 액션 바 및 본문 뷰어 바로 위에 `[✏️ 스마트 에디터 편집]`, `[✏️ 원고 편집]` 버튼 배치.
       - 본문 뷰어(`renderSmartArticle`): 에디터에서 편집된 HTML 서식(`dangerouslySetInnerHTML`)과 기존 스마트 파서를 완벽 지원하여 실시간 동기화.
       - 클립보드 복사(`copyContent`) 및 네이버 스마트에디터 ONE 자동 발행 대기열에 수정된 내용 100% 반영.
    4) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0019_nba_bump_version_v1_19.sql`을 `v1.19`로 동기화.
    5) Chrome 확장 최신 번들 `naver-blog-agent-extension-v1.19.zip` 및 `latest.zip` prebuild 자동 생성 완료.

## 네이버 블로그 에이전트 (naver-blog-agent v1.18, 2026-10-07)

- **원클릭 본문 + 이미지 동시 생성 및 본문 사이사이 인라인 이미지 렌더링 구축 (v1.18)**:
  - 배경: 주인님 제보(스크린샷) "왜 본문에 이미지가 삽입되어 있지 않지?". 분석 결과 ① 글 생성 시 본문 텍스트만 먼저 생성되고 이미지는 하단의 파란색 버튼을 별도로 눌러야 했던 점, ② AI 작성 본문 안에 `[IMAGE INSERT - 상황 묘사]` 텍스트만 문자열로 남아있던 점, ③ 결과 화면이 단순 텍스트 박스로 되어 있어 이미지가 본문 사이에 시각적으로 렌더링되지 않았던 문제를 식별하고 전면 개편함.
  - 조치:
    1) `naver-blog-agent/src/app/(dashboard)/page.tsx`:
       - `[블로그 글 자동 생성]` 버튼 클릭 시, 텍스트 작성이 끝나면 백엔드에서 2장의 추천 AI 이미지를 자동으로 즉시 연계 생성(`generateImagesFor`)하여 원클릭으로 본문과 이미지가 한 번에 완성되도록 개선.
       - 본문 뷰어 인라인 렌더링(`renderSmartArticle`): `[SECTION - ...]`은 스마트에디터 소제목으로, `[IMAGE INSERT - ...]` 플레이스홀더는 실제 생성된 고화질 이미지 카드(16:9 반응형, 캡션, 클릭 시 원본 확대 모달)로 본문 사이사이에 쏙 들어가게 인라인 치환 렌더링! 미생성 상태 시 `[🖼️ 이 위치 이미지 생성]` 인라인 카드 노출.
       - 대표 썸네일 상단 렌더링: 제목 바로 아래에 대표 썸네일 이미지를 시원하게 렌더링.
       - 원고 복사(`copyContent`) 고도화: 원고 복사 시 `[IMAGE INSERT - ...]` 자리를 실제 이미지 마크다운(`![캡션](url)`)으로 자동 치환하여 클립보드에 복사.
       - 서식 뷰 / 원본 텍스트 뷰 모드 토글: 상단에 [🎨 서식·이미지 완성 뷰]와 [📄 원본 텍스트] 탭을 제공하여 자유롭게 전환 가능.
    2) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0018_nba_bump_version_v1_18.sql`을 `v1.18`로 동기화.

## AI 맞춤 자동 블로그 (ai-auto-blog v1.36, 2026-10-07)

- **원클릭 본문+이미지 사이사이 자동 배치 & 완성본 통합 뷰어 구축 (v1.36)**:
  - 배경: 주인님의 "여기 어떻게 텍스트와 이미지를 동시에 생성하는지 콘텐츠 생성 로직과 이미지를 사이사이 어떻게 넣는지 확인하고 블로그 생성 버튼 누르면 한번에 본문+이미지가 들어가는 구조로 만들어져야 해. 먼저 어떻게 만들어졌는지 구조와 프롬프트, 로직 분석후 다시 작업해" 요청에 따른 완성형 원클릭 개편.
  - 파이프라인 분석: 실시간 뉴스 수집(`collector.ts`) ➔ SEO 본문 JSON 생성(`generator.ts`) ➔ 문단 묶음(`groupParagraphs`) 및 Gemini 2.5 Flash 핵심 문장 추출(`imageGenerator.ts`) ➔ NanoBanana/Gemini 실사 이미지 생성 및 Supabase Storage(`post-images`) 업로드 ➔ 소제목 바로 밑과 요약문 밑에 이미지 마크다운 조립(`imageLine`) ➔ HTML 변환(`mdLiteToHtml`) 구조 정밀 분석 보고 완료.
  - 조치:
    1) `ai-auto-blog/app/api/auto-post/route.ts`:
       - [AI 글 생성 시작] 원클릭 호출 시 백엔드에서 텍스트 + 1~5장 실사 이미지 생성 + 본문 사이사이 마크다운/HTML 조립 + DB `blog_posts` 및 카테고리 매핑 등록을 단일 트랜잭션으로 한 번에 완료.
       - 응답 시 `postId`, `postUrl`뿐 아니라 `contentMarkdown`, `contentHtml`, `coverImage`, `sections`, `hashtags`, `cta` 등 완성본 포스트 전체를 반환.
       - `savePostToDatabase`에서 `postId` 전달 시 기존 게시글을 즉시 갱신(`update`)하도록 지원.
    2) `ai-auto-blog/app/write/ai-form/page.tsx`:
       - 폼 제출 시 원클릭 생성 & 즉시 DB 등록 파이프라인 연동.
       - 생성 완료 시 쪼개진 폼이 아닌 **실제 블로그 포스팅처럼 이미지가 본문 사이사이에 완벽하게 배치된 완성본 포스트 뷰어(Article Viewer)**가 기본으로 즉시 펼쳐짐.
       - 상단/하단 원클릭 퀵 액션: `[📋 원고 전체 복사]`, `[🧩 네이버 입력기 전송]`, `[📖 등록된 글 보기]`, `[✏️ 상세 에디터]`, `[🔄 새 글 작성]`.
       - 인라인 빠른 내용 수정 탭: 필요 시 소제목/본문/이미지를 즉석에서 다듬고 `[💾 수정사항 DB 저장]`을 누르면 방금 등록된 글이 즉시 업데이트.
    3) `utils/version.ts`, DB `programs.version` 및 마이그레이션 `0006_bump_version_v1_36.sql`을 `v1.36`으로 동기화.
    4) Chrome 확장 최신 번들 `ai-auto-blog-extension-v1.36.zip` prebuild 자동 생성.

## AI 맞춤 자동 블로그 (ai-auto-blog v1.35, 2026-10-07)

- **AI 맞춤 자동 글쓰기(/write/ai-form) 본문+이미지 실시간 생성 & 블록 편집기 전면 구축 (v1.35)**:
  - 배경: 주인님의 "https://ai-auto-blog-one.vercel.app/write/ai-form 다른 블로그(원문)자동화에 구현해 놓은 본문+이미지생성기능과 편집 기능을 면밀히 분석후 여기에 구현해줘" 요청에 따른 완성형 실시간 편집기 탑재.
  - 조치:
    1) `ai-auto-blog/utils/news/generator.ts`:
       - `PostSectionItem` 및 `GeneratedPostResult` 인터페이스 확장 (`coverImage`, `sections`, `cta`, `hashtags`).
       - `generateWithContentModel` 및 `generateAutoPost`가 소제목, 문단 본문, 문단별 매칭 이미지 URL을 구조화된 배열로 반환하도록 개선.
    2) `ai-auto-blog/app/api/auto-post/route.ts`:
       - `savePostToDatabase` 모듈화 함수 추출.
       - `previewOnly: true` (또는 `mode: 'generate'`): AI 생성 완료 후 DB insert 없이 구조화된 글/이미지 객체를 즉시 반환하여 프론트엔드 편집기 연동.
       - `saveOnly: true` (또는 `mode: 'save'`): 사용자가 편집 완료한 제목, 요약문, 마크다운/HTML 본문, 카테고리를 수신해 DB `blog_posts` 및 매핑 테이블에 단일 트랜잭션으로 안전하게 저장.
    3) `ai-auto-blog/app/write/ai-form/page.tsx`:
       - `previewOnly` 생성 파이프라인 연동.
       - 상단 메타 바: 실시간 글자 수 카운터, 상태 배지, 원고 복사, 최종 저장, 네이버 입력기 전송.
       - 제목 & 요약문 실시간 인라인 편집.
       - 대표 이미지 카드: 썸네일, 고해상도 확대 모달, [대표 이미지 다시 생성 (`/api/posts/generate-editor-image`)].
       - 본문 문단 블록 편집기: 문단별 소제목 H2 & 본문 `textarea` 편집, 문단 순서 이동(`[▲]`/`[▼]`), 문단 삭제, `[새 본문 문단 추가]`.
       - 문단별 이미지 카드: [이 이미지만 다시 생성], [이미지 제거], 미배정 시 [AI 이미지 생성].
       - 추천 링크(CTA) & 추천 SEO 태그 카드.
       - 최종 액션 바: `[최종 발행 및 블로그에 등록]`, `[전체 원고 복사]`, `[네이버 입력기 전송]`.
       - 고해상도 이미지 모달 뷰어(`viewingImageUrl`).
    4) `utils/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0005_bump_version_v1_35.sql`을 `v1.35`로 동기화.
    5) Chrome 확장 최신 번들 `ai-auto-blog-extension-v1.35.zip` prebuild 자동 생성 완료.

## 네이버 블로그 에이전트 (naver-blog-agent v1.17, 2026-10-07)

- **AI 글 생성 엔진 & 멀티 이미지 생성 플랫폼 선택 및 실제 이미지 생성 기능 탑재 (v1.17)**:
  - 배경: 주인님의 "본문은 잘 만들어졌는데 이미지가 생성 안되어 있네 여기에 이미지 생성 기능을 추가 해야 할것 같아. threads-content-ops에 구현해 놓은 AI생성 모델과 이미지 생성모델을 선택 사용하는 기능을 추가해줘" 요청에 따른 전면 개편.
  - 조치:
    1) `naver-blog-agent/src/lib/ai/contentModels.ts`:
       - `threads-content-ops`와 100% 동일한 AI 텍스트 생성 엔진(GPT 6종, Claude 4종, Gemini 2종 등 12개 모델) 및 멀티 이미지 생성 플랫폼(NanoBanana 4종, GPT Image 7종, FLUX 2.0 3종, Z-Image 1종 등 15개 모델) 레지스트리 구축.
       - 이미지 종횡비(1:1, 4:5, 16:9, 9:16) 및 최대 생성 장수 설정 완비.
    2) `naver-blog-agent/src/lib/ai/imageGenerator.ts`:
       - Google Gemini(`withGemini`), OpenAI(`withOpenAI`), Replicate(`withReplicate`) 연동 실사 이미지 생성기 구축.
       - 핵심 원칙 3번(인물 묘사 시 한국인/동아시아인 기본 묘사, 텍스트/워터마크 제외 규칙) 자동 프롬프트 보정(`finalizePrompt`) 적용.
    3) `naver-blog-agent/src/app/api/generate-image/route.ts`:
       - 이미지 실시간 생성 및 Supabase Storage(`ai-image-generations` 버킷) 자동 업로드, 고유 영구 공개 URL 발급 API 신설.
    4) `naver-blog-agent/src/app/(dashboard)/page.tsx`:
       - 상단 입력 폼에 🤖 AI 글 생성 엔진 선택 카드 & 🖼️ AI 이미지 생성 모델/종횡비/장수 설정 카드 탑재.
       - 결과 화면의 기존 텍스트 프롬프트 복사 영역을 파란색 바탕 `[🖼️ AI 이미지 생성 (N장)]` 버튼 + 실시간 진행 프로그레스 바 + 생성 이미지 갤러리 그리드(대표 썸네일/본문 컷 배지, URL 복사, 다운로드, 삭제) + 개별 컷 생성 버튼 + 클릭 시 고해상도 확대 모달 뷰어로 전면 교체.
       - 크롬 확장 자동 발행 큐 등록(`handlePublishToQueue`) 및 보관함 저장(`handleSaveDraft`) 시 실제 생성된 이미지가 자동 포함되도록 연동.
    5) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0017_nba_bump_version_v1_17.sql`을 `v1.17`로 동기화.

## Threads 콘텐츠 운영 자동화 v1.70~v1.85 종합 인수인계 (2026-10-08)

> 다른 CLI는 `threads-content-ops/docs/CLAUDE_CONTINUATION.md`의 "★ 최신 작업 요약" 절을 먼저 읽으세요(버전별 표·구조·남은 일·작업 방식). 이 절은 그 요약입니다. 현재 배포·DB 버전 `v1.85`(서비스: https://www.buylife.xyz/threads-content-ops).

- **이번 구간에 한 일**: 이미지 생성·저장 UX(v1.70~72), 콘텐츠 보관함 개편·카테고리 공유·30일 자동 삭제(v1.73~76), 계정 운영정보를 글 생성에 반영하고 페르소나 우선 규칙 정리(v1.77~78), 쇼핑제휴 상품 등록에 알리익스프레스·토스쇼핑 추가와 플랫폼 탭 개편(v1.79~81), 토스용 `FIXIE_URL` 루트 프로젝트 등록(v1.82).
- **DB 변경(주인님 승인, 적용 완료)**: `tco_posts.category_id`(v1.75), `tco_content_sources.source_type` 허용 값에 `aliexpress`·`toss` 추가(v1.79).
- **환경변수**: 루트 Vercel(Production)에 `FIXIE_URL` 추가(Sensitive, 주인님이 직접 등록). 값은 threads-affiliate-poster와 같은 Fixie 프록시이며 poster 설정은 변경하지 않았다.
- **패키지**: 루트 `package.json`에 `undici`(`^7.29.0`)를 직접 의존성으로 추가(토스 프록시 호출용, 이미 설치돼 있던 버전).
- **v1.83·v1.84**: 모든 AI 지시문에 당해 연도 규칙(`lib/yearRule.ts`), 예약 발행 실행기(`lib/scheduledDispatch.ts` + 1분 크론). `CRON_SECRET`은 2026-10-08 등록·재배포 완료, 예약 발행은 실제 Threads로 검증했다(시험 글 `buylife.co.kr`).
- **v1.85**: 콘텐츠 생성 결과 카드에 게시방식 결정 박스(임시저장 기본·즉시 포스팅·예약 발행, poster `/posts/new` STEP 3 구성). 예약 발행은 `CRON_SECRET` 등록(완료) 후에 실제로 나간다.
- **남은 일**: 새 글 자동 생성·게시와 댓글 확인 없음(운영 시간·비율·목표·자동화 스위치는 저장만, 댓글은 `threads_read_replies` 권한 필요) / `CRON_SECRET` 미설정 / 알리익스프레스 실등록·AI 이미지 실키 검증 대기 / poster의 상세페이지 분석 탭·쿠팡 직접 등록 안내 미이식 / `lib/coupang.ts` 135번째 줄 기존 타입 오류(다른 CLI, v1.69).
- **주의**: 이 파일의 `naver-blog-agent` 절은 다른 CLI가 작업하는 영역이다. 그 CLI의 올라가지 않은 변경이 이 파일에 섞여 있을 수 있으니 `git commit`은 항상 경로를 지정한다.

## Threads 콘텐츠 운영 자동화 v1.77 — 계정 운영정보를 글 생성에 반영 (2026-10-08)

- 계정 관리에 저장한 주제·말투·성격·대상 독자·금지 주제·금지 표현이 글 생성·다시 쓰기에 반영됨. 비율·하루 목표·운영시간·자동화 스위치는 여전히 저장만(워커 없음).

## Threads 콘텐츠 운영 자동화 v1.76 — 글감·보관함 글 30일 자동 삭제 (2026-10-08)

- 글감(보관 중 제외)·보관함 글(검토 대기/발행 실패)을 만든 지 30일 후 삭제, 안내 박스·남은 일수 표시. 정책 시작 2026-10-08, 첫 삭제는 2026-11-07 이후. 크론은 CRON_SECRET 미설정이면 503(화면 열 때 정리는 동작).

## Threads 콘텐츠 운영 자동화 v1.75 — 보관함 카테고리 (2026-10-08)

- tco_posts.category_id 추가(DB 적용 완료), 글감 카테고리와 공유, 보관함 칩 필터·개별 변경·글감 카테고리 자동 상속. 상세는 threads-content-ops/AGENTS.md v1.75.

## Threads 콘텐츠 운영 자동화 v1.74 — 보관함 본문 세로 확장 (2026-10-08)

- 보관함 카드 본문 칸이 스크롤 없이 전체가 보이도록 자동 확장. 화면만 변경.

## Threads 콘텐츠 운영 자동화 v1.73 — 콘텐츠 보관함 (2026-10-08)

- tab=manage: AI 초안 만들기 카드 삭제, 메뉴명 '콘텐츠 보관함'. 화면만 변경.

## Threads 콘텐츠 운영 자동화 v1.72 — 공통 미디어 칸 제거 (2026-10-08)

- 콘텐츠 생성 화면의 공통 미디어 칸 삭제. 글별 이미지·영상만 사용. 화면만 변경.

## Threads 콘텐츠 운영 자동화 v1.71 — 저장됨 초록 버튼 + 글별 직접 이미지·영상 추가 (2026-10-07)

- 결과 글 카드: 저장되면 초록 '✓ 저장됨', 하단 '📎 직접 추가'로 내 이미지·영상 업로드(그 글에만 첨부). 화면만 변경.

## Threads 콘텐츠 운영 자동화 v1.70 — 이미지 생성 버튼 파란색 + 생성 중 자리표시 (2026-10-07)

- 결과 글의 '이미지 생성' 버튼 파란 바탕, 생성 중 자리표시 칸 추가. 화면만 변경.

## Threads 콘텐츠 운영 자동화 (threads-content-ops v1.69, 2026-10-07)

- **쿠팡 파트너스 34자 공식 단축 링크 자동 생성 및 저장 (v1.69)**:
  - 배경: Threads 콘텐츠 생성 시 본문 콘텐츠가 200자 안팎(2~3문장)으로 너무 짧게 나오는 문제 검수. 쿠팡 검색 API의 `productUrl`이 220자짜리 긴 주소라 오버헤드(259자)로 인해 본문 공간이 221자로 축소된 것이 원인임을 확인하고, 주인님 지시("자동으로 상품등록할때 단축링크를 생성해서 걸수 있는 방법이 있나? -> 구현해줘")에 따라 100% 자동 생성 파이프라인 탑재.
  - 조치:
    1) `threads-content-ops/lib/coupang.ts`:
       - 쿠팡 파트너스 공식 Deeplink API(`POST /v2/providers/affiliate_open_api/apis/openapi/v1/deeplink`) 연동 `createCoupangDeeplink`, 일반 상품 주소 조립 `buildProductDetailUrl`, 단축 링크 유효성 검증 `isCoupangShortUrl` 구현.
       - POST 서명 생성을 위해 `buildAuthorizationHeader`가 GET/POST 공용 지원하도록 확장.
    2) `app/(dashboard)/threads-content-ops/web-actions.ts`:
       - `saveCoupangSearchResult`: 검색 결과에서 상품 저장 시 회원의 쿠팡 키로 딥링크 API를 자동 호출하여 34자 단축 링크(`link.coupang.com/a/...`)로 자동 변환 저장 (키 미등록 시 기존 링크 폴백).
       - `createContentSource`: 직접 URL 등록 시에도 일반 쿠팡 주소가 들어오면 단축 링크로 자동 변환.
    3) `app/(dashboard)/threads-content-ops/SourceQueue.tsx`:
       - 상품 검색 박스 설명에 "소스로 저장 시 34자 공식 단축 링크로 자동 변환되어 본문 글자 수를 400자 이상 넉넉히 확보" 안내 문구 추가.
    4) 효과: 링크 길이가 228자에서 34자로 대폭 단축되어 AI 본문 작성 목표 공간이 221자에서 **410~420자(2배 이상)**로 대폭 넓어짐. Threads 500자 제한 내에서 본문 스토리가 4~5단락으로 풍성하고 꽉 차게 생성됨.
    5) `threads-content-ops/lib/version.ts`, DB `programs.version` 및 마이그레이션 `20261007160000_tco_bump_version_v1_69.sql`을 `v1.69`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.16, 2026-10-07)

- **글감 보관함(/collector) 하단 액션 버튼 색상 개편 (v1.16)**:
  - 배경: 주인님 요청("보관 버튼은 초록색, 사용완료 버튼은 파란색 바탕으로 해줘")에 따른 시각적 명확성 개편.
  - 조치:
    1) `src/app/(dashboard)/collector/page.tsx`:
       - 사용완료 버튼(`사용 완료 표시`): 파란색 바탕(`bg-blue-600 text-white hover:bg-blue-700 shadow-sm`)으로 변경. 사용 완료 상태일 때는 파란 톤 복원 버튼(`bg-blue-50 text-blue-700 border-blue-300`)으로 일관성 유지.
       - 보관 버튼(`보관`): 초록색 바탕(`bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm`)으로 변경. 보관 중 상태일 때는 초록 톤 해제 버튼(`bg-emerald-50 text-emerald-800 border-emerald-300`)으로 일관성 유지.
       - 카드 상단 `보관중` 배지도 에메랄드 톤으로 통일.
    2) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0016_nba_bump_version_v1_16.sql`을 `v1.16`으로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.15, 2026-10-07)

- **콘텐츠 생성 결과 2026년 당해 연도 100% 엄수 3중 방어막(Safe-guard) 구축 (v1.15)**:
  - 배경: 주인님의 "콘텐으 생성결과 2023년 표시 되는 부분은 수정한건가?" 질문에 대한 조사 결과, 기존 글감 수집함 제목(구 연도 포함)의 인풋창 전파, LLM 사전학습 컷오프 확률적 누출, 출력단 정규식 후처리 부재의 3대 원인을 식별하고 100% 무결점 3중 방어막을 구축함.
  - 조치:
    1) `src/lib/ai/pipeline.ts`:
       - `sanitizeYear(text, targetYear)` 전역 헬퍼 함수 구현: 2020~2025년 형태 및 구분자 결합 연도를 당해 연도(2026년)로 자동 치환.
       - 입력단 정제: 파이프라인 진입 시 `cleanTopic`, `cleanSearchKeywords`, `cleanPublishPurpose` 1차 정제.
       - 프롬프트 제약 강화: Research, Writer, Reviewer 전 단계에 "소재에 과거 연도가 있더라도 무조건 ${currentYear}년으로 변경하여 기획/작성하라"는 불변 명령 보강.
       - 출력단 정규식 Safe-guard: AI가 생성한 최종 `title`, `content`, `tags`, `images` 전역에 대해 `sanitizeYear` 강제 실행하여 혹시 모를 과거 연도 누출을 원천 방어.
    2) `src/app/(dashboard)/page.tsx`:
       - 글감 보관함에서 글감 선택(`applyViralCandidate`) 시 및 URL 파라미터 로드 시 제목과 본문/키워드의 과거 연도를 당해 연도로 자동 치환하여 인풋창에 노출.
       - 생성 실행 시(`executeGeneration`)에도 매개변수 정제 보장.
    3) `src/lib/collector.ts`:
       - Perplexity 및 유튜브 쇼츠 기반 AI 글감 구조화(`structureBlogCandidates`) 단계에서도 `sanitizeYear` 필터링을 탑재하여 최초 수집 단계부터 구 연도 유입 차단.
    4) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0015_nba_bump_version_v1_15.sql`을 `v1.15`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.14, 2026-10-07)

- **보관(is_archived) 독립 속성 분리 및 전체선택 삭제 시 보관 콘텐츠 100% 안전 보호 (v1.14)**:
  - 배경: 주인이 보관 기능의 본질적 목적("해당 콘텐츠를 보관해놨다가 사용하려는 기능")을 명시하며, 보관과 무관하게 사용가능/불가능(사용 완료) 기능이 자유롭게 동작해야 하고, 전체선택 삭제 시 보관된 콘텐츠는 무조건 제외/보호되어야 함을 지시.
  - 조치:
    1) `src/types/collector.ts`:
       - `BlogViralCandidate`에 `is_archived?: boolean` 독립 필드 추가.
    2) `src/app/(dashboard)/collector/page.tsx`:
       - LocalStorage 데이터 로드 시 기존 `status: 'archived'` 데이터를 `status: 'ready'`, `is_archived: true`로 자동 하위 호환 마이그레이션.
       - 사용 상태 토글(`toggleCandidateStatus`: ready ↔ used)과 보관 토글(`toggleCandidateArchive`: is_archived toggle)을 완전 독립 분리.
       - 각 카드 상단에 사용 상태 뱃지(`사용 가능` / `사용 완료`)와 보관 뱃지(`🗄 보관중`)를 독립 렌더링.
       - 하단 액션 버튼 그룹: `[사용 완료 표시/복원]` + `[보관/보관 해제]` 2대 버튼이 상시 독립적으로 깔끔하게 제공.
       - 전체선택 삭제 및 일괄 정리 시 보관된 콘텐츠는 자동 제외/보호하는 원칙 100% 적용 (`deletable` 필터링 및 `bulkDelete` 내 보관 콘텐츠 영구 보존).
       - 상단 통계 카드에 `사용 가능`, `사용 완료 (발행)`, `보관함 (삭제 보호)` 3대 독립 지표 집계.
    3) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0014_nba_bump_version_v1_14.sql`을 `v1.14`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.13, 2026-10-07)

- **수집된 글감 보관함(/collector) 상태 버튼 로직 재구성 및 인라인 편집 기능 추가 (v1.13)**:
  - 배경: 주인이 보관(archived) 상태 글감에서 `[ 사용 가능으로 ]`, `[ 사용 완료 표시 ]`, `[ 보관 해제 ]` 3개 버튼이 비논리적으로 동시 노출되는 UI 버그 화면을 캡처하여 전달.
  - 조치:
    1) `src/app/(dashboard)/collector/page.tsx`:
       - 하단 액션 버튼 그룹을 상태(status)별 배타적 렌더링으로 전면 리팩터링:
         * `ready` (사용 가능): `[ ✓ 사용 완료 표시 ]` + `[ 🗄 보관 ]`
         * `used` (발행 완료): `[ ⟲ 사용 가능으로 복원 ]` + `[ 🗄 보관 ]`
         * `archived` (보관 중): `[ ⟲ 보관 해제 (사용 가능으로 복원) ]` 단독 노출 (중복 및 부자연스러운 버튼 완전 제거).
       - 글감 인라인 편집 모드 구축: 각 카드 우측 상단에 `[✎]` 수정 버튼 탑재, 제목(input) 및 요약/배경(textarea)을 직접 수정하고 즉시 저장/취소 가능하도록 구현.
    2) `src/lib/version.ts`, `package.json`, DB `programs.version` 및 마이그레이션 `0013_nba_bump_version_v1_13.sql`을 `v1.13`으로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.12, 2026-10-07)

- **당해 연도(현재 2026년) 기준 엄수 및 LLM 사전학습 컷오프(2023/2024년) 퇴행 방지 전면 보강 (v1.12)**:
  - 배경: 생성 결과물에서 연도가 2023년으로 잡히는 LLM 고질적 사전학습 컷오프 퇴행 버그 해결. 올해는 2026년도이므로 항상 당해 연도 기준으로 결과물을 생성하도록 프롬프트 보강 및 메인 지침 확정 요청.
  - 조치:
    1) 루트 `CLAUDE.md` 불변의 핵심 원칙 8번 및 `AGENTS.md` 원칙 9번에 **"모든 콘텐츠 생성 및 AI 프롬프트는 항상 당해 연도(현재 2026년) 기준으로 작성한다"** 메인 지침 확정.
    2) `docs/ERROR_LESSONS.md` 최상단에 LLM 사전학습 컷오프(2023/2024년) 퇴행 생성 버그 및 당해 연도 기준 엄수 점검 체크리스트 등재.
    3) `src/lib/ai/pipeline.ts`:
       - `const currentYear = new Date().getFullYear();` 정의.
       - 1단계 Research Agent: `[기준 연도 절대 엄수]: 현재 연도는 ${currentYear}년이야. 모든 제목, 소제목, 정책, 혜택, 최신 트렌드, 정보는 반드시 ${currentYear}년(당해 연도) 기준으로 기획해야 해. 절대 과거 연도(2023년, 2024년 등)를 사용하거나 과거 시점으로 글을 기획하지 마.` 주입.
       - 2단계 Writer Agent: `1. 기준 연도 절대 엄수: 현재 연도는 ${currentYear}년이야. 모든 본문 내용, 제도, 지원금, 제품, 가이드, 연도 표기는 반드시 ${currentYear}년(당해 연도) 최신 기준이야. 절대 과거 연도(2023년, 2024년 등)를 현재처럼 언급하거나 과거 기준 수치를 적지 마.` 주입.
       - 4단계 Reviewer Agent: `[기준 연도 엄수]: 현재 연도는 ${currentYear}년이야. 본문 및 태그 검수 시 과거 연도(2023년, 2024년 등)가 포함되지 않도록 하고, 필요 시 ${currentYear}년 최신 태그를 부여해줘.` 주입.
    4) `src/lib/humanizer/rules.ts`:
       - 13번 규칙 추가: `13. 연도 표기는 항상 당해 연도(현재 2026년)를 기준으로 유지한다. 과거 연도(2023년, 2024년 등)로 잘못 언급된 문맥이 있다면 당해 연도 최신 기준으로 자연스럽게 바로잡는다.`
    5) `src/lib/collector.ts`:
       - `getPerplexitySystemPrompt()` 및 `getBlogStructurePrompt()` 함수로 동적 전환하여 `currentYear` 주입: Perplexity 실시간 트렌드 검색 및 블로그 글감 AI 구조화 시 당해 연도 최신 팩트 및 키워드 추출 엄수.
    6) `src/lib/version.ts`, `package.json`, Supabase DB `programs.version` 및 마이그레이션 `0012_nba_bump_version_v1_12.sql`을 `v1.12`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.11, 2026-10-07)

- **글감 수집소(/collector) 카테고리 관리/이동 시스템 구축 (ai-auto-blog 스타일 이식) (v1.11)**:
  - 배경: 주인이 `ai-auto-blog-one.vercel.app/candidates`의 카테고리 추가/수정/삭제, 순서 이동(▲▼), 글감 수집 시 카테고리 지정, 특정 글감의 카테고리 이동 기능을 `naver-blog-agent`의 `/collector`에 동일하게 확장 구현 요청.
  - 조치:
    1) `src/types/collector.ts`:
       - `CollectorCategory` 인터페이스 및 `DEFAULT_COLLECTOR_CATEGORIES` (기본 6종) 선언.
    2) `src/lib/collector.ts` & `src/app/api/collector/route.ts`:
       - `structureBlogCandidates` 및 `analyzeShortForBlog`에 `targetCategory?: string` 파라미터 추가.
       - URL 스크랩, Perplexity 72h 핫이슈, 유튜브 쇼츠 분석 시 지정된 카테고리를 프롬프트에 주입하고 결과 객체에 우선 매핑.
    3) `src/components/collector/CategoryManagementModal.tsx`:
       - 카테고리 관리 모달 신설 (새 카테고리 추가, 인라인 수정, 안전 삭제, ▲/▼ 순서 이동).
    4) `src/app/(dashboard)/collector/page.tsx`:
       - 상단 `[🗂 글감 수집 카테고리 관리]` 섹션 탑재 (순서 번호 및 건수 실시간 칩 표시).
       - 3대 수집 탭에 `[📁 수집할 카테고리]` 선택 드롭다운 탑재.
       - 수집 보관함 상단에 실시간 카테고리별 건수 칩 및 원클릭 분류 필터 탭 제공.
       - 체크박스 선택 시 일괄 카테고리 이동 바(`[이동할 카테고리] ➔ [선택 이동]`) 및 개별 글감 카드 내 1초 원클릭 카테고리 변경 셀렉트(`변경 ▼`) 탑재.
       - 카테고리 삭제 시 기존 글감은 '미분류'로 자동 안전 전환.
    5) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0011_nba_bump_version_v1_11.sql`을 `v1.11`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.10, 2026-10-07)

- **사이드바 메뉴 순서 개편: 글감 수집 최상단 배치 (v1.10)**:
  - 배경: 주인이 네이버 블로그 작업 흐름에 맞춰 좌측 메뉴 중 `글감 수집 (떡상·트렌드)` 메뉴를 맨 위로 올려줄 것을 요청.
  - 조치:
    1) `Sidebar.tsx`:
       - `MENU_ITEMS` 최상단에 `글감 수집 (떡상·트렌드)` (`/collector`) 배치.
       - 전체 메뉴 순서: `글감 수집 (떡상·트렌드)` ➔ `블로그 글 자동 생성` ➔ `운영 대시보드` ➔ `네이버 계정·카테고리` ➔ `발행 대기 큐 & 이력` ➔ `API키등록·플랫폼연동` ➔ `연동 & 사용 매뉴얼`.
    2) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0010_nba_bump_version_v1_10.sql`을 `v1.10`으로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.09, 2026-10-07)

- **원하는 글자수 슬라이더(1~4,000자) 및 운영 대시보드(/dashboard) 신설 (v1.09)**:
  - 배경:
    1) 페르소나 카드가 "글의 화자에 해당하는 페르소나"임을 안내하고, 바로 아래에 원하는 글자수를 생성하게 하는 슬라이더 바(1~4,000자 범위) 구축 요청.
    2) 다른 프로그램(`ai-auto-blog`, `threads-content-ops` 등)처럼 네이버 블로그 에이전트에도 한눈에 운영 현황과 지표를 볼 수 있는 운영 대시보드 구축 요청.
  - 조치:
    1) `src/lib/ai/pipeline.ts` & `src/app/api/generate/route.ts`:
       - `PipelineInput` 및 API 파라미터에 `targetLength?: number` 추가.
       - 1단계 Research Agent: 목표 글자수에 따른 최적 소제목 개수 가이드(1,000자 미만 2~3개, 1,000~2,500자 3~5개, 2,500자 이상 5~7개) 동적 조율.
       - 2단계 Writer Agent: `공백 포함 약 ${targetLength}자 내외` 작성 엄수 프롬프트 및 로깅 연동.
       - 3단계 Humanizer 통과 후 최종 `charCount` 및 `targetLength` 메타데이터 반환.
    2) `src/app/(dashboard)/page.tsx`:
       - 페르소나 영역 타이틀을 `글의 화자 (페르소나) 선택 (글을 작성하는 주인공·화자의 시각·말투·경험 캐릭터를 설정합니다)`으로 명시.
       - 페르소나 카드 바로 아래에 **`[🎯 원하는 글자수 생성 설정 (1 ~ 4,000자)]`** 슬라이더 바, 눈금 가이드, 구간별 팁, 숫자 직접 입력창, 원클릭 빠른 프리셋 칩(`1,000자`, `1,800자`, `2,000자`, `2,500자`, `3,500자`, `4,000자`) 구축.
       - 결과물 뷰어 상단에 `공백 포함 약 N자 (목표: M자) / 공백 제외 N자` 비교 뱃지 출력.
    3) `src/app/(dashboard)/dashboard/page.tsx`:
       - 화이트 베이스 표준 운영 대시보드 전용 페이지 신설.
       - 상단 헤더 & 현재 주 운영 블로그 ID 및 상태 배지.
       - 5대 운영 지표 카드 (누적 생성 원고, 발행 대기 큐, 수집된 떡상 글감, 연동 블로그 계정, 연동 AI 엔진).
       - 4대 빠른 원클릭 작업 네비게이션 카드 (글 자동 생성, 떡상 글감 수집소, 계정 & 카테고리 관리, 스마트에디터 ONE 발행 큐).
       - 크롬 확장 프로그램 및 AI 엔진 보안/연동 상태표.
       - 최근 생성 원고(최신 4건) 및 최근 수집 떡상 글감(최신 4건) 요약 테이블 제공.
    4) `Sidebar.tsx` & `Header.tsx`:
       - 사이드바 내비게이션 최상단 및 모바일 헤더에 **`[📊 운영 대시보드]`** (`/dashboard`) 메뉴 신설.
    5) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0009_nba_bump_version_v1_09.sql`을 `v1.09`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.08, 2026-10-07)

- **떡상 글감 수집소(트렌드·뉴스·쇼츠) 신설 및 블로그 글 생성기 연동 (v1.08)**:
  - 배경: `threads-content-ops`의 글감 수집(웹 주소 스크랩, Perplexity 72시간 핫이슈, 유튜브 쇼츠 대박 영상 분석) 메커니즘을 네이버 블로그 장문/검색(C-Rank, DIA+) 생태계에 맞춰 확장 이식하고, 메인 글 생성기에서 수집된 글감을 선택해 즉시 원고를 생성할 수 있도록 연동 요청.
  - 조치:
    1) `Sidebar.tsx` & `Header.tsx`: 좌측 내비게이션 및 모바일 헤더에 **[🔥 글감 수집 (떡상·트렌드)]** (`/collector`) 메뉴 신설.
    2) `types/collector.ts` & `src/lib/collector.ts`:
       - SSRF 안전 방어(내부/사설 IP 차단, 10초 타임아웃, 본문 2MB 제한, 네이버 뉴스 구버전 LSD 주소 리라이트) 및 Cheerio 기반 본문/기사 링크 추출 구현.
       - Perplexity `sonar-pro` 연동 실시간 72시간 한국어권 화제 이슈 검색 구현.
       - YouTube Data API v3 연동 쇼츠 떡상 영상 검색(구독자 대비 조회수 터짐 비율, Outlier, Viral Score, 등급 산출) 및 AI(OpenAI/Gemini/Claude) 영상 훅·터진 이유 분석 구현.
       - 네이버 블로그 전용 구조화 프롬프트: 검색 유입 제목(25~45자), 팩트/배경 요약(200~400자), 추천 카테고리, 롱테일 키워드 3~5개, 독자 공략 앵글 생성.
    3) `api/collector/route.ts`:
       - `url` (웹 기사/목록 스크랩 글감 생성), `perplexity` (72시간 핫이슈 수집), `shorts_search` (쇼츠 검색), `shorts_analyze` (쇼츠 분석 후 글감 생성) 통합 엔드포인트 구축.
    4) `app/(dashboard)/collector/page.tsx`:
       - 떡상 글감 수집소 전용 UI 신설 (화이트 베이스 규격).
       - 4대 통계 카드(전체 수집, 사용 가능, 발행 완료, 영구 보관), 3대 수집 방식 탭(URL 지정, Perplexity 화제 검색, 유튜브 쇼츠 검색/분석), 상태 필터, 일괄 선택 삭제, [✍️ 이 글감으로 블로그 글 생성] 원클릭 이동 지원.
    5) `app/(dashboard)/page.tsx` (메인 글 자동 생성기):
       - 상단 기획 영역에 **[🔥 수집한 떡상 글감에서 선택하기]** 바 탑재.
       - URL 파라미터(`?viralId=...&topic=...&category=...`) 및 드롭다운/빠른 선택 칩을 통해 클릭 1번으로 주제·카테고리·키워드·발행목적 즉시 자동 세팅.
       - 글 생성 완료 시 해당 글감을 `used(발행 완료)` 상태로 자동 전환.
    6) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0008_nba_bump_version_v1_08.sql`을 `v1.08`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.07, 2026-10-07)

- **상황별 6대 페르소나 원클릭 생성 엔진 탑재 및 결과물 섹션 하단 수직 이동 레이아웃 구현 (v1.07)**:
  - 배경: `threads-easy-planner`의 6대 페르소나 기획 시스템을 심층 분석하여 네이버 블로그 장문/SEO(C-Rank, DIA+) 생태계에 맞춰 확장 이식 요청. 아울러 기존 좌우 12컬럼 분할에서 "결과물 보이는 섹션을 아래로 이동"하여 상단(기획/페르소나) ➔ 하단(완성 원고 및 결과물 전체 폭 뷰어) 구조로 개편 요청.
  - 조치:
    1) `types/persona.ts`:
       - 6대 블로그 페르소나(가전·살림 주부형, 독신·자취생형, 워킹맘·직장인형, 20대 쇼핑·뷰티 에디터형, IT·테크 리뷰어형, N잡러·재테크 부업형) 신설.
       - 각 페르소나별 뱃지, 이모지, 태그라인, 추천 카테고리, 대표 추천 주제, 검색 롱테일 키워드, 발행 목적, 문체 톤앤매너 프롬프트 정의.
    2) `ai/pipeline.ts` & `api/generate/route.ts`:
       - 파이프라인 입력에 `persona` 파라미터 추가.
       - 1단계 Research Agent: 페르소나 캐릭터의 시각과 상황에 맞춘 소제목 목차 기획.
       - 2단계 Writer Agent: 페르소나의 실사용 썰, 경험담, 리얼리티 톤으로 1,800~2,500자 본문 작성.
       - 3단계 Humanizer / 4단계 Reviewer / 5단계 Image에 페르소나 관점 일관성 부여.
    3) `page.tsx` (메인 글 생성):
       - 상단에 **상황별 페르소나 원클릭 생성** 카드 그리드 탑재 (클릭 시 조건 1초 자동 로드 및 `⚡ 즉시 생성 →` 지원).
       - 레이아웃 전면 개편: 기존 좌우 분할 제거 ➔ **상단: 6대 페르소나 및 기획 조건 설정** ➔ **하단: 5단계 AI 생성 결과물 뷰어(Full Width)** 수직 스택으로 재배치하여 2,000자 이상의 긴 원고 가독성 극대화.
    4) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0007_nba_bump_version_v1_07.sql`을 `v1.07`로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.06, 2026-10-07)

- **카테고리 순서 위/아래 이동, 정보 수정 및 상하 수직 레이아웃 개편 (v1.06)**:
  - 배경: 주인이 등록한 카테고리 목록의 순서를 원하는 대로 정렬(위/아래 이동)하고, 카테고리명/말투/키워드/목적 정보를 언제든 수정할 수 있도록 기능 요청. 아울러 계정 목록과 카테고리 섹션이 좌우로 나뉘어 있던 구조를 상단(블로그 계정 목록) ➔ 하단(카테고리 & 키워드 설정)으로 수직 재배치 요청.
  - 조치:
    1) `accounts/page.tsx`:
       - [순서 이동] 각 카테고리 카드에 ▲(위로 이동), ▼(아래로 이동) 버튼과 순서 번호 배지를 탑재하여 클릭 한 번으로 손쉽게 순서 교체 지원.
       - [정보 수정] ✎ 수정 버튼을 누르면 인라인 폼이 열려 카테고리명, 기본 말투(해요체/합니다체/반말), 핵심 키워드, 발행 목적을 직접 편집하고 [수정 완료] 가능. 계정 별칭/블로그 ID 수정 기능도 함께 지원.
       - [레이아웃 개편] 좌우 2컬럼 분할에서 **상단: 네이버 블로그 계정 목록** ➔ **하단: 선택된 계정의 카테고리 & 키워드 설정** 수직 스택 구조로 전면 재배치하여 시각적 흐름과 작업 동선 최적화.
    2) `page.tsx` (메인 글 생성):
       - 선택된 블로그에 등록된 카테고리들을 정렬된 순서대로 [원클릭 빠른 선택 칩]으로 노출하여, 클릭 시 카테고리명·키워드·목적·말투가 1초 만에 자동 채워지도록 연동.
    3) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0006_nba_bump_version_v1_06.sql`을 `v1.06`으로 동기화.

## 네이버 블로그 에이전트 (naver-blog-agent v1.05, 2026-10-07)

- **초보자 맞춤형 실전 매뉴얼 페이지(/guide) 전면 개편 및 시각화 (v1.05)**:
  - 배경: 크롬 확장 설치, 페어링, AI 5단계 글 생성, 스마트에디터 ONE 자동 타이핑 및 발행까지 초보자도 3분 만에 쉽게 이해하고 따라할 수 있는 상세 가이드 구축 요청.
  - 조치:
    1) `guide/page.tsx`:
       - [핵심 원리] Akamai 보안 및 봇 탐지를 우회하는 일반 크롬 브라우저 세션 타이핑 원리 상세 설명.
       - [최초 1회 설정] STEP 1(크롬 확장 원클릭 ZIP 다운로드 및 등록) ➔ STEP 2(페어링 코드 1초 연결) ➔ STEP 3(통합 계정 AI 키 자동 연동 확인) 3단계 카드 시각화.
       - [실전 사용법] 1단계(글감/키워드/말투) ➔ 2단계(5단계 멀티 AI 협업 파이프라인) ➔ 3단계(스마트에디터 ONE 사람 호흡 자동 타이핑) 워크플로우 구현.
       - [실전 200% 꿀팁] 대기열(Queue) 활용법 및 계정/카테고리 사전 등록 템플릿 안내.
       - [자주 묻는 질문(FAQ)] 보호조치 안전성, 키 자동 연동, 반응 없을 때 해결법 탑재.
    2) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0005_nba_bump_version_v1_05.sql`을 `v1.05`로 동기화.


- **설정 화면(/settings) SSR 서버 컴포넌트 전환으로 계정 연동 AI 키 즉시 로딩 보장 (v1.04)**:
  - 배경: 클라이언트 비동기 로딩(`fetch`) 시 브라우저 세션 타이밍이나 쿠키 상태에 따라 키가 지연되어 뜨거나 미등록으로 오인되는 현상 원천 차단.
  - 조치:
    1) `settings/page.tsx`: SSR 서버 컴포넌트로 전면 전환하고, `requireProgramAccess()` 세션 검증 후 `createAdminClient()`로 회원의 `user_api_keys`를 직접 쿼리하여 마스킹된 키 값(`initialDetails`)과 등록 목록을 즉시 획득.
    2) `SettingsClient.tsx`: 클라이언트 인터랙션 컴포넌트를 분리하여 서버에서 전달받은 키 정보를 첫 렌더링 즉시 100% 완전 노출. "🔄 계정 키 다시 불러오기" 버튼으로 실시간 동기화 지원.
    3) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0004_nba_bump_version_v1_04.sql`을 `v1.04`로 동기화.
    4) **AIMaster 메인 사이트 정식 등록 & 메인지침 썸네일 완결**:
       - 메인지침 §13(포토리얼리즘, 한국인 마케터, 16:9, shallow depth of field, 85mm 렌즈룩, 텍스트 배제, floating glowing icon)을 100% 준수한 고화질 실사 썸네일 생성.
       - `scripts/upload-program-thumbnail.mjs`로 Supabase Storage 업로드 및 `programs.thumbnail_url` 갱신 (`?v=1791335274850`).
       - `programs` 테이블의 `category_id`를 '블로그'(`8e8be410-3ed4-46f7-80d9-4b408af61cc1`)로 지정하고 `badges: ["new"]`, `sort_order: 1` 설정 완료.
       - 메인 카탈로그(`https://www.buylife.xyz/programs`) 및 상세 소개 페이지(`https://www.buylife.xyz/programs/naver-blog-agent`)에 정상 노출 확인 (HTTP 200 OK).


- **통합 계정(buylifemall 등) 연동 AI 키 시각화 및 자동 공유 체계 고도화 (v1.03)**:
  - 배경: `buylifemall@naver.com` 등 회원의 AIMaster 통합 계정에 기등록된 AI API 키(OpenAI, Gemini, Claude, Perplexity 등)를 찾아 자동 연동하고, 설정 페이지(`/settings`)에서 등록 현황과 마스킹 키를 명확히 확인할 수 있도록 개선 요청.
  - 조치:
    1) `api/keys/route.ts`: 마스킹된 키 값(`maskedKey: sk-proj••••••••tGkA`)과 최종 수정일시를 반환하도록 GET 엔드포인트를 고도화하고, 불필요한 키 삭제를 위한 DELETE 엔드포인트 신설.
    2) `settings/page.tsx`: 4대 AI 엔진(OpenAI, Gemini, Claude, Perplexity) 연동 상태를 카드 그리드로 시각화. 계정에 이미 키가 등록되어 있는 경우 "AIMaster 통합 계정에 등록된 키가 자동 연동되어 있습니다" 안내 배너 및 각 키의 마스킹 값 표시.
    3) 신규 키 등록/변경 폼 및 크롬 확장 연동과의 분리 레이아웃 적용.
    4) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0003_nba_bump_version_v1_03.sql`을 `v1.03`으로 동기화.


- **크롬 확장 원클릭 ZIP 다운로드 자동 빌드(prebuild) 및 대시보드 연동 (v1.02)**:
  - 배경: 회원이 크롬 확장을 수동으로 폴더 복사하지 않고, 웹 대시보드에서 클릭 한 번으로 최신 압축 파일(`naver-blog-agent-extension-latest.zip`)을 즉시 내려받을 수 있도록 개선 요청.
  - 조치:
    1) `scripts/build-extension-archive.mjs`: `src/lib/version.ts`의 `APP_VERSION`과 `manifest.json`을 자동 동기화하고, `public/downloads/naver-blog-agent-extension-latest.zip` 및 버전별 ZIP을 생성하는 패키징 파이프라인 구현.
    2) `package.json`: `prebuild` 및 `build:extension` 스크립트를 추가하여 `npm run build` 시 자동으로 최신 ZIP 아카이브가 갱신되도록 연동 (`archiver@^7.0.1`).
    3) UI 연동: `/guide` 실전 매뉴얼 STEP 2 및 `/settings` 크롬 확장 연동 카드에 `[📦 최신 크롬 확장프로그램 ZIP 다운로드]` 원클릭 다운로드 버튼 탑재.
    4) `src/lib/version.ts`, DB `programs.version` 및 마이그레이션 `0002_nba_bump_version_v1_02.sql`을 `v1.02`로 동기화.
    5) **메인 카탈로그 고화질 실사 썸네일 등록**: 한국인 디지털 마케터의 블로그 작업 실사 사진을 생성하여 Supabase Storage(`program-images/catalog/naver-blog-agent-thumbnail.jpg`) 업로드 및 `programs.thumbnail_url` 연동 완료. 메인 카탈로그(`https://www.buylife.xyz/programs`) 카드에 정상 노출.

## 네이버 블로그 에이전트 (naver-blog-agent v1.01, 2026-10-07 신규 구축)

- **Chrome 확장 + 웹 대시보드 하이브리드 네이버 블로그 자동화 신규 런칭 (v1.01)**:
  - 배경: 복사장 유튜브 및 GitHub(`https://github.com/boksajang/naverblog-extention`) 오픈소스의 핵심 메커니즘을 심층 분석하여, AIMaster 생태계에 최적화된 서브프로젝트로 구현.
  - 핵심 아키텍처:
    1) **네이버 봇 탐지(Akamai/Canvas/TLS/캡차) 100% 무력화**: Playwright/Puppeteer 등 서버 드라이버 대신 일반 크롬 브라우저 상의 Chrome 확장(Manifest V3)이 스마트에디터 ONE iframe DOM에 마우스/키보드 가상 이벤트를 발생시켜 실제 사람의 타자로 작성.
    2) **5단계 AI 에이전트 파이프라인**: 심층 자료조사(Research) ➔ 초안 작성(Writer) ➔ 17대 블로그 윤문 휴머나이징(Humanizer) ➔ C-RANK/DIA+ 품질 검수(Reviewer) ➔ 본문 맞춤형 이미지 프롬프트 생성(Image).
    3) **17대 블로그 윤문 불변 규칙(Humanizer Rules)**: 번호 매기기 금지, 명사형 종결 배제, 접속사 최소화, 인간적 리듬감(온점·줄바꿈·감탄부호), 시그니처 팩트 보존 검증 등 완벽 이식.
    4) **AIMaster 표준 준수**:
       - 공용 Supabase DB `programs` (slug: `naver-blog-agent`, id: `92ff938f-0cad-45ce-bdc8-11b5eb64a80a`, `v1.01`, `https://naver-blog-agent.vercel.app`) 및 기본 3단계 요금제 등록.
       - BYOK(회원 본인 키) 및 `requireProgramAccess()` (`createAdminClient()` 기반 안전 권한 판정).
       - 표준 화이트 베이스 사이드바 레이아웃 (`← 다른 프로그램 보기`, API키등록·플랫폼연동, 📖 연동 매뉴얼).
       - 웹 대시보드에서 큐(Task Queue)에 등록하고 확장 프로그램이 실시간 폴링하여 자동 전송 및 입력.


## Threads AI 기획 자동화 (threads-easy-planner v1.40, 2026-10-06 주인님 지시)

- **시각 자료(사진/영상) 통합 분석 시 사진 번호/순서/슬라이드 메타 표현 원천 차단 및 후처리 엔진 대폭 강화 (v1.40)**:
  - 배경: 사진 여러 장을 첨부하여 가방 등 제품 글을 생성했을 때, 여전히 `1번째 사진 보면 구성품 진짜 잔뜩 널려있잖아??`, `근데 2번째 사진 넘기면 깔끔하게 다 들어가버림...`, `비포 애프터 차이 실화냐...` 같은 기계적 사진 순서/슬라이드 메타 문구가 출력에 포함되는 문제 발생. 첨부된 사진을 전체적으로 통합 분석하여 몇 번째 사진 등의 문구를 절대 넣지 않고 순수한 분석 내용과 사실을 바탕으로 글을 생성하도록 개선 요청.
  - 조치:
    1) `generator.ts`: Vision LLM 프레이밍 전면 개편. 첨부된 시각 자료를 "독자가 넘겨보는 사진"이 아니라 "글쓴이가 직접 현장에서 겪은 1인칭 실제 경험(수납/실사용 장면)"으로 프레이밍하여, "사진", "이미지", "1번째", "2번째", "첫번째", "두번째", "넘기면", "비포", "애프터", "컷" 등 메타 단어 일체 금지.
    2) 모범 예시 전환: Attention Hijacking을 유발하던 부정형 예시(`❌ "1번째 사진만 보면..."`)를 완전 삭제하고, 가방 수납/확장 썰 및 세제 디테일 썰 등 순수한 1인칭 썰 모범 예시로 대체.
    3) 코드 레벨 이중 안전장치: `cleanMediaMetaPhrases()` 정규식 클렌저 대폭 강화 (`비포 & 애프터` ➔ `직접 써보니까 차이 대박임...`, `1번째 사진 보면`/`2번째 사진 넘기면` 등 수사+사진/컷/장+서술어 제거, `근데 넘기면` 잔여 구문 처리, 다중 마침표 정제).
    4) `src/lib/version.ts`, 마이그레이션 `0010_tep_bump_version_v1_40.sql` 및 DB `programs.version`을 `v1.40`으로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.39, 2026-10-06 주인님 지시)

- **스레드 실전 떡상글 불변 핵심 원칙 및 터진 글 벤치마킹 뼈대 분석·생성 엔진 고도화 (v1.39)**:
  - 배경: 4~6줄 친한 언니 반말, 상품명 배제, 【멈추게 하기 ➔ 공감 쌓기 ➔ 반전 한 방 ➔ 질문 던지기】 4단계 전개 구조(마지막 문장 질문 종결), 거짓 경험/효과 사건 날조 금지, 각 글 아래 "이 글의 첫 줄이 멈추게 하는 이유" 1줄 설명 등 주인님의 확정 표준 규격을 시스템 프롬프트 및 UI에 일치 반영 요청.
  - 조치:
    1) `generator.ts`: 시스템 프롬프트에 주인님의 7대 불변 원칙을 명문화하고, 대표 글 및 5대 훅 글 5개 모두 본문 마지막 문장을 독자 참여형 질문으로 끝내도록 강제. 벤치마킹 터진 글 뼈대 분석(① 훅 방식 ② 자극한 심리 ③ 전개 순서 ④ 마지막 질문) 지침 고도화.
    2) `PlannerApp.tsx`: 5대 훅 글 카드(`variant`)의 닫힌 상태와 열린 본문 미리보기 상태 양쪽 모두에 `💡 이 글의 첫 줄이 멈추게 하는 이유: [설명]`을 한눈에 보이도록 강조 렌더링.
    3) `src/lib/version.ts`, 마이그레이션 `0009_tep_bump_version_v1_39.sql` 및 DB `programs.version`을 `v1.39`로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.38, 2026-10-06 주인님 지시)

- **사진/영상 분석 프롬프트 고도화 — "1번째 사진", "2번째 사진" 등 번호 지칭 전면 배제 및 순수 내용 중심 종합 분석 전환 (v1.38)**:
  - 배경: 사진 여러 장 첨부 시 AI가 "1번째 사진만 보면 평범", "2번째 사진 보면 구조가 대박"처럼 기계적으로 사진 번호를 나열하며 글을 작성하는 문제 발생. 순수하게 첨부된 사진과 영상 전체의 내용과 디테일만을 종합 분석하여 자연스러운 1인칭 썰로 완성되도록 개선 요청.
  - 조치:
    1) `generator.ts`: AI 시각 분석 지침에서 "1번째 사진과 다음 사진 비교..." 지침을 전면 수정하고, **"사진/영상 번호나 프레임 지칭 절대 금지"** 규칙을 시스템/유저 프롬프트에 엄격히 명시.
    2) 모범 예시를 "뚜껑 열어보고 진심 감탄함... 펌프 줄줄 새서 손 묻던 거 극혐이었는데 입구 구조부터 깔끔" 형태로 주입하여 순수한 제품 구조/특징/디테일/사용감 중심의 1인칭 썰을 생성하도록 유도.
    3) 코드 레벨 이중 안전장치: `cleanMediaMetaPhrases()` 정규식 클렌징 함수 탑재로 출력 텍스트 내 사진 번호 메타 표현을 완벽 정제.
    4) `actions/planner.ts`: 미디어 첨부 시 키워드 폴백 문구도 "사진 N장 비교" 대신 "제품 실사용 디테일 및 리얼 후기 썰"로 자연스럽게 변경.
    5) `src/lib/version.ts`, 마이그레이션 `0008_tep_bump_version_v1_38.sql` 및 DB `programs.version`을 `v1.38`로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.37, 2026-10-06 주인님 지시)

- **AI 추론 엔진 및 모델 설정 섹션 접기/펼치기 아코디언 제거 및 상시 노출 전환 (v1.37)**:
  - 배경: 사용자가 AI 모델이나 엔진을 변경할 때 매번 아코디언을 클릭해 펼쳐야 하는 번거로움을 줄이고, 항상 바로 노출되어 직관적으로 엔진 및 모델을 조작할 수 있도록 개선 요청.
  - 조치:
    1) `PlannerApp.tsx`: `<details>`/`<summary>` 접기 기능을 삭제하고, 상시 노출되는 카드 레이아웃(`<div>`)으로 전환.
    2) 헤더에 설정 명칭 및 현재 모델 상태(`현재 설정: GPT-4.1`)를 표시하고, 3대 엔진 선택 버튼(OpenAI / Claude / Gemini)과 모델 드롭다운을 상시 오픈 형태로 제공.
    3) `src/lib/version.ts`, 마이그레이션 `0007_tep_bump_version_v1_37.sql` 및 DB `programs.version`을 `v1.37`로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.36, 2026-10-06 주인님 지시)

- **`requireProgramAccess()` createAdminClient() 기반 리팩터링 및 등급/권한 사용자 정상 접근 보장 (v1.36)**:
  - 배경: 특정 회원(김강빈, `kariy11@naver.com`)이 일반 등급 및 관리자 부여 사용기간(~2026-11-05)을 정상 보유하고 있음에도 프로그램 접속 시 구독요청 페이지(`https://www.buylife.xyz/programs/threads-easy-planner`)로 튕기는 현상 발생 원인 규명 및 조치.
  - 원인:
    1) 기존 `threads-easy-planner/src/lib/access.ts`가 일반 세션 쿠키 SSR 클라이언트(`createClient()`)를 사용하여 `user_program_access`를 조회하다가 Supabase RLS 제약으로 인해 데이터가 `null`로 떨어짐.
    2) `profiles.program_access_expires_at`이라는 DB 미존재 컬럼을 SELECT 쿼리하여 에러(`42703`) 발생.
  - 조치:
    1) `threads-easy-planner/src/lib/access.ts`: 사용자의 로그인 인증(세션 확인)은 `requireUser()`로 수행하고, 프로그램 권한·등급·구독·개별부여 조사는 `createAdminClient()`(Service Role Key)를 사용하여 RLS 차단 없이 판정하도록 전면 리팩터링.
    2) 1단계(정지여부) ➔ 2단계(관리자/FREE배지) ➔ 3단계(활성구독) ➔ 4단계(개별부여권한) ➔ 5단계(요구등급 충족+부여기간) 순서로 판정하여 김강빈 회원을 포함한 등급/권한 보유 사용자의 정상 접근 100% 보장.
    3) `src/lib/version.ts`, 마이그레이션 `0006_tep_bump_version_v1_36.sql` 및 DB `programs.version`을 `v1.36`으로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.35, 2026-10-06 주인님 지시)

- **동영상 심층 시각 분석 고도화 (5대 핵심 프레임 시퀀스 및 5대 미세 디테일 분석, v1.35)**:
  - 배경: 사용자가 첨부한 영상의 디테일과 흐름을 AI가 훨씬 더 정밀하게 읽어내어 몰입감 넘치는 1인칭 썰을 생성하도록 분석 로직 강화 요청.
  - 조치:
    1) `mediaProcessor.ts`: 비디오 추출을 기존 3컷에서 **5대 핵심 순간(10% 도입 ➔ 30% 전개 ➔ 50% 절정 ➔ 70% 반전/결과 ➔ 90% 엔딩)**으로 확장하고, 720p급(최대 960px, JPEG 82%) 해상도로 캡처 품질 상향 (자막, 제품 디테일, 손동작 가독성 확보).
    2) `generator.ts`: AI 시각 분석 프롬프트에 5대 미세 디테일(시간 경과에 따른 상태 변화, 화면 속 자막/텍스트/오브젝트, 현장 청각/감각 유추, 무한 재생 유발 킬링 파트 떡밥, 영상-본문 200% 일치감) 지침 대폭 강화.
    3) `PlannerApp.tsx`: 키워드 미입력 시 폴백 주제를 "동영상 5컷 정밀 분석 현장 썰"로 구체화하고, 비디오 첨부 카드에 5컷 시퀀스 타임라인 안내 반영.
    4) `src/lib/version.ts`, 마이그레이션 `0005_tep_bump_version_v1_35.sql` 및 DB `programs.version`을 `v1.35`로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.34, 2026-10-06 주인님 지시)

- **글 생성 시 자동 보관함 저장 해제 및 수동 선택 저장으로 전환 (v1.34)**:
  - 배경: 사용자가 콘텐츠를 생성할 때 무조건 보관함에 들어가던 방식에서, 결과물이 마음에 들 때만 선택적으로 저장할 수 있도록 개선 요청.
  - 조치:
    1) `PlannerApp.tsx`: `handleGenerate` 내부의 `savePlanToStorage` 자동 호출을 제거하고 기본 상태를 미저장(`isSaved: false`)으로 설정.
    2) 상단 우측의 **`[💾 보관함에 저장]`** 버튼을 직접 클릭했을 때만 보관함에 저장되도록 변경. 이미 저장된 글은 중복 저장 방지 안내 피드백 제공.
    3) 사용 매뉴얼(`/guide` `page.tsx`) STEP 4 안내 문구를 수동 선택 저장 방식에 맞춰 최신화.
    4) `src/lib/version.ts`, 마이그레이션 `0004_tep_bump_version_v1_34.sql` 및 DB `programs.version`을 `v1.34`로 동기화.

## Threads AI 기획 자동화 (threads-easy-planner v1.33, 2026-10-06 주인님 지시)

- **좌측 사이드바 하단 팁 문구 제거 (v1.33)**:
  - 조치: 좌측 사이드바(`Sidebar.tsx`) 좌하단에 노출되던 "💡 Tip: 스레드는 첫 문장에서 스크롤을 멈추고 마지막 댓글에서 반응을 끌어내는 것이 핵심입니다." 텍스트 배너 삭제.
  - `src/lib/version.ts`, 마이그레이션 `0003_tep_bump_version_v1_33.sql` 및 DB `programs.version`을 `v1.33`으로 동기화.

## Threads 콘텐츠 운영 자동화 (threads-content-ops v1.35, 2026-10-06 주인님 지시)

- **콘텐츠 작성 레이아웃 개편 및 YouTube 소재 가져오기 분리**:
  1) `DraftComposer.tsx`: 기존 2열 그리드(`lg:grid-cols-[1.15fr_0.85fr]`)를 세로 스택으로 변경하여, 상단 `AI 초안 만들기` 및 하단 `운영 대기열`이 화면 전체 가로폭(full-width 행)으로 넓고 쾌적하게 보이도록 레이아웃 재배치 완료.
  2) `DraftComposer.tsx`: "YouTube 영상에서 소재 가져오기" 섹션 UI 삭제(추후 1번 떡상 콘텐츠 수집/글감 수집 탭으로 이전 통합 예정).
  3) 버전 `v1.35` 갱신 (`threads-content-ops/lib/version.ts`, 마이그레이션 `20261006200000_tco_bump_version_v1_35.sql`).

## 메인 대시보드 사이드바 (Sidebar.tsx) — 좌측 메뉴 로그아웃 버튼 추가 (2026-10-06 주인님 지시)

- 메인 대시보드(`/dashboard`, `/affiliate`, `/api-settings`, `/settings` 공통) 좌측 사이드바(`components/layout/Sidebar.tsx`)에 **로그아웃 버튼** 신설.
- 좌하단 계정 이메일 바로 위에 `LogOut` 아이콘 + 텍스트 버튼 배치.
- 버튼 클릭 시 `/api/session/logout` (서버 세션 쿠키 정리) + `supabase.auth.signOut()` (클라이언트 세션 파기) 순차 호출 후 메인 홈(`/`)으로 리다이렉트 및 화면 새로고침.
- 모바일 슬라이드 메뉴 및 데스크톱 고정 사이드바 양쪽에 공통 적용 완료.
- 다른 서브프로그램 및 페이지 전수 점검 결과, 30여 개 독립 서브프로그램 및 관리자 사이드바 등 다른 모든 메뉴에는 이미 로그아웃이 정상 탑재되어 있음을 확인.

## 서브프로그램 좌측 메뉴 "← 다른 프로그램 보기" 링크 전수 통일 (2026-10-06 주인님 지시)

- 주인님 피드백 반영: 서브프로그램 사이드바의 `← 다른 프로그램 보기` 클릭 시 기존 `/dashboard` 대신 **`https://www.buylife.xyz/programs`**(전체 프로그램 목록)로 이동하도록 전수 수정.
- 수정 대상 (27개 파일):
  - 메인 통합형 Threads 운영 자동화(`app/(dashboard)/threads-content-ops/ContentOpsSidebar.tsx`)
  - 24개 독립 서브프로그램 사이드바 (`Sidebar.tsx`): ai-image-studio, booking-reminder, competitor-analysis, crm-google-form, instagram-comment-reply, instagram-dm-reply, insta_auto_poster, kakao_auto_poster, longtail-keyword-expander, music, naver-cafe-poster, real_estate_sales, shop-detail-page, shorts-viral-studio, shots, stepmail, threads, threads-affiliate-poster, threads-comment-reply, threads-easy-planner, trending-product-finder, video-to-gif, web-crawler/webapp, youtube-auto-reply
  - 네이버 블로그 SEO 스튜디오 (`naver-blog-seo-studio/components/StudioPage.tsx`)
  - 좌측 메뉴 표준 문서 (`docs/SIDEBAR_LAYOUT_STANDARD.md` §2)
- 플랫폼 핵심 지침 영구 반영 완료:
  - `CLAUDE.md`: 새 프로그램 체크리스트 9번에 사이드바 "← 다른 프로그램 보기" 링크(`https://www.buylife.xyz/programs`) 필수 규정 추가.
  - `AGENTS.md`: Platform-hub 새 프로그램 등록 체크리스트 9번에 동일 규칙 반영.
  - `docs/PLATFORM_PATTERNS.md`: `§32. 서브프로그램 좌측 사이드바 "← 다른 프로그램 보기" 링크 표준` 신설.
  - `docs/ERROR_LESSONS.md`: 2026-10-06 전 프로그램 링크 점검·해결 기록 및 사전 점검 체크리스트 등록.

## 메인 관리자 사이드바 (AdminSidebar) — 좌하단 이메일 위 로그아웃 버튼 추가 (2026-10-06 주인님 지시)

- 관리자 콘솔(`/admin/*`) 좌측 사이드바(`AdminSidebar.tsx`) 최하단 사용자 이메일 표시 위치 바로 위에 **로그아웃 버튼** 신설.
- 버튼 클릭 시 `/api/session/logout` (서버 세션 쿠키 정리) + `supabase.auth.signOut()` (클라이언트 세션 파기) 순차 실행 후 메인 홈(`/`)으로 이동 및 화면 새로고침.
- 다크 골드 테마에 맞춰 기본 `bg-white/5 text-subtext`, 호버 시 은은한 로즈 톤(`hover:bg-rose-500/15 text-rose-300`)과 직관적인 로그아웃(`LogOut`) 아이콘 배치로 일관된 UX 제공.

## 메인 관리자 프로그램 관리 (admin/programs) — 프로그램 바로가기 링크 활성화 및 메인지침 반영 (2026-10-06 주인님 지시)

- 주인님 피드백 반영: `/admin/programs` 프로그램 목록에서 프로그램명 우측 외부 링크 아이콘(`↗`)이 단순 span이 아닌 실제 클릭 가능한 `<a>` 링크로 동작하도록 수정.
- `p.app_url`이 있으면 새 창(`target="_blank"`)으로 해당 실제 서브프로그램 라이브 사이트를 즉시 열고, 없으면 소개 상세 페이지(`/programs/${p.slug}`)를 열도록 연결.
- 아래의 `/programs/${p.slug}` 텍스트도 새 창 소개 페이지 링크(`Link`)로 연결하여 관리자 편의성 대폭 개선.
- **플랫폼 메인 지침 영구 반영 완료**:
  - `CLAUDE.md`: 새 프로그램 체크리스트 1번에 `programs.app_url` 필수 등록 및 관리자 외부 링크(`↗`) 동작 보장 원칙 추가.
  - `AGENTS.md`: Platform-hub 체크리스트 1번에 `app_url` 세트 등록 및 span 회귀 금지 규칙 반영.
  - `docs/PLATFORM_PATTERNS.md`: `§31. 프로그램 등록 시 app_url 필수 지정 및 관리자 외부 링크(↗) 인터랙션 표준` 신설.
  - `docs/ERROR_LESSONS.md`: 외부 링크 단순 span 장식 문제 및 해결 기록 추가.

## Threads AI 기획 자동화 (threads-easy-planner v1.32, 2026-10-06)

- **AI 설정 아코디언 타이틀 간소화 (v1.32, 주인님 지시)**:
  - 조치: 아코디언 헤더 라벨에서 '고급' 단어를 제거하여 **`⚙️ AI 추론 엔진 및 모델 설정`**으로 명칭 간소화 완료 (`PlannerApp.tsx`).
  - `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.32`로 갱신 완료.

## Threads AI 기획 자동화 (threads-easy-planner v1.31, 2026-10-06)

- **고급 AI 추론 엔진 및 모델 설정 섹션을 상황별 페르소나 위로 재배치 (v1.31, 주인님 지시)**:
  - 배경: 사용자가 페르소나 원클릭 버튼을 누르기 전이나 글을 작성하기 전, 상단 영역에서 AI 모델(OpenAI / Claude / Gemini) 설정을 먼저 확인하고 변경할 수 있도록 인터랙션 동선 최적화 요청.
  - 조치:
    1) `⚙️ 고급 AI 추론 엔진 및 모델 설정`(`details`) 패널을 상단 블루 테마 박스 내부의 `🎭 상황별 페르소나 원클릭 생성` 바로 위로 위치 이동 (`PlannerApp.tsx`).
    2) 모델 선택 후 바로 아래의 페르소나 버튼이나 글 생성 버튼을 누를 수 있도록 사용자 조작 흐름 개선.
    3) `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.31`로 갱신 완료.

- **상단(주제·글감·목적이 있을 때) vs 하단(아무런 아이디어가 없을 때) 서로 다른 색상 박스 컨테이너 분리 (v1.30, 주인님 지시)**:
  - 배경: 사용자가 "주제/목적이 명확할 때"와 "아무런 생각이 안 날 때" 두 가지 상황에 따라 인터페이스를 한눈에 즉시 구분하여 접근할 수 있도록 시각적 분리 요청.
  - 조치:
    1) 상단 영역: **`🎯 주제 · 글감 · 목적이 있을 때`** 전용 블루 테마 박스(`border-2 border-blue-200/90 ring-4 ring-blue-50/50 bg-white`)로 래핑하여 소재 입력창, 미디어 첨부, 6대 페르소나 그리드, 맞춤글 생성 아코디언을 명확히 그룹화.
    2) 하단 영역: **`🔥 아무런 아이디어가 없을 때!!!`** 전용 앰버/오렌지 테마 박스(`border-2 border-amber-300/90 ring-4 ring-amber-50/50 bg-gradient-to-b from-amber-50/40 via-amber-50/20 to-white`)로 완전 독립 분리하여 원클릭 랜덤 썰 슬롯머신, 3초 무드 칩, 업종별 추천 주제 10선을 시각적으로 완벽히 구분.
    3) 하단에 공통 고급 AI 추론 엔진 및 모델 설정(`details`) 카드를 깔끔하게 독립 배치.
    4) `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.30`으로 갱신 완료.

- **'오늘 뭐 쓰지' 버튼 제거 및 [글 생성하기] 단일 통합 & '아무런 아이디어가 없을 때' 섹션 전면 통합 (v1.29, 주인님 지시)**:
  - 배경: 사용자의 직관적인 조작을 위해 상단 버튼들을 명확히 구분하고 역할을 단순화:
    1) 상단 '오늘 뭐 쓰지' 버튼을 완전히 제거하고, 소재가 없더라도 '글 생성하기' 버튼이 알아서 요일/시간대 맞춤 떡상 썰을 완성하도록 대체.
    2) '아무런 생각이 안 날 때'와 관련된 모든 추천 기능(원클릭 랜덤 썰, 3초 무드 칩, 업종별 10대 추천 주제)을 하단의 `🔥 아무런 아이디어가 없을 때!!!` 섹션으로 일원화 통합.
  - 조치:
    1) 상단 액션 바에서 `[오늘 뭐 쓰지?]` 및 `[아무 생각 없을 때]` 버튼을 제거하고, 메인 **`[✨ 글 생성하기]`**(미디어 첨부 시 `[✨ 사진/영상 분석 글 생성하기]`) 단일 버튼으로 깔끔하게 일원화.
    2) 소재 입력창을 비워두고 `[글 생성하기]`를 누르면 자동으로 실시간 요일/시간대 기반 떡상 썰(`getRandomLuckyPick()`)을 감지하여 1초 만에 자동 작성하도록 연동 (초보자 원클릭 극대화).
    3) 하단 **`🔥 아무런 아이디어가 없을 때!!!`** 섹션으로 모든 아이디어 발굴 기능을 통합:
       - **`[🎰 지금 아무 썰이나 뽑아줘 (원클릭)]`** 럭키 픽 카드
       - **`⏰ [시간대] 맞춤:` 및 3초 무드 칩 바** (`🤣 찌질·공감 일상 썰`, `🧺 써보고 기절한 찐템`, `⚡ 직장·돈 버는 팩폭`)
       - **10대 인기 업종 카테고리 칩 및 10선 추천 카드 목록**을 상시 노출하여 원클릭 선택 지원.
    4) 사용 매뉴얼(`/guide`) STEP 1 '방법 B' 가이드 내용을 새로운 원클릭 썰 & 추천 통합 섹션 흐름과 100% 동기화.
    5) `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.29`로 갱신 완료.

- **'아무 생각 없을 때 (원클릭 랜덤 썰)' 및 실시간 요일/시간대 맞춤 공감 추천 탑재 (v1.28, 주인님 지시)**:
  - 배경: 사용자가 아무런 아이디어나 소재가 전혀 떠오르지 않을 때를 위한 실전 기획(원클릭 슬롯머신 럭키 픽 + 요일/시간대 감지 + 3초 감정 무드 칩) 요청.
  - 조치:
    1) 메인 버튼 행에 **`[🎰 아무 생각 없을 때 (랜덤 썰)]`** 원클릭 버튼 전면 배치 (`threads-easy-planner/src/components/planner/PlannerApp.tsx`).
    2) 접속 시점의 요일 및 시간대(월요병 출근길, 불타는 금요일 밤, 나른한 주말 대청소 썰, 심야 새벽 진솔한 속마음 썰 등)를 실시간 감지하여 가장 공감대를 자극하는 떡상 소재 및 최적 페르소나 자동 매칭 (`threads-easy-planner/src/lib/constants/luckyTopics.ts`).
    3) **3초 감정 무드 칩 바 (`⏰ [시간대] 맞춤:`, `🤣 찌질·공감 일상 썰`, `🧺 써보고 기절한 찐템`, `⚡ 직장·돈 버는 팩폭`)**를 입력창 하단에 탑재하여 클릭 한 번으로 무드에 맞는 썰 즉시 생성 연동.
    4) 결과물 카드 상단에 `[🎰 랜덤 럭키 픽]` 배지 노출 및, 마음에 들지 않을 경우 즉시 다른 썰을 새로 뽑아주는 **`[🔄 다른 썰 뽑기]`** 원클릭 재시도 버튼 연동.
    5) `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.28`로 갱신 완료.

- **'오늘 뭐 쓰지?' 버튼 사진/영상 자동 감지 스마트 글 생성 연동 및 피드백 UX 개선 (v1.27, 주인님 지시)**:
  - 증상: 상세페이지 사진을 올리고 `[오늘 뭐 쓰지?]`를 눌렀을 때 글이 써지지 않고 상단에 아무 반응이 없는 것처럼 느껴지는 현상 원인 규명.
  - 원인: `[오늘 뭐 쓰지?]` 버튼은 글 작성이 아닌 화면 하단의 '업종별 추천 주제 10선'을 호출하는 버튼이었으며, 클릭 후 하단으로 화면이 스크롤되지 않아 상단에선 멈춘 것처럼 보였음. 또한 사용자가 기대한 것은 사진 분석 글 작성이었음.
  - 조치:
    1) 사진이나 영상이 첨부되어 있을 때 `[🎲 오늘 뭐 쓰지?]`를 클릭하면 즉시 사진을 분석하여 5단 구성 스레드 글을 생성(`handleGenerate`)하도록 스마트 연동. 버튼 라벨도 `오늘 뭐 쓰지? (사진 분석)` 및 `사진 분석 작성 중...`으로 상태 안내 강화.
    2) 미디어 카드(동영상/이미지) 우측 상단 액션 바에 **`[✨ 글 생성하기]`** 원클릭 메인 액션 버튼을 직접 탑재하여 사진 업로드 즉시 한자리에서 글 작성 가능하도록 동선 최적화.
    3) 미디어가 없을 때 `[오늘 뭐 쓰지?]` 클릭 시에는 하단 '업종/타깃별 추천 주제 10선' 영역으로 부드럽게 자동 스크롤(`topicsSectionRef`) 및 안내 토스트 피드백 제공.
    4) `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.27`로 갱신 완료.

- **다중 이미지(최대 5장) 비교 및 연속 시각 분석 고도화 (v1.26, 주인님 지시)**:
  - 이미지를 1장뿐만 아니라 최대 5장까지 복수 선택 및 추가 첨부할 수 있도록 파일 선택창 `multiple` 지원 및 드래그앤드롭 고도화 (`src/lib/mediaProcessor.ts`).
  - 첨부된 사진 갤러리 UI: 각 사진에 `#1`, `#2`... 순서 라벨 배지 및 개별 삭제(`✕`) 버튼 제공, 5장 미만일 때 직관적인 `[+ 사진 추가]` 슬롯 노출.
  - 다중 이미지 전용 AI 프롬프트 주입: 사진이 2장 이상일 경우 *"순서와 차이점(비포&애프터, 사용 전후, 패키지와 실사용, 디테일 차이)을 입체적으로 분석하여 독자가 사진을 넘겨보게 만드는 비교 썰을 작성할 것"*이라는 프롬프트 지침 자동 주입 (`src/lib/ai/generator.ts`).
  - 키워드 미입력 시 `사진 N장 비교 현장 상황 및 리얼 썰`로 주제 자동 폴백 (`src/lib/actions/planner.ts`).
  - `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.26`으로 갱신 완료.

- **이미지 및 동영상 시각 분석(Multimodal Vision) 기반 콘텐츠 자동 생성 (v1.25, 주인님 지시)**:
  - '오늘은 뭐 쓰지?' 및 '글 생성하기' 버튼 바로 아래에 직관적인 사진/동영상 첨부 드롭존 및 미리보기 카드 신설.
  - 브라우저 단에서 이미지 최적화(최대 1280px 리사이즈, JPEG 82% 압축) 및 동영상 핵심 장면 3컷(20%, 50%, 80% 타임스탬프) HTML5 Canvas 캡처(`src/lib/mediaProcessor.ts`).
  - Vercel Serverless 페이로드 용량 한도(4.5MB) 초과 에러(413)를 원천 차단하기 위해 원본 영상 대신 경량화된 Base64 프레임(약 300~500KB)만 전송.
  - OpenAI(GPT-4.1/4o), Anthropic(Claude Sonnet), Google Gemini 3사 AI SDK Vision API 멀티모달 파라미터 및 스레드 바이럴 시각 분석 지침 주입 완료 (`src/lib/ai/generator.ts`).
  - 키워드를 입력하지 않아도 사진이나 동영상만 첨부하면 시각 정보에서 디테일과 현장 상황을 포착하여 생생한 1인칭 썰을 자동 생성하도록 폴백 지원.
  - `src/lib/version.ts` 및 공유 Supabase DB `programs.version`을 `v1.25`로 갱신 완료.

- **Anthropic 워크스페이스 미지정 키 오류 친절한 한글 안내 및 설정 가이드 보강 (v1.24)**:
  - 사용자(`kariy11@naver.com`) 제보 에러 분석 완료: Anthropic 콘솔에서 특정 워크스페이스가 지정되지 않은 키(`sk-ant-usr-...`)를 발급받아 등록 시 발생하는 `400 invalid_request_error` ("This API key is not scoped to a workspace...") 현상 원인 규명.
  - 조치:
    1) `generator.ts`: `formatAIErrorMessage` 함수를 구현하여 Anthropic workspace 미지정 에러, 크레딧 부족, 잘못된 키, Rate limit 등 외부 SDK 오류를 사용자 친화적인 한글 안내문으로 가로채어 변환 제공.
    2) `settings/page.tsx`: 설정 화면의 Anthropic 키 발급 안내에 콘솔에서 Default Workspace 선택 후 발급(`sk-ant-api03-...`)해야 한다는 주의사항 명시 및 가장 안정적인 OpenAI (GPT-4.1) 추천 배지 탑재.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.24`로 갱신했다.

## Threads Content Ops v1.68 — 글감 카드 카테고리 변경 배지 (2026-10-07)

- 카드 상단 '📁 이름 | 변경 ▼' 배지로 카테고리 변경(기존 이동 select 대체). 화면만 변경.

## Threads Content Ops v1.67 — 쇼츠 검색을 수집 방식 탭으로 통합 (2026-10-07)

- 쇼츠 검색 박스를 글감 수집 박스의 3번째 탭으로 이동. 화면만 변경.

## Threads Content Ops v1.66 — 글감 카테고리 등록·수정·이동 (2026-10-07)

- 새 테이블 tco_viral_categories + 글감 category_id(DB 적용 완료). 관리 창·칩 필터·수집 시 카테고리 지정·개별/일괄 이동. 상세는 threads-content-ops/AGENTS.md v1.66.

## Threads Content Ops v1.65 — 글감 카드 버튼 정리 (2026-10-07)

- 사용가능 전환 삭제, 사용완료↔사용가능 토글, 상단 '사용 완료' 배지 삭제. 화면만 변경.

## Threads Content Ops v1.64 — 사용 완료 초록색 표시 (2026-10-07)

- 사용 완료 배지·버튼 초록색, 버튼으로 해제. 화면만 변경.

## Threads Content Ops v1.63 — 버튼명 '사용가능 전환' (2026-10-07)

- 문구만 변경.

## Threads Content Ops v1.62 — 글감 보관 상태 노란색 표시 (2026-10-07)

- 보관 중 배지·버튼 노란색, 버튼으로 해제. 화면만 변경.

## Threads Content Ops v1.61 — 생성 이미지를 해당 글 아래에 표시 (2026-10-07)

- 글마다 이미지 갤러리, 공용 카드는 PC 업로드용 '공통 미디어'. 저장은 글 이미지+공통 미디어. 화면 변경만.

## Threads Content Ops v1.60 — 글 분량 450~480자(상품 글은 고지·링크 포함) (2026-10-07)

- 범위 계산·프롬프트·재요청 1회+문장 경계 자르기. 화면 목표 표시. DB 변경 없음.

## Threads Content Ops v1.59 — 멀티 이미지·영상 미디어 카드 + 혼합 캐러셀 발행 + 30일 자동 삭제 (2026-10-07)

- tco_posts.media 칸 추가(승인·적용 완료), 미디어 카드(PC 업로드·AI 이미지·삭제·순서), 혼합 캐러셀 발행, 30일 정리(화면 열 때 본인 몫 + 크론). **남은 일(주인님):** 루트 Vercel 프로젝트에 `CRON_SECRET` 환경변수 추가(없으면 크론 503). 상세는 프로그램 AGENTS.md v1.59.

## Threads Content Ops v1.58 — 맞춤글 생성 박스를 threads-easy-planner 구성으로 (2026-10-07)

- 터진 글 원문(벤치마킹, 구조만 참고·표절 금지) 입력과 '입력한 템플릿으로 글 생성하기' 버튼 추가. 사진·영상 첨부는 미이식. DB 변경 없음.

## Threads Content Ops v1.57 — 상품 연결 글 형식을 실제 게시 예시에 맞춤 (2026-10-07)

- 고지 → 이모티콘 제목 → 3단락(특징·가격) → 상품링크: 주소 한 줄, 네이버는 쿠팡과 같은 형식의 고지(이름만 변경). DB 변경 없음.

## Threads Content Ops v1.56 — 콘텐츠 생성에 등록 상품 연결 (2026-10-06)

- 상품 연결 시 본문 끝 상품 소개 + 하단 상품링크 + 첫 줄 제휴 고지(서버가 저장 때 재조립), 미연결 시 일반 글. DB 변경 없음. 상세는 프로그램 AGENTS.md v1.56.

## Threads Content Ops v1.55 — 이미지 비율 9:16 추가 (2026-10-06)

- 비율 목록·플랫폼별 크기 매핑만 추가. DB 변경 없음.

## Threads Content Ops v1.54 — AI 엔진·이미지 설정을 threads-affiliate-poster 방식으로 확장 (2026-10-06)

- 3대 엔진 버튼(+Claude 지원), 4대 이미지 플랫폼, 생성 장수·비율, 여러 장 캐러셀 관리. 원본 폴더는 읽기만. 미디어 직접 업로드·혼합 캐러셀 발행·30일 자동 삭제는 미이식. DB 변경 없음. 상세는 프로그램 AGENTS.md v1.54.
- **남은 일:** 실제 키(Claude·Gemini 이미지·Replicate·GPT Image) 호출 확인.

## Threads Content Ops v1.53 — 하위 박스 색상 구분 (2026-10-06)

- 색상만 변경.

## Threads Content Ops v1.52 — 이미지 모델 GPT Image 2·1.5, Z-Image Turbo 추가 (2026-10-06)

- Replicate 키 항목 추가, replicate.delivery 주소만 내려받음. DB 변경 없음. 실제 키 호출 확인 필요.

## Threads Content Ops v1.51 — 이미지 생성 모델 섹션 + 글별 이미지 생성 버튼 (2026-10-06)

- 본문 → 영어 프롬프트 → 나노바나나/GPT Image → 버킷 ai-image-generations 업로드. 초안 자동 첨부·발행 연동은 미구현(다음 단계). DB 변경 없음. 상세는 프로그램 AGENTS.md v1.51.
- **남은 일:** 실제 키로 생성 확인, 이미지 첨부 발행(Threads IMAGE 게시), 오래된 이미지 정리.

## Threads Content Ops v1.50 — 결과 본문 자동 확장 (2026-10-06)

- 화면만 변경.

## Threads Content Ops v1.49 — 맞춤글·엔진 영역 항상 펼침 (2026-10-06)

- 접기 제거, 화면만 변경.

## Threads Content Ops v1.48 — 콘텐츠 생성 구역 바탕 흰색 (2026-10-06)

- 색상만 변경. 수집 화면 박스는 그대로.

## Threads Content Ops v1.47 — 글감 셀렉트 바 + 주제 칸 자동 확장 (2026-10-06)

- 화면만 변경, DB 변경 없음.

## Threads Content Ops v1.46 — 콘텐츠 생성 글감 목록을 제목만 표시 (2026-10-06)

- v1.43의 카드형 목록을 제목 한 줄 목록으로 변경. 화면만 변경.

## Threads Content Ops v1.45 — 떡상 콘텐츠 수집 소개 문구 수정 (2026-10-06)

- 화면 문구만 변경, DB 변경 없음.

## Threads Content Ops v1.44 — 글감 일괄 삭제(보관 제외) (2026-10-06)

- 선택 삭제·보관 제외 전체 삭제, 서버에서 archived 제외 강제. DB 변경 없음.

## Threads Content Ops v1.43 — 콘텐츠 생성 1단계에 수집 글감 목록 노출 (2026-10-06)

- 드롭다운 → 글감 카드 목록(배지·미리보기·키워드, 클릭 선택). 화면 변경만, DB 변경 없음.

## Threads Content Ops v1.42 — 콘텐츠 생성에 페르소나·맞춤글·엔진 선택·다시 써줘 (2026-10-06)

- 주인님 지시("일단 진행해줘 보고 또 판단하자"): threads-easy-planner 화면 기능을 콘텐츠 생성에 1차 이식. 상세·사실 원칙·남은 항목은 프로그램 `AGENTS.md` v1.42.
- **남은 일:** 사진·동영상 첨부 분석, Claude 엔진, 주제 추천/랜덤 픽, 실제 키로 생성 확인. 원본 폴더는 다른 도구가 작업 중이라 수정하지 않음.

## Threads Content Ops v1.41 — 콘텐츠 생성(주목받는 글 만들기) (2026-10-06)

- 주인님 지시: "콘텐츠 작성" → "콘텐츠 생성" 이름 변경, 글감 선택 시 threads-easy-planner의 글 생성 방식을 합쳐 주목받는 글 생성. `AttentionComposer.tsx` + `lib/attention.ts`, 대표 글 + 5대 훅 유형 글 + CTA, 저장은 사용자가 고른 글만 초안으로. 원본의 체험담 날조는 제외(글감 사실만). 원본 폴더는 수정하지 않음. DB 변경 없음. 상세는 `AGENTS.md` v1.41.
- **남은 일:** 실제 OpenAI 키로 생성 1회 확인. 원하면 원본의 페르소나·다시 써줘 7종·사진/영상 분석을 이쪽에 추가.

## Threads Content Ops v1.40 — 쇼츠 결과 버튼을 "글감으로 저장" 하나로 정리 (2026-10-06)

- 분석 버튼 이름을 "글감으로 저장"으로 변경, 분석 없는 검정 저장 버튼·서버 동작 삭제. DB 변경 없음.

## Threads Content Ops v1.39 — 쇼츠 분석해서 글감 만들기 (2026-10-06)

- 주인님 지시: `shorts-viral-studio/analyze`의 분석 기능으로 글감이 수집되게. 쇼츠 검색 결과의 버튼 → Gemini(영상 직접) 또는 OpenAI(추정) 분석 → Threads 글감 최대 3건 저장. 설정에 Gemini 키 추가, DB 변경 없음. 상세는 프로그램 `AGENTS.md` v1.39.
- **남은 일:** 실제 Gemini/OpenAI 키로 분석 1회 확인(회원 키·호출 비용). Gemini 키 발급 매뉴얼을 `platform_guides`에 등록 후 설정 화면에 버튼 연결.

## Threads Content Ops v1.38 — 글감 수집(보라)·유튜브 쇼츠 검색(분홍) 박스 색상 구분 (2026-10-06)

- 화면 색상만 변경, 기능·DB 변경 없음.

## Threads Content Ops v1.37 — 떡상 콘텐츠 수집에 유튜브 쇼츠 검색 추가 (2026-10-06)

- 주인님 지시: `shorts-viral-studio/search`의 쇼츠 검색을 이 화면에 추가. 별도 패널(`ShortsSearch.tsx`), 서버 코드 `threads-content-ops/lib/youtubeShorts.ts`. 회원 본인 YouTube 키, DB 변경 없음(저장 시 `tco_viral_candidates`에 method='http'·쇼츠 주소로 저장). 상세는 프로그램 `AGENTS.md` v1.37.
- **남은 일:** 실제 YouTube 키로 검색·저장 1회 확인(회원 키 필요).

## Threads Content Ops v1.34 — 떡상 콘텐츠 수집(글감 수집) 신설 (2026-10-06)

- 주인님 지시: 콘텐츠 작성 위에 글감 수집 단계를 새로 만들고, 쓰레드 자동화(`threads/`)의 수집 기능을 검토해 이쪽에 구현. 사이드바 **1번 `떡상 콘텐츠 수집`**(`?tab=viral`) 추가, 기존 메뉴 번호 +1.
- 수집: 주소 지정(글 1건/목록 무작위 5건) + Perplexity 화제 검색 → 회원 본인 OpenAI 키로 글감 후보(제목·본문 450자·키워드) 정리·저장. 후보에서 `이 글감으로 작성` 또는 콘텐츠 작성 화면의 `수집한 글감 불러오기`로 주제 칸을 채우고, 초안 생성 성공 시 자동 `사용 완료`. NewsBlur(RSS)는 제3자 비밀번호 저장 문제로 제외(주인님이 원하면 보안 검토 후 추가).
- **보안:** 서버가 회원이 넣은 주소를 직접 여는 기능이라 SSRF 방어를 새로 넣었다(내부·사설·예약 주소·비표준 포트·로그인 정보·리다이렉트 우회 차단, IPv6는 공개 대역 허용 목록). 모의 테스트가 `[::ffff:127.0.0.1]` 표기를 놓치는 실제 구멍을 잡아 허용 목록 방식으로 고쳤다(`ERROR_LESSONS.md` 참고).
- DB: 주인님 승인으로 `tco_viral_candidates` 신규(RLS 본인만·anon 권한 없음·회원당 300건, 운영 DB 적용·조회 확인). 설정 화면에 Perplexity 키 항목 추가.
- **남은 일:** 실제 OpenAI·Perplexity 키로 수집 1회 확인(회원 키 필요). 다음 순서는 네이버 브랜드 커넥트 링크 분석 → 등록 상품+계정 운영정보로 초안 생성 → 댓글 → 성과 → 안전한 예약 실행.

## Threads Content Ops v1.33 — 메뉴명 "쇼핑제휴 상품 등록"으로 변경 (2026-10-06)

- 주인님 지시: 사이드바 4번 메뉴·화면 제목·안내 문구의 이름 "콘텐츠 소스" → **쇼핑제휴 상품 등록**(내부 코드 이름·주소는 유지). 표시 이름만 바꾼 작은 변경.
- **대기 중인 새 요청:** "떡상 콘텐츠를 등록하는 메뉴를 따로 추가" — 아직 구현 전. 범위(쇼핑제휴 자동화의 "떡상글 직접 가져오기"와 같은 방식인지)와 새 테이블 승인을 주인님께 확인하는 중.

## Threads Content Ops v1.32 — 포스팅 상품 등록 화면 정리, 블로그 등록 삭제 (2026-10-06)

- 주인님 지시: 콘텐츠 소스 화면은 **포스팅할 상품 등록 용도**. 블로그 글 주소 등록을 삭제하고(`SourceQueue.tsx`·`web-actions.ts`·대시보드 카드) 쿠팡 파트너스·네이버 브랜드 커넥트만 남겼다. 저장된 블로그 소스는 0건이라 데이터 삭제 없음, DB 스키마 변경 없음. 원본의 블로그 RSS 수집은 웹 버전 범위에서 제외(주인님 결정).
- 이어서 같은 화면의 **메뉴명을 "쇼핑제휴 상품 등록"으로 변경**하는 요청이 있어 v1.33으로 별도 처리한다.

## Threads Content Ops v1.31 — 검은 버튼 글자색 수정 (2026-10-06)

- v1.30 쿠팡 검색은 주인님 실계정에서 **실제 상품 목록이 정상으로 나오는 것을 확인**했다(키 활성화·서명·응답 해석 실검증 완료). 같은 화면에서 `상품 검색`·`소스로 저장` 등 검은 버튼의 글자가 안 보이는 문제가 발견돼 고쳤다.
- 원인: `app/globals.css`의 `.threads-content-ops-light .text-white { color:#171717 }` 범위 규칙이 `text-white`를 어두운색으로 바꿔 검은 배경 위에서 글자가 사라졌다. `!text-white`는 Tailwind가 그 규칙을 `!important`로도 자동 생성해 소용없었다(서버 CSS를 직접 열어 확인). `text-[#ffffff]`로 교체(7개 버튼: 계정 운영정보 저장 1, 소스 화면 4, 설정 화면 파란·빨간 2). 임시 미리보기 페이지·서버는 삭제했다.
- 남은 일(다음 순서)은 그대로: 네이버 브랜드 커넥트 링크 분석 → 소스+운영정보 초안 생성 → 댓글 → 성과 → 안전한 예약 실행.

## Threads Content Ops v1.30 — 쿠팡 파트너스 상품 검색 → 소스 저장 (2026-10-06)

- 주인님 지시("쇼핑제휴 자동화에 이미 구현돼 있으니 검토 후 이 프로그램에 맞게 구현, API 값은 가져다 쓰기")대로 `threads-affiliate-poster`의 쿠팡 클라이언트(2026-09-11 실계정 실호출 검증)를 검토해 `threads-content-ops/lib/coupang.ts`로 옮겼다. **"API 값"은 운영자 값이 아니라 회원이 `user_api_keys`에 저장한 본인 `coupang_access_key`/`coupang_secret_key`** — 두 프로그램이 같은 항목을 공유하므로 한 번 등록하면 둘 다 쓴다.
- `콘텐츠 소스` 탭에 쿠팡 검색 패널(검색 → 결과 카드 → `소스로 저장`)을 추가했다. 쿠팡 제약(시간당 10회·키워드당 10개, 누적 매출 15만원 이후 키 활성화)과 일반 쇼핑 주소 거부(제휴 링크만 저장), 미리보기는 일반 상품 주소로 여는 규칙을 반영했다. 루트 `lib/apiKeys.ts` 타입에 `youtube_api_key`/`coupang_*` 추가(기존 `tsc` 오류 해소).
- 검증: 모의 응답으로 서명 재계산 일치·응답 해석·오류 안내 4종·링크 검사 7종·사진 호스트 검사(스푸핑 포함)를 확인했다. **실제 쿠팡 키로 검색한 확인은 아직 못 했다**(회원 키 필요). DB 변경 없음.
- **남은 일(다음 순서):** 네이버 브랜드 커넥트 링크 분석 → 소스+계정 운영정보 초안 생성 → 댓글 → 성과 → 안전한 예약 실행.

## Threads Content Ops v1.29 — 대시보드 두 칸 배치 수정 (2026-10-06)

- 주인님 스크린샷의 증상(`운영·API 상태` 칸이 세로로 찌그러지고 `실제 작업 진행`이 화면 밖으로 넘침)을 고쳤다. 원인은 `grid-cols-[0.85fr_1.15fr]`가 긴 초안 문장(`truncate`) 때문에 열 폭을 내용 폭으로 늘린 것 — `minmax(0,…fr)` + 카드 `min-w-0`으로 해결(`OperationsDashboard.tsx`). 임시 미리보기 페이지로 같은 긴 문장을 넣어 1500px에서 눈으로 확인 후 삭제했다. DB 변경 없음, 다음 단계 순서는 아래 v1.28 항목 그대로.

## Threads Content Ops v1.28 — 콘텐츠 소스 큐 UI·등록 (2026-10-06, Codex → Claude 인계 후 첫 작업)

- `threads-content-ops/docs/CLAUDE_CONTINUATION.md`의 우선순위 1번을 구현했다. 사이드바 흐름 **4. 콘텐츠 소스**(`?tab=sources`)에서 회원이 계정별로 블로그·쿠팡 파트너스·네이버 브랜드 커넥트 링크를 등록·수정·삭제하고 상태(사용 가능/사용 완료/보관)를 바꾼다. 외부 수집·분석은 하지 않고 입력값만 본인 계정에 저장하며, 대시보드 카드는 실제 등록 건수만 표시한다(`작업 가능`으로 표시하지 않음).
- DB 스키마 변경 없음(v1.27의 `tco_content_sources` 사용). 운영 DB에서 RLS 켜짐·authenticated 전용 4정책·anon 권한 없음·테스트 데이터 0건을 재확인했다. 서버 동작은 권한 검사 → `user_id` 제한 → 본인 계정 소유 확인 순이며 예상된 오류는 `{ ok, error }`로 반환한다. 링크는 http/https만 허용(`javascript:`·`data:` 거부).
- **남은 일(다음 순서):** 쿠팡 파트너스 실제 검색 연동 → 네이버 브랜드 커넥트 링크 분석 → 소스+계정 운영정보로 초안 생성 → 댓글 → 성과 → 안전한 예약 실행. 기존 `youtube_api_key` 타입 오류(루트 `lib/apiKeys`)는 별도 정리 필요. 로그인한 화면에서 실제 등록·수정·삭제 클릭 확인은 아직 못 했다.

## Threads Content Ops v1.27 — 계정별 운영정보·소스 큐 DB 기반 (2026-10-06)

- 주인님 승인 뒤 운영 DB에 `tco_operation_profiles`, `tco_content_sources`를 적용했다. 두 테이블은 `user_id` owner-only RLS, 작업별 select/insert/update/delete 정책, anon 권한 회수, authenticated 최소 권한만 갖는다. 점검 쿼리로 두 테이블 모두 RLS=true·정책 4개를 확인했다.
- `/threads-content-ops?tab=accounts`를 세 번째 번호형 업무 흐름으로 추가했다. 회원은 자신이 연결한 Threads 계정별로 주제·말투·금지 항목·운영 비율·목표·시간을 실제로 저장한다. 서버 액션은 프로그램 접근 권한과 계정의 user_id 소유를 다시 검사한다.
- 소스 큐 테이블은 블로그·쿠팡·네이버 브랜드 커넥트의 실제 수집/등록을 연결할 다음 단계용이다. 아직 외부 상품/성과/댓글을 지어내 표시하지 않는다.
- **Claude 재개 문서:** `threads-content-ops/docs/CLAUDE_CONTINUATION.md`에 구현 이력(v1.17~v1.27), 다음 단계 순서(소스 큐 → 쿠팡 → 네이버 → 초안 → 댓글 → 성과 → 안전한 예약), 멀티테넌시 금지사항, 루트 AIMaster 배포 절차를 고정했다. 다음 작업은 이 문서를 먼저 읽고 `desktop/`이나 기존 Threads 프로그램을 건드리지 않는다.

## Threads Content Ops v1.26 — 웹 운영 대시보드 1단계·흰색 웹 표준 (2026-10-06)

- 원본 프로그램 스크린샷을 기능 구조 참고 자료로 재분석했다. AIMaster 웹 화면은 전체 흰색 베이스를 유지하며, 원본 Electron의 다크 테마는 가져오지 않는다.
- `/threads-content-ops` 대시보드에 실제 계정·초안·예약·발행 이력 기반의 운영 계정, 5개 상태 지표, 즉시 작업 소스, 운영·API 상태, 실제 작업 진행, 전체 예약 작업을 구현했다. 없는 쿠팡/네이버/블로그 소스와 댓글/성과 데이터는 가짜 값 대신 `설정·구현 필요` 또는 빈 상태로 표시한다.
- 다음 기능 단위: 원본의 계정별 운영정보, 소스 큐(블로그·쿠팡·네이버 브랜드 커넥트), 댓글, 성과 이력을 위한 사용자별 DB 테이블·RLS. 이는 스키마 변경 승인이 필요한 다음 단계다.

## Threads Content Ops v1.25 — OpenAI 응답 호환 (2026-10-06)

- Responses API 응답의 `output_text`와 `output[].content[].text` 형식을 함께 읽고, 잘못된 키/권한·할당량·빈 응답을 서로 구분해 표시한다.

## Threads Content Ops v1.24 — 생성 오류 화면 방지 (2026-10-06)

- OpenAI 생성 실패를 Server Action 예외로 던져 Next.js 오류 경계가 보이던 문제를 수정했다. 생성 액션은 사용자에게 보여줄 안전한 결과 객체를 반환하고, UI는 안내 문구로 표시한다.

## Threads Content Ops v1.23 — 복수 계정 운영 (2026-10-06)

- 원본의 복수 계정 운영을 웹 설정에 반영했다. 계정을 추가 연결하면 모든 본인 계정과 토큰 만료 시각을 표시하며, 선택한 계정만 연결 해제한다.
- `disconnectThreadsAccount`는 계정 ID와 현재 회원 `user_id`를 함께 조건으로 사용한다. 한 계정을 해제하며 같은 회원의 나머지 계정까지 삭제하던 위험을 제거했다.

## Threads Content Ops v1.22 — 운영 대기열·YouTube 소재 (2026-10-06)

- 사용자 제공 원본/영상 구간(YouTube API 설정, 자동화 시작, 즉시 발행, 오류 처리)을 다시 대조했다. 웹형 우선 구현 범위는 회원별 YouTube 공개 메타데이터 소재, 초안·예약·실패 대기열, 즉시 발행의 안전한 분리다.
- `?tab=create`에 YouTube URL 소재 불러오기를 추가했다. 회원 본인의 `youtube_api_key`만 사용하며, 공개 title/description을 1,200자 이내의 AI 초안 소재로 넣는다. 영상 내용을 추측해 수집하거나 공용 키로 폴백하지 않는다.
- `?tab=manage`는 기존 `tco_posts` 상태를 사용해 예약(최소 5분, 최대 180일), 취소, 실패 글 재검토를 지원한다. 모든 서버 액션은 프로그램 권한·현재 회원 `user_id`·기대 상태를 함께 확인한다.
- **남은 핵심 단계:** Vercel Cron용 `CRON_SECRET` 추가와 플랜의 최소 실행 간격 확인이 필요하다. 이는 환경변수 변경이므로 승인 후 보호된 실행 워커와 cron 항목을 연결한다. 그 전에는 예약을 보관만 하며 실제 자동 발행으로 표시하지 않는다.

## Threads Content Ops v1.17 — credential save-state clarity (2026-10-06)

- `threads-affiliate-poster` 설정 화면과 같은 `rounded-2xl / neutral-100 / border-2` 섹션 포맷으로 교체했다. 각 API 키는 개별 저장 버튼·마스킹 등록 상태를 갖고, Threads 계정 상태와 연동 매뉴얼 영역을 같은 방식으로 제공한다.
- 저장값 보안상 재표시하지 않는 동작을 안내하고, 비활성 버튼도 `교체 입력 필요`/`값 입력 필요`로 명시해 저장 버튼이 보이지 않는 것처럼 보이는 혼동을 없앴다.
- 프로그램 전용 화면의 배경 단계와 여백을 AIMaster 다크 레이아웃에 맞췄다. 본문은 `#0a0a0f`, 좌측 고정 메뉴는 `#12121a`, 경계는 `#222232`이며 카드만 한 단계 위로 올라온다.
- `API키등록·플랫폼연동`은 번호형 업무 흐름 바로 아래 유틸리티 메뉴로 이동했다. 로그인 이메일과 로그아웃도 그 아래에 이어 붙였으며, 하단 고정 영역을 제거했다.
- 기존 자동화 프로그램(`threads`, `threads-affiliate-poster`)과 동일하게, 프로그램 전용 화면은 흰색 배경·중성 회색 경계·어두운 글자·밝은 카드로 통일했다.

## Threads Content Ops v1.21 — exact disconnect button color (2026-10-06)

- 쇼핑제휴 설정 스크린샷의 연결 해제 버튼 중심 RGB(231, 0, 11)를 실측해 콘텐츠 운영 버튼 기본색을 `#e7000b`로 맞췄다. 이전 red-600은 같은 이름의 위험 스타일이어도 실제 색상이 달랐다.

## Threads Content Ops v1.20 — account disconnect visual parity (2026-10-06)

- `?tab=settings`의 Threads 계정 연결 해제 버튼을 쇼핑제휴 자동화 danger 버튼과 같은 red-600 기본색, red-500 hover, red-300 비활성색 및 패딩으로 통일했다.

## Threads Content Ops v1.19 — exact Meta OAuth callback (2026-10-06)

- Meta 오류 1349168은 회원 Meta 앱의 OAuth 허용 URI에 현재 프로그램 콜백이 없을 때 발생한다. 쇼핑제휴 자동화의 설정 흐름을 대조해, `https://www.buylife.xyz/api/threads-content-ops/callback`을 OAuth 시작·코드 교환·화면 안내가 공통으로 사용하도록 고정했다.
- 설정 화면에 Meta 앱 **사용 사례 → Threads API 액세스 → 설정 → 유효한 OAuth 리디렉션 URI**라는 정확한 입력 위치, URI 일치 조건, Development 모드 Tester 역할 등록 조건을 안내한다.

## Threads Content Ops v1.18 — credential rows and account disconnect (2026-10-06)

- API키등록·플랫폼연동 화면을 Threads 쇼핑제휴 자동화의 등록 정보 행 형식으로 맞췄다. 저장된 키는 마스킹 값, 등록됨 상태, 수정·삭제만 표시하고 수정할 때에만 입력칸을 연다.
- OpenAI, Threads 앱 ID/시크릿, YouTube, 쿠팡 키를 각각 실제로 저장·수정·삭제할 수 있다. 삭제 Server Action은 프로그램 이용 권한과 현재 회원 user_id를 모두 확인한다.
- 연결된 Threads 계정은 사용자명·토큰 만료 시각과 연결 해제를 표시한다. 연결 해제는 tco_threads_accounts의 본인 행만 삭제하며, 초안과 발행 이력은 유지한다.

## Threads Content Ops v1.11 — sidebar standard correction (2026-10-06)

- `docs/SIDEBAR_LAYOUT_STANDARD.md`와 `D:\PDS\좌측메뉴.png`를 확인해, 공용 AIMaster 사이드바와 프로그램 메뉴가 중복되던 오류를 수정했다. `/threads-content-ops`는 이제 고정 프로그램 전용 사이드바 하나만 표시한다.
- 표준 순서(프로그램명·버전·다른 프로그램 보기·대시보드·번호형 작업 흐름·API키등록·플랫폼연동·하단 계정/로그아웃)를 적용했다.

## Threads Content Ops v1.10 — program sidebar navigation (2026-10-06)

- 기존 독립 자동화 프로그램과 동일한 흐름형 좌측 메뉴를 추가했다. 대시보드, 콘텐츠 작성, 초안·발행 관리, API키등록·플랫폼연동으로 웹 작업 영역을 `?tab=` 방식으로 전환한다.

## Threads Content Ops v1.09 — web operations dashboard and catalog thumbnail (2026-10-05)

- 기본 진입 화면을 PC 브라우저용 콘텐츠 운영 대시보드로 교체했다. 설정 폼은 접힌 보조 영역으로 이동하고, 계정·초안·발행 이력·운영 상태가 첫 화면에 표시된다.
- 실사형 웹 자동화 작업환경 썸네일을 새로 생성해 `program-images/catalog/threads-content-ops-thumbnail.png`에 등록했다. 소스는 `threads-content-ops/assets/threads-content-ops-thumbnail-v2.png`.

## Threads Content Ops v1.08 — explicit web publishing (2026-10-05)

- 초안을 수정·저장하고, 회원이 브라우저 확인창에서 최종 승인한 경우에만 Threads 공식 생성/발행 API를 호출하는 1회 발행을 추가했다.
- 발행 전 소유자·이용 권한·연결 토큰 만료를 확인하며, 성공·실패 결과를 `tco_posts`에 기록한다. 예약/자동 발행은 아직 없다.

## Threads Content Ops v1.07 — member-key draft generation (2026-10-05)

- 연결된 회원이 주제를 입력하면 회원 본인의 `user_api_keys.openai` 키로만 Threads 초안을 생성하고, 소유자 RLS가 적용된 `tco_posts`에 `draft`로 저장한다. 버튼 클릭 전 AI 호출은 없고, 운영자 키 폴백도 없다.
- 다음 단계는 초안 검토·수정 후의 명시적 1회 발행이다. 예약·자동 발행은 아직 만들지 않는다.

## Threads Content Ops v1.06 — web OAuth account connection (2026-10-05)

- `/threads-content-ops`에 회원별 OpenAI/Threads 앱 자격증명 저장과 **내 Threads 계정 연결하기**를 실제로 추가했다.
- OAuth `state`는 예측 가능한 사용자 ID 대신 HTTP 전용·10분 만료 난수 쿠키로 검증한다. 콜백은 회원 권한과 회원 소유 앱 자격증명을 다시 확인하고, 장기 토큰 교환 후 `tco_threads_accounts`에만 저장한다.
- 다음 단계는 초안 생성·저장, 그다음 명시적 1회 발행이다. 아직 발행/예약 기능은 구현되지 않았으므로 동작한다고 안내하지 않는다.

## Threads Content Ops v1.05 — web-first multi-tenant reset (2026-10-05)

- User clarified the program must run online, not via a local installation. Desktop/token work is reference-only and must not be extended.
- Applied production migration creating tco_threads_accounts and tco_posts; both require user_id and owner-only authenticated RLS policies.
- Replaced the member page messaging with the web-first architecture. See threads-content-ops/docs/WEB_ARCHITECTURE.md.


## Threads Content Ops catalog activation (2026-10-05)

- User approved public catalog registration. Set `programs.is_active=true` for `threads-content-ops`; verified v1.04, thumbnail URL, and app URL in the shared production DB.


## Threads Content Ops thumbnail (2026-10-05)

- Generated and visually reviewed a 16:9 photorealistic Korean SaaS-content-operations thumbnail (no text, logo, or watermark).
- Uploaded it to public Supabase Storage path `program-images/catalog/threads-content-ops-thumbnail.png` with cache-busting URL and updated `programs.thumbnail_url`.
- Source asset: `threads-content-ops/assets/threads-content-ops-thumbnail-v1.png`.

## Threads Content Ops v1.02 — AI generation API milestone (2026-10-05)

- Added `POST /api/threads-content-ops/generate` as the server-side replacement foundation for the imported desktop source's local Codex CLI calls.
- The route verifies the desktop personal-access token and live program entitlement, resolves only the member's own `user_api_keys.openai` key, and has no operator/global API-key fallback.
- OpenAI Responses API uses `gpt-4o-mini` with strict Structured Outputs and validates the legacy `AgentResult` compatible payload before returning it. Web search is deliberately not enabled in this phase.
- Root build passed. No paid model call was made because a real test must use an authorized test member's registered key.
- Continuation: implement and test an OS credential-store backed `AIMasterAgentRunner` in `threads-content-ops/desktop`, then replace the imported Codex startup/status/settings pieces without touching existing Threads programs. See `threads-content-ops/docs/AI_GENERATION_API.md`.

 
## Threads 콘텐츠 운영 자동화 (threads-content-ops v1.02 기반, 2026-10-05)

- 새 AIMaster 서브프로젝트 `threads-content-ops/`를 만들고, 사용자가 지정한 Electron 기반 원본을 `desktop/`으로 편입했다. 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 수정하지 않았다.
- 루트 AIMaster에 전용 경로 `/threads-content-ops`, 전용 기기 연동 토큰 발급/폐기 액션, `GET /api/threads-content-ops/whoami` 검증 API를 추가했다. 토큰 유효성뿐 아니라 `threads-content-ops` 프로그램 이용 권한을 매 요청 확인하며, 페이지와 API에 `force-dynamic`/`force-no-store`를 선언했다.
- 운영 DB에 프로그램(id `b94cf8ad-edaf-4878-9889-ab196e6450aa`, slug `threads-content-ops`, `v1.01`)과 기본 1/2/3개월 요금제를 등록했다. 미완성 제품이 노출되지 않도록 `is_active=false`로 유지 중이다. SQL 기록은 `threads-content-ops/supabase/migrations/0001_register_threads_content_ops.sql`이다.
- 다음 단계는 데스크톱 앱의 Codex CLI 의존을 회원별 AIMaster API 키 구조로 전환하는 작업이다.
- 원본 기준선: Node 24.20.0, `npm.cmd run typecheck`·`npm.cmd run lint` 통과. 테스트 파일이 없어 `npm.cmd test`는 종료 코드 1이며, 의존성 감사는 37건(critical 1건 포함) 경고를 냈다. 설치 파일 생성·배포 전 의존성 정리와 테스트 추가가 필수다.

## Threads AI Planner — shared mobile and desktop interface (v1.19, 2026-10-05)

- Mobile uses a compact header and fixed bottom tabs for Planner, Saved, and Settings; desktop keeps the left sidebar.
- The mobile fixed generation action reuses the existing `handleGenerate()` flow, including API-key and entitlement behavior.
- Provider/model controls now live in collapsible advanced-AI settings, keeping the mobile first action focused.
- See `threads-easy-planner/AGENTS.md` for the continuation rules. Keep code and `programs.version` synchronized at `v1.19`.








## Threads AI 기획 자동화 (threads-easy-planner v1.23, 2026-10-05)

- **초보자 가이드를 '사용 매뉴얼'로 전면 개편 및 직관적 단계별 순서 가이드 구축 (v1.23)**:
  - 주인님 요청: "좌측 메뉴 초보자 가이드를 없애고 이 자동화 프로그램 사용법을 보기 쉽고 직관적으로 이해할 수 있도록 순서대로 설명해주는 매뉴얼로 변경 작업해줘" 완벽 구현.
  - `Sidebar.tsx`, `MobileNavigation.tsx`: 메뉴명을 '초보자 가이드' ➔ '사용 매뉴얼'로 변경.
  - `guide/page.tsx`: 프로그램 실전 사용 순서(STEP 0 API키 등록 ➔ STEP 1 글감 준비 ➔ STEP 2 5대 훅 문장 교체 ➔ STEP 3 자댓글 CTA ➔ STEP 4 자동 저장 및 보관함 활용)를 한눈에 이해할 수 있는 실전 가이드로 전면 개편.
  - **작업 과정, 주의사항, 핵심 지침 문서화 완비 (2026-10-05 주인님 지시)**:
    - `threads-easy-planner/AGENTS.md`: 작업 표준 워크플로우 6단계, 핵심 주의사항 6가지, 다음 작업 시 핵심 지침 섹션 신설 및 상세 기술.
    - `docs/ERROR_LESSONS.md`: v1.23 실전 매뉴얼화 및 프로그램 UI 연계 가이드 작성 지침 추가.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.23`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.22, 2026-10-05)

- **글 생성 즉시 보관함 자동 저장(Auto-save) 및 스토리지 안전망 강화 (v1.22)**:
  - 주인님 제보: "왜 저장했는데 보관함에 저장된 콘텐츠가 없다고 나오지?" 현상 원인 규명 및 완벽 조치.
  - 원인: 글 생성 후 수동으로 상단 우측 '보관함에 저장' 버튼을 누르지 않으면 저장이 누락되던 수동 의존 구조 + DB 테이블 미생성 환경에서의 로컬 스토리지 Fallback 안전망 미흡.
  - 조치:
    1) `PlannerApp.tsx`: `handleGenerate` 성공 즉시 백그라운드에서 `savePlanToStorage`를 자동 호출하는 Auto-save 기능 탑재. 결과 카드의 버튼도 `[✅ 보관함 저장완료]`로 즉시 전환.
    2) `savedPlansStorage.ts`: `getLocalPlans` 파싱 검증 강화 및 DB 미연결 시 로컬 스토리지 Fallback 100% 안전 보관 보장.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.22`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.21, 2026-10-05)

- **아코디언 타이틀 우측 불필요한 '나만의 맞춤 글' 배지 제거 (v1.21)**:
  - 주인님 요청: `맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력)` 우측에 붙어 있던 불필요한 `나만의 맞춤 글` 배지 삭제.
  - `src/components/planner/PlannerApp.tsx`: 배지 span 제거 완료.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.21`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.20, 2026-10-05)

- **맞춤글 생성 아코디언 타이틀 직관적 개편 (v1.20)**:
  - 주인님 요청: 상세 템플릿 폼의 아코디언 타이틀을 기존 `내 실제 경험담 · 상품명 · 타깃 직접 입력하기 (상세 템플릿 폼)`에서 `✍️ 맞춤글 생성 (내 실제 경험담 · 상품명 · 타깃 직접 입력)`으로 직관적 수정.
  - `src/components/planner/PlannerApp.tsx`: 타이틀 및 주석 문구 개편 완료.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.20`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.19, 2026-10-05)

- **모바일 반응형 최적화 및 하단 고정 생성 네비게이션 연동 (v1.19)**:
  - 데스크톱/모바일 단일 코드베이스 반응형 UX 개편:
    - `Sidebar.tsx`: `md` 이상에서만 표시(`hidden md:flex`).
    - `MobileNavigation.tsx` 신규 도입: 모바일 상단 미니 헤더 및 하단 고정 탭(기획하기, 보관함, 설정) 연동.
    - `PlannerApp.tsx`: 모바일 화면 하단에 고정 생성 버튼(`이 내용으로 글 생성하기`) 제공, 고급 AI 모델 설정 접이식(`details`) 정리.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.19`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.47, 2026-10-05)

- **게시글 30일 자동삭제 정책 안내 및 삭제 버튼 우측 남은 시점 표시 연동 (v1.47)**:
  - 주인님 요청: `https://threads-affiliate-poster.vercel.app/posts` "게시될 글은 30일후 자동삭제된다는 문구과 '삭제' 버튼 우측 남은 시점 표시해줘" 완벽 구현.
  - `src/lib/mediaRetention.ts`: `getRemainingRetentionTime(createdAt)` 계산 헬퍼 함수 구현 (30일 보관 만료 시점 기준 잔여 일/시간 포맷팅, 만료 시 '삭제 예정' 표시, 잔여 3일 이하 긴급 빨간색 강조).
  - `src/app/(dashboard)/posts/page.tsx`:
    - 상단에 `⏳ 게시글 및 미디어 자동 보관 정책 (30일 후 자동 삭제)` 안내 배너 추가.
    - 게시글 목록의 각 `DeleteButton` 우측에 남은 시점 배지(`remaining.text`) 렌더링.
  - `src/app/(dashboard)/posts/[id]/page.tsx`:
    - 상세 페이지 하단 삭제 버튼 우측에도 일관되게 남은 시점 배지 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.47`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.46, 2026-10-05)

- **Zod validation.ts의 단일 미디어 배타적 규칙 잔존 버그 해결 (v1.46)**:
  - 주인님 제보: 이미지와 영상 첨부 후 포스팅 시 "이미지와 영상은 동시에 첨부할 수 없습니다" 에러 발생.
  - 원인: `src/lib/validation.ts`의 `postFormSchema`에 과거 단일 미디어 시절의 동시 첨부 금지 규칙(`data.imageUrl && data.videoUrl`) 및 단일 URL 검증(`z.string().url()`)이 남아 있어 서버 액션 폼 검증(`parsePostForm`)에서 탈락함.
  - 조치: `src/lib/validation.ts`에서 동시 첨부 금지 규칙을 완전 삭제하고, 쉼표 다중 URL을 지원하는 `mediaUrlStringSchema`로 교체하여 이미지+영상 혼합 캐러셀(최대 20개) 포스팅 정상화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.46`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.45, 2026-10-05)

- **혼합 미디어 캐러셀(이미지+동영상 동시 포스팅) 및 30일 보관/자동·수동 삭제 파이프라인 (v1.45)**:
  - 주인님 지시 반영: 쓰레드 포스팅 시 이미지와 동영상을 동시에 혼합하여 최대 20개까지 캐러셀로 발행할 수 있도록 파이프라인 전면 개편.
  - `ProductPostForm.tsx`: 이미지와 영상의 상호 배타적 초기화를 제거하고, 통합 캐러셀 그리드에서 `[➕ 이미지 추가]`와 `[🎬 영상 추가]`로 자유롭게 추가/순서 이동/동영상 미리보기를 지원.
  - `PostMediaViewer.tsx`: 게시물 상세 페이지에서 이미지와 영상이 함께 들어있는 혼합 캐러셀을 슬라이드로 부드럽게 탐색 및 동영상 인라인 재생 지원.
  - **30일 자동 삭제**: `src/lib/mediaRetention.ts`, `src/app/api/cron/cleanup-media/route.ts`, `vercel.json`(매일 03:00 KST)을 통해 등록 시점 기준 30일 경과 미디어 및 게시물 자동 영구 삭제.
  - **사용자 수동 삭제**: 작성 폼 개별 ✕ 및 전체 미디어 삭제 시 `deleteMediaFileAction`으로 스토리지 파일 즉시 회수, 게시글 삭제 시(`deletePostAction`)에도 Storage 파일 동시 정리.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.45`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.44, 2026-10-05)

- **불필요한 중복 이미지 추가/삭제 관리 박스 제거 및 캐러셀 UI 일원화 (v1.44)**:
  - 주인님 피드백(`이미지추가.png`): "밑에 이미지 추가 기능이 있는데 박스친 붉은 색 영역은 필요 없지 않아?" 완벽 반영.
  - 상단의 거대하고 중복되던 "사용자 이미지 추가 및 삭제 관리" 박스(파일 첨부 버튼, 웹 URL 입력창)를 완전히 제거하여 화면을 깔끔하게 정리.
  - 캐러셀 그리드 내 `[➕ 이미지 추가]` 카드 및 빈 상태 점선 박스 내 `[📂 내 PC에서 이미지 파일 추가]` 버튼으로 파일 선택 창 즉시 연결.
  - 캐러셀 헤더 우측에 `[🗑️ 전체 이미지 삭제]` 버튼을 단정하게 통합 배치.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.44`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.43, 2026-10-05)

- **최종 발행 방식 선택 버튼 순서 변경 및 임시저장하기 기본 선택 적용 (v1.43)**:
  - 주인님 피드백(`게시글.png`): "임시 저장하기를 왼쪽으로 하고 기본값으로 선택되게 해줘" 완벽 반영.
  - 새 게시글 작성 화면 STEP 3 버튼 순서 재배치: [📁 💾 임시저장하기]를 왼쪽 첫 번째로, [🚀 ⚡ 즉시 Threads에 포스팅하기]를 오른쪽 두 번째로 배치.
  - 왼쪽 [임시저장하기] 버튼을 기본 주 버튼(Primary: g-neutral-900 text-white) 및 `기본값` 배지 부여로 시각적 기본값 지정.
  - 오른쪽 [즉시 Threads에 포스팅하기] 버튼은 보조 버튼(Secondary: g-white text-neutral-900 border-2 border-neutral-300)으로 배치.
  - APP_VERSION 및 DB programs.version을 1.43으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.42, 2026-10-05)

- **캐러셀 다중 이미지(쉼표 구분) 파싱 및 상세 페이지 미디어 뷰어(PostMediaViewer) 연동 (v1.42)**:
  - 주인님 제보: `/posts/[id]` 접근 시 이미지가 보이지 않는 버그 해결.
  - 쉼표(`,`)로 연결된 다중 이미지 URL을 분할 파싱하여, 여러 장일 때 좌우 슬라이드 탐색(◀, ▶), 카운트 배지(`📷 N / M장`), 하단 미니 썸네일 스트립 및 클릭 시 `ImageLightboxModal` 전체 화면 확대 뷰어 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.42`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.41, 2026-10-05)

- **Server Component 렌더링 500 에러 해결: PostContentRenderer 'use client' 명시 (v1.41)**:
  - 주인님 제보: `/posts/[id]` 접근 시 `This page couldn't load / A server error occurred.` 에러 발생.
  - Vercel 런타임 로그 확인 결과, Server Component인 `posts/[id]/page.tsx`에서 사용하는 `PostContentRenderer.tsx`에 `"use client";` 지시어가 빠져 있어 `onClick` 이벤트 직렬화 에러 발생 확인.
  - `PostContentRenderer.tsx`에 `"use client";`를 명시하여 500 에러 완벽 해결.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.41`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.40, 2026-10-05)

- **NanoBanana 2-2K 기본 모델 선택 강제화 및 이전 브라우저 캐시 완벽 격리 (v1.40)**:
  - 주인님 피드백 반영: `/posts/new` 진입 시 이미지 모델로 `NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)`이 확실하게 기본 선택되도록 설정.
  - 브라우저 localStorage에 남아있던 이전 1K 캐시로 인해 덮어써지던 현상을 방지하기 위해, NanoBanana 공급자일 경우 무조건 `nanobanana-2-2k`로 강제 초기화 및 스토리지 동기화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.40`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.39, 2026-10-05)

- **생성 및 등록된 이미지 클릭 시 전체 이미지 확대 뷰어(라이트박스 모달) 연동 (v1.39)**:
  - 새 게시글 작성 화면(`/posts/new`)에서 썸네일 클릭 시 고화질 원본 전체 화면 라이트박스 모달(`ImageLightboxModal`) 팝업.
  - 마우스 호버 시 돋보기 아이콘 및 "확대 보기" 오버레이 표시.
  - 모달 내 이전/다음 탐색(◀, ▶, 키보드 좌우 화살표), ESC 키 닫기, 새 탭 원본 보기, 하단 썸네일 스트립 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.39`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.38, 2026-10-05)

- **하단 제휴 문구 '상품링크:' 통일 및 실제 클릭 가능 하이퍼링크 연동 (v1.38)**:
  - `게시글.png` 피드백 반영: 상단 광고 고지와 중복되지 않도록 하단 CTA를 `상품링크: https://...`로 통일 (쿠팡, 알리, 네이버, 토스 전체).
  - 본문 내 URL을 자동 감지하여 새 탭으로 열리는 클릭 가능한 파란색 하이퍼링크(`PostContentRenderer` 컴포넌트 신설)로 렌더링.
  - 게시글 결과 상세 화면(`/posts/[id]`), 트렌드 탐지기(`/trends`), 새 글 작성 폼(`/posts/new`) 검수 미리보기에 연동.
  - 기존 저장된 레거시 텍스트('지금 쿠팡에서 확인' 등)도 화면 표시 시 `상품링크:`로 자동 치환.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.38`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.37, 2026-10-05)

- **NanoBanana 2-1K (표준 경량 모델) 네이밍 포맷 통일 및 2K 기본값 복원 (v1.37)**:
  - 주인님 피드백 반영: `NanoBanana 2-1K (표준 경량 모델)` 형식으로 전체 나노바나나 라인업 네이밍 포맷 일치 (`NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)`, `NanoBanana 2-1K (표준 경량 모델)`, `NanoBanana 2-4K (울트라 HD)`, `NanoBanana Pro (프로페셔널 정밀 비주얼)`).
  - 나노바나나 기본 선택값을 `2-2K`(`nanobanana-2-2k`)로 재설정하고 드롭다운 최상단 배치.
  - 브라우저 localStorage 이전 캐시 간섭 방지 마이그레이션 플래그(`threads_post_img_default_v137`) 적용으로 NanoBanana 선택 시 2K 모델 기본 선택 보장.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.37`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.36, 2026-10-05)

- **글 생성 기본 선택 모델 GPT-4.1 설정 (v1.36)**:
  - 새 게시글 작성 화면(`/posts/new`) 진입 시 기본 선택 엔진 및 모델을 `GPT / GPT-4.1`로 항상 선택되도록 설정.
  - OpenAI 모델 목록 최상단 첫 번째 항목으로 `GPT-4.1` 배치.
  - 브라우저 localStorage 이전 캐시 간섭 방지 마이그레이션 플래그(`threads_post_ai_default_v136`) 적용.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.36`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.35, 2026-10-05)

- **실시간 프리뷰 & 검수 및 즉시 포스팅 vs 임시저장 2대 스마트 분기 프로세스 구축 (v1.35)**:
  - 사용자 프로세스 최적화 지시 완벽 반영: "생성된 그 자체로 자동 포스팅도 되고, 임시저장으로 생성된 콘텐츠와 이미지를 추가/삭제 영상 추가 후 최종 발행".
  - **안전 백업 생성**: 언제든 100% 즉시 원복할 수 있도록 `ProductPostForm.backup-v1.34.tsx` 백업 파일 생성 완료.
  - **1) 상단 실시간 원클릭 생성 액션 바**: `[ ⚡ AI 글 & 이미지 생성하기 ]` 클릭 시 페이지 이동 없이 현재 화면에 본문과 고화질 이미지를 즉시 렌더링.
  - **2) 자유로운 검수 및 편집**: 본문 `[ 🔄 AI 글만 다시 생성 ]`, 이미지 ✕ 삭제/추가/정렬, 동영상 첨부 등 화면에서 자유롭게 다듬기 지원.
  - **3) STEP 3 2대 스마트 분기 액션 버튼**:
    - 🚀 `[ ⚡ 즉시 Threads에 포스팅하기 ]`: 확인된 내용 그대로 즉시 발행 (미생성 상태 클릭 시 자동 생성 후 즉시 발행 원클릭 지원).
    - 📁 `[ 💾 임시저장하기 ]`: 보관함에 안전하게 임시저장.
    - ⏰ `[ 📅 예약 발행 접이식 영역 ]`: 특정 일시 예약 포스팅 지원.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.35`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.34, 2026-10-05)

- **글 생성 엔진 및 이미지 모델 선택 버튼 활성 주황색(Amber) 통일 (v1.34)**:
  - `색상.png` 스크린샷 피드백 반영: 모델별로 상이하던 선택 버튼 색상(검정, 보라, 파랑, 초록 등)을 배제하고, "선택된 모델은 지금 사용된 주황색으로 보여줘, 선택 안 된 건 흰색 바탕이고" 지시 완벽 구현.
  - 글 생성 엔진(GPT / Claude / Gemini) 및 이미지 모델(NanoBanana / GPT Image / FLUX 2.0 / Z-Image) 모두:
    - 선택 시: 선명한 주황색(`border-amber-500 bg-amber-500 text-white shadow-xs`)
    - 미선택 시: 깔끔한 흰색 바탕(`border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100`)
  - STEP 2 전체 영역이 통일감 있는 프리미엄 주황색 테마로 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.34`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.33, 2026-10-05)

- **AI 이미지 생성 버튼 상시 주황색 노출 및 비활성화 회색 변환 방지 (v1.33)**:
  - `주황색.png` 스크린샷 피드백 반영: 프롬프트 미입력 시 버튼이 `disabled` 상태로 인해 회색 박스로 변하여 주황색 테마가 보이지 않던 문제를 근본 해결.
  - `Button.tsx`의 `amber` variant에서 `disabled:opacity-60`을 적용하여 비활성화 시에도 주황색 톤 유지.
  - `ProductPostForm.tsx`에서 버튼 `disabled` 조건 중 `(!imagePrompt.trim() && !selectedProduct)`를 제거하여, 초기 진입 시에도 상단 Gemini 버튼과 동일한 선명한 주황색(`bg-amber-500 text-white`)으로 상시 노출.
  - 버튼 내 이모티콘을 화이트 원형 칩(`bg-white`) 내 `✨`로 구성하여 시인성 및 가독성 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.33`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.32, 2026-10-05)

- **AI 이미지 생성 버튼 상단 일치형 주황색(Amber) 테마 및 이모티콘 독립 색상 연동 (v1.32)**:
  - "위에 주황색 색상으로 맞춰줘", "이모티콘은 다른 색상으로 해야겠지" 피드백 반영: 상단의 대표 이미지 모델 선택 버튼(NanoBanana / Google Gemini)과 동일한 따뜻한 주황색(`amber-500`)으로 색상 일치.
  - `Button` 컴포넌트에 `amber` variant(`bg-amber-500 text-white hover:bg-amber-600`)를 신설 및 적용하여, 상단 영역과 완벽한 톤앤매너 일체감 및 뛰어난 가독성 구현.
  - 버튼 내 이모티콘을 반투명 화이트 칩(`bg-white/25`) 위에 화사한 골드 옐로우 `Sparkles` 아이콘(`fill-yellow-300 text-yellow-100`)으로 구성하여, 주황색 배경 위에서 이모티콘이 묻히지 않고 선명하게 돋보이도록 차별화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.32`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.31, 2026-10-05)

- **AI 이미지 생성 버튼 바탕색 및 가독성 개선 (v1.31)**:
  - 기존 흰색 바탕(secondary)으로 인해 흰색 카드 및 인풋 필드 옆에서 눈에 잘 띄지 않던 피드백 반영.
  - `Button` 컴포넌트에 `purple` variant(`bg-purple-600 text-white hover:bg-purple-700`)를 신설 및 적용하여, 선명한 보라색 배경 위의 흰색 텍스트로 시인성과 가독성을 극대화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.31`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.30, 2026-10-05)

- **프롬프트 인풋 한 줄 확장 및 생성 장수 상단 모델 옆 재배치 레이아웃 개편 (v1.30)**:
  - `이미지 프롬프트.png` 스크린샷 피드백 반영: 모델 선택 아래 좁게 몰려있던 프롬프트 입력창을 가로 전체 폭(`flex-1`)으로 시원하게 확장.
  - 생성 장수 드롭다운(`🔢 생성 장수`)은 윗줄의 세부 실행 모델 드롭다운 우측 공간에 나란히 배치(`grid-cols-1 sm:grid-cols-[1fr_auto]`).
  - 한 줄로 넓어진 프롬프트 인풋 바로 우측에 `✨ AI 이미지 생성` 버튼을 배치하여 프롬프트 작성 편의성과 시각적 균형감 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.30`으로 갱신했다.

## 쇼츠 떡상 분석·대본 자동화 신설 (shorts-viral-studio v1.01, 2026-10-04)

- 주인님이 준 유튜버 튜토리얼 소스(`D:\PDS\index.html`)를 이 플랫폼 규격으로 다시 만든 신규 서브프로젝트 `shorts-viral-studio/`를 만들어 **배포·등록까지 완료**했다. 라이브 https://shorts-viral-studio.vercel.app , 유료 기본 요금제(1·2·3개월) 등록, 카테고리 쇼츠.
- 흐름: 쇼츠 검색(떡상 등급) → 바이럴 분석(Gemini는 영상 직접 분석, GPT·Claude는 지표·댓글 기반 "추정" 표시) → 소재 6개 → 주제 확정 → 대본(씬당 한 문장) → 이미지·영상·BGM 프롬프트. 프로젝트는 `svs_projects`에 자동 저장(30일 보관), `.md` 내보내기.
- 운영 DB에 적용한 것: `svs_projects` 테이블(RLS 본인만, `pg_policies` 확인), `programs`/`pricing_plans` 3건 등록, `platform_guides`에 "YouTube Data API 키 발급받기" 매뉴얼(`72d39d06-…`) 신규 등록. SQL은 `shorts-viral-studio/supabase/migrations/0001~0002`.
- **2026-10-06 v1.04:** 사이드바 `다른 프로그램 보기` 링크를 `/programs`로 맞춰 재배포(소스는 `58c0f5d7`에서 이미 변경됨, 라이브만 이전 상태였음). 코드 변경 없이 버전·배포만.
- **2026-10-05 v1.03 프롬프트 보관함:** 왼쪽 메뉴 `📚 프롬프트 보관함`(`/vault`) + 6단계 `💾 보관함에 저장`. 새 테이블 `svs_saved_prompts`(주인님 승인, RLS 본인만, `pg_policies`·롤백 테스트로 확인)에 최종 이미지·영상·BGM 프롬프트 세트를 저장하고 검색·복사·.md·삭제. 유튜브 데이터는 담지 않아 30일 삭제 대상이 아님. 상세는 `shorts-viral-studio/AGENTS.md` 변경 이력.
- **2026-10-05 v1.02:** 최초 기본 AI 엔진을 GPT / GPT-4.1로 변경(`StudioProvider.tsx` 초기값, 저장 키 `svs_model_v2`로 올려 기존 선택값 초기화). 영상 직접 분석은 Gemini 선택 시에만 동작하므로 GPT 기본값에서는 "지표·댓글 기반 추정"으로 표시된다. `APP_VERSION`·DB `programs.version` 모두 v1.02.
- **2026-10-05 썸네일 등록 완료:** §13 실사 템플릿(한국인 남녀 크리에이터 + 상승 그래프·쇼츠 목록 화면 + 글로우 아이콘, 16:9)으로 생성해 `programs.thumbnail_url` 반영, 메인 상세 페이지에서 참조 확인.
- **남은 일:** ① 주인님이 실제 YouTube·Gemini 키를 설정 화면에 등록해 검색 1회 + 영상 1개 분석을 실검증(로그인 화면 클릭 검증과 실키 호출은 아직 못 함) ② 이상 있으면 v1.02. 상세·변경 이유는 `shorts-viral-studio/AGENTS.md`.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.29, 2026-10-04)

- **AI 이미지 생성 버튼 명칭 직관화 및 선별/완성 워크플로우 정립 (v1.29)**:
  - `ProductPostForm.tsx`에서 오해 소지가 있던 "✨ 이미지만 다시 생성" 버튼 명칭을 **`✨ AI 이미지 생성`** (다중 선택 시 `✨ 이미지 N장 생성`)으로 명확히 통일.
  - 사용자가 AI로 원하는 만큼 이미지를 생성하고, 마음에 드는 이미지만 선별하여 남기거나(✕ 삭제), 내 PC 파일/URL로 추가 등록하고 순서를 변경(◀ ▶)하여 최종 마음에 드는 비주얼로 완성할 수 있도록 안내 가이드 동기화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.29`로 갱신했다.
## 완료 — AI 이미지 스튜디오 카탈로그·대시보드 문구 (2026-10-04)

- **운영 DB는 이미 반영됨**: `programs`의 `slug='ai-image-studio'`에 아래 값이 적용되어 있다.
  - `short_desc`: `GPT Image·Gemini·FLUX.2·Z-Image 등 다양한 AI 엔진으로 1~10장 연속 생성과 세부 옵션 설정을 지원합니다.`
  - `version`: `v1.05`
- **배포됨**: `ai-image-studio`에서 `vercel deploy --prod --yes` 실행 및 Vercel 빌드 통과. 라이브 URL: `https://ai-image-studio.vercel.app/dashboard`.
- **로컬 빌드 통과**: `ai-image-studio`에서 `npm.cmd run build` 성공. PowerShell 실행 정책상 `npm` 대신 `npm.cmd`를 사용한다.
- **반영 파일**:
  - `ai-image-studio/app/(dashboard)/dashboard/page.tsx` — 대시보드 소개를 프로그램 상세 설명과 같은 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image` 모델 문구로 변경.
  - `ai-image-studio/app/layout.tsx` — 동일 기준의 메타 설명 갱신.
  - `ai-image-studio/lib/version.ts` — `v1.05`.
  - `ai-image-studio/AGENTS.md`, `scripts/register_ai_image_studio.js`, `scripts/update_thumbnail.js`, `supabase/migrations/0012_register_ai_image_studio.sql`, `docs/ERROR_LESSONS.md` — 카탈로그 문구와 재등록 기준 동기화.
- **검증**: `ai-image-studio`에서 `npm.cmd run build`를 다시 실행해 통과했다. 커밋·푸시 후 재배포는 필요 없으며, 이미 반영된 프로덕션 URL은 `https://ai-image-studio.vercel.app/dashboard`다.
- **공유 작업 주의**: `threads-affiliate-poster/`, `shorts-viral-studio/`, `debug.log`, `scratch/`는 다른 작업 영역이므로 이 작업 커밋에 포함하지 않는다.
- **배포 별칭 수정 (v1.05, 완료)**: 기본 주소 `ai-image-studio.vercel.app`가 11일 전 배포본을 가리켜 최신 배포 후에도 이전 문구가 노출됐다. 새 배포본 `ai-image-studio-kd4xg0yec-buylife.vercel.app`으로 기본 별칭을 명시적으로 다시 연결했고, 실제 응답 HTML에서 새 모델 문구·`v1.05` 및 HTTP 200을 확인했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.28, 2026-10-04)

- **생성 장수 옵션 문구 최적화 - '연속' ➔ '생성' 단어 교체 (v1.28)**:
  - `ProductPostForm.tsx`에서 생성 장수 선택 셀렉트박스 옵션의 "N장 연속" 문구를 "N장 생성"(`1장 (기본)`, `2장 생성`~`10장 생성`)으로 교체.
  - 실행 버튼 텍스트도 `✨ 이미지 N장 생성`으로 정돈하여 직관적인 UX 제공.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.28`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.27, 2026-10-04)

- **사용자 이미지 추가/삭제 및 캐러셀 순서 조정 관리 시스템 구축 (v1.27)**:
  - `ProductPostForm.tsx`에 사용자가 직접 이미지를 추가/삭제/정렬할 수 있는 전용 관리 패널 완성.
  - **추가**: PC 파일 다중 업로드, 웹 이미지 URL 직접 입력 추가(`+ URL로 추가`), 썸네일 그리드 내 `➕ 이미지 추가` 카드.
  - **삭제**: 개별 썸네일 ✕ 버튼 & 삭제 텍스트 버튼, 상단 `🗑️ 전체 이미지 삭제` 일괄 비우기 버튼.
  - **순서 변경**: 카드마다 `◀`, `▶` 화살표 버튼으로 대표 썸네일(1번) 및 캐러셀 순서 즉시 변경.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.27`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.26, 2026-10-04)

- **AI 이미지 생성 장수 선택기(1~10장, 기본 1장) 도입 및 멀티컷 토글 제거 (v1.26)**:
  - `ProductPostForm.tsx`에서 "🎨 AI 멀티컷 카드뉴스 연속 생성" 체크박스 토글을 제거.
  - 원하는 생성 장수를 1~10장(기본값: 1장) 중에서 바로 선택할 수 있는 직관적인 `생성 장수` 셀렉트박스를 프롬프트 인풋 옆에 배치.
  - 선택된 수량에 맞춰 단발(1장) 또는 2~10장 연속 생성이 동작하며, 버튼 텍스트(`✨ 이미지 N장 연속 생성`)도 실시간 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.26`으로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.25, 2026-10-04)

- **STEP 2 헤더 텍스트 간소화 - 긴 부제 배지 제거 (v1.25)**:
  - `ProductPostForm.tsx`의 STEP 2 헤더에서 화면 폭에 따라 잘림 현상이 발생하던 긴 부제 배지("글 생성 모델 (GPT·Claude·Gemini) & 이미지·미디어 모델")를 삭제.
  - 메인 타이틀 `🤖 AI 생성 엔진 & 미디어 설정`만 미니멀하고 가독성 높게 표시되도록 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.25`로 갱신했다.
## AI 이미지 스튜디오 카탈로그 설명 (2026-10-04)

- 카탈로그 카드의 두 줄 한줄 설명을 `GPT Image·Gemini·FLUX.2·Z-Image 등 다양한 AI 엔진으로 1~10장 연속 생성과 세부 옵션 설정을 지원합니다.`로 갱신했다.
- 운영 DB `programs.short_desc` 및 재등록 기준 파일(`supabase/migrations/0012_register_ai_image_studio.sql`, 관련 등록 스크립트)을 함께 동기화했다.
- 대시보드 및 메타 설명을 프로그램 상세 설명과 같은 `OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image` 모델 구성으로 갱신하고 앱 버전을 `v1.05`로 올렸다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.24, 2026-10-04)

- **GPT Image 모델 라인업 최적화 - 구형 DALL-E 3 모델 삭제 (v1.24)**:
  - `src/lib/ai/imageModels.ts`에서 품질이 부족한 구형 `dall-e-3` 모델을 옵션에서 완전 제거.
  - 최신 GPT Image 고품질 라인업 6종(`gpt-image-2`, `chatgpt-image-latest`, `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`)만 엄선 유지.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.24`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.23, 2026-10-04)

- **FLUX 모델 라인업 최적화 - 저품질 FLUX.1 모델 삭제 (v1.23)**:
  - `src/lib/ai/imageModels.ts`에서 퀄리티가 떨어지는 구형 FLUX.1 계열(`black-forest-labs/flux-dev`, `black-forest-labs/flux-schnell`)을 선택 옵션에서 완전 제거.
  - 최신 극실사 플래그십인 **FLUX 2 계열 3종(`flux-2-dev`, `flux-2-pro`, `flux-2-max`)**만 엄선하여 고품질 생성 보장.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.23`으로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.22, 2026-10-04)

- **글 생성 엔진 및 이미지/미디어 설정 대형 통합 박스 개편 (v1.22)**:
  - `ProductPostForm.tsx`에서 개별 분리되어 있던 "🤖 AI 글 생성 엔진 선택"과 "🖼️ 이미지 & 미디어 설정"을 둘 다 AI 생성 모델을 선택하는 공통 영역으로 묶어, 바깥 박스를 하나의 커다란 대형 통합 컨테이너 박스(`STEP 2`)로 통합.
  - 내부에는 `[서브 카드 A] 🤖 AI 글 생성 엔진 선택 (GPT/Claude/Gemini)`과 `[서브 카드 B] 🖼️ 이미지 & 미디어 설정 (4대 이미지 AI 플랫폼, 대표이미지, 다중 업로드, 동영상)`으로 정돈.
  - 전체 화면 구조를 3단계 워크플로우(STEP 1: 콘텐츠 기획/작성 ➔ STEP 2: AI 생성 엔진 및 미디어 설정 ➔ STEP 3: 게시방식 결정 및 최종 발행)로 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.22`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.21, 2026-10-04)

- **글 작성 폼 대형 테마 컨테이너 박스 및 은은한 배경색 대구분 UI 전면 개편 (v1.21)**:
  - `ProductPostForm.tsx`에서 `🤖 AI 글 생성 엔진 선택 (GPT / Claude / Gemini)`을 중간 기준으로 삼아 상단 전체(글 콘텐츠 기획/작성)와 하단 전체(이미지 & 미디어 생성/등록)를 명확히 분리되는 커다란 대형 컨테이너 박스(`border-2` 테두리 및 옅은 파스텔 배경색)로 묶어, 단계별 워크플로우를 한눈에 직관적으로 파악할 수 있도록 UI를 대폭 개선.
  - **4대 메이저 대형 섹션 구성**:
    1. **[STEP 1] 📝 게시글 작성 및 콘텐츠 설정 (상단 대형 블루 박스 - `bg-blue-50/25 border-blue-200/80`)**:
       - 내부 흰색 카드들: 🛍️ 1. 제휴 상품 선택, 🎭 2. AI 페르소나, 🏷️ 3. 키워드 & 참고 링크, ✍️ 4. Threads 본문 & 원클릭 일괄 생성.
    2. **[STEP 2] 🤖 AI 글 생성 엔진 선택 (중간 기준 대형 퍼플 박스 - `bg-purple-50/30 border-purple-200/90`)**:
       - 3대 글 생성 AI(GPT / Claude / Gemini) 탭 버튼 및 세부 모델 셀렉트박스.
    3. **[STEP 3] 🖼️ 이미지 & 미디어 설정 (하단 대형 앰버 박스 - `bg-amber-50/25 border-amber-200/90`)**:
       - 내부 흰색 카드들: 4대 이미지 생성 AI 엔진(NanoBanana / GPT Image / FLUX / Z-Image), 대표 이미지 추가, 파일 직접 업로드, 캐러셀 썸네일 그리드, 영상 등록.
    4. **[STEP 4] 🚀 게시방식 결정 및 최종 발행 (발행 대형 슬레이트 박스 - `bg-neutral-100/60 border-neutral-300`)**:
       - 즉시 게시 / 예약 발행 / 임시 저장 선택 및 최종 발행 실행 버튼.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.21`로 갱신했다.
## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.20, 2026-10-04)

- **4대 AI 이미지 생성 플랫폼(NanoBanana, GPT Image, FLUX, Z-Image) 및 세부 모델 선택 확장 (v1.20)**:
  - 기존 Gemini NanoBanana 단일 이미지 생성에서, `ai-image-studio`의 검증된 기술 스택을 기반으로 **NanoBanana(Google Gemini), GPT Image(OpenAI), FLUX 2.0(Black Forest Labs), Z-Image(Alibaba 6B)** 4대 플랫폼 및 16종 세부 모델 선택 기능으로 대폭 확장.
  - `src/lib/ai/imageModels.ts`: 4대 플랫폼 및 세부 모델 목록, 플랫폼별 기본 모델 정의.
  - `src/lib/ai/imageGenerator.ts`: Gemini REST API, OpenAI Image API, Replicate API(FLUX, Z-Image 동기/폴링) 통합 호출기 구현. 모든 생성 이미지는 Supabase Storage `post-images` 버킷에 영구 저장되어 절대 깨지지 않는 영구 URL 반환.
  - `src/lib/actions/ai.ts`: 선택된 플랫폼에 맞춰 `gemini`, `openai`, `replicate` API 키를 `resolveApiKey`로 자동 조회.
  - `src/app/(dashboard)/settings/page.tsx`: Replicate(FLUX) API 키 등록 필드 및 발급 매뉴얼 링크 신설.
  - `src/components/posts/ProductPostForm.tsx`: 4분할 카드 탭 버튼(아이콘, 플랫폼명, 제공사) + 세부 모델 셀렉트박스 + 프롬프트/멀티컷 연속 생성 지원. `localStorage` 선택 상태 자동 복원. 원클릭 글+이미지 일괄 생성 시에도 선택된 이미지 엔진으로 자동 생성 연동.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.20`으로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.19, 2026-10-04)

- **새 글 작성(/posts/new) 폼 직관적 박스 및 역할별 테마 색상 구분 개편 (v1.19)**:
  - `ProductPostForm.tsx`에서 단조롭게 뭉쳐져 있던 상단 입력 영역을 역할별 독립 카드 박스 및 직관적인 테마 색상으로 전면 개편.
  - `⚡ AI 원클릭 자동 생성 안내 배너`: 상단 안내 및 프로세스 요약.
  - `🛍️ 1. 제휴 상품 선택`: 블루 테마 (`bg-blue-50/40 border-blue-200`) + 필수 배지 + 제휴 링크 및 공정위 광고 고지 문구 안내 카드.
  - `🎭 2. AI 페르소나 스타일 선택`: 퍼플 테마 (`bg-purple-50/40 border-purple-200`) + 어조 반영 배지 + PersonaPicker.
  - `🏷️ 3. 타겟 키워드 & 참고 링크`: 에메랄드 테마 (`bg-emerald-50/40 border-emerald-200`) + 선택 배지 + 태그 칩 & URL 인풋.
  - `✍️ 4. Threads 게시글 본문`: 모던 슬레이트 테마 (`bg-neutral-50/70 border-neutral-300`) + 글자수 카운터 배지 (0/500자) + 본문 미리보기 및 직접 수정 Textarea.
  - `🤖 5. AI 글 생성 엔진 선택` 및 `🖼️ 6. 이미지 & 캐러셀`까지 번호 매김 및 카드 스타일을 통일하여 1~6단계 물 흐르듯 자연스럽고 직관적인 제작 UX 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.19`로 갱신했다.

## Threads 쇼핑제휴 자동화 (threads-affiliate-poster v1.18, 2026-10-04)

- **새 글 작성(/posts/new) 3대 AI 엔진 선택 섹션 내 불필요한 API 키 수동 등록 입력창 제거 (v1.18)**:
  - 사용자가 환경설정(`/settings`)에서 이미 API 키를 등록하여 사용하므로, 글 작성 폼 내에 남아있던 불필요한 API 키 입력창(`customApiKey`)을 완전 제거.
  - 회원의 DB 저장 키(`user_api_keys`) 자동 연동으로 깔끔하고 미니멀한 UI 완성.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.18`로 갱신했다.

## Codex 자율 실행 위임 명문화 (2026-10-03)

- 루트 `AGENTS.md`와 `CLAUDE.md`에 기능 요청의 기본 범위를 조사부터 수정·검수·문서화·커밋·푸시·배포까지로 명시했다.
- 파괴적 삭제/force-push, 비밀값·환경변수·DB 스키마 변경, 유료 API 대량 호출, 회원 대신 최종 발행·결제·외부 공개만 사전 승인 대상이다. 도구 자체 승인이 필요한 경우에만 단 한 번 요청한다.

## 티스토리 자동화 운영 기준서 정리 (tistory-auto-blog v1.53, 2026-10-03)

- 다음 작업자는 `tistory-auto-blog/AGENTS.md`에서 연결한 `tistory-auto-blog/docs/OPERATIONS_HANDOFF.md`를 먼저 확인한다.
- 실제 티스토리 장애 이력(서식 평문화, 이미지 컨테이너 평탄화, 제목 중복, 태그 칩 오탐, 부분 본문 중단, 장식 따옴표)을 증상·원인·조치·재검수 순서로 정리했다.
- 빈 새 글만 입력하고, 부분 입력 초안은 발행하지 않으며, 최종 저장·발행은 회원이 직접 수행한다는 안전 기준을 명시했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.18, 2026-10-03 ~ 2026-10-04)

- **보관함(/saved) 본문 간략히 보기 접힘 제거 및 항상 콘텐츠 전체 노출 (v1.18)**:
  - '간략히 보기 / 전체 펼치기' 접힘 토글 기능 및 `line-clamp-4` 제거.
  - 보관함에 들어온 사용자가 별도의 클릭 없이 저장된 스레드 본문 및 첫 댓글 CTA 전문을 즉시 온전히 확인할 수 있도록 가시성 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.18`로 갱신했다.
- **프로그램 공식 카탈로그 썸네일 생성 및 DB 등록 완료 (2026-10-04)**:
  - `docs/PLATFORM_PATTERNS.md` §13 실사(포토리얼) 16:9 무문구 원칙 준수 썸네일 생성 (`scripts/generate-program-thumbnail.mjs` → `gemini-3-pro-image-preview`).
  - Supabase Storage `program-images/catalog/threads-easy-planner-thumbnail.jpg` 업로드 및 `programs.thumbnail_url` 갱신 완료 (`https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/threads-easy-planner-thumbnail.jpg?v=1791076543712`).
  - 마이그레이션 SQL(`0002_update_thumbnail.sql`) 및 로컬 백업(`public/threads-easy-planner-thumbnail.jpg`) 완비.

## Threads AI 기획 자동화 (threads-easy-planner v1.17, 2026-10-03)

- **생성 데이터 30일 보관 후 자동 삭제 (TTL Sweep) 정책 완벽 적용 (v1.17)**:
  - DB 레벨: 보관함 목록 조회 시점 30일 경과 생성 데이터 자동 영구 삭제(TTL Sweep) 쿼리 적용.
  - 클라이언트 레벨: 로컬 스토리지에 캐시된 항목도 30일 경과 시 자동 감지 및 정리(Prune) 로직 적용.
  - UI 시각화: 보관함 각 카드에 `🕒 N일 후 자동삭제` 실시간 카운트다운 배지 및 상단 30일 보관 정책 안내 배너 전면 노출.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.17`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.16, 2026-10-03)

- **좌측 사이드바 '내 콘텐츠 보관함' 메뉴 및 결과물 저장·불러와서 수정하기 올인원 연동 (v1.16)**:
  - 좌측 사이드바에 `📁 내 콘텐츠 보관함` (`/saved`) 메뉴 신설.
  - 생성 결과물 카드 상단에 `💾 보관함에 저장` 버튼 추가 및 즉시 보관 피드백 지원.
  - 본문 박스에 `✏️ 직접 수정` 인라인 textarea 에디터 지원 (사용자가 다듬은 후 그대로 저장/복사).
  - 보관함(`/saved`) 페이지에서 저장된 글 목록 실시간 검색, 전체 복사, 삭제, `✏️ 에디터로 불러와 수정하기` 원클릭 로드 연동 완비.
  - `tep_saved_plans` DB 테이블 마이그레이션 SQL(`0001_tep_saved_plans.sql`) 및 DB-로컬 이중 안전 스토리지 아키텍처 완비.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.16`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.15, 2026-10-03)

- **실전 떡상 템플릿 프리셋 3선 섹션 완전 삭제 및 핵심 동선 최적화 (v1.15)**:
  - 사용자 지시에 따라 상황별 페르소나 밑에 위치하던 '실전 떡상 템플릿 프리셋 3선' 카드 영역을 완전 삭제.
  - 페르소나 6선 → 내 실제 경험담 상세 폼 → `🔥 아무런 아이디어가 없을 때!!!` 업종 10선 추천 카드로 이어지는 핵심 흐름 최적화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.15`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.14, 2026-10-03)

- **'🔥 아무런 아이디어가 없을 때!!!' 배지 및 타이틀을 '업종/타깃별 추천 주제 10선' 영역으로 정확히 재배치 (v1.14)**:
  - '업종/타깃별 추천 주제 10선 (원하는 업종을 누르거나 추천 카드를 클릭해보세요)' 섹션에 `🔥 아무런 아이디어가 없을 때!!!` 펄스 배지와 굵은 타이틀(`text-sm md:text-base font-extrabold`)을 적용하여 사용자의 시선과 동선 최적화.
  - 상단 실전 떡상 템플릿 프리셋 3선은 깔끔하고 직관적인 전용 타이틀 구조로 정돈.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.14`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.13, 2026-10-03)

- **템플릿 폼 타이틀 시인성 확대 및 '아무런 아이디어가 없을 때' 강조 섹션 적용 (v1.13)**:
  - 실전 떡상 템플릿 프리셋 3선 상단에 `🔥 아무런 아이디어가 없을 때!!!` 레드 펄스 배지 및 타이틀 가시성 극대화.
  - 상황별 페르소나 및 프리셋 영역 상위 헤더 폰트 크기 확대 (`text-sm md:text-base font-extrabold`)로 전체 구조 시인성 강화.
  - `내 실제 경험담 · 상품명 · 타깃 직접 입력하기 (상세 템플릿 폼)` 토글 영역을 눈에 확 띄는 전용 배너 아코디언 스타일로 개편하여 사용자가 맞춤 썰/상품을 언제든 쉽게 작성하도록 개선.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.13`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.12, 2026-10-03)

- **상황별 페르소나 하단 기능 일체 복원 및 올인원 통합 완결 (v1.12)**:
  - 상황별 페르소나 버튼 바로 아래에 실전 떡상 프리셋 3선(🧺 52만 뷰 세탁조 썰, ✨ 1.6만 뷰 섀도 종결템, 🍲 설거지 탈출 찜기 썰) 전면 배치.
  - 내 실제 경험담 · 상품명 · 타깃 상세 지정 접이식 템플릿 폼 완벽 복원.
  - 10대 인기 업종 카테고리 칩 및 10선 추천 주제 카드 상시 노출로 원클릭 기획 편의 극대화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.12`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.11, 2026-10-03)

- **상황별 6대 페르소나 원클릭 글 생성 엔진 안정화 및 전체 문서화 완결 (v1.11)**:
  - 6대 핵심 페르소나(`👩‍🍳 가전·살림 주부형`, `🏠 독신·자취생형`, `💼 워킹맘·직장인형`, `💄 20대 쇼핑·뷰티 에디터형`, `⚡ IT·테크 리뷰어형`, `💰 N잡러·재테크 부업형`) 원클릭 글 생성 버튼 그리드 안정화.
  - 키워드 유무와 무관하게 버튼 클릭 즉시 피드를 멈추는 5대 훅(자책/부정명령/썰/논쟁/반전) + 4단계 공감 본문 + 자댓글 CTA 완결.
  - 서브프로젝트 README.md 전체 명세 갱신, docs/ERROR_LESSONS.md 교훈 등록, PROGRESS.md 갱신 완료.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.11`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.10, 2026-10-03)

- **가전 주부형·독신형 등 6대 상황별 페르소나 원클릭 글 생성 버튼 그리드 전면 탑재 (v1.10)**:
  - 사용자가 가장 만족했던 "버튼 하나로 다양한 상황/페르소나에 맞는 버전의 스레드 글이 완성되던 기능"을 완벽하게 부활하여 메인 인터랙션 전면에 배치했다.
  - 6대 핵심 페르소나 버튼 지원:
    1. 👩‍🍳 **가전·살림 주부형** (살림 9단 꼼꼼 비교, 가전/살림 필수템 가성비·실용성 톤)
    2. 🏠 **독신·자취생형** (2030 자취 찐현실 썰, 퇴근 후 설거지 귀차니즘 톤)
    3. 💼 **워킹맘·직장인형** (퇴근길 지친 30대 공감, 시간 절약 친한 언니 톤)
    4. 💄 **20대 쇼핑·뷰티 에디터형** (비싼 건 줄 알았는데 가성비 종결템 톤)
    5. ⚡ **IT·테크 리뷰어형** (팩트 분석, 스펙 비교, 모르면 손해 보는 논리 톤)
    6. 💰 **N잡러·재테크 부업형** (월 100 파이프라인 자본주의 현실 톤)
  - 입력창에 키워드/소재(예: 전자레인지 찜기, 세탁조 클리너 등)를 적고 페르소나 버튼을 누르면 해당 페르소나 버전으로 즉시 글이 생성된다 (비워두고 눌러도 대표 떡상 소재 자동 생성).
  - 5대 훅(자책/부정명령/썰/논쟁/반전) 대안, 4단계 공감 본문, 자댓글 CTA, 7종 리라이팅, OpenAI/Claude/Gemini 엔진 선택 완비.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.10`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.07, 2026-10-03)

- **상단 실전 기획 템플릿 입력 폼 및 원클릭 떡상 프리셋 3선 전면 배치 (v1.07)**:
  - 주제 입력 박스 바로 상단에 `[📋 실전 기획 템플릿 입력 (추천)]` 및 `[⚡ 간편 한 줄 입력]` 모드 전환 탭 신설.
  - 실전 떡상 템플릿 프리셋 3선(🧺 52만 뷰 세탁조 청소 썰, ✨ 1.6만 뷰 섀도 종결템, 🍲 설거지 탈출 찜기 썰) 원클릭 자동 입력 지원.
  - 4대 핵심 템플릿 항목(연결할 상품/소재, 내 실제 경험/상황, 타깃 독자, 나의 역할/페르소나) 및 선택적 벤치마킹 터진 글 원문 입력 필드 제공.
  - AI 생성 엔진에 템플릿 데이터를 완벽 연동하여 프롬프트 뼈대 및 소재가 정확히 반영되도록 구현.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.07`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.06, 2026-10-03)

- **실전 떡상글(52만/1.6만 조회수 실제 사례) 스타일 전면 반영 (v1.06)**:
  - 실제 스레드에서 터진 콘텐츠 2건(52만 뷰 세탁기 관리제, 1.6만 뷰 섀도 종결템)을 분석하여 프롬프트와 UI에 완벽 이식.
  - 4~6줄 극압축 호흡 및 1~2줄 단위 가독성 빈 줄(`\n\n`) 단락 구분.
  - 리얼한 스레드 감정 부호(`;;`, `...`, `??`, `ㅠㅠ`, `땅땅!`) 및 커뮤니티 호칭(`스치니`, `치니`, `치니들`) 적극 활용.
  - 본문 내 상업적 제품명/브랜드명 100% 배제 (호기심 극대화).
  - 본문에서 제품명을 숨기고, 첫 번째 댓글(자댓글)에서 제품명/쇼핑 제휴링크/사용팁을 연결하는 스레드 실전 떡상 공식 안내 및 CTA 가이드 강화.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.06`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.05, 2026-10-03)

- **스레드 실전 프롬프트 노하우 전면 반영 (v1.05)**:
  - 4단계 황금 구조 (멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기) 프레임워크 적용.
  - 4~6줄 친근한 반말(친구/언니 카톡 톤), AI 티 100% 제거, 제품명 노출 금지.
  - 5대 바이럴 훅 유형(자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형) 5개 글 세트 동시 생성.
  - 첫 줄이 멈추게 하는 이유(공감·손해회피·호기심·반전) 설명 제공.
  - 결과 화면에서 5대 훅 유형별 버전 펼쳐보기, 개별 복사, 원클릭 본문 전환 기능 추가.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.05`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.04, 2026-10-03)

- **AI 엔진 선택 통일화 (OpenAI (GPT) / Claude / Gemini 3가지 선택, v1.04)**:
  - 타 서브프로그램(`threads-affiliate-poster`, `ai-auto-blog`, `naver-blog-seo-studio`)과 동일하게 AI 엔진 선택 라벨 및 순서를 **OpenAI (GPT) / Claude / Gemini 3가지**로 통일화했다.
  - 선택 탭 버튼 및 세부 실행 모델 드롭다운의 반응형 정렬을 보강했다.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.04`로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.03, 2026-10-03)

- **AI 추론 엔진 및 세부 모델 선택 기능 추가 (v1.03)**:
  - 🎲오늘 뭐 쓰지? / ✨글 생성하기 버튼 바로 하단에 OpenAI / Google Gemini / Anthropic Claude 3대 AI 엔진 및 2026 최신 세부 모델 선택 패널을 구현했다.
  - 지원 모델군: GPT-4.1(기본), GPT-6 Luna/Sol/Astra, GPT-5.6 시리즈, GPT-4o, Gemini 3.7/3.8 Flash, Gemini 3.5 Flash Lite, Gemini 2.0 Flash, Claude Sonnet 5, Claude Opus 5, Claude Haiku 4.5 등.
  - 선택한 엔진 및 모델은 `localStorage`에 자동 저장되어 재접속 시에도 그대로 유지된다.
  - 공급자별 API 키 미등록 시 "선택하신 {공급자} API 키가 등록되어 있지 않습니다" 안내 모달을 노출한다.
  - 글 기획 완료 카드 헤더에 생성에 사용된 모델명을 배지로 표시한다.
  - `APP_VERSION` 및 DB `programs.version`을 `v1.03`으로 갱신했다.

## Threads AI 기획 자동화 (threads-easy-planner v1.02, 2026-10-03)

- **버그 해결 및 안정화 (v1.02)**:
  - "오늘 뭐 쓰지?" 버튼 클릭 시 추천 주제 10선이 화면에 렌더링되지 않던 문제 해결.
  - 원인: OpenAI `response_format: json_object` 사용 시 최상위가 배열이 아닌 `{ "topics": [...] }` 객체로 반환되어 `Array.isArray` 검증 및 `length > 0` 검사가 실패했던 오류.
  - 조치: 시스템 프롬프트를 `{ "topics": [...] }` 객체 구조로 명시하고, 백엔드(`src/lib/ai/generator.ts`)에서 객체 내 배열 키(`topics`, `response`, `data` 등)를 자동 언랩핑하여 100% 배열 반환 보장.
  - Gemini 모델 ID 오기(`gemini-2.5-flash` → `gemini-2.0-flash`) 정상화.
  - `PlannerApp.tsx`에서 "오늘 뭐 쓰지?" 클릭 시 카테고리 피커 상시 토글 및 즉시 추천 트리거 동작 개선.
  - 버전 `v1.02` 판올림 (`src/lib/version.ts` 및 DB `programs.version`).

## Threads AI 기획 자동화 신설 (2026-10-03, threads-easy-planner v1.01)

- 초보자 맞춤형 스레드(Threads) AI 기획기 서브프로젝트(`threads-easy-planner/`)를 신설했다.
- 복잡한 쇼핑/제휴/링크 크롭/포스팅 설정 없이, 주제 입력 또는 "🎲 오늘 뭐 쓰지?" 10개 업종/타깃 추천 → 5단 구성(주제, 첫 문장 후킹, 전체 글, 댓글/CTA, 후속 아이디어 5선) 자동 생성 → 7종 원클릭 리라이팅(더 자극적으로, 더 자연스럽게 등) 기능을 원클릭 UI로 구현했다.
- 공용 DB `programs`에 slug `threads-easy-planner` (Threads 카테고리, `v1.01`, FREE 배지) 및 기본 3단계 요금제(`pricing_plans`) 등록 완료.
- `npm run build` 검증 완료 (TypeScript/컴파일 100% 정상).


- 원인/조치: 실제 원문 미리보기와 게시 결과에 같은 따옴표가 있어 확장 입력 문제가 아니라 AI 생성 결과 문제로 확정했다. 프롬프트 지시만으로 재발해 `utils/news/generator.ts`에서 문장 양끝을 감싼 장식용 따옴표를 Markdown→HTML 변환 전에 제거한다.

## 티스토리 본문 입력 회귀 복구 (2026-10-03, v1.52)

- 증상/원인: 새 글에서 29개 본문 블록 중 7개만 입력된 상태로 멈췄고, 재개는 부분 본문을 발행하지 않도록 저장 원본 검증에서 중단됐다. v1.51의 공백만 정리한 문장 전체 일치 검증이 티스토리의 정상 HTML 재구성에도 실패해, 이후 블록 입력을 중단시킨 회귀였다.
- 조치/검수: AI 생성 단계의 장식용 따옴표 금지는 유지하고, 확장 입력 단계의 완전일치 검사를 제거했다. 기존 텍스트 존재·서식 구조 검증은 그대로 유지한다. 멈춘 실제 초안에서 제목과 첫 7개 본문 블록만 존재하고 전체 미리보기에는 29개 블록이 있는 것을 직접 대조했다.

## 티스토리 본문 불필요한 따옴표 방지 (2026-10-03, v1.51)

- 증상/원인: 실제 게시글과 확장 전체 미리보기를 대조한 결과, 확장이 따옴표를 새로 넣은 것이 아니라 AI 본문 생성 단계가 강조용 작은따옴표를 생성한 것이었다. 기존 입력 검증은 문장부호를 제거하고 비교해 변형도 놓칠 수 있었다.
- 조치/검수: 생성 프롬프트에서 일반 표현의 작은따옴표·큰따옴표 강조를 금지했다. 확장은 공백만 정리한 정확한 원문 대조를 추가해 문장부호가 달라지면 저장·발행 전에 중단한다. 실제 티스토리 게시 결과와 확장 전체 미리보기의 같은 Q&A 문장을 직접 대조했다.

## 티스토리 원문 태그의 실제 등록 확인 수정 (2026-10-03, v1.48)

- 증상/원인: 원문에는 태그가 있어도 글 선택 시 자동 반영하지 않았고, 티스토리 태그 UI를 찾지 못하면 본문 끝 `#태그`로 대체하면서 실제 태그 등록 성공처럼 처리했다. 또한 본문에 `#태그` 문구가 있으면 티스토리 태그 칩이 없더라도 이미 등록된 것으로 오인했다.
- 조치: 선택한 글의 원문 태그로 확장 태그 입력칸을 매번 덮어써 이전 글 값이 남지 않게 했다. 본문 해시태그는 중복 판정에서 제거하고, `.editor_tag > .txt_tag` 실제 칩으로 각 태그 등록을 확인한다. 태그 UI를 찾지 못하면 본문 대체 없이 중단한다.

## 티스토리 TinyMCE 격리 세계 입력 평문화 수정 (2026-10-03, v1.47)

- 증상/근거: 새 게시글도 제목·목록·인용이 평문처럼 저장됐다. 확장 `전체 미리보기`는 같은 원문을 제목·목록·인용·링크로 정상 렌더링했으므로 서버 HTML 변환이 아닌 티스토리 입력 단계 문제로 확정했다.
- 원인/조치: `chrome.scripting.executeScript()` 기본 격리 세계에서 `window.parent.tinymce`/`window.tinymce`를 읽어 실제 페이지 TinyMCE 인스턴스를 찾지 못했다. `sidepanel.js`의 본문 삽입과 저장 동기화를 `world: "MAIN"`으로 실행해 `insertContent()`·`save()`가 실제 모델을 갱신하도록 변경했다. 서식 태그가 사라지면 텍스트만 남은 상태로 진행하지 않고 중단한다.
- 검수: `npm run build` 성공, v1.47 ZIP 생성. 로컬 Chrome의 압축해제 확장은 별도 복사본(v1.46)으로 확인돼 기존 사용자 토큰을 보존하기 위해 제거·재설치하지 않았다. 배포 ZIP 설치 후 빈 새 글에서 실입력 검수가 필요하다.

## 티스토리 이미지 포함 컨테이너의 본문 평탄화 수정 (2026-10-03, v1.46)

- 증상: v1.45에서도 실제 발행 글의 이미지 뒤 본문이 소제목·목록·문단 간격 없이 한 덩어리 텍스트로 표시됐다.
- 원인/조치: `htmlToInputBlocks()`가 이미지가 포함된 부모 컨테이너를 만나면 모든 자식 HTML을 `textWithLinks()`로 합쳐 평문 블록 하나로 만들었다. v1.46은 컨테이너를 재귀 순회해 이미지·문단·제목·목록을 원래 순서의 별도 입력 블록으로 보낸다.

## 티스토리 컨테이너 정렬 상속 차단 (2026-10-03, v1.45)

- 증상: v1.44를 적용한 글에서 원문과 달리 본문 문단이 가운데 정렬되는 등 서식이 변형됐다(`서식깨짐.png`).
- 원인/조치: v1.44의 안전 스타일 보존기가 레이아웃용 `div`/`span`의 `text-align`도 전달해 자식 문단에 상속했다. v1.45는 문단·제목·목록·인용·표 셀처럼 의미가 분명한 콘텐츠 블록의 정렬만 보존하고, 컨테이너의 정렬은 버린다. 글자 크기·굵기·색상·줄간격·인용/목록/테두리 서식 보존은 유지한다.

## 티스토리 원본 텍스트 서식 변환 보존 (2026-10-02, v1.44)

- 증상: v1.43의 입력·저장 경로 보완 뒤에도 텍스트 서식이 원본과 다르게 깨져 보였다.
- 원인/조치: `utils/extensionContent.ts`의 `tistorySafeHtml()`가 Tailwind class와 inline style을 삭제하고 정렬만 남겼다. v1.44는 레이아웃/이벤트 속성은 계속 제거하되, 생성기에서 사용하는 글자 크기·굵기·줄간격·색상·인용·목록·테두리 클래스를 안전한 인라인 CSS로 변환하고 안전한 기존 style 속성도 보존한다.

## 티스토리 원본 서식 보존 입력 경로 (2026-10-02, v1.43)

- 증상: 본문 텍스트는 입력되었지만 원본의 제목·목록·인용·표 등 서식이 최종 입력 결과에서 깨졌다.
- 원인/조치: v1.41의 발행 직전 `setContent()`가 전체 HTML을 TinyMCE가 다시 해석하게 해 티스토리 고유 서식을 정리했다. v1.43은 각 서식 블록을 입력할 때 TinyMCE `insertContent()` API로 모델에 기록하고, 발행 전에는 내용 재입력 없이 save만 한다. API 미노출 시에만 native 입력 fallback을 사용한다.

## 티스토리 발행 원본 HTML 엔티티 검증 오판 보완 (2026-10-02, v1.42)

- v1.41에서도 발행 원본 검증이 `37/45개 문단`으로 중단됐다. `#editor-tistory`의 HTML 원문에 포함된 `&nbsp;`·`&amp;`를 정규화 문자열로 직접 비교해, 브라우저 화면의 실제 문자와 다르게 계산한 것이 원인이었다. v1.42는 저장 원본 HTML을 detached DOM으로 해석한 `textContent`로 비교한다. TinyMCE `setContent()`·save 동기화와 전체 문단 검증은 계속 적용한다.

## 티스토리 TinyMCE 내부 모델 동기화 (2026-10-02, v1.41)

- v1.40의 발행 전 검증에서 `37/45개 문단`만 숨김 원본에 남는 실제 오류가 확인됐다. iframe 화면 DOM·textarea 동기화만으로는 TinyMCE 내부 모델이 갱신되지 않아 `save()`가 일부 문단을 직렬화하지 않을 수 있었다. v1.41은 iframe의 전체 HTML을 `setContent()`로 모델에 확정한 뒤 undo/change/save를 실행하고, 원본 검증을 계속 유지한다.

## 티스토리 발행용 본문 원본 동기화 (2026-10-02, v1.40)

- 증상: 확장 입력 직후에는 iframe 편집기에 텍스트와 이미지가 정상 표시되지만, 티스토리 최종 발행 뒤에는 이미지들만 남고 텍스트가 사라졌다.
- 원인/조치: `execCommand` 기반 서식 삽입 결과가 화면 iframe에는 남아도 TinyMCE가 발행 때 읽는 숨김 `#editor-tistory` 원본에 저장되지 않을 수 있었다. 발행 설정 전 TinyMCE `save()`·input/change 이벤트와 숨김 원본 동기화를 실행하고, 원본의 모든 텍스트 블록을 검증한다. 본문 태그 대체 삽입 뒤에도 같은 동기화를 반복한다.

## 티스토리 본문 제목 중복 제거 (2026-10-02, v1.39)

- 증상: 생성된 본문에서 티스토리 제목과 같은 문구가 독립 문단/소제목으로 다시 출력되어 제목이 두 번 보였다.
- 원인/조치: 확장 입력기는 제목을 본문에 합치지 않았으며, AI가 반환한 문단 또는 소제목이 제목과 같아 저장된 것이 원인이었다. 생성 결과의 제목과 정확히 같은 마크다운 줄을 제거하고, 확장 HTML 블록 변환에서도 같은 제목 블록을 제외한다. 기존 저장 글에도 전송 시 적용된다.

## 티스토리 본문 연속 서식 입력 보존 (2026-10-02, v1.38)

- 증상: 티스토리 새 글 입력에서 본문 맨 앞 텍스트만 남고 이미지 4장만 입력되는 사례가 확인됐다.
- 원인/조치: TinyMCE가 HTML 삽입 뒤 DOM을 비동기로 재구성하면서 기존 Selection이 유효해 보이지만 오래된 위치를 가리켜 다음 블록이 앞 문단을 덮어쓸 수 있었다. `extension/sidepanel.js`가 매 서식 블록을 본문 끝에 명시적으로 붙이고, 모든 텍스트·서식 블록의 실제 잔존을 확인하도록 보강했다. 서식이 제거된 경우에만 키보드 입력으로 텍스트를 복구한다.

## 티스토리 홈주제 기본 목록 + 실제 목록 갱신 (2026-10-02, v1.30)

- 빈 새 글에서는 티스토리가 발행창을 열지 않아 홈주제 동적 수집이 불가능했다. 확장에 공통 홈주제 기본 목록을 넣어 즉시 선택 가능하게 하고, 제목·본문 입력 후에는 `목록 갱신`이 실제 티스토리 메뉴를 읽어 기본 목록을 대체·캐시하도록 했다. 빈 글에서 갱신을 눌러도 오류를 표시하지 않고 기본 목록 사용 안내를 보여 준다. 적용 시 선택값이 실제 메뉴에 없으면 갱신을 안내하고 중단한다.

## 티스토리 발행 버튼 신뢰된 포인터 클릭 (2026-10-02, v1.29)

- v1.28은 실제 `button.click()`을 사용했지만 해당 이벤트의 `isTrusted`는 false라 티스토리 React가 무시할 수 있었다. `openPublishSettings()`를 Chrome Debugger `Input.dispatchMouseEvent`로 버튼 중앙 좌표에 실제 포인터 입력을 보내도록 교체했다. 열림 확인은 role 기반 dialog와 열린 ReactModal 클래스를 모두 가시성 검사한다.

## 티스토리 발행 설정창 열기 재시도 보완 (2026-10-02, v1.28)

- `홈주제 불러오기`가 `openPublishSettings()`를 호출할 때 발행 버튼에 합성 이벤트만 한 번 보내고 300ms 뒤 레이어 존재를 확인했다. React 클릭 처리·동적 렌더링이 늦으면 `발행 설정창을 열지 못했습니다.`로 실패했다. 이제 가시성 있는 기존 창을 먼저 인식하고, 실제 `button.click()` 뒤 레이어를 최대 4.5초 폴링하며 최대 3회 재시도한다.

## 티스토리 본문 요약 라벨 제거 (2026-10-02, v1.27)

- `tistory-auto-blog/utils/news/generator.ts`가 본문 첫 요약 문단을 `> **요약**: ...`로 조립해 `요약:`이 실제 글에 표시됐다. 요약 내용은 유지하고 인용 문단의 라벨만 제거했다. 이미 생성·저장된 글은 자동 변경하지 않으며, 새로 생성하는 글부터 적용된다.

## 티스토리 홈주제 실제 선택지 드롭다운 (2026-10-02, v1.26)

- 확장 발행 설정의 자유 입력형 `홈주제`를 드롭다운으로 바꿨다. `홈주제 불러오기`는 티스토리 발행 창의 두 번째 선택 메뉴를 열어 실제 선택지를 읽고, 그 목록을 확장 로컬 저장소에 캐시한다. 이후에는 직접 입력이 아니라 목록에서 정확한 홈주제를 선택하며, 발행 설정 적용도 동일한 선택값으로 검증한다.

## 티스토리 본문 의미 서식 보존 입력 (2026-10-02, v1.25)

- 실제 포스팅 화면에서 본문 서식이 평문처럼 사라진 원인은 `utils/extensionContent.ts`가 원문 HTML을 텍스트 블록으로 평탄화하고 `extension/sidepanel.js`가 이를 한 글자씩 입력한 구조였다. 이제 제목 단계·굵게·목록·인용·표·링크를 안전한 의미 HTML 블록으로 보존해 TinyMCE에 입력한다. 이미지 URL은 외부 이미지 태그로 넣지 않고 기존 PNG 붙여넣기 업로드 경로를 유지한다. Tailwind class·inline style·복사 버튼·이벤트 속성은 티스토리에 보내지 않는다.

## 티스토리 카테고리 목록 동적 생성 보완 (2026-10-02, v1.24)

- `tistory-auto-blog/extension/sidepanel.js`의 카테고리 열기 코드가 클릭 전 `#category-list` 존재를 필수 조건으로 검사해, 티스토리가 버튼 클릭 뒤 목록을 React로 생성하는 화면에서 클릭조차 하지 않고 `카테고리 목록을 열지 못했습니다.`로 중단했다. 이제 `#category-btn`만 확인해 실제 클릭을 수행하고, `aria-expanded=true` 또는 목록 가시성으로 열림을 판정하며 최대 3회 재시도한다.

## 티스토리 확장 입력 안내 축약 (2026-10-02, v1.23)

- 입력 진행 상태 아래의 안내를 “입력 중에는 티스토리 탭을 닫거나 다른 곳을 클릭하지 마세요.”와 “제목·본문·이미지 입력 뒤 중단된 경우에는 ‘설정 이어서 적용’ 버튼을 누르세요.” 두 줄로 변경했다.

## 티스토리 확장 입력 버튼 배열 개선 (2026-10-02, v1.22)

- `tistory-auto-blog/extension/sidepanel.html`의 입력 진행 상태 오른쪽 버튼을 공용 `.draft-actions`에서 분리해 전용 `.content-input-actions`로 변경했다. `styles.css`는 버튼 폭을 확보해 세로 두 줄로 배치하고, 버튼 문구가 줄바꿈되지 않도록 했다. 너비 420px 이하에서만 한 줄 2열로 반응형 전환한다.

## 티스토리 본문 확인 오탐 보완 (2026-10-02, v1.21)

- `tistory-auto-blog` 확장 프로그램에서 제목·본문·이미지 입력 뒤 본문 전체 문자열과 티스토리 `innerText`를 완전 비교하던 검증을 문단 문맥 검증으로 교체했다. 티스토리의 자동 링크화·줄바꿈/figure 재구성은 정상 동작이므로, 이것이 본문이 정상 입력된 뒤에도 “입력된 본문을 다시 확인하지 못했습니다”로 멈춘 직접 원인이었다. 이어서 적용은 제목·본문 존재·이미지 수를 보존 검증하고, 문단 60% 이상 확인 시 카테고리·태그·발행 설정만 계속 적용한다. 오류 메시지에는 원문을 기록하지 않고 확인 문단 수만 표시한다. 프로그램/확장/ZIP 버전은 `v1.21`.

## 티스토리 갱신 (2026-10-02, v1.20)

- `tistory-auto-blog` 확장은 제목·본문·카테고리·태그와 이미지를 사람 속도로 입력합니다. v1.20은 일반 버튼인 `#category-btn`을 입력칸 포커스 함수로 처리해 정상적으로 목록을 연 뒤에도 실패로 오인하던 문제를 카테고리 전용 열기·가시성 검증으로 고쳤다. 중단된 기존 글은 내용을 덧쓰지 않고 카테고리·태그·발행 설정만 이어서 적용할 수 있으며 기존 태그도 중복 입력하지 않는다. 수정 화면의 기존 본문 서식 보존도 유지한다. 카테고리·태그 전용 저장은 발행 설정을 건드리지 않고 해당 두 값만 저장하며, 홈주제·예약 등은 별도 발행 설정 저장으로 관리한다. 보호 비밀번호는 저장하지 않는다.

> **다른 CLI(Codex, Gemini, 다른 Claude 세션)가 이어서 작업할 때 가장 먼저 읽는 "지금 상태" 요약본이다.**
> 규칙·원칙은 루트 `AGENTS.md`/`CLAUDE.md`, 프로그램별 상세는 각 `<프로그램>/AGENTS.md`·`README.md`에 있다.
> 이 문서는 "최근에 무엇을 했고, 무엇이 멈춰 있고, 다음에 무엇을 하면 되는지"만 모은다.
> 작업을 끝낼 때마다 아래 1·2·3번 표를 갱신하고 같은 커밋에 포함할 것.

- 최종 갱신: 2026-10-01 (Claude 세션 — 로그인 폼 통일 배포 후 남은 일 정리)
- 기준 커밋: `7179bab` 이후 (master, origin과 동기화됨)

---

## 1. 지금 멈춰 있거나 남은 일

| # | 할 일 | 상태 / 막힌 이유 | 담당 | 자세한 위치 |
|---|---|---|---|---|
| 1 | Meta 앱 심사 (`threads_keyword_search` 고급 액세스) | ⏸ **비즈니스 인증 재제출 후 결과 대기**. 결과가 나오면 → 액세스 인증 → 데이터 처리 질문 → 앱 검수 제출 순서로 재개. 제출에는 심사관 테스트 계정과 시연 영상이 필요 | 주인님(Meta 화면) + 개발 | `threads-affiliate-poster/docs/META_APP_REVIEW.md` §0 |
| 3 | 회원 계정으로 실제 동작 확인 | 쇼핑제휴 `/trends`(직접 가져오기·검색 필터·AI 모델별 캡션·내 페르소나), 댓글자동화 `threads_read_replies` 재연동 후 댓글 테스트, 20개 프로그램 사이드바 하단 계정 표시 | 주인님(테스트) | 각 서브프로젝트 `AGENTS.md` |
| 4 | 티스토리 블로그 자동화 (`tistory-auto-blog/`, BLOG 방식 = 웹 + 크롬 확장) | 🟡 **확장 계정 연동 배포 완료(v1.02)**: 전용 DB·owner-only RLS, 프로그램·기본 3단계 요금제, `https://tistory-auto-blog-pearl.vercel.app` 배포. 확장은 설정의 연동 토큰을 서버에서 검증한 뒤 저장한다. 편집기 조작은 티스토리 권한만 쓰는 읽기 전용 조사 모드다. **다음: 주인님 PC에서 `extension/`을 압축 해제 로드 → 설정에서 토큰 발급·연결 → JSON 전달 → 서버 변환기·실제 입력 코드.** 복제 원본 ESLint 오류 53개는 v1.55(2026-10-09)에서 0건으로 정리 | 주인님(조사 실행) + 개발 | `tistory-auto-blog/docs/TISTORY_PLAN.md` §6, `tistory-auto-blog/AGENTS.md` |
| 6 | BLOG(ai-auto-blog v1.33) 실제 사용 확인 | ① 이미지 1~5장 선택 시 제목용·문단 이미지 배치 ② 확장으로 네이버 입력 시 추천 링크가 **실제 링크 1개만** 들어가는지(v1.27 수정 후) ③ 추천테그 추출 결과 ④ 회원 계정으로 로그인→글 생성. 실제 생성은 회원 키 유료 호출이라 **에이전트가 임의 실행 금지** | 주인님(테스트) | `ai-auto-blog/AGENTS.md` |
| 7 | GPT-6 계열 본문 생성 1회 검증 (BLOG) | 유료 — 주인님 승인 후 실행 | 개발 | `ai-auto-blog/AGENTS.md` v1.09 |
| 8 | BLOG 30일 자동 삭제 첫 실행 결과 확인 | 📅 **2026-11-01 03:00 KST** 첫 실행(기존 데이터 10/1부터 유예). 다음 날 삭제 건수·Storage 정리 확인 | 개발 | `ai-auto-blog/app/api/cron/cleanup-images` |
| 9 | (Codex 담당) SEO 스튜디오 남은 3가지 | ① `naver-blog-seo-studio/components/StudioPage.tsx`의 "다른 프로그램 보기" 링크 `/blog/dashboard` → `https://www.buylife.xyz/dashboard`(다른 프로그램은 2026-10-01 교체 완료) ② 로그인 화면을 `docs/PLATFORM_PATTERNS.md` §29 레이아웃으로 ③ 확장 타이핑 속도 24~52ms → §20 기준 70~170ms. 고친 뒤 버전 +0.01(코드·DB) | Codex | `docs/ERROR_LESSONS.md` D, §29 |
| 10 | (선택) BLOG 해시태그에도 본문 필터 적용 | SEO 규칙을 그대로 복사해 "위한·주목해야" 같은 말이 남을 수 있음 | 주인님 결정 대기 | `ai-auto-blog/AGENTS.md` v1.29 |
| 11 | 로그인 폼 통일 실사용 확인 (24개 프로그램) | 모든 라이브 `/login` 200·새 문구 확인 완료. 남은 것: 회원 계정으로 아무 프로그램 1~2개 로그인 → `?redirect` 경로로 돌아가는지, 좌측 "다른 프로그램 보기"가 메인 대시보드로 가는지 | 주인님(테스트) | `docs/PLATFORM_PATTERNS.md` §29 |
| 5 | ⚠️ ai-auto-blog 운영 DB 정책·API 점검 | `blog_*` 테이블이 anon 읽기·모든 회원의 카테고리 변경 등으로 열려 있고 `GET /api/posts/[id]`가 인증 없음(읽기 조회로 확인, **미수정**). 영향 범위 확인 후 정책 교체·API 인증 추가(버전 +0.01, 주인님 승인) | 로컬 + 주인님 | `docs/ERROR_LESSONS.md` C 섹션 2026-10-01(cloud) 항목 |

**주의**: `naver-blog-seo-studio/`는 주로 Codex가 작업하는 폴더다. 2026-09-30 주인님 지시로 Claude가 권한 규칙만 적용했다(v1.03).
손대기 전에 `git status --porcelain -- naver-blog-seo-studio`로 Codex의 커밋 안 된 변경이 없는지 먼저 확인하고, 있으면 건드리지 않는다.

---

## 2. 최근 완료한 작업 (2026-09-28 ~ 09-29)

| 영역 | 무엇을 했나 | 왜 | 커밋/기록 |
| SEO 스튜디오 추천 태그 정제 (v1.59) | 한글 조사를 문자 단위로 잘라 `메시지`가 `메시`가 되고 `합니다.`·`있습니다.` 금칙어가 우회되던 로직을 실제 조사·문장부호 처리로 교체. 이미 구체 태그에 포함된 `서울`·`여행` 같은 구성 단어와 본문 일반어(`시간`·`여행지` 등)를 제외하고, 주제·사용자 핵심 키워드는 보존. 두 사용자 화면 사례 회귀 테스트 추가 | 불필요한 추천 태그가 발행 설정에 섞임 | `naver-blog-seo-studio/AGENTS.md`, `CLI_HANDOFF_2026-10-01.md` |
|---|---|---|---|
| 쇼핑제휴 `/trends` 떡상 탐지기 | 가짜 샘플 데이터(지어낸 조회수·반응도)를 걷어내고 Meta 공식 `keyword_search` + "떡상글 직접 가져오기" + 출처 배지로 재구현 | 실제로는 동작하지 않는 기능이 "실시간 분석"처럼 보이고 있었음 | `docs/PLATFORM_PATTERNS.md` §24 |
| 쇼핑제휴 검색 확장 | 앱 검수 승인 회원: 키워드/해시태그 방식·미디어 유형·작성자 필터로 타인 공개 글 검색. 미승인 회원: 직접 가져오기 안내. 화면 맨 위 A/B 안내 박스 + "비즈니스 앱 승인 절차" 매뉴얼 팝업(`platform_guides` `ae85d991-...`) | 승인 여부에 따라 쓸 수 있는 기능이 다름 | `3975b29`, `4257527` / TAP `AGENTS.md` |
| 쇼핑제휴 AI 캡션 | 화면에서 고른 모델(GPT-6/5.6/4.1, Gemini 3.x, Claude Sonnet 5/Opus 5/Haiku 4.5)을 몰래 다른 모델로 바꿔 부르던 코드 제거, 종료된 모델 목록 정리 | 종료 모델 호출로 실패하고 있었음 | TAP `AGENTS.md` |
| 쇼핑제휴 내 페르소나 | 커스텀 말투를 저장해 트렌드 벤치마킹·새 글 작성에서 재사용(`tap_personas`, 공용 `PersonaPicker`) | 테이블만 있고 연결이 안 돼 있었음 | `25113ca` |
| 쓰레드 3개 프로그램 앱 정보 분리 | 인스타용 `meta_app_id/secret`과 쓰레드용 `threads_app_id/secret`을 따로 저장. Meta 제거·삭제 콜백은 쇼핑제휴 한 곳에서 3개 프로그램을 함께 처리 | 인스타·쓰레드 앱 ID 칸을 같이 써서 잘못된 ID로 인증 실패(4476002) | 루트 마이그레이션 `0017` |
| threads(자동포스팅) 카테고리 버그 | 카테고리 JSON을 API 키 칸에 덮어쓰던 코드 제거·데이터 복원 | 회원 API 키가 망가지고 있었음 | `threads/AGENTS.md` |
| 운영 DB 미적용 마이그레이션 | `tap_saved_posts`, `tap_personas`, `program_prompts`, `style_preset_prompts`, `user_image_generations`, `affiliate_clicks`, `threads_categories` 적용 | 코드만 있고 운영 DB에 테이블이 없었음 | 각 `supabase/migrations/` |
| 법적 페이지 | 개인정보처리방침 제12조(Meta 연동 정보, 10/5 시행 공지), `https://www.buylife.xyz/data-deletion` 신설 | Meta 앱 심사 필수 항목 | `META_APP_REVIEW.md` §1 |
| 카탈로그 썸네일 | 30개 전부 실사 원칙으로 정리(seo-studio·tarot 교체), 업로드 도구 `scripts/upload-program-thumbnail.mjs` | 썸네일은 실사가 원칙 | `docs/PLATFORM_PATTERNS.md` §13·§14 |
| 사이드바 통일 | 21개 프로그램 좌측 메뉴 바로 밑에 로그인 계정·로그아웃을 붙이고, 사이드바를 화면에 고정해 항상 보이게 함(기준: TAP `Sidebar.tsx`). 처음엔 화면 맨 아래에 붙였다가 "메뉴와 너무 멀다"는 지시로 메뉴 밑으로 옮김 | 긴 페이지에서 계정 표시가 화면 밖으로 밀려남 | `7b09f63`, `eb0b072`, 이번 커밋 / 루트 `AGENTS.md` §10 |
| 쇼핑제휴 알리 상품 이미지 누락 재발 수정 (v1.05) | 원인: 알리 API 호출 빈도 제한(`ApiCallLimit`)이 조용히 삼켜짐(09-27 지침은 단축 URL만 다뤘음). 재시도·경고·"이미지 다시 가져오기" 버튼 추가, 누락 1건 복구 | 주인님 신고 | `threads-affiliate-poster/docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md` |
| 로그인 폼 통일 + "다른 프로그램 보기" 링크 (24개 프로그램 + ai-image-studio + ai-auto-blog v1.33) | 모든 프로그램 로그인 화면을 BLOG 로그인 폼 레이아웃으로(`docs/PLATFORM_PATTERNS.md` §29). 좌측 메뉴 "← 다른 프로그램 보기"를 `/blog/dashboard` → **`https://www.buylife.xyz/dashboard`**(주인님 결정). web-crawler 버전 파일·표시 추가, music·shop-detail-page 빌드 막던 미사용 변수 제거. 버전: insta_auto_poster(v1.03), kakao_auto_poster(v1.03), naver-cafe-poster(v1.03), shots(v1.03), threads(v1.03), threads-affiliate-poster(v1.14), real_estate_sales(v1.03), web-crawler/webapp(v1.03), mbti-character(v1.04), tarot(v1.04), video-to-gif(v1.03), auto-detail-page(v1.04), booking-reminder(v1.03), competitor-analysis(v1.03), crm-google-form(v1.03), instagram-comment-reply(v1.03), instagram-dm-reply(v1.03), longtail-keyword-expander(v1.03), music(v1.03), shop-detail-page(v1.03), stepmail(v1.03), threads-comment-reply(v1.03), trending-product-finder(v1.03), youtube-auto-reply(v1.03), ai-image-studio(v1.03). 예외: SEO 스튜디오(Codex — 같은 링크가 `components/StudioPage.tsx`에 남아 있음, Codex가 고칠 것) | 주인님 지시 | `docs/PLATFORM_PATTERNS.md` §29, `docs/SIDEBAR_LAYOUT_STANDARD.md` |
| BLOG 문단 이미지 고르게 배치 (ai-auto-blog v1.32) | 2~4장일 때 문단 이미지가 문단 4개를 묶음으로 나눠 맡음(3장=[1~2][3~4] 등), 앞쪽 쏠림 해소 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "2~4장일 때 문단 4개를 나눠 맡기" |
| BLOG 이미지 장수 선택 (ai-auto-blog v1.31) | 이미지 1~5장 선택(1번 제목용=전체 대표, 2번부터 문단 1~4 순서), 본문 문단 3→4개. **남은 일: 실제 생성으로 배치 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 장수 선택" |
| BLOG 삭제 예정 배지 문구 (ai-auto-blog v1.30) | "N일 후 삭제" → "N일 후 자동삭제" | 주인님 지시 | `ai-auto-blog/AGENTS.md` "삭제 예정 배지 문구" |
| BLOG 추천테그 추출 SEO와 동일화 (ai-auto-blog v1.29) | SEO 스튜디오 v1.59 태그 추천 코드·스타일을 그대로 복사(함수 diff 동일). SEO 규칙이 바뀌면 같이 맞출 것 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천테그 추출을 SEO 스튜디오 v1.59와 똑같이" |
| BLOG 확장 추천태그 추출 (ai-auto-blog v1.28) | SEO 스튜디오 v1.57 태그 추천을 BLOG 확장에 적용(버튼을 눌렀을 때만, 해시태그·제목·본문 빈도, 최대 10개) + 해시태그 조사 처리 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 추천태그 추출" |
| BLOG 추천 링크 중복 입력 수정 (ai-auto-blog v1.27) | 링크 붙여넣기가 모든 프레임에서 돌아 3번 + 글자 1번 들어가던 것 → 커서가 있는 프레임 하나에서만 1번 붙여넣기, 실패 시에만 글자. 이미지 설명 줄 제거. 실제 링크가 걸리는 것은 주인님 화면으로 확인됨. **남은 일: 새 버전으로 1개만 들어가는지 재확인** | 주인님 신고(확장.png) | `ai-auto-blog/AGENTS.md` "추천 링크가 4번 들어가던 문제" |
| BLOG 확장 부제 문구 (ai-auto-blog v1.26) | 확장 제목 밑 문구를 주인님 문안으로 교체 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 부제 문구" |
| BLOG 확장 제목 한 줄 (ai-auto-blog v1.25) | 확장 제목 "BLOG(원문) 네이버 입력기" 한 줄, 확장 이름·툴팁 통일 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 제목" |
| BLOG 버튼 이름 변경 (ai-auto-blog v1.24) | "네이버로 보내기" → "네이버 입력기로 보내기"(버튼·안내·오류 문구 전체) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버튼 이름" |
| BLOG 확장 미리보기 문구 정리 (ai-auto-blog v1.23) | 미리보기 링크 뒤 "(실제 링크로 입력)" 문구 삭제 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 미리보기 링크 문구 정리" |
| BLOG 추천 링크 한 줄 + 실제 링크 입력 (ai-auto-blog v1.22) | 추천 링크를 "👉 {문구} 바로가기" 한 줄로(예전 글도 보낼 때 정리), 확장이 링크 줄을 링크 걸린 HTML 붙여넣기로 입력 후 실제 링크 생성 확인(실패 시 글자로). **남은 일: 실제 네이버 화면에서 링크 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "추천 링크 한 줄 + 네이버에 실제 링크로 입력" |
| BLOG 네이버 입력 링크 (ai-auto-blog v1.21) | 확장 입력 시 추천 링크가 글자로만 들어가던 것 → 링크를 `글자: 주소 `(괄호 없음, 뒤에 띄어쓰기)로 바꿔 네이버 자동 링크 유도. **남은 일: 실제 포스팅으로 링크 확인, 안 되면 링크 도구 방식(구조 분석 필요)** | 주인님 요청(추천링크.png) | `ai-auto-blog/AGENTS.md` "네이버 입력 시 링크가 걸리게" |
| BLOG 확장 아이콘·이름 구분 (ai-auto-blog v1.20) | SEO 확장과 똑같은 회색 "A" 아이콘이라 헷갈리던 것을 초록 "B" 아이콘·"BLOG(원문) 네이버 입력" 이름으로 구분 | 주인님 신고 | `ai-auto-blog/AGENTS.md` "확장 아이콘·이름 구분" |
| BLOG 확장 버전 자동 동기화 (ai-auto-blog v1.19) | SEO 스튜디오 방식(프로그램 버전 = 확장 버전 = ZIP 버전)을 `prebuild`로 자동화 — 버전 올리고 빌드하면 manifest·ZIP 자동 갱신(예전 ZIP 삭제). 설정 화면 "업데이트 필요" 표시, 확장 안 "새 버전" 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "확장 버전 자동 동기화" |
| BLOG 서브폴더 이름 변경 (ai-auto-blog v1.18) | `blog/` → `ai-auto-blog/`(폴더=slug=Vercel 프로젝트 규칙). 작업·빌드·배포는 이제 `ai-auto-blog/`에서. 같은 Vercel 프로젝트·주소로 배포 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "서브폴더 이름 변경" |
| BLOG 네이버 입력 크롬 확장 (ai-auto-blog v1.17) | BLOG 전용 확장(A안): 글 보기 "네이버로 보내기" → 확장이 네이버 글쓰기 화면에 제목·본문·이미지를 §20 속도(70~170ms)로 한 글자씩 입력, 카테고리·태그까지, 마지막 발행은 사람. 설정 화면 토큰·ZIP, `blog_posts` 칸 4개 추가. 서버 흐름 운영 검증 완료. **남은 일: 주인님 PC 실제 네이버 화면에서 끝까지 입력 확인** | 주인님 지시 | `ai-auto-blog/AGENTS.md` "네이버 블로그 입력 크롬 확장", `docs/PLATFORM_PATTERNS.md` §28 |
| BLOG 글쓰기 고급 설정 삭제 (ai-auto-blog v1.16) | "이번 글에만 쓸 Gemini 키·커스텀 엔드포인트" 입력칸 삭제, 서버도 요청 키를 받지 않고 등록된 본인 키만 사용 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "고급 설정 삭제" |
| BLOG 보관 안내 문구 정리 (ai-auto-blog v1.15) | 설정 화면 안내에서 "Cloudinary 연결 불필요"·"기존 콘텐츠 10/31부터 삭제" 문장 삭제(규칙·배지는 유지) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "보관 기간 안내 문구 정리" |
| BLOG 콘텐츠 일체 30일 보관 (ai-auto-blog v1.14) | 글(본문)·이미지·글감 수집 결과를 건별로 만든 날 기준 30일 뒤 자동 삭제(매일 03시 KST). 기존 데이터는 10/1부터 30일 유예 → 첫 삭제 11/01에 현재 글 14·글감 25개 삭제 예정. 설정·글쓰기·게시글 관리·글감 수집 화면 안내, 글마다 "N일 후 삭제" 배지 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "콘텐츠 일체 30일 보관" |
| BLOG 이미지 보관 기간 30일 (ai-auto-blog v1.13) | Storage의 BLOG 이미지(`<회원id>/ai-auto-blog/`만)를 만든 지 30일 지나면 매일 03시(KST) 자동 삭제(Vercel Cron + `CRON_SECRET`). 설정 화면·AI 글쓰기 화면에 보관 기간·다른 블로그로 옮길 때 주의사항 안내 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 보관 기간 30일" |
| BLOG 이미지 저장소 전환 (ai-auto-blog v1.12) | 모든 회원·모든 이미지(자동 생성·편집기 AI·첨부)를 Supabase Storage `post-images/<회원id>/ai-auto-blog/`에 저장, Cloudinary 연동 삭제. 기존 base64 글 3개(각 12MB) 이미지 9장 이전 → 20~25KB | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 저장소 전환" |
| BLOG 이미지 프롬프트 섹션 숨김 (ai-auto-blog v1.11) | 글 아래 "🎨 생성 이미지 AI 프롬프트" 섹션을 새 글에서 만들지 않고, 기존 글은 보기·편집 화면에서 걷어냄 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 프롬프트 섹션 숨김" |
| BLOG 주소 입력 자동 보정 (ai-auto-blog v1.10) | 추천 링크·참고 링크에 `buylife.blog`처럼 넣어도 `https://`를 자동으로 붙임(브라우저 "URL을 입력하세요" 차단 해제) | 주인님 요청(ur.png) | `ai-auto-blog/AGENTS.md` "주소 입력 자동 보정" |
| BLOG 모델 목록 정리 (ai-auto-blog v1.08~v1.09) | 본문 기본 OpenAI GPT-4.1, 모델 표준 문서 기준 레지스트리로 정리(GPT-6 Luna·6.1 Sol, Claude Fable 5, Gemini 3.5/3.6/3.8 Flash 추가, Haiku 4.5 정확한 ID로 수정), 이미지 1K를 2K 위로·기본 2K, 제목에 선택 모델명 표시. 남은 일: GPT-6 계열 실제 생성 1회 검증(유료, 승인 필요) | 주인님 지시 | `ai-auto-blog/AGENTS.md` "모델 기본값·목록 정리" |
| BLOG 로그인 "fetch failed" 수정 (ai-auto-blog v1.07) | 단독 배포 환경변수에 옛(없어진) Supabase 주소가 들어가 있던 것을 공용 DB 값으로 교체, 로그인 화면 문구("세션 인증"→"로그인") 정리 | 주인님 신고(에러.png) | `ai-auto-blog/AGENTS.md` "로그인 fetch failed 수정" |
| BLOG 독립 배포 분리 (ai-auto-blog v1.06) | 루트 내장(www.buylife.xyz/blog)을 자체 Vercel 프로젝트 `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)로 분리, 메인 카탈로그 `app_url` 교체, 예전 /blog/* 주소는 새 주소로 넘김. 회원 전용 화면 서버 권한 확인·설정 저장 권한 확인 추가. 남은 일: 회원 계정으로 로그인→글 생성 실사용 확인 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "독립 배포 분리" |
| BLOG 버전 표시 (ai-auto-blog v1.05) | 버전 규칙이 DB에만 있던 것을 `ai-auto-blog/utils/version.ts` + 사이드바 제목 밑 표시로 보완 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "버전 표시" |
| BLOG 본문·이미지 모델 분리 선택 (ai-auto-blog v1.04) | 글 작성 화면에 SEO 스튜디오와 같은 "본문 생성 설정(OpenAI/Claude/Gemini+모델)"·"이미지 생성 설정(나노바나나 모델)" 카드. 키는 본문용/이미지용 각각 확인, 생성 실패 시 틀 글 대체 없이 오류 표시. 세 플랫폼 짧은 요청 검증 완료 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "본문 생성 모델·이미지 생성 모델 분리 선택" |
| BLOG(원문) 이미지 로직 개편 (ai-auto-blog v1.03) | SEO 스튜디오 방식 반영: 섹션마다 핵심 문장 1개를 원문 그대로 골라 그 문장만 그리는 짧은 장면 설명, 이미지 응답에서 inlineData part 탐색. **운영자 GEMINI_API_KEY 폴백으로 키 없는 회원 글이 운영자 비용으로 생성되던 문제 차단**(API_KEY_REQUIRED 안내), pollinations 대체 이미지 제거. 실측 검증 완료(내용 일치·가짜 글자 제거·설명 잘림 수정), 운영 GEMINI_API_KEY 삭제. 남은 일: 이미지 저장 Supabase 전환 | 주인님 지시 | `ai-auto-blog/AGENTS.md` "이미지 생성 로직" |
| 관리자(gmail) API 키 재등록 확인 (09-30) | 쓰레드 자동포스팅용 OpenAI·Perplexity 키를 주인님이 재등록 → OpenAI 모델 목록 조회 200, Perplexity 무과금 검증(빈 요청 400 vs 가짜 키 401)으로 유효 확인 | 주인님 | — |
| SEO 스튜디오 권한 규칙 적용 (v1.03) | Codex가 버전 표시(v1.02)는 이미 적용해 둠. 웹 `lib/access.ts`·확장 `lib/extensionAuth.ts`를 핵심 원칙 6번 순서로 정리(정지 차단·FREE 추가, 등급만/사용기간만 허용 제거). 막히는 회원 0명 | 주인님 지시 | `naver-blog-seo-studio/AGENTS.md` |
| 이용 권한 기본규칙 확정 (09-30) | FREE 배지 = 가입만 하면 등급과 무관하게 사용 / 그 외 = 구독 또는 일반 이상 + 사용기간. 핵심 원칙 6번으로 등록. 타로·캐릭코드에 FREE 배지 + 같은 규칙 판정 코드 적용(v1.03) | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 6번 |
| 이용 권한 베타테스트 정책 | 무료 배지 → 가입만 하면 사용 / 그 외 → 결제 구독 또는 일반 이상 + 사용기간. 등급만으로 열리던 예외 삭제. 루트 + 서브프로젝트 24곳 적용, 해당 프로그램 버전 +0.01 | 주인님 지시 | 루트 `CLAUDE.md` "이용 권한 판정 정책" |
| 🔒 `user_program_access` 보안 구멍 수정 | 모든 역할에 `using (true)`로 열려 있던 RLS 정책 "Service role full access" 삭제 → 회원은 본인 행 조회만, 쓰기는 service role(관리자 API)만. 적용 전 기존 4,702건 전부 관리자가 부여한 것 확인(악용 흔적 없음). 적용 후 회원 권한으로 검증: 본인 29건만 조회, 추가 시도 거부 | 주인님 승인 | 루트 마이그레이션 `0019` |
| 쇼핑제휴 복제 키트 (v1.02) | 다른 GitHub·Vercel·Supabase 계정으로 통째 복제하는 키트 `threads-affiliate-poster/clone-kit/`(설치 매뉴얼·기본지침·DB 설계·전체 스키마 SQL·환경변수·연동 매뉴얼 8종·복제 스크립트). 코드에 독립 운영 모드(`NEXT_PUBLIC_STANDALONE_MODE`, `src/lib/deployment.ts`) 추가 — 값이 없으면 기존과 동일. 스키마는 빈 PostgreSQL에서 실행 검증, 실제 새 계정 설치는 아직 | 주인님 요청 | TAP `README.md` "별도 서버로 통째 복제하기" |
| 프로그램 버전 관리 시작 | 30개 프로그램 전부 `v1.01`. DB `programs.version` 칸 추가(루트 마이그레이션 `0018`) → 메인 사이트 목록·상세·관리자 편집 화면에 표시. 21개 프로그램은 `lib/version.ts`의 `APP_VERSION`을 좌측 메뉴 제목 밑에 표시, auto-detail-page·mbti·mbti-character·tarot은 화면 제목 옆(또는 밑)에 표시(09-29 후반 추가). **이후 수정할 때마다 +0.01, 큰 변경은 주인님 지시 시 v2.01** | 주인님 지시 | 루트 `CLAUDE.md` 핵심 원칙 5번 |
| 작업 규칙 | 매 작업 5단계(빌드→커밋→푸시→배포→**인수인계 문서 반영**), 여러 CLI가 같은 폴더·스테이징을 공유한다는 주의 추가 | 다른 CLI가 이어받을 수 있게 | `79cc7e5` |

---

## 티스토리 기본 발행 모달 우회 및 본문 정렬 보존 (2026-10-02, v1.31)

- 기본 발행값(공개·댓글 허용·현재 발행)만 쓰는 경우 `applyRemainingTistorySettings()`가 티스토리 React 발행 모달을 열지 않고 카테고리·태그 적용 뒤 완료한다. 불필요한 모달 열기 실패가 제목·본문·이미지 입력 완료 후 전체를 중단시키지 않는다.
- `tistorySafeHtml()`은 원문의 안전한 `text-align` 값과 Tailwind 정렬 클래스를 티스토리용 인라인 스타일로 보존하며, 정렬 없는 본문 블록은 명시적으로 왼쪽 정렬한다. 이미지 삽입 뒤 남은 가운데 정렬 상태가 다음 문단에 번지는 문제를 막는다.

## 티스토리 홈주제 실제 포인터 선택 (2026-10-02, v1.32)

- 홈주제가 있는 기본 발행 설정은 `applyTistoryTopicWithTrustedClicks()`가 드롭다운과 정확히 일치하는 항목을 Chrome Debugger 포인터 클릭으로 선택하고, 선택 버튼 문구로 완료를 확인한다. 발행창 내부의 합성 클릭 결과가 반환되지 않아 생기던 일반 오류를 없앴다.

## 티스토리 재개 시 태그 입력칸 부재를 전체 중단으로 처리하지 않음 (2026-10-02, v1.33)

- `#tagText`는 모든 티스토리 상태에 존재하는 selector가 아니다. 재개 흐름은 남아 있는 발행 모달을 닫고 실제 태그 입력 후보를 찾으며, 입력칸이 없으면 태그만 건너뛰고 제목·본문·카테고리·홈주제 설정을 계속 적용한다. 완료 문구에 건너뛴 태그 개수를 표시한다.

## 3. 이어받는 도구가 꼭 알아야 할 것

- **클라우드 세션은 `cloud-work` 브랜치에서만 작업**한다(`docs/CLOUD_SESSION.md`). 로컬은 `master` 유지, 클라우드 작업은 로컬에서 병합 후 배포.
- **작업 전에 `docs/ERROR_LESSONS.md`(작업 중요 지침)를 꼭 읽고, 에러를 해결했거나 점검 사항을 찾으면 같은 커밋에 추가한다**(핵심 원칙 7번, 모든 CLI 공통).

- **여러 CLI가 같은 작업 폴더를 동시에 쓴다.** `git add`는 커밋 직전에만, 그리고 `git commit -m "..." -- <경로들>`처럼
  경로를 지정해 커밋한다. 남의 변경이 섞여 들어간 사례가 실제로 있었다.
- **배포는 서브프로젝트 폴더에서 `vercel deploy --prod --yes --scope buylife`.** Vercel과 GitHub는 연결돼 있지 않은 게 정상이다(CLI 업로드 방식).
- **테스트 계정**: `buylifemall@naver.com` = 일반 회원 테스트용(회원 기능 문제는 이 계정부터 확인), `buylifemall@gmail.com` = 관리자.
- **비용이 드는 작업은 매번 승인받는다**: 관리자 Gemini 키로 이미지 생성 같은 유료 호출, DB 스키마·환경변수 변경, 데이터 삭제.
- **비밀값 노출 금지**: 스크린샷 등에 앱 시크릿이 보여도 문서·커밋·답변에 옮겨 적지 않는다.
- **브라우저로 비밀번호 로그인을 대신하지 않는다.** 로그인이 필요한 화면 확인은 주인님께 요청한다.
- **데이터를 지어내서 화면을 채우지 않는다.** 실제 API가 주지 않는 수치(조회수 등)는 표시하지 않고 원문 링크를 준다.
- 로컬 빌드만 타입 에러가 나면 먼저 `node_modules` 버전이 `package.json`과 맞는지 확인한다(`npm install`로 해결된 사례: longtail).
- 사용자 호칭은 "주인님", 답변은 정중한 존댓말과 쉬운 한글.
# 티스토리 본문 끝 해시태그 복구 (2026-10-02, v1.34)

- 티스토리의 현재 글쓰기 화면에는 태그 전용 입력칸이 노출되지 않는 상태가 있다. v1.33은 이 경우 설정 적용을 계속하기 위해 태그를 건너뛰었지만, v1.34부터는 전용 입력칸이 없을 때 본문 끝에 왼쪽 정렬 `#태그` 줄을 넣고 삽입 결과를 확인한다. 이미 본문 또는 티스토리 전용 태그에 있는 값은 중복 입력하지 않는다.
# 티스토리 홈주제 적용 시 공개 범위 강제 확인 (2026-10-02, v1.35)

- 티스토리가 직전 글의 비공개 선택을 발행창에 유지할 수 있는데, 홈주제만 적용하는 빠른 경로는 공개 범위를 기본값으로 가정했다. 이제 홈주제를 적용할 때도 `공개` 라디오를 실제 포인터 클릭으로 확정하고 체크 상태를 검증한다.
# 티스토리 공개 라디오 식별 보강 (2026-10-02, v1.36)

- 실제 발행창에서 공개 라디오의 라벨 문구가 단독 `공개`가 아니어서 v1.35의 공개 선택 확인이 멈췄다. 구조 조사로 확인된 `#open20`을 우선 쓰고, 연결 라벨·형제·부모 중 화면에 보이는 대상을 실제 클릭하도록 보강했다.
# 티스토리 공개 라디오 일반 클릭 우선 적용 (2026-10-02, v1.37)

- v1.36의 포인터 클릭만으로는 현재 발행창의 공개 범위 React 상태가 체크로 확정되지 않았다. 공개 라디오는 먼저 티스토리 일반 클릭 경로로 선택하고, 체크되지 않은 경우에만 실제 포인터 클릭으로 재시도하며 확인 대기 시간을 4.5초로 늘렸다.
## 티스토리 본문 제목 중복 재발 차단 (2026-10-03, v1.49)

- 원인: v1.39의 제거기는 제목과 완전히 같은 Markdown 한 줄만 처리했다. 생성 프롬프트에 본문 제목 재출력 금지가 없었고, HTML/굵게 서식 제목 및 수정 저장 경로는 통과할 수 있었다.
- 조치: 프롬프트에 제목을 JSON `제목`에만 넣도록 명시했다. 공용 정규화기로 Markdown·HTML 독립 제목 블록을 생성, 수정 저장, 확장 전송 단계에서 모두 제거한다. 내용이 이어지는 컨테이너는 삭제하지 않는다.
## 티스토리 태그 첫 건 등록 뒤 오탐 중단 수정 (2026-10-03, v1.50)

- 증상/원인: 실제 글쓰기 화면에는 `업무` 태그 칩이 생성됐지만, v1.48 검증기는 예전 `.editor_tag > .txt_tag` 직계 구조만 조회해 현재의 “업무 태그 수정/삭제” 링크 구조를 찾지 못했다.
- 조치: `extension/sidepanel.js`가 `.txt_tag`, `.tag_link`, 태그 링크를 함께 수집하고, Enter 후 최대 4.5초 동안 실제 칩 생성을 확인하도록 변경했다. 최종 저장·발행은 자동으로 누르지 않는다.

- 2026-10-10 루트: 로그인·가입 후 기본 이동 페이지를 `/dashboard` → `/programs`로 변경(LoginForm, RegisterForm, middleware의 로그인 상태 auth 페이지 접근 리디렉트). `?redirect=` 지정 시에는 기존대로 그 경로로 이동.
- 2026-10-10 루트(정정): 로그인·가입 후 기본 이동 페이지를 `/programs` → `/`(메인 홈)로 재변경. 같은 3곳(LoginForm, RegisterForm, middleware). `?redirect=` 지정 시에는 기존대로 그 경로로 이동.
- 2026-10-10 루트: `/login?redirect=/dashboard`(대시보드 북마크·옛 링크 경유)로 들어와도 로그인 후 `/`(메인 홈)로 이동하도록 LoginForm에서 `/dashboard` redirect 값을 무시. 그 외 redirect(예: /admin, /affiliate)는 기존대로 유지.
- 2026-10-10 `shots` v1.05: 로그인 화면 제목 두 줄 표기("YOUTUBE Shots 자동화" / "(이미지 스토리)"). 사이드바 제목은 그대로.
- 2026-10-10 `real_estate_sales` v1.06: 작업 화면 흰색 베이스 통일 + 좌측 메뉴 제목 "부동산 투자분석 자동화"로 단축(globals.css 토큰 재매핑 + 클래스 치환). 로그인 화면은 원래 흰색이라 그대로.
- 2026-10-10 `shots` v1.07: 좌측 사이드바 제목을 두 줄("YOUTUBE Shots 자동화" / "(이미지 스토리)")로 줄바꿈 처리.
- 2026-10-10 루트: 관리자/회원 로그인 불가 버그 해결. `middleware.ts`에서 매 요청마다 모든 `sb-*` 쿠키에 `Set-Cookie: Max-Age=0`을 내려보내 세션을 즉각 파괴하던 버그 코드 제거, `LoginForm.tsx`에서 클라이언트 측 호스트 쿠키 안전 정리, `session_token` 발급 시 `cookieDomain` 일관 적용.
- 2026-10-10 루트: 대시보드(`/dashboard`, `/affiliate`, `/api-settings`, `/settings`) 좌측 사이드바(`components/layout/Sidebar.tsx`)에 관리자 계정(`profiles.is_admin=true`) 전용 "관리자 패널"(`/admin`) 메뉴 추가. `DashboardLayout`에서 `initialIsAdmin` SSR 주입 및 클라이언트 실시간 동기화 지원.
- 2026-10-10 **전 프로그램 로그인 공유(SSO) 진행 중 — A방식(주소 통일)**: 프로그램마다 주소(vercel.app)가 달라 쿠키가 공유되지 않아 프로그램마다 다시 로그인하던 문제. 해결: 모든 프로그램을 `<이름>.buylife.xyz` 로 열고 Supabase 로그인 쿠키 도메인을 `.buylife.xyz` 로 공유.
  - 코드 패턴(프로그램마다 3곳): `lib/supabase/cookieDomain.ts`(host 가 buylife.xyz 계열일 때만 `.buylife.xyz`, 그 외 undefined — vercel.app 에서는 기존 그대로) + 브라우저 client `cookieOptions.domain` + server client/미들웨어(proxy) 의 `setAll` 에서 `domain` 지정. (주의: 미들웨어에서 `Set-Cookie: Max-Age=0` 일괄 만료는 정상 세션 파괴를 유발하므로 클라이언트 로그인 시점에만 안전하게 정리해야 함).
  - **정책 문서(필독): `docs/DOMAIN_SSO_POLICY.md`, 루트 `CLAUDE.md`/`AGENTS.md` 핵심 원칙 11·12번**(옛 주소 유지, 쿠키 domain 조건, `sb-*` 일괄 만료 금지, OAuth `redirect_uri` 고정 여부 사전 확인, 프로그램별 절차). `shots`는 `redirect_uri`가 환경변수 고정이라 Meta/Google 변경 불필요(확인함).
  - 선행 작업(완료, 주인님): Cloudflare DNS 에 와일드카드 `*` **A 레코드 → 76.76.21.21**(프록시 끔/DNS only). `shots.buylife.xyz` 인증서·200 확인, `programs.app_url`(auto-shorts-posting) 새 주소로 갱신. 다음 단계: 프로그램별 `vercel domains add <이름>.buylife.xyz` + `programs.app_url` 갱신.
  - 파일럿: 루트(v 없음) + `shots` v1.06 코드 반영. 나머지 프로그램은 파일럿 검증(주소 이동 후 로그인 공유 확인) 뒤 순서대로 진행. **OAuth 리디렉트 URI(회원이 본인 Meta/Google 앱에 등록한 주소)는 옛 vercel.app 주소 기준이므로 옛 주소는 계속 유지한다 — 새 주소만 추가.**
