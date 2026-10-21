# 비공개 프로그램 → 병합 대상 정리 (2026-10-22, Claude Code 윈도우)

> 주인님 질문: 「비공개 처리된 다른 프로그램들도 어디로 병합됐는지 정리」 → 「정리해서 인수인계 문서로 남겨놔」.
> 기준: 운영 DB `programs.is_active=false` 16개(ref `esgxyikcnnvmlhygjkth`, 2026-10-22 읽기 전용 조회). 병합 대상은 카테고리별 병합 보고서 `docs/analysis-*/REPORT.md`의 완료 표와 각 병합 커밋으로 확인. 화면은 새로 열어 보지 않음.
> **공통**: 옛 앱은 지우지 않고 「옮겼습니다」 안내 화면 + 옛 주소 전달(또는 API 410)만 남김. 권한은 병합 대상 프로그램 권한을 이미 가진 회원이 대부분이고, 모자란 회원은 병합 때 기간 연장·부여(각 보고서 기록). 코드 백업: `D:\Antigravity\AIMaster_backup\retired-programs\` + git 태그 `backup/old-apps-20261021` 등.

## 1. 병합된 14개
| 숨긴 프로그램 (slug · 마지막 버전) | 옮겨 간 곳 (지금 쓰는 프로그램) | 옮겨 간 메뉴·기능 | 병합 날짜·묶음 | 근거 |
|---|---|---|---|---|
| Website Scraper (`website-scraper` v1.13) | 웹 크롤링 자동화 (`web-crawler-saas`) | 「🔎 한 페이지 분석」 `/inspect`: 7탭·영역 선택·AI 목록 표·CSV·이미지 ZIP | 2026-10-21 · 데이터수집 병합 A | `analysis-scraping-consolidation-20261021`, 커밋 `29f9a3a5c` |
| 페르소나 문체 자동화 (`persona-style-studio` v1.09) | AI 글쓰기 에디터 자동화 (`ai-writing-editor`) | 「🎚️ 문체 바꾸기」 | 2026-10-21 · 병합 B | 같은 보고서 |
| AI 프롬프트 템플릿 자동화 (`prompt-template-studio` v1.06) | AI Prompt 자동화 (`ai-prompt-studio`) | 「📁 내 템플릿 보관함」(서버 저장, 옛 브라우저 보관함 옮기기 버튼) | 2026-10-21 · 병합 C | 같은 보고서 |
| AI 웹 UI 제작 자동화 (`ai-web-ui`, 폴더 `react-ui-showcase` v1.06) | UI Canvas 자동화 (`ui-canvas`) | 「🧩 컴포넌트 갤러리」 + React·Tailwind 코드 내보내기 + AI 컴포넌트 보관 | 2026-10-21 · 병합 D | 같은 보고서 |
| AI 포토 리메이크 자동화 (`photo-remake-studio` v1.11) | AI 바나나 캔버스 자동화 (`banana-canvas`) | 「🕰️ 옛 사진 복원」(2·4배·8192px), 합성 사물별 지시·배경 선택, 원본 비교 슬라이더 | 2026-10-21 · 이미지 병합 A | `analysis-image-consolidation-20261021`, 커밋 `df25f28be`·`aad2a9b8b` |
| AI 올인원 그래픽 자동화 (`allinone-graphic` v1.09) | AI 바나나 캔버스 자동화 (`banana-canvas`) | 「📐 템플릿 그래픽」 123종·메모 자동 입력, 「비율 확장」·「부분 수정 지시」 | 2026-10-21 · 이미지 병합 B | 같은 보고서 |
| AI 12단 상세페이지 자동화 (`detail-page-12p` v1.10) | AI 상세페이지 자동화 (`shop-detail-page`) | 마켓 규격 프리셋(쿠팡 12단·스마트스토어 9단)·사양서 분석·모바일 미리보기·860px 내보내기, 12단 자료 옮기기 | 2026-10-21 · 이커머스 E1 | `analysis-ecommerce-consolidation-20261021` |
| 상세페이지 자동생성기 v1 (`auto-detail-page` v1.21) | AI 상세페이지 자동화 (`shop-detail-page`) | HTML 내보내기(템플릿 3종)·서버 PNG 렌더링 | 2026-10-21 · 이커머스 E2 | 같은 보고서 |
| INSTA Cardnews 자동화 (`cardnews-studio` v1.32) | INSTA 포스팅 자동화 (`auto-instagram-posting`) | 안의 「카드뉴스 스튜디오」(기획→장별 문구→디자인→AI 배경→합성→즉시·예약 게시) | 2026-10-20~21 · 인스타 병합 A | `analysis-insta-consolidation-20261020`, 코드 정리 `8b1cee2e2` |
| INSTA DM답변 자동화 (`instagram-dm-reply` v1.17) | INSTA 댓글·DM 자동화 (`instagram-comment-reply`) | 댓글·DM 탭 한 프로그램(같은 Meta 앱 한 번 연결) | 2026-10-20~21 · 인스타 병합 B | 같은 보고서, 커밋 `258d6b15c` |
| YOUTUBE CHANNEL CONSULTANT (`youtube-channel-consultant` v1.11) | YOUTUBE 트렌드 분석 (`youtube-viral-studio`) | 채널 진단·키워드 시장·공략 채널(황금 엔진) | 2026-10-20~21 · 유튜브 병합 C | `analysis-youtube-consolidation-20261020`, 커밋 `53ace1b01` |
| AI 유튜브 썸네일 프로 (`seo-thumbnail-pro` v1.12) | AI 썸네일·SEO 자동화 (`thumbnail-master`) | 제목·SEO 설명·태그·고정 댓글 + 전략별 썸네일 | 2026-10-20~21 · 유튜브 병합 D | 같은 보고서, 커밋 `a98613cd4` |
| Youtube Playlist 자동화 (`yt-playlist-studio` v1.15) | YOUTUBE 플레이리스트 자동화 (`playlist-channel-studio`) | `/video` | 2026-10-20 · 유튜브 | 음악 보고서 표 7번, 코드 정리 2026-10-21 |
| Suno 음악기획 자동화 (`suno-music-studio` v1.12) | 음악(SUNO)자동화 (`music-automation`) | 프리셋·가사·앨범 흐름 기획 → 실제 음원 생성까지 한곳(옛 앱은 JSON 내보내기 안내) | 2026-10-21 · 음악 M1 | `analysis-music-consolidation-20261021`, 커밋 `7fdc4f1fd` |

## 2. 병합이 아닌 비공개 2개 (관리자 전용, 공개 전)
| 프로그램 | 상태 | 근거 |
|---|---|---|
| 네이버 블로그 자동화(App) (`naver-blog-auto-poster`, 폴더 `naver-blog-auto-poster_app` v1.12) | **병합 아님** — 처음부터 관리자 전용 비공개(데스크톱 앱 + 웹). 공개하려면 `is_active=true` 전환 + 카탈로그 문구가 남은 일 | `naver-blog-auto-poster_app/AGENTS.md`(공개 체크리스트 210줄, 「관리자 전용 비공개」) |
| 네이버 블로그 자동화(Web) (`naver-blog-auto-poster-web`, 폴더 `naver-blog-auto-poster_web` v1.13) | **병합 아님** — 관리자 전용 비공개(크롬 확장판). 버전·확장 배포는 계속 됨 | `naver-blog-auto-poster_web/AGENTS.md` 326·347줄. 블로그 8개 병합(BLC)은 Codex 담당이며 이 두 앱의 공개·병합은 그쪽 결정 대기 |

## 3. 지금 쓰는 프로그램 주소
https://web-crawler-saas.buylife.xyz/inspect
https://ai-writing-editor.buylife.xyz
https://ai-prompt.buylife.xyz
https://ui-canvas.buylife.xyz
https://banana-canvas.buylife.xyz
https://shop-detail-page.buylife.xyz
https://auto-instagram-posting.buylife.xyz
https://instagram-comment-reply.buylife.xyz
https://youtube-viral-studio.buylife.xyz
https://thumbnail-master.buylife.xyz
https://playlist-maker.buylife.xyz
https://music-automation.buylife.xyz

## 4. 다음 CLI 참고
- 새로 프로그램을 숨기거나 합치면 이 표에 한 줄 추가(덮어쓰지 말 것). 병합 절차: `docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md` §6, 옛 앱 코드는 지우기 전에 `D:\Antigravity\AIMaster_backup\retired-programs\<폴더>`에 백업하고 git 태그를 남긴다(2026-10-21 주인님 지시, 위 사례와 같은 방식).
- 비용: 이 정리는 DB 읽기·저장소 조회만 — 비용 없음.
