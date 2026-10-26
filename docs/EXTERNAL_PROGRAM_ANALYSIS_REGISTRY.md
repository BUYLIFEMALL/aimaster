# 외부 프로그램 개발분석표 (카테고리별 기준 자료 — 모든 CLI 공통)

> **📌 2026-10-24 주인님 지시:** 「앞으로 프로그램들을 계속 분석할꺼니까 그 결과와 자료, 관련프로그램 등을 개발분석표로 카테고리별로 분류해서 따로 지침문서로 남겨. 이후 필요한 기능들을 병합하거나 개선하고 묶어서 하나의 프로그램으로 만들거나 기존 프로그램에 병합개발할꺼야」「차후 개발할때 참고 할수 있도록 아주 자세하고 디테일하고 자료화 해야되」「다른 CLI들도 언제든 열람하고 필요하다면 추가 개발, 병합 개발시 참고 할수 있는 수준이어야해」
>
> **이 문서는 무엇인가:** 지금까지 분석한 **외부 프로그램·참고 앱·참고 사이트·외부 플랫폼 조사**를 한곳에 모은 자료집이다. 원본이 무엇을 하는지, 우리 어느 프로그램과 겹치는지, 무엇을 가져왔거나 가져올지, 무엇을 하지 않기로 했는지, 지금 어디까지 진행됐는지, 근거 문서가 어디 있는지를 카드 한 장으로 볼 수 있다.
>
> **누가 언제 읽나:** Claude Code·Codex·Antigravity(agy)·Gemini 등 모든 CLI가 아래 작업 전에 먼저 읽는다.
> ① 새 프로그램 기획 ② 기존 프로그램 기능 확장·병합 ③ 외부 프로그램 새 분석(같은 원본·같은 계열이 이미 있는지 확인).
>
> **관련 문서와 역할 구분**
> | 문서 | 다루는 것 |
> |---|---|
> | **이 문서** | **외부** 원본·참고 자료와 그로부터 나온 기능·결정·진행 상태 |
> | [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) | **우리** 프로그램 82개의 기능·장단점 |
> | [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md) | 우리 블로그 프로그램 8개의 기능 칸 |
> | [공통 아이디어 표](PROGRAM_IDEA_BACKLOG.md) | 개별 아이디어(IDEA-…)의 검토 상태 |
> | [신규·외부 프로그램 분석·개발 플랜 지침](PROGRAM_ANALYSIS_PLANNING_GUIDE.md) | 분석하는 **방법**(도구·순서·권리) |
> | [프로그램 비교 분석 매뉴얼](PROGRAM_COMPARISON_ANALYSIS_GUIDE.md) | 우리 프로그램끼리 병합할지 판단하는 방법 |
>
> 작성: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당), 2026-10-24. 근거는 각 카드의 「관련 문서」이며, 이 문서를 처음 만들 때 저장소 문서를 다시 읽어 대조했다. **이 문서를 쓰면서 코드·DB·배포는 바꾸지 않았다.** 버전은 2026-10-24 기준 각 폴더 `version.ts`(`APP_VERSION`) 값이고, 프로그램 비교표의 버전과 다르면 함께 적었다.

---

## 0. 쓰는 법

### 0-1. 읽을 때
1. **§1 총괄표**에서 카테고리·원본 이름·우리 프로그램 이름으로 찾는다.
2. 병합·확장을 기획한다면 **§2 기능 묶음 지도**를 먼저 본다. 여러 원본에서 나온 비슷한 기능이 한 묶음으로 모여 있어 「한 번에 만들 공용 엔진」을 고를 수 있다.
3. 해당 카드(§3)의 「뽑아낸 기능」「하지 않기로 한 것」「남은 결정」을 확인한다. **하지 않기로 한 것은 다시 제안하지 않는다**(주인님이 다시 묻는 경우는 예외).
4. 실제로 만들기 전에 카드의 「관련 문서」(보고서·플랜·인계)와 대상 프로그램 `AGENTS.md`를 열어 최신 상태를 다시 확인한다. 이 문서는 요약이므로 **진행 상태는 시간이 지나면 낡을 수 있다.**

### 0-2. 쓸 때 (새 분석·상태 변화가 있을 때 — 의무)
- **새 외부 프로그램을 분석하면** 분석 보고서를 커밋하는 같은 작업에서 이 문서에 ① §1 총괄표 한 줄 ② §3 해당 카테고리에 카드 하나를 추가한다. 비슷한 기능이 기존 묶음과 겹치면 ③ §2 묶음 표에도 이름을 넣는다.
- **진행 상태가 바뀌면**(플랜 승인·구현·배포·보류·제외 결정) 담당 세션이 카드의 「진행 상태」 칸에 날짜와 함께 덧붙인다. 지우지 않고 보완한다.
- 카드 번호는 `EXT-<카테고리 약자>-<두 자리>`이며 한 번 붙이면 바꾸지 않는다. 같은 원본의 새 버전은 **같은 카드에 버전 줄을 추가**한다(예: Spectrum 웹판 → 3.0.0).
- 이 문서는 여러 세션이 함께 고치므로 [안전 커밋 도우미](CLI_COLLABORATION_RULES.md) 9번 절차로 커밋한다.
  - 고치기 전: `node scripts/safe-commit.mjs --begin docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md --as <세션>`
  - 고친 뒤: `node scripts/safe-commit.mjs "<메시지>" docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md --as <세션>`
