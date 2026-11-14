# 전체 개발 현황 점검 — 2026-11-13

> [역할: policy] Claude Code(윈도우) `claude-win-20261112-policy` · 주인님 지시 「넌 전체적으로 현재 개발진행상황을 체크해서 업데이트 하고」
> **기계 대조(읽기 전용)**: 저장소 코드의 버전 파일 · 운영 DB `programs`(ref `esgxyikcnnvmlhygjkth`) · 프로그램 문서 · 매뉴얼 화면 파일 · `docs/PENDING_DEPLOYS.md` · 역할 파일을 한 번에 대조했다. 각 프로그램의 기능 내용 분석은 담당 역할이 자기 문서에 적는다 — 이 문서는 「어디가 어긋나 있는가」를 찾는 지도다.
> 다시 만들기: 임시 스크립트로 만들었다(저장소에 넣지 않음). 판정 기준은 아래 §0.

## 0. 판정 기준
- **버전 불일치**: 코드 `lib/version.ts`와 DB `programs.version`이 다름. 미배포 대기가 있으면 정상(코드가 먼저 올라간 상태)일 수 있다.
- **문서 뒤처짐**: `AGENTS.md`에 지금 코드 버전 글자가 없음(버전 이력이 최신까지 안 적힘).
- **매뉴얼 뒤처짐**: 매뉴얼 화면 파일(`/guide` 등)의 마지막 수정이 프로그램 코드 마지막 수정보다 14일 넘게 이전. 기능이 바뀌었는데 매뉴얼은 그대로일 가능성 — 실제 내용 대조는 담당이 한다.
- **담당**: 역할 파일 「맡은 폴더」에 폴더 이름이 적힌 역할. 없으면 카테고리 담당(괄호)으로 추정, 그것도 없으면 「—」.

## 1. 한눈에
| 항목 | 수 |
|---|---|
| 저장소 프로그램 폴더 | 102 |
| 운영 DB 프로그램 | 103 (공개 81) |
| 코드·DB 버전 불일치 | 9 |
| 문서(AGENTS) 뒤처짐 | 49 |
| 매뉴얼 화면 없음 | 16 (공개 프로그램 5) |
| 매뉴얼 뒤처짐 추정 | 39 (공개 32) |
| 개선 문서(IMPROVEMENTS) 없음 | 2 |
| 백로그 문서 없음 | 41 |
| 명시 담당·카테고리 담당 모두 없음(공개) | 33 |

## 2. 바로 확인할 것
### 2-1. 코드·DB 버전 불일치
| 폴더 | 코드 | DB | 미배포 대기 줄 | 판정 |
|---|---|---|---|---|
| `ai-influencer-studio` | v1.25 | v1.24 | 0 | **대기 줄 없음 — 담당 확인 필요** |
| `allinone-graphic` | v1.20 | v1.11 | 3 | 대기 중 — 다음 배포 때 맞춰짐 |
| `blog-content-maker` | v1.15 | v1.14 | 2 | 대기 중 — 다음 배포 때 맞춰짐 |
| `blog-workroom` | v1.17 | v1.16 | 2 | 대기 중 — 다음 배포 때 맞춰짐 |
| `cinematic-storyboard-studio` | v1.19 | v1.18 | 2 | 대기 중 — 다음 배포 때 맞춰짐 |
| `ebook-studio` | v1.16 | v1.15 | 2 | 대기 중 — 다음 배포 때 맞춰짐 |
| `insta_auto_poster` | v1.73 | v1.72 | 1 | 대기 중 — 다음 배포 때 맞춰짐 |
| `naver-cafe-poster` | v1.29 | v1.28 | 1 | 대기 중 — 다음 배포 때 맞춰짐 |
| `threads-affiliate-poster` | v1.87 | v1.86 | 4 | 대기 중 — 다음 배포 때 맞춰짐 |

### 2-2. 폴더와 DB가 짝이 안 맞는 것
- 폴더는 있는데 DB 등록 없음: `blog_auto_poster`, `naver-blog-auto-poster_app`, `web-crawler` — `web-crawler`는 DB slug `web-crawler-saas`, `naver-blog-auto-poster_app`은 `naver-blog-auto-poster`와 이름만 다른 짝일 수 있음(도구가 연결하지 못함). `blog_auto_poster`는 문서도 없음.
- DB에만 있는 것: `web-crawler-saas`(공개), `detail-page-12p`(비공개), `storage-plus`(비공개), `naver-blog-auto-poster`(비공개) — `detail-page-12p`는 폐지(백업), `storage-plus`는 저장 구독용 항목이라 폴더가 없는 것이 정상.

