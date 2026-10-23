#!/usr/bin/env node
// 공용 기준 코드(docs/SHARED_MODULES.md) 사본 검사 — 기준 파일과 각 프로그램 사본이 글자 하나까지 같은지 확인한다.
// 이미지 생성 호출(generateGeminiImage)의 최악 소요 시간이 Vercel 300초 한도 안인지도 함께 검사한다(아래 「시간 검사」).
// 사용: node scripts/check-shared-modules.mjs          (전체 검사, 다르면 종료 코드 1)
//       node scripts/check-shared-modules.mjs --sync   (기준 파일 내용으로 사본을 덮어씀 — 기준을 고친 뒤에만)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

// 모듈 목록: 기준(source) 1개 + 사본(copies). 새 모듈은 docs/SHARED_MODULES.md 표와 여기에 함께 추가한다.
const MODULES = [
  {
    // 텔레그램 승인·알림 봇(회원 본인 BotFather 봇): 연동 확인 findChatIdFromUpdates(deleteWebhook → getUpdates allowed_updates=["message"]),
    // 메시지·버튼 메시지·버튼 처리 응답·웹훅 걸기/해제. 2026-10-21 등록 — 10곳이 같은 코드를 손 복사로 쓰고 있었음(알림 전용 5곳은 일부만)
    id: "telegram-bot-client",
    source: "instagram-comment-reply/lib/telegram/client.ts",
    copies: [
      "instagram-comment-reply/lib/dmApp/telegram/client.ts",
      "threads-comment-reply/lib/telegram/client.ts",
      "youtube-auto-reply/lib/telegram/client.ts",
      "kakao_auto_poster/src/lib/telegram/client.ts",
      "booking-reminder/lib/telegram/client.ts",
      "crm-google-form/lib/telegram/client.ts",
      "longtail-keyword-expander/lib/telegram/client.ts",
      "competitor-analysis/lib/telegram/client.ts",
      "real_estate_sales/src/lib/telegram/client.ts",
      "trending-product-finder/lib/telegram/client.ts",
    ],
  },
  {
    // 대시보드 「검토를 기다리는 ○○」 목록(작성자·시각·배지·본문·글 앞부분·썸네일, 누르면 검토 화면 묶음으로). 2026-10-21 세 댓글 프로그램 통일
    id: "pending-review-list",
    source: "instagram-comment-reply/components/PendingReviewList.tsx",
    copies: [
      "threads-comment-reply/components/PendingReviewList.tsx",
      "youtube-auto-reply/components/PendingReviewList.tsx",
    ],
  },
  {
    // 최근 7일 응대 그래프 — 날짜 나누기(한국 시간 7칸, 플랫폼별 묶음). 2026-10-22 받은편지함 v1.07에서 만들어 세 댓글 프로그램 대시보드에 공유
    id: "week-reply-bucket",
    source: "comment-inbox/lib/weekChart/bucket.ts",
    copies: ["instagram-comment-reply/lib/weekChart/bucket.ts", "threads-comment-reply/lib/weekChart/bucket.ts", "youtube-auto-reply/lib/weekChart/bucket.ts", "threads-affiliate-poster/src/lib/weekChart/bucket.ts", "insta_auto_poster/src/lib/weekChart/bucket.ts", "ai-influencer-studio/src/lib/weekChart/bucket.ts", "ai-webtoon-studio/src/lib/weekChart/bucket.ts", "four-cut-comics/src/lib/weekChart/bucket.ts"],
  },
  {
    // 최근 7일 응대 막대그래프 컴포넌트(CSS 막대, 플랫폼별 쌓기·막대 고르기는 선택). 카드 테두리는 부르는 쪽이 감싼다
    id: "week-reply-chart",
    source: "comment-inbox/components/weekChart/WeekReplyChart.tsx",
    copies: ["instagram-comment-reply/components/weekChart/WeekReplyChart.tsx", "threads-comment-reply/components/weekChart/WeekReplyChart.tsx", "youtube-auto-reply/components/weekChart/WeekReplyChart.tsx", "threads-affiliate-poster/src/components/weekChart/WeekReplyChart.tsx", "insta_auto_poster/src/components/weekChart/WeekReplyChart.tsx", "ai-influencer-studio/src/components/weekChart/WeekReplyChart.tsx", "ai-webtoon-studio/src/components/weekChart/WeekReplyChart.tsx", "four-cut-comics/src/components/weekChart/WeekReplyChart.tsx"],
  },
  {
    // 최근 7일 응대 그래프 + 막대 누르면 그날 답한 목록(원래 댓글·답장 앞부분). 서버 동작·테마 색은 부르는 쪽이 넘김. 2026-10-22 받은편지함 v1.08
    id: "week-reply-panel",
    source: "comment-inbox/components/weekChart/WeekReplyPanel.tsx",
    copies: ["instagram-comment-reply/components/weekChart/WeekReplyPanel.tsx", "threads-comment-reply/components/weekChart/WeekReplyPanel.tsx", "youtube-auto-reply/components/weekChart/WeekReplyPanel.tsx", "threads-affiliate-poster/src/components/weekChart/WeekReplyPanel.tsx", "insta_auto_poster/src/components/weekChart/WeekReplyPanel.tsx", "ai-influencer-studio/src/components/weekChart/WeekReplyPanel.tsx", "ai-webtoon-studio/src/components/weekChart/WeekReplyPanel.tsx", "four-cut-comics/src/components/weekChart/WeekReplyPanel.tsx"],
  },
  {
    // 인스타 게시 기록 API 하나로 「최근 7일 게시」 그래프 + 그날 게시한 글(접힌 한 줄 → 펼치기). 2026-10-22 카드뉴스 홈에서 만들어 AI 인플루언서·웹툰에 공유
    id: "insta-week-posts",
    source: "insta_auto_poster/src/components/weekChart/InstaWeekPosts.tsx",
    copies: ["ai-influencer-studio/src/components/weekChart/InstaWeekPosts.tsx", "ai-webtoon-studio/src/components/weekChart/InstaWeekPosts.tsx", "four-cut-comics/src/components/weekChart/InstaWeekPosts.tsx"],
  },
  {
    // 통합 받은편지함(comment-inbox) 승인 게시 — instagram-comment-reply 게시 함수(2026-10-21)
    id: "instagram-reply-post",
    source: "instagram-comment-reply/lib/comments/post.ts",
    copies: ["comment-inbox/lib/comments/instagramPost.ts"],
  },
  {
    // instagram-comment-reply memberAccount — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-reply-memberaccount",
    source: "instagram-comment-reply/lib/instagram/memberAccount.ts",
    copies: ["comment-inbox/lib/instagram/memberAccount.ts"],
  },
  {
    // instagram-comment-reply client — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-reply-client",
    source: "instagram-comment-reply/lib/instagram/client.ts",
    copies: ["comment-inbox/lib/instagram/client.ts"],
  },
  {
    // instagram-comment-reply token — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-reply-token",
    source: "instagram-comment-reply/lib/instagram/token.ts",
    copies: ["comment-inbox/lib/instagram/token.ts"],
  },
  {
    // 통합 받은편지함(comment-inbox) 승인 게시 — instagram-comment-reply 게시 함수(2026-10-21)
    id: "instagram-dm-reply-post",
    source: "instagram-comment-reply/lib/dmApp/dm/post.ts",
    copies: ["comment-inbox/lib/dmApp/dm/post.ts"],
  },
  {
    // instagram-comment-reply memberAccount — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-dm-reply-memberaccount",
    source: "instagram-comment-reply/lib/dmApp/instagram/memberAccount.ts",
    copies: ["comment-inbox/lib/dmApp/instagram/memberAccount.ts"],
  },
  {
    // instagram-comment-reply client — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-dm-reply-client",
    source: "instagram-comment-reply/lib/dmApp/instagram/client.ts",
    copies: ["comment-inbox/lib/dmApp/instagram/client.ts"],
  },
  {
    // instagram-comment-reply token — 받은편지함 게시 사본(2026-10-21)
    id: "instagram-dm-reply-token",
    source: "instagram-comment-reply/lib/dmApp/instagram/token.ts",
    copies: ["comment-inbox/lib/dmApp/instagram/token.ts"],
  },
  {
    // 통합 받은편지함(comment-inbox) 승인 게시 — threads-comment-reply 게시 함수(2026-10-21)
    id: "threads-reply-post",
    source: "threads-comment-reply/lib/comments/post.ts",
    copies: ["comment-inbox/lib/comments/threadsPost.ts"],
  },
  {
    // threads-comment-reply memberAccount — 받은편지함 게시 사본(2026-10-21)
    id: "threads-reply-memberaccount",
    source: "threads-comment-reply/lib/threads/memberAccount.ts",
    copies: ["comment-inbox/lib/threads/memberAccount.ts"],
  },
  {
    // threads-comment-reply client — 받은편지함 게시 사본(2026-10-21)
    id: "threads-reply-client",
    source: "threads-comment-reply/lib/threads/client.ts",
    copies: ["comment-inbox/lib/threads/client.ts"],
  },
  {
    // threads-comment-reply token — 받은편지함 게시 사본(2026-10-21)
    id: "threads-reply-token",
    source: "threads-comment-reply/lib/threads/token.ts",
    copies: ["comment-inbox/lib/threads/token.ts"],
  },
  {
    // 통합 받은편지함(comment-inbox) 승인 게시 — youtube-auto-reply 게시 함수(2026-10-21)
    id: "youtube-reply-post",
    source: "youtube-auto-reply/lib/comments/post.ts",
    copies: ["comment-inbox/lib/comments/youtubePost.ts"],
  },
  {
    // youtube-auto-reply memberAccount — 받은편지함 게시 사본(2026-10-21)
    id: "youtube-reply-memberaccount",
    source: "youtube-auto-reply/lib/youtube/memberAccount.ts",
    copies: ["comment-inbox/lib/youtube/memberAccount.ts"],
  },
  {
    // youtube-auto-reply client — 받은편지함 게시 사본(2026-10-21)
    id: "youtube-reply-client",
    source: "youtube-auto-reply/lib/youtube/client.ts",
    copies: ["comment-inbox/lib/youtube/client.ts"],
  },
  {
    // youtube-auto-reply token — 받은편지함 게시 사본(2026-10-21)
    id: "youtube-reply-token",
    source: "youtube-auto-reply/lib/youtube/token.ts",
    copies: ["comment-inbox/lib/youtube/token.ts"],
  },
  {
    // 키 이름표(apiKeys.ts가 다시 내보냄) — 받은편지함 사본(2026-10-21)
    id: "ytreply-api-key-labels",
    source: "youtube-auto-reply/lib/apiKeyLabels.ts",
    copies: ["comment-inbox/lib/apiKeyLabels.ts"],
  },
  {
    // 회원 본인 키 조회(유튜브 토큰 갱신에 필요) — 받은편지함 사본(2026-10-21)
    id: "ytreply-api-keys",
    source: "youtube-auto-reply/lib/apiKeys.ts",
    copies: ["comment-inbox/lib/apiKeys.ts"],
  },
  {
    // 검토 화면 게시물·영상 「묶음 머리」(썸네일 또는 아이콘·제목·건수). 2026-10-21
    id: "review-group-header",
    source: "instagram-comment-reply/components/ReviewGroupHeader.tsx",
    copies: [
      "threads-comment-reply/components/ReviewGroupHeader.tsx",
      "youtube-auto-reply/components/ReviewGroupHeader.tsx",
    ],
  },
  {
    // 주소 #id 묶음을 잠깐 테두리로 강조(대시보드에서 검토 화면으로 넘어왔을 때). 2026-10-21
    id: "hash-highlight",
    source: "instagram-comment-reply/components/HashHighlight.tsx",
    copies: [
      "threads-comment-reply/components/HashHighlight.tsx",
      "youtube-auto-reply/components/HashHighlight.tsx",
    ],
  },
  {
    // AI 동영상(장면 사진 → 5~10초 영상, 회원 본인 키): 모델·단가·길이 목록. 2026-10-22 원스톱 v1.23~v1.25에서 만들어 ai-image-studio를 기준으로 등록, Shots에 사본
    id: "ai-video-models",
    source: "ai-video-studio/lib/video/videoModels.ts",
    copies: ["ai-image-studio/lib/video/videoModels.ts", "shorts-onestop-studio/src/lib/videoModels.ts", "shots/src/lib/video/videoModels.ts", "music-video-studio/src/lib/video/videoModels.ts"],
  },
  {
    // 참고 자료 베끼기 방지(연속 6어절 겹침 찾기·검사 대상 고르기, 순수 함수 — 원스톱 v1.30~v1.31, INSTA v1.57 리메이크 문구, 쇼츠 바이럴 v1.13·유튜브 바이럴 v1.22 대사 넘기기)
    id: "reference-copy-guard",
    source: "shorts-onestop-studio/src/lib/reference.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/referenceCopy.ts", "shorts-viral-studio/src/lib/reference.ts", "youtube-viral-studio/src/lib/reference.ts", "thumbnail-master/src/lib/reference.ts"],
  },
  {
    // 브라우저 안 영상 → 장면 이미지·소리(모노 WAV) 추출(INSTA v1.49~v1.50 운영 검증, 원스톱 v1.29 레퍼런스 쇼츠 대본 따기)
    id: "browser-video-extract",
    source: "insta_auto_poster/src/lib/cardnews/reelsMedia.ts",
    copies: ["shorts-onestop-studio/src/lib/reelsMedia.ts"],
  },
  {
    // 무료 사진 검색(회원 본인 Pixabay·Pexels 키)·고른 사진 받기(INSTA v1.63~v1.64 크롬 검수, 감성 글귀 v1.18 방식에서 옮김)
    id: "free-photo-search",
    source: "insta_auto_poster/src/lib/cardnews/photoSearch.ts",
    copies: ["emotion-writer/src/lib/studio/photoSearch.ts", "threads/src/lib/photoSearch.ts", "threads-content-ops/lib/photoSearch.ts"],
  },
  {
    // 한국어 주제 → 사진 검색용 영어 키워드(AI 없이 단어 사전, 2026-10-23 쓰레드 포스팅 v1.31) — 무료 사진 검색과 함께 씀
    id: "photo-keywords",
    source: "threads/src/lib/photoKeywords.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/photoKeywords.ts", "threads-content-ops/lib/photoKeywords.ts", "emotion-writer/src/lib/studio/photoKeywords.ts"],
  },
  {
    // 상품 제휴 연동(affiliate-clients): 쿠팡 제휴 링크 판정·붙여넣은 HTML 해석(순수 함수, 브라우저 공용). 2026-10-23 등록 — 쇼핑제휴·콘텐츠 운영이 손 복사로 따로 고쳐 쓰던 것을 합침
    id: "affiliate-clients-coupanglinks",
    source: "threads-affiliate-poster/src/lib/affiliate-clients/coupangLinks.ts",
    copies: ["threads-content-ops/lib/affiliate-clients/coupangLinks.ts"],
  },
  {
    // 상품 제휴 연동(affiliate-clients): 쿠팡 파트너스 상품 검색·딥링크·서명. 2026-10-23 등록 — 쇼핑제휴·콘텐츠 운영이 손 복사로 따로 고쳐 쓰던 것을 합침
    id: "affiliate-clients-coupangapi",
    source: "threads-affiliate-poster/src/lib/affiliate-clients/coupangApi.ts",
    copies: ["threads-content-ops/lib/affiliate-clients/coupangApi.ts"],
  },
  {
    // 상품 제휴 연동(affiliate-clients): 쿠팡 블로그용 태그 배너에서 상품 사진 잘라내기. 2026-10-23 등록 — 쇼핑제휴·콘텐츠 운영이 손 복사로 따로 고쳐 쓰던 것을 합침
    id: "affiliate-clients-coupangbanner",
    source: "threads-affiliate-poster/src/lib/affiliate-clients/coupangBanner.ts",
    copies: ["threads-content-ops/lib/affiliate-clients/coupangBanner.ts"],
  },
  {
    // 상품 제휴 연동(affiliate-clients): 알리익스프레스 제휴 링크·상품 상세·사진 찾기. 2026-10-23 등록 — 쇼핑제휴·콘텐츠 운영이 손 복사로 따로 고쳐 쓰던 것을 합침
    id: "affiliate-clients-aliexpress",
    source: "threads-affiliate-poster/src/lib/affiliate-clients/aliexpress.ts",
    copies: ["threads-content-ops/lib/affiliate-clients/aliexpress.ts"],
  },
  {
    // 상품 제휴 연동(affiliate-clients): 토스쇼핑 쉐어링크(고정 IP 프록시) 상품 목록·링크 발급. 2026-10-23 등록 — 쇼핑제휴·콘텐츠 운영이 손 복사로 따로 고쳐 쓰던 것을 합침
    id: "affiliate-clients-toss",
    source: "threads-affiliate-poster/src/lib/affiliate-clients/toss.ts",
    copies: ["threads-content-ops/lib/affiliate-clients/toss.ts"],
  },
  {
    // AI 동영상: 업체 응답 해석·키를 보낼 주소 검사·장면 사진 주소 검사(순수 함수)
    id: "ai-video-parse",
    source: "ai-video-studio/lib/video/videoParse.ts",
    copies: ["ai-image-studio/lib/video/videoParse.ts", "shorts-onestop-studio/src/lib/videoParse.ts", "shots/src/lib/video/videoParse.ts", "music-video-studio/src/lib/video/videoParse.ts"],
  },
  {
    // AI 동영상: Gemini Omni Flash·fal·Replicate 제출·상태 확인·영상 받기(VideoGenError — 각 프로그램이 자기 오류·저장소로 바꿈)
    id: "ai-video-providers",
    source: "ai-video-studio/lib/video/videoProviders.ts",
    copies: ["ai-image-studio/lib/video/videoProviders.ts", "shorts-onestop-studio/src/lib/videoProviders.ts", "shots/src/lib/video/videoProviders.ts", "music-video-studio/src/lib/video/videoProviders.ts"],
  },
  {
    // 게시처 규격(인스타 피드·세로·스토리·유튜브 썸네일·블로그 공유·스마트스토어) 이름·크기, 크기로 규격 고르기 — 변환 스튜디오 ?preset= 값(2026-10-22)
    id: "post-presets",
    source: "image-convert-studio/src/lib/imageTools/postPresets.ts",
    copies: ["emotion-writer/src/lib/studio/postPresets.ts", "four-cut-comics/src/lib/comic/postPresets.ts", "portrait-photo/src/lib/portrait/postPresets.ts", "banana-canvas/src/lib/bnc/postPresets.ts"],
  },
  {
    // 전후 비교 슬라이더 위치 계산(화면 좌표→비율, 키보드 이동, 틀 안 이미지 좌표·색 차이) — 화면 모양은 각 프로그램(2026-10-22)
    id: "compare-slider",
    source: "style-dna-analyzer/src/lib/dna/compare.ts",
    copies: ["banana-canvas/src/lib/bnc/compare.ts", "image-convert-studio/src/lib/imageTools/compare.ts", "portrait-photo/src/lib/portrait/compare.ts"],
  },
  {
    // 프로그램 사이 연계 기록(정해진 값만·첫 1회만 저장·화면 한 번만 보내기)과 받는 쪽 보낸 곳 이름표 `?via=`(2026-10-22)
    id: "link-mark",
    source: "banana-canvas/src/lib/bnc/linkMark.ts",
    copies: ["ai-image-studio/lib/linkMark.ts", "image-convert-studio/src/lib/linkMark.ts", "cinematic-storyboard-studio/src/lib/linkMark.ts", "portrait-photo/src/lib/linkMark.ts", "four-cut-comics/src/lib/linkMark.ts"],
  },
  {
    // 이미지 변환 스튜디오 「○○에 다시 저장」을 받는 쪽 공통(CORS 그 주소만·본문 base64·첫 바이트 형식 판별·이름표) — 저장할 곳은 각 프로그램(2026-10-22)
    id: "resave-receiver",
    source: "four-cut-comics/src/lib/resaveReceiver.ts",
    copies: ["portrait-photo/src/lib/resaveReceiver.ts", "banana-canvas/src/lib/bnc/resaveReceiver.ts", "ai-image-studio/lib/resaveReceiver.ts"],
  },
  {
    // 바나나 캔버스 「이미지 생성」 아이디어 칸으로 보내는 주소(`/studio?idea=`·600자 한도·보낸 곳 `src`) — 문구는 각 프로그램(2026-10-22)
    id: "banana-idea-link",
    source: "style-dna-analyzer/src/lib/dna/bananaIdeaLink.ts",
    copies: ["emotion-writer/src/lib/studio/bananaIdeaLink.ts", "reverse-prompt/src/lib/rpa/bananaIdeaLink.ts", "banana-canvas/src/lib/bnc/bananaIdeaLink.ts", "ai-image-studio/lib/bananaIdeaLink.ts"],
  },
  {
    // 외부 라이브러리 없는 ZIP 만들기(저장 방식·UTF-8 파일 이름) — 여러 크기 한 번에 받기(2026-10-22)
    id: "store-zip",
    source: "portrait-photo/src/lib/portrait/zip.ts",
    copies: ["emotion-writer/src/lib/studio/zip.ts", "shop-detail-page/lib/zip.ts", "video-to-gif/lib/zip.ts"],
  },
  {
    // GIF 자동화 창 → 상세페이지 「GIF 받기」 창으로 브라우저 안에서 GIF 넘기기 약속(postMessage, 허용 주소·메시지 검사). 2026-10-22 상세 v1.28·GIF v1.14
    id: "gif-handoff",
    source: "shop-detail-page/lib/gifHandoff.ts",
    copies: ["video-to-gif/lib/gifHandoff.ts"],
  },
  {
    // 브라우저 안 MP4 만들기(WebCodecs + mp4-muxer, 내레이션·배경음악 섞기). 2026-10-21 엔진 공유 2번 — Shots 「브라우저에서 만들기(무료)」에 사용
    id: "browser-mp4-encoder",
    source: "shorts-onestop-studio/src/lib/render/mp4Encoder.ts",
    copies: ["shots/src/lib/render/mp4Encoder.ts", "lyric-video-studio/src/lib/render/mp4Encoder.ts"],
  },
  {
    // 가사 시간표 읽기·쓰기(.srt·.lrc·붙여넣기, 형식 오류에 너그러움, 탭 싱크·줄 끝·파형 끌기 규칙). 2026-10-21 — 기준 시험 lyric-video-studio/tests/lyrics.test.ts
    id: "lyric-timing",
    source: "lyric-video-studio/src/lib/lyrics.ts",
    copies: ["playlist-channel-studio/src/lib/lyrics.ts"],
  },
  {
    // AI 음악 스튜디오 곡의 Lyria 시간 가사(「[0.0:3.7] 가사」) → 가사 줄 시간표. 2026-10-23 등록 — 가사영상·플레이리스트의 ?ams= 곡 가져오기
    id: "ams-timed-lyrics",
    source: "lyric-video-studio/src/lib/amsLyrics.ts",
    copies: ["playlist-channel-studio/src/lib/amsLyrics.ts"],
  },
  {
    // sunoapi.org Suno 연동(생성·연장·상태 조회·크레딧 등). 2026-10-23 등록 — AI 음악 스튜디오가 음악(SUNO)자동화 코드를 그대로 씀(주인님 결정).
    // 콜백 주소(SUNO_CALLBACK_ORIGIN)는 음악(SUNO)자동화 주소로 고정 — 사본 프로그램은 콜백 대신 상태 조회로 결과를 받는다.
    id: "suno-api-client",
    source: "music/lib/ai/suno.ts",
    copies: ["ai-music-studio/lib/ai/suno.ts", "shots/src/lib/ai/suno.ts"],
  },
  {
    // Suno 시간 가사(get-timestamped-lyrics의 alignedWords) → 줄 단위 가사 시간표. 2026-10-21 등록 — 가사영상 곡 가져오기·플레이리스트 여러 곡 가져오기
    id: "suno-timed-lyrics",
    source: "lyric-video-studio/src/lib/sunoAlign.ts",
    copies: ["playlist-channel-studio/src/lib/sunoAlign.ts"],
  },
  {
    // 유튜브 연결·토큰 갱신·업로드(한 번에 올리기 + 재개 가능 업로드 주소). 2026-10-21 엔진 공유 1번 — 쇼츠 원스톱이 브라우저에서 만든 MP4를 올릴 때 사용
    id: "youtube-upload-client",
    source: "shots/src/lib/youtube/client.ts",
    copies: ["shorts-onestop-studio/src/lib/youtube/client.ts", "lyric-video-studio/src/lib/youtube/client.ts", "playlist-channel-studio/src/lib/youtube/client.ts"],
  },
  {
    // OpenAI 모델별 요청 규칙(추론 모델 GPT-5·GPT-6·o는 temperature 제외·max_completion_tokens) + 모델 안내·거부 이유 문구. 2026-10-20
    // 테스트 기준 naver-blog-seo-studio/tests/openaiRequestParams.test.mjs — 폴더 구조가 달라 사본 테스트는 경로만 다른 자체 파일
    id: "openai-request-params",
    source: "naver-blog-seo-studio/lib/ai/openaiRequestParams.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/ai/openaiRequestParams.ts", "threads-affiliate-poster/src/lib/ai/openaiRequestParams.ts", "style-dna-analyzer/src/lib/ai/openaiRequestParams.ts", "naver-blog-allinone/src/lib/blog/openaiRequestParams.ts", "naver-blog-agent/src/lib/ai/openaiRequestParams.ts", "ai-auto-blog/utils/ai/openaiRequestParams.ts", "tistory-auto-blog/utils/ai/openaiRequestParams.ts", "threads-content-ops/lib/openaiRequestParams.ts"],
  },
  {
    // 회원 연동 정보 공용 저장 — 한 번 연결한 플랫폼 계정(member_platform_accounts)을 모든 프로그램이 함께 사용. 2026-10-20, docs/MEMBER_INTEGRATIONS.md
    id: "member-integrations",
    source: "lib/memberIntegrations.ts",
    copies: ["comment-inbox/lib/memberIntegrations.ts", "threads/src/lib/memberIntegrations.ts", "threads-comment-reply/lib/memberIntegrations.ts", "threads-affiliate-poster/src/lib/memberIntegrations.ts", "threads-content-ops/lib/memberIntegrations.ts", "insta_auto_poster/src/lib/memberIntegrations.ts", "instagram-comment-reply/lib/memberIntegrations.ts", "shots/src/lib/memberIntegrations.ts", "youtube-auto-reply/lib/memberIntegrations.ts", "kakao_auto_poster/src/lib/memberIntegrations.ts", "naver-cafe-poster/src/lib/memberIntegrations.ts", "ai-influencer-studio/src/lib/memberIntegrations.ts", "ai-webtoon-studio/src/lib/memberIntegrations.ts", "shorts-onestop-studio/src/lib/memberIntegrations.ts", "lyric-video-studio/src/lib/memberIntegrations.ts", "playlist-channel-studio/src/lib/memberIntegrations.ts"],
  },
  {
    // 인스타그램 게시(피드 1장·캐러셀 2~10장) — 회원 본인 연결값(insta_accounts, 한 번 연결해 여러 프로그램이 함께 사용). 2026-10-19
    id: "instagram-publish",
    source: "insta_auto_poster/src/lib/instagram/publish.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/publish.ts", "ai-webtoon-studio/src/lib/instagram/publish.ts", "four-cut-comics/src/lib/instagram/publish.ts"],
  },
  {
    // 인스타 예약 게시 시각 검사(10분 뒤~60일·24시간 지연·일시 오류 판정·중복 확인·한국 시간) — 2026-10-20 등록
    id: "insta-schedule-time",
    source: "insta_auto_poster/src/lib/cardnews/schedule.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/schedule.ts", "ai-webtoon-studio/src/lib/instagram/schedule.ts", "four-cut-comics/src/lib/instagram/schedule.ts"],
  },
  {
    // 인스타 예약 회원 실행 방식(Vercel / 내 cron-job.org·일시정지 안전 처리·실패 시 되돌리기) — 2026-10-20 등록. 프로그램 값은 각 폴더 schedulerConfig.ts
    // 2026-10-20 인스타 4개 → 예약 프로그램 15개로 확대(구 id insta-member-scheduler). 값은 같은 폴더 schedulerConfig.ts
    id: "member-scheduler",
    source: "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/memberScheduler.ts", "ai-webtoon-studio/src/lib/instagram/memberScheduler.ts", "four-cut-comics/src/lib/instagram/memberScheduler.ts",
      "threads-content-ops/lib/memberScheduler.ts", "threads/src/lib/posts/memberScheduler.ts", "insta_auto_poster/src/lib/posts/memberScheduler.ts", "threads-affiliate-poster/src/lib/posts/memberScheduler.ts",
      "booking-reminder/lib/schedulerMember/memberScheduler.ts", "crm-google-form/lib/schedulerMember/memberScheduler.ts", "kakao_auto_poster/src/lib/schedulerMember/memberScheduler.ts",
      "naver-cafe-poster/src/lib/scheduledSource/memberScheduler.ts", "stepmail/lib/schedulerMember/memberScheduler.ts", "trending-product-finder/lib/schedulerMember/memberScheduler.ts",
      "youtube-auto-reply/lib/schedulerMember/memberScheduler.ts", "threads-comment-reply/lib/schedulerMember/memberScheduler.ts",
    ],
  },
  {
    // 인스타 예약 회원 cron-job.org 작업 만들기·켜기/끄기·지우기 — 2026-10-20 등록. 실행 주소·작업 이름은 각 폴더 schedulerConfig.ts
    id: "insta-cronjob-org",
    source: "insta_auto_poster/src/lib/cardnews/instagram/cronJobOrg.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/cronJobOrg.ts", "ai-webtoon-studio/src/lib/instagram/cronJobOrg.ts", "four-cut-comics/src/lib/instagram/cronJobOrg.ts"],
  },
  {
    // 30일 정리 기록(usage_logs action cleanup_expired, 회원별 한 줄) — logCleanupUsage·addCleanupCount·ownerFromPath. 2026-10-23 등록
    id: "cleanup-usage-log",
    source: "four-cut-comics/src/lib/cleanupUsageLog.ts",
    copies: [
      "cinematic-storyboard-studio/src/lib/cleanupUsageLog.ts",
      "threads-content-ops/lib/cleanupUsageLog.ts",
      "music/lib/cleanupUsageLog.ts",
      "portrait-photo/src/lib/cleanupUsageLog.ts",
      "banana-canvas/src/lib/cleanupUsageLog.ts",
      "style-dna-analyzer/src/lib/cleanupUsageLog.ts",
      "ai-image-studio/lib/cleanupUsageLog.ts",
      "reverse-prompt/src/lib/cleanupUsageLog.ts",
      "threads-affiliate-poster/src/lib/cleanupUsageLog.ts",
      "trending-product-finder/lib/cleanupUsageLog.ts",
      "youtube-auto-reply/lib/cleanupUsageLog.ts",
      "real_estate_sales/src/lib/cleanupUsageLog.ts",
      "threads/src/lib/cleanupUsageLog.ts",
      "ai-music-studio/lib/cleanupUsageLog.ts",
    ],
  },
  {
    // 성격·운세 4개 「이어서 보기」 링크(타로점·캐릭코드·성격코드 주소, 넘어온 곳 이름) — 2026-10-20 등록
    id: "personality-program-links",
    source: "personality-suite/src/lib/programLinks.ts",
    copies: ["mbti/lib/programLinks.ts", "mbti-character/lib/programLinks.ts", "tarot/lib/programLinks.ts"],
  },
  {
    // 인스타 예약 화면 동작(상태 줄 훅·상태 문구·게시 기록 시각 문구·예약 취소 훅) — 2026-10-20 등록. 화면 모양과 주소는 각 프로그램
    id: "insta-posts-client",
    source: "insta_auto_poster/src/lib/cardnews/instagram/postsClient.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/postsClient.ts", "ai-webtoon-studio/src/lib/instagram/postsClient.ts", "four-cut-comics/src/lib/instagram/postsClient.ts"],
  },
  {
    // 프로그램 공지 띠(메인 공지의 「관련 프로그램」 → 작업 화면 맨 위 최근 공지 1건) — 2026-10-20 등록. 다른 프로그램은 다음 배포 때 사본 추가
    id: "program-notice-banner",
    source: "ai-webtoon-studio/src/components/ProgramNoticeBanner.tsx",
    copies: ["comment-inbox/components/ProgramNoticeBanner.tsx", 
      "instagram-comment-reply/components/ProgramNoticeBanner.tsx",
      "threads-comment-reply/components/ProgramNoticeBanner.tsx",
      "youtube-auto-reply/components/ProgramNoticeBanner.tsx",
      "kakao_auto_poster/src/components/ProgramNoticeBanner.tsx",
      "insta_auto_poster/src/components/ProgramNoticeBanner.tsx",
      "youtube-viral-studio/src/components/ProgramNoticeBanner.tsx",
      "playlist-channel-studio/src/components/ProgramNoticeBanner.tsx",
    ],
  },
  {
    // 인스타 게시 처리(즉시·예약 실행 공통 publishPaths, 게시 기록, 30일 정리) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-posting",
    source: "ai-webtoon-studio/src/lib/instagram/posting.ts",
    copies: ["ai-influencer-studio/src/lib/instagram/posting.ts", "four-cut-comics/src/lib/instagram/posting.ts"],
  },
  {
    // 인스타 게시 기록·예약 등록/취소 API — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-posts-route",
    source: "ai-webtoon-studio/src/app/api/instagram/posts/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/posts/route.ts", "four-cut-comics/src/app/api/instagram/posts/route.ts"],
  },
  {
    // 인스타 예약 실행(Vercel 5분) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-dispatch-route",
    source: "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/dispatch/route.ts", "four-cut-comics/src/app/api/instagram/dispatch/route.ts"],
  },
  {
    // 인스타 예약 실행(회원 cron-job.org 1분) — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-dispatch-member-route",
    source: "ai-webtoon-studio/src/app/api/instagram/dispatch-member/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/dispatch-member/route.ts", "four-cut-comics/src/app/api/instagram/dispatch-member/route.ts"],
  },
  {
    // 인스타 예약 실행 방식 설정 API — 2026-10-20 2단계 등록(기준 웹툰, 카드뉴스는 구조가 달라 제외). 프로그램 값은 각 폴더 schedulerConfig.ts
    id: "insta-scheduler-route",
    source: "ai-webtoon-studio/src/app/api/instagram/scheduler/route.ts",
    copies: ["ai-influencer-studio/src/app/api/instagram/scheduler/route.ts", "four-cut-comics/src/app/api/instagram/scheduler/route.ts"],
  },
  {
    // 외부 주소를 서버에서 가져올 때 내부망·사설 주소 차단(리디렉트마다 재검사, DNS 바꿔치기 방지) — 2026-10-19 기준 등록
    id: "safe-fetch",
    source: "ghost-scraper/src/lib/safeFetch.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/safeFetch.ts", "tistory-auto-blog/utils/safeFetch.ts"], // 2026-10-22 BLC-12: 티스토리 글감 URL 수집
  },
  {
    // 글 생성 결과의 과거 연도 보정(제목·태그는 올해로, 본문은 최신 정보 표기만). 2026-10-22 BLC-12 등록 — 기준은 블로그 에이전트(v2.09 검증)
    id: "year-policy",
    source: "naver-blog-agent/src/lib/yearPolicy.ts",
    copies: ["tistory-auto-blog/utils/yearPolicy.ts", "naver-blog-allinone/src/lib/blog/yearPolicy.ts", "ai-auto-blog/utils/yearPolicy.ts"], // 2026-10-23 BLC-13: 같은 규칙의 기존 파일 2곳을 사본으로 등록(올인원은 주석만 달랐음)
  },
  {
    // 올린 사진을 브라우저 안에서 풀어 보고 깨졌으면 「사진을 읽지 못했어요」(2026-10-19). 사본은 프로그램을 적용할 때마다 추가
    id: "image-file-check",
    source: "portrait-photo/src/lib/imageFileCheck.ts",
    copies: ["insta_auto_poster/src/lib/cardnews/imageFileCheck.ts", "image-convert-studio/src/lib/imageFileCheck.ts", "photo-remake-studio/src/lib/imageFileCheck.ts", "banana-canvas/src/lib/imageFileCheck.ts", "ai-influencer-studio/src/lib/imageFileCheck.ts", "allinone-graphic/src/lib/imageFileCheck.ts", "four-cut-comics/src/lib/imageFileCheck.ts", "naver-blog-agent/src/lib/imageFileCheck.ts"],
  },
  {
    id: "image-file-check-test",
    source: "portrait-photo/tests/imageFileCheck.test.mjs",
    copies: ["image-convert-studio/tests/imageFileCheck.test.mjs", "photo-remake-studio/tests/imageFileCheck.test.mjs", "banana-canvas/tests/imageFileCheck.test.mjs", "ai-influencer-studio/tests/imageFileCheck.test.mjs", "allinone-graphic/tests/imageFileCheck.test.mjs", "four-cut-comics/tests/imageFileCheck.test.mjs", "naver-blog-agent/tests/imageFileCheck.test.mjs"],
  },
  {
    id: "youtube-golden-engine",
    // 2026-10-20 병합 C: 기준을 youtube-channel-consultant → youtube-viral-studio(YOUTUBE 트렌드 분석)로 이동(옛 앱은 주소 전달만)
    source: "youtube-viral-studio/src/lib/youtube/goldenEngine.ts",
    copies: [],
  },
  {
    id: "youtube-data-client",
    source: "youtube-viral-studio/src/lib/youtube/youtubeData.ts", // 2026-10-20 병합 C로 기준 이동
    copies: [
      "shorts-viral-studio/src/lib/youtube/youtubeData.ts",
      // 2단계(2026-10-17): 폴더 구조가 달라 공용 테스트 파일은 넣지 않고 각 프로그램 기존 테스트로 확인
      "ai-auto-blog/utils/ai/youtubeData.ts",
      "tistory-auto-blog/utils/ai/youtubeData.ts",
      "threads-content-ops/lib/youtubeData.ts",
      "naver-blog-agent/src/lib/youtubeData.ts",
      "trending-product-finder/lib/youtube/youtubeData.ts",
    ],
  },
  {
    id: "youtube-data-client-test",
    source: "youtube-viral-studio/tests/youtubeData.test.mjs", // 2026-10-20 병합 C로 기준 이동
    copies: ["shorts-viral-studio/tests/youtubeData.test.mjs"],
  },
  {
    // 이미지 생성 호출(엔드포인트·대기·이미지 받아오기). 프롬프트·모델·화질·온도는 각 프로그램 값 그대로(2026-10-17)
    id: "gemini-image-client",
    source: "ai-image-studio/lib/providers/geminiImage.ts",
    copies: [
      "ai-auto-blog/utils/ai/geminiImage.ts",
      "tistory-auto-blog/utils/ai/geminiImage.ts",
      "naver-blog-seo-studio/lib/ai/geminiImage.ts",
      "naver-blog-auto-poster_app/web/lib/naverBlogAutoPoster/geminiImage.ts",
      "naver-blog-auto-poster_web/web/lib/naverBlogAutoPoster/geminiImage.ts",
      "shots/src/lib/ai/geminiImage.ts",
      "blog_auto_poster/src/geminiImage.ts",
      // 2단계 SNS 생성기 묶음(2026-10-17)
      "insta_auto_poster/src/lib/ai/geminiImage.ts",
      "threads/src/lib/ai/geminiImage.ts",
      "threads-affiliate-poster/src/lib/ai/geminiImage.ts",
      "naver-cafe-poster/src/lib/ai/geminiImage.ts",
      "threads-content-ops/lib/geminiImage.ts",
      // 3묶음 단일 주소형(2026-10-17)
      "kakao_auto_poster/src/lib/ai/geminiImage.ts",
      "stepmail/lib/ai/geminiImage.ts",
      "auto-detail-page/lib/ai/geminiImage.ts",
      "tarot/lib/ai/geminiImage.ts",
      "mbti-character/lib/ai/geminiImage.ts",
      "music/lib/ai/geminiImage.ts",
      "naver-blog-agent/src/lib/ai/geminiImage.ts",
      "naver-blog-allinone/src/lib/blog/geminiImage.ts",
      // 4묶음 A 직접 호출형(2026-10-17)
      "style-dna-analyzer/src/lib/ai/geminiImage.ts",
      "shop-detail-page/lib/ai/geminiImage.ts",
      "blog-content-maker/src/lib/geminiImage.ts",
      "blog-workroom/src/lib/geminiImage.ts",
      "music-video-studio/src/lib/ai/geminiImage.ts",
      "emotion-writer/src/lib/studio/geminiImage.ts",
      "photo-remake-studio/src/lib/geminiImage.ts",
      "shorts-onestop-studio/src/lib/geminiImage.ts",
      // 4묶음 B SDK 사용형(2026-10-18)
      "playlist-channel-studio/src/lib/geminiImage.ts",
      "four-cut-comics/src/lib/geminiImage.ts",
      "thumbnail-master/src/lib/geminiImage.ts",
      "portrait-photo/src/lib/geminiImage.ts",
      "banana-canvas/src/lib/geminiImage.ts",
      "fashion-style/src/lib/geminiImage.ts",
      "allinone-graphic/src/lib/geminiImage.ts",
      "cinematic-storyboard-studio/src/lib/geminiImage.ts",
      "ai-influencer-studio/src/lib/geminiImage.ts",
      // 5묶음 Imagen 교체분(2026-10-18)
      "ai-webtoon-studio/src/lib/geminiImage.ts",
      "ebook-studio/src/lib/geminiImage.ts",
      "detail-page-12p/src/lib/geminiImage.ts",
      "vinyl-lp-studio/src/lib/geminiImage.ts",
    ],
  },
  {
    // 나노바나나 등급별 모델·화질·온도(2026-10-17 주인님 지시로 통합). 파일 이름은 프로그램마다 달라도 내용은 같다
    id: "gemini-image-models",
    source: "ai-image-studio/lib/providers/nanoBananaModels.ts",
    copies: [
      "ai-auto-blog/utils/news/nanoBananaConfig.ts",
      "tistory-auto-blog/utils/news/nanoBananaConfig.ts",
      "naver-blog-seo-studio/lib/ai/nanoBananaConfig.ts",
      "naver-blog-auto-poster_app/web/lib/naverBlogAutoPoster/nanoBananaConfig.ts",
      "naver-blog-auto-poster_web/web/lib/naverBlogAutoPoster/nanoBananaConfig.ts",
      "shots/src/lib/ai/nanoBananaModels.ts",
      "blog_auto_poster/src/nanoBananaConfig.ts",
      // 2단계 SNS 생성기 묶음(2026-10-17)
      "insta_auto_poster/src/lib/ai/nanoBananaModels.ts",
      "threads/src/lib/ai/nanoBananaModels.ts",
      "threads-affiliate-poster/src/lib/ai/nanoBananaModels.ts",
      "naver-cafe-poster/src/lib/ai/nanoBananaModels.ts",
      "threads-content-ops/lib/nanoBananaModels.ts",
      // 3묶음 단일 주소형(2026-10-17)
      "kakao_auto_poster/src/lib/ai/nanoBananaModels.ts",
      "stepmail/lib/ai/nanoBananaModels.ts",
      "auto-detail-page/lib/ai/nanoBananaModels.ts",
      "tarot/lib/ai/nanoBananaModels.ts",
      "mbti-character/lib/ai/nanoBananaModels.ts",
      "music/lib/ai/nanoBananaModels.ts",
      "naver-blog-agent/src/lib/ai/nanoBananaModels.ts",
      "naver-blog-allinone/src/lib/blog/nanoBananaModels.ts",
      // 4묶음 A 직접 호출형(2026-10-17)
      "style-dna-analyzer/src/lib/ai/nanoBananaModels.ts",
      "shop-detail-page/lib/ai/nanoBananaModels.ts",
      "blog-content-maker/src/lib/nanoBananaModels.ts",
      "blog-workroom/src/lib/nanoBananaModels.ts",
      "music-video-studio/src/lib/ai/nanoBananaModels.ts",
      "emotion-writer/src/lib/studio/nanoBananaModels.ts",
      "photo-remake-studio/src/lib/nanoBananaModels.ts",
      "shorts-onestop-studio/src/lib/nanoBananaModels.ts",
      // 4묶음 B SDK 사용형(2026-10-18)
      "playlist-channel-studio/src/lib/nanoBananaModels.ts",
      "four-cut-comics/src/lib/nanoBananaModels.ts",
      "thumbnail-master/src/lib/nanoBananaModels.ts",
      "portrait-photo/src/lib/nanoBananaModels.ts",
      "banana-canvas/src/lib/nanoBananaModels.ts",
      "fashion-style/src/lib/nanoBananaModels.ts",
      "allinone-graphic/src/lib/nanoBananaModels.ts",
      "cinematic-storyboard-studio/src/lib/nanoBananaModels.ts",
      "ai-influencer-studio/src/lib/nanoBananaModels.ts",
      // 5묶음 Imagen 교체분(2026-10-18)
      "ai-webtoon-studio/src/lib/nanoBananaModels.ts",
      "ebook-studio/src/lib/nanoBananaModels.ts",
      "detail-page-12p/src/lib/nanoBananaModels.ts",
      "vinyl-lp-studio/src/lib/nanoBananaModels.ts",
    ],
  },
  {
    id: "youtube-golden-engine-test",
    source: "youtube-viral-studio/tests/goldenEngine.test.mjs", // 2026-10-20 병합 C로 기준 이동
    copies: [],
  },
];

