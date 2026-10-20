# BLOG·티스토리 제작/입력 근거

기준 커밋 `cde4c6fa`. 이번 분석은 실제 외부 입력·발행·유료 AI를 실행하지 않았습니다.

| 대상 | 근거 | 확인 내용 |
|---|---|---|
| BLOG 버전/대상 | `ai-auto-blog/utils/version.ts:3`, `AGENTS.md:10` | v1.75, slug ai-auto-blog, 생성·내부 저장 후 네이버로 전송하는 도구 |
| 수집 종류 | `ai-auto-blog/app/api/candidates/http/route.ts`, `rss/route.ts`, `perplexity/route.ts`, `shorts/route.ts` | URL·RSS/NewsBlur·Perplexity·YouTube Shorts 후보 수집. 키 없는 외부 서비스까지 자동으로 되는 기능은 아님 |
| 24시간 자료 | `ai-auto-blog/utils/news/collector.ts:172` | Google News RSS로 주제 자료/요약/링크 확보. 정리된 기사 전체 사실의 검증 완료를 의미하지 않음 |
| 이슈 지표 | 같은 파일 `:141` | 노출=기사 수, socialMentionScore=언론사 종류 수에서 계산한 대용 지표, 결과에 estimated=true. 실제 SNS 언급수나 네이버 검색량으로 표시하면 안 됨 |
| 글/이미지 생성 | `ai-auto-blog/utils/news/generator.ts:342`, `utils/news/imageGenerator.ts` | 회원 선택 본문 공급사 키로 JSON 글, 중복 제목 제거, Markdown/HTML 변환. 섹션 핵심 문장에 맞춘 이미지 생성/배치. 오류를 성공 기본 글로 바꾸던 fallback은 제거됨 |
| 모델·미리보기 | `ai-auto-blog/app/api/auto-post/route.ts:231`, `:293` | 공급사/본인 키 검증, 미리보기 전용 결과와 내부 DB 저장 경로 구분. 내부 등록은 네이버 발행이 아님 |
| 결과 편집 | `ai-auto-blog/app/write/ai-form/page.tsx`, `app/posts/[id]/edit/page.tsx` | Tiptap/블록 편집·이미지 배치·카테고리·원고 저장. 단순 텍스트 생성 외 가치 |
| 웹→확장 | `ai-auto-blog/app/api/posts/[id]/extension-handoff/route.ts:11`, `extension/background.js:131` | 30분 전송 창, 본인 블로그 지정, 실행 runId/heartbeat/lease를 사용하는 입력 처리 |
| 입력 안전 엔진 | `ai-auto-blog/extension/blog-engine.js:3` | 빈 편집기·단계별 문서 대조·중복/누락 시 중단·최종 발행은 직접. DOM 처리 adapter와 순수 engine 분리 |
| 완료 상태 | `ai-auto-blog/app/api/extension/posts/[id]/input-result/route.ts:9`, `extension/background.js:115` | completed=본문 입력, publish_ready=발행 설정까지 준비. 서버에 글이 있다는 뜻이나 실제 게시됐다는 뜻과 구분 |
| 보관 | `ai-auto-blog/app/api/cron/cleanup-images/route.ts:10`, `utils/imageRetention.ts:1` | 원고·이미지·글감 생성일 기준 30일 정리(기존 자료 정책 시작 유예 포함). 실행 이력 미조회 |
| 이미지 읽기 | `ai-auto-blog/utils/imageStorage.ts:5`, `:28` | 사용자 경로로 나누지만 공개 URL 반환. private Storage로의 정비 검토 대상 |
| 티스토리 버전 | `tistory-auto-blog/utils/version.ts:3` | v1.82 |
| 같은 역할/다른 출력 | `tistory-auto-blog/AGENTS.md:3`, `docs/OPERATIONS_HANDOFF.md` | 수집/글/이미지/편집 흐름은 BLOG와 겹침. 출력 대상은 본인 tistory.com 관리 편집기 |
| 별도 안전 엔진 | `tistory-auto-blog/extension/tistory-engine.js:3` | TinyMCE가 HTML을 재구성하므로 네이버의 문서 전체 일치 대신 텍스트 조각+의미 구조로 검증. 네이버 adapter를 그대로 넣으면 안 됨 |
| 서식 보존 | 같은 파일 `:92`, `:115` | 제목/목록/인용/표 구조 손실을 판정, 발행 전 저장 원본 동기화 및 본문/이미지 수 확인 |
| 태그/예약 | `tistory-auto-blog/extension/tistory-core.js:37`, `tistory-engine.js:137` | 실제 태그 칩과 카테고리·공개·댓글·홈주제·예약 설정. 최종 저장/발행 버튼은 누르지 않음 |
| 본인 블로그 확인 | `tistory-auto-blog/extension/tistory-core.js:58`, `:67` | 본인 blogName과 manage/newpost 또는 manage/post URL 일치, 카카오 로그인 화면 분리 |
| 보관/공개 URL | `tistory-auto-blog/app/api/cron/cleanup-images/route.ts:19`, `utils/imageStorage.ts:5` | 같은 공유 버킷에서도 tistory-auto-blog 경로만 정리. 경로 분리와 비공개 읽기는 별개 |

## 이번 실제 실행한 무료 검사

`node --test ai-auto-blog/tests/extension-engine.test.cjs tistory-auto-blog/tests/extension-engine.test.cjs` → **46/46 통과**. 가짜 editor/adapter로 순서·기존 문서 보호·중복/누락·서식 손실·중지·탭 닫힘·부분 실패를 확인하는 로컬 검사입니다. 실제 네이버/티스토리 DOM·회원 로그인·현재 설치 ZIP까지 검증한 결과가 아닙니다.

## 통합 판단

BLOG의 일반 글쓰기 화면은 에이전트와 겹치므로, 근거 기반 수집·서식 편집·이미지 배치·입력 안전 엔진을 먼저 흡수한 뒤 별도 신규 개발을 중단하는 후보입니다. 티스토리는 콘텐츠 생성 호출 같은 안쪽 엔진만 기준/사본으로 맞추고, 편집기 adapter/검증/발행 설정/매뉴얼은 별도 유지하는 것이 낫습니다.