- **§1 총괄표의 「핵심 기능」·「판단」 칸은 필수**다(2026-10-24). 판단은 🆕 독립 / 🔗 병합 → 대상 / ⏸ 보류 / ❌ 제외 중 하나로 쓰고, 카테고리는 [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 기준으로 넣는다.
- 근거가 없는 내용은 쓰지 않는다. 문서에서 확인하지 못한 칸은 「문서에 없음」 또는 「확인 못 함」으로 둔다.

### 0-3. 카드 양식 (새 카드는 이 순서 그대로)
```
### EXT-XXX-NN 원본 이름 버전
| 항목 | 내용 |
|---|---|
| 원본 | 형식 · 크기 · SHA-256 앞 8자리 · 위치/주소 · 제작자 |
| 분석 | 날짜 · CLI/세션 · 방법 · 권리 판단 |
| 원본 기능 | 영역별 목록 |
| 원본 기술 | 엔진·모델·라이브러리·외부 API |
| 원본 비용 구조 | 무료/유료 키/월 인증 등 |
| 우리 대상 | slug(폴더) · 버전 · 겹침 · 없던 것 |
| 뽑아낸 기능 | 번호별 한 줄 · 넣을 곳 · 우선순위 |
| 하지 않기로 한 것 | 항목 + 이유 |
| 결정 | 병합/독립/보류 + 주인님 결정·날짜 |
| 진행 상태 | 플랜·담당·구현·배포 버전 (날짜) |
| 남은 결정 | |
| 관련 문서 | 경로 |
```

---

## 1. 총괄표

상태 표기: ✅ 우리 프로그램에 반영·운영 중 · 🔶 일부 반영, 남은 묶음 있음 · ⏳ 플랜·인계까지, 승인 대기 · 📝 분석만, 주인님 결정 대기 · ⏸ 보류 · 🔀 우리 쪽 프로그램이 다른 프로그램에 병합됨

판단 표기(2026-10-24 추가, 주인님 지시 「분석이 끝난 프로그램의 기능 및 병합·독립 프로그램 판단」):
- 🆕 **독립 새 프로그램**: 원본을 참고해 우리 쪽에 새 프로그램을 만듦(또는 만들기로 함)
- 🔗 **기존 병합 → 대상**: 좋은 기능만 기존 프로그램에 넣음
- ⏸ **보류**: 주인님 결정·법률 확인 전
- ❌ **제외**: 하지 않기로 확정
- 「→ 이후 병합」은 처음엔 독립으로 만들었다가 나중에 다른 프로그램에 합친 경우다.

카테고리는 [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 기준(실제 사이트 카테고리 + 2026-10-24 신설 「AI 프롬프트」·「성격·운세」)으로 묶었다. 카드 번호(`EXT-…`)의 앞부분은 처음 붙인 옛 분류라서 카테고리와 다를 수 있다(번호는 바꾸지 않는 규칙).

| 번호 | 원본 | 형식 | 분석일 | 핵심 기능(원본) | 판단 | 우리 대상(현재 버전) | 상태 |
|---|---|---|---|---|---|---|---|
| **블로그** | | | | | | | |
| EXT-BLOG-01 | 도톨이 AI v1.2 | Inno 6.7 + PyInstaller 설치형 | 10-15 | 내 블로그 문체 진단·골드키워드 탐색·트렌드·벤치마킹·상위 5개 근거 확인·구간별 초안·최종 검수 | 🆕 독립 새 프로그램 → 이후 SEO 스튜디오로 이관 예정 | `blog-workroom` v1.14 | ✅ |
| EXT-BLOG-02 | 도톨이 AI v1.3 | Inno 6.7 + PyInstaller 설치형 | 10-24 | 스타일 레이더(코드 점수·근거 일치)·어조 강도·전개 구조 8종·원클릭 완성 점검·참고 링크(웹·PDF·자막)·벤치마킹 새 글만 | 🔗 기존 병합 → `naver-blog-seo-studio`·`blog-keyword` | `naver-blog-seo-studio` v2.18 · `blog-keyword` v1.09 | 🔶 |
| EXT-BLOG-03 | 블로그 원고 제작 설치형 앱 6.5.4(이름 비공개) | NSIS + Electron | 10-15 | 주제 원고·기존 글 다듬기·제목 추천, 작성 방식 5종, 점검 비율, 이미지 1~10장, 네이버 편집기 입력 | 🆕 독립 새 프로그램 + 🔗 SEO 스튜디오 흡수 | `blog-content-maker` v1.11 · SEO 스튜디오 v1.74 | ✅ |
| EXT-BLOG-04 | Maepsi NP 1.0.11 | NSIS + Electron | 10-24 | 주제만 넣으면 키워드·페르소나 자동, Gemini 검색 근거 원고, 클립보드 붙여넣기 입력·구간 확인·임시저장 결과 판정 | 🔗 기존 병합 → `naver-blog-agent` | `naver-blog-agent` v2.20 | 🔶 |
| EXT-BLOG-05 | 키워드 파이터 for Gemini(네이버 API 버전) = 앱 A | AI Studio 앱 + Express | 10-14 | 자동완성(ㄱ~ㅎ)·PAA·콘텐츠 갭·상위 블로그 공략·경쟁력 점수·뉴스 전략·프롬프트 50개 | 🆕 독립 새 프로그램(앱 B와 합침) | `blog-keyword` v1.09 | ✅ |
| EXT-BLOG-06 | 키워드 파이터 for Gemini = 앱 B | AI Studio 앱 | 10-14 | 같은 기능 7종, 네이버 키 없이 대부분 사용 | 🆕 독립 새 프로그램(앱 A와 합침) | `blog-keyword` v1.09 | ✅ |
| EXT-BLOG-07 | 서이추&스댓공 Ai자동화 Ver3.5(공개용) | 크롬 확장 MV3(소스, 압축) | 10-24 | 네이버 블로그 서로이웃 자동 신청·공감·AI 댓글·대댓글·답방·이웃 정리·예약 — 비밀번호 저장 자동 로그인, 무료판 월 1회 제작자 글 강제 공감·댓글 | 🧭 주인님 방향(10-24): 내 블로그 성격에 맞는 블로그를 먼저 찾아 고른 뒤 → 서로이웃 신청 → 수락된 이웃 새 글 정기 공감 → 정독 분석 → 사람 같은 댓글, AI 모델 회원 선택 → **새 기본 프로그램 `blog-neighbor-care` 플랜 2판** · 무작위 대량 ❌ · 결정 완료 → **블로그 담당(`blog`)에게 인계**(인수인계 `HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md`) | 새 기본 프로그램 `blog-neighbor-care`(이름 확정) | 개발 중 |
| EXT-BLOG-08 | 블로그 주소추출(`nbae`) — 마케팅자동화 14종 01 | .NET 윈폼 + Selenium | 10-27 | 키워드 블로그 검색 글 주소 수집 · 글 1개의 공감·댓글 단 블로거 주소 수집 → TXT | 🔗 병합 추천 → `blog-neighbor-care` 후보 출처(EXT-BLOG-07 「댓글 ID 대량 수집 ❌」과 겹쳐 주인님 결정) | `blog-neighbor-care` v1.01(미배포) | 📝 |
| EXT-BLOG-09 | 블로그 서로이웃(`nbbb`) — 14종 02 | .NET 윈폼 + Selenium | 10-27 | 주소 목록에 서로이웃 일괄 신청(같은 문구) · 오늘 방문자 수 범위로 거르기 · 결과 상태 구분 | 🔗 병합 추천 → `blog-neighbor-care` 방문자 수 범위 조건·신청 결과 상태 구분 | `blog-neighbor-care` | 📝 |
| EXT-BLOG-10 | 블로그 댓글공감(`nbcl`) — 14종 03 | .NET 윈폼 + Selenium | 10-27 | 글 목록에 공감 + 같은 댓글, 중복 댓글 건너뛰기 | ❌ 가져올 것 없음(플랜 단계 4에 이미 있음) | — | 📝 |
| EXT-BLOG-11 | 블로그 내이웃글 챗GPT 댓글공감(`nbnl`) — 14종 04 | .NET 윈폼 + Selenium + OpenAI | 10-27 | 내 이웃 새 글 목록 → 최신 글 공감 + GPT 댓글(gpt-3.5, 지시문 한 줄) | 🔗 작은 보강 추천 → `blog-neighbor-care` 기존 이웃 가져오기 | `blog-neighbor-care` | 📝 |
| EXT-BLOG-12 | 블로그 내게시글 챗GPT 댓글공감답방(`mblc`) — 14종 05 | .NET 윈폼 + Selenium + OpenAI | 10-27 | 내 글에 반응한 사람 목록 → 그 사람 최신 글 공감 + GPT 댓글(답방) | 🔗 병합 추천 → `blog-neighbor-care` 답방 흐름 복원(플랜 2판에서 빠짐, 주인님 결정) | `blog-neighbor-care` | 📝 |
| EXT-BLOG-13 | 블로그 챗GPT 자동포스팅(`NBAP`) — 14종 06 | .NET 윈폼 + Selenium + OpenAI | 10-27 | GPT 원문(키워드·지역·상호) · 원문 폴더 + 사진 자리 표시 → 여러 계정 즉시 발행 | ❌ 핵심 기능 우리에 이미 있음 · 아이디어 1건(가게 홍보 글 모드 → `naver-blog-agent` 후보) | `naver-blog-agent`·`naver-blog-seo-studio` | 📝 |
| EXT-BLOG-14 | 블로그원문 재생성기(`botr`) — 14종 07 | .NET 윈폼 + Selenium | 10-27 | 구글 번역 화면으로 역번역해 문장 바꾸기(중복 문서 피하기용) | ❌ 제외(검색 정책·저작권, 대안: SEO 스튜디오 재작성) | — | 📝 |
| EXT-BLOG-15 | 블로그 티스토리 조회수증가(`nbpm`) — 14종 08 | .NET 윈폼 + Selenium | 10-27 | 검색 유입처럼 꾸민 반복 방문으로 조회수 올리기 | ❌ 제외(부정 트래픽 — 이전 「숫자 조작 → 진짜 지표」 결정과 같음) | — | 📝 |
| **유튜브** | | | | | | | |
| EXT-YT-01 | GitHub `nam-ai-trend/shorts-auto` 0.1.0 | Python + React 로컬 도구 | 10-22 | 레퍼런스 찾기·후킹/텐션 분석·대본 A/B·목소리 복제·단어 자막·장면 AI 영상 이어 붙이기 | 🔗 기존 병합 → `shorts-onestop-studio`(카드뉴스 부분은 인스타) | `shorts-onestop-studio` v1.41 | ✅ |
| EXT-YT-02 | 제3자 상용 「카드형 쇼츠」 설치 프로그램(이름 비공개) | NSIS 3.04 + Electron | 10-16 | 카드형 쇼츠 제작(세부는 카드 §3 — 보강 필요) | 🔗 기존 병합 → `shorts-onestop-studio` | `shorts-onestop-studio` v1.41 | ✅ |
| EXT-YT-03 | 썸네일 마스터 AI Pro | 웹앱 | 10-14 | A안(직관)/B안(호기심) 문구가 박힌 16:9 썸네일 2종 + 문장으로 수정 | 🆕 독립 새 프로그램 | `thumbnail-master` v1.20 | ✅ |
| **영상** | | | | | | | |
| EXT-MM-01 | Supertonic TTS 0.3.0(비공식 앱) | NSIS + Electron + ONNX | 10-24 | 키 없는 브라우저 음성 합성(31개 언어·목소리 10종)·여러 줄 ZIP·대화 합성·SRT | 🔗 기존 병합(공용 엔진) → `shorts-onestop-studio` 먼저 · 독립 여부 보류 | 공용 「브라우저 무료 음성」 엔진(예정) | ⏳ |
| EXT-MM-02 | Seamless Loop Studio | 웹앱 | 확인 못 함 | 시작·끝이 가장 닮은 구간을 찾아 MP4·WebM·GIF 무한 루프 | 🆕 독립 새 프로그램 | `infinite-loop-video` v1.08 | ✅ |
| **음악** | | | | | | | |
| EXT-MUS-01 | Spectrum Studio PRO(웹판 → 설치형 3.0.0) | 웹 번들 / NSIS + Electron | 10-13 · 10-24 | 플레이리스트 음악 영상: 스펙트럼 15·파티클 20·곡 제목 16스타일·배경 전환·프리셋·WebCodecs 1080p | 🆕 독립 새(`yt-playlist-studio`) → 🔗 이후 `playlist-channel-studio`에 병합 | `playlist-channel-studio` v1.31 | 🔶 |
| EXT-MUS-02 | Lyricbi 1.9.0 | NSIS + Electron + Remotion | 10-21 · 10-24 | 가사 영상: 너그러운 .srt·강조 10·노래방 로마자·LP·커버·스펙트럼 9·프리셋 51 | 🆕 독립 새 프로그램 | `lyric-video-studio` v1.10 | 🔶 |
| EXT-MUS-03 | SU-Note(Suno 프롬프트 관리) v3.6 | 웹앱 | 10-12 | Suno Style·가사 빌더, 비율·보컬·랩·편곡, 프리셋 461·댄스 200, 앨범 기획 | 🆕 독립 새(`suno-music-studio`) → 🔗 이후 `music-automation`에 병합 | `music-automation` v1.46 | 🔀 |
| EXT-MUS-04 | AI Playlist Creator | 웹앱 | 확인 못 함 | 장르 → 제목 10개 → Suno 프롬프트·가사·유튜브 메타·썸네일 | 🔗 기존 병합 → `playlist-channel-studio` | `playlist-channel-studio` v1.31 | ✅ |
| EXT-MUS-05 | GPT PARK MUSIC PLAYER | AI Studio 앱 | 10-13 | 음악 파일 재생·반복·셔플·시각화 5모드·8밴드 EQ | 🆕 독립 새 프로그램 | `music-player` v1.09 | ✅ |
| EXT-MUS-06 | GPT PARK 마스터링 스튜디오 | 웹앱 | 확인 못 함 | 음원 마스터링 처리 순서·프리셋 12종·AI 분석 | 🆕 독립 새 프로그램 | `ai-mastering-studio` v1.14 | ✅ |
| EXT-MUS-07 | 외부 음악 생성 플랫폼 조사(10곳) | 플랫폼·API 조사 | 10-23 | Lyria·ElevenLabs·fal·Replicate·Suno(중계) 등 공식 API·상업 이용 조건·단가 비교 | 🆕 독립 새 프로그램(음악 연동 기준) | `ai-music-studio` v1.14 | ✅ |
| **이미지** | | | | | | | |
| EXT-IMG-01 | ClearPic 1.3.0 | NSIS + Electron + ONNX | 10-24 | 키 없는 브라우저 지우기(LaMa)·글자 자동 찾기(PP-OCRv4)·여러 장 일괄·ZIP | 🔗 기존 병합 → `banana-canvas`(제미나이 워터마크 제거는 ❌ 제외) | `banana-canvas` v1.34 | 🔶 |
| EXT-IMG-02 | AI Studio 「Banana Canvas」 | AI Studio 앱 | 10-14 | 생성·편집·합성·배경 제거·부분 삭제·증명사진·스토리 8컷·레시피 | 🆕 독립 새 프로그램 | `banana-canvas` v1.33 | ✅ |
| EXT-IMG-03 | Cinematic Portrait Studio 2(PureGlow v2.4) | AI Studio 앱 | 10-14 | 촬영 목적 5종 프리셋 인물 사진 재생성·스튜디오 보정·여권 규격 | 🆕 독립 새 프로그램 | `portrait-photo` v1.43 | ✅ |
| EXT-IMG-04 | LookStudio AI(가상 피팅) | AI Studio 앱 | 10-13 | TPO 의상 추천·가상 피팅·내 옷장·메이크업 | 🆕 독립 새 프로그램 | `fashion-style` v1.13 | ✅ |
| EXT-IMG-05 | 4컷 만능 만화 생성기 PRO | Vite React 웹앱 | 10-14 | 주제 → 대본 → 캐릭터 시트 → 4컷, AI 말풍선 배치·편집, 저장 4종 | 🆕 독립 새 프로그램 | `four-cut-comics` v1.36 | ✅ |
| **디자인** | | | | | | | |
| EXT-MKT-01 | AI Landing Page Architect Enhance | AI Studio 앱 | 10-13 | 주제·타겟·목표 → 템플릿 20 → 기획안 JSON → 단일 HTML 프로토타입 | 🆕 독립 새 프로그램 | `landing-architect` v1.14 | ✅ |
| EXT-MM-03 | Cinematic Storyboard AI | 웹앱 | 확인 못 함 | 이미지 1장 → 키프레임 9 → 9컷 콘택트 시트 → 영상 프롬프트 | 🆕 독립 새 프로그램 | `cinematic-storyboard-studio` v1.18 | ✅ |
| EXT-TL-10 | GPT PARK의 UI 캔버스 Pro | AI Studio 앱 | 10-13 | 컴포넌트 25종 캔버스 에디터·레이어·이미지/JSON 내보내기 | 🆕 독립 새 프로그램 | `ui-canvas` v1.14 | ✅ |
| **인스타** | | | | | | | |
| EXT-INS-01 | GitHub `nam-ai-trend/15_cardnews` | Node/Express 로컬 도구 | 10-19 · 10-22 | 릴스 수집·반응도 BEST 5·받아쓰기·7대 떡상 관점 TOP 3·4~10장 가변 카드뉴스 | 🔗 기존 병합 → `cardnews-studio` → 이후 `insta_auto_poster` | `insta_auto_poster` v1.69 | ✅ |
| **업무자동화** | | | | | | | |
| EXT-TL-01 | AutoGemmaStarter 2.0.0 | Inno 6.7 + PyInstaller | 10-24 | 로컬 Gemma 설치 마법사·여러 공급자(Groq·OpenRouter 등)·커스텀 봇·RAG·프롬프트 25종 | 🔗 기존 병합 → `ai-doc-chatbot`·`ai-prompt-studio` | `ai-doc-chatbot` v1.07 · `ai-prompt-studio` v1.09 | ⏳ |
| EXT-TL-02 | 오늘의 할 일 & 성과 | AI Studio 앱 | 10-13 | 할 일·집중 타이머·성과 점수·시간대 차트·AI 분석 | 🆕 독립 새 프로그램 | `ai-task-planner` v1.10 | ✅ |
| EXT-TL-03 | 번역의 정석 | AI Studio 앱 | 10-14 | 10개 언어 번역·분야/격식/어조·용어 분석·역번역·DOCX/PDF 가져오기 | 🆕 독립 새 프로그램 | `document-translator` v1.22 | ✅ |
| EXT-TL-04 | Playful File Helper | Vite React 웹앱 | 10-14 | 엑셀 합치기·시트별 모으기·나누기, 텍스트 합치기·나누기 | 🆕 독립 새 프로그램 | `file-merge` v1.08 | ✅ |
| EXT-TL-05 | Markdown Studio | 웹앱 | 10-13 | 폴더 트리·마크다운 편집·미리보기·PDF/DOCX 내보내기·Drive 저장 | 🆕 독립 새 프로그램 | `markdown-studio` v1.21 | ✅ |
| EXT-TL-06 | 매직 에디터(Magic Editor) | AI Studio 앱 | 10-14 | 새 글 생성·드래그 툴바 부분 수정·전체 분석 제안 사이드바 | 🆕 독립 새 프로그램 | `ai-writing-editor` v1.13 | ✅ |
| EXT-TL-07 | Prompt Equalizer | 웹앱 | 확인 못 함 | 슬라이더 5개 + 페르소나로 문체 다시쓰기 | 🆕 독립 새(`persona-style-studio`) → 🔗 이후 `ai-writing-editor`에 병합 | `ai-writing-editor` v1.13 | 🔀 |
| **AI 프롬프트** | | | | | | | |
| EXT-TL-09 | Reverse Prompt Architect | 웹앱 | 10-13 | 이미지·영상·오디오 → Midjourney·Sora·Suno용 프롬프트 역설계 | 🆕 독립 새 프로그램 | `reverse-prompt` v1.14 | ✅ |
| **성격·운세** | | | | | | | |
| EXT-TL-08 | 다기능 종합 성격 진단기(배포용) | AI Studio 앱 | 10-14 | 16유형 상황별 10종 + 심리검사 6종, 로컬 점수 + AI 해석 | 🆕 독립 새 프로그램 | `personality-suite` v1.28 | ✅ |
| **부동산** | | | | | | | |
| EXT-RE-01 | 네이버 부동산 아파트 매물 수집기 Ver1.3 | PyInstaller 단일 EXE | 10-24 | 네이버 부동산 비공식 주소로 단지 매물·중개사 수집 → 엑셀, 1분 반복 | 🧭 주인님 지시(10-24): 접속 없이 지역·키워드 등록 → 무인 수집 → 파일·텔레그램·이메일, **네이버 접속은 회원 기기에서만·우리 서버 요청 0·데이터 미보관** → 플랜 3판(1단계 크롬 확장 → 2단계 PC 프로그램, 휴대폰은 받기) · ✅ 주인님 승인·구현 중(10-24~25): 0단계 사전 검증 완료(`PREVALIDATION_20261024.md`), 1단계 v1.01 운영 배포 → **v1.26(2026-10-25)**: 확장 수집 엔진·지역 감시·텔레그램/이메일/카톡·중개사 번호·통계·실거래 비교·AI 시세 요약, 준비중·공개 전(정식 공개는 주인님 결정) | `realty-listing-alert` v1.26 | 🔧 |
| EXT-RE-02 | 자동 cURL 쿠키 추출기 Ver1.3(공개용) | 크롬 확장 MV3(소스 5개, 압축) | 10-24 | 크롬 디버거로 탭 네트워크 요청을 잡아 쿠키(HttpOnly 포함)를 붙인 cURL로 복사 — EXT-RE-01에 붙여 넣는 짝 도구 | ⏸ 그대로 쓰지 않음 · **「페이지가 스스로 불러온 응답을 확장이 읽는」 방식만 EXT-RE-01 플랜 1단계 수집 방법으로 채택**, 쿠키 내보내기 ❌ | EXT-RE-01 플랜 | 📝 |

**카테고리별 건수**
| 카테고리 | 건수 | 판단 |
|---|---|---|
| 블로그 | 15 | 독립 5 · 병합 2 · 결정 대기 4(EXT-BLOG-08·09·11·12 → `blog-neighbor-care` 보강) · 제외 4(EXT-BLOG-10·13·14·15) (EXT-BLOG-07 신규 서버/DB 구현·운영SQL 검수완료, UI/AI/확장·출시 미완료) |
| 음악 | 7 | 독립 5(2개는 이후 병합) · 병합 1 · 조사 1(독립) |
| 이미지 | 5 | 독립 4 · 병합 1 |
| 업무자동화 | 7 | 독립 6(1개는 이후 병합) · 병합 1 |
| 유튜브 | 3 | 독립 1 · 병합 2 |
| 디자인 | 3 | 독립 3 |
| 영상 | 2 | 독립 1 · 병합(공용 엔진) 1 |
| 인스타 | 1 | 병합 1 |
| AI 프롬프트 | 1 | 독립 1 |
| 성격·운세 | 1 | 독립 1 |
| 부동산 | 2 | 진행 1(EXT-RE-01 → `realty-listing-alert` v1.26, 공개 전) · 보류 1(EXT-RE-02 짝 도구, 기법만 반영) |
| 쓰레드·네이버·CRM·마케팅·이커머스·데이터수집\|기획 | 0 | — |
| **합계** | **47** | 독립 27 · 병합 9 · 보류 3 · 결정 대기 4 · 제외 4 |

**제작자 계열 메모(병합·중복 판단용)**
- **GPT PARK(`gptparkai.com`, 유튜브 「AIFACT-GPTPARK」) 계열이 가장 많다.** Supertonic·AutoGemma·ClearPic·성격 진단기·키워드 파이터 A/B·뮤직 플레이어·Playful File Helper·LookStudio·랜딩 아키텍트·Reverse Prompt·썸네일 마스터·UI 캔버스·마스터링(추정)이 여기에 속한다. 이 계열은 대부분 「브라우저에 키 저장 + Gemini 직접 호출 + 월간 인증 코드」 구조라서, 우리는 늘 「서버 경유 + 회원 본인 키 + 회원 권한」으로 바꿔 만들었다.
- **`nam-ai-trend`**: shorts-auto, 15_cardnews. 라이선스 파일이 없다.
- 주소 끝이 `-99gg.vercel.app`으로 같은 것은 4컷 만화·마스터링·Spectrum 웹판이다. 같은 배포자일 가능성이 있지만 확인하지 못했다.
- 블로그 계열 Maepsi NP와 6.5.4는 글쓰기 엔진이 같은 계열로 추정된다(Maepsi 보고서).

---

## 2. 기능 묶음 지도 — 여러 원본에서 나온 비슷한 기능 (병합·공용화 기획용)

> 하나의 공용 엔진·화면으로 묶으면 여러 프로그램이 함께 좋아지는 기능들이다. 「공용 기준 코드 규칙」([SHARED_MODULES](SHARED_MODULES.md))대로 기준 하나를 만들고 사본을 쓰는 것을 전제로 한다. **묶음 자체는 아이디어이며 착수는 주인님 승인 뒤다.**

| 묶음 | 원본 근거 | 우리 쪽 현재 위치 | 공용화·병합 방향 | 상태 |
|---|---|---|---|---|
| **A. 브라우저 안 무료 AI 엔진(ONNX)** | EXT-MM-01 Supertonic(TTS 398MB), EXT-IMG-01 ClearPic(LaMa 208MB + PP-OCRv4 4.7MB) | 없음 | `onnxruntime-web` 공통 바탕(WebGPU → WASM, 모델 1회 캐시, 작업자 스레드). **COOP/COEP 머리글 시제품을 한 번만 해서 두 담당이 결과를 같이 쓴다.** 후보 모듈 `browser-free-tts`, `browser-inpaint` | ⏳ 음악 담당·이미지 담당 각각 승인 대기 |
| **B. 브라우저 MP4 렌더(WebCodecs)** | EXT-MUS-01 Spectrum(하드웨어 가속 시험·품질 프로파일·역압), EXT-MUS-02 Lyricbi(디스크 직접 쓰기), EXT-MM-02 루프, EXT-YT-01 | 공용 `browser-mp4-encoder` + 프로그램별 사용 | Spectrum P-2에서 고친 안정화를 공용 인코더 기준에 올릴지 결정 필요 | 🔶 결정 대기 |
| **C. 음악 영상 꾸밈** | Spectrum(스펙트럼 15·파티클 20·곡 제목 16스타일·배경 전환·프리셋), Lyricbi(가사 강조 10·LP·노래방 로마자·커버) | `playlist-channel-studio` `/video`, `lyric-video-studio` | 두 프로그램이 같은 꾸밈 부품(스펙트럼·파티클·곡 제목·LP)을 각자 만들지 않게 공용 그리기 모듈 후보 | 📝 아이디어 |
| **D. 블로그 글 품질** | EXT-BLOG-02 도톨이(어조 강도·전개 구조·완성 점검·근거 일치), EXT-BLOG-03 6.5.4(작성 방식 5종·점검 비율), EXT-BLOG-04 Maepsi(키워드+페르소나 자동 추천) | SEO 스튜디오 v2.18, `blog-content-maker`, 에이전트 | [블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md) 기준 코드로 정리 | 🔶 |
| **E. 키워드 발굴** | 도톨이(골드/실버/브론즈 등급·주제 판정 선행·벤치마킹 새 글만), 키워드 파이터 A/B(자동완성 ㄱ~ㅎ·PAA·경쟁력) | `blog-keyword` v1.09 | 남은 것: 통합 키워드 보관함(N10), 실제 검색 화면 상위 5(확장, N13) | 🔶 |
| **F. 블로그 편집기 입력·발행** | Maepsi(클립보드 붙여넣기·구간 확인·임시저장 결과 판정), 6.5.4(webview 입력) | 에이전트 확장, `blog-content-maker` 확장 | 회원이 고르는 빠른 입력 모드(§20 ① 예외), 발행 방식 회원 선택(§20 ④) — 지침 반영됨 | 🔶 E-2 보류·E-5 대기 |
| **G. 여러 AI 공급자·커스텀 봇** | EXT-TL-01 AutoGemma(Groq·OpenRouter·NVIDIA·Cloudflare·Ollama·봇), EXT-MUS-03 SU-Note(3사 공급자), EXT-TL-07 Prompt Equalizer(페르소나) | 문서 챗봇(Upstage 하나), AI Prompt(Gemini 하나) | 공용 「OpenAI 호환 공급자 호출」 기준 코드 + 공용 키 항목(`integration_catalog`) | ⏳ |
| **H. 리메이크(떡상 콘텐츠 분석 → 재제작)** | EXT-YT-01 shorts-auto(후킹·텐션 곡선·장면 영상 이어 붙이기·목소리 복제), EXT-INS-01 15_cardnews(7관점 TOP 3·가변 장수), EXT-YT-02 카드형 쇼츠 | 쇼츠 원스톱, `shorts-viral-studio`, 인스타 | 대본 A/B를 viral → 원스톱으로 넘기는 기능 확인 필요 | 🔶 |
| **I. 이미지 편집 공방** | EXT-IMG-02 Banana Canvas, EXT-IMG-01 ClearPic, EXT-IMG-03 증명·프로필 사진, EXT-IMG-04 가상 피팅 | `banana-canvas`, `portrait-photo`, `fashion-style` | 무료 지우기(A 묶음)를 공용으로 → 상세페이지·썸네일·카드뉴스에 사본 | ⏳ |
| **J. 문서·업무 도구** | EXT-TL-02~06(할 일·번역·파일 합치기·마크다운·글 편집) | 각각 독립 프로그램 | 「문서 워크스페이스」로 묶을지는 미검토(지금은 서로 다른 일이라 독립 유지가 맞다는 판단이 각 플랜에 있음) | 📝 아이디어 |
| **K. 부동산 데이터** | EXT-RE-01 매물 수집기(현재 호가) | `real_estate_sales`(공공 실거래만) | 위험 없는 바로가기·엑셀만. 현재 매물 읽기는 법률 확인 전 보류 | 📝 |
| **L. 음성·음악 생성 연동** | EXT-MUS-07 플랫폼 조사, EXT-MM-01 Supertonic | `ai-music-studio`(음악 연동 기준), 영상 프로그램별 TTS | 유료 TTS는 각 프로그램, 무료 TTS는 A 묶음 | 🔶 |

---

## 3. 카테고리별 상세 카드

> 아래 절 제목(3-1~3-9)은 처음 작성 때의 분류다. 2026-10-24 카테고리 정리 뒤의 소속은 §1 총괄표를 따른다(멀티미디어 → 영상·디자인, Tools → 업무자동화·디자인·AI 프롬프트·성격·운세, 마케팅의 랜딩 → 디자인).

### 3-1. 블로그

#### EXT-BLOG-01 도톨이 AI v1.2 (이전 버전)
| 항목 | 내용 |
|---|---|
| 원본 | Inno Setup 6.7.0 설치 파일(PE32 x86) 안에 PyInstaller 묶음 · 410,114,288바이트 · SHA-256 `952ea901` · 위치 `D:\PDS`(해제본 `D:\PDS\blog_workroom_reference\` 1.1GB) · 제작자는 문서에 없음(공용 문서에서 「도톨이」로 부름, 폴더 문서에서는 주인님 지시로 원본 이름 삭제) |
| 분석 | 2026-10-15 · 맥미니 Claude Code가 시작(innoextract 1.9가 Inno 6.7을 못 풀어 막힘) → 윈도우 보조 계정 세션이 `innounp` 2.70.1로 해제, 직접 쓴 PyInstaller 해제 스크립트로 모듈 목록·문구·외부 주소만 추출 · EXE 실행 안 함 · 권리: 주인님 확인 「권리 없음 — 기능만 참고」, 코드·프롬프트·`knowledge.json`(1.9MB, RuleCard 1,660개)·아이콘·이름 사용 안 함 |
| 원본 기능 | 내 블로그 스타일 진단(최신 5/10/20/30개 글 → 문체 분석) · 키워드 탐색(카테고리 3·세부 주제 5 → 검색량·문서수 → 골드키워드 등급 → 보관) · 직접 키워드 분석 · 트렌드 관측(뉴스 10 + 웹 10 요약, 최근 3일 평균이 직전 7일보다 50%↑면 급상승) · 블로그 벤치마킹·관찰 목록 · 글 작성 준비(실제 검색 상위 5개 본문 → 근거 확인 → 승인) · 구간별 초안(이어쓰기·중지·재개) · 최종 검수(문체·사실·민감 표현) → 최종본 · 이미지(대표 1 + 본문 5~10 노드, 참고 이미지 10장·참고 사이트 5개, 유사 이미지 찾기) · 사용량·백업·자동 업데이트·공지 |
| 원본 기술 | Python 3.12, PySide6(Qt, 내장 Chromium), PyInstaller, Inno Setup 6.7 · AI는 ChatGPT 구독을 Codex CLI 로그인(`openai-codex` 0.156)으로 사용 · 네이버 검색광고 API, NAVER API HUB(ncloud), RSS, 실제 검색 화면 · Kiwi 형태소, SQLite, Windows 자격 증명 관리자, GitHub + TUF 업데이트, 앱 모듈 약 170개 |
| 원본 비용 구조 | 앱 무료 · 회원의 ChatGPT 구독·본인 네이버 키 |
| 우리 대상 | **`blog-workroom`(AI 블로그 작업실 자동화) v1.14를 새로 만듦** · https://blog-workroom.buylife.xyz · AI는 OpenAI·Gemini 중 선택 · 블로그 통합에서 「SEO 스튜디오로 이관 대상」 |
| 보강한 점 | 회원 본인 OpenAI/Gemini·네이버 키, 공용 Supabase·RLS, 단계별 API(60초 안)로 이어하기, 근거 구절 실제 일치 검사·원문 25자 연속 일치 제외, 검수한 글의 해시가 맞아야 최종본 저장, 30일 자동 삭제(v1.12), 연도 주입 · 작성 원칙은 네이버 서치어드바이저 공개 가이드로 새로 씀 |
| 못 옮긴 것 | 유사 이미지 찾기, 참고 사이트 주소 읽기, 노드별 참고 이미지, 캔버스 끌기 화면, 사용량 통계, 형태소 분석 → v1.3 분석(EXT-BLOG-02)에서 SEO 스튜디오·`blog-keyword`로 재배치 |
| 하지 않기로 한 것 | 실제 검색 화면 스크래핑(검색 API 정확도순 + 「실제 순위와 다를 수 있음」 고지로 대체), ChatGPT 구독 로그인(웹 서버에서 회원 PC CLI 실행 불가), 자동 업데이트·백업 화면, `knowledge.json` |
| 결정 | 새 프로그램으로 개발(2026-10-15) → 이후 블로그 통합에서 SEO 스튜디오로 이관 예정 |
| 진행 상태 | ✅ v1.14 운영. 남은 문서 정리: `blog-workroom/AGENTS.md` 본문의 「v1.06」 표기 수정 |
| 관련 문서 | `docs/HANDOFF_BLOG_WORKROOM_REFERENCE_2026-10-15.md`, `docs/BLOG_WORKROOM_REFERENCE_ANALYSIS.md`, `blog-workroom/AGENTS.md`, `docs/PROGRAM_CAPABILITY_MAP.md` 40번 |

#### EXT-BLOG-02 도톨이 AI v1.3
| 항목 | 내용 |
|---|---|
| 원본 | Inno Setup 6.7 설치 파일 안에 PyInstaller 6.22(Python 3.12 + PySide6/Qt), 윈도우·맥 설치형 · SHA-256 `968c317d`(GitHub 최신 릴리스와 일치) · `D:\PDS\Program_dev\DotoliAI-1.3-setup.exe` · GitHub `daraming92/dotori_ai`(앱 소스 비공개, 무료 + 후원·유료 컨설팅 안내) |
| 분석 | 2026-10-24 · Claude Code(윈도우) `claude-win-dotori` · innounp 2.71 → pyinstxtractor(Python 3.12) → `blog_ai_poc` 229개 모듈에서 함수·클래스 이름·문구·주소만 `marshal`로 추출(디컴파일 안 함) · 권리: 기능만 참고, 코드·지시문·RuleCard 1,660개·이름·아이콘·후원 안내 사용 안 함 |
| 원본 기능 | **연결 설정**: GPT·Claude 연결 시험, 네이버 API 2종 확인, 진단창(429·할당량 구분) · **내 블로그 스타일**: RSS와 공개 본문 최대 30개 → 32분류·8축×2 묶음·80개 점검 항목을 AI가 0~4로 관찰, 점수는 코드가 계산, 근거는 원문에 정확히 있는 문장만(없으면 「판단 보류」), 작성에는 어조·어투만 전달 · **키워드**: 카테고리 3·세부 주제 5, 2경로(안정형·급상승), AI 주제 판정을 수치 조회 전에(6시간 재사용), 등급 골드 문서수÷검색량 <0.5 / 실버 0.5~1 / 브론즈 1~3, 최대 10분 연속 탐색 · **트렌드**: 24시간 뉴스 15 + 웹 5, 데이터랩 14일 기준 최근 3일 평균이 직전 7일보다 +50% · **벤치마킹**: 최근 7일 관련 글을 쓴 계정만 최대 7차 검색, 저장 계정은 새 글만 분석 · **작성 준비**: 내장 Chromium으로 자동완성·「함께 많이 찾는」, 실제 블로그 탭 상위 1~5를 사용자가 대조, Kiwi 형태소 · **작업실**: 어조 강도 0/50/100%, 전개 구조 8종, 경험 창작형 모드, 참고 링크 읽기(웹·PDF·유튜브 공개 자막·6만 자), 이전 글과 비교해 목차 재설계, 원클릭 완성 점검(개인화·차별화·SEO·GEO) + 자동 보완 1회 · 최종 검수 6영역, 모바일 미리보기(15/19px), 리치 서식 복사 · 이미지 캔버스(대표 1 + 본문 5~10 노드, 노드별 참고 10장, 유사 이미지) · 화면 캡처, AI 사용량 통계, DB 백업·복구, TUF 서명 자동 업데이트, AI 작업 동시 2개, 체크포인트 이어하기 |
| 원본 기술 | ChatGPT 구독 로그인(내장 Codex CLI 0.156 + `openai_codex` SDK), Claude Code CLI(선택) — API 키 방식이 아님 · 이미지는 Codex 내장 도구 · 네이버 검색광고 API, NAVER API HUB(블로그·뉴스·웹·이미지·데이터랩·쇼핑인사이트), RSS, 내장 Chromium으로 네이버 검색 화면(비로그인) · 로컬 SQLite(`%LOCALAPPDATA%\BlogAI`), 키는 OS 보안 저장소 · 자동 발행 없음 |
| 원본 비용 구조 | 앱 무료 · 회원의 ChatGPT·Claude 구독과 본인 네이버 키 |
| 우리 대상 | 기능 축이 거의 같음: `blog-workroom` v1.14 · 함께 비교: `naver-blog-seo-studio`(당시 v2.15), `blog-keyword` v1.05, `competitor-analysis` v1.08, `naver-blog-agent` v2.18, `blog-content-maker` v1.04 · **블로그 6개 모두 없던 것**: 어조 강도·전개 구조·유튜브 자막·「함께 많이 찾는」·유사 이미지(코드 검색 0건) · 검토 중 새 사실: 작업실의 「제안 반영」 버튼이 SEO 이관 때 빠짐 / BLOG·티스토리는 유튜브를 회원 Gemini로 읽힘 / 모바일 미리보기는 SEO에 이미 있음 |
| 뽑아낸 기능 | N1 스타일 레이더(코드 점수·근거 일치, 상) · N2 어조 강도(상) · N3 전개 구조 8종(상) · N4 원클릭 완성 점검 + 보완 1회(상) · N5 이전 글 비교(중) · N6 참고 링크 읽기 웹·PDF·자막(상) · N7 경험 창작형(중) · N8 벤치마킹 새 글만(중) · N9 주제 판정 선행(중) · N10 통합 키워드 보관함(하) · N11 모바일 미리보기 공용화(중) · N12 이미지 캔버스 고도화(중) · N13 실제 검색 화면 상위 5 확장(중) · N14 Kiwi 형태소(LGPL 확인 필요, 하) · N15 오류 단계 구분·이어하기(중) · N16 AI 사용량 통계(하) · **SEO 스튜디오 묶음** D-1 어조 강도 3단계(기본 「균형」 = 기존 지시문) · D-2 전개 구조 8가지 + 기본(`lib/narrativeStructure.ts`) · D-3 검수 지적 반영(정확히 한 번만 있는 문장만) → 수정본 이력 → 재검수 1회 비교 + 검수 2영역(검색 의도·답변 명료성) + 지적별 반영 버튼 · D-4 PDF(`unpdf`)·유튜브(회원 Gemini 영상 읽기)·원문 붙여넣기, 공용 `safe-fetch` 사본 · 아이디어 표 IDEA-DOTORI-01~04 = D-1~D-4, 05 이전 글 비교·경험 창작형·스타일 점수, 06 `blog-keyword`의 N8·N9, 07 확장이 실제 검색 상위 5 읽기 |
| 하지 않기로 한 것 | ChatGPT·Claude CLI 연결(웹 서버가 회원 PC CLI 실행 불가) · RuleCard 1,660개(원본 비공개 지식) · 화면 캡처·TUF 업데이트·로컬 백업(데스크톱 전용) · 후원 안내 · 작업실(`blog-workroom`)에 넣기(이관 예정) · N7 경험 창작형은 블로그 담당이 「보류 추천」(회원 신뢰·플랫폼 정책 위험) |
| 결정 | 2026-10-24 주인님 「진행해」: 글쓰기 → SEO 스튜디오, 벤치마킹 새 글만·주제 판정 → `blog-keyword`, 실제 검색 상위 5 → 확장 쪽 별도 |
| 진행 상태 | 블로그 담당 `claude-win-20261024-blog3`: D-1~D-4 **v2.17 배포** → 실제 검수 수정분 **v2.18 배포** · N8·N9 `blog-keyword` v1.08 반영 → **v1.09 배포** · 미착수: IDEA-DOTORI-05·07, N10~N16 |
| 남은 결정 | 2차 범위(이전 글 비교·스타일 점수·이미지 노드 참고), N7 진행 여부, N13 확장 작업 여부 |
| 관련 문서 | `docs/analysis-dotori-v13-20261024/REPORT.md`, `naver-blog-seo-studio/docs/PLAN_20261024_DOTORI_D1_D4.md`, `naver-blog-seo-studio/docs/IMPROVEMENT_HANDOFF_20261024_DOTORI.md`, `blog-keyword/AGENTS.md`(v1.08·v1.09), `docs/PROGRAM_IDEA_BACKLOG.md` IDEA-DOTORI-01~07 |

#### EXT-BLOG-03 블로그 원고 제작 설치형 앱 6.5.4 (원본 이름 비공개)
| 항목 | 내용 |
|---|---|
| 원본 | NSIS 3 Unicode → `app-64.7z` → Electron ASAR · 설치 파일 85,406,489 bytes, SHA-256 `46c81fdf`, 서명 없음 · ASAR 37,302,712 bytes `52c05d91`(546항목), 앱 번들 `d3790b13`, 메인 CJS `931f34b4` · 분석 자료 `D:/PDS/analysis/naver-blog-seo-6.5.4-20261015/` · 제작자 문서에 없음 |
| 분석 | 2026-10-15(첫 커밋 `067fcfdff`) · 작성 CLI는 문서에 없음, v1.01~v1.03 검수는 Codex · 7-Zip → ASAR 추출 → REA(자원 61항목·IPC 26개, 부분) → TypeScript 문법 분석기로 정돈해 읽기 · 설치·실행·API 호출·라이선스 우회 안 함 · 권리: 코드·가이드 전문·프롬프트·아이콘·홍보 문구·이름·로컬 인증·업데이트 처리 안 옮김 |
| 원본 기능 | 원고 흐름 3가지(주제 기반 / 기존 글 다듬기 TXT·HTML·MD / 제목 추천) · 제목 추천 대분류 13 + 하위 → 제목 10개 · 작성 방식 5종(정보·검색 의도·구조화 답변·경험 이야기·차별화 관점), 문체·FAQ·경험 입력 · 점검(제목 길이·분량·미디어·태그·표·FAQ, 점수 = 통과 수/전체 × 100) · 단어 빈도 상위 20, 검색 그라운딩 출처 모아 중복 제거 · 이미지 1~10장 생성·제품 사진 합성, 1:1·16:9, ALT·영문 지시문 · 영상용 첫·끝 장면 이미지 준비(영상 API 호출은 확인 안 됨) · SNS 문구(Threads·X·Facebook), 서식 유지 복사 · 네이버 전달(Electron webview·클립보드로 제목·본문·이미지) · 설정(모델·키·검색 옵션·진단 로그) |
| 원본 기술 | Electron, React 19.2 계열, Google GenAI SDK 2.16 계열, Gemini 텍스트·이미지 + 검색 그라운딩 |
| 원본 비용 구조 | 회원 Gemini 키(판매 방식은 문서에 없음) |
| 우리 대상 | **`blog-content-maker`(AI 블로그 콘텐츠 제작 자동화) v1.11 새로 만듦**(비교표는 v1.10) · https://blog-content-maker.buylife.xyz · 웹 + 전용 확장(`extension/`, v1.11 자동 연결) · 같은 계열 엔진을 SEO 스튜디오 v1.74에도 흡수 |
| 보강한 점 | 원문 보존·수정본 이력·고친 뒤 점검 재계산 · 실제 저장된 이미지 파일 대조 · 사실·체험은 회원 확인, 출처 없는 사실은 「확인 필요」 · 회원 본인 Gemini/OpenAI 키, 비공개 Storage·RLS, 30일 보관 · 검색은 근거 조사와 JSON 구성 2단계(v1.02) · 확장으로 실제 네이버 편집기 입력·중복 방지 검수 완료 |
| 못 옮긴 것 | 티스토리·워드프레스 직접 발행, 이미지 글자 배지 도구, 표는 행별 텍스트로만 들어감 |
| 하지 않기로 한 것 | 점검 비율을 네이버 점수처럼 표시(공식 평가 아님) · 가상의 1인칭 경험 생성(후기 오인 위험) · 고정 연도·가격 상수, 숨은 유료 진단 호출 · 원본 인증·업데이트, 외부 SNS 게시 API(SNS는 복사만) |
| 결정 | 새 프로그램 + SEO 스튜디오 흡수 |
| 진행 상태 | ✅ v1.11 운영 |
| 관련 문서 | `blog-content-maker/docs/REFERENCE_ANALYSIS.md`, `VERIFICATION.md`, `CATALOG_REGISTRATION.md`, `blog-content-maker/AGENTS.md`, `docs/PROGRAM_CAPABILITY_MAP.md` 41번, `docs/HANDOFF_CLAUDE_SESSION_2026-10-16_ACCOUNT2.md` |

#### EXT-BLOG-04 Maepsi NP 1.0.11
| 항목 | 내용 |
|---|---|
| 원본 | NSIS 3 → `app-64.7z` → Electron(`app.asar`), 윈도우 x64, 빌드 2026-10-09 · 113.9MB, SHA-256 `93def4c2` · `D:\PDS\Program_dev\Maepsi-NP-Setup-1.0.11-x64.exe` · 제작자 문서에 없음, 라이선스 확인 코드 못 찾음(무료 배포 추정, 미확인) |
| 분석 | 2026-10-24 · `claude-win-dotori` · 7-Zip + `npx @electron/asar extract`, 메인 `electron/*.cjs` 13개(약 3,600줄)는 압축 안 된 원본이라 직접 읽음, React 화면 묶음은 문구만 · 권리: 기능만(코드·`original-prompt.cjs`·문구·이름 사용 안 함) · EXT-BLOG-03과 같은 글쓰기 엔진 계열로 추정 |
| 원본 기능 | 앱 안 네이버 브라우저(webview, 로그인 유지 세션 `persist:mapsi-np-naver`) · 설정: Gemini 키 1개(`safeStorage` 암호화), 블로그 ID · 주제만 입력 → 핵심 키워드 1 + 보조 3~5 + 화자 페르소나 자동 추천(교체 가능) · 원고 Gemini + Google 검색 근거, 출처 기록 · 이미지 0~10장(1장째 대표), 한국어 설명 → 영어 프롬프트 · 중지 후 이어서 · 편집기 입력: 클립보드 붙여넣기(제목 텍스트 → 문단 묶음 HTML → 이미지 PNG) · 안전장치: 빈 편집기 확인, 재입력 금지, 구간마다 확인(제목·본문 끝 70자·이미지 수 +1), 클립보드 지문 대조·복구, 최종 대조, 안내창 감지 시 중단 · 옮긴 뒤 임시저장/예약/즉시발행 자동 클릭 → 완료 문구·예약 건수로 결과 판정, 애매하면 「확인 필요」 · 작업 기록, HTML 내보내기, 서버·통계 전송 없음 |
| 원본 기술 | Electron 메인 `.cjs`(`main`·`gemini`·`naver`·`naver-dialogs`·`post-action`·`store`) · `gemini-2.5-flash`, `gemini-3.1-flash-image`, `googleSearch` 도구 · 외부 서버 없음 |
| 원본 비용 구조 | 회원 본인 Gemini 키, 판매 방식 미확인 |
| 우리 대상 | 병합 대상 `naver-blog-agent`(당시 v2.18) · 함께 비교: SEO 스튜디오 v2.16, `ai-auto-blog` v1.64, 데스크톱 `naver-blog-auto-poster` · 겹침: 원고·이미지·편집기 입력·예약·발행 대부분 · 없던 것: 한 화면 간편 모드, 클립보드 붙여넣기 입력, 임시저장 결과 판정 · 입력 검증(E-1)은 이미 구현돼 있었음 |
| 뽑아낸 기능 | 분석 단계 M1 간편 모드(상) · M2 입력 검증(상) · M3 결과 판정(중) · M4 붙여넣기 입력(주인님 결정) · M5 Gemini 검색 근거(중) · M6 클립보드 지문(M4에 따라감) · **플랜(모두 에이전트)** E-1 입력 검증 강화 · E-2 회원 선택 빠른 입력 · E-3 간편 모드 `/quick` · E-4 간편 모드 무료 입구(에이전트 권한 **또는** BLOG FREE 권한) · E-5 발행 방식 선택(직접 / 자동 임시저장 `draft` / 자동 발행) · IDEA-MAEPSI-01~06 |
| 하지 않기로 한 것 | Electron·앱 안 브라우저·로컬 저장 · 「AI 탐지 회피」식 지시문(권리 없음 + 품질·신뢰 원칙 위배) · 원본 이미지 프롬프트(프로그램마다 고유) · Gemini 하나만 지원하는 구조(우리는 3사 중 선택) |
| 결정 | 2026-10-24 주인님: 독립 개발 안 함 → 에이전트에 병합 · 붙여넣기 = (다) 회원이 고르는 빠른 입력 모드 → [PLATFORM_PATTERNS](PLATFORM_PATTERNS.md) §20 ①에 예외 반영 · 간편 모드를 무료 입구로 쓰고 이를 바탕으로 BLOG 정리 · 발행 방식은 회원 선택 → §20 ④ 개정, [블로그 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md) 반영 · 이후 E-2 보류(「E-2 보류, 묶음 C로」), 「E-3 먼저, E-4·E-5 별도」 |
| 진행 상태 | 블로그 담당 `claude-win-20261024-blog3`: E-1 이미 있음 · E-2 보류 · E-3 **v2.19 배포** · E-4 **v2.20 배포** · E-5 미착수 · 미배포 대기 `7ec53853f`(간편 결과 미리보기 소제목) · BLOG 정리(이동 안내·비공개·FREE 배지 이전)는 E-4 운영 확인 뒤 별도 |
| 남은 결정 | E-5 착수 승인, E-2 재개(시제품·`chrome.debugger` 권한 문제), BLOG(`ai-auto-blog`) 정리 시점, M5 |
| 관련 문서 | `docs/analysis-maepsi-np-20261024/REPORT.md`, `naver-blog-agent/docs/PLAN_20261024_MAEPSI_E1_E4.md`, `naver-blog-agent/docs/IMPROVEMENT_HANDOFF_20261024_MAEPSI.md`, `naver-blog-agent/docs/IMPROVEMENTS.md`, IDEA-MAEPSI-01~06 |

#### EXT-BLOG-05 키워드 파이터 for Gemini (네이버 API 버전) = 앱 A
| 항목 | 내용 |
|---|---|
| 원본 | Google AI Studio 앱 + Express 서버, 소스 약 190KB(컴포넌트 26개) · `aistudio.google.com/apps/63da7702-8c0d-478f-83df-8e10f510f347` · AIFACT GPT-PARK |
| 분석 | 2026-10-14 · CLI 문서에 없음 · 주인님 승인 후 로그인 Chrome의 코드 보기로 소스 전체 읽음, 앱 조작·AI 호출 안 함 |
| 원본 기능 | 자동완성(Google·Naver, 네이버는 「키워드+ㄱ~ㅎ」 15회) · AI 연관검색어·PAA·콘텐츠 갭 + SERP 전략 리포트 · 공식 Naver 검색 API로 상위 블로그 → 1위 공략 제안 · 키워드 경쟁력 점수(0~100, AI 추정) · 오늘의 전략 키워드, 다각도 주제 발굴 · Naver 뉴스 API 기반 전략 · creator-advisor 카테고리 트렌드(프록시 긁기, 로그인 벽으로 대부분 실패) · 프롬프트 라이브러리 50개, 트렌드 링크 9개 · 네이버 키를 localStorage에 base64로 저장 |
| 원본 기술 | AI Studio(Gemini), Express 프록시, Naver 검색·뉴스 API |
| 우리 대상 | **`blog-keyword` v1.09 새로 만듦**(플랜 당시 이름 `keyword-fighter`), 앱 B와 합집합 |
| 보강한 점 | 트렌드 긁기를 공식 데이터랩 검색어 트렌드 API로 교체 · 「AI 추정」 배지, 검색광고 키가 있으면 실측 월간 검색수 · 기록 100건·즐겨찾기·Markdown/CSV 내보내기 · 키는 `user_api_keys`, JSON 검증 후 1회 재시도 · 날씨 호출 제거, 당해 연도·날짜 주입 · 프롬프트는 앱 A 기준으로 통일(문장은 새로 씀) |
| 하지 않기로 한 것 | 코드·UI 문구·크레딧·채널 링크 복제 |
| 결정·상태 | ✅ 운영. 이후 도톨이 N8·N9가 v1.08~v1.09에 추가됨(EXT-BLOG-02) |
| 관련 문서 | `blog-keyword/docs/DEVELOPMENT_PLAN.md`, `blog-keyword/AGENTS.md` |

#### EXT-BLOG-06 키워드 파이터 for Gemini = 앱 B
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱(서버 없음), 소스 약 150KB(컴포넌트 21개) · `aistudio.google.com/apps/drive/1svIdLUbvazDZlgpKMYae0pMQFvm7wHr6` · AIFACT GPT-PARK |
| 분석 | 앱 A와 같음(2026-10-14, 소스 전체 열람) |
| 원본 기능 | 기능 7종(자동완성·SERP·상위 블로그·경쟁력·오늘 키워드·주제 발굴·프롬프트 라이브러리) · 상위 블로그는 search.naver.com HTML 긁기 · 공개 CORS 프록시 3종(corsproxy.io·allorigins·thingproxy) 의존 · 네이버 키 없이도 대부분 사용 · 상세 매뉴얼 11KB |
| 우리 대상 | `blog-keyword` v1.09(앱 A와 합쳐 만듦) |
| 가져온 것 | 「Naver 키는 선택」 정책(키 없이 5개 기능), 단순한 구성과 도움말 정리 방식 |
| 보강한 점 | 공개 CORS 프록시·HTML 긁기를 없애고 서버 경유 + 공식 API |
| 결정·상태 | ✅ 운영 |
| 관련 문서 | `blog-keyword/docs/DEVELOPMENT_PLAN.md` |

#### EXT-BLOG-07 서이추&스댓공 Ai자동화 Ver3.5(공개용)

> **읽기설치본후속(2026-10-27):** 회원·공용계정/기기연결·본인글1개확인후전달·ZIP 로컬준비, 단위54/SQL16/HTTP23·타입/빌드통과([인계](../blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261027_READER_EXTENSION.md)). 운영reader4표/프로그램등록/배포/설치·AI/자동소통은미완료.

> **GUI읽기후속(2026-10-27 01:08):** 본인글목록/본문표시·이웃새글·관리표관계라벨의Edge실제페이지확인([근거](../blog-neighbor-care/docs/evidence/readcheck-20261027.json)). 자동추출/정독/반복자동읽기허용·쓰기·출시와구분.

> **2026-10-27 후속:** 회원제공자료 사전선별API 구현·단위31/HTTP12·타입/빌드통과, [결과](../blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261027_MATERIAL_PREVIEW.md). 외부수집/AI/계정·관계확인/출시 미완료.

> **서버/DB1단계(2026-10-26):** [신규폴더/소스·로컬48검수](../blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md) 완료, 운영SQL 적용·6표RLS/서비스RPC/runtime=false 읽기검수완료·미배포. API14/실제PG28/실제HTTP6, 실제SSO/네이버/확장검수는별도. 프로그램등록/정책허용/AI/UI/30일정리미완료.


> **모의검수(2026-10-26):** [후보사전필터·상태모델32개 통과](analysis-naver-blog-neighbor-20261024/SIMULATION_VERIFICATION_20261026.md). 가상100건 중30예약/70제한, 이웃일일슬롯·성공불명/선점세대 확인. 단일프로세스 모델이며 실제DB/RLS/확장/네이버 미검수. 운영프로그램 미구현·원래40개출시검수 미완료 유지.


> **0-B 확인(2026-10-26):** [시험회원 본인키 API HUB200·3개](analysis-naver-blog-neighbor-20261024/PREVALIDATION_20261026_0B_SEARCH_ACCOUNT_ACCESS.md), 구경로401·024. 검색/계정/응답범위 확인 완료, 신규발급HUB·이관유예/한도표현 보완. 프로그램 구현/본문·관계·쓰기 실검수는 미완료. 검색2회·AI/빌드/배포0.


> **2026-10-26 0-A 진행:** 주인님 「진행하도록 해」로 [상세 명세](analysis-naver-blog-neighbor-20261024/SPEC_20261026_BLOG_NEIGHBOR_CARE_0A.md)·[검수표](analysis-naver-blog-neighbor-20261024/TEST_MATRIX_20261026_BLOG_NEIGHBOR_CARE_0A.md) 작성. 상태/계정·기기 선점/원자적 상한/후속답글 제한/성공불명/30일/예약복구/예산을 구체화. 문서 단계 완료이며 구현·정책 허용 확보·네이버 실동작 검수·운영 등록·배포는 미완료입니다.

> **2026-10-26 최신 검토 [역할: blog, Codex]:** [검토·CLI 인수인계](analysis-naver-blog-neighbor-20261024/REVIEW_20261026_BLOG_NEIGHBOR_CARE.md)·[공식 근거](analysis-naver-blog-neighbor-20261024/OFFICIAL_REFERENCE_CHECK_20261026.md). D1~D9/새 독립 기본 프로그램 방향 유지, 구현 미착수. 아래 10-24 결정 기록의 ‘플랫폼 최대치’는 네이버 공인 안전 한도가 아닌 앱 자체 최대·기본값20/100/30으로 구분합니다. 정책 허용 범위·후속 답글과 하루1개 제한 충돌·다중기기/성공불명·보관/예약/비용 명세 보완 추천. 현재 블로그 인수는 `codex-win-20261025-blog`, 과거 담당·판단 기록은 보존.
| 항목 | 내용 |
|---|---|
| 원본 | 크롬 확장 MV3 소스(압축 한 줄) — `background.js` 20KB·`content.js` 42KB·`popup.js` 68KB·`popup.html` 64KB 외 · `D:\PDS\Program_dev\7) 서이추&스댓공 Ai자동화_Ver3.5(공개용)\` · EXT-RE-01·02와 같은 제작자·같은 Google Apps Script(`mode=sdaetgong`) · manifest가 부르는 `content2.js`·`comment-scraper.js`는 공개본에 없음 |
| 분석 | 2026-10-24 · `claude-win-dotori` · 화면 글자 추출 + 외부 주소·크롬 API 목록 + 핵심 함수 정적 읽기(설치·실행 안 함) · 권리: 기능만 |
| 원본 기능 | 네이버 자동 로그인(아이디·비밀번호 저장, 여러 계정) · 서로이웃 자동 신청(키워드 검색·최대 수·메시지, `BuddyAddForm.naver` 팝업) · 스댓공(이웃 새글 피드·주소·키워드·ID 목록·답방 — 공감·AI 댓글) · 댓글 ID 수집 · 대댓글(AI 문맥, 비밀) · 이웃 그룹·「나만 추가한 이웃」 정리 · 예약(`chrome.alarms` HH:MM) · 선택자 직접 지정 · 체류 기본 600초(유료 해제) · Gemini 여러 키 돌려쓰기 |
| 숨은 동작 | **무료판 월 1회 제작자가 정한 게시물에 회원 계정으로 공감·댓글 강제** · 회원 IP·사용 허가 패스워드를 제작자 서버로 전송(`log_visit`) · 네이버 비밀번호 저장·스크립트 입력 · 응답 XOR 열쇠 코드 노출 · IP 차단 |
| 우리 대상 | 없음 — 네이버 블로그 소통(이웃·공감·댓글) 도구는 플랫폼에 없음(프로그램 비교표 확인). 비슷한 패턴: `instagram-comment-reply`·`threads-comment-reply`·`youtube-auto-reply`의 「AI 초안 → 검토 → 게시」 |
| 뽑아낸 기능 | NB1 내 글 댓글 AI 대댓글(확인 후 등록) · NB2 답방 도우미 · NB3 이웃 새글 공감·AI 댓글(확인 후, 하루 상한) · NB4 이웃 정리 · NB5 선택자 규칙 원격 갱신 · NB6 예약은 초안 준비까지 |
| 하지 않기로 한 것 | 키워드로 모르는 블로그 대량 서이추·댓글 무인 등록(네이버 스팸·제한·저품질, 제3자 스팸 — 주인님 결정 시에만) · 비밀번호 저장·자동 로그인 · 숨은 강제 홍보 작업 · IP·패스워드 전송 · 키 돌려쓰기 · 댓글 ID 대량 수집 · `insertText` 한 번 붙여넣기(§20 미달) |
| 결정 | 📝 주인님 방향(2026-10-24): **맞는 블로그만 골라 이웃 신청이 먼저 → 이웃 새 글 정기 공감 → 글 정독 분석 → AI 티 안 나는 사람 같은 댓글 · 회원이 AI 모델 선택** → 플랜 2판(「사람 느낌」 의견 §6 포함). 결정 완료: 하루 상한(플랫폼 최대이자 기본값 신청 20·공감 100·댓글 30, 회원이 그 안에서 설정) · 안전 장치 3개(이웃당 댓글 하루 1개·제한 안내 시 즉시 멈춤·비밀번호 저장/링크 댓글 금지) · 등록 방식(회원 선택, 첫 2주 확인 후) · 이름 「AI 블로그 이웃 소통 자동화」 `blog-neighbor-care` · 구현 담당: 블로그 역할 `claude-win-20261024-blog3`(2026-10-24 지정), 인수인계 `docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md` |
| 관련 문서 | `docs/analysis-naver-blog-neighbor-20261024/REPORT.md`, 플랜 `docs/analysis-naver-blog-neighbor-20261024/PLAN_20261024_BLOG_NEIGHBOR_CARE.md` |

#### EXT-BLOG-08 블로그 주소추출(`nbae`) — 마케팅자동화 14종 01
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium · 폴더 29MB(앱 코드 약 1,900줄) · `nbae.exe` SHA-256 `530133f6` · `D:\PDS\Program_dev\OLD\마케팅자동화14종\01블로그 주소추출(nbae)` · 제작사 배포 서버 `andonga`(대리점 판매 구조) |
| 분석 | 2026-10-27 · Claude Code `claude-win-20261027-analysis` · ILSpy 9.1 구조 복원(실행 안 함) · 상용 — 기능만 참고 |
| 원본 기능 | 키워드별 네이버 블로그 검색(최신순) 스크롤 → 글 주소 목록 TXT · 글 1개의 공감 목록·댓글 목록 → 공감·댓글 단 블로거 주소 목록 TXT(02 서로이웃·03 댓글공감용 대상 목록 도구) |
| 원본 기술 | Selenium ChromeDriver(화면 크롬·숨은 크롬), CSS 선택자, 제작사 TLS 소켓 로그인(1분 생존 확인·자동 업데이트), 제작사 MySQL 계정 내장, `userinfo` 평문 계정 저장 |
| 원본 비용 구조 | 제작사 라이선스(기간 만료형) |
| 우리 대상 | `blog-neighbor-care` v1.01(미배포) — 단계 2 키워드 후보 찾기는 플랜만 있음, **글별 공감·댓글 블로거 후보는 우리 어디에도 없음**(소스 검색 0건) |
| 뽑아낸 기능 | 1. 후보 출처 「참고 글의 공감·댓글 블로거」 → `blog-neighbor-care` 단계 2(맞춤 점수 거친 뒤 회원이 선택) · 중 |
| 하지 않기로 한 것 | 점수 없는 일괄 수집·일괄 신청 · 숨은 크롬 · 무한 재시도 · 평문 계정 저장·제작사 서버 인증 · TXT 주소만 저장 |
| 결정 | 🔗 기존 병합 추천(독립 ❌) — **EXT-BLOG-07 「댓글 ID 대량 수집 ❌」과 겹치므로 주인님 결정 대기** |
| 진행 상태 | 📝 분석만(2026-10-27) |
| 남은 결정 | 참고 글 공감·댓글 블로거를 후보 출처로 넣을지 |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §0·§1 |

#### EXT-BLOG-09 블로그 서로이웃(`nbbb`) — 14종 02
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium · `nbbb.exe` SHA-256 `35f3c1b9` · 앱 코드 약 2,250줄 · 같은 제작사 |
| 분석 | 2026-10-27 · `claude-win-20261027-analysis` · ILSpy 구조 복원(실행 안 함) · 기능만 참고 |
| 원본 기능 | 주소 목록에 서로이웃 신청(모든 블로그에 같은 문구) · 오늘 방문자 수 범위 밖 블로그 건너뜀 · 결과 구분(신청 완료/서로이웃 안 받음/진행 중/이미 이웃/실패) · 여러 계정·비밀번호 자동 로그인 |
| 우리 대상 | `blog-neighbor-care` 플랜 단계 3(맞춤 신청 문구·상태 관리)이 같은 일을 하고 더 앞섬 |
| 뽑아낸 기능 | 1. 방문자 수 범위 조건(「블로그 규모」를 숫자로) · 중 2. 신청 결과 상태 구분으로 재신청 막기 · 중 |
| 하지 않기로 한 것 | 비밀번호 자동 로그인 · 같은 문구 일괄 신청 · 여러 계정·접속 위치 바꿔 제한 피하기 · 숨은 크롬 |
| 결정 | 🔗 병합 추천(독립 ❌) |
| 진행 상태 | 📝 분석만(2026-10-27) |
| 남은 결정 | 두 보강을 플랜에 넣을지 |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §2 |

#### EXT-BLOG-10 블로그 댓글공감(`nbcl`) — 14종 03
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium · `nbcl.exe` SHA-256 `e26f1b3e` · 앱 코드 약 2,180줄 · 같은 제작사 |
| 원본 기능 | 글 목록마다 공감 + 같은 댓글(AI 없음), 내 닉네임 댓글 있으면 건너뜀 |
| 우리 대상 | `blog-neighbor-care` 플랜 단계 4에 모두 있고 더 앞섬 |
| 뽑아낸 기능 | 없음 |
| 하지 않기로 한 것 | 같은 댓글 반복 · 한 번에 붙여넣기 입력 · 비밀번호 자동 로그인 · 제한 안내 뒤 계속 진행 |
| 결정 | ❌ 가져올 것 없음 |
| 진행 상태 | 📝 검토 완료(2026-10-27) |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §3 |

#### EXT-BLOG-11 블로그 내이웃글 챗GPT 댓글공감(`nbnl`) — 14종 04
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium + `OpenAI_API` · `NBNL.exe` SHA-256 `9e98b591` · 앱 코드 약 1,700줄 · 배포 폴더에 `apikey` 파일 동봉(열지 않음) |
| 원본 기능 | 회원 계정 1개로 로그인 → 「내 이웃 새 글 목록」 → 이웃 최신 글 공감 + 댓글(고정 또는 `gpt-3.5-turbo-16k`, 지시문 한 줄), 중복 건너뛰기, 고정 대기 |
| 우리 대상 | `blog-neighbor-care` 단계 4가 같은 일(정독·회원 말투·모델 선택으로 더 앞섬). 단, 프로그램 전부터 있던 이웃을 대상에 넣는지 플랜에 불분명 |
| 뽑아낸 기능 | 1. 기존 이웃 가져오기(처음 연결 때 내 이웃 목록을 읽어 이웃별로 소통 대상 켜고 끔) · 상 |
| 하지 않기로 한 것 | 비밀번호 자동 로그인 · 고정 대기 · 본문 문단만 읽는 얕은 분석 · 구형 모델 고정 · 키 평문 파일 저장 |
| 결정 | 🔗 작은 보강 추천(독립 ❌) |
| 진행 상태 | 📝 분석만(2026-10-27) |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §4 |

#### EXT-BLOG-12 블로그 내게시글 챗GPT 댓글공감답방(`mblc`) — 14종 05
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium + `OpenAI_API` · `MBLC.exe` SHA-256 `50ef3aff` · 앱 코드 약 1,740줄 |
| 원본 기능 | 내 글에 공감·댓글 단 사람 목록(TXT, 01에서 만듦) → 그 사람 최신 글 공감 + GPT 댓글(답방), 범위 지정 |
| 우리 대상 | 서이추 1차 분석의 NB2 「답방 도우미」(✅ 추천)가 `blog-neighbor-care` 플랜 2판에서 빠짐(검색 0건). NB1 AI 대댓글도 같이 빠짐 |
| 뽑아낸 기능 | 1. 답방 흐름 복원: 내 글 반응자 → 답방 후보 → 정독 AI 댓글 초안 → 회원 확인 후 등록 · 상 |
| 하지 않기로 한 것 | 비밀번호 자동 로그인 · TXT 수동 불러오기 · 확인 없는 자동 등록 기본값 · 지시문 한 줄 댓글 |
| 결정 | 🔗 병합 추천(독립 ❌) — 플랜 2판에서 빠진 이유가 확인되지 않아 **주인님 결정 대기** |
| 진행 상태 | 📝 분석만(2026-10-27) |
| 남은 결정 | 답방(NB2)·AI 대댓글(NB1)을 플랜에 다시 넣을지 |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §5 |

#### EXT-BLOG-13 블로그 챗GPT 자동포스팅(`NBAP`) — 14종 06
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium + OpenAI · `Nbap.exe` SHA-256 `9773e66f` · 앱 코드 약 2,820줄 · 동봉 `api_key`·`naverid.txt` 열지 않음 |
| 원본 기능 | GPT 원문 화면(키워드·지역·상호 이름·제목·추가 지시, 다른 블로그 글 다시 쓰기, 금칙어 검사, 글자수) · 원문 TXT + 사진 폴더 → 사진 자리 표시마다 사진 → 여러 계정 즉시 발행(결과 주소 기록 없음) |
| 우리 대상 | `naver-blog-agent`(5단계 AI)·`naver-blog-seo-studio`(근거·재작성·검수)·확장 자동 입력·발행 방식 3종 — 모두 앞섬 |
| 뽑아낸 기능 | 아이디어만: 가게 홍보 글 모드(상호·지역·대표 서비스 입력 틀) → 아이디어 표 후보, 기준 앱 `naver-blog-agent` |
| 하지 않기로 한 것 | 여러 계정 발행·접속 위치 변경 · 비밀번호 자동 로그인 · 남의 블로그 글 다시 쓰기 · 즉시 발행만 · 구형 모델 고정 |
| 결정 | ❌ 독립·병합할 핵심 기능 없음 |
| 진행 상태 | 📝 검토 완료(2026-10-27) |
| 남은 결정 | 가게 홍보 글 모드를 아이디어 표에 올릴지 |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §6 |

#### EXT-BLOG-14 블로그원문 재생성기(`botr`) — 14종 07
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium · `botr.exe` SHA-256 `039d88e4` · 앱 코드 약 1,410줄 |
| 원본 기능 | 원문 TXT를 구글 번역 웹 화면으로 한국어 → 외국어 10개 중 하나 → 한국어 역번역해 문장 바꾸기, 결과 폴더 저장 |
| 우리 대상 | 다른 목적의 기능만 있음 — SEO 스튜디오 재작성(내 글 개선), `document-translator` 역번역(품질 확인) |
| 뽑아낸 기능 | 없음 |
| 하지 않기로 한 것 | 중복 문서 피하기용 문장 돌리기 · 번역 웹 화면 자동 조작 |
| 결정 | ❌ 제외 |
| 진행 상태 | 📝 검토 완료(2026-10-27) |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §7 |

#### EXT-BLOG-15 블로그 티스토리 조회수증가(`nbpm`) — 14종 08
| 항목 | 내용 |
|---|---|
| 원본 | .NET 4.8 윈폼 + Selenium · `NBPM.exe` SHA-256 `2149abc7` · 앱 코드 약 1,820줄 · 화면 구성·목적만 확인 |
| 원본 기능 | 대상 주소·검색 키워드·수량·머무는 시간으로 인위적 방문을 반복해 조회수 올리기 |
| 우리 대상 | 없음(만들지 않음). 대안 방향은 회원 본인 블로그 진짜 통계 보기(별도 검토) |
| 하지 않기로 한 것 | 부정 트래픽 전부 |
| 결정 | ❌ 제외 — 이커머스 묶음 `channelup` 「숫자 조작 → 진짜 지표 보기」 주인님 결정과 같은 경우 |
| 진행 상태 | 📝 검토 완료(2026-10-27) |
| 관련 문서 | `docs/analysis-marketing14-20261027/REPORT.md` §8 |

### 3-2. 유튜브

#### EXT-YT-01 GitHub `nam-ai-trend/shorts-auto` 0.1.0
| 항목 | 내용 |
|---|---|
| 원본 | Python + React 로컬 도구, 커밋 `5ebd3dda`(2026-10-20) · https://github.com/nam-ai-trend/shorts-auto · 설치 위치 `D:\PDS\Program_dev\shorts-auto`(저장소 밖) · 작성자 nam-ai-trend, **라이선스 파일 없음**(모든 권리가 작성자), 참고 영상 유튜브 `KR3t_vMePn8`(Higgsfield 협찬) |
| 분석 | 2026-10-22 · Claude Code(윈도우), 기준 HEAD `becbae10` · 실제 설치(pnpm 332개, Python은 `uv run --python 3.12`), pytest 164/167(3개는 맥 경로 문제), vitest 17/17, 빌드 성공, 로컬 화면 확인 · 유료 API 0회 · 권리: 코드·프롬프트 안 옮기고 기능만 |
| 원본 기능 | 레퍼런스 찾기(YouTube Data API, 조회수÷구독자 정렬) · `yt-dlp` 음성 → Whisper 받아쓰기 · `gpt-4.1-mini` 분석(첫 3초 후킹·텐션 곡선·리메이크 주제 5개) · 대본 A(상식파괴형)·B(스토리텔링형) + 제목 3개 · Qwen3-TTS 목소리 복제 → ffmpeg 1.2배속 · Whisper 단어 시간 → 자막 표기 교정·4~8장면 · 장면 AI 동영상(Higgsfield CLI, Kling O3 첫·끝 프레임, **앞 장면 끝 프레임을 다음 장면 첫 프레임으로 이어 붙임**) · Remotion 합성(제목 카드·자막·BGM), 업로드 없음 |
| 원본 기술 | Python(FastAPI 계열·pydantic), React/Vite, Remotion, ffmpeg, yt-dlp, OpenAI(Whisper·GPT-4.1-mini·Vision), Higgsfield CLI(Kling·Seedance·Minimax), Qwen3-TTS Gradio |
| 우리 대상 | 새 프로그램 0개 · **묶음 ① → `shorts-onestop-studio` v1.41**: v1.23 장면 AI 동영상(Gemini Omni 기본, fal·Replicate 선택, 단가 표시), v1.26 ElevenLabs 본인 목소리 복제, v1.27 단어 단위 자막 · ①-보조 `shorts-viral-studio` v1.16(앞 4단계는 viral이 더 나아서 제외) · 묶음 ②는 EXT-INS-01 |
| 보강한 점 | 로컬 CLI·GPU 서버 대신 회원 본인 키 API, Remotion·ffmpeg 대신 기존 브라우저 MP4, 기존 업로드·예약 유지, 원본 다운로드 대신 Gemini가 영상을 직접 분석 |
| 못 옮긴 것 | 대본 A/B를 viral → 원스톱으로 넘기는 기능(반영 기록 못 찾음), v1.23 시점 「MP4에 AI 영상 포함」 실측, `auto-shorts-posting` 목소리 복제(검토 단계) |
| 하지 않기로 한 것 | 독립 프로그램(주인님 확정) · `yt-dlp` 원본 다운로드(약관 위험) · `setup:higgsfield-mcp`(다른 CLI 설정 파일을 고침) · 로컬 `.env` 키 · 원본 결함 기록: 윈도우에서 `pnpm dev` 안 됨, MCP 서버 파일이 저장소에 없음 |
| 결정·상태 | ✅ 첫 묶음 흡수 완료(2026-10-22 주인님 확정) |
| 관련 문서 | `docs/analysis-shorts-auto-20261022/REPORT.md`, `shorts-onestop-studio/docs/PLAN_20261022_AI_VIDEO_SCENES.md`, `shorts-onestop-studio/AGENTS.md`(v1.23·v1.26·v1.27), IDEA-SHORTS-AUTO-01 |

#### EXT-YT-02 제3자 상용 「카드형 쇼츠」 설치 프로그램 (원본 이름 비공개)
| 항목 | 내용 |
|---|---|
| 원본 | NSIS 3.04 + Electron, 월 인증 코드 방식 · 원본 이름은 쓰지 않기로 함 |
| 분석 | 2026-10-16 · Claude Code(메인 계정·윈도우) · Detect It Easy → 7-Zip → asar 추출 → 정적 읽기, 내장 설명서 21장 추출 |
| 원본 기능 | 주제 하나 → AI 대본(인트로·카드 3~8장·아웃트로) → 배경(스톡 영상·이미지 / AI 이미지 / 움직이는 배경 12종) → 내레이션·단어 단위 자막 → 배경음악 → 1080×1920·30fps MP4(20~60초) · 카테고리 22종·톤 5×포맷 5 · 텍스트 AI 8곳 한도 초과 시 자동 전환 · 테마 색 15·카드 레이아웃 약 21종 · 캐릭터 일관성 · 음성 길이에 장면 길이 자동 맞춤 · 렌더 큐 · SEO 메타 자동 · 발행 계획(채널 6단계×날짜별 일정) · 일괄 생성 |
| 가져온 것 | 기능 흐름(주제→대본→배경→음성·자막→음악→렌더), 단어 단위 자막 싱크·음성 길이 맞춤, 공급자 자동 전환, 발행 계획+일괄 생성, 캐릭터 일관성, 카테고리별 사용자 지침 |
| 보강한 점 | 윈도우 설치형 → 웹(어디서나 로그인) · PC에만 두던 키 → 공용 `user_api_keys` · 로컬 폴더 결과 → 회원별 보관함 · 비공식 무료 음성 → 공식 API 우선 |
| 못 옮긴 것·하지 않은 것 | 월 인증 코드, 로컬 파이썬 음성 엔진 자동 설치, 비공식 무료 음성(기본값), 원본 묶음 글꼴(공식 배포처에서 따로 받음), 자극형 카테고리는 주인님 결정 사항(근거 문서 §7) |
| 우리 대상 | `shorts-onestop-studio` v1.41 |
| 하지 않기로 한 것 | 원본 코드·디자인·문구·이름(핵심 원칙 21) |
| 관련 문서 | `docs/CARD_SHORTS_REFERENCE_ANALYSIS.md` |

#### EXT-YT-03 썸네일 마스터 AI Pro
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `youtube-thumbnail-master-ai-pro.vercel.app` · GPT PARK |
| 분석 | 2026-10-14 · 번들 450KB 정독 |
| 원본 기능 | A안(직관)/B안(호기심) 문구와 이미지 프롬프트 → 문구가 박힌 16:9 썸네일 2종 동시 생성 → 문장으로 수정 요청 |
| 우리 대상 | **`thumbnail-master` v1.20 새로 만듦** · `seo-thumbnail-pro`와 일부 겹치지만 별도 개발 |
| 관련 문서 | `thumbnail-master/docs/DEVELOPMENT_PLAN.md` |

### 3-3. 음악

#### EXT-MUS-01 Spectrum Studio PRO (웹판 → 설치형 3.0.0)
| 항목 | 내용 |
|---|---|
| 원본 | **웹판**: `you-tube-music-playlist-maker-pro-99gg.vercel.app`, 메인 번들 `index-B_kIgFH1.js` 459KB(사본 `scratch/yt_playlist_maker/`, 저장소 미추적) · **설치형 3.0.0**: NSIS 3 → Electron `app.asar`, 빌드 2026-08-09, 128.7MB, SHA-256 `bfdf9487`, `D:\PDS\Program_dev\Spectrum Studio PRO-Setup-3.0.0.exe` · 자동 업데이트 저장소 GitHub `muzbox1973/studio_pro_ex`(상용) |
| 분석 | **2026-10-13 Antigravity**: 웹판 「전수 역분석」. 당시 기록에 「주파수 반응 수식·10종 스펙트럼·14종 파티클·WebCodecs + mp4-muxer 파이프라인 100% 추출 이식」이라고 적힘(원기록은 `.git/handoff_mine.md` 9341~9347줄 사본) · **2026-10-24 `claude-win-dotori`**: 3.0.0 정적 분석(7-Zip·`@electron/asar`, `electron/*.cjs` 약 870줄 읽기, 화면 묶음 565KB·인코더 작업자 284KB에서 문구 1,255개·기능 이름만) · **2026-10-24 음악 담당 `claude-win-20261024-music` 권리 점검**: 웹판에서 옮겼던 우리 코드 중 `canvas-visualizer.ts`(12조각 일치율 40.7%)·`particle-system.ts`(28.2%)는 **원본 코드를 옮긴 파생**으로 판정(핵심 원칙 21 위반), 나머지 5개 파일은 우리 코드 → 이후 「기능만 참고」 |
| 원본 기능(3.0.0) | 월간 인증 코드(4자리)·인터넷 시간 확인·72시간/오프라인 7일·종료일 2028-01-01 · 플레이리스트, 곡별 .srt 자동 연결(CP949 판별), 반복 1~3회 · 배경 이미지 여러 장 / 영상 최대 4 / 단색 / 그라디언트 10 / 애니메이션 배경 12종 · 로고(배경 제거·입체 그림자), 스티커 최대 5 · 오디오 96/128/192kbps, 1080p · 스펙트럼 15종, 컬러 팔레트 6, 효과 4, 필터 8, 배경 트랜지션 5(곡별·시간 간격), 후처리 7, 파티클 20종(흐름·트레일·부스터) · 곡 제목 자동 표시 16스타일·14폰트·9분할 위치·2~15초 · 장르 프리셋 9 + 가져오기/내보내기 · 성능 자동 모드(무거운 효과 3개 이상이면 경감) · WebCodecs + Worker + OffscreenCanvas, H.264/AAC, 품질 프로파일 3(10/8/6Mbps), 하드웨어 가속 시험 → 소프트웨어 자동 대체, 역압 제어, 화면 꺼짐 방지 · 유튜브 챕터 자동 생성 |
| 원본 기술 | 웹판: Vite·Canvas·WebCodecs(VideoEncoder + AudioEncoder)·mp4-muxer · 3.0.0: Electron + React, Web Worker·OffscreenCanvas, 백그라운드 감속 해제, 모든 처리 PC 안 |
| 원본 비용 구조 | 상용, 월간 인증 코드 |
| 우리 대상 | 2026-10-13 웹판으로 **`yt-playlist-studio` v1.01 새로 만듦** → 2026-10-20 **`playlist-channel-studio`(YOUTUBE 플레이리스트 자동화)에 병합**(yt는 노출 중지·`AIMaster_backup/retired-programs/` 백업) · 현재 `playlist-channel-studio` v1.31, https://playlist-maker.buylife.xyz, `/video` · 우리만 있는 것: 제목·Suno 프롬프트·가사·썸네일 기획, AI 배경, 세로 9:16, 유튜브 바로 올리기, 곡별 가사 층, 실제 소리 FFT 스펙트럼(v1.18) |
| 뽑아낸 기능 | 분석 단계 S1 곡 제목(상) · S2 인코딩 안정화 — 공용 `browser-mp4-encoder` 후보(상) · S3 프리셋(중) · S4 스펙트럼 추가(중) · S5 파티클 확장(중) · S6 애니메이션 배경·트랜지션(중) · S7 성능 자동 모드(중) · S8 스티커·로고(하) · S9 렌더 진단(하) · **플랜** P-0 원본 파생 2파일을 우리 방식으로 새로 쓰기 · P-1 곡 제목 · P-2 인코딩 안정화 · P-3 배경 여러 장 전환 · P-4 AI 없는 합성 배경 · P-5 내 설정·장르 프리셋 · P-6 확장 묶음(스펙트럼 2~4종 추가·팔레트 모드·파티클 흐름/트레일·자동 경감·스티커) · IDEA-SPECTRUM-01~05 |
| 하지 않기로 한 것 | Electron·자동 업데이트 · 월간 인증 코드·시간 확인 · 개발자 도구 차단 · 원본 수식·프리셋 값·문구 |
| 결정 | 독립 개발 안 함 → `playlist-channel-studio` 병합 · 구현은 음악 담당(주인님 지시) · 권리 재확인 「이것부터 먼저 해」 → P-0 추가 · P-0~P-5 승인 |
| 진행 상태 | 음악 담당: **v1.29** P-0·P-1·P-2 · **v1.30** P-3·P-4·P-5(세로 1080×1920 확인, 시험 28 통과) · **v1.31** 영상(MP4) 배경 미표시 수정 · P-6 대기(실제 속도를 보고 범위 결정) · P-2 개선의 공용 인코더 반영은 미진행 |
| 남은 결정 | P-6 범위, P-2를 공용 `browser-mp4-encoder`에 반영할지, 저장소 밖 `scratch/yt_playlist_maker/`(원본 번들) 정리 |
| 교훈 | **「100% 추출 이식」 방식은 권리 위반이 된다.** 웹 번들을 분석할 때도 기능·동작만 기록하고 코드는 새로 쓴다([분석 지침](PROGRAM_ANALYSIS_PLANNING_GUIDE.md) §2-1 3번) |
| 관련 문서 | `docs/analysis-spectrum-studio-pro-20261024/REPORT.md`, `RIGHTS_CHECK_20261024.md`, `playlist-channel-studio/docs/PLAN_20261024_SPECTRUM_P1_P6.md`, `IMPROVEMENT_HANDOFF_20261024_SPECTRUM.md`, `PLAN_20261020_MERGE_E_PLAYLIST_VIDEO.md`, `docs/MUSIC_OWNER_QUEUE_20261024.md`, `yt-playlist-studio/AGENTS.md`, IDEA-SPECTRUM-01~05 |

#### EXT-MUS-02 Lyricbi(리릭비) 1.9.0
| 항목 | 내용 |
|---|---|
| 원본 | NSIS → Electron(`app.asar` 90MB) + 앱 안 Express 서버 + React 19 + Remotion 4.0.506, `UNLICENSED`(비공개 상용) · 157,251,071B, SHA-256 `3d85e4f7` · `D:\PDS\Program_dev\Lyricbi-Setup-1.9.0.exe`(이전 데모판 `_작업완료\Lyricbi-DEMO-Setup-1.5.0.exe`) · 제작자 문서에 없음 |
| 분석 | 1차 2026-10-21 Claude Code(윈도우), 근거 JSON `evidence/lyricbi-static-analysis.json` · 재확인 2026-10-24 `claude-win-dotori`(해시가 같아 새로 풀지 않고 현재 코드와 대조) · 권리: 기능만, 한국어 → 영어 검색어 사전·프리셋 이름도 그대로 안 씀 |
| 원본 기능 | 단일 곡 / 플레이리스트(폴더의 같은 이름 mp3·srt·jpg 자동 짝짓기) · 너그러운 .srt 읽기(형식 오류도 읽음, 간주 감지, 실패 곡 ⚠) · 프리셋 가로 28 + 세로 8 + 낱개 15 · 현재 줄 강조 10종 · 노래방 2종 + 한글 로마자 발음 표기(규칙 변환, AI 아님) · 커버 패널(테두리 9·그림자 5), LP 회전, 스펙트럼 9종·색 8, 진행 바, 앰비언트 12, 외곽 6, 24·30·60fps · 한글 서체 15~16종, 굵기 7, 항목별 색·외곽선·글로우 · 플레이리스트 전용 앨범 카드 5종·트랙 번호·유튜브 챕터 복사 · 로고·채널 프레임 · Pexels 배경(한국어 → 영어 사전 약 90개) · 렌더 2가지(Remotion 서버 / WebCodecs 고속, 디스크 직접 쓰기) · 환경 진단·7일 로그 |
| 원본 기술 | Electron, Express(`127.0.0.1`), React 19(Vite), Remotion 4.0.506, `mp4-muxer`·`mediabunny`, `multer`, `zod` · AI 없음, 외부는 Pexels(회원 키)·Google Fonts·시간 확인뿐 |
| 원본 비용 구조 | 월간 인증 코드(4자리, PBKDF2·AES-GCM `license.dat`), 인터넷 시간 6곳 확인, 72시간·오프라인 7일, 종료일 2028-01-01 |
| 우리 대상 | 2026-10-21 결정으로 **「AI 가사영상 자동화」 `lyric-video-studio` 새로 만듦** v1.01 → 현재 v1.10 · 가져온 것: 4단계 흐름, 너그러운 자막 읽기, 프리셋(가로 6·세로 4), 강조 7종, 서체 6종, 스펙트럼 4종, 브라우저 MP4(30분까지), 파일로 바로 저장 · 우리만: 탭 싱크와 파형 위 끌어 맞추기, Suno·AI 음악 스튜디오(Lyria) 곡 + 시간 가사 자동, 가로·세로, 보관함 30일, 유튜브 올리기(채널 선택·썸네일) · 10-21 비교한 7개: `playlist-channel-studio`, `music-automation`, `vinyl-lp-studio`, `music-video-studio`, `ai-audio-analyzer`, `music-player`, `suno-music-studio` |
| 뽑아낸 기능 | 남은 것 R1 로마자 · R2 LP · R3 플레이리스트 · R4 Pexels · R5 로고·프레임 · R6 프리셋 수 · R7 강조 +3 · R8 스펙트럼 +6 · R9 글꼴 · R10 fps 선택(확인 필요) · R11 진단 · **플랜** L-1 노래방 로마자(`src/lib/romanize.ts`, 국립국어원 표기법으로 새로 작성) · L-2 LP판 회전(`drawVinyl`, 시간 기준) · L-3 무료 사진 배경(공용 `free-photo-search` 사본, 회원 Pixabay·Pexels 무료 키) · L-4 꾸밈 확장 · L-5 렌더 진단 기록 · 함께 내보낼 대기: `?remix=` 리믹스 받기 · IDEA-LYRIC-01 |
| 하지 않기로 한 것 | 플레이리스트 모드(R3 — `playlist-channel-studio` 가사 층 v1.17이 이미 함) · 로고·프레임(낮은 우선) · 월간 인증 코드 · Remotion(라이선스·서버 렌더 문제) |
| 결정 | 2026-10-21 주인님: 새 프로그램, 이름 「AI 가사영상 자동화」, 권한 부여 방식, 2차에 SUNO 곡 카드 링크 · 2026-10-24: 새 분석 불필요, 이 프로그램에서 이어 개발, 구현은 음악 담당 |
| 진행 상태 | ✅ v1.10 운영 · L-1~L-5 플랜만, **승인 전**(음악 담당 대기 목록 2번), 배포 2회 예정(L-1·L-2 + `?remix=` / L-3~L-5) |
| 남은 결정 | L-1~L-5 범위·순서·빌드 2회 승인, R6~R11 추가 여부 |
| 관련 문서 | `docs/analysis-lyricbi-20261021/REPORT.md`, `RECHECK_20261024.md`, `evidence/lyricbi-static-analysis.json`, `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md`, `IMPROVEMENT_HANDOFF_20261024_LYRICBI_RECHECK.md`, `lyric-video-studio/AGENTS.md`, `docs/MUSIC_OWNER_QUEUE_20261024.md` §2 |

#### EXT-MUS-03 SU-Note (Suno 프롬프트 관리) v3.6
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 https://suno-prompt-manager-six.vercel.app/ · 화면 v3.6, 공개 자산 쿼리 v371, `app.js`·`ai.js`·`crypto.js` · 화면 배지 648 태그·867 템플릿·200 댄스·460 프리셋(실측 461 = 스타일 템플릿 261 + 아티스트 참고 200) · 제작자 문서에 없음 |
| 분석 | 2026-10-12 · Codex · 1차 공개 HTML·JS 읽기, 2차 Playwright로 실제 Chrome 엔진에서 모든 옵션 조작(프리셋 로드 861회, 태그 441회 등), AI·검색·음악 제작 호출 안 함 · 원자료 `D:/PDS/suno-comparison-20261012/` · 권리: 완성 Style 문장·가사 골격 전문·AI 프롬프트·실행 코드·브랜드·다크 테마·브라우저 키 보관함 안 옮김, 공개 선택 메타데이터(이름·시대·그룹·BPM)만 |
| 원본 기능 | 빌더(장르·무드·악기 태그 → Style·Lyrics) · 비율(한·영 언어·비유·랩 0~100%) · 보컬 11, 랩 가수 9, 편곡 8, 제목 언어 5 · 분류 3·시대 13·스타일 그룹 243·프리셋 461 · 댄스 200(12계열·BPM 범위 7) · 가사 구간 버튼 18 · 앨범 12곡 기획(흐름 6종) · 검색(데이터 필터·AI/웹), JSON 백업, Suno 창 열기·복사 |
| 원본 기술 | 정적 JS, 브라우저에서 Claude(`claude-sonnet-4-6`·`claude-haiku-4-5-20251001`)·OpenAI(`gpt-5.4-mini`·`gpt-4.1-mini`)·Gemini(`gemini-3.5-flash`·`gemini-2.5-flash`) 직접 호출, 키는 localStorage |
| 우리 대상 | `suno-music-studio`(Suno 음악기획 자동화) v1.13 새로 만듦 → **2026-10-21 `music-automation`(음악(SUNO)자동화, v1.46)에 병합, 노출 중지** |
| 보강한 점 | 서버에서 공급사 호출·권한·본인 키 확인 · 출력 검증 후 적용, 선택한 필드만 병합(제목·가사 보존) · 랩 0%면 자동 제외 문구도 제거(원본 버그 수정) · 200~320 BPM 필터, Style ASCII 정규화 · 회원별 저장, 이전 JSON 호환 병합 |
| 못 옮긴 것 | 공급사 실시간 웹 검색 · 실제 사용 추가 검수 6개 대기(`suno-music-studio/docs/WAITING_CHECKS.md`) |
| 하지 않기로 한 것 | 인명 모방 지시, 원본 문장 복제, 원본 가격·추천 배지, 모델·키 자동 폴백, Suno 자동 붙여넣기(출처 보안 제한) |
| 관련 문서 | `suno-music-studio/docs/ANALYSIS_AND_PLAN.md`, `ORIGINAL_OPTIONS_COMPARISON.md`, `RELEASE_V1_03.md`, `WAITING_CHECKS.md`, `docs/analysis-music-consolidation-20261021/REPORT.md` |

#### EXT-MUS-04 AI Playlist Creator
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `ai-playlist-creator-bice.vercel.app` |
| 분석 | 2026-10-13 · Claude Code(Sonnet 5.5, 첫 커밋 공동 작성자 기준) — 신규 구축 커밋 v1.02, 같은 날 v1.03에서 장르 23개(+Pop·Study·Workout·Meditation)로 확장 |
| 원본 기능 | 장르 → 제목 10개 → Suno 프롬프트·가사·유튜브 메타·썸네일 |
| 우리 대상 | `playlist-channel-studio` 코드 v1.31(AGENTS.md 표는 v1.26) |
| 가져온 것 | 흐름·옵션, 장르(Pop·Study·Workout·Meditation, v1.03) |
| 하지 않기로 한 것 | 프롬프트·문구 복제(새로 씀), 제작자 크레딧 |
| 관련 문서 | `playlist-channel-studio/AGENTS.md` |

#### EXT-MUS-05 GPT PARK MUSIC PLAYER
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱, React 19 + Vite 6, 소스 6개 파일 약 44KB, AI·네트워크 저장 없음 · 소스 ZIP을 주인님 승인 후 `D:\PDS\music-player-source`에 받음 · GPT PARK |
| 분석 | 2026-10-13 · ZIP 전수 정독, 실행 안 함(운영 미리보기 초기 화면만) · v1.05 안정화는 Codex(윈도우) 2026-10-16 |
| 원본 기능 | 파일 추가, 파일명 「아티스트 - 제목」 분리 · 재생·이전/다음·시크·볼륨, 반복 3단·셔플 · 검색·정렬·다중 선택 삭제 · Web Audio 시각화 5모드 · 8밴드 EQ, 프리셋 5 · 고정 950×720 다크, 저장 없음 |
| 우리 대상 | **`music-player` 새로 만듦**, 코드 v1.09(AGENTS.md 표는 v1.07) |
| 보강한 점 | 회원별 IndexedDB 저장·복원 · ID3 태그·내장 커버(원본은 무작위 사진) · AudioContext 소스 1회 생성(원본 오류 위험 해소) · 보이는 순서 기준 이전/다음, 셔플 중복 없음 · 시간축 파형 정확 구현 · 드래그&드롭·음소거·재생 속도·단축키·반응형 · v1.05 CP949 한글 태그 복구 |
| 하지 않기로 한 것 | 오디오 서버 업로드(운영 비용·저작권), AI, 「GPT PARK」 브랜딩 |
| 관련 문서 | `music-player/docs/DEVELOPMENT_PLAN.md`, `IMPROVEMENT_HANDOFF_20261016.md`, `music-player/AGENTS.md` |

#### EXT-MUS-06 GPT PARK 마스터링 스튜디오
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `gpt-park-mastering-studio-99gg.vercel.app` · GPT PARK로 추정 · 출처 기록은 옛 배포 사본 `.vercel/compat-deploy/fa57714d/ai-mastering-studio/.../AGENTS.md`에 있고 현재 AGENTS.md에서는 확인 못 함 |
| 분석 | 2026-10-13 · Claude Code(Sonnet 5.5, 첫 커밋 공동 작성자 기준) · 번들 전체 분석(처리 순서·프리셋 12종 값·AI 스키마 참고) |
| 원본 기능 | WAV/MP3 일괄 업로드 → 브라우저에서 EQ·새추레이션·컴프레서·스테레오 폭·룩어헤드 리미터 체인으로 마스터링 · 사운드 프로필 12종(범용·스트리밍 -14 LUFS·클럽 펀치·선명한 보컬·팟캐스트·빈티지·테이프·어쿠스틱·와이드·시네마틱·락 등) · 자연어로 파라미터를 제안하는 AI 로직 생성기 · 일괄 처리·ZIP(우리 `ai-mastering-studio/AGENTS.md` §2 기능과 대조) |
| 우리 대상 | **`ai-mastering-studio` v1.14 새로 만듦** |
| 하지 않기로 한 것 | 문구·구현 복제(새로 씀), 제작자 크레딧, 브라우저 base64 키 저장 |
| 보강한 점 | 회원 본인 Gemini/OpenAI/Claude 키(원본은 브라우저 base64 저장), LUFS·True Peak 미터, 내 PC 저장(MP3·AAC·FLAC·WAV24, v1.14) |

#### EXT-MUS-07 외부 음악 생성 플랫폼 조사 (상용 프로그램 분석 아님)
| 항목 | 내용 |
|---|---|
| 조사 | 2026-10-23 · Claude Code(윈도우) · 가격은 공식 페이지 확인분(✅)과 제3자 자료(△) 구분 |
| 결과물 | **`ai-music-studio` v1.14 새로 만듦 — 음악 모델 연동의 기준 프로그램**(이미지의 `ai-image-studio`와 같은 역할) · `music/`(음악(SUNO)자동화)은 Suno 전용 독립 유지 · 가져온 우리 코드: `ai-image-studio`의 공급자·모델 등록 구조, `music/`의 sunoapi.org 어댑터 · 보강: 여러 모델 동시 생성 비교, 생성 전 예상 비용, 상업 이용 조건 표시 |
| 관련 문서 | `docs/analysis-music-studio-20261023/PLAN.md`(출처 링크 포함), `BGM_SHARED_PLAN.md` |

| 플랫폼 | 공식 API | 상업 이용 조건 | 판정 |
|---|---|---|---|
| Google Lyria(Gemini API, `lyria-3.5`·`lyria-3-clip-preview`·RealTime) | ✅ | 유료 API 출력, SynthID 워터마크 | 1차 채택 · ✅ 풀곡 $0.08 / 30초 $0.04, 무료 등급 없음 |
| ElevenLabs Eleven Music(`music_v2_5`) | ✅ | ✅ Starter($6/월)부터 대부분 상업(영화·TV·게임 일부는 엔터프라이즈) | 1차 채택 · ✅ $0.15/분 |
| Mureka(V9·O2·V9.5) | ✅ | 유료 API 출력 | 2차 · △ 곡당 약 $0.045, 선불 $30부터 |
| Stability Stable Audio 2.5/3.0 | ✅ | 연매출 100만 달러 미만 커뮤니티 라이선스, 가사 노래 불가 | 직접 연동 2차(fal·Replicate 경유는 1차) |
| fal.ai(MiniMax 2.6·2.5·2.0, Lyria 2/3, Stable Audio, ACE-Step, ElevenLabs, CassetteAI) | ✅ | 모델별 | 1차 채택(키 하나로 여러 모델) |
| Replicate(MusicGen·Stable Audio·ACE-Step, `minimax/music-2.5`·`google/lyria-2`·`stability-ai/stable-audio-2.5`) | ✅ | 모델별(MusicGen 가중치는 비상업) | 2026-10-23 주인님 결정으로 1차 추가 |
| Suno(V6·V6-wild·V6-mini) | ❌ 공개 API 없음(2026-07 파트너 신청만) | 공식 앱 유료 등급만, 비공식 API는 약관 위험 | 주인님 결정으로 sunoapi.org(비공식 중계) 정식 1차 연동, 공식 API가 나오면 어댑터 교체 |
| Udio | ❌ | UMG 합의 뒤 다운로드 중지 | 제외 |
| MiniMax 직접 | ⚠️ 2026-08-20 신규 가입 중단 | 가중치 공개, 라이선스 논란 | 제외(fal 경유만) |
| 오픈 가중치 직접 운영(ACE-Step·Stable Audio Open·MiniMax Music3·YuE) | 자체 GPU 필요 | 모델별 | 제외(운영자 서버 비용, Vercel에서 실행 불가) |

미룬 것: Mureka(선불 $30), Stability 직접, Lyria RealTime(2차), Suno 공식 API(공개 대기).

### 3-4. 이미지

#### EXT-IMG-01 ClearPic 1.3.0
| 항목 | 내용 |
|---|---|
| 원본 | NSIS 3 → Electron 38 `app.asar` + `resources/models`(ONNX 2개) + `resources/legal`, 빌드 2026-09-12 · 294.3MB, SHA-256 `9dd72da4` · `D:\PDS\Program_dev\ClearPic-1.3.0-setup.exe`(2026-10-16에는 「용도 지시 대기」 기록만) · GPT PARK, 이 판은 월간 인증 코드 없음 |
| 분석 | 2026-10-24 · `claude-win-dotori` · 7-Zip·`@electron/asar`, 동봉 라이선스 문서 읽기, 한국어 문구 416개 · 권리: 앱 코드·문구 사용 안 함. **모델은 공개 오픈소스라 직접 근거로 사용 가능** — LaMa(Samsung Research, `huggingface.co/Carve/LaMa-ONNX` `lama_fp32.onnx`, Apache-2.0, 208,044,816B) · PP-OCRv4 글자 위치(PaddleOCR·SWHL/RapidOCR, Apache-2.0, 4.7MB) · `onnxruntime-web` 1.29(MIT) |
| 원본 기능 | 모든 처리가 브라우저 엔진 안(WebGPU → WASM), 외부 전송 없음, 오프라인, 첫 로딩 30초~1분 · 끌어다 놓기 최대 300장(PNG·JPG·WebP) · 브러시 마스크·지우개·되돌리기·확대·이동·「원본으로」 · 문구 자동 찾기(PP-OCRv4 위치만) · 제미나이 ✦ 워터마크 자동 찾기(고정 좌표 → 모양·색 → 비율) · LaMa 인페인팅(512×512) · 한 장 마스크를 같은 비율 여러 장에 복사, 진행·중단 · ZIP(무손실 PNG 또는 가로 크기·JPG 85/90/95) · 설명서 14장, 면책(AI 생성 표식 제거 위험, SynthID는 남음) |
| 원본 비용 구조 | 키·API 불필요 |
| 우리 대상 | `banana-canvas`(AI 바나나 캔버스) v1.33 — 「브러시 부분 삭제」·부분 수정·배경 제거 모두 Gemini(회원 유료 키, 서버 임시 업로드 1시간, 한 장씩) · 없는 것: 무료 브라우저 지우기, 글자 자동 찾기, 일괄·ZIP · 재사용 후보 `src/components/studio/MaskEditor.tsx` · 현재 `next.config.ts`에 COOP/COEP 없음, `onnxruntime-web` 미설치 |
| 뽑아낸 기능 | 분석 C1 공용 엔진(상) · C2 글자 찾기(상) · C3 일괄·ZIP(상) · C4 다른 프로그램 사본(`shop-detail-page`·`thumbnail-master`·카드뉴스, 중) · C5 원본 보존(중) · **플랜** C-0 시제품(① COOP/COEP ② 208MB 캐시 ③ 입출력 측정, 출력 0~255 ④ WebGPU 없는 PC 속도 ⑤ 한국어 글자 검출) · C-1 공용 엔진 `browser-inpaint` · C-2 글자 찾기 · C-3 「무료 지우기」 화면 · C-4 일괄·ZIP · C-5 「AI로 다시 그리기(Gemini)」와 나란히 고르기 · IDEA-CLEARPIC-01~03 |
| 하지 않기로 한 것 | **제미나이 ✦ 워터마크 자동 제거 — 제외 확정**(AI 생성물 표시 의무·플랫폼 정책 위험, IDEA-CLEARPIC-04) · 남의 워터마크 제거 홍보 · Electron·앱 코드 |
| 결정 | 2026-10-24 주인님: 바나나 캔버스에 병합, 워터마크 제외 확정, 바나나 캔버스 담당 인계 |
| 진행 상태 | 🔶 **바나나 캔버스 v1.34 운영(2026-10-24, `claude-win-sdp`)** — 「🧽 무료 지우기(내 PC)」 C-0~C-5 완료, 공용 기준 코드 `browser-free-erase` 등록. 남은 묶음: 다른 프로그램 사본(C4) · 상세 `banana-canvas/docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md` §7·§8 |
| 남은 결정 | C4 사본 적용 대상·시기(`shop-detail-page`·`thumbnail-master`·카드뉴스, 그 담당과 협의) · 여러 장 상한은 50장으로 시작(필요 시 조정) |
| 관련 문서 | `docs/analysis-clearpic-20261024/REPORT.md`, `banana-canvas/docs/PLAN_20261024_CLEARPIC_C1_C5.md`, `banana-canvas/docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md`(§6 받는 쪽 검토), IDEA-CLEARPIC-01~04 |

#### EXT-IMG-02 AI Studio 「Banana Canvas」
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱 · 2026-10-14 주인님 로그인 Chrome의 코드 보기로 `App.tsx`(84KB)·`geminiService.ts`(32KB) 등 정독, 실행·생성 안 함 |
| 원본 기능 | 생성·편집(복원·컬러화·업스케일·스타일 20종) · 합성(소스 5장) · 배경 제거·부분 삭제·증명사진·평면도 3D · 인생 앨범·만화 패널·연속 스토리 8컷·이미지 레시피 |
| 우리 대상 | **`banana-canvas` v1.33 새로 만듦** |
| 바꾼 점 | 저장소 버킷 1개로, 배경 제거를 크로마키 방식으로, 스토리·레시피는 텍스트 모델이 기획한 뒤 컷별 생성 |
| 관련 문서 | `banana-canvas/docs/DEVELOPMENT_PLAN.md` |

#### EXT-IMG-03 Cinematic Portrait Studio 2 (내부 표기 PureGlow Studio v2.4)
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱 `a9e74780-5e2f-41b7-9870-6c64b8fe36fc`, 소스 41개 파일 약 200KB · 2026-10-14 정독 |
| 원본 기능 | 촬영 목적 5종 프리셋, 조명·배경·포즈·의상·피부·필름 옵션 · 스튜디오 보정 4종 · 순백 배경 정리, 413×531 JPEG 규격 · `gemini-2.5-flash-image`, `gemini-3-pro-image-preview` |
| 우리 대상 | `portrait-photo` v1.43 |
| 보강한 점 | ① 없는 id를 참조해 목적을 바꿔도 옵션이 안 바뀌던 버그 수정 ② 데이터엔 있는데 고를 수 없던 카메라 옵션 4종을 화면에 노출 ③ 순백 클린업의 머리·옷 번짐·큰 이미지 멈춤 → 작업 크기 제한·분할 처리 ④ 「정부24 100% 통과」 단정 문구 → 통과 보장 아님·제출 기관 규정 안내 ⑤ 얼굴 사진 서버 저장 금지(브라우저 보관)·본인/동의 확인 ⑥ base64 원본 전송 → 긴 변 1,600px JPEG로 줄여 전송(Vercel 4.5MB 한도) ⑦ 다크·영어·개발자 홍보 → 흰색·한국어·크레딧 없음 (`portrait-photo/docs/DEVELOPMENT_PLAN.md` §1-4) |
| 하지 않기로 한 것 | 코드·문구·브랜드(크레딧·유튜브 링크) |
| 관련 문서 | `portrait-photo/docs/DEVELOPMENT_PLAN.md` |

#### EXT-IMG-04 LookStudio AI (가상 피팅, 내부명 `nano-banana-virtual-try-on`)
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱 · GPT PARK · 2026-10-13 소스 ZIP(22개 파일·102KB, `D:\PDS\lookstudio-source`) 실행 없이 정독 |
| 원본 기능 | 상황(TPO)별 의상 2세트 추천과 아이템 이미지 생성 · 끌어다 놓는 가상 피팅(레이어드/갈아입기) · 내 옷장(이름 자동, cors-anywhere 폴백) · 메이크업·헤어 · 키는 XOR 난독화 저장 |
| 우리 대상 | **`fashion-style` v1.13 새로 만듦** |
| 관련 문서 | `fashion-style/docs/DEVELOPMENT_PLAN.md`, `CLI_HANDOFF.md` |

#### EXT-IMG-05 4컷 만능 만화 생성기 PRO
| 항목 | 내용 |
|---|---|
| 원본 | Vite + React 단일 페이지 웹앱(서버 없음, 브라우저에서 Gemini 직접 호출) · https://4cut-comics-99gg.vercel.app/ · 제작자 문서에 없음 |
| 분석 | 2026-10-14 · HTML과 번들 `assets/index-C60d5RK6.js`(331KB) 전체 정독 + Chrome 화면 확인 · 검수는 Claude Code 보조 계정(엣지) |
| 원본 기능 | 4단계(주제 → 대본 JSON 스키마 → 캐릭터 시트 → 컷 4장) · 스타일 4, 이미지 모델 2(`gemini-3.1-flash-lite-image`·`gemini-3.1-flash-image`) · 장르 11(시사 풍자만 검색 근거), 아이디어 5개, 단편/연재 · 캐릭터 시트 첨부로 인물 일관성, 그림 속 말풍선 금지 · AI 자동 말풍선 배치(빈 영역 JSON), 말풍선 6종, 이동·크기·회전·꼬리 · 한글 대사는 Canvas로 얹음 · 저장 4종(2×2·가로·세로·개별), 만화 합치기, 인스타 문구, 이어서 만들기 · 키 AES-GCM 암호화 localStorage, 지수 백오프 재시도 2회 |
| 우리 대상 | **`four-cut-comics` v1.36 새로 만듦** |
| 보강한 점 | 서버 경유 + 회원 본인 키, 옵션 id 허용 목록·길이 검증 · 인물 기본값 한국인(원본의 「국가 연상 요소 금지」 폐기) · 당해 연도·현재 월(계절) · 꼬리 줄이기 · 내 작품 IndexedDB 20개, 서버 보관함(7·30·90일) · 스타일 8, 컷 3·4·6, 비율 4·컷마다 다른 비율 · 웹툰형 세로 저장·나눠 받기(ZIP) |
| 못 옮긴 것 | 플랫폼별 공식 웹툰 규격 프리셋(공식 출처 미확인으로 수치 선택만) |
| 관련 문서 | `four-cut-comics/docs/DEVELOPMENT_PLAN.md` §1, `CLI_HANDOFF.md` |

### 3-5. 인스타

#### EXT-INS-01 GitHub `nam-ai-trend/15_cardnews` (RealEstate & Finance CardNews Studio)
| 항목 | 내용 |
|---|---|
| 원본 | Node/Express + 정적 HTML 1인용 로컬 도구, 76개 파일, 마지막 커밋 `c661ed0`(2026-10-03) · nam-ai-trend(`shorts-auto`와 같은 작성자), 블로그 글은 CC BY-NC-ND, 저장소 라이선스 없음 |
| 분석 | 2026-10-19 Claude Code(윈도우): 코드·프롬프트·디자인 명세·결과물 정독 · 2026-10-22 shorts-auto 보고서에서 「묶음 ②」로 다시 다룸 |
| 원본 기능 | Apify로 인스타 해시태그·계정 릴스·URL 수집, 반응도(좋아요×5 + 조회수)로 BEST 5 · 네이버 뉴스 HTML cheerio 긁기 · 릴스 음성 `whisper-1`, 카드 이미지 글자 `gpt-4o-mini` Vision · 4대 심층 분석 + 7대 떡상 관점(경고·치트키·쉬운요약·VS·실화·타깃·계산기) 중 TOP 3 · 4~10장 가변 대본(「정보 누락 제로」) · 1080×1350, Pretendard, 레이아웃 5(표지·번호 목록·A vs B·빅넘버·CTA) · 이미지·PNG는 Antigravity 채팅 스킬과 Playwright 의존 · 운영자 키(.env), 로컬 저장 |
| 우리 대상 | (1) `cardnews-studio` v1.16(떡상 리메이크 1단계)·v1.17(데이터형 레이아웃) → 이후 `insta_auto_poster`에 병합·숨김 (2) `insta_auto_poster` v1.49 「릴스 영상 올리기」(파일 분석 → 리메이크), v1.50 자동 수집(공식 `business_discovery` 또는 회원 본인 Apify 토큰) · 현재 v1.69 |
| 가져온 것 | 7대 관점 TOP 3, 가변 장수, 정보 누락 없는 문구, 번호 목록·A vs B·빅넘버, 릴스 음성 받아쓰기 반영 |
| 보강한 점 | 회원 본인 키, 브라우저 안 렌더링(서버 Playwright 불필요), Gemini 하나로 음성·이미지 글자, 실패를 지어낸 문구로 채우지 않음, 분야 선택·당해 연도·RLS·30일 삭제·예약 게시, 릴스는 브라우저에서 장면 4장 + 모노 12kHz WAV로 뽑아 4.5MB 요청 한도 회피 |
| 못 옮긴 것 | 인스타 주소 자동 수집 — 인스타그램 로그인 방식 토큰에 `business_discovery`가 없어(시험 회원 토큰 확인) 「파일 올리기」로 대체, Apify는 선택 |
| 하지 않기로 한 것 | 코드·프롬프트(라이선스 없음), 네이버 뉴스 HTML 긁기(차단·약관) |
| 관련 문서 | `docs/ANALYSIS_20261019_REF_15_CARDNEWS.md`, `cardnews-studio/docs/IMPROVEMENT_BACKLOG.md`, `cardnews-studio/AGENTS.md` v1.16, `insta_auto_poster/docs/PLAN_20261022_REELS_REMAKE.md`, `docs/analysis-shorts-auto-20261022/REPORT.md` |

### 3-6. 마케팅

#### EXT-MKT-01 AI Landing Page Architect Enhance
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱 `fedca9b9-75d5-48a2-9643-3b55c8f57502` · GPT PARK · 소스 20개 파일 `D:/PDS/lpa-source/`(크기·해시는 `landing-architect/docs/REFERENCE_MANIFEST.json`) |
| 분석 | 2026-10-13(문서 커밋 `50ca4029a`) · 실제 Chrome으로 첫 화면·접근성 트리 대조, 소스 18개 읽기 · 운영 번들 일치·실제 AI 결과는 미확인 · 키 값 기록 안 함 |
| 원본 기능 | 주제·타겟·목표 입력, 주제 템플릿 20(각 서브 4) · 레이아웃 5(Card·Document·Hero·Gallery·Landing) + Auto-Detect · 타겟·목표 자동 완성 · 기획안 JSON(구조·콘텐츠 전략·디자인 시스템·개발 안내·이미지 자산) → 같은 채팅으로 HTML · LoremFlickr를 Unsplash·Pexels·Pixabay 사진으로 교체, 키 연결 시험 · 미리보기 iframe·코드 탭, JSON/HTML 복사, `landing-page.html` 다운로드 |
| 원본 기술 | React(importmap), Tailwind·FontAwesome 6 CDN, `gemini-3.1-pro-preview`(온도 0.7, responseSchema 없음), 사진 API 3종, 키 XOR localStorage |
| 우리 대상 | **`landing-architect` v1.14 새로 만듦**(비교표 v1.13), 작업 화면 흰색 |
| 보강한 점 | 프리셋·설명 분리 저장, 섹션별 수정·재생성, 프로젝트 저장·다시 열기, 본인 Gemini·사진 키(`user_api_keys`), v1.11~v1.13 UI Canvas로 보내기(서브 페이지·이미지 에셋) |
| 못 옮긴 것 | 실제 운영 기능(폼 전송 등) 없음 — HTML 한 파일 프로토타입 |
| 하지 않기로 한 것 | 키 미등록 시 LoremFlickr로 조용히 전환, 오류 HTML을 정상 처리, 전역 채팅 상태 의존, 원본 모델 고정·폴백 체인 |
| 관련 문서 | `landing-architect/docs/REFERENCE_AUDIT.md`, `ANALYSIS_HANDOFF.md`, `DEVELOPMENT_PLAN.md`, `REFERENCE_MANIFEST.json` |

### 3-7. 멀티미디어

#### EXT-MM-01 Supertonic TTS 0.3.0 (비공식 앱)
| 항목 | 내용 |
|---|---|
| 원본 | NSIS 3 → Electron(`desktop/main.js`) + 내장 Next.js 15 standalone 서버, 빌드 2026-09-09 · 183.6MB, SHA-256 `7ad6ec5d` · `D:\PDS\Program_dev\Supertonic TTS-0.3.0-x64.exe` · GPT PARK, 「Supertone 공식 앱이 아님」 명시 |
| 분석 | 2026-10-24 · `claude-win-dotori` · 7-Zip·`@electron/asar`, 데스크톱 코드 직접 읽기, Next 빌드에서 API 경로·문구 348개·주소, 허깅페이스 공개 API로 모델 크기·라이선스 확인 · 권리: 앱 코드·문구 안 씀. 근거는 Supertone 공식 `github.com/supertone-inc/supertonic`(코드 **MIT**)와 `huggingface.co/Supertone/supertonic-3`(가중치 **OpenRAIL**, 용도 제한 — **상업 이용 조건 확인 필요**) |
| 원본 기능 | 실행 2가지: ① 로컬 엔진(PC 파이썬 3.9~3.13에 `pip install supertonic[serve]` 자동 설치·기동) ② 브라우저 모드(`onnxruntime-web` 1.17, WASM 기본·WebGPU 실험, 모델 1회 캐시, 작업자) · 31개 언어 자동 감지, 44.1kHz · 목소리 10종(M1~M5·F1~F5) + 측정값, 미리듣기 · 디노이징 스텝, 속도 0.9~1.5, 표현 태그(웃음·숨·한숨) · 한 개 / 여러 줄(최대 64, ZIP) / 대화(「M1: …」 대본 → 화자별 목소리, 합본 + 대사별 파일 + SRT + TXT) · WAV / MP3(`lamejs`), 음성 구간 SRT · 프리셋 20, 최근 기록, 진단, 캐시 삭제 · 로컬 OpenAI 호환 `POST /api/v1/audio/speech` |
| 원본 기술 | ONNX 4개 약 398MB(`vector_estimator` 256.5MB, `vocoder` 101.4MB, `text_encoder` 36.4MB, `duration_predictor` 3.7MB) + 목소리 JSON 각 0.3MB · onnxruntime(네이티브·웹) · 모델은 허깅페이스 |
| 원본 비용 구조 | 모델·엔진 무료 오픈소스, 키 없음 |
| 우리 대상 | 음성 전용 프로그램 없음 · 나레이션은 영상 프로그램 안에서만 회원 유료 키: `shorts-onestop-studio` v1.41(`src/lib/tts.ts`·`voice.ts`, OpenAI·Gemini·ElevenLabs), `ai-video-studio`(`lib/edit/tts.ts`), `auto-shorts-posting`, `music-video-studio`(`src/lib/edit/voice.ts`), `shots`(`src/lib/render/voices.ts`) · 없는 것: 무료·키 없는 음성, 대량·대화 합성, SRT 동시 출력 |
| 뽑아낸 기능 | T1 공용 「브라우저 무료 음성 합성」 엔진(상) · T2 기존 나레이션에 「무료 음성」 선택지, 쇼츠 원스톱 먼저(상) · T3 여러 줄 대량 + ZIP(중) · T4 대화 합성(중) · T5 SRT(중) · T6 표현 태그·속도·스텝(중) · T7 로컬 파이썬 엔진(하) · 음악 담당 플랜 초안 T-0 시제품 → T-1 공용 모듈 `browser-free-tts` → T-2 쇼츠 연결(`TtsProvider`에 `browser`, 브라우저 직접 업로드, 자막 시각은 문장별 `duration`) · IDEA-TTS-01~04(03 = 독립 「AI 음성 합성 자동화」 `ai-voice-studio`, 보류) |
| 하지 않기로 한 것 | Electron·내장 Next 서버·파이썬 자동 설치(T7 후순위), 앱 코드·문구, 로컬 OpenAI 호환 API |
| 결정 | 2026-10-24 주인님: 방향 (가) 먼저 — 공용 엔진 → 쇼츠 원스톱부터 「무료 음성」, 독립 여부는 다음 단계 · 구현은 음악 담당 · 「바로 하지 말고 검토 후 작업 대기 리스트로」 |
| 진행 상태 | ⏳ 음악 담당 대기 목록 3번(Lyricbi 다음), 플랜 초안만 |
| 남은 결정 | ① OpenRAIL 상업 이용(유튜브 수익화)·고지 방식 ② 첫 400MB 내려받기를 휴대폰에서 숨길지(추천: 숨김) ③ 시제품 장소 Lab/로컬(추천: Lab) · 플랜·빌드 1~2회 승인 · COOP/COEP 결과(§2 A 묶음) · 독립 프로그램 여부 |
| 관련 문서 | `docs/analysis-supertonic-tts-20261024/REPORT.md`, `HANDOFF_20261024_MUSIC_OWNER.md`, `docs/MUSIC_OWNER_QUEUE_20261024.md` §3, IDEA-TTS-01~04 |

#### EXT-MM-02 Seamless Loop Studio
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `seamless-loop-studio.vercel.app` |
| 분석 | 2026-10-12 · Claude Code(Sonnet 5.5, 첫 커밋 공동 작성자 기준) — 신규 구축 v1.02, 같은 날 v1.03 업로드 영역 개편 |
| 원본 기능 | 시작과 끝이 가장 닮은 구간을 찾아 MP4·WebM·GIF 무한 루프 생성, 브라우저 ffmpeg.wasm |
| 우리 대상 | **`infinite-loop-video` 새로 만듦**, 코드 v1.08(AGENTS.md 1절 표는 v1.03·카테고리 「멀티미디어」로 남아 있음 — 2026-10-24 영상 초안 작업 때 확인) |
| 가져온 것 | 구조·알고리즘만(코드·문구 복제 안 함) |

#### EXT-MM-03 Cinematic Storyboard AI
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `cinematic-storyboard-ai.vercel.app` |
| 분석 | 2026-10-13 · Claude Code(Sonnet 5.5, 첫 커밋 공동 작성자 기준) · HTML·번들 전체 분석 — 신규 구축 v1.03, 같은 날 사용 매뉴얼 추가 |
| 원본 기능 | 레퍼런스 이미지 1장 → 키프레임 9개 분석 → 9컷 콘택트 시트 → 3×3 자르기·ZIP → 영상 프롬프트 |
| 우리 대상 | **`cinematic-storyboard-studio` 새로 만듦**, 코드 v1.18(AGENTS.md 표는 v1.07) |
| 하지 않기로 한 것 | 프롬프트·문구 복제(새로 씀), 원작자 크레딧, 가짜 「4K」 표기 |

### 3-8. 부동산

#### EXT-RE-01 네이버 부동산 아파트 매물 수집기 Ver1.3
| 항목 | 내용 |
|---|---|
| 원본 | PyInstaller **단일 실행 파일**(설치 파일 아님), Python 3.10, 본체 `llmm.pyc`(17KB) + pandas·openpyxl·requests·PIL, 화면 tkinter · 172.3MB, SHA-256 `3933e576` · `D:\PDS\Program_dev\네이버 부동산 아파트 매물 수집기_Ver1.3.exe` · 제작·배포 「ai자동화 복붙코딩」(네이버 카페 `cafe.naver.com/aiautocopy`·유튜브 「ai자동화」, 제휴 링크 포함) |
| 분석 | 2026-10-24 · `claude-win-dotori` · Python 3.10 pyinstxtractor → `marshal`로 함수 이름 26·문구 56·주소 9개(디컴파일 안 함) · 권리: 기능만 |
| 원본 기능 | 시작 때 패스워드 → 제작자 Google Apps Script로 확인, 공지도 같은 방식 · 회원이 개발자 도구에서 쿠키나 curl을 복사해 붙여 넣으면 쿠키·토큰을 뽑아 `pickle`로 저장 · 단지번호(쉼표로 여러 개) → **비공식 내부 주소** `new.land.naver.com/api/articles/complex/{단지번호}` 페이지마다 호출 · 선택 시 `…/api/articles/{매물번호}`로 중개사·입주일 상세(「속도 느려짐」) · 엑셀 저장·서식·자동 열기 · 「자동 실행」 1분 뒤부터 반복 수집 · 마지막 입력 기억 |
| 원본 기술 | tkinter, requests, pandas, openpyxl, 네이버 부동산 비공식 내부 API, Google Apps Script |
| 우리 대상 | `real_estate_sales`(부동산 실거래 투자분석 자동화) 코드 v1.18(비교표 카드는 v1.11) · 공공 데이터(서울 열린데이터·공공데이터포털·VWorld) 과거 실거래, AI 저평가 지수, 텔레그램 알림, 예약 조회 · 없는 것: 현재 매물(호가), 엑셀·CSV 내보내기, 네이버 부동산 링크(코드 검색으로 확인) |
| 뽑아낸 기능 | N1 「이 단지 네이버 부동산에서 보기」 바로가기 — 추천, 위험·비용 없음(IDEA-REALTY-01) · N2 실거래 엑셀 내보내기 — 추천(IDEA-REALTY-02) · N3 회원이 직접 연 화면의 매물만 확장으로 읽어 실거래와 비교 — 보류(IDEA-REALTY-03) |
| 하지 않기로 한 것 | N4 서버에서 쿠키·토큰으로 내부 주소 반복 수집·1분 자동 실행 — 공식 API 아님(예고 없이 막힘), 약관상 자동 수집 제한, [PLATFORM_PATTERNS](PLATFORM_PATTERNS.md) §20과 충돌, 데이터베이스 권리·부정경쟁 다툼 가능성(법률 검토 필요), 운영자 IP·계정 위험, 회원 쿠키를 운영자가 다루게 됨 · N5 패스워드 확인·공지·제휴 링크 · 독립 프로그램 |
| 결정 | 📝 주인님 지시(2026-10-24): 취지는 「접속하지 않아도 지역·키워드로 실시간 매물을 정리해 받아보기」, **네이버 접속·조회·스크롤은 회원 PC·핸드폰에서 회원 본인 로그인·본인 키로만, 우리 서버는 네이버 요청 0·데이터 미보관** → 플랜 3판 |
| 진행 상태 (2026-10-25) | 플랜 3판 승인·구현 → 새 프로그램 `realty-listing-alert`(「부동산 실시간 매물 알림」) **v1.26 운영 배포(준비중·공개 전)**, 담당 역할 `realty`. 간격 1~24시간, 한 회차 20곳·하루 300페이지 상한, 차단 화면이면 그날 멈춤. 중개사 번호는 주인님 결정으로 회원 PC에만 기억(v1.10) |
| 남은 결정 | ~~플랜 3판 §10(구조 승인·이름·간격/상한·사전 검증·담당)~~ 결정됨 · 정식 공개 시점(주인님) · N1·N2는 `real_estate_sales`에 함께 · 문서 정리: 비교표 카드 버전 v1.11 → v1.18 |
| 관련 문서 | `docs/analysis-naver-realty-collector-20261024/REPORT.md`, 개발 플랜 `docs/analysis-naver-realty-collector-20261024/PLAN_20261024_LIVE_LISTINGS.md`(2026-10-24 주인님 취지 반영: 실시간 매물이 본 기능), IDEA-REALTY-01~03 |

#### EXT-RE-02 자동 cURL 쿠키 추출기 Ver1.3(공개용)
| 항목 | 내용 |
|---|---|
| 원본 | 크롬 확장 MV3 소스 5개(`manifest.json`·`background.js` 3.9KB·`content.js` 0.9KB·`popup.js` 9.8KB·`popup.html` 19KB, 한 줄 압축) · `D:\PDS\Program_dev\자동_cURL_쿠키_추출기_Ver1.3(공개용)\` · EXT-RE-01과 같은 제작자(카페 `aiautocopy`·유튜브 「ai자동화」·제휴 링크) |
| 분석 | 2026-10-24 · `claude-win-dotori` · 소스 정적 읽기(설치·실행 안 함) · 권리: 기능만 |
| 원본 기능 | 「캡처 시작」 → 패스워드 입력을 **제작자 Google Apps Script로 확인**(응답은 XOR+base64, 열쇠가 코드에 그대로) → `chrome.debugger`로 현재 탭 `Network.enable` → 요청마다 `chrome.cookies.getAll`로 **그 주소의 모든 쿠키(HttpOnly 포함)**를 붙여 최근 50개 저장 → 팝업에서 cURL로 만들어 클립보드 복사 · `content.js`가 모든 사이트의 `fetch`·`XMLHttpRequest`를 가로채 요청 정보를 `postMessage("*")`로 알림 · 정적 파일·광고 주소 제외 |
| 외부 전송 | 확인 결과 **패스워드 확인 요청 1개뿐**, 잡은 쿠키·요청은 제작자 서버로 보내지 않음(클립보드만) |
| 위험 | 모든 사이트 권한 + 디버거 + 쿠키 권한 → 로그인 쿠키를 그대로 복사해 남에게 붙여 넣으면 **계정 탈취와 같은 효과** · `postMessage("*")`로 요청 정보가 같은 페이지의 다른 스크립트에도 보임 · 패스워드 확인 열쇠가 코드에 노출 |
| 우리에게 주는 것 | EXT-RE-01 플랜 3판 1단계에서 **확장이 회원 브라우저 안에서 동작하므로 쿠키를 꺼낼 필요 자체가 없다** · 대신 「페이지가 스스로 불러온 목록 응답을 확장이 읽는」 방식(디버거 `Network.getResponseBody` 또는 페이지 안 응답 읽기)을 수집 방법 1순위로 채택 — 화면을 실제로 스크롤하면 페이지가 다음 목록을 불러오고 그 응답을 읽으므로 별도 요청이 늘지 않음. `naver-blog-agent`가 이미 `chrome.debugger`를 씀 |
| 하지 않기로 한 것 | 쿠키·cURL 내보내기·클립보드 복사, 모든 사이트 권한(네이버 부동산 주소만), 모든 페이지 `fetch` 가로채기, 제작자식 패스워드 확인 |
| 결정 | 📝 단독 프로그램으로 만들지 않음 — EXT-RE-01 플랜에 기법만 반영 |
| 관련 문서 | `docs/analysis-naver-realty-collector-20261024/REPORT.md` §8, 플랜 3판 §1-8 |

### 3-9. Tools

#### EXT-TL-01 AutoGemmaStarter 2.0.0
> **2026-10-25 G-4 후속(docbot-prompt)**: G-1~G-4 코드 준비·미배포, 문서 범위/분류/미리보기/추출 경고 `952417454`. 108개 검사·타입·로컬 빌드·실제 DB/RLS·일반 회원 무료 조작 통과, 시험 자료0건. 실제 AI/업로드·파싱/방/당시 설정/좁은 화면은 남음, G-5 별도 결정. [최신 인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md).
> **2026-10-25 후속(`[역할: docbot-prompt]`)**: G-3 역할·자료 경계/과거 연도 보존·번역/요약 자동 검색 생략 `d7dd0d367`, 93개 시험·타입·로컬 빌드 통과·미배포 v1.07. G-2 일반 회원 봇 생성/수정/재열기/선택/삭제·삭제된 봇/키 미등록 안내 확인·시험 봇 정리. 실제 AI 품질·방/당시 답변·좁은 화면 미검수, G-4 후속·G-5 별도 결정. 디자인 agy 담당. [최신 인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G3.md). 아래는 당시 기록입니다.
> **2026-10-24 구현 상태 보완(`[역할: docbot-prompt]`)**: G-1 공용 공급자·회원 키와 G-2 문서 챗봇 봇 CRUD/방 선택/설정 기록 구현·운영 DB 준비, 미배포. G-2 83개 시험·타입·로컬 빌드/RLS 검사 통과, 일반 회원 Edge 검수 대기. 새 Groq/OpenRouter 키는 나중 등록 결정. G-3·G-4 후속, G-5 사전 검증 페이지 여부·NVIDIA 운영 조건 미결정. 아래 승인 대기 문구는 초기 이력이며 [최신 인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261024_G2.md)가 우선합니다.
| 항목 | 내용 |
|---|---|
| 원본 | Inno Setup 6.7 → PyInstaller 단일 실행 파일(Python 3.12, PySide6/Qt6), `gemma_starter` 18 + `ui` 10개 모듈 · 200.2MB, SHA-256 `21c5afea` · `D:\PDS\Program_dev\AutoGemmaStarter-Setup-2.0.0.exe` · GPT PARK(「유튜브 정회원 전용」), 레지스트리 `HKCU\Software\GPTPARK` |
| 분석 | 2026-10-24 · `claude-win-dotori` · innounp 2.71 → pyinstxtractor → `marshal` · 후속: Codex(윈도우) `codex-win-20261024-docbot-prompt`가 공식 공급자 조사·G-1~G-5 플랜 · 권리: 내장 봇 지침·프롬프트 25종 문구·모델 추천 수치 사용 안 함 |
| 원본 기능 | 비개발자용 Gemma 로컬 설치 마법사(Docker 없이) · PC 사양 검사(OS·RAM·GPU·VRAM) · Ollama 무인 설치·기동·모델 관리·제거 · 사양별 용도 추천(색 4단계) + 모델 라이선스 안내 · 내장 채팅(목록·검색·마크다운 내보내기, 스트리밍·중단·다시 생성) · 공급자: 로컬 Ollama + Groq·OpenRouter·NVIDIA·Cloudflare Workers AI · 커스텀 봇(이름·지침·모델·온도) + 내장 12종, 「역할 지침 최우선」 틀 · 프롬프트 25종 + `{{변수}}` · 지식 도서관 RAG(txt·md·pdf·docx, `nomic-embed-text`, PDF 한글 깨짐 감지) · 웹 검색 DuckDuckGo / Tavily · 전역 단축키 Ctrl+Alt+G, 트레이, Open WebUI(Docker) |
| 원본 기술 | PySide6, Ollama(`OllamaSetup.exe /VERYSILENT`, `localhost:11434`), OpenAI 호환 클라우드 4곳, `nomic-embed-text` + 코사인 유사도, `nvidia-smi` |
| 원본 비용 구조 | 월간 인증 코드(GPT PARK 유튜브 멤버십, PBKDF2, 설치 ID 토큰), 클라우드는 회원 키 |
| 우리 대상 | `ai-doc-chatbot` v1.07(Upstage 하나: 답변 `solar-pro4`·라우터 `solar-mini4`·임베딩 1024차원, Tavily) · `ai-prompt-studio` v1.09 FREE(Gemini 하나) · 참고 `ai-work-workspace` · 겹침: RAG·웹 검색·템플릿·대화 저장 · 없는 것: 커스텀 봇, 여러 공급자, 로컬 AI |
| 공식 조사(Codex) | Groq `openai/gpt-oss-20b`·`120b`(구형 Llama는 2026-08-16 Free/Developer 종료, 회원별 무료 수치 미확정) · OpenRouter `meta-llama/llama-3.3-70b-instruct:free`, 무료 20회/분·50회/일($10 구매 시 1,000회/일) · NVIDIA 무료는 시험·개발용, 운영은 별도 라이선스 → 운영 활성화 보류 권장 · Cloudflare `@cf/meta/llama-3.2-3b-instruct` 등, 하루 10,000 Neurons(한국 09:00 초기화) |
| 뽑아낸 기능 | (인계 번호 기준) G-1 OpenAI 호환 공급자 공용 호출 + 공용 키(`integration_catalog`·`user_api_keys`), 두 프로그램 모두 · G-2 커스텀 봇(문서 챗봇 추천) · G-3 역할 유지 지침(번역·요약 봇이 질문에 답해 버리는 문제 방지) · G-4 문서 근거 보강(여러 문서 체크·미리보기·PDF 깨짐 감지) · G-5 로컬 Ollama(보류 또는 시제품) · REPORT 번호는 G1~G7로 달랐음(G6 DuckDuckGo 채택 안 함, G7 라이선스 배지 하) · IDEA-GEMMA-01~04 |
| 하지 않기로 한 것 | Ollama·Docker 자동 설치, 단축키·트레이(데스크톱 전용), 사양 기반 추천(로컬 AI를 하면 안내 수준만), 월간 인증 코드, 원본 문구, DuckDuckGo 화면 긁기(공식 API 아님·차단 잦음), 문서 챗봇 임베딩·파싱 교체(Upstage 1024차원 유지 — 차원이 바뀌면 저장된 조각 검색이 깨짐) |
| 결정 | 독립 개발 안 함 → 두 프로그램에 병합(분석 의견), 주인님이 문서 챗봇·AI Prompt 담당에게 인계 지시 → Codex 세션 인수 |
| 진행 상태 | ⏳ 공식 조사·플랜 완료, 구현·DB 쓰기·비용 모두 승인 대기 · 예정 버전 문서 챗봇 v1.08, Prompt v1.10 · 제안 비용: 텍스트 시험 10회 + 임베딩 3 + PDF 파싱 1, 실비 상한 1,000원, 빌드 2회(예상 $0.042~0.070, 상한 $0.20) |
| 남은 결정 | G-1~G-4 범위와 DB 변경안(`integration_catalog`, provider CHECK, 봇 표, 문서 메타데이터), 커스텀 봇 위치(문서 챗봇 / AI Prompt / 둘 연결), G-5(보류/시제품/정식), 비용 승인, NVIDIA 운영 조건 |
| 관련 문서 | `docs/analysis-autogemma-starter-20261024/REPORT.md`, `HANDOFF_20261024_DOCBOT_PROMPT.md`, `OFFICIAL_PROVIDERS_20261024.md`, `PLAN_G1_G5_20261024.md`, IDEA-GEMMA-01~04 |

#### EXT-TL-02 오늘의 할 일 & 성과
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱(`application/vnd.google-makersuite.applet+zip`), 23,446바이트, 최종 수정 2025-10-12, ZIP SHA-256 `C19BF22B` · Drive ID `1iLQSTMxTbksuw5yv54XUgYP9q79ITS3I` · 로컬 사본 `scratch/today-todo-reference/` · 제작자 문서에 없음 |
| 분석 | 2026-10-13 · Codex · 소스 20개 전부 읽고 원본 React 소스를 로컬에서 묶어 화면이 보이는 Chrome으로 33개 상황 실행, AI는 모의 응답 · 권리: CDN importmap·코드 안 쓰고 독립 설계 |
| 원본 기능 | 할 일(제목·분류 4·우선순위 3·예상 시간), 추가·수정·삭제·완료·취소, 분류 필터·관리 · 집중 25분/짧은 휴식 5분/긴 휴식 15분 · 성과(완료율·집중 시간·예측 정확도, 점수 = 완료율×0.7 + 정확도×0.3) · 2시간 단위 12구간 차트 · AI 분석(완료한 일 → 분석문 + 제안 3개 JSON) · 성과 노트, JSON·CSV 내보내기, 하루 초기화, 설명서 |
| 원본 기술 | React 19.2, Recharts 3.2, Tailwind CDN, `@google/genai` 1.24, `gemini-2.5-flash` 고정, 브라우저 `process.env.API_KEY`, 저장은 `useState`뿐 |
| 우리 대상 | **`ai-task-planner`(AI 할 일·성과 관리) v1.10 새로 만듦** · https://ai-task-planner.buylife.xyz |
| 보강한 점 | 회원별 서버 저장(JSONB·revision·원자적 RPC), 일시정지·재개 상태 전이, 완료·삭제 시 타이머 정산, 수정해도 실제 시간 보존, 날짜·분류 범위가 차트와 AI에 같게 적용, 측정 안 한 작업은 N/A, AI 결과 구조 검증, 본인 Gemini 키, 휴지통·JSON 복원, v1.06 AI 입력 한국어 표기 |
| 못 옮긴 것 / 후보 | 팀 공유·알림 없음 · 반복 일정·자동 휴식·주간 추세(원본에도 없던 후속 후보) |
| 하지 않기로 한 것 | 전체 삭제식 하루 초기화(휴지통·마감으로 대체), 모델 고정, 브라우저 키 주입, 1차에서 캘린더·Notion·확장·다중 공급사 제외 |
| 관련 문서 | `ai-task-planner/docs/REFERENCE_ANALYSIS.md`, `DEVELOPMENT_PLAN.md`, `PHASE1_IMPLEMENTATION.md`, `CLI_HANDOFF.md`, `WORK_QUEUE.md`, `docs/evidence/browser-results.json` |

#### EXT-TL-03 번역의 정석
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 공유 앱 `apps/9596827a-a428-415c-aaae-8547cbe137ea` · 프로젝트 ZIP 19개 파일·77,015 bytes, 실행 JS `index-DClkYqUC.js` 1,684,474 bytes SHA-256 `eaf64682` · 제작자 이름·버전 문서에 없음 |
| 분석 | 2026-10-14 · Codex · 로그인된 Aside 브라우저로 Preview·Code, ZIP Export·HTML·번들 수집, DOCX XML 검사, AI 호출 0회 · 원본 코드는 공개 Git에 안 올림 |
| 원본 기능 | 번역 대상 10개 언어, 원문 자동 감지 · 분야 11·격식 3·어조 17 · 문맥·용어·문체 분석 탭, 점수 1~10, 용어 복사·TXT/CSV · 번역문 용어 강조·팝업, 원문·번역문 비율 동기 스크롤 · 역번역 비교 · TXT·DOCX(Mammoth)·PDF(PDF.js) 가져오기(파일만 불러도 AI 호출) · DOCX 다운로드(제목 스타일·목록 소실), 번역문 직접 수정 |
| 원본 기술 | React 19.1, Vite 6.2, GenAI SDK 1.9, `gemini-2.5-flash` 고정, Mammoth 1.7, PDF.js 4.4.168, DOCX 8.5, file-saver, 서버·DB·인증 없음 |
| 우리 대상 | **`document-translator`(AI 문서번역 자동화) v1.22 새로 만듦** · https://document-translator.buylife.xyz |
| 보강한 점 | 파일은 로컬 추출 후 버튼을 눌러야 AI 실행, 응답 검증 후 교체·revision, 문단별 수정·재검수, 숫자·URL 대조, 개인 용어집, 서식 있는 DOCX, CSV 수식 보호, 회원 보관함·JSON 백업, 모바일 탭, 크기·쪽수·글자 한도 |
| 못 옮긴 것 | 스캔 PDF(OCR)·HWP·PPTX·XLSX 미지원, 원문 2만 자·5MB·PDF 50쪽 제한 |
| 하지 않기로 한 것 | 파일 선택만으로 AI 자동 호출, 브라우저 키 구조, 2.5 모델 기본 고정, AI 점수를 정확성 인증처럼 표시 |
| 관련 문서 | `document-translator/docs/REFERENCE_ANALYSIS.md`, `DEVELOPMENT_PLAN.md`, `CLI_HANDOFF.md`, `IMPLEMENTATION_STATUS.md`, `RELEASE_CHECKS.md`, `docs/evidence/reference/*.json` |

#### EXT-TL-04 Playful File Helper
| 항목 | 내용 |
|---|---|
| 원본 | https://xel-fusion-v2.vercel.app/ · Vite React 19, `assets/index-BFd8p0Gy.js` 705KB · GPT PARK(유튜브 `@AIFACT-GPTPARK`) |
| 분석 | 2026-10-14 · Claude Code(보조 계정) · HTML·번들·처리 코드 읽기, 엣지에서 시험 파일로 동작 확인 · 원본 소스 저장소에 안 넣음 |
| 원본 기능 | 엑셀 합치기 ① 이어 붙이기(머리글 구분 없이 → 머리글 반복·열 어긋남 재현) ② 시트별 모으기(`파일명_시트명`, 31자) · 엑셀 나누기(시트별 → ZIP) · 텍스트 합치기(구분자 `\n\n---\n\n`) · 텍스트 나누기(문장 조각 N등분) · 같은 이름 파일 말없이 제외, 순서 변경 불가, 한/영·다크 |
| 원본 기술 | SheetJS `xlsx@0.18.5`, `jszip@3.10.1`, Tailwind CDN, 서버·저장·AI 없음 |
| 우리 대상 | **`file-merge`(AI 엑셀·텍스트 합치기 자동화) v1.08 새로 만듦** · https://file-merge.buylife.xyz |
| 보강한 점 | 머리글 이름 기준 열 맞춤, 원본 파일·시트 표시 열, 남길 열·순서 선택, 같은 행 제거, 시트 선택·머리글 행 지정, CSV·.xlsm, 나누기 3방식(시트·열 값·N행), 원본 서식 유지, 글자 수·문단 경계 기준 텍스트 나누기, UTF-8/CP949 자동, 미리보기, SheetJS 0.20.3 |
| 못 옮긴 것 | 없음(원본 4기능 전부) · 서식 유지는 100만 칸까지, .xls·CSV는 서식 없음 |
| 하지 않기로 한 것 | 서버 전송·저장, AI |
| 관련 문서 | `file-merge/docs/REFERENCE_ANALYSIS.md`, `DEVELOPMENT_PLAN.md`, `CLI_HANDOFF.md` |

#### EXT-TL-05 Markdown Studio
| 항목 | 내용 |
|---|---|
| 원본 | https://markdown-studio-mauve.vercel.app/ · `/assets/index-Bq4-Ts5h.js` 324,432 bytes SHA-256 `4e4a8f54` · 수집 자료 `D:/PDS/markdown-review-20261013/` |
| 분석 | 2026-10-13 · HTML·번들 전체 읽기, 화면이 보이는 Chrome으로 서식·목록·탐색기·내보내기 조작, PDF·DOCX 구조 검사, Google API는 모의 응답으로 401 재현 · 2단계 구현은 Claude Code |
| 원본 기능 | 툴바 20개 명령, 목록 3종, 특수기호 32 · 폴더·파일 트리(드래그·순환 차단·검색·우클릭) · 편집·미리보기 3열, HTML 소스 보기 · PDF(html2pdf A4)·DOCX(html-docx-js) 내보내기, 폴더를 한 문서로 · localStorage 저장, 본인 Client ID로 Drive `drive.file` 업로드·동기화 · AI 없음 |
| 원본 기술 | React 19, Marked 15(GFM), DOMPurify 3.2, Google Identity Services, Drive API v3, html2pdf.js, html-docx-js, FileSaver |
| 우리 대상 | **`markdown-studio`(마크다운 문서 자동화) v1.21 새로 만듦**(비교표 v1.20) · https://markdown-studio.buylife.xyz |
| 보강한 점 | CodeMirror 6·단축키·찾기/바꾸기, 표 정렬·체크리스트 이어쓰기, IndexedDB·수정 이력 30·휴지통·저장 실패 시 원고 받기, .md/.txt·폴더 가져오기, HTML·ZIP 내보내기, 전체 백업·복원, 모바일 탭, Drive 상태 검사·재연결·전용 폴더, 꼬리표·목차·템플릿·테마 |
| 못 옮긴 것 | 기기 간 동기화는 Drive 연결 필요, AI 없음(본인 키 선택 기능으로 추후 분리) · 실제 Google 로그인·Drive 미검증 |
| 하지 않기로 한 것 | 정규식 검색(원본 화면 오류 원인), 실패해도 「저장 완료」, 루트 폴더 실패 시 `root` 폴백, 운영자 공용 OAuth 앱, 크롬 확장 |
| 관련 문서 | `markdown-studio/docs/REFERENCE_ANALYSIS.md`, `docs/evidence/review-results.json`, `CLI_HANDOFF.md`, `PHASE2_PLAN.md` |

#### EXT-TL-06 매직 에디터 (Magic Editor)
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱, 소스 약 20KB · `aistudio.google.com/apps/138f85e0-2a10-4056-bed0-a4d67714c8a0` |
| 분석 | 2026-10-14 · `geminiService.ts`·`types.ts`·`App.tsx`·`HomeScreen.tsx`·`FloatingToolbar.tsx`·사용법 읽기 |
| 원본 기능 | 새 글 생성(형식 5, 참고 파일, 검색 근거, 블로그는 메타 제목·설명·H1~H3) · 기존 글 붙여넣기/업로드 후 전체 분석 · 드래그 툴바(다시쓰기·짧게·자세히·전문적으로·친근하게) · 전체 분석 제안 `{originalText, suggestedText, reason}` 사이드바 → [적용] `String.replace` · `gemini-2.5-pro`(생성·분석)·`gemini-flash-latest`(부분), 키 브라우저 주입 |
| 우리 대상 | **`ai-writing-editor` v1.13 새로 만듦** · 2026-10-21 병합 B로 `persona-style-studio`의 「문체 바꾸기」 흡수(EXT-TL-07) |
| 보강한 점 | 자동 저장 30개·되돌리기 50단계, 제안 적용 시 위치 재탐색·이미 바뀐 곳 「적용 불가」, 모두 적용·무시, 한국어 오류(원본은 실패 시 원문을 조용히 반환), 거울 요소로 캐럿 좌표, 선택 영역 자유 지시문, .txt/.md/.csv만, 제안 분류(문법·표현·구조·명확성), 형식 9·톤·분량, 당해 연도, 서버 경유 + 본인 키 |
| 관련 문서 | `ai-writing-editor/docs/DEVELOPMENT_PLAN.md`, `CLI_HANDOFF.md` |

#### EXT-TL-07 Prompt Equalizer
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `prompt-equalizer.vercel.app` |
| 분석 | 2026-10-13 · Claude Code(Sonnet 5.5, 첫 커밋 공동 작성자 기준) — `persona-style-studio` 신규 구축 v1.02 |
| 원본 기능 | 슬라이더 5개(프리셋 8종) + 캐릭터 페르소나로 문체 다시쓰기 |
| 우리 대상 | `persona-style-studio` v1.10 새로 만듦 → **2026-10-21 병합 B로 사용 종료, 기능은 `ai-writing-editor` 「문체 바꾸기」로** |
| 하지 않기로 한 것 | 기본 페르소나·샘플·프리셋 문구 복제(새로 씀) |

#### EXT-TL-08 다기능 종합 성격 진단기 (배포용)
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 순수 클라이언트 앱 `aistudio.google.com/apps/4fcb059b-718d-4a4d-a47c-533a6bccde66` · GPT PARK |
| 분석 | 2026-10-14 · 코드 보기로 `App.tsx`·`types.ts`·`geminiService.ts`·`ResultModal`·`TestView`·`data/*` 읽고 실행 화면 확인 |
| 원본 기능 | 16유형 상황별 변형 10종(표준·한국인·업무·여행·위기·관계·소비·학습·건강·모임) · 심리검사 6종(애착·Big5·에니어그램·DISC·TCI 간략판·MMPI 참고 정신건강) · 전 문항 한 화면, 로컬 점수 → 결과 모달 · 「AI 분석」 `gemini-2.5-flash` 1회 · 결과 HTML을 `dangerouslySetInnerHTML`로 주입 · 테마·설명서·크레딧 |
| 우리 대상 | **`personality-suite` v1.28 새로 만듦** |
| 보강한 점 | 회원 본인 Gemini 키로 서버 호출(원본은 키 하나 공유), AI 결과 구조화 JSON(HTML 주입 없음), 결과 기록 100건, 여러 검사 종합 프로필, 한 문항씩·이어하기, 점수 서버 재계산, 당해 연도, 흰색 표준 화면 |
| 하지 않기로 한 것 | 문항·결과 문구·코드 복제(전부 새로 씀) · 상표·저작 검사 이름 전면 노출 금지(MBTI→「16유형」, DISC→「행동 스타일」, TCI→「기질·성향 점검」, MMPI 언급 금지) · 정서·마음 상태 점검은 안전 설계(위기 상담 고정 안내, 기본 저장 안 함) 후 v1.02로 · 크레딧·광고 링크 |
| 관련 문서 | `personality-suite/docs/DEVELOPMENT_PLAN.md` |

#### EXT-TL-09 Reverse Prompt Architect
| 항목 | 내용 |
|---|---|
| 원본 | 웹앱 `reverse-prompt-architect.vercel.app` · GPT PARK · 2026-10-13 번들 487KB 정독 |
| 원본 기능 | 이미지·영상·오디오 파일 → Gemini 분해 → Midjourney·Sora·Suno용 JSON + 영문 프롬프트, 저장 없음 |
| 우리 대상 | **`reverse-prompt` v1.14 새로 만듦** |
| 보강한 점 | 비공개 임시 버킷 업로드, 서버 분석, 편집·재조합·기록·내보내기 |
| 관련 문서 | `reverse-prompt/docs/DEVELOPMENT_PLAN.md` |

#### EXT-TL-10 GPT PARK의 UI 캔버스 Pro
| 항목 | 내용 |
|---|---|
| 원본 | AI Studio 앱 · 2026-10-13 ZIP(`D:\PDS\ui-canvas-source`) 정독 |
| 원본 기능 | 컴포넌트 25종 캔버스 에디터, 레이어·그룹, html2canvas 이미지 저장, JSON 내보내기, 저장 없음, **운영자 키가 번들에 박혀 있음** |
| 우리 대상 | **`ui-canvas` v1.14 새로 만듦** · `landing-architect`에서 보내기 연동(EXT-MKT-01) |
| 하지 않기로 한 것 | 운영자 키 구조 |
| 관련 문서 | `ui-canvas/docs/DEVELOPMENT_PLAN.md` |

---

## 4. 공통으로 하지 않기로 한 것 (반복 패턴 — 새 분석에서 다시 제안하지 않음)

| 패턴 | 나온 곳 | 이유 | 우리 대체 |
|---|---|---|---|
| 원본 코드·프롬프트·지식 데이터·문구·이름·아이콘 이식 | 전부 | 권리 없음(핵심 원칙 21) · **Spectrum 「100% 추출 이식」이 실제 파생 판정을 받았다** | 기능·동작만 기록하고 새로 작성. 공개 오픈소스 모델·라이브러리는 라이선스 확인 뒤 직접 사용 |
| 월간 인증 코드·인터넷 시간 확인·오프라인 유예 | Spectrum, Lyricbi, AutoGemma, 카드형 쇼츠 | 우리는 회원 권한 판정이 있음 | `requireProgramAccess()`(등급·사용기간·FREE) |
| 브라우저에 키 저장·키 주입·키 공유 | 대부분 AI Studio 앱, UI 캔버스(운영자 키 번들) | 최상위 규칙(회원 본인 키), 노출 위험 | 서버 경유 + `user_api_keys` |
| Electron·데스크톱 전용 기능(트레이·단축키·자동 업데이트·로컬 백업) | Electron·PyInstaller 앱 전부 | 웹 플랫폼 | 웹 / 웹 + 확장 |
| 회원 PC의 CLI·구독 로그인으로 AI 호출 | 도톨이(ChatGPT 구독·Codex CLI) | 웹 서버가 회원 PC CLI 실행 불가 | 회원 본인 API 키 |
| 비공식 내부 API·HTML 긁기·공개 CORS 프록시 | 매물 수집기, 키워드 파이터 B, 15_cardnews(네이버 뉴스), AutoGemma(DuckDuckGo) | 약관·차단·[§20](PLATFORM_PATTERNS.md) | 공식 API(데이터랩·검색 API·Tavily) 또는 회원이 직접 연 화면에서 소량 |
| 실제 검색 화면 스크래핑(서버) | 도톨이 v1.2·v1.3 | 차단·약관 | 검색 API 정확도순 + 「실제 순위와 다를 수 있음」 고지, 필요하면 회원 확장 |
| AI 생성물 표식(워터마크) 제거 | ClearPic | AI 생성물 표시 의무·플랫폼 정책 | **제외 확정** |
| 가상 경험·후기 생성, 「AI 탐지 회피」 지시 | 6.5.4, 도톨이 N7, Maepsi | 후기 오인·신뢰 위험 | 회원이 입력한 실제 경험만, 경험 창작은 보류 |
| 상표·저작 검사 이름 전면 노출 | 성격 진단기 | 상표·저작권 | 일반 명칭 |
| `yt-dlp` 등 원본 영상 다운로드 | shorts-auto | 약관 | Gemini가 영상을 직접 분석 |
| Remotion 서버 렌더 | Lyricbi, shorts-auto | 라이선스·서버 비용 | 브라우저 WebCodecs(`browser-mp4-encoder`). 참고: BUYLIFE는 3인 이하라 Remotion 무료 대상이지만 인코더는 Remotion에 의존하지 않게 유지 |
| 운영자 공용 OAuth 앱 | Markdown Studio 검토 | 핵심 원칙 4 | 회원 본인 Client ID |
| **숫자 조작(SMM 패널형)** — 돈·포인트로 팔로워·친구·좋아요·찜·장바구니·「구매중」·리뷰·별점·조회수·라이브 시청자를 운영자·제3자 보유 계정으로 인위 증가, 리뷰 대리 등록, 가짜 수치 대시보드 (2026-10-24 주인님 결정 「넣어줘」) | channelup.kr(카카오맵 별점 5점 리뷰 판매·숨은 쿠팡 찜·리뷰 상품), prohubstart 시연 도구(가짜 지표), 상품 문구 생성기(가짜 판매량·후기) | 플랫폼 약관(허위 참여·진정성 없는 활동) 위반으로 회원 계정·상품 차단, 표시광고법·전자상거래법 위반 소지, 의뢰한 회원도 책임 주체, 최상위 규칙(회원 본인 계정·진짜 콘텐츠)과 정반대 — **분석에서 이 패턴이 보이면 바로 「제외」로 판단하고 기능·아이디어로 제안하지 않음** | 회원 본인 계정으로 진짜 콘텐츠·응대 자동화(예약 게시·댓글 답글·소통 도우미), 진짜 지표는 회원 본인 OAuth로만 |

---

## 5. 남은 결정 모음 (주인님 결정 대기 — 2026-10-24 기준)

| 카드 | 결정할 것 | 담당(예정) |
|---|---|---|
| EXT-RE-01 | N1 바로가기·N2 엑셀 진행(`real_estate_sales`), N3는 새 프로그램으로 진행 중 · 정식 공개 시점 | `realty`(`claude-win-20261024-realty`) |
| EXT-TL-01 | G-1~G-4 범위·DB 변경·비용, 커스텀 봇 위치, G-5 | 문서 챗봇·AI Prompt 담당(Codex) |
| EXT-IMG-01 | C-0~C-5 범위·비용, 여러 장 상한, 다른 프로그램 적용 | 이커머스·이미지 담당 `claude-win-sdp` |
| EXT-MM-01 | OpenRAIL 상업 이용, 휴대폰 노출, 시제품 장소, 플랜·빌드 | 음악 담당 |
| EXT-MUS-02 | L-1~L-5 범위·빌드 2회, R6~R11 | 음악 담당 |
| EXT-MUS-01 | P-6 범위, P-2의 공용 인코더 반영, 원본 번들 사본 정리 | 음악 담당 |
| EXT-BLOG-04 | E-5 착수, E-2 재개, BLOG 정리 시점, M5 | 블로그 담당 |
| EXT-BLOG-02 | 2차 범위(이전 글 비교·스타일 점수·이미지 노드), N7, N13 | 블로그 담당 |
| §2 A 묶음 | COOP/COEP 시제품을 누가 먼저 하고 결과를 공유할지 | 음악·이미지 담당 |

## 6. 이 문서를 처음 만들 때 채우지 못한 칸 (다음 CLI가 보강)
- ✅ 2026-10-24 모두 채움(`claude-win-dotori` [역할: analysis-planning]): EXT-YT-02 원본 기능·가져온 것·보강·못 옮긴 것(`docs/CARD_SHORTS_REFERENCE_ANALYSIS.md` §1~§3·§6), EXT-MUS-04·06·MM-02·03·TL-07 분석 날짜·CLI(각 프로그램 첫 커밋 날짜·공동 작성자), EXT-MUS-06 원본 기능·보강한 점, EXT-IMG-03 보강한 점 7가지(플랜 §1-4).
- ✅ 2026-10-24 프로그램 비교표 버전·분야를 운영 DB 기준으로 맞춤(50칸). 카드 안 「(AGENTS.md 표는 v…)」 메모는 각 프로그램 `AGENTS.md`가 아직 고쳐지지 않았다는 뜻이라 그대로 둔다(그 프로그램 담당이 고친다).
- 분석 CLI는 커밋 공동 작성자 기준이라 장비(윈도우·맥미니)는 확인하지 못했다.

## 변경 기록
- 2026-10-24 §6 빈칸 7개 카드 보강(카드형 쇼츠 원본 기능, 분석 날짜·CLI 5건, 마스터링 원본 기능, 증명사진 보강 7가지)(`claude-win-dotori`).
- 2026-10-24 처음 작성 — 외부 원본·참고 자료 37건, 14개 카테고리 중 9개 분류, 기능 묶음 12개(A~L), 공통 제외 패턴, 남은 결정 모음(Claude Code 윈도우 `claude-win-dotori`, 저장소 문서 대조, 코드·DB·배포 변경 없음).
- 2026-10-24 §1 총괄표에 「핵심 기능」·「판단」 칸 추가, 카테고리를 실제 사이트 기준(+신설 2개)으로 다시 묶음, 건수 표에 판단 합계(독립 27·병합 9·보류 1)(`claude-win-dotori`).