const sync = process.argv.includes("--sync");
const forceTest = process.argv.includes("--test");
const hash = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
let bad = 0;
// 2026-10-21: 사본이 있는 폴더 중 자동 시험이 있는 곳 — 그 사본이 동기화되면(또는 --test) 시험을 돌린다.
// comment-inbox: 댓글·DM 게시 묶음(이중 게시 방지) 시험 26개(가짜 DB·플랫폼, tests/double-post.test.mjs).
const COPY_TEST_DIRS = ["comment-inbox"];
const testDirsToRun = new Set(forceTest ? COPY_TEST_DIRS : []);

for (const m of MODULES) {
  const src = path.join(root, m.source);
  if (!fs.existsSync(src)) {
    console.log(`MISSING  ${m.id}: 기준 파일 없음 ${m.source}`);
    bad++;
    continue;
  }
  const srcHash = hash(src);
  for (const c of m.copies) {
    const dst = path.join(root, c);
    const same = fs.existsSync(dst) && hash(dst) === srcHash;
    if (same) {
      console.log(`OK       ${m.id}: ${c}`);
    } else if (sync) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log(`SYNCED   ${m.id}: ${c} ← ${m.source}`);
      const testDir = COPY_TEST_DIRS.find((d) => c.startsWith(`${d}/lib/`));
      if (testDir) testDirsToRun.add(testDir);
    } else {
      console.log(`DIFF     ${m.id}: ${c} (기준 ${m.source} 과 다름 — 기준을 먼저 고치고 --sync)`);
      bad++;
    }
  }
}