### 2-3. 공개 프로그램인데 매뉴얼 화면이 없는 것
`ai-influencer-studio`(—), `ai-task-planner`(workspace), `ai-webtoon-studio`(—), `document-translator`(—), `mall-builder`(mall-builder) — 파일 이름으로 찾은 것이라 탭 안에 매뉴얼이 있는 프로그램은 잘못 잡혔을 수 있다(담당 확인).

### 2-4. 공개 프로그램인데 담당이 정해지지 않은 것
- **AI 프롬프트** (1): `reverse-prompt`
- **CRM** (2): `crm-google-form`, `kakao_auto_poster`
- **네이버** (1): `naver-cafe-poster`
- **디자인** (3): `cinematic-storyboard-studio`, `landing-architect`, `ui-canvas`
- **마케팅(홍보)** (4): `booking-reminder`, `comment-inbox`, `competitor-analysis`, `stepmail`
- **성격·운세** (4): `mbti`, `mbti-character`, `personality-suite`, `tarot`
- **쓰레드** (4): `threads`, `threads-affiliate-poster`, `threads-comment-reply`, `threads-easy-planner`
- **업무자동화** (6): `ai-slide-builder`, `ai-writing-editor`, `document-translator`, `ebook-studio`, `file-merge`, `markdown-studio`
- **유튜브** (4): `shorts-viral-studio`, `thumbnail-master`, `youtube-auto-reply`, `youtube-viral-studio`
- **인스타** (4): `ai-influencer-studio`, `ai-webtoon-studio`, `instagram-comment-reply`, `insta_auto_poster`

→ 이 프로그램들은 「각 역할 담당이 정리」에서 빠진다. 누가 분석·문서·매뉴얼 보강을 할지 주인님 결정이 필요하다(정책 담당 역할 파일 「주인님께 여쭐 것」).

