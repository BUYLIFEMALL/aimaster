# AIMaster 프로그램 정밀 분석·추가 개발 제안서

2026-10-19 · Codex · **분석 및 제안만 작성 / 운영 수정 미실행**

**판단:** 신규 기능을 늘리기 전에 공통 DB 접근 정책·직접 API 보호·회원별 보관·발송 정합성을 먼저 정비하고, 검증된 엔진을 활용한 작은 연계 MVP부터 확장하는 순서를 권합니다. 기존 상품을 폐지하거나 회원 간 자료를 공유하는 병합은 제안하지 않습니다.

[보기 좋은 HTML 보고서](REPORT.html) · [엑셀 전체 표](AIMaster_분석_개발제안_20261019.xlsx) · [프로그램 CSV](programs.csv) · [협업 실행표](ROADMAP.md)

**주인님 확정 방향(2026-10-19): 당분간 기존 프로그램 기능 개선·버그 수정·안정화에 집중합니다. 그 과정에서 잘 만들어지고 검증된 기능을 레퍼런스 모듈로 정리하고, 신규 프로그램·기존 프로그램 리뉴얼 때 필요한 모듈을 하나씩 적용합니다. 전체 프로그램 일괄 전환·지금 당장 모든 후보 추출은 하지 않습니다.**

[기능별 레퍼런스 모듈 운영안](REFERENCE_MODULE_PROPOSAL.md) · 기존4개/후보14개, 적용은 안정화 이후 하나씩.

## 분석 범위·확인 수준

- DB 카탈로그 **83개 / 활성81·비활성2 / 현재14개 카테고리**. 기능 중심 보조분류11개를 별도로 제안합니다. DB 카테고리를 수정한 것은 아닙니다.
- 고정 소스 기준 **c505498e**, 5,193개 소스 파일·471,728행을 자동 수집/정적 패턴 점검하고 프로그램 문서 615개를 색인했습니다. 전 코드를 사람이 한 줄씩 심층 검토하거나 전 기능을 실행했다는 뜻이 아닙니다. 위험 신호가 있는 주요 경로는 파일/호출/DB정책을 직접 대조했습니다.
- 운영 DB는 **테이블202개 모두 RLS 켜짐**을 확인했지만 RLS 이름/활성 여부만으로 소유자 격리를 인정하지 않았습니다. 정책·역할·grant를 함께 확인했습니다. 회원 행·API키/비밀번호 원문은 읽지 않았습니다.
- 등록 주소83개는 비로그인 HEAD·리디렉트 후200. 로그인 화면도200이므로 기능 정상 인증이 아닙니다. eBook API는 비용/조회가 없는 빈 입력2개만 POST해 인증보다 입력검증이 먼저 실행됨을 확인했습니다.
- 이번 실제 실행은 읽기 전용 메타데이터/공용 사본 검사/무해한 HTTP/오디오 lint 재현입니다. 전 프로그램 빌드·npm audit·회원 로그인 E2E·실제 수집/AI/게시/발송·렌더는 미실행. 제품 API 유료 호출0·DB변경0·운영배포0입니다.
- **확인 수준:** 운영 설정 확인 / 코드 확인(논리적 경로) / 조건부 코드 결함 / 기존 인수인계 대조 / 신규 제안. '버그가 없다'는 인증이나 실제 피해 발생을 뜻하지 않습니다.
- 다른 CLI가 계속 개발 중이므로 버전은 수집 시점 스냅샷입니다. 최종 재조회로 ai-task-planner v1.08·banana-canvas v1.10·landing-architect v1.10은 표에 갱신했습니다. 정적 점검량은 처음 고정 소스 기준입니다. [분석 중 갱신 기록](updates-during-review.json). 착수 전 최신 HEAD·DB·ACTIVE_WORK와 다시 비교합니다.

## 최우선 결론

| 순서 | 조치 | 대상 | 근거 | 승인·완료 기준 |
|---|---|---|---|---|
| 1 | PUBLIC 전체 허용 DB 정책 정비 | 메인/모든 회원 | F-001 운영 정책/anon CRUD 확인 | DB 승인 → 역할별 allow/deny → 롤백/운영 검증 |
| 2 | 직접 API 자격과 URL 안전 수집 | eBook Studio | F-002/F-003 | 401/403·가짜 DNS/redirect·본문 상한 회귀 |
| 3 | 회원 생성물 격리와 30일 보관 | 쇼핑제휴·쇼츠·포토·경쟁사 | F-004~006/F-016 | 소유자·원생성일·직접조회 cutoff·비접속 정리 |
| 4 | 유료 발송 중복/누락·회원 자격 | CRM·예약·메일 | F-007~011 | 선점·채널별 상태·정지/만료/비밀누락 차단 |
| 5 | 새 프로그램은 작은 MVP부터 | 브랜드·자료정제·UI명세·사진규격 | M-08/M-10/M-11/M-12 | 핵심2~3기능·기존 상품 유지·비용/권한 검증 |


## 현재 카테고리별 분류

현재 분류를 보존한 표입니다. 추천 분류는 작업 경로 탐색용 보조 태그이며 상품 이동/삭제 지시가 아닙니다.

| 현재 카테고리 | 수 | 활성/비활성 | 보조 분야(안) | 분류 개선 이유 |
|---|---|---|---|---|
| 데이터수집 / 기획 | 12 | 12/0 | 리서치·문서·기획 (Tools의 자기점검4개 별도) | 수집/기획/UI제작 또는 문서/자기점검이 섞여 있어 보조 태그 필요 |
| 쓰레드 | 5 | 5/0 | SNS 콘텐츠·소통 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 인스타 | 6 | 6/0 | SNS 콘텐츠·소통 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 블로그 | 7 | 7/0 | 블로그·네이버 운영 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 네이버 | 4 | 2/2 | 블로그·네이버 운영 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 유튜브 | 9 | 9/0 | 유튜브 성장·제작 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| CRM | 2 | 2/0 | 고객관계·마케팅 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 이커머스 | 5 | 5/0 | 상품소싱·커머스 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 마케팅(홍보) | 4 | 4/0 | 고객관계·마케팅 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 이미지 | 10 | 10/0 | 이미지·브랜드 디자인 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 음악 | 7 | 7/0 | 음악·미디어 제작 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 멀티미디어 | 3 | 3/0 | 음악·미디어 제작 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| 부동산 | 1 | 1/0 | 부동산 데이터 분석 (Tools의 자기점검4개 별도) | 목적·산출물·필요한 계정 태그를 함께 제공 |
| Tools | 8 | 8/0 | 문서·업무 생산성 (Tools의 자기점검4개 별도) | 수집/기획/UI제작 또는 문서/자기점검이 섞여 있어 보조 태그 필요 |


보조 분야 집계: 리서치·문서·기획 12개, SNS 콘텐츠·소통 11개, 블로그·네이버 운영 11개, 유튜브 성장·제작 9개, 고객관계·마케팅 6개, 상품소싱·커머스 5개, 이미지·브랜드 디자인 10개, 음악·미디어 제작 10개, 부동산 데이터 분석 1개, 문서·업무 생산성 4개, 라이프·자기탐색 4개. 각 프로그램은 하나의 기본 보조분야와 여러 연계 태그를 가질 수 있습니다.

## 프로그램별 분석 표 — 83개 전수

강점은 현재 구조와 기존 기능 자료를 종합한 요약입니다. '검증 과제'에는 구조적 한계/아이디어도 포함하며, 확인된 결함은 F-ID를 붙였습니다. F-ID가 없다고 결함이 없다는 뜻은 아닙니다. 코드 버전/DB 버전은 독립 표시합니다.