// 이미지 생성 호출 시간 검사(2026-10-17, docs/SHARED_MODULE_CHECKPOINTS.md §2-1):
// generateGeminiImage() 호출마다 최악 소요 시간 = (retries+1) × timeoutMs + 재시도 전 대기(1.5초 × 회차)를 계산해
// Vercel 함수 한도 300초를 넘으면 실패로 본다. 값을 읽지 못한 호출은 CHECK(직접 확인)로만 표시한다.
// 앞뒤의 다른 작업 시간과 한 요청 안의 여러 번 호출은 계산하지 않는다 — 그 부분은 사람이 확인한다.
const LIMIT_SEC = 300;
const DEFAULT_TIMEOUT_MS = 120_000; // 기준 geminiImage.ts 기본값과 같게 유지
const DEFAULT_RETRIES = 1;
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", "public", ".vercel", "tests", "test"]);
const imageModule = MODULES.find((m) => m.id === "gemini-image-client");
const programDirs = [...new Set([imageModule.source, ...imageModule.copies].map((p) => p.split("/")[0]))];

function listCode(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) listCode(path.join(dir, e.name), acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && !/^geminiImage\./.test(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

function callArgs(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return text.slice(start + 1, i);
  }
  return "";
}

// 숫자 또는 같은 파일의 숫자 상수만 읽는다(예: 110_000, 4 * 60_000, IMAGE_TIMEOUT_MS). 못 읽으면 null.
function resolveNumber(expr, text) {
  const e = expr.trim();
  if (/^[\d_\s*+()]+$/.test(e)) return Function(`return (${e.replace(/_/g, "")})`)();
  if (/^[A-Za-z_$][\w$]*$/.test(e)) {
    const m = text.match(new RegExp(`(?:const|let)\\s+${e}\\s*(?::[^=]+)?=\\s*([\\d_\\s*+()]+)[;\\n]`));
    if (m) return resolveNumber(m[1], text);
  }
  return null;
}

// 호출 객체의 최상위 내용만 남긴다(parts 배열 안의 ...펼치기 같은 안쪽 값은 지움).
function topLevel(args) {
  let depth = 0;
  let out = "";
  for (const ch of args) {
    if ("{[(".includes(ch)) depth++;
    if (depth <= 1) out += ch;
    if ("}])".includes(ch)) depth--;
  }
  return out;
}

function option(rawArgs, name, fallback, text) {
  const args = topLevel(rawArgs);
  const m = args.match(new RegExp(`\\b${name}\\s*:\\s*([^,}\\n]+)`));
  if (m) return resolveNumber(m[1], text);
  if (new RegExp(`\\b${name}\\b`).test(args) || /\.\.\./.test(args)) return null; // 줄임 표기·펼치기는 직접 확인
  return fallback;
}

let timeChecked = 0;
let timeUnknown = 0;
console.log("");
for (const dir of programDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of listCode(abs)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).replace(/\\/g, "/");
    for (const hit of text.matchAll(/generateGeminiImage\s*\(/g)) {
      const open = hit.index + hit[0].length - 1;
      const args = callArgs(text, open);
      const line = text.slice(0, hit.index).split("\n").length;
      const timeoutMs = option(args, "timeoutMs", DEFAULT_TIMEOUT_MS, text);
      const retries = option(args, "retries", DEFAULT_RETRIES, text);
      timeChecked++;
      if (timeoutMs == null || retries == null) {
        timeUnknown++;
        console.log(`CHECK    시간: ${rel}:${line} (timeoutMs·retries 값을 읽지 못함 — 최악 시간이 ${LIMIT_SEC}초 안인지 직접 확인)`);
        continue;
      }
      let waitMs = 0;
      for (let a = 1; a <= retries; a++) waitMs += 1500 * a;
      const worst = ((retries + 1) * timeoutMs + waitMs) / 1000;
      const detail = `최악 ${worst}초 = ${timeoutMs / 1000}초 × ${retries + 1}회 + 대기 ${waitMs / 1000}초`;
      if (worst > LIMIT_SEC) {
        console.log(`OVER     시간: ${rel}:${line} ${detail} > ${LIMIT_SEC}초 — timeoutMs를 줄이거나 retries: 0`);
        bad++;
      } else {
        console.log(`OK       시간: ${rel}:${line} ${detail}`);
      }
    }
  }
}
console.log(`이미지 호출 ${timeChecked}곳 시간 검사(직접 확인 ${timeUnknown}곳)`);