## 3. 전체 표
| 카테고리 | 폴더 | 이름 | 공개 | 코드 | DB | 담당 | 대기 | 문서 최신 | 매뉴얼 | 개선 문서 | 마지막 코드 수정 | 마지막 매뉴얼 수정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 네이버 | `naver-cafe-poster` | 네이버 카페 포스팅 자동화 | 공개 | v1.29 | v1.28 ⚠ | — | 1 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 네이버 | `naver-cafe-recruit` | 네이버 카페 회원 모집 자동화 | 비공개 | v1.03 | v1.03 | — | 1 | ✔ | ✔ | 없음 · 백로그 없음 | 2026-11-12 | 2026-11-06 |
| 디자인 | `cinematic-storyboard-studio` | 시네마틱 스토리보드 자동화 | 공개 | v1.19 | v1.18 ⚠ | — | 2 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-06 |
| 디자인 | `landing-architect` | AI 랜딩페이지 기획 자동화 | 공개 | v1.15 | v1.15 | — | 3 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 디자인 | `ui-canvas` | UI Canvas 자동화 | 공개 | v1.15 | v1.15 | — | 3 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 마케팅(홍보) | `booking-reminder` | 예약(취소)방지 리마인드 자동화 | 공개 | v1.28 | v1.28 | — | 1 | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 마케팅(홍보) | `comment-inbox` | AI 댓글·DM 통합 받은편지함 | 공개 | v1.09 | v1.09 | — |  | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 마케팅(홍보) | `competitor-analysis` | 키워드·경쟁사 분석 자동화 | 공개 | v1.13 | v1.13 | — |  | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 마케팅(홍보) | `stepmail` | 대량 메일발송 자동화(Step Mail) | 공개 | v1.28 | v1.28 | — | 1 | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 백업 | `allinone-graphic` | AI 올인원 그래픽 자동화 | 비공개 | v1.20 | v1.11 ⚠ | — | 3 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-06 |
| 백업 | `auto-detail-page` | 상세페이지 자동생성기 v1 | 비공개 | v1.21 | v1.21 | — | 1 | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 백업 | `blog-content-maker` | AI 블로그 콘텐츠 제작 자동화 | 비공개 | v1.15 | v1.14 ⚠ | blog | 2 | 뒤처짐 | 없음 | ✔ | 2026-11-11 | — |
| 백업 | `blog-workroom` | AI 블로그 작업실 자동화 | 비공개 | v1.17 | v1.16 ⚠ | blog | 2 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 백업 | `cardnews-studio` | INSTA Cardnews 자동화 | 비공개 | — | v1.32 | — |  | 뒤처짐 | 없음 | ✔ | 2026-11-11 | — |
| 백업 | `ghost-scraper` | Website Scraper | 비공개 | v1.15 | v1.15 | — | 3 | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-12 | 2026-10-23 |
| 백업 | `instagram-dm-reply` | INSTA DM답변 자동화 | 비공개 | — | v1.17 | — |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 백업 | `longtail-keyword-expander` | 롱테일 키워드분석 자동화 | 비공개 | v1.11 | v1.11 | — |  | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 백업 | `naver-blog-allinone` | 네이버 블로그 올인원 자동화 | 비공개 | v1.60 | v1.60 | blog |  | 뒤처짐 | 없음 | ✔ | 2026-11-11 | — |
| 백업 | `naver-blog-auto-poster_web` | 네이버 블로그 자동화(Web) | 비공개 | — | v1.13 | blog |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 백업 | `persona-style-studio` | 페르소나 문체 자동화 | 비공개 | v1.11 | v1.11 | — | 3 | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 백업 | `photo-remake-studio` | AI 포토 리메이크 자동화 | 비공개 | v1.13 | v1.13 | — | 2 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 백업 | `prompt-template-studio` | AI 프롬프트 템플릿 자동화 | 비공개 | v1.07 | v1.07 | — |  | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 백업 | `react-ui-showcase` | AI 웹 UI 제작 자동화 | 비공개 | v1.08 | v1.08 | — | 3 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 백업 | `seo-thumbnail-pro` | AI 유튜브 썸네일 프로 | 비공개 | — | v1.12 | — |  | 뒤처짐 | 없음 | ✔ | 2026-11-11 | — |
| 백업 | `suno-music-studio` | Suno 음악기획 자동화 | 비공개 | v1.13 | v1.13 | — |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 백업 | `youtube-channel-consultant` | YOUTUBE CHANNEL CONSULTANT | 비공개 | — | v1.11 | — |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 백업 | `yt-playlist-studio` | Youtube Playlist 자동화 | 비공개 | — | v1.15 | — |  | 뒤처짐 | 없음 | ✔ | 2026-11-11 | — |
| 부동산 | `commercial-land-trade-alert` | 상가·건물·토지 매물 알림 | 공개 | v1.34 | v1.34 | realty | 1 | ✔ | ✔ | ✔ | 2026-11-12 | 2026-11-04 |
| 부동산 | `real_estate_sales` | 부동산 실거래 투자분석 자동화 | 공개 | v1.60 | v1.60 | realty | 1 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-13 | 2026-11-09 |
| 부동산 | `realty-client-desk` | AI 중개사무소 고객관리 자동화 | 공개 | v1.10 | v1.10 | realty |  | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-03 |
| 부동산 | `realty-listing-alert` | 부동산 실시간 매물 알림 | 공개 | v1.44 | v1.44 | realty |  | ✔ | 뒤처짐 추정 | ✔ | 2026-11-13 | 2026-10-25 |
| 블로그 | `ai-auto-blog` | 블로그 포스팅 자동화 | 공개 | v1.87 | v1.87 | blog | 1 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 블로그 | `blog-keyword` | AI 블로그 키워드 자동화 | 공개 | v1.13 | v1.13 | blog | 3 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-02 |
| 블로그 | `blog-neighbor-care` | AI 블로그 이웃 소통 자동화 | 공개 | v1.20 | v1.20 | blog | 2 | 뒤처짐 | ✔ | ✔ | 2026-11-13 | 2026-11-04 |
| 블로그 | `naver-blog-agent` | 네이버 블로그 에이전트 | 공개 | v2.28 | v2.28 | blog |  | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 블로그 | `naver-blog-seo-studio` | 네이버 블로그 SEO 스튜디오 | 공개 | v2.26 | v2.26 | blog | 2 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 블로그 | `tistory-auto-blog` | 티스토리 포스팅 자동화 | 공개 | v1.96 | v1.96 | blog | 3 | 뒤처짐 | ✔ | ✔ | 2026-11-12 | 2026-11-01 |
| 블로그 | `wp-blogger-auto` | AI 워드프레스·구글블로그 자동화 | 공개 | v1.04 | v1.04 | blog(카테고리) |  | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-13 | 2026-11-11 |
| 성격·운세 | `mbti` | 성격코드(MBTI) 측정기 | 공개 | v1.21 | v1.21 | — |  | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 성격·운세 | `mbti-character` | 캐릭코드(MBTI) 측정기 | 공개 | v1.24 | v1.24 | — |  | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |
| 성격·운세 | `personality-suite` | AI 종합 성격 진단 자동화 | 공개 | v1.29 | v1.29 | — | 2 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-12 | 2026-11-01 |
| 성격·운세 | `tarot` | AIMaster 타로점 | 공개 | v1.28 | v1.28 | — |  | ✔ | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 쓰레드 | `threads` | Threads 포스팅 자동화 | 공개 | v1.34 | v1.34 | — | 1 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 쓰레드 | `threads-affiliate-poster` | Threads 쇼핑제휴 자동화 | 공개 | v1.87 | v1.86 ⚠ | — | 4 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 쓰레드 | `threads-comment-reply` | Threads 댓글자동화 | 공개 | v1.29 | v1.29 | — | 1 | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 쓰레드 | `threads-content-ops` | Threads 콘텐츠 운영 자동화 | 공개 | v2.25 | v2.25 | design | 1 | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-25 |
| 쓰레드 | `threads-easy-planner` | Threads AI 기획 자동화 | 공개 | v1.50 | v1.50 | — |  | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 업무자동화 | `ai-doc-chatbot` | AI 문서 챗봇 자동화 | 공개 | v1.10 | v1.10 | docbot-prompt | 2 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-12 | 2026-10-24 |
| 업무자동화 | `ai-slide-builder` | AI 슬라이드 자동화 | 공개 | v1.12 | v1.12 | — | 3 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 업무자동화 | `ai-task-planner` | AI 할 일·성과 관리 | 공개 | v1.13 | v1.13 | workspace |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 업무자동화 | `ai-work-workspace` | AI 업무 워크스페이스 자동화 | 공개 | v1.35 | v1.35 | workspace | 1 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-13 |
| 업무자동화 | `ai-writing-editor` | AI 글쓰기 에디터 자동화 | 공개 | v1.13 | v1.13 | — | 1 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 업무자동화 | `document-translator` | AI 문서번역 자동화 | 공개 | v1.23 | v1.23 | — |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| 업무자동화 | `ebook-studio` | eBook Studio | 공개 | v1.16 | v1.15 ⚠ | — | 2 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-11 |
| 업무자동화 | `file-merge` | AI 엑셀·텍스트 합치기 자동화 | 공개 | v1.08 | v1.08 | — |  | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 업무자동화 | `markdown-studio` | 마크다운 문서 자동화 | 공개 | v1.21 | v1.21 | — |  | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 영상 | `ai-video-studio` | AI 영상 스튜디오 | 공개 | v1.36 | v1.36 | video | 4 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-12 | 2026-10-24 |
| 영상 | `infinite-loop-video` | 무한루프 영상자동화 | 공개 | v1.10 | v1.10 | video | 1 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-31 |
| 영상 | `lyric-video-studio` | AI 가사영상 자동화 | 공개 | v1.13 | v1.13 | music | 1 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-13 | 2026-10-23 |
| 영상 | `video-to-gif` | AI 영상렌더 스튜디오 | 공개 | v1.28 | v1.28 | video | 1 | ✔ | ✔ | ✔ | 2026-11-12 | 2026-11-06 |
| 유튜브 | `playlist-channel-studio` | YOUTUBE 플레이리스트 자동화 | 공개 | v1.41 | v1.41 | music | 3 | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-13 | 2026-11-01 |
| 유튜브 | `shorts-onestop-studio` | AI 쇼츠 원스톱 제작 자동화 | 공개 | v1.53 | v1.53 | video | 4 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-11 |
| 유튜브 | `shorts-viral-studio` | 쇼츠 떡상 분석·대본 자동화 | 공개 | v2.00 | v2.00 | — | 1 | ✔ | ✔ | ✔ | 2026-11-11 | 2026-10-30 |
| 유튜브 | `shots` | YOUTUBE Shots(이미지 스토리) 자동화 | 공개 | v1.50 | v1.50 | video | 5 | 뒤처짐 | ✔ | ✔ | 2026-11-12 | 2026-11-11 |
| 유튜브 | `thumbnail-master` | AI 썸네일·SEO 자동화 | 공개 | v2.01 | v2.01 | — | 5 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-10-30 |
| 유튜브 | `youtube-auto-reply` | 유튜브 댓글자동화 | 공개 | v1.33 | v1.33 | — | 5 | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 유튜브 | `youtube-viral-studio` | AI 유튜브 떡상 분석 자동화 | 공개 | v1.28 | v1.28 | — | 2 | ✔ | ✔ | ✔ | 2026-11-11 | 2026-11-11 |
| 음악 | `ai-audio-analyzer` | AI Audio분석 자동화 | 공개 | v1.15 | v1.15 | music(카테고리) |  | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-10-31 |
| 음악 | `ai-mastering-studio` | AI 마스터링 스튜디오 | 공개 | v1.16 | v1.16 | music | 4 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-01 |
| 음악 | `ai-music-studio` | AI 음악 스튜디오 | 공개 | v1.15 | v1.15 | music | 3 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-13 | 2026-10-23 |
| 음악 | `free-music-studio` | AI 무료음악 자동화 | 공개 | v1.65 | v1.65 | music(카테고리) | 2 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-09 |
| 음악 | `music` | 음악(SUNO)자동화 | 공개 | v1.50 | v1.50 | music | 1 | ✔ | ✔ | ✔ · 백로그 없음 | 2026-11-13 | 2026-11-01 |
| 음악 | `music-player` | 뮤직 플레이어 자동화 | 공개 | v1.09 | v1.09 | music(카테고리) |  | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| 음악 | `music-video-studio` | 뮤직비디오 자동화 | 공개 | v1.30 | v1.30 | music·video | 8 | 뒤처짐 | ✔ | ✔ | 2026-11-13 | 2026-10-31 |
| 음악 | `vinyl-lp-studio` | LP 턴테이블 자동화 | 공개 | v1.15 | v1.15 | music(카테고리) | 3 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `ai-image-studio` | AI 이미지 스튜디오 | 공개 | v1.34 | v1.34 | ecommerce-image | 2 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `banana-canvas` | AI 바나나 캔버스 자동화 | 공개 | v1.47 | v1.47 | ecommerce-image | 6 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-01 |
| 이미지 | `emotion-writer` | 감성 글귀 이미지 | 공개 | v1.27 | v1.27 | ecommerce-image(카테고리) | 2 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `fashion-style` | AI 패션스타일 자동화 | 공개 | v1.14 | v1.14 | ecommerce-image(카테고리) | 2 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `four-cut-comics` | AI 4컷 만화 자동화 | 공개 | v1.37 | v1.37 | ecommerce-image(카테고리) | 2 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `image-convert-studio` | 이미지 변환 스튜디오 | 공개 | v1.27 | v1.27 | ecommerce-image(카테고리) |  | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `portrait-photo` | AI 인물사진 자동화 | 공개 | v1.45 | v1.45 | ecommerce-image(카테고리) | 4 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| 이미지 | `style-dna-analyzer` | 이미지 스타일 분석기 | 공개 | v1.39 | v1.39 | ecommerce-image(카테고리) | 3 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| 이커머스 | `coupang-ops` | AI 쿠팡 운영 자동화 | 공개 | v1.19 | v1.19 | ecommerce-image(카테고리) | 2 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-10-31 |
| 이커머스 | `elevenst-register` | AI 11번가 상품 자동등록기 | 공개 | v1.06 | v1.06 | ecommerce-image(카테고리) |  | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-13 |
| 이커머스 | `mall-builder` | AI 쇼핑몰 빌더 | 공개 | v1.06 | v1.06 | mall-builder |  | ✔ | 없음 | ✔ | 2026-11-13 | — |
| 이커머스 | `seller-label-docs` | 셀러 라벨·QR·서류 자동화 | 공개 | v1.04 | v1.04 | ecommerce-image(카테고리) | 1 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-25 |
| 이커머스 | `shop-detail-page` | AI 상세페이지 자동화 | 공개 | v1.44 | v1.44 | ecommerce-image | 3 | ✔ | ✔ | ✔ | 2026-11-13 | 2026-11-01 |
| 이커머스 | `shop-order-report` | AI 쇼핑몰 주문·매출 리포트 자동화 | 공개 | v1.06 | v1.06 | ecommerce-image(카테고리) |  | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-25 |
| 이커머스 | `smartstore-register` | AI 스마트스토어 상품 자동등록기 | 공개 | v1.27 | v1.27 | ecommerce-image(카테고리) | 2 | 뒤처짐 | 뒤처짐 추정 | ✔ | 2026-11-13 | 2026-10-28 |
| 이커머스 | `trending-product-finder` | 상품소싱 자동화 | 공개 | v1.37 | v1.37 | ecommerce-image | 2 | ✔ | ✔ | ✔ | 2026-11-11 | 2026-11-09 |
| 인스타 | `ai-influencer-studio` | AI 인플루언서 자동화 | 공개 | v1.25 | v1.24 ⚠ | — |  | ✔ | 없음 | ✔ | 2026-11-13 | — |
| 인스타 | `ai-webtoon-studio` | AI 웹툰 자동화 | 공개 | v1.32 | v1.32 | — | 2 | 뒤처짐 | 없음 | ✔ | 2026-11-12 | — |
| 인스타 | `insta_auto_poster` | INSTA 포스팅 자동화 | 공개 | v1.73 | v1.72 ⚠ | — | 1 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-11 |
| 인스타 | `instagram-comment-reply` | INSTA 댓글·DM 자동화 | 공개 | v1.37 | v1.37 | — | 2 | ✔ | 뒤처짐 추정 | ✔ | 2026-11-11 | 2026-10-23 |
| (DB 없음) | `blog_auto_poster` | — | — | — | — | — |  | 없음 | 없음 | 없음 · 백로그 없음 | 2026-11-11 | — |
| (DB 없음) | `naver-blog-auto-poster_app` | — | — | — | — | — |  | 뒤처짐 | 없음 | ✔ · 백로그 없음 | 2026-11-11 | — |
| (DB 없음) | `web-crawler` | — | — | — | — | — | 3 | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| AI 프롬프트 | `ai-prompt-studio` | AI Prompt 자동화 | 공개 | v1.11 | v1.11 | docbot-prompt | 4 | 뒤처짐 | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-12 | 2026-10-23 |
| AI 프롬프트 | `reverse-prompt` | AI 리버스 프롬프트 자동화 | 공개 | v1.14 | v1.14 | — | 3 | 뒤처짐 | ✔ | ✔ | 2026-11-11 | 2026-11-01 |
| CRM | `crm-google-form` | 구글폼 CRM 자동화 | 공개 | v1.16 | v1.16 | — | 1 | ✔ | 뒤처짐 추정 | ✔ · 백로그 없음 | 2026-11-11 | 2026-10-23 |
| CRM | `kakao_auto_poster` | 카카오톡 뉴스레터 자동화 | 공개 | v1.30 | v1.30 | — | 2 | 뒤처짐 | ✔ | ✔ · 백로그 없음 | 2026-11-11 | 2026-11-01 |