### 데이터수집|기획

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [AI 글쓰기 에디터 자동화](https://ai-writing-editor.buylife.xyz) | v1.10 / v1.10 | 리치 문장 편집과 분석 제안을 한 화면에서 처리 | 분석 제안 적용 전후 변경 추적·충돌 검증 필요 | 문장별 수정 이력과 원클릭 되돌리기 | markdown-studio·persona-style-studio·document-translator; M-09 | ; [프로그램 문서](../../ai-writing-editor/AGENTS.md); 정적점검 |
| [시네마틱 스토리보드 자동화](https://cinematic-storyboard-studio.buylife.xyz) | v1.09 / v1.09 | 이미지에서 9컷 콘티와 영상 프롬프트 구성 | 컷별 인물·소품 연속성은 생성 품질에 의존 | 캐릭터 시트와 컷 연속성 점검표 | ai-webtoon-studio·music-video-studio; M-07 | ; [프로그램 문서](../../cinematic-storyboard-studio/AGENTS.md); 정적점검 |
| [AI 랜딩페이지 기획 자동화](https://landing-architect.buylife.xyz) | v1.10 / v1.10 | 기획안과 격리된 HTML 미리보기 | 미리보기 성공이 실제 전환율·반응형 품질을 보장하지 않음 | 입력 목표를 검수 항목으로 바꾼 랜딩 QA 체크 | ui-canvas·react-ui-showcase·ai-slide-builder; M-10 | ; [프로그램 문서](../../landing-architect/AGENTS.md); 정적점검 |
| [마크다운 문서 자동화](https://markdown-studio.buylife.xyz) | v1.20 / v1.20 | 폴더·수정 이력·다양한 문서 형식·본인 Drive | 동기화 충돌과 복원 시 보관기한 유지 검증 필요 | 충돌 비교 화면·자료 출처/만료 메타데이터 | ai-writing-editor·ebook-studio·document-translator; M-09 | ; [프로그램 문서](../../markdown-studio/AGENTS.md); 정적점검 |
| [페르소나 문체 자동화](https://persona-style-studio.buylife.xyz) | v1.08 / v1.08 | 페르소나·문체 강도 조절 | 문체 변환이 숫자·고유명사까지 바꾸는지 검증 필요 | 사실 잠금과 문체만 변경하는 비교 모드 | ai-writing-editor·블로그·SNS;  | ; [프로그램 문서](../../persona-style-studio/AGENTS.md); 정적점검 |
| [UI Canvas 자동화](https://ui-canvas.buylife.xyz) | v1.10 / v1.10 | 드래그 UI 설계·구조 복원·PNG/JSON 내보내기 | 이미지 복원이 접근성·실행 코드 품질을 보장하지 않음 | 접근성 체크와 컴포넌트 속성 명세 내보내기 | landing-architect·ai-web-ui; M-10 | ; [프로그램 문서](../../ui-canvas/AGENTS.md); 정적점검 |
| [Website Scraper](https://website-scraper.buylife.xyz) | v1.12 / v1.12 | DNS·리디렉트까지 검사하는 안전 fetch 기반 | 사이트 구조 변경·차단·출처 검증 비용 | 다음 실행의 추출 구조 차이를 알려주는 변경 탐지 | web-crawler-saas·ebook-studio; M-09,M-12 | ; [프로그램 문서](../../ghost-scraper/AGENTS.md); 정적점검 |
| [웹 크롤링 자동화](https://web-crawler-saas.buylife.xyz) | v1.07 / v1.08 | AI 기반 구조 탐색과 표 데이터 수집 | DBv1.07·코드v1.08 차이의 운영 배포 확인 필요 | 수집 규칙 버전·깨진 선택자 탐지·샘플 재현 | website-scraper·file-merge; M-12 | F-017; [프로그램 문서](../../web-crawler/AGENTS.md); 정적점검 |
| [AI Prompt 자동화](https://ai-prompt.buylife.xyz) | v1.06 / v1.06 | 거친 요구를 모델용 프롬프트로 구조화 | 성공 기준 없이 문구만 좋아질 위험 | 예시 입력/기대 출력 기반 프롬프트 평가 세트 | prompt-template-studio·reverse-prompt; M-10 | ; [프로그램 문서](../../ai-prompt-studio/AGENTS.md); 정적점검 |
| [AI 프롬프트 템플릿 자동화](https://prompt-template.buylife.xyz) | v1.05 / v1.05 | 변수형 프롬프트 재사용 | 모델 버전 변경 후 결과 변동 추적 부족 검토 | 버전·변수 스키마·평가 결과를 묶은 개인 템플릿 | ai-prompt-studio·모든 생성 프로그램; M-10 | ; [프로그램 문서](../../prompt-template-studio/AGENTS.md); 정적점검 |
| [AI 슬라이드 자동화](https://ai-slide-builder.buylife.xyz) | v1.07 / v1.07 | 문서를 발표 구조와 PPTX로 변환 | 요약에서 숫자/근거 누락·슬라이드 잘림 검증 | 원문 위치 연결·장표별 근거 배지·표 넘침 검사 | markdown-studio·ebook-studio·ai-audio-analyzer; M-09,M-10 | ; [프로그램 문서](../../ai-slide-builder/AGENTS.md); 정적점검 |
| [AI 웹 UI 제작 자동화](https://ai-web-ui.buylife.xyz) | v1.05 / v1.05 | 컴포넌트 미리보기와 TSX 활용 | 샘플 렌더와 실제 프로젝트 호환성 차이 | 접근성/의존성/지원 버전 명세 포함 컴포넌트 패키지 | ui-canvas·landing-architect; M-10 | ; [프로그램 문서](../../react-ui-showcase/AGENTS.md); 정적점검 |

### 쓰레드

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [Threads AI 기획 자동화](https://threads-easy-planner.buylife.xyz) | v1.45 / v1.45 | 페르소나·훅·본문·CTA 기획 | 플랫폼 길이 제한과 실제 게시 흐름 연결 검증 | 글자 수·타래 분할·게시 전 검수 패키지 | threads-content-ops·auto-threads-posting;  | ; [프로그램 문서](../../threads-easy-planner/AGENTS.md); 정적점검 |
| [Threads 포스팅 자동화](https://auto-threads-posting.buylife.xyz) | v1.18 / v1.18 | 수집·초안·예약 게시 | 예약 주기는 개선돼도 중복·토큰 만료 회귀는 필요 | 예약 드라이런과 게시 결과 대조/실패 사유 표준화 | threads-easy-planner·threads-comment-reply;  | ; [프로그램 문서](../../threads/AGENTS.md); 정적점검 |
| [Threads 댓글자동화](https://threads-comment-reply.buylife.xyz) | v1.11 / v1.11 | 사람 승인 중심 답글·텔레그램 검토 | 플랫폼별 답글 상태·부분 실패·이력 탐색 편차 | 공통 승인 상태기계와 취소/중복 방지 회귀 | youtube-auto-reply·instagram-comment-reply; M-05 | ; [프로그램 문서](../../threads-comment-reply/AGENTS.md); 정적점검 |
| [Threads 쇼핑제휴 자동화](https://threads-affiliate-poster.buylife.xyz) | v1.62 / v1.62 | 상품·제휴 링크·개인 계정 발행 | 네이버 조회 결과의 전역 캐시가 개인 데이터 원칙과 충돌 | 회원별 캐시·출처/광고표시·링크 만료 검수 | trending-product-finder·상세페이지 계열; M-03 | F-004; [프로그램 문서](../../threads-affiliate-poster/AGENTS.md); 정적점검 |
| [Threads 콘텐츠 운영 자동화](https://threads-content-ops.buylife.xyz) | v2.04 / v2.04 | 페르소나·수집·상품·검토·발행 통합 | 기능과 설정 수가 많아 처음 쓰기 어려움 | 입문/전문 모드·누락 연결 진단·실행 전 비용표 | threads-easy-planner·댓글 계열;  | ; [프로그램 문서](../../threads-content-ops/AGENTS.md); 정적점검 |

### 인스타

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [INSTA 포스팅 자동화](https://auto-instagram-posting.buylife.xyz) | v1.24 / v1.24 | 수집·캡션·카드 이미지·예약 | 계정/앱 준비와 이미지 규격·게시 오류 부담 | 규격 사전검사와 수동 확인 가능한 예약 시뮬레이션 | cardnews-studio·ai-influencer-studio;  | ; [프로그램 문서](../../insta_auto_poster/AGENTS.md); 정적점검 |
| [AI 인플루언서 자동화](https://ai-influencer.buylife.xyz) | v1.12 / v1.12 | 외형·일상 콘티·PPL 컷 제작 | 다른 컷에서 얼굴/상품 일관성 흔들림 | 인물사진 로컬 품질검사 재사용·기준 컷 비교 | portrait-photo·fashion-style·cardnews-studio; M-07 | ; [프로그램 문서](../../ai-influencer-studio/AGENTS.md); 정적점검 |
| [INSTA 댓글자동화](https://instagram-comment-reply.buylife.xyz) | v1.15 / v1.15 | 게시물 댓글 답글 검토·승인 | 최근 댓글 수 제한과 이력 UX 편차 | 댓글 페이지 나눔·게시물 썸네일·중복 승인 차단 | threads-comment-reply·youtube-auto-reply; M-05 | ; [프로그램 문서](../../instagram-comment-reply/AGENTS.md); 정적점검 |
| [INSTA DM답변 자동화](https://instagram-dm-reply.buylife.xyz) | v1.14 / v1.14 | 대화 문맥 답변·사람 검토 | 시간창·수동 담당자 전환·고객정보 노출 검증 필요 | 응답 가능 시간 표시·담당자 인계·민감정보 가림 | crm-google-form·booking-reminder; M-04,M-05 | ; [프로그램 문서](../../instagram-dm-reply/AGENTS.md); 정적점검 |
| [AI 웹툰 자동화](https://ai-webtoon-automation.buylife.xyz) | v1.14 / v1.14 | 캐릭터 시트·에피소드·컷 생성 | 키가 없거나 실패해도 외부 무료 이미지 경로로 넘어감 | 엔진 명시 선택·실패 시 중단·말풍선 레이어 편집 | four-cut-comics·cinematic-storyboard-studio; M-07 | F-012; [프로그램 문서](../../ai-webtoon-studio/AGENTS.md); 정적점검 |
| [INSTA Cardnews 자동화](https://cardnews-studio.buylife.xyz) | v1.15 / v1.15 | 본문 기획·타이포·다중 카드 렌더 | 자동게시와 창작 편집은 다른 자격/검수 경계 | 폰트 라이선스 명세·카드 재정렬·문구 길이 검사 | insta_auto_poster·emotion-writer;  | ; [프로그램 문서](../../cardnews-studio/AGENTS.md); 정적점검 |

### 블로그

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [BLOG(원문)생성 자동화](https://ai-auto-blog.buylife.xyz) | v1.74 / v1.74 | 자료 수집에서 블로그 원문 생성 | 수집 출처와 생성 주장 간 연결 추적 필요 | 문장별 출처·중복 소재/인용 검사·검토 큐 | blog-keyword·ai-writing-editor·블로그 게시 계열;  | ; [프로그램 문서](../../ai-auto-blog/AGENTS.md); 정적점검 |
| [AI 블로그 키워드 자동화](https://blog-keyword.buylife.xyz) | v1.05 / v1.05 | 자동완성·경쟁도·이슈·글감 탐색 | 다른 도구와 점수/키워드 정의가 다름 | 지표 정의·수집일·검색 출처 표준화 | longtail-keyword-expander·competitor-analysis; M-01 | ; [프로그램 문서](../../blog-keyword/AGENTS.md); 정적점검 |
| [티스토리(원문)생성 자동화](https://tistory-auto-blog.buylife.xyz) | v1.82 / v1.82 | 원문 기획과 티스토리 발행 흐름 | 로그인·발행 실패와 생성 성공을 구분해야 함 | 생성/검토/발행 상태 분리·중복 포스트 차단 | ai-auto-blog·blog-content-maker;  | ; [프로그램 문서](../../tistory-auto-blog/AGENTS.md); 정적점검 |
| [네이버 블로그 에이전트](https://naver-blog-agent.buylife.xyz) | v1.94 / v1.94 | 수집·개인 글쓰기·발행 연계 | 브라우저/확장 의존과 네이버 에디터 변경 | 확장 호환 진단·테스트 게시물 없는 모의 입력 검수 | naver-blog-allinone·naver-blog-seo-studio;  | ; [프로그램 문서](../../naver-blog-agent/AGENTS.md); 정적점검 |
| [네이버 블로그 올인원 자동화](https://naver-blog-allinone.buylife.xyz) | v1.49 / v1.49 | 네이버 작업 흐름을 한곳에서 조합 | 기능 중복으로 사용자 선택 부담·엔진 편차 | 단계별 추천 경로와 게시 전 최종 검수 | blog-content-maker·naver-blog-agent;  | ; [프로그램 문서](../../naver-blog-allinone/AGENTS.md); 정적점검 |
| [AI 블로그 작업실 자동화](https://blog-workroom.buylife.xyz) | v1.11 / v1.11 | 글/이미지를 편집하는 집중형 작업실 | 내보내기 때 서식과 이미지 보존 차이 검증 | 플랫폼별 서식 프리플라이트·원문과 결과 비교 | ai-writing-editor·blog-content-maker;  | ; [프로그램 문서](../../blog-workroom/AGENTS.md); 정적점검 |
| [AI 블로그 콘텐츠 제작 자동화](https://blog-content-maker.buylife.xyz) | v1.10 / v1.10 | 단계형 글 생성과 전용 확장 | 확장 ZIP/manifest/DB 일치가 별도 운영 과제 | 사전검사 리포트와 입력 재실행/되돌리기 | blog-keyword·naver-blog-seo-studio;  | ; [프로그램 문서](../../blog-content-maker/AGENTS.md); 정적점검 |

### 네이버

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [네이버 카페 포스팅 자동화](https://naver-cafe-poster.buylife.xyz) | v1.15 / v1.15 | 개인 카페 계정의 글감·예약 발행 | 카페별 등급/규칙·중복 게시·플랫폼 변경 | 카페별 게시 규칙 체크·발행 전 미리보기/승인 | 블로그 계열·SNS 콘텐츠 팩;  | ; [프로그램 문서](../../naver-cafe-poster/AGENTS.md); 정적점검 |
| [네이버 블로그 자동화(App)](https://naver-blog-auto-poster.buylife.xyz) **비활성** | v1.12 / v1.12 | 개인 PC 데스크톱 실행 경로 | 비활성 상품·배포/지원 범위 혼선 | 재활성화 전 보안·설치/확장 지원 비용 판단 | 활성 네이버 프로그램으로 안내만 검토;  | ; [프로그램 문서](../../naver-blog-auto-poster_app/AGENTS.md); 정적점검 |
| [네이버 블로그 자동화(Web)](https://naver-blog-auto-poster-web.buylife.xyz) **비활성** | v1.13 / v1.13 | 사이드패널에서 네이버 입력 | 비활성 상품·확장 호환 지원 비용 | 기존 URL 유지·지원 종료/대체 경로 명확화 | 활성 네이버 프로그램으로 안내만 검토;  | ; [프로그램 문서](../../naver-blog-auto-poster_web/AGENTS.md); 정적점검 |
| [네이버 블로그 SEO 스튜디오](https://naver-blog-seo-studio.buylife.xyz) | v1.73 / v1.73 | 검색 전략·페르소나 기반 SEO 초안/재작성 | SEO 점수를 실제 노출 보장으로 읽을 위험 | 사실/출처/키워드 과밀 검사·지표 설명 통일 | blog-keyword·longtail-keyword-expander; M-01 | ; [프로그램 문서](../../naver-blog-seo-studio/AGENTS.md); 정적점검 |

### 유튜브

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [플레이리스트 채널 제작 자동화](https://playlist-maker.buylife.xyz) | v1.14 / v1.14 | 곡 기획·가사·업로드 문구·썸네일 | 실제 음악 생성/영상 출력은 별도 단계 | 트랙 명세·가사·썸네일 원클릭 제작 패키지 | suno-music-studio·yt-playlist-studio; M-06 | ; [프로그램 문서](../../playlist-channel-studio/AGENTS.md); 정적점검 |
| [AI 썸네일 마스터 자동화](https://thumbnail-master.buylife.xyz) | v1.07 / v1.07 | A/B 문구·이미지 썸네일 생성 | AI 이미지 속 한글 오류와 A/B 통제 변수 | 배경/텍스트 레이어 분리·같은 배경 A/B 비교 | seo-thumbnail-pro·youtube-channel-consultant; M-08 | ; [프로그램 문서](../../thumbnail-master/AGENTS.md); 정적점검 |
| [YOUTUBE CHANNEL CONSULTANT](https://youtube-channel-consultant.buylife.xyz) | v1.10 / v1.10 | 채널 진단·키워드·황금 채널 엔진 | 재분석마다 본인 할당량 소비·단면 지표 | 회원별 30일 스냅샷과 전후 변화 비교 | youtube-viral-studio·thumbnail-master; M-02 | ; [프로그램 문서](../../youtube-channel-consultant/AGENTS.md); 정적점검 |
| [YOUTUBE VIRAL FINDER](https://youtube-viral-studio.buylife.xyz) | v1.19 / v1.19 | 후보 발굴·보관·분석·참고 메모 | VPH/점수는 실측 성장률이 아닌 추정·한도 제약 | 동일 회원 스냅샷 비교·출처/모델/수집 시각 표시 | shorts-viral-studio·youtube-channel-consultant; M-02 | ; [프로그램 문서](../../youtube-viral-studio/AGENTS.md); 정적점검 |
| [쇼츠 떡상 분석·대본 자동화](https://shorts-viral-studio.buylife.xyz) | v1.11 / v1.11 | 분석 공식에서 소재·씬·프롬프트 제작 | 목록 방문 때만 만료 삭제·직접 조회 기한 검사 없음 | 조회/RLS cutoff·비접속 정리·씬별 예상 길이 | shorts-onestop-studio·cinematic-storyboard-studio; M-02 | F-005; [프로그램 문서](../../shorts-viral-studio/AGENTS.md); 정적점검 |
| [YOUTUBE Shots(이미지 스토리) 자동화](https://shots.buylife.xyz) | v1.16 / v1.16 | 스토리·장면·음악·영상·게시 흐름 | 다중 제공사·긴 처리·부분 실패 비용 | 단계별 재개와 이미 완료된 유료 단계 재사용 | shorts-viral-studio·cardnews-studio;  | ; [프로그램 문서](../../shots/AGENTS.md); 정적점검 |
| [유튜브 댓글자동화](https://youtube-auto-reply.buylife.xyz) | v1.11 / v1.11 | 사람 승인·댓글 수집·대시보드 | 기존 개선 일부 완료와 텔레그램 이전 작업 구분 필요 | 플랫폼 공통 상태/수동 승인 회귀·운영 연결 점검 | Threads/Instagram 댓글 계열; M-05 | ; [프로그램 문서](../../youtube-auto-reply/AGENTS.md); 정적점검 |
| [AI 유튜브 썸네일 프로](https://seo-thumbnail-pro.buylife.xyz) | v1.10 / v1.10 | 주제/문구/시각 설계·캔버스 | 생성 품질과 실제 클릭률의 인과 혼동 | 텍스트 직접 합성·모바일 피드 프리뷰·A/B 명세 | thumbnail-master·youtube-channel-consultant; M-02 | ; [프로그램 문서](../../seo-thumbnail-pro/AGENTS.md); 정적점검 |
| [AI 쇼츠 원스톱 제작 자동화](https://shorts-onestop-studio.buylife.xyz) | v1.18 / v1.18 | 대본·장면·음성·자막·최종 영상 조합 | 렌더 자원·자막/음성 길이·작업 취소 정합성 | 최종 출력 전 길이/무음/자막 넘침 자동검사 | shorts-viral-studio·music-video-studio; M-07 | ; [프로그램 문서](../../shorts-onestop-studio/AGENTS.md); 정적점검 |

### CRM

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [구글폼 CRM 자동화](https://crm-google-form.buylife.xyz) | v1.09 / v1.09 | 폼 접수·다채널 확인·후속 연락 | 응답ID 중복 처리와 웹훅 요청 제한 미비 | 원자적 중복 차단·발송 전 작업 선점·수신 동의 | booking-reminder·stepmail; M-04 | F-007,F-011; [프로그램 문서](../../crm-google-form/AGENTS.md); 정적점검 |
| [카카오톡 뉴스레터 자동화](https://kakao-auto-posting.buylife.xyz) | v1.16 / v1.16 | 뉴스 수집·요약·채널 발송 | 채널/수신자 자격과 발송 정책 의존 | 출처/최신성 배지·수신거부·발송 미리보기 | crm-google-form·stepmail;  | ; [프로그램 문서](../../kakao_auto_poster/AGENTS.md); 정적점검 |

### 이커머스

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [상품소싱 자동화](https://trending-product-finder.buylife.xyz) | v1.14 / v1.14 | 트렌드·경쟁 신호·소싱·마진 계산 | 기회점수는 실제 판매/수익 확정이 아님 | 가정별 마진 민감도·실측/추정/누락 데이터 구분 | 상세페이지 3종·threads-affiliate-poster; M-03 | ; [프로그램 문서](../../trending-product-finder/AGENTS.md); 정적점검 |
| [상세페이지 GIF 자동화](https://video-to-gif.buylife.xyz/dashboard) | v1.06 / v1.06 | 브라우저 변환과 결과 용량 제한 | 대용량 다중 파일의 메모리/대기 비용 | 파일별 예상 용량·중단/재개·작업 큐 | shop-detail-page·infinite-loop-video; M-03 | ; [프로그램 문서](../../video-to-gif/AGENTS.md); 정적점검 |
| [상세페이지 자동화(15p)](https://shop-detail-page.buylife.xyz) | v1.14 / v1.14 | 실제 상품 분석·15구간 개별 생성 | 고정 섹션·AI 글자/상품 사실 확인 | 섹션 재정렬·사실 잠금·텍스트 별도 레이어 | detail-page-12p·auto-detail-page; M-03 | ; [프로그램 문서](../../shop-detail-page/AGENTS.md); 정적점검 |
| [상세페이지 자동생성기 v1](https://auto-detail-page.buylife.xyz) | v1.13 / v1.13 | HTML 상세페이지·여러 이미지 엔진 | HTML 외부 리소스/상품 주장·내보내기 검증 | 검증된 사실 스키마·이미지/HTML 동일 내용 검사 | shop-detail-page·trending-product-finder; M-03 | ; [프로그램 문서](../../auto-detail-page/AGENTS.md); 정적점검 |
| [AI 12단 상세페이지 자동화](https://detail-12p.buylife.xyz) | v1.09 / v1.09 | 12/9단 구조·사양서/사진 기반 제작 | 자동 스펙/후기형 문구의 사실성 확인 | 인증/리뷰를 근거 없이는 확정하지 않는 사실 잠금 | shop-detail-page·video-to-gif; M-03 | ; [프로그램 문서](../../detail-page-12p/AGENTS.md); 정적점검 |

### 마케팅(홍보)

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [대량 메일발송 자동화(Step Mail)](https://stepmail.buylife.xyz) | v1.16 / v1.16 | 고객 차수·다중 본인 SMTP·예약 | 서버 발송 선점·수신거부·반송 대조 필요 | 수신 동의 원장·부분 실패 재시도·반송 대시보드 | crm-google-form·booking-reminder; M-04 | F-011; [프로그램 문서](../../stepmail/AGENTS.md); 정적점검 |
| [경쟁사 키워드분석 자동화](https://competitor-analysis.buylife.xyz) | v1.07 / v1.08 | 키워드/경쟁사 리서치·보고서 | 운영v1.07과 회원격리 후보v1.08의 승인/배포 분리 | 준비된 회원격리·30일 전환안을 승인 후 우선 적용 | longtail-keyword-expander·blog-keyword; M-01 | F-016; [프로그램 문서](../../competitor-analysis/AGENTS.md); 정적점검 |
| [롱테일 키워드분석 자동화](https://longtail-keyword-expander.buylife.xyz) | v1.08 / v1.08 | 키워드 확장과 담당자용 작업 지시 | 긴 단계의 진행률·호출비용·재실행 부담 | 단계별 진행/중단·회원 내 중복 키워드 사전 | competitor-analysis·naver-blog-seo-studio; M-01 | ; [프로그램 문서](../../longtail-keyword-expander/AGENTS.md); 정적점검 |
| [예약(취소)방지 리마인드 자동화](https://booking-reminder.buylife.xyz) | v1.07 / v1.07 | 예약 전후 다채널 알림 | 발송 후 기록·실패도 발송완료 집합 취급·시간대 | 선점/채널별 상태·유효기간/정지 검증·KST 고정 | crm-google-form·stepmail; M-04 | F-008,F-009,F-010,F-011; [프로그램 문서](../../booking-reminder/AGENTS.md); 정적점검 |

### 이미지

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [AI 이미지 스튜디오](https://ai-image-studio.buylife.xyz) | v1.18 / v1.18 | 여러 엔진의 기준 이미지 호출 | 엔진별 지원 크기/편집/참조 능력 차이 | 기능 명세로 가능한 옵션만 표시·부분 재생성 비용표 | 모든 이미지 생성 프로그램의 호출 기준;  | ; [프로그램 문서](../../ai-image-studio/AGENTS.md); 정적점검 |
| [AI 바나나 캔버스 자동화](https://banana-canvas.buylife.xyz) | v1.10 / v1.10 | 참고 이미지·프롬프트·편집 캔버스 | 반복 수정의 원본 대비 변화/비용 누적 | 선택 영역 변경 이력·원본 보존·다단계 되돌리기 | style-dna-analyzer·allinone-graphic; M-08 | ; [프로그램 문서](../../banana-canvas/AGENTS.md); 정적점검 |
| [AI 패션스타일 자동화](https://fashion-style.buylife.xyz) | v1.10 / v1.10 | 인물/의상 중심 스타일 제작 | 인물·의상 로고/디테일 일관성·체형 왜곡 | 로컬 인물 검사·상품 부분 사실 잠금·전후 비교 | portrait-photo·ai-influencer-studio; M-11 | ; [프로그램 문서](../../fashion-style/AGENTS.md); 정적점검 |
| [AI 4컷 만화 자동화](https://four-cut-comics.buylife.xyz) | v1.12 / v1.12 | 4컷 스토리·캐릭터·합성 | 캐릭터/말풍선 위치·대사 품질 확인 | 캐릭터 참조·대사 직접 합성·무빙툰 내보내기 | ai-webtoon-studio·shorts-onestop-studio; M-07 | ; [프로그램 문서](../../four-cut-comics/AGENTS.md); 정적점검 |
| [이미지 변환 스튜디오](https://image-convert-studio.buylife.xyz) | v1.07 / v1.07 | 브라우저 이미지 변환·압축 | 대량 변환 메모리·투명도/색공간 손실 검증 | 출력 전 투명도·픽셀·예상용량 비교 | 상품 상세·썸네일·프로필 계열; M-08,M-11 | ; [프로그램 문서](../../image-convert-studio/AGENTS.md); 정적점검 |
| [AI 인물사진 자동화](https://portrait-photo.buylife.xyz) | v1.28 / v1.28 | 규격 저장·로컬 얼굴/품질 점검 | 머리 추정선은 실측 인증이 아님 | 서류 규격 프로파일·수동 보정·보존성 검수 | fashion-style·ai-influencer-studio·four-cut-comics; M-11 | ; [프로그램 문서](../../portrait-photo/AGENTS.md); 정적점검 |
| [이미지 스타일 분석기](https://style-dna-analyzer.buylife.xyz) | v1.22 / v1.22 | 실측 팔레트+이미지 스타일 역분석 | AI 스타일 해석과 픽셀 지표의 혼동 | 실측/추정 라벨·비교 슬라이더·스타일 버전 | ai-image-studio·banana-canvas·reverse-prompt; M-08 | ; [프로그램 문서](../../style-dna-analyzer/AGENTS.md); 정적점검 |
| [감성 글귀 이미지](https://emotion-writer.buylife.xyz) | v1.15 / v1.15 | 직접 타이포 합성·여러 비율 | 긴 문장 잘림·폰트 라이선스·자동배치 | 문단별 캐러셀·자동 행갈이·가독성 검사 | cardnews-studio·kakao-auto-posting; M-08 | ; [프로그램 문서](../../emotion-writer/AGENTS.md); 정적점검 |
| [AI 올인원 그래픽 자동화](https://graphic.buylife.xyz) | v1.07 / v1.07 | 여러 직군 템플릿과 부분 편집 | 템플릿 선택 부담·개별 앱과 기능 겹침 | 작업 목적별 3문항 추천·원본/수정영역 비교 | style-dna-analyzer·banana-canvas; M-08 | ; [프로그램 문서](../../allinone-graphic/AGENTS.md); 정적점검 |
| [AI 포토 리메이크 자동화](https://photo-remake-studio.buylife.xyz) | v1.09 / v1.09 | 복원·합성·확대·본인별 로컬 보관 | 보관함은 개수만20개 제한·날짜 만료 없음 | 30일 조회 차단/기회 정리·파일 보존/비교 명확화 | portrait-photo·fashion-style; M-11 | F-006; [프로그램 문서](../../photo-remake-studio/AGENTS.md); 정적점검 |

### 음악

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [AI 마스터링 스튜디오](https://ai-mastering-studio.buylife.xyz) | v1.04 / v1.04 | 브라우저 오디오 처리와 프리셋 | 음량 차이를 품질 향상으로 오인할 위험 | 같은 음량 A/B·클리핑/피크·처리 전후 지표 | ai-audio-analyzer·yt-playlist-studio; M-06 | ; [프로그램 문서](../../ai-mastering-studio/AGENTS.md); 정적점검 |
| [뮤직비디오 자동화](https://music-video-studio.buylife.xyz) | v1.11 / v1.11 | 음악/기획과 영상 장면 제작 | 여러 엔진·분절된 렌더/저작물 자격 | 샷별 재개·오디오 길이·소스 권리 명세 | suno-music-studio·cinematic-storyboard-studio;  | ; [프로그램 문서](../../music-video-studio/AGENTS.md); 정적점검 |
| [Suno 음악기획 자동화](https://suno-music-studio.buylife.xyz) | v1.11 / v1.11 | 가사/스타일 기획·복사·보관 | 기획과 실제 곡 생성 결과 사이 수동 전달 | 트랙 명세와 가사/사용 허락 묶음 내보내기 | music-automation·playlist-channel-studio; M-06 | ; [프로그램 문서](../../suno-music-studio/AGENTS.md); 정적점검 |
| [음악(SUNO)자동화](https://music-automation.buylife.xyz) | v1.16 / v1.16 | 본인 음악 서비스 키·곡 생성/관리 | 웹훅 지연·작업 중복·내보내기 권리 확인 | 작업ID 정합성·재요청 전 상태 확인·트랙 명세 | yt-playlist-studio·ai-mastering-studio; M-06 | ; [프로그램 문서](../../music/AGENTS.md); 정적점검 |
| [LP 턴테이블 자동화](https://lp-turntable.buylife.xyz) | v1.12 / v1.12 | 턴테이블 시각 연출과 영상 출력 | 로컬 저장 및 긴 출력의 복구성 검증 | 아트워크/음원 명세·검정화면/무음 사전검사 | yt-playlist-studio·playlist-channel-studio; M-06 | ; [프로그램 문서](../../vinyl-lp-studio/AGENTS.md); 정적점검 |
| [Youtube Playlist 자동화](https://youtube-playlist.buylife.xyz) | v1.14 / v1.14 | 음원·시각화·챕터·영상 출력 | 브라우저 장시간 렌더·기기 지원 제한 | 출력 지원 진단·시간/메모리 예상·실패 재개 | suno-music-studio·music-automation·vinyl-lp-studio; M-06 | ; [프로그램 문서](../../yt-playlist-studio/AGENTS.md); 정적점검 |
| [AI Audio분석 자동화](https://audio.buylife.xyz) | v1.04 / v1.04 | 음성/음악 분류·회의록/프롬프트 | API에서 로그인만 확인·프로그램 권한/파일 상한 미검사 | 공통 권한 게이트·크기/형식 검증·예상 비용 | markdown-studio·ai-mastering-studio; M-06 | F-013,F-014,F-019; [프로그램 문서](../../ai-audio-analyzer/AGENTS.md); 정적점검 |

### 멀티미디어

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [무한루프 영상자동화](https://infinite-loop-video.buylife.xyz) | v1.05 / v1.05 | 무료 로컬 루프 분석·크로스페이드 | 원본 움직임/오디오 이음새와 긴 처리 | 끝/시작 미리듣기·작업시간 예측·짧은 샘플 | yt-playlist-studio·music-video-studio;  | ; [프로그램 문서](../../infinite-loop-video/AGENTS.md); 정적점검 |
| [뮤직 플레이어 자동화](https://music-player.buylife.xyz) | v1.08 / v1.08 | 파일 로컬 재생·시각화·EQ | 미디어 키/볼륨 등의 기존 완료와 신규 과제 구분 | 재생목록 명세·분석/마스터링 전후 비교 | ai-audio-analyzer·ai-mastering-studio;  | ; [프로그램 문서](../../music-player/AGENTS.md); 정적점검 |
| [AI 리버스 프롬프트 자동화](https://reverse-prompt.buylife.xyz) | v1.04 / v1.04 | 이미지/영상/음악의 역프롬프트 | 원작과 유사하게 만들기와 원인 분석을 혼동 | 출력 목적/권리 확인·불확실성·모델별 변환 | style-dna-analyzer·suno-music-studio;  | ; [프로그램 문서](../../reverse-prompt/AGENTS.md); 정적점검 |

### 부동산

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [부동산 실거래 투자분석 자동화](https://real-estate-sales.buylife.xyz) | v1.15 / v1.15 | 공공 실거래+개인 관심/AI분석 | 공시가/AI추정/신고일을 현재 호가로 오독 가능 | 데이터 기준일·누락·가정별 투자 시나리오 | document-translator·ai-slide-builder;  | ; [프로그램 문서](../../real_estate_sales/AGENTS.md); 정적점검 |

### Tools

| 프로그램·운영 링크 | DB / 코드 | 강점 | 검증 과제·개선 기회 | 개선 아이디어 | 연계·병합 후보 | 근거·검토 수준 |
|---|---|---|---|---|---|---|
| [AI 할 일·성과 관리](https://ai-task-planner.buylife.xyz) | v1.08 / v1.08 | 계획·집중 시간·실제 성과 비교 | 차트/계정위치 회귀는 분석 중 v1.08에서 수정 완료·새 제안과 구분 | 일괄 품질검사 결과를 개인 실행 계획으로 수동 가져오기 | markdown-studio·ai-audio-analyzer;  | ; [프로그램 문서](../../ai-task-planner/AGENTS.md); 정적점검 |
| [AI 문서번역 자동화](https://document-translator.buylife.xyz) | v1.04 / v1.04 | 용어집·숫자/URL 대조·역번역 | 스캔 문서 미지원·긴 문서 분할/서식 제한 | 용어 잠금·원문 대조·구간 재번역 비용 절감 | ebook-studio·ai-writing-editor; M-09,M-12 | ; [프로그램 문서](../../document-translator/AGENTS.md); 정적점검 |
| [AI 엑셀·텍스트 합치기 자동화](https://file-merge.buylife.xyz) | v1.07 / v1.07 | 헤더 정합·중복 제거·서식 유지 | 최근 브라우저 실패는 제품 결함 아닌 실행 순서 | 결측/중복 품질표·결과 근거 열·안내 개선 | web-crawler-saas·crm-google-form; M-12 | ; [프로그램 문서](../../file-merge/AGENTS.md); 정적점검 |
| [AI 종합 성격 진단 자동화](https://personality-suite.buylife.xyz) | v1.06 / v1.06 | 다양한 자기점검·종합 결과 | 의료/채용 판단으로 오용·척도 혼합 해석 | 검사별 설명·비교 가능한 범위·개인 정보 내보내기 | personality-code·mbti-character;  | ; [프로그램 문서](../../personality-suite/AGENTS.md); 정적점검 |
| [성격코드(MBTI) 측정기](https://personality-code.buylife.xyz) | v1.05 / v1.05 | 빠른/정식 성격유형 검사 | 심리검사의 확정 진단처럼 읽을 위험 | 근소 차이·재검사 변동·비진단 안내 | personality-suite·mbti-character;  | ; [프로그램 문서](../../mbti/AGENTS.md); 정적점검 |
| [캐릭코드(MBTI) 측정기](https://mbti-character.buylife.xyz) | v1.14 / v1.14 | 오리지널 캐릭터형 공유 결과 | 성격 유형 단순화·결과 보관/공유 범위 확인 | 동의 기반 공유 카드·시각 표현만 선택 | personality-code·personality-suite;  | ; [프로그램 문서](../../mbti-character/AGENTS.md); 정적점검 |
| [AIMaster 타로점](https://tarot-reading.buylife.xyz) | v1.13 / v1.13 | 독자 화풍 이미지·다양한 스프레드 | 건강/재무 결정의 확정 근거로 오독 가능 | 재미/자기성찰 안내·생성 단계 비용/재시도 분리 | 자기성찰 노트·markdown-studio;  | ; [프로그램 문서](../../tarot/AGENTS.md); 정적점검 |
| [eBook Studio](https://ebook-studio.buylife.xyz) | v1.09 / v1.09 | 자료 수집·목차·장별 구성·EPUB/PDF | 스크래핑/생성 API 자격 검사·URL 안전 검사 부족 | 권한 게이트·safeFetch·출처/그림/폰트 명세 | markdown-studio·document-translator·ai-slide-builder; M-09 | F-002,F-003; [프로그램 문서](../../ebook-studio/AGENTS.md); 정적점검 |

## 확인된 문제·조건부 위험·후속 조사 — 19건

| ID/우선 | 문제 | 대상 | 확인 수준 | 권장 방향 |
|---|---|---|---|---|
| F-001 P0 | 공통 DB의 PUBLIC 전체 허용 정책 | AIMaster | 운영 설정 확인 | 각 테이블 공개 읽기/본인 읽기/관리자 쓰기 역할 분리. 불필요 grant 회수. service_role은 정책 없이 RLS 우회하므로 public 허용으로 대체하지 않음. |
| F-002 P0 | eBook 직접 API의 로그인·프로그램 자격 강제 누락 | ebook-studio | 코드 확인·무해한 운영 응답 확인 | 모든 작업 API 시작에 checkProgramAccessApi, JSON401/403. 회원 본인 키만 사용, 익명 clientKey 경로로 자격을 건너뛰지 않음. |
| F-003 P0 | eBook URL 수집의 SSRF 방어 미비 | ebook-studio | 코드 확인 | Website Scraper safeFetch를 기준 후보로 비교. 공개 IP 고정·리디렉트 매 단계 재검증·응답 바이트 상한·전체 마감시간. |
| F-004 P1 | 네이버 검색/트렌드 캐시 회원 간 공유 | threads-affiliate-poster | 코드·운영 정책 확인 | 회원 소유자/키 네임스페이스·RLS·원래 생성일 cutoff·정리 작업을 설계. 무소유 기존 자료 임의 귀속 금지. |
| F-005 P1 | 쇼츠 프로젝트 직접 조회의 30일 경계 누락 | shorts-viral-studio | 코드·운영 정책 확인 | 직접/목록/수정 모두 cutoff·RLS, 비접속 정리, 삭제오류 처리. 저장 프롬프트가 회원 설정인지 생성물인지 별도 분류. |
| F-006 P1 | 포토 리메이크 로컬 보관함에 날짜 만료 없음 | photo-remake-studio | 코드 확인 | 원래 createdAt 기반30일 조회차단·진입/저장 시 기회정리, 브라우저 미실행 중 물리 삭제 한계를 명시. 엄격한 서버 삭제가 필요하면 서버 저장 별도 설계. |
| F-007 P1 | CRM 웹훅 재전송이 접수/유료 발송을 중복 실행 | crm-google-form | 코드·인덱스 메타데이터 확인 | source+responseId unique, idempotency 저장/선점 후 처리, 응답ID 누락 처리 규칙, 채널별 발송 상태. |
| F-008 P1 | 예약 알림의 선점 전 발송·실패 재시도 누락 | booking-reminder | 코드 확인 | DB 작업 선점/채널별 상태·제공사 idempotency 가능한 경우 사용, 실패만 제한 재시도, insert 오류 처리. |
| F-009 P1 | 예약 메시지의 시간대가 서버 기본값 의존 | booking-reminder | 코드 확인·순수 계산 재현 | Asia/Seoul 명시·저장 UTC/표시 KST·날짜 경계 단위 검사. |
| F-010 P1 | 예약 Cron의 현재 회원 자격 재확인 누락 | booking-reminder | 코드 확인 | Cron에서도 공용 자격 판정. 관리자/FREE 예외 순서 유지. 정지·만료면 발송 보류하고 사유 기록. |
| F-011 P1 | Cron 인증 비밀 누락 시 fail-closed 아님 | booking-reminder,stepmail,crm-google-form | 조건부 코드 결함 | 비밀 문자열 존재/공백 검증 실패 시 서버설정오류로 종료, 헤더 비교 이전 차단. |
| F-012 P1 | 웹툰 생성 실패/키 미등록 뒤 다른 외부 엔진 자동 호출 | ai-webtoon-studio | 코드 확인 | 키 없음/인증/결제/안전차단은 중단. 무료 대체도 별도 엔진의 명시 선택·개인 계정 조건·전송 안내를 먼저 정의. |
| F-013 P1 | 오디오 분석 API가 로그인만 확인 | ai-audio-analyzer | 코드 확인 | 공통 checkProgramAccessApi를 분석·키쓰기 진입에 사용하고 JSON401/403 통일. |
| F-014 P1 | 오디오 업로드의 서버 파일 상한/종류 검증 부족 | ai-audio-analyzer | 코드 확인 | 서버 크기/MIME/모드/문자수 제한, 업로드/모델 한도에 맞는 분할, 시간 제한·오류 안내. |
| F-015 P2 | 공용 모듈 시간 검사 마지막 성공 문구가 수동확인을 숨김 | AIMaster | 검사 실행 확인 | verified/manual/failed 개수와 종료 정책 분리·동적 식 메타데이터 등록. |
| F-016 P1 | 경쟁사 회원격리 v1.08 후보와 운영 v1.07 간 승인 대기 | competitor-analysis | DB·코드·기존 인수인계 대조 | 기존 MEMBER_RETENTION_HANDOFF를 검토해 승인 범위 확정→마이그레이션/실제 자격 테스트→배포/DB 동기화. |
| F-017 P2 | 웹 크롤러 DB/코드 버전 차이 | web-crawler-saas | 메타데이터 대조 | Vercel source SHA/노출 버전/기존 handoff 확인 후 실제 운영 코드와 동기화. |
| F-018 P2 | 개선 원장의 과거 미완료와 현재 완료 상태 혼재 | AIMaster | 문서·최신 코드 대조 | 안정 ID별 최신상태·검증SHA/일자·원장폐기 아닌 superseded 연결·카탈로그 자동 대조. |
| F-019 P2 | 오디오 분석 lint 명령이 실제 검사 대신 실패 | ai-audio-analyzer | 실행 재현 | 해당 버전의 ESLint 설정/명령을 갖추고 다른 프로그램은 무조건 일괄 변경하지 않음. |

### F-001 · P0 · 공통 DB의 PUBLIC 전체 허용 정책

| 구분 | 내용 |
|---|---|
| 대상/수준 | AIMaster / 운영 설정 확인 |
| 관찰 | user_sessions·site_settings·coupons·coupon_usage: FOR ALL TO public USING(true) WITH CHECK(true), anon CRUD grant 모두 true. 정책 이름만 Service role full access. |
| 영향·한계 | 데이터 접근/변조 차단이 정책 수준에서 무력화될 수 있음. 실제 침해·유출 여부는 조사하지 않음. |
| 개선 | 각 테이블 공개 읽기/본인 읽기/관리자 쓰기 역할 분리. 불필요 grant 회수. service_role은 정책 없이 RLS 우회하므로 public 허용으로 대체하지 않음. |
| 검증 완료 기준 | anon·회원A/B·관리자별 SELECT/INSERT/UPDATE/DELETE 허용/거부 SQL 테스트. 운영 복제/롤백 검사 후 승인된 마이그레이션. |
| 승인·현재 상태 | DB 정책/권한 변경 사전 승인 필요 / 제안서 기록만, 미수정 |
| 근거 | [db-metadata.json](db-metadata.json) · [../../supabase/schema.sql:340](../../supabase/schema.sql) |

### F-002 · P0 · eBook 직접 API의 로그인·프로그램 자격 강제 누락

| 구분 | 내용 |
|---|---|
| 대상/수준 | ebook-studio / 코드 확인·무해한 운영 응답 확인 |
| 관찰 | scrape 라우트는 인증 호출 없음. cover/outline/chapter는 getUser()가 null이어도 즉시 차단하지 않고 clientKey 입력 경로를 계속 수행. 앱 layout 보호는 API 보호가 아님. 빈 urls/빈 title 비로그인 운영 요청은401 대신400. |
| 영향·한계 | 직접 API 경로에서 미가입/정지/기간 만료 정책 누락. 유효 키·유료 생성 호출은 재현하지 않음. |
| 개선 | 모든 작업 API 시작에 checkProgramAccessApi, JSON401/403. 회원 본인 키만 사용, 익명 clientKey 경로로 자격을 건너뛰지 않음. |
| 검증 완료 기준 | 비로그인401, 정지/권한만료403, 정상회원 본인 키·유효 입력. 모든 AI 호출은 모의 응답. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ebook-studio/src/app/api/scrape/route.ts:3](../../ebook-studio/src/app/api/scrape/route.ts) · [../../ebook-studio/src/app/api/ai/cover/route.ts:8](../../ebook-studio/src/app/api/ai/cover/route.ts) · [http-evidence.json](http-evidence.json) |

### F-003 · P0 · eBook URL 수집의 SSRF 방어 미비

| 구분 | 내용 |
|---|---|
| 대상/수준 | ebook-studio / 코드 확인 |
| 관찰 | new URL 뒤 표준 fetch, 사설 IP/DNS/리디렉트 검증 없이 본문 전체 res.text(). 실제 내부망 접근은 시험하지 않음. |
| 영향·한계 | 회원 입력 URL이 서버의 내부 주소/리디렉트로 향하거나 큰 본문을 읽을 위험. |
| 개선 | Website Scraper safeFetch를 기준 후보로 비교. 공개 IP 고정·리디렉트 매 단계 재검증·응답 바이트 상한·전체 마감시간. |
| 검증 완료 기준 | 테스트용 fake DNS/redirect/oversize fixtures로 차단 확인. 실제 내부망/메타데이터 주소를 호출하지 않음. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ebook-studio/src/app/api/scrape/route.ts:29](../../ebook-studio/src/app/api/scrape/route.ts) · [../../ebook-studio/src/app/api/scrape/route.ts:48](../../ebook-studio/src/app/api/scrape/route.ts) · [../../ghost-scraper/src/lib/safeFetch.ts:77](../../ghost-scraper/src/lib/safeFetch.ts) |

### F-004 · P1 · 네이버 검색/트렌드 캐시 회원 간 공유

| 구분 | 내용 |
|---|---|
| 대상/수준 | threads-affiliate-poster / 코드·운영 정책 확인 |
| 관찰 | 캐시 키에 user_id 없음, admin 클라이언트 조회/upsert. 운영 두 캐시 테이블 owner 컬럼 없음·authenticated SELECT true. 트렌드 호출 키는 이미 본인 키로 수정돼 있으므로 운영자 키 폴백으로 잘못 분류하지 않음. |
| 영향·한계 | 본인 계정·키로 만든 조사 결과가 다른 회원에게 재사용되는 최상위 원칙 위반. TTL 재사용 제한은30일 물리 삭제 증거가 아님. |
| 개선 | 회원 소유자/키 네임스페이스·RLS·원래 생성일 cutoff·정리 작업을 설계. 무소유 기존 자료 임의 귀속 금지. |
| 검증 완료 기준 | 같은 검색을 A/B가 실행해도 서로 결과/시각을 보지 않음. 재저장으로 보관기간 연장 불가. |
| 승인·현재 상태 | DB 변경/기존 자료 처리 승인 필요 / 제안서 기록만, 미수정 |
| 근거 | [../../threads-affiliate-poster/src/lib/naver/searchCache.ts:8](../../threads-affiliate-poster/src/lib/naver/searchCache.ts) · [../../threads-affiliate-poster/src/lib/naver/trendCache.ts:13](../../threads-affiliate-poster/src/lib/naver/trendCache.ts) · [../../threads-affiliate-poster/src/lib/actions/trend.ts:30](../../threads-affiliate-poster/src/lib/actions/trend.ts) · [db-metadata.json](db-metadata.json) |

### F-005 · P1 · 쇼츠 프로젝트 직접 조회의 30일 경계 누락

| 구분 | 내용 |
|---|---|
| 대상/수준 | shorts-viral-studio / 코드·운영 정책 확인 |
| 관찰 | listProjectsAction에서만 삭제. getProjectAction/update는 생성일 조건 없음. 운영 RLS는 owner 조건만. 비접속 만료 정리 보장 없음. |
| 영향·한계 | 오래된 ID 직접 조회/수정 및 장기 미접속 자료 잔존 가능. 전체 pg_cron2개만으로 Vercel 외부 정리 부재를 단정하지 않음. |
| 개선 | 직접/목록/수정 모두 cutoff·RLS, 비접속 정리, 삭제오류 처리. 저장 프롬프트가 회원 설정인지 생성물인지 별도 분류. |
| 검증 완료 기준 | 고정시계로29일23:59/30일 경계·직접ID·수정·조회실패 검증, 실제 정리 등록/성공 증거. |
| 승인·현재 상태 | RLS/자동정리 DB 변경 승인 필요 / 제안서 기록만, 미수정 |
| 근거 | [../../shorts-viral-studio/src/lib/actions/projects.ts:57](../../shorts-viral-studio/src/lib/actions/projects.ts) · [../../shorts-viral-studio/src/lib/actions/projects.ts:82](../../shorts-viral-studio/src/lib/actions/projects.ts) · [../../shorts-viral-studio/supabase/migrations/0001_svs_projects.sql:26](../../shorts-viral-studio/supabase/migrations/0001_svs_projects.sql) |

### F-006 · P1 · 포토 리메이크 로컬 보관함에 날짜 만료 없음

| 구분 | 내용 |
|---|---|
| 대상/수준 | photo-remake-studio / 코드 확인 |
| 관찰 | IndexedDB는 회원 UUID별로 잘 분리됨. 다만 listSaved는 날짜 필터 없이 반환, saveLocal은 개수20개만 제한. |
| 영향·한계 | 1개만 저장해도 오래된 생성물이 계속 보관될 수 있음. 회원별 분리는 완료된 장점. |
| 개선 | 원래 createdAt 기반30일 조회차단·진입/저장 시 기회정리, 브라우저 미실행 중 물리 삭제 한계를 명시. 엄격한 서버 삭제가 필요하면 서버 저장 별도 설계. |
| 검증 완료 기준 | 가짜 IndexedDB/고정시계로 경계·다른 회원·개수 제한·날짜 갱신 금지 확인. |
| 승인·현재 상태 | 기존 로컬 자료 자동 삭제 범위 승인 확인 / 제안서 기록만, 미수정 |
| 근거 | [../../photo-remake-studio/src/lib/remake/history.ts:8](../../photo-remake-studio/src/lib/remake/history.ts) · [../../photo-remake-studio/src/lib/remake/history.ts:12](../../photo-remake-studio/src/lib/remake/history.ts) |

### F-007 · P1 · CRM 웹훅 재전송이 접수/유료 발송을 중복 실행

| 구분 | 내용 |
|---|---|
| 대상/수준 | crm-google-form / 코드·인덱스 메타데이터 확인 |
| 관찰 | responseId를 저장만 하고 중복 검증/선점 없이 insert 뒤 dispatch. 조회한 운영 인덱스에 응답ID unique 없음. |
| 영향·한계 | Apps Script 재전송/중복 트리거가 문자·알림톡 중복 비용으로 이어질 수 있음. 실제 발송은 시험하지 않음. |
| 개선 | source+responseId unique, idempotency 저장/선점 후 처리, 응답ID 누락 처리 규칙, 채널별 발송 상태. |
| 검증 완료 기준 | 같은 응답10회/동시2회 fake sender로 실제 전송효과1회. 장애 후 재시도도 이미 보낸 채널 제외. |
| 승인·현재 상태 | 유니크 제약 DB 변경 사전 승인 필요 / 제안서 기록만, 미수정 |
| 근거 | [../../crm-google-form/app/api/webhooks/form-submit/[token]/route.ts:58](../../crm-google-form/app/api/webhooks/form-submit/[token]/route.ts) · [../../crm-google-form/supabase/migrations/0001_crm_google_form_tables.sql](../../crm-google-form/supabase/migrations/0001_crm_google_form_tables.sql) · [db-detail-evidence.json](db-detail-evidence.json) |

### F-008 · P1 · 예약 알림의 선점 전 발송·실패 재시도 누락

| 구분 | 내용 |
|---|---|
| 대상/수준 | booking-reminder / 코드 확인 |
| 관찰 | alreadySent에 status 구분 없음. 외부 발송 후 unique(rule_id,reservation_id) 로그 insert, insert 오류 미검사. 겹친 실행은 둘 다 발송 후 하나만 기록될 수 있고 failed도 다음번 제외. |
| 영향·한계 | 중복 요금/누락 알림·부분 성공 채널 재발송 위험. 실제 중복 발송 사고를 관찰한 것은 아님. |
| 개선 | DB 작업 선점/채널별 상태·제공사 idempotency 가능한 경우 사용, 실패만 제한 재시도, insert 오류 처리. |
| 검증 완료 기준 | 동시 워커2개·발송후응답유실·이메일성공/SMS실패 fixture. 동일 채널 중복0·실패만 재시도. |
| 승인·현재 상태 | 상태/선점 테이블 변경 시 사전 승인 필요 / 제안서 기록만, 미수정 |
| 근거 | [../../booking-reminder/lib/booking/reminderDispatch.ts:68](../../booking-reminder/lib/booking/reminderDispatch.ts) · [../../booking-reminder/lib/booking/reminderDispatch.ts:158](../../booking-reminder/lib/booking/reminderDispatch.ts) |

### F-009 · P1 · 예약 메시지의 시간대가 서버 기본값 의존

| 구분 | 내용 |
|---|---|
| 대상/수준 | booking-reminder / 코드 확인·순수 계산 재현 |
| 관찰 | fillTemplate의 toLocaleString(ko-KR)에 timeZone 없음. UTC 서버면 한국09시 예약을00시로 표시. |
| 영향·한계 | 고객에게 잘못된 예약 시각을 안내할 수 있음. 운영 발송 메시지는 읽지 않음. |
| 개선 | Asia/Seoul 명시·저장 UTC/표시 KST·날짜 경계 단위 검사. |
| 검증 완료 기준 | 2026-10-19T00:00Z가 한국09:00로 표시; UTC/KST 두 프로세스에서 동일 결과. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../booking-reminder/lib/booking/reminderDispatch.ts:31](../../booking-reminder/lib/booking/reminderDispatch.ts) |

### F-010 · P1 · 예약 Cron의 현재 회원 자격 재확인 누락

| 구분 | 내용 |
|---|---|
| 대상/수준 | booking-reminder / 코드 확인 |
| 관찰 | 실행 규칙은 활성 여부+핸드폰 유무만 검사. 정지·현재 구독/등급/사용기간 재판정 없이 회원 키로 발송 가능. |
| 영향·한계 | 수동 화면에서 차단된 회원의 예전 예약 작업이 계속 실행될 가능성. |
| 개선 | Cron에서도 공용 자격 판정. 관리자/FREE 예외 순서 유지. 정지·만료면 발송 보류하고 사유 기록. |
| 검증 완료 기준 | 정상/만료/정지/관리자/무료 가입 회원 fixture, 금지 케이스 발송함수0회. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../booking-reminder/app/api/cron/reminder/route.ts:56](../../booking-reminder/app/api/cron/reminder/route.ts) |

### F-011 · P1 · Cron 인증 비밀 누락 시 fail-closed 아님

| 구분 | 내용 |
|---|---|
| 대상/수준 | booking-reminder,stepmail,crm-google-form / 조건부 코드 결함 |
| 관찰 | 일부 isAuthorized는 헤더와 Bearer ${process.env.CRON_SECRET}를 바로 비교. 비밀이 없으면 문자열 Bearer undefined가 비교 대상. 현재 운영 변수 설정 여부·값은 조회하지 않음. |
| 영향·한계 | 환경변수 누락 배포에서 인증이 예측 가능한 문자열이 됨. |
| 개선 | 비밀 문자열 존재/공백 검증 실패 시 서버설정오류로 종료, 헤더 비교 이전 차단. |
| 검증 완료 기준 | CRON_SECRET 미설정/공백·틀린 값은 항상거부. 실제 운영 Cron 호출/발송 없이 함수 수준 검사. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../booking-reminder/app/api/cron/reminder/route.ts:32](../../booking-reminder/app/api/cron/reminder/route.ts) · [../../stepmail/app/api/cron/dispatch/route.ts:23](../../stepmail/app/api/cron/dispatch/route.ts) · [../../crm-google-form/app/api/cron/followup/route.ts:26](../../crm-google-form/app/api/cron/followup/route.ts) |

### F-012 · P1 · 웹툰 생성 실패/키 미등록 뒤 다른 외부 엔진 자동 호출

| 구분 | 내용 |
|---|---|
| 대상/수준 | ai-webtoon-studio / 코드 확인 |
| 관찰 | 이미 실패 원인 안내는 추가됨. 그러나 키가 없거나 Gemini 실패 뒤 Pollinations/Flux URL을 만들고 prompt를 보내는 경로는 남음. |
| 영향·한계 | 본인 키 미등록 시 중단 원칙과 충돌·선택하지 않은 제공사로 프롬프트 전송·품질/개인정보 처리 경계 변경. |
| 개선 | 키 없음/인증/결제/안전차단은 중단. 무료 대체도 별도 엔진의 명시 선택·개인 계정 조건·전송 안내를 먼저 정의. |
| 검증 완료 기준 | 키누락/401/429/안전차단/timeout 각 경우 외부 대체 호출0회, 사용자 선택 없이는 엔진 변경 안 함. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ai-webtoon-studio/src/lib/imageGen.ts:90](../../ai-webtoon-studio/src/lib/imageGen.ts) |

### F-013 · P1 · 오디오 분석 API가 로그인만 확인

| 구분 | 내용 |
|---|---|
| 대상/수준 | ai-audio-analyzer / 코드 확인 |
| 관찰 | getCurrentUser는 auth.getUser만 실행. analyze/user-key에 프로그램 자격 판정 호출 없음. |
| 영향·한계 | 정지/사용기간 만료 회원이 직접 API로 작업 가능한 구조. 본인 키 조회는 이미 적용돼 운영자 키 문제와 다름. |
| 개선 | 공통 checkProgramAccessApi를 분석·키쓰기 진입에 사용하고 JSON401/403 통일. |
| 검증 완료 기준 | 미로그인/정지/만료/정상 회원 fake provider로 자격 매트릭스 검증. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ai-audio-analyzer/src/lib/auth.ts:3](../../ai-audio-analyzer/src/lib/auth.ts) · [../../ai-audio-analyzer/src/app/api/analyze/route.ts:9](../../ai-audio-analyzer/src/app/api/analyze/route.ts) |

### F-014 · P1 · 오디오 업로드의 서버 파일 상한/종류 검증 부족

| 구분 | 내용 |
|---|---|
| 대상/수준 | ai-audio-analyzer / 코드 확인 |
| 관찰 | File 존재만 검사 뒤 전체 arrayBuffer·Buffer·base64를 메모리에 복사. mode/context 길이/파일 size/type allowlist 검사 없음. |
| 영향·한계 | 대용량 입력의 메모리/요청 한도 실패·AI 비용 예측 어려움. 프론트 제한만으로 API 보호 불가. |
| 개선 | 서버 크기/MIME/모드/문자수 제한, 업로드/모델 한도에 맞는 분할, 시간 제한·오류 안내. |
| 검증 완료 기준 | 상한 전후/잘못된 MIME/가짜 확장/빈 파일/예상모드, provider 호출 전 차단. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ai-audio-analyzer/src/app/api/analyze/route.ts:28](../../ai-audio-analyzer/src/app/api/analyze/route.ts) · [../../ai-audio-analyzer/src/app/api/analyze/route.ts:41](../../ai-audio-analyzer/src/app/api/analyze/route.ts) |

### F-015 · P2 · 공용 모듈 시간 검사 마지막 성공 문구가 수동확인을 숨김

| 구분 | 내용 |
|---|---|
| 대상/수준 | AIMaster / 검사 실행 확인 |
| 관찰 | check-shared-modules 실행은 사본 전부 일치. 이미지49곳 중6곳은 timeout/retries 계산 불가 CHECK인데 마지막은 모두300초 안이라고 출력. |
| 영향·한계 | 자동 분석을 실행 검증으로 오독해 CI/인수인계가 과신될 수 있음. 실제6곳 시간초과를 의미하지 않음. |
| 개선 | verified/manual/failed 개수와 종료 정책 분리·동적 식 메타데이터 등록. |
| 검증 완료 기준 | 49=검증43+수동6을 명시·manual6 확인 전 전체 완료 표현 금지. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../scripts/check-shared-modules.mjs](../../scripts/check-shared-modules.mjs) · [shared-module-check.txt](shared-module-check.txt) |

### F-016 · P1 · 경쟁사 회원격리 v1.08 후보와 운영 v1.07 간 승인 대기

| 구분 | 내용 |
|---|---|
| 대상/수준 | competitor-analysis / DB·코드·기존 인수인계 대조 |
| 관찰 | DB는v1.07, 소스APPv1.08. 회원격리/30일 수정안의 운영 승인이 대기 중이며 기존 회사정보 테이블은 owner 컬럼 없음. 버전만 올리면 해결되지 않음. |
| 영향·한계 | 사용자는 새 격리 정책이 이미 적용됐다고 오해할 수 있음. 준비된 후보를 중복 개발할 위험. |
| 개선 | 기존 MEMBER_RETENTION_HANDOFF를 검토해 승인 범위 확정→마이그레이션/실제 자격 테스트→배포/DB 동기화. |
| 검증 완료 기준 | 정책/행소유/30일/정리 검증과 실제 배포 SHA·DB version 일치. |
| 승인·현재 상태 | 운영 DB/기존 데이터 처리 승인 대기; 자동 실행 금지 / 제안서 기록만, 미수정 |
| 근거 | [../../competitor-analysis/docs/MEMBER_RETENTION_HANDOFF_20261016.md](../../competitor-analysis/docs/MEMBER_RETENTION_HANDOFF_20261016.md) · [../../competitor-analysis/lib/version.ts](../../competitor-analysis/lib/version.ts) · [catalog-db.json](catalog-db.json) |

### F-017 · P2 · 웹 크롤러 DB/코드 버전 차이

| 구분 | 내용 |
|---|---|
| 대상/수준 | web-crawler-saas / 메타데이터 대조 |
| 관찰 | DBv1.07, 고정 소스APPv1.08. package는0.1.0. 미배포/표시누락/분기차이 중 원인을 배포기록으로 확인해야 함. |
| 영향·한계 | 어느 기능이 운영 중인지 판단하기 어려움. 버전 불일치 자체로 기능 고장을 단정하지 않음. |
| 개선 | Vercel source SHA/노출 버전/기존 handoff 확인 후 실제 운영 코드와 동기화. |
| 검증 완료 기준 | 운영 SHA·APP·programs.version 매트릭스, 실제 회원 화면 확인. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../web-crawler/webapp/src/lib/version.ts](../../web-crawler/webapp/src/lib/version.ts) · [catalog-db.json](catalog-db.json) |

### F-018 · P2 · 개선 원장의 과거 미완료와 현재 완료 상태 혼재

| 구분 | 내용 |
|---|---|
| 대상/수준 | AIMaster / 문서·최신 코드 대조 |
| 관찰 | 부동산 GET 자동 분석 제거(v1.13), eBook/웹툰 실패 안내, SNS5분 예약, YVS보관 제한안 등이 기존 원장의 미해결 문장과 병존. 역량지도는82개·구버전 값. |
| 영향·한계 | 다른 CLI 중복개발·사용자 혼선·이미 해결한 문제의 재등장. |
| 개선 | 안정 ID별 최신상태·검증SHA/일자·원장폐기 아닌 superseded 연결·카탈로그 자동 대조. |
| 검증 완료 기준 | 대표 해결항목이 신규 미해결 목록에 다시 들어가지 않는 문서 일관성 검사. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../docs/PROGRAM_CAPABILITY_MAP.md](../../docs/PROGRAM_CAPABILITY_MAP.md) · [../../real_estate_sales/src/app/(dashboard)/listings/[id]/page.tsx:26](../../real_estate_sales/src/app/(dashboard)/listings/[id]/page.tsx) · [../../youtube-viral-studio/docs/IMPROVEMENT_BACKLOG.md](../../youtube-viral-studio/docs/IMPROVEMENT_BACKLOG.md) |

### F-019 · P2 · 오디오 분석 lint 명령이 실제 검사 대신 실패

| 구분 | 내용 |
|---|---|
| 대상/수준 | ai-audio-analyzer / 실행 재현 |
| 관찰 | package lint=next lint, 설치된 Next16 CLI에는 lint 명령 없음. npm run lint 실행은 프로젝트의 lint 디렉터리가 없다는 오류/종료1. |
| 영향·한계 | 검사가 있다고 생각해도 정적 품질 검사가 실제 실행되지 않음. 다른 next lint 프로그램은 Next버전별로 추가 확인 필요. |
| 개선 | 해당 버전의 ESLint 설정/명령을 갖추고 다른 프로그램은 무조건 일괄 변경하지 않음. |
| 검증 완료 기준 | lint 실제 파일 검사 완료/의도한 오류 fixture 감지·원래 타입/빌드 회귀. |
| 승인·현재 상태 | 통상 코드 수정; 이번에는 미구현 / 제안서 기록만, 미수정 |
| 근거 | [../../ai-audio-analyzer/package.json](../../ai-audio-analyzer/package.json) · [tooling-evidence.json](tooling-evidence.json) |

## 장점을 모은 병합 프로그램 후보 — 12개

기존 상품은 유지합니다. 공용 엔진은 기준에서 검증한 사본을 새 독립 폴더에 가져오고, 기존 프로그램 API를 서로 호출하는 의존 구조를 만들지 않습니다. 병합은 장점만 공짜로 얻는 작업이 아니므로 추가 복잡도·비용·권한·회귀 범위를 함께 평가합니다. M/L/XL은 상대적 규모이며 일정/금액 견적이 아닙니다.

| ID·추천 단계 | 병합안 | 활용 프로그램 | 가져올 장점 | 줄일 단점 | 첫 MVP | 선행조건·비용/위험 | 규모·통과 기준 |
|---|---|---|---|---|---|---|---|
| M-01 2차 | 콘텐츠 리서치·SEO 기획실 | blog-keyword, longtail-keyword-expander, competitor-analysis, naver-blog-seo-studio | 키워드 탐색·키워드별 독립 결과·경쟁 근거·SEO 페르소나 | 중복 검색/지표 혼동/복사 반복 | 수동 입력/가져오기한 키워드 묶음으로 비교·브리프 출력만 | 회원격리 F-004/F-016 해결 선행·추가 수집을 자동 실행하지 않음 | L / 검색 중복률·브리프 작성시간을 본인 작업의 전후 기준으로 비교 |
| M-02 2차 | 유튜브 성장·제작 기획실 | youtube-viral-studio, youtube-channel-consultant, shorts-viral-studio, seo-thumbnail-pro | 황금 채널 기준 엔진·후보보관·바이럴 분석·썸네일 전략 | 검색 중복·추정지표 오독·후보 전달 단절 | 회원이 고른 후보1개→채널 근거→대본 브리프→썸네일 문구; 검색은 별도 확인 | 할당량/저작물 권리·회원별 저장·지표 정의 | L / 참조ID 연결률100%·모의 동일 검색 중복0·유료 생성 단계별 확인 |
| M-03 3차 | 셀러 상품 출시 스튜디오 | trending-product-finder, shop-detail-page, detail-page-12p, auto-detail-page, video-to-gif, threads-affiliate-poster | 마진 계산·실제 사진 분석·구간별 재생성·HTML/이미지 내보내기·GIF용량제한 | 서로 다른 상품스펙·가짜 후기/인증·중복 이미지 생성 | 사실확정 상품명세→5개 핵심 섹션+GIF 미리보기; 게시 없음 | 확인 안 된 스펙은 미확인으로 고정·키/제휴계정 개별·추가 비용 | XL / 확정한 스펙 변경0·재생성은 선택구간만·동일 상품 명세 추적 |
| M-04 3차 | 고객 접수·예약 케어 | crm-google-form, booking-reminder, stepmail, instagram-dm-reply | 폼 실시간 접수·다채널 리마인드·차수 관리·사람 응대 | 이중발송·정지회원 작업·수신거부 분산 | 접수→예약 카드→보낼 메시지 검토 큐; 실제 발송은 후속 승인 | F-001/F-007~F-011 선행·연락처/동의·메시지별30일 분류 | XL / 동시/재전송 fixture 외부효과1회·취소/거부 발송0·채널별 부분 실패 복구 |
| M-05 2차 | 통합 댓글·문의 검토함 | threads-comment-reply, instagram-comment-reply, youtube-auto-reply, instagram-dm-reply | 사람 승인·원본 문맥·텔레그램 검토·플랫폼별 정책 | 검토 화면 왕복·상태명 차이·중복 승인 | 처음에는 데이터 패키지 가져오기 기반 읽기 전용 통합 큐·플랫폼별 분리 | 새 앱 자체에 각 플랫폼 본인 연동·기존 프로그램 API 직접 호출 금지·DM시간창 유지 | L / 승인 전 외부게시0·같은 댓글 두 번 승인해도1회·계정 혼합0 |
| M-06 3차 | 음악 채널 제작 스튜디오 | suno-music-studio, playlist-channel-studio, music-automation, ai-audio-analyzer, ai-mastering-studio, yt-playlist-studio, vinyl-lp-studio | 가사/스타일·트랙메타·음량 비교·시각화·챕터·LP연출 | 곡 순서/길이 불일치·무음 출력·반복 입력 | 본인 음원2곡+트랙 JSON→음량 점검→1개 시각화·챕터 출력 | 음악 서비스별 API/권리·WebCodecs지원·긴 처리; 서버 비싼 렌더 기본화 금지 | XL / 샘플 출력 오디오트랙 있음·시간 오차 허용치 정의·챕터 총길이 일치 |
| M-07 3차 | 캐릭터 스토리·무빙툰 스튜디오 | four-cut-comics, ai-webtoon-studio, ai-influencer-studio, cinematic-storyboard-studio, shorts-onestop-studio | 4컷 간단 기획·캐릭터 시트·콘티·직접 대사 레이어·영상 조합 | 얼굴/의상 불일치·말풍선 깨짐·다시 처음부터 생성 | 캐릭터1명·4컷·텍스트 별도 합성→가벼운 무빙툰 | F-012 선행·얼굴 점 비교는 동일인 인증이 아님·생성 컷수 비용 | XL / 대사 원문 보존100%·참조캐릭터/컷 연결·재생성 단위1컷 |
| M-08 2차 | 브랜드 비주얼 작업실 | style-dna-analyzer, banana-canvas, allinone-graphic, thumbnail-master, emotion-writer, image-convert-studio | 실측 팔레트·부분 편집·다양한 템플릿·직접 타이포·로컬 압축 | 소재마다 색/글꼴 흔들림·텍스트 오류·불필요 재생성 | 브랜드 설정→같은 배경으로1:1/4:5/16:9 레이아웃·텍스트 직접 합성 | 프로그램별 이미지 프롬프트 컨셉은 보존; 브랜드 설정은 본인 것만 | L / 텍스트 원문 일치·안전영역 잘림0·정해진 팔레트 허용오차 |
| M-09 2차 | 자료를 책·발표로 만드는 출판실 | website-scraper, markdown-studio, ai-writing-editor, document-translator, ebook-studio, ai-slide-builder | 안전한 수집·수정이력·리치 교정·용어집·전자책·PPTX | 복사마다 출처/숫자 손실·같은 자료 반복 요약 | 회원 직접 올린 문서1개→출처 번호 유지→전자책 목차+발표 개요 | F-002/F-003 선행·저작권/민감정보·추가 번역비용·생성물 재가져오기 보관기간 연장 금지 | L / 숫자/URL 대조·문단 출처ID 보존·없는 근거는 미확인 표시 |
| M-10 2차 | 아이디어에서 화면 명세까지 | ai-prompt-studio, prompt-template-studio, landing-architect, ui-canvas, ai-web-ui, ai-slide-builder | 요구 정제·변수 템플릿·랜딩 기획·캔버스·컴포넌트·발표 | 멋진 시제품과 구현 명세의 간격·의존성 누락 | 1페이지 요구→와이어프레임 JSON+컴포넌트 명세+검수 체크 | 실행 코드는 별도 검토·iframe격리·사용성 품질은 실제 검수 | L / 필수 요구→화면→테스트 추적률100%·모의 버튼은 명시 |
| M-11 2차 | 사진 품질·규격 제작실 | portrait-photo, photo-remake-studio, fashion-style, image-convert-studio | 로컬 얼굴품질·복원·업스케일·규격/투명도 검증 | 쓸 수 없는 원본으로 유료 재생성·규격 실패 | 원본 점검→비파괴 보정 선택→3가지 프로필 규격 출력 | F-006 선행·얼굴 측정은 추정·신분증 사진 인정 여부 보장 금지 | M / 로컬 점검은 네트워크0·목표 픽셀/파일크기 일치·수동보정 가능 |
| M-12 2차 | 데이터 수집·정제 작업대 | website-scraper, web-crawler-saas, file-merge, document-translator | 안전 fetch·구조 추출·헤더 기반 병합·용어/숫자 대조 | 표 구조 깨짐·출처 누락·중복 데이터 | 회원 CSV2개+수집 fixture→열 매핑·품질표·출처열 보존 | 대량 외부 수집은 비용/사이트 조건·개인 데이터30일·스크레이핑 엔진 중복 제거 | M / 행 수/중복/출처 추적·한글 CSV·수식 주입 정책·서식 유지 한계 표시 |

## 연계 설계 원칙

1. **회원 본인만:** 공통 Supabase 한 개 안에서 user_id·RLS·개별 경로. 개인 키·외부 앱/계정은 수신 프로그램에서도 본인 것으로 확인합니다. 운영자 키/다른 회원 결과 폴백 없음.
2. **독립 배포:** 공통 엔진 기준→사본 검사→각 앱 독립 실행. 프로그램끼리 내부 API를 서로 호출해 한쪽 장애가 다른 쪽에 번지는 설계는 하지 않습니다.
3. **처음은 수동 전달:** 사용자가 JSON/ZIP을 명시적으로 내보내고 가져옵니다. schemaVersion/source/target/originalCreatedAt/expiresAt/checksum/rights 같은 명세를 두고, ownerHint는 인증으로 신뢰하지 않습니다. 키·토큰은 전달하지 않습니다. DB 기반 전달은 별도 승인 설계입니다.
4. **30일의 시작을 유지:** 이미 만든 결과를 다른 프로그램으로 복사/가져와 기간을 새로 시작하지 않습니다. 설정/개인 프롬프트/원본 파일/새 생성물의 분류를 먼저 확정합니다. 새로 생성된 파생물도 원자료 만료 이후 원자료를 재사용하지 않도록 계보/삭제 범위를 설계합니다.
5. **사람 확인:** 자료 이동만으로 AI 생성·게시·문자 발송을 시작하지 않습니다. 실제 외부 효과는 대상·비용·권리·수신 동의를 검토한 후 해당 회원의 명시적 실행으로 진행합니다.
6. **컨셉 보존:** 이미지 공용화는 모델·호출·대기·결과 수신까지. 프로그램별 이미지 프롬프트 내용/스타일은 유지합니다. 기존 UI/상품 메뉴/권한 제거는 별도 결정입니다.
7. **관리 가능한 범위:** 서버/앱 저장소의 조회차단·자동정리와 사용자가 다운로드한 개인 파일을 구분합니다. 브라우저를 켜지 않는 동안 IndexedDB 물리 삭제나 내려받은 파일 원격 삭제를 보장하지 않습니다.

## 창의적 확장 아이디어 — 18개

| ID | 아이디어 | 적용 분야 | 사용자 가치·동작 | 설계 경계 | 검수 기준 |
|---|---|---|---|---|---|
| I-01 | 실행 전 비용·할당량 영수증 | 공통 | 실행할 단계·본인 키/계정·이미지 수·예상 최악 시간·추정 비용 범위를 먼저 보여 주고 동의한 단계만 실행 | 금액은 제공사 가격표/사용량에 따라 갱신하며 확정 청구액처럼 표시하지 않음 | 중복 실행0·동의 없는 추가 단계0 |
| I-02 | 근거가 연결된 콘텐츠 패키지 | 리서치/글/슬라이드 | 문장·숫자·이미지별 source_id/수집시각/원문위치를 유지해 사실 확인을 쉽게 | 출처 문서는 데이터일 뿐 도구 지시로 실행하지 않음 | 출처 없는 주장은 미확인 표기 |
| I-03 | 실패한 단계부터 다시 시작 | 이미지/영상/발행 | 작업 DAG와 단계별 상태·입력 해시로 성공 결과를 보존하고 실패 단계만 재실행 | 회원간 결과 재사용 금지·생성일30일 연장 금지 | 합성 장애 시 이미 성공한 유료 단계 호출0 |
| I-04 | 브랜드 설정과 프롬프트 컨셉 분리 | 이미지/SNS/상세 | 색·폰트·로고 안전영역은 개인 설정, 생성 프롬프트 스타일은 프로그램 고유로 유지 | 자동 공용화/다른 회원 브랜드 재사용 없음 | 여러 규격에서 브랜드·텍스트 일치 |
| I-05 | 게시·발송 없는 자동화 리허설 | CRM/SNS/블로그 | 일정/수신자/권한/본문을 fake provider로 실행해 누가 언제 무엇을 받는지 표로 확인 | 실제 최종게시/발송 버튼과 명확히 구분 | 드라이런 외부효과0 |
| I-06 | 내 자료 전달 봉투 | 프로그램 연계 | 사용자가 JSON/ZIP 패키지를 내려받아 다른 프로그램에 명시적으로 가져오기: schemaVersion·source/target·ownerHint·createdAt·expiresAt·해시·권리정보 | ownerHint는 인증 토큰이 아님. 수신 앱 세션/자격을 다시 확인, 원생성시각 보존, 실제 API키/토큰 포함 금지 | 30일 만료 원본을 가져와도 재생성일로 세탁되지 않음 |
| I-07 | 만료 예정 보관함·내보내기 안내 | 모든 저장형 | 건별 남은 보관기간·7일/1일 전 안내·명시적 다운로드. 회원 설정/키는 삭제 제외 | 다운로드한 개인 파일을 서버가 원격 삭제할 수 있다고 약속하지 않음 | 조회 경계30일·자동 정리 실패 알림 |
| I-08 | 실측·AI추정·사용자입력 배지 | SEO/소싱/유튜브/부동산 | 지표마다 계산식·출처·기준일·누락값을 펼쳐 보이고 추정치를 수익/노출 보장으로 사용하지 않음 | 보기 좋은 점수를 근거 없이 채우지 않음 | 누락값은미확인·추정은추정 표시 |
| I-09 | 여러 포맷을 한 번에 만드는 콘텐츠 팩 | 블로그/카드/쇼츠/메일 | 확정한 사실 원본1개에서 플랫폼별 길이/규격만 변환, 각 결과를 사람이 검토 | 동일 문구 무차별 자동 발행 없음·채널별 권한/키 분리 | 사실 변경0·형식별 상한 검수 |
| I-10 | 생성 전 로컬 품질 검사 | 사진/영상/음원 | 얼굴/해상도/투명도/클리핑/음원 길이/텍스트 잘림을 가능한 범위에서 브라우저 처리 | 얼굴 점으로 동일인 확정·의료/신분증 적합성 보장 금지 | 로컬 사전검사 외부호출0 |
| I-11 | 내 작업 기준 프롬프트 실험실 | 프롬프트/문체/생성 | 본인 기준 예시와 기대 결과를 저장하고 모델/버전별 출력 차이를 표로 비교 | 정답 점수도 평가 기준과 한계를 표시·대량 유료실험 승인 필요 | 고정 fixture와 실제 품질 검수를 분리 |
| I-12 | 계정 연결 건강 점검 | 예약/게시/CRM | 토큰 만료·권한·등록 도메인·필수 키 존재만 검사, 실제 게시·요금 호출 없이 사전진단 | 키 원문·다른 회원 계정 열람 금지 | 만료/잘못된권한을 실행 전에 구분 |
| I-13 | 클릭을 줄이는 개인 작업 경로 추천 | 카탈로그 | 목표/보유자료/연결한 본인 키를 선택하면 쓸 수 있는 프로그램 순서와 빠진 준비물을 안내 | 추천만으로 다른 프로그램 실행·자료 전송·새권한 부여하지 않음 | 제안 경로별 필요한 준비물/비용 단계 명확 |
| I-14 | 품질을 수치로 비교하는 A/B 작업실 | 썸네일/오디오/상세 | 같은 배경·음량·상품사실을 고정하고 문구/배치/처리 하나만 바꿔 비교 | 실제 CTR/매출 상승 효과는 별도 실험 전 주장하지 않음 | 통제 변수 보존·변경 항목 표시 |
| I-15 | CLI 협업 품질 현황판 | 개발/운영 | 프로그램별 sourceSHA·운영SHA·DB버전·테스트일·수동확인·미배포·미완료 항목을 분리 | 디자인완료/HTTP200을 기능완료로 환산하지 않음 | 버전차이·승인대기·검사미실행을 숨기지 않음 |
| I-16 | 만료·수신거부·사람 인계가 있는 고객 여정 | CRM/DM/예약 | 접수→예약→방문후안내 단계별로 현재 동의·기간·담당자·전송 가능한 채널을 표시 | 마케팅 동의를 예약 필수 알림과 자동 동일시하지 않음 | 거부/정지/취소 고객 전송0 |
| I-17 | 기능은 병합하고 화면은 역할별로 | 병합 프로그램 | 같은 엔진을 새 독립 앱의 단계형 화면에 구성하되 초보/전문 모드로 복잡도 제한 | 기존 상품 메뉴/권한/주소 폐지는 별도 주인님 결정 | MVP는 핵심2~3기능·기존 상품 회귀0 |
| I-18 | 배포 전 비용 없는 회귀 꾸러미 | 개발/운영 | 로그인/권한/만료/빈상태/부분실패/모바일을 공통 fake provider fixture로 검사 | 33개 tests폴더 미발견은 테스트 부재 확정이 아님. 실제 스크립트/CI 재조사 | 실제외부호출0·커버한경계/미검수항목 명시 |

## CLI 협업 실행 제안

아래는 역할 제안이며 현재 다른 CLI에 작업을 보내거나 담당을 확정하지 않았습니다. Codex는 기획·시스템 설계·오류 재현·디버깅·검수, Claude Code는 복잡한 구현·기능·리팩터링, Antigravity는 최신 지침의 UI/UX·매뉴얼 시각화·개선 기록을 중심으로 합니다. 실제 세부 담당은 주인님 배정/작업표로 조율합니다. 같은 프로그램 동시 작업 금지, 루트 공통 문서는 본인 항목만 추가합니다.

| 작업ID | 우선 | 작업 | 이슈/후보 | 선행 | 권장 역할 | 승인 조건 | 완료 기준 |
|---|---|---|---|---|---|---|---|
| W-01 | P0 | 공통 DB 접근 정책 긴급 정비 | F-001 | 없음 | Codex: 영향/시험설계 → Claude Code: 승인된 SQL → Codex: 역할별 검수 | DB 권한/정책 변경 승인 | PUBLIC 전체허용 제거·역할별 allow/deny·롤백/운영 증거 |
| W-02 | P0 | eBook API 자격·안전 수집 정비 | F-002/F-003 | W-01 영향 검토; 코드 수정은 독립 가능 | Codex: 재현/기준 선정 → Claude Code: 게이트·safeFetch → Codex: 무해한 회귀 | 코드 작업 지시; DB변경 없음 | 401/403·DNS/redirect/큰본문 차단·정상 공개 URL fixture |
| W-03 | P1 | 회원 자료 격리·30일 적용 지도 | F-004/F-005/F-006/F-016 | W-01 | Codex: 데이터 분류/기존 승인 검토 → Claude Code: 승인된 스키마/정리 → Codex: 경계 검수 | 테이블/정책/기존자료 처리 승인 | 본인/타회원·직접ID·만료·비접속 정리·실행 증거 |
| W-04 | P1 | 발송 중복·누락 방지 | F-007/F-008 | W-01 | Claude Code: 선점/상태기계 → Codex: 동시성/실패 시험 | DB 제약/상태 변경 승인; 실제 발송 별도 확인 | 동시 재전송 외부효과1회·부분성공 재발송0 |
| W-05 | P1 | 예약 자격·시각·Cron 안전 기본값 | F-009/F-010/F-011 | W-04와 같은 폴더 순차 | Codex: 공통판정/시간·인증 회귀 → Claude Code: 필요한 복잡한 연결 | 일반 코드 작업 지시 | 만료/정지/비밀누락 발송0·UTC/KST 같은 표시 |
| W-06 | P1 | 오디오 API 접근/파일 보호 | F-013/F-014 | 독립; 폴더 작업표 확인 | Codex: 경계 재현/설계 → Claude Code: 파일 흐름 보완 → Codex 검수 | 유료 실제 분석 없이 fixture 우선 | 자격/파일 상한 전후·provider 전 차단 |
| W-07 | P1 | 웹툰 엔진 대체 경로 정비 | F-012 | 독립; 폴더 작업표 확인 | Codex: 최상위 원칙 대조 → Claude Code: 명시적 엔진 선택 → Codex 검수 | 사용 엔진/무료 대체의 회원 연동 정책 확인 | 키 없음/오류 시 자동 다른 외부엔진 호출0 |
| W-08 | P2 | 상태·버전·자동검사 정직한 현황 | F-015/F-017/F-018 | W-01~07과 병행 가능한 문서/도구 범위 | Codex: 목록/메타 검수 → UI 작업은 주인님이 CLI 배정 | 중복 배포 금지·기존 승인대기 상태 보존 | DB/코드/운영SHA·manual/미실행을 각각 표기 |
| W-09 | P2 | 개인 자료 전달 형식 시범 | I-06 | W-03 | Codex: schema/권한·보관 설계 → Claude Code: 양쪽 importer/exporter → Codex 회귀 | 새 DB/권한은 승인 필요; 파일 수동전달 MVP 권장 | 키 없음·원생성일 보존·만료 원본 재사용0 |
| W-10 | P2 | 저위험 병합 MVP 선택 | M-08/M-10/M-11/M-12 중1 | W-09; 관련 F 이슈 해결 | Codex: 요구·성공기준 → Claude Code: 엔진/기능 → UI는 주인님이 배정 → Codex 검수 | 새 프로그램 개발/등록·필요 DB 사전 승인 | 선택한 핵심2~3기능만·기존 상품 유지·회귀0 |
| W-11 | P2 | 성장/출판/검토함 MVP | M-01/M-02/M-05/M-09 중1 | W-02/W-03/W-09 | 같은 역할 분담·프로그램마다 단일 담당 락 | 주인님 목표/우선 프로그램 선택 | 출처/권한/비용/휴대폰·내보내기 흐름 통과 |
| W-12 | P3 | 복합 제작/발송 병합 | M-03/M-04/M-06/M-07 중1 | 관련 P0/P1 해소·선행MVP 결과 | 복잡한 기능 Claude Code·Codex 설계/검수·UI는 주인님 배정 | 구현/비용·게시·자료 정책 별도 확정 | 외부효과 승인·실패복구·대량 작업 제한·운영증거 |

## 다음 CLI가 착수할 때

- 최신 AGENTS/CLAUDE/GEMINI·TOP_RULE_PERSONAL_ACCOUNT_API·SHARED_FEATURE_MAP·프로그램 AGENTS/README·ACTIVE_WORK를 읽습니다. 작업 중이면 해당 폴더를 건드리지 않습니다.
- 같은 F-ID/W-ID에 실제 코드/운영 증거와 차이를 추가하고, 원문을 지우지 않습니다. 이미 해결됐다면 재현/완료 SHA로 '해소됨'을 기록합니다.
- 다른 CLI 결과와 차이가 나면 목적·최신 지시·검증 근거로 비교합니다. 기존 작업 대체/판단 어려움은 원본을 보존하고 주인님께 확인합니다.
- DB/환경변수/키·기존 자료 삭제·유료 대량 호출은 사전 승인. 제안서 기록은 구현 승인으로 해석하지 않습니다. 일반 기능도 개발 플랜을 먼저 보여드립니다.
- 검수는 본인 일반 시험 회원, Codex/Antigravity는 실제 Edge. 무료/합성 응답 우선. 실제 호출·미실행·비용을 구분하고 완료/미완료·라이브 링크·커밋/푸시/배포를 남깁니다.
- 배포는 최신 비용 절감 지침에 따라 필요한 프로그램만 묶어 하루1회, 급한 보안/이중과금은 예외 근거를 기록합니다. 이번 문서만 변경했으므로 앱 배포/DB버전은 필요 없습니다.

## 이미 해결됐거나 이번에 결함으로 보지 않은 항목

| 항목 | 현재 판단 | 근거 |
|---|---|---|
| 부동산 상세 열람 자동 AI 비용 | v1.13에서 명시적 실행으로 바뀜. 과거 원장의 미해결 문구를 새 결함으로 재등록하지 않음 | real_estate_sales 상세 page.tsx:26 |
| YVS 전역 즐겨찾기·자동검색·85점 기본값 | v1.14~후속 개선 적용. 이번 미해결은 다른 프로그램의 유사 경로 | youtube-viral-studio 최신 AGENTS/Provider/보관DB |
| YVS 1000개 제한·개발 high5 | 도달 시 안내 A안/경고 수용 판단 기록 있음. 새 결함/무조건 대규모 페이지 구현으로 바꾸지 않음 | IMPROVEMENT_BACKLOG 최신 상태 |
| 이미지 실패 안내·12p 이미지60초 | eBook/웹툰은 실패 이유 전달이 추가됐고12p 이미지 route는300초. 웹툰 외부 대체 자체는 F-012로 분리 | ebook cover·webtoon imageGen·12p generate-image route |
| SNS 예약5분 | 현재 Threads/Instagram vercel.json이5분. 예전1일 예약 문제를 미해결로 중복 등록하지 않음 | 각 vercel.json |
| file-merge 브라우저 검사 실패 | 최근 인수인계에서 서버 시작 순서 문제로12/12 확인. 제품 결함 아님 | 2026-10-19 HANDOFF·커밋4e574906 |
| 사진 보관함 회원 격리 | photo-remake는 UUID별IndexedDB 적용. 소유자 혼합으로 단정하지 않고 날짜 만료만 F-006 | photo-remake history.ts |
| 네이버 운영자 키 | trend action은 본인 키 조회. 전역캐시 문제와 분리 | threads-affiliate-poster actions/trend.ts |

## 근거·자료·검수 한계

- [카탈로그 스냅샷](catalog-db.json), [정적 인벤토리](inventory.json), [DB 메타데이터](db-metadata.json), [DB 상세](db-detail-evidence.json), [HTTP 결과](http-evidence.json), [도구 재현](tooling-evidence.json), [공용 모듈 검사](shared-module-check.txt).
- [기존 역량지도](../PROGRAM_CAPABILITY_MAP.md), [공용 기능 지도](../SHARED_FEATURE_MAP.md), [공용 모듈](../SHARED_MODULES.md), [개선 기록 정책](../IMPROVEMENT_HANDOFF_POLICY.md), [DB 연동 정책](../DATABASE_CONNECTION_POLICY.md). 기존 역량지도 일부는2026-10-16의82개 기준이므로 기능 이해 보조로만 쓰고 현재 버전/활성/주소는 운영DB 스냅샷을 사용했습니다.
- Supabase의 RLS는 grant와 정책을 함께 평가하며 서비스 역할은 RLS를 우회합니다. 이번 DB 판단의 공식 기준: [RLS 문서](https://supabase.com/docs/guides/database/postgres/row-level-security). 정책 메타데이터로 확인한 허용 경로와 실제 데이터 피해는 구분했습니다.
- 자동정리는 실행 등록뿐 아니라 성공/실패 관측이 필요합니다. [Supabase Cron](https://supabase.com/docs/guides/cron). 조회된 pg_cron2개 외 Vercel Cron/외부 스케줄이 있을 수 있어 전체 정리 커버리지2개라고 단정하지 않았습니다.
- YouTube 할당량은 실제 회원 Cloud 프로젝트를 기준으로 표시합니다. [공식 할당량 문서](https://developers.google.com/youtube/data/determine_quota_cost). 창당 검색 호출/다른 API 단위를 구분하는 설계를 권하며 이번에 실제 YouTube를 호출하지 않았습니다.
- 모델/업로드/실행 시간은 제품 배포 설정과 제공사 한도를 함께 확인합니다. [Vercel Functions 한도](https://vercel.com/docs/functions/limitations), [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API). 이 제안서가 모든 모델/브라우저 지원을 실측 보증하지 않습니다.
- 신규 프로그램/병합안은 구현 전 개별 플랜·기존 상품 권한·비용·데이터 정책을 확정해야 합니다. 현재 서버/회원 기능·키·DB·게시를 바꾸지 않았습니다.

## 기능별 레퍼런스 모듈 지도

**주인님 확정 방향(2026-10-19): 당분간 기존 프로그램 기능 개선·버그 수정·안정화에 집중합니다. 그 과정에서 잘 만들어지고 검증된 기능을 레퍼런스 모듈로 정리하고, 신규 프로그램·기존 프로그램 리뉴얼 때 필요한 모듈을 하나씩 적용합니다. 전체 프로그램 일괄 전환·지금 당장 모든 후보 추출은 하지 않습니다.**

| ID | 기능 모듈 | 상태 | 기준 또는 비교할 코드 | 공통으로 묶을 범위 | 프로그램에 남길 부분 | 채택 전 검증 |
|---|---|---|---|---|---|---|
| R-01 | 유튜브 API 조회 | 기존 등록 | youtube-channel-consultant/src/lib/youtube/youtubeData.ts | API 호출·오류 분류·시간 제한·키 가리기·할당량 안내 | 회원 키·검색 조건·화면·조회 결과 보관 | 기존 기준 테스트와 소비 앱 계약 검사 |
| R-02 | 유튜브 황금채널 탐색 | 기존 등록 | youtube-channel-consultant/src/lib/youtube/goldenEngine.ts | 검색·채널 지표 계산·필터 엔진 | 사용자 목적·화면·회원별 저장 | 비공개 구독자·빈 결과·필터 경계·예산 |
| R-03 | 이미지 모델 설정 | 기존 등록 | ai-image-studio/lib/providers/nanoBananaModels.ts | 모델·지원 화질·설정 규격 | 프로그램별 모델 선택·콘셉트 | 기존 모델 규격 테스트·지원 중단 안내 |
| R-04 | 이미지 생성 호출 | 기존 등록 | ai-image-studio/lib/providers/geminiImage.ts | 키 전송·응답 추출·시간 제한·오류 구분 | 그림 프롬프트 내용·스타일·저장·화면 | 차단·빈 이미지·취소·시간 초과 이중 과금 방지 |
| R-05 | 쇼핑 검색·제휴 링크 | 후보·미추출 | threads-affiliate-poster/src/lib/coupang/client.ts; threads-affiliate-poster/src/lib/aliexpress/client.ts; trending-product-finder/lib/aliexpress/client.ts | 제공사별 검색·서명·페이지 조회·상품 응답 표준화 | 회원별 키·제휴 계정·상품 선정·수수료 정책 | 가짜 API 응답·통화·중복·페이지·개인 캐시. F-004 전역 캐시는 재사용 금지 |
| R-06 | 쇼츠 탐색·지표 분석 | 후보·미추출 | shorts-viral-studio/src/lib/youtube/metrics.ts; shorts-viral-studio/src/lib/youtube/api.ts; shots/src/lib/youtube/client.ts | 영상 지표 계산·정렬·검색 조건 변환 | 프로그램별 점수 목적·기준 설명·제작 화면 | 긴 영상 혼입·0/비공개 지표·계산 경계·쿼터 |
| R-07 | AI 글쓰기 호출 | 후보·미추출 | ai-auto-blog/utils/news/generator.ts; threads-affiliate-poster/src/lib/ai/generator.ts | 제공사 호출·구조화 결과·오류·취소·사용량 규격 | 블로그/SNS/대본의 내용·문체·구성·검수 기준 | 빈 출력·잘린 출력·스키마 불일치·시간 초과 중복 비용 |
| R-08 | 다중 콘텐츠 수집 | 후보·미추출 | ai-auto-blog/utils/ai/collector.ts; tistory-auto-blog/utils/ai/collector.ts; threads-content-ops/lib/collector.ts | 수집 방식 선택·제공사 어댑터·출처 병합·중복 제거 | 주제·회원별 키·출처 허용 범위·콘텐츠 선별 | 한 출처 실패·교차 출처 중복·잘못된 날짜·출처 없는 내용 |
| R-09 | 안전한 URL 수집 | 후보·미추출 | ghost-scraper/src/lib/safeFetch.ts | URL·DNS·redirect 검사·시간/본문 크기 제한 | 로그인·프로그램 권한·저장·본문 목적 | 가짜 DNS/redirect로 내부 주소 차단·큰 본문·취소. F-003 보완에 우선 참고 |
| R-10 | 수집 결과 표준화 | 신규 설계 후보 | ghost-scraper/src/lib/types.ts; ai-auto-blog/utils/news/collector.ts | SourceDocument 규격·출처·시간·해시·가공 이력 | 권한 확인·개인 저장·화면·신뢰도 판단 | 출처 누락·날짜 형식·중복·만료·악성 원문을 지시로 실행하지 않기 |
| R-11 | 글쓰기 공통 규칙 조립 | 후보·미추출 | ai-auto-blog/utils/yearPolicy.ts; ai-auto-blog/utils/news/promptRules.ts | 현재 연도·기준 시각·공통 규칙 주입 | 앱별 프롬프트 내용·말투·이미지 스타일 | 연도 변경·한국 시간 경계·과거 자료와 현재 사실 구분 |
| R-12 | 확장 작업 전달·실행 상태 | 후보·미추출 | tistory-auto-blog/utils/extensionTask.ts; tistory-auto-blog/extension/web-bridge.js; naver-blog-agent/extension/web-bridge.js | 요청 규격·작업 선점·실행 번호·임대·heartbeat·취소·결과 보고 | 플랫폼별 상태 저장·회원 자격·허용 origin | 다중 탭·중복 요청·끊김·오래된 보고·다른 회원/사이트 요청 거절 |
| R-13 | 네이버 편집기 입력 | 플랫폼 어댑터 후보 | naver-blog-agent/extension/writer.js; naver-blog-agent/extension/editor.js; blog-content-maker/extension/writer.js | 네이버 편집기에서 블록·이미지·본문 입력 | 네이버 DOM/선택자·편집기 버전·로그인 확인 | 복합 블록·이미지 순서·입력 중단·UI 변경 감지·회원 확인 경계 |
| R-14 | 티스토리 편집기 입력 | 플랫폼 어댑터 후보 | tistory-auto-blog/extension/tistory-engine.js; tistory-auto-blog/extension/tistory-adapter.js | 티스토리 입력·편집기 상태 확인·결과 보고 | 티스토리 DOM/선택자·편집기 모드·로그인 확인 | 기존 extension-* 테스트·입력 중단·중복 실행. 현행 최종 저장/발행 수동 유지 |
| R-15 | 본문·이미지 배치 변환 | 후보·미추출 | naver-blog-agent/extension/article-plan.js; tistory-auto-blog/utils/extensionContent.ts | 중립 문서 블록·이미지 참조·순서·안전한 HTML 변환 | 플랫폼별 서식 지원·글 구성 의도 | 원문 누락·이미지 순서·서식 손실·지원하지 않는 블록 명시 |
| R-16 | 회원 자격·본인 키 연결 | 검증 패턴 후보 | lib/access/checkProgramAccess.ts; docs/DATABASE_CONNECTION_POLICY.md | 인증/자격 오류 규격·키 연결 인터페이스·호환 정책 | 인증 실행·회원 식별·본인 키 조회·비밀 보관은 앱 경계 | 401/403·정지/만료·누락 키·운영자 키 폴백 금지 |
| R-17 | 개인 데이터·30일 보관 | 검증 패턴 후보 | youtube-viral-studio/supabase/migrations/20261017025253_yvs_member_favorites.sql | 원생성일·만료 규격·조회 cutoff·정리 결과 관측 | 프로그램별 데이터/파일/로컬 저장 방식·RLS·승인된 정리 작업 | 교차 회원 거절·직접 조회·미접속 정리·이전 시 만료 연장 금지 |
| R-18 | 예약·발송 실행 제어 | 수정·검증 뒤 후보 | booking-reminder/README.md; crm-google-form/README.md; stepmail/README.md | 작업 선점·멱등성·채널별 상태·재시도 정책 | 외부 채널·템플릿·회원 키·최종 전송 판단 | F-007~011 해결 후 경합·부분 실패·정지/만료·비밀 누락 검사. 현재 코드를 기준으로 승격하지 않기 |

세부 규격·수집 방식·확장 입력 경계·승격 조건은 [모듈 운영안](REFERENCE_MODULE_PROPOSAL.md)을 읽습니다.