// Tailwind 없는 프로그램의 사본 클래스 검사(2026-10-22): 공용 컴포넌트는 Tailwind 클래스로 쓰여 있어,
// Tailwind가 없는 프로그램은 자기 CSS의 범위(scope) 안에 같은 이름을 직접 정의해 둔다.
// 기준이 새 클래스를 쓰기 시작했는데 그 CSS에 없으면 그 프로그램에서만 모양이 빠지므로 문제로 보고한다.
// ignore: 정의하지 않아도 되는 클래스(다른 클래스가 대신 그리는 것). 새 프로그램을 붙이면 아래 표에 한 줄 추가.
const PLAIN_CSS_COPIES = [
  {
    dir: "four-cut-comics",
    css: "four-cut-comics/src/app/globals.css",
    scope: ".fcc-week",
    files: [
      "four-cut-comics/src/components/weekChart/WeekReplyChart.tsx",
      "four-cut-comics/src/components/weekChart/WeekReplyPanel.tsx",
      "four-cut-comics/src/components/weekChart/InstaWeekPosts.tsx",
    ],
    ignore: ["ring-pink-400", "ring-offset-1", "ring-offset-transparent", "from-rose-500", "to-pink-400", "focus-visible:ring-pink-400"],
  },
];

/** t[i]가 '{'일 때 짝이 맞는 '}' 다음 위치(문자열·템플릿 안의 괄호는 건너뜀) */
function skipBraces(t, i) {
  let d = 0;
  while (i < t.length) {
    const ch = t[i];
    if (ch === '"' || ch === "'") { i = t.indexOf(ch, i + 1) + 1 || t.length; continue; }
    if (ch === "`") { i = skipTemplate(t, i); continue; }
    if (ch === "{") d++;
    else if (ch === "}" && --d === 0) return i + 1;
    i++;
  }
  return i;
}
function skipTemplate(t, i) {
  i++;
  while (i < t.length) {
    if (t[i] === "\\") { i += 2; continue; }
    if (t[i] === "`") return i + 1;
    if (t[i] === "$" && t[i + 1] === "{") { i = skipBraces(t, i + 1); continue; }
    i++;
  }
  return i;
}
/** 파일의 className 값에 글자로 적힌 클래스 이름들(변수로 넘긴 것은 제외) */
function classTokens(text) {
  const out = new Set();
  const re = /className=/g;
  let m;
  while ((m = re.exec(text))) {
    const i = m.index + m[0].length;
    const end = text[i] === '"' ? text.indexOf('"', i + 1) + 1 : text[i] === "{" ? skipBraces(text, i) : i;
    const expr = text.slice(i, end);
    const parts = [];
    for (const q of expr.matchAll(/"([^"]*)"|'([^']*)'/g)) parts.push(q[1] ?? q[2]);
    for (const q of expr.matchAll(/`([^`]*)`/g)) parts.push(q[1].replace(/\$\{[^}]*\}/g, " "));
    for (const p of parts) for (const tok of p.split(/\s+/)) if (/^[a-z][a-z0-9:/.\[\]#%-]*$/.test(tok)) out.add(tok);
  }
  return out;
}
const cssEscape = (tok) => tok.replace(/[:/.[\]#%]/g, (ch) => "\\" + ch);
for (const p of PLAIN_CSS_COPIES) {
  const cssPath = path.join(root, p.css);
  if (!fs.existsSync(cssPath)) continue;
  const css = fs.readFileSync(cssPath, "utf8");
  const missing = new Set();
  for (const file of p.files) {
    const fp = path.join(root, file);
    if (!fs.existsSync(fp)) continue;
    for (const tok of classTokens(fs.readFileSync(fp, "utf8"))) {
      if (p.ignore.includes(tok)) continue;
      const sel = `${p.scope} .${cssEscape(tok)}`;
      let at = css.indexOf(sel), found = false;
      while (at >= 0 && !found) { found = /[{:>,\s]/.test(css[at + sel.length] ?? ""); at = css.indexOf(sel, at + 1); }
      if (!found) missing.add(tok);
    }
  }
  if (missing.size) {
    console.log(`FAIL     CSS: ${p.dir} — ${p.css}의 ${p.scope} 안에 정의가 없는 클래스 ${missing.size}개(이 프로그램은 Tailwind가 없어 공용 컴포넌트 모양이 빠짐): ${[...missing].join(" ")}`);
    bad++;
  } else {
    console.log(`OK       CSS: ${p.dir} — 공용 사본 ${p.files.length}개의 클래스가 ${p.scope} 안에 모두 정의됨`);
  }
}

// 동기화된 사본 폴더의 자동 시험(게시 묶음을 고치면 이중 게시 방지 시험이 함께 돈다)
for (const dir of testDirsToRun) {
  const r = spawnSync("npm", ["test"], { cwd: path.join(root, dir), shell: true, encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const pass = out.match(/ℹ pass (\d+)/)?.[1] ?? "?";
  const fail = out.match(/ℹ fail (\d+)/)?.[1] ?? "?";
  if (r.status === 0) {
    console.log(`OK       시험: ${dir} npm test (통과 ${pass}, 실패 ${fail})`);
  } else {
    console.log(`FAIL     시험: ${dir} npm test (통과 ${pass}, 실패 ${fail}) — 실패한 항목:`);
    const failed = [...new Set(out.split("\n").filter((l) => l.startsWith("✖") && !l.includes("failing tests")).map((l) => l.replace(/\s*\([\d.]+ms\)$/, "")))];
    for (const line of failed.slice(0, 10)) console.log(`         ${line}`);
    bad++;
  }
}

if (bad) {
  console.log(`\n${bad}건 문제(사본 불일치·시간 초과·시험 실패·Tailwind 없는 사본 CSS 누락)`);
  process.exit(1);
}
console.log("\n모든 사본이 기준과 같고, 이미지 호출 시간이 300초 안입니다.");