## 4. 역할·작업 중 표 점검(`node scripts/check-role-status.mjs`, 2026-11-13 17:24)
- 3일 넘게 갱신 안 된 역할 파일: `analysis-planning`(10-29), `docbot-prompt`(10-25), `unassigned`(11-10). `blog`는 「초안 — 담당 확인 전」 표시가 남아 있음.
- 작업 중 표에 오래 남은 줄: `claude-mac-20261111-wpblogger`·`agy-win-mb-v1`(최근 14일 커밋 없음, `mall-builder/`), `claude-win-sdp`의 `elevenst-register/`(2일 넘음 — 단, 같은 날 v1.06 배포·v1.07 미배포 작업 기록이 있어 실제로는 진행 중). 끝난 줄인지 각 세션이 정리해야 한다.
- 미배포 대기: `docs/PENDING_DEPLOYS.md` 「대기 중」 144줄(`node scripts/pending-check.mjs --all`).

## 5. 메인 사이트(정책 담당 몫) — 이번에 한 것

- 「API 설정」 화면: AI 키 4종·Cloudinary 옆 「📖 발급 방법」 버튼, 연동 항목 옆 「📖 연동 매뉴얼」 버튼(코드, 미배포). 운영 DB 연동 항목 11개에 매뉴얼 글 연결(마이그레이션 0070, 적용).
- 자주 묻는 질문: 옛 정책 답 4개 수정 + 질문 5개 추가(마이그레이션 0071, 적용·운영 화면 확인).
- 옛 주소 이동 대상 수정(`aimaster-five.vercel.app`), 저장공간 요금제 카드 안내 문구(코드, 미배포).
- 개선사항 원장: [`docs/MAIN_SITE_IMPROVEMENTS.md`](MAIN_SITE_IMPROVEMENTS.md).

## 6. 담당 미정 28개 점검 결과 (2026-11-13, 주인님 「니가 해」)

- 대상 28개 모두 끝남: 각 프로그램 `AGENTS.md` 「현재 상태 요약 (2026-11-13 전체 점검)」(insta는 `docs/STATUS_20261113.md`), `docs/IMPROVEMENTS.md` 「2026-11-13 전체 점검에서 발견」, 매뉴얼 정정·보강, 설정 화면 「📖 발급 방법」 버튼. 28개 모두 tsc 오류 0, 공용 사본 기준과 일치. 미배포(버전 안 올림).
- 빠진 5개(다른 세션 연속 배포 중): `threads-affiliate-poster` `instagram-comment-reply` `threads-comment-reply` `threads` `youtube-auto-reply`.
- 매뉴얼이 실제와 달랐던 대표 사례: 없는 기능 안내(드래그 앤 드롭, 치환 태그, 개별 예약, 붉은 배지), 틀린 수치(해시태그 25개, 화면 크기, 실행 취소 50단계, 나눠 보내는 단위), 옛 모델·가격, 근거 없는 약속(암호화 보관·완벽 파기·30일 보존 준수), 실제와 반대 안내(카카오 자동 발송).

### 6-1. 주인님 결정이 필요한 것
| 구분 | 프로그램 | 내용 | 근거 |
|---|---|---|---|
| ⚠ 최상위 규칙 | `kakao_auto_poster` | 카카오톡 공유 버튼이 운영자 카카오 앱 키(`NEXT_PUBLIC_KAKAO_JS_KEY`)를 씀 | 그 프로그램 IMPROVEMENTS 맨 위 |
| ⚠ 회원 격리 | `threads-easy-planner` | 보관함 브라우저 임시 저장 키가 회원별로 나뉘지 않음 — 같은 PC 다른 회원 글이 보일 수 있음 | `src/lib/storage/savedPlansStorage.ts:12` |
| 보관 열외 누락(DB·정리 코드) | `document-translator`(높음) `youtube-viral-studio` `competitor-analysis` `insta_auto_poster`(카드뉴스) `threads-easy-planner` | 30일 정리가 관리자·시험 계정(`retention_exempt`)을 빼지 않음 | 각 IMPROVEMENTS |
| 30일 정리 없음 | `ai-writing-editor`(개수 기준만) `tarot` `ui-canvas` `kakao_auto_poster` `naver-cafe-poster` `stepmail` | 서버 저장 자료의 30일 자동 삭제 코드가 없음(중앙 정리는 연장 회원만 처리) | 각 IMPROVEMENTS |
| 비밀번호 평문 저장 | `insta_auto_poster` `naver-cafe-poster` | NewsBlur 비밀번호를 원문으로 DB에 저장 | `newsblurAccount.ts` |
| 쓰이지 않는 키 칸 | `kakao_auto_poster` | 설정의 Claude 키 칸이 실제로 쓰이지 않음 | `reportEngine.ts:33` |
| 종료 예정 모델 | `threads-easy-planner` | 선택지에 종료·종료 예정 모델 3개 | 그 프로그램 IMPROVEMENTS |

- **2026-11-14 결정**: `stepmail` 리드(회원이 올린 연락처 명부)는 예외로 삭제하지 않고 회원별 보관, 발송 기록은 30일 그대로 — `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 지정 목록.
- 공통(다음 배포 때 함께, 점검 도구가 알림): 저장공간 위젯 한 줄, `signOut({ scope: "local" })`, 서버 Supabase 클라이언트 `User-Agent` — 28개 대부분 미적용.
