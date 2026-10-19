const fs = require('fs');

const progs = JSON.parse(fs.readFileSync('scratch_combined_programs.json', 'utf8'));

// Slug to URL mapping
const urlMap = {
  'markdown-studio': 'https://markdown-studio.buylife.xyz',
  'music-player': 'https://music-player.buylife.xyz',
  'shorts-onestop-studio': 'https://shorts-onestop-studio.buylife.xyz',
  'blog-workroom': 'https://blog-workroom.buylife.xyz',
  'allinone-graphic': 'https://graphic.buylife.xyz',
  'playlist-channel-studio': 'https://playlist-channel-studio.buylife.xyz',
  'cinematic-storyboard-studio': 'https://cinematic-storyboard.buylife.xyz',
  'detail-page-12p': 'https://detail-12p.buylife.xyz',
  'prompt-template-studio': 'https://prompt-template.buylife.xyz',
  'persona-style-studio': 'https://persona-style-studio.buylife.xyz',
  'ai-prompt-studio': 'https://ai-prompt.buylife.xyz',
  'yt-playlist-studio': 'https://youtube-playlist.buylife.xyz',
  'vinyl-lp-studio': 'https://vinyl-lp-studio.buylife.xyz',
  'infinite-loop-video': 'https://infinite-loop-video.buylife.xyz',
  'ai-influencer-studio': 'https://ai-influencer.buylife.xyz',
  'music-video-studio': 'https://music-video-studio.buylife.xyz',
  'image-convert-studio': 'https://image-convert-studio.buylife.xyz',
  'suno-music-studio': 'https://suno-music-studio.buylife.xyz',
  'emotion-writer': 'https://emotion-writer.buylife.xyz',
  'ebook-studio': 'https://ebook-studio.buylife.xyz',
  'website-scraper': 'https://website-scraper.buylife.xyz',
  'seo-thumbnail-pro': 'https://seo-thumbnail-pro.buylife.xyz',
  'style-dna-analyzer': 'https://style-dna-analyzer.buylife.xyz',
  'cardnews-studio': 'https://cardnews-studio.buylife.xyz',
  'ai-webtoon-studio': 'https://ai-webtoon-automation.buylife.xyz',
  'naver-blog-allinone': 'https://naver-blog-allinone.buylife.xyz',
  'youtube-channel-consultant': 'https://youtube-channel-consultant.buylife.xyz',
  'youtube-viral-studio': 'https://youtube-viral-studio.buylife.xyz',
  'naver-blog-agent': 'https://naver-blog-agent.buylife.xyz',
  'threads-content-ops': 'https://threads-content-ops.buylife.xyz',
  'shorts-viral-studio': 'https://shorts-viral-studio.buylife.xyz',
  'threads-easy-planner': 'https://threads-easy-planner.buylife.xyz',
  'tistory-auto-blog': 'https://tistory-auto-blog.buylife.xyz',
  'ai-image-studio': 'https://ai-image-studio.buylife.xyz',
  'naver-blog-seo-studio': 'https://naver-blog-seo-studio.buylife.xyz',
  'video-to-gif': 'https://video-to-gif.buylife.xyz',
  'tarot-reading': 'https://tarot-reading.buylife.xyz',
  'mbti-character': 'https://mbti-character.buylife.xyz',
  'personality-code': 'https://personality-code.buylife.xyz',
  'naver-cafe-poster': 'https://naver-cafe-poster.buylife.xyz',
  'kakao-auto-posting': 'https://kakao-auto-posting.buylife.xyz',
  'web-crawler-saas': 'https://web-crawler-saas.buylife.xyz',
  'trending-product-finder': 'https://trending-product-finder.buylife.xyz',
  'threads-affiliate-poster': 'https://threads-affiliate-poster.buylife.xyz',
  'instagram-dm-reply': 'https://instagram-dm-reply.buylife.xyz',
  'threads-comment-reply': 'https://threads-comment-reply.buylife.xyz',
  'instagram-comment-reply': 'https://instagram-comment-reply.buylife.xyz',
  'youtube-auto-reply': 'https://youtube-auto-reply.buylife.xyz',
  'longtail-keyword-expander': 'https://longtail-keyword-expander.buylife.xyz',
  'competitor-analysis': 'https://competitor-analysis.buylife.xyz',
  'booking-reminder': 'https://booking-reminder.buylife.xyz',
  'crm-google-form': 'https://crm-google-form.buylife.xyz',
  'stepmail': 'https://stepmail.buylife.xyz',
  'music-automation': 'https://music-automation.buylife.xyz',
  'shop-detail-page': 'https://shop-detail-page.buylife.xyz',
  'auto-instagram-posting': 'https://insta-auto-poster.buylife.xyz',
  'real-estate-sales': 'https://real-estate-sales.buylife.xyz',
  'auto-shorts-posting': 'https://auto-shorts-posting.buylife.xyz',
  'ai-auto-blog': 'https://ai-auto-blog.buylife.xyz',
  'auto-threads-posting': 'https://threads-auto-poster.buylife.xyz',
  'auto-detail-page': 'https://auto-detail-page.buylife.xyz',
  'ai-task-planner': 'https://ai-task-planner.buylife.xyz',
  'personality-suite': 'https://personality-suite.buylife.xyz',
  'document-translator': 'https://document-translator.buylife.xyz',
  'file-merge': 'https://file-merge.buylife.xyz',
  'naver-blog-auto-poster': 'https://naver-blog-auto-poster.buylife.xyz',
  'naver-blog-auto-poster-web': 'https://naver-blog-auto-poster-web.buylife.xyz',
  'ai-writing-editor': 'https://ai-writing-editor.buylife.xyz',
  'landing-architect': 'https://landing-architect.buylife.xyz',
  'ui-canvas': 'https://ui-canvas.buylife.xyz',
  'ai-slide-builder': 'https://ai-slide-builder.buylife.xyz',
  'ai-web-ui': 'https://ai-web-ui.buylife.xyz',
  'reverse-prompt': 'https://reverse-prompt.buylife.xyz',
  'blog-keyword': 'https://blog-keyword.buylife.xyz',
  'blog-content-maker': 'https://blog-content-maker.buylife.xyz',
  'thumbnail-master': 'https://thumbnail-master.buylife.xyz',
  'ai-mastering-studio': 'https://ai-mastering-studio.buylife.xyz',
  'ai-audio-analyzer': 'https://audio.buylife.xyz',
  'portrait-photo': 'https://portrait-photo.buylife.xyz',
  'banana-canvas': 'https://banana-canvas.buylife.xyz',
  'four-cut-comics': 'https://four-cut-comics.buylife.xyz',
  'fashion-style': 'https://fashion-style.buylife.xyz',
  'photo-remake-studio': 'https://photo-remake-studio.buylife.xyz',
  'ai-doc-chatbot': 'https://ai-doc-chatbot.buylife.xyz'
};

// Reasons dictionary per program slug
const reasonMap = {
  'markdown-studio': '마크다운 원문 편집과 실시간 렌더링을 좌우 2열로 분할하여 문서 집필의 가독성과 집중도를 극대화하기 위해 포커스 스튜디오 채택.',
  'music-player': '음악 재생, 8밴드 EQ 조절, 오디오 비주얼라이저의 직관적 조작을 위해 하이테크 앰프 랙마운트 콘솔 인터페이스 채택.',
  'shorts-onestop-studio': '기획 ➔ 대본 ➔ 음성TTS ➔ 영상 렌더링의 4단계 복합 공정을 초보자도 막힘없이 완주하도록 단계별 스텝퍼 제공을 위해 플로우 위저드 채택.',
  'blog-workroom': '블로그 본문 작성, 문체 분석, 키워드 교정을 장시간 수행할 때 눈의 피로를 줄이고 집필에 몰입할 수 있도록 크림 페이퍼 테마의 포커스 스튜디오 채택.',
  'allinone-graphic': '123종 그래픽 템플릿 탐색과 실시간 브러시/오버레이 편집 캔버스를 넓게 조망할 수 있도록 대형 뷰포트 중심의 크리에이티브 아틀리에 채택.',
  'playlist-channel-studio': '플레이리스트 영상 제작, 트랙 배치, 가사 동기화를 암실 스튜디오 환경에서 정밀 제어할 수 있도록 사이버 네온 다크 콘솔 채택.',
  'cinematic-storyboard-studio': '9컷 시네마틱 장면 구성과 영상 프롬프트 설계를 영화 제작 데스크처럼 조망할 수 있도록 시네마틱 아틀리에 다크 스타일 채택.',
  'detail-page-12p': '이커머스 12단 상세페이지 카피라이팅과 레이아웃 구조 설계를 서류 기획서처럼 정갈하게 작성할 수 있도록 포커스 스튜디오 채택.',
  'prompt-template-studio': '자주 쓰는 프롬프트 템플릿의 변수 치환과 결과 테스트를 한 화면에서 집중적으로 다루기 위해 클린 슬레이트 포커스 스튜디오 채택.',
  'persona-style-studio': '원문과 변환된 페르소나 문체 결과를 좌우로 대조하며 미세 톤 조절 슬라이더를 조작하기 위해 포커스 스튜디오 채택.',
  'ai-prompt-studio': '프롬프트 엔지니어링 구조화, 시스템 메시지 설계, LLM별 파라미터 튜닝을 집중 집필할 수 있도록 포커스 스튜디오 채택.',
  'yt-playlist-studio': '유튜브 16:9 규격 캔버스, 오디오 스펙트럼 10종, WebCodecs GPU 가속 렌더링 콘솔을 유튜브 공식 감성으로 다루기 위해 유튜브 다크 콘솔 채택.',
  'vinyl-lp-studio': '회전하는 턴테이블 LP판 앨범 아트 맵핑과 바이닐 스크래치 사운드 제어의 아날로그 감성을 살리기 위해 바이닐 다크 레트로 콘솔 채택.',
  'infinite-loop-video': '자연스러운 영상 루프 이음새 탐색과 비디오 플레이어 캔버스 미리보기를 돋보이게 하기 위해 네온 루프 시네마 변형 크리에이티브 아틀리에 채택.',
  'ai-influencer-studio': '동일 얼굴(Consistent Face)을 유지하는 가상 인플루언서 화보 갤러리와 패션 룩북 생성을 위해 핑크 화보 스튜디오 변형 크리에이티브 아틀리에 채택.',
  'music-video-studio': '가사, 스토리보드, 비디오 클립 렌더링이 결합된 고난도 MV 제작 공정을 앰프 데크 콘솔처럼 통제하기 위해 사이버 네온 콘솔 채택.',
  'image-convert-studio': '다양한 포맷(WebP/AVIF/PNG) 일괄 변환 상태와 압축률 썸네일 비교를 직관적으로 확인하기 위해 이미지 스튜디오 에디션 아틀리에 채택.',
  'suno-music-studio': 'Suno AI 프롬프트 및 가사 작사를 Suno Create 오리지널 분위기와 완벽히 동기화된 환경에서 기획하기 위해 사이버 수노 다크 스튜디오 채택.',
  'emotion-writer': '감성 문구 작성과 캘리그라피 배경 사진 배치가 따뜻한 종이 감성으로 어우러지도록 소프트 크림 페이퍼 포커스 스튜디오 채택.',
  'ebook-studio': '전자책 장(Chapter)별 구조화, 목차 편성, EPUB/PDF 출판 서식 검수를 전문 출판실처럼 집필하기 위해 전자책 퍼블리싱 포커스 스튜디오 채택.',
  'website-scraper': '수천 건의 웹 스크래핑 데이터 필터링, 정렬, CSV 추출을 한눈에 조망할 수 있도록 고성능 데이터 그리드 기반 스마트 매트릭스 채택.',
  'seo-thumbnail-pro': '유튜브 16:9 규격 썸네일 캔버스 배치와 눈에 띄는 후킹 문구 배치를 직관적으로 시각화하기 위해 프로 썸네일 캔버스 아틀리에 채택.',
  'style-dna-analyzer': '이미지의 조명, 카메라 렌즈, 색감 팔레트 등 DNA 요소를 분해하고 마스터 프롬프트로 역설계하기 위해 스타일 DNA 랩 아틀리에 채택.',
  'cardnews-studio': '인스타그램 1:1 및 4:5 규격 카드뉴스 슬라이드 순서 편집과 비주얼 배치를 최적화하기 위해 인스타 선셋 테마의 크리에이티브 아틀리에 채택.',
  'ai-webtoon-studio': '세로 스크롤 컷 만화 콘티와 캐릭터 일관성 유지 프롬프트 생성을 어두운 작업실에서 조망할 수 있도록 웹툰 스튜디오 아틀리에 채택.',
  'naver-blog-allinone': '키워드 분석 ➔ 개요 ➔ 본문 ➔ 스마트에디터 ONE 발행 4단계를 네이버 친화적으로 완주하도록 네이버 그린 라이트 플로우 위저드 채택.',
  'youtube-channel-consultant': '유튜브 채널 벤치마킹, 성장 분석, 소형 고효율 채널 발굴 데이터를 유튜브 공식 테마에서 분석하기 위해 유튜브 다크 콘솔 스튜디오 변형 채택.',
  'youtube-viral-studio': '조회수 급상승 영상, 떡상 쇼츠, 황금 채널 발굴 데이터를 지표 매트릭스와 영상 뷰어로 결합 분석하기 위해 유튜브 다크 콘솔 채택.',
  'naver-blog-agent': '5단계 AI 에이전트의 시장조사 및 본문·삽화 생성 파이프라인을 시각적으로 모니터링하기 위해 네이버 그린 라이트 플로우 위저드 채택.',
  'threads-content-ops': 'Meta Threads 500자 제약, 6종 페르소나 카드, 멀티 계정 스케줄링을 쓰레드 공식 톤으로 다루기 위해 스레드 바이럴 스튜디오 채택.',
  'shorts-viral-studio': '쇼츠 떡상 공식 분해와 60초 대본 작성을 9:16 모바일 프레임과 함께 다크한 환경에서 기획하기 위해 다크 차콜 플로우 위저드 채택.',
  'threads-easy-planner': '초보자도 원클릭으로 Threads 첫 문장 훅과 CTA를 기획할 수 있도록 미니멀하고 가독성 높은 스레드 바이럴 스튜디오 기획기 변형 채택.',
  'tistory-auto-blog': '글감 수집부터 SEO 원문, AI 삽화, 티스토리 서식 완성까지의 흐름을 티스토리 고유 브랜드 감성으로 완주하도록 티스토리 오렌지 플로우 위저드 채택.',
  'ai-image-studio': '다양한 최신 이미지 생성 모델(Nano Banana 등)과 고화질 갤러리를 럭셔리하게 조망하는 레퍼런스 프로그램으로서 크리에이티브 아틀리에 럭셔리 다크 채택.',
  'naver-blog-seo-studio': '블로그 형태소 분석, 형태소 빈도 차트, 네이버 상위 노출 SEO 알고리즘 지표를 정밀 진단하기 위해 네이버 그린 스마트 매트릭스 채택.',
  'video-to-gif': '상세페이지용 비디오를 브라우저 내 WASM으로 8MB 규격 GIF로 고속 변환하고 화질 사다리를 시각화하기 위해 이커머스 GIF 랩 아틀리에 채택.',
  'tarot-reading': '78장 타로 아르카나 3D 카드 셔플과 플립 애니메이션, 신비로운 해석 가이드북을 위해 미드나잇 퍼플 랩 아틀리에 채택.',
  'mbti-character': '16대 오리지널 성격 캐릭터 도감과 20문항 빠른 검사의 감성적 접근을 위해 따뜻한 파스텔 크림 캐릭터 아틀리에 채택.',
  'personality-code': '4대 이분지표(E/I, S/N, T/F, J/P)의 4색 시그니처 컬러와 16가지 성격유형 정밀 분석을 위해 파스텔 퍼스널리티 랩 아틀리에 채택.',
  'naver-cafe-poster': '가입 카페 목록 조회부터 AI 카페 본문 생성, 예약 등록까지의 포스팅 여정을 네이버 감성으로 안내하기 위해 네이버 카페 그린 플로우 위저드 채택.',
  'kakao-auto-posting': '카카오톡 공식 옐로우 브랜드 감성과 뉴스레터 구독자 관리부터 발송 성과 분석까지 4단계 스텝퍼 완주를 위해 카카오 옐로우 플로우 위저드 채택.',
  'web-crawler-saas': '사이트 계층 구조 탐색 및 다차원 웹 데이터 추출 결과를 직관적인 테이블로 모니터링하기 위해 스마트 매트릭스 다크 슬레이트 채택.',
  'trending-product-finder': '쇼핑 트렌드, 키워드 경쟁강도, 마진율 계산 등 이커머스 소싱 지표를 다각도로 비교 분석하기 위해 스마트 매트릭스 다크 슬레이트 채택.',
  'threads-affiliate-poster': '수익형 제휴 링크(쿠팡/알리)가 포함된 쓰레드 글 작성을 모노블랙 환경에서 집중 작성하기 위해 쇼핑제휴 변형 스레드 바이럴 스튜디오 채택.',
  'instagram-dm-reply': '실시간 인스타그램 DM 문의 내역과 자동 응답 규칙을 모바일 채팅 화면과 유사하게 조작하기 위해 인스타 라이트 스튜디오 댓글 콘솔 채택.',
  'threads-comment-reply': 'Threads 게시물 댓글 목록과 AI 링크 추천 답글을 흑백 모노톤으로 직관적으로 검수하기 위해 쓰레드 모노 스튜디오 댓글 콘솔 채택.',
  'instagram-comment-reply': '인스타 피드 댓글 모니터링과 AI 자동 답글 처리를 인스타 고유의 밝은 피드 감성으로 제어하기 위해 인스타 라이트 스튜디오 댓글 콘솔 채택.',
  'youtube-auto-reply': '유튜브 채널 댓글 관리와 AI 답글 검수를 유튜브 스튜디오 관리자 화면과 일치시키기 위해 유튜브 다크 콘솔 스튜디오 댓글 변형 채택.',
  'longtail-keyword-expander': '키워드 확장 결과 수백 개와 검색량, 난이도 지표를 빠르게 정렬·필터링하기 위해 스마트 매트릭스 기준 구현 스타일 채택.',
  'competitor-analysis': '경쟁사 콘텐츠 구조 분석 및 구글 SERP 순위 매트릭스를 비교 조망하기 위해 스마트 매트릭스 다크 스타일 채택.',
  'booking-reminder': '예약 시간 기준 D-Day별(D-3, D-1, 당일) 알림톡/문자 발송 시퀀스를 타임라인 파이프라인으로 시각화하기 위해 캘린더 리마인드 플로우 위저드 채택.',
  'crm-google-form': '구글폼 설문 접수자 명단, 접수 확인 알림 상태, 고객 CRM 데이터를 밝고 깔끔한 표로 조망하기 위해 라이트 변형 스마트 매트릭스 채택.',
  'stepmail': '1~5차 스텝메일 시퀀스 기획, 발송 일정 스케줄링, 수신자 오픈율 추적을 단계별로 관리하기 위해 스텝메일 마케팅 플로우 위저드 채택.',
  'music-automation': '곡 테마 기획부터 Suno AI 실제 보컬/연주곡 생성 및 음원 파일 보관을 위해 사이버 수노 다크 스튜디오 채택.',
  'shop-detail-page': '15개 섹션 블록 맵과 스마트스토어/쿠팡 860px 규격 상세페이지 원클릭 병합을 전문적으로 다루기 위해 이커머스 셀러 스튜디오 채택.',
  'auto-instagram-posting': '인스타 피드 사진 기획부터 본문 캡션, 해시태그, 예약 포스팅까지의 프로세스를 바이럴 감성으로 완주하기 위해 인스타 바이럴 플로우 위저드 채택.',
  'real-estate-sales': '서울 자치구별 실거래가 추이, 평당가 히트맵, AI 투자 매력도 스코어를 고밀도 표로 분석하기 위해 다크 슬레이트 스마트 매트릭스 채택.',
  'auto-shorts-posting': '6장면 스토리보드 기획, AI 이미지 생성, 음원 결합 및 쇼츠 업로드 파이프라인을 유튜브 감성으로 통제하기 위해 쇼츠 스튜디오 유튜브 다크 콘솔 채택.',
  'ai-auto-blog': '실시간 이슈 수집부터 AI 본문 집필, 고화질 나노바나나 삽화, 브라우저 확장 원클릭 발행까지를 체계화하기 위해 블로그 퍼블리싱 플로우 위저드 채택.',
  'auto-threads-posting': '스레드 글감 선택부터 AI 초안 작성, 1~3장 이미지 첨부, 즉시/예약 발행을 일관되게 진행하기 위해 스레드 바이럴 스튜디오 채택.',
  'auto-detail-page': '상품 핵심 소구점 도출부터 HTML 상세페이지 코드 실시간 프리뷰 및 내보내기를 위해 상세페이지 기획 이커머스 셀러 스튜디오 채택.',
  'ai-task-planner': '할 일 목록, 당일 집중 시간 차트, AI 성과 피드백 리포트를 한 화면에 3열로 조망하기 위해 딥 나이트 네이비 생산성 스마트 매트릭스 채택.',
  'personality-suite': 'Big 5, DISC, 에니어그램 등 7대 종합 심리 검사와 AI 다면 융합 프로필을 따뜻하고 편안하게 진단받을 수 있도록 파스텔 퍼스널리티 아틀리에 채택.',
  'document-translator': '원문과 10개 언어 번역 결과를 좌우로 대조하며 전문 용어집 매칭과 역번역 검수를 편안하게 진행하기 위해 소프트 크림 포커스 스튜디오 채택.',
  'file-merge': '엑셀, CSV, TXT 파일을 브라우저에서 안전하게 머리글 기준으로 병합하고 데이터 미리보기를 제공하기 위해 스마트 매트릭스 라이트 변형 채택.',
  'naver-blog-auto-poster': '데스크톱 앱 환경에서 네이버 블로그 글쓰기 자동 입력을 단계별로 보조하기 위해 플로우 위저드 스타일 권장(현재 정책상 보류).',
  'naver-blog-auto-poster-web': '크롬 웹 확장 환경에서 네이버 블로그 스마트에디터 입력을 보조하기 위해 플로우 위저드 스타일 권장(현재 정책상 보류).',
  'ai-writing-editor': '장문 기사, 에세이, 보고서 등 다양한 문서를 서식 툴바와 함께 드래그 AI 교정으로 작성할 수 있도록 소프트 크림 글쓰기 포커스 스튜디오 채택.',
  'landing-architect': '헤드카피, 문제제기, 해결책, 소셜프루프 등 전환율 높은 랜딩페이지 6단계 구조를 위저드 폼으로 완성하기 위해 플로우 위저드 채택.',
  'ui-canvas': 'UI 컴포넌트 드래그앤드롭 배치, 스크린샷 역분석, 와이어프레임 렌더링을 캔버스 중심으로 제어하기 위해 캔버스 프로 크리에이티브 아틀리에 채택.',
  'ai-slide-builder': '회의록/기획서 문서를 발표용 IR 슬라이드로 장표별 재구성하고 PPTX로 내보내는 과정을 단계별로 안내하기 위해 플로우 위저드 채택.',
  'ai-web-ui': '생성된 React UI 컴포넌트의 실시간 렌더링 프리뷰와 TSX 코드 복사를 직관적으로 제공하기 위해 리액트 쇼케이스 크리에이티브 아틀리에 채택.',
  'reverse-prompt': '업로드한 이미지, 음악, 영상 미디어에서 역생성된 프롬프트 파라미터 구조를 캔버스와 함께 분석하기 위해 크리에이티브 아틀리에 채택.',
  'blog-keyword': '단일 키워드에 대한 연관 검색어, 월간 검색량, 상위 문서 포화도 분석 결과를 표 형태로 조망하기 위해 스마트 매트릭스 채택.',
  'blog-content-maker': '주제 기획 ➔ 초안 작성 ➔ 삽화 생성 ➔ 검수 발행의 단계를 길을 잃지 않고 순차 실행하기 위해 단계별 블로그 콘텐츠 플로우 위저드 채택.',
  'thumbnail-master': '유튜브 시청 타겟 맞춤형 A/B 썸네일 전략과 시각적 후킹 구도를 매거진 형태로 디자인하기 위해 썸네일 매거진 크리에이티브 아틀리에 채택.',
  'ai-mastering-studio': 'WAV 음원 파형 시각화, LUFS 음압 측정, EQ/컴프레서 조절을 전문 마스터링 엔지니어링 데크에서 수행하기 위해 사이버 네온 다크 콘솔 채택.',
  'ai-audio-analyzer': '오디오 음성 파일의 화자 분리, 텍스트 전사, 음향 주파수 진단 결과를 랩 콘솔에서 분석하기 위해 오디오 인텔리전스 랩 사이버 네온 콘솔 채택.',
  'portrait-photo': '인물 사진의 미세한 피부 톤, 조명, 색감 왜곡을 방지하기 위해 중립 그래파이트 톤과 뷰파인더 뷰를 제공하는 포토 스튜디오 아틀리에 채택.',
  'banana-canvas': 'Nano Banana AI 기반 이미지 부분 수정, 스타일 합성, 배경 제거를 캔버스 인터랙션으로 직관 조작하기 위해 바나나 팝 차콜 아틀리에 채택.',
  'four-cut-comics': '3·4·6컷 웹툰 및 인스타툰의 컷별 구도와 말풍선 대사 작성을 만화책 감성으로 조망하기 위해 코믹 파스텔(먹선+크림) 아틀리에 채택.',
  'fashion-style': '사용자 사진에 AI 패션 코디, 헤어, 메이크업을 가상 피팅하고 룩북 매거진으로 비교하기 위해 패션 매거진 미드나잇 아틀리에 채택.',
  'photo-remake-studio': '오래된 흑백 사진 복원, 해상도 4K 업스케일링, 컬러 복원 전후(Before-After) 비교를 위해 포토 리메이크 옵시디언 아틀리에 채택.',
  'ai-doc-chatbot': '내 사내 문서/PDF 기반 RAG 검색 및 최신 Tavily 웹 검색 결과를 출처 링크와 함께 1:1 대화로 확인하기 위해 미드나잇 챗 콘솔 포커스 스튜디오 채택.'
};

// Group by Category
const cats = {};
progs.forEach(p => {
  const c = p.category || '기타';
  cats[c] = cats[c] || [];
  cats[c].push(p);
});

// Category ordering (14 Categories)
const catOrder = [
  '데이터수집·기획',
  '블로그',
  '유튜브',
  '이미지',
  '음악',
  '이커머스',
  '인스타',
  '쓰레드',
  'Tools',
  '네이버',
  'CRM',
  '마케팅(홍보)',
  '멀티미디어',
  '부동산'
];

let md = '# AIMaster 카테고리별 프로그램 디자인 템플릿 총람 및 선정 가이드 (PROGRAM_CATEGORY_TEMPLATE_MAP.md)\n\n';
md += '> **최초 제정**: 2026-10-19 (주인님 지시)\n';
md += '> **문서 목적**: AIMaster 전체 84개 프로그램(새로 추가된 `ai-doc-chatbot` 등 포함)을 **공식 14개 카테고리(분야) 기준으로 완전 분류**하고, 각 프로그램에 적용된 **디자인 템플릿 스타일과 그 템플릿을 선정한 명확한 UX/기능적 이유(Why?)**를 체계적으로 정리하여 **모든 AI CLI(Claude Code, Codex, Antigravity 등)가 향후 개발·개선·리뉴얼 시 나침반으로 상호 참조**할 수 있도록 영구 표준 문서로 제공합니다.\n';
md += '> **연계 문서**: [`DESIGN.md`](../DESIGN.md) (메인 지침), [`docs/DESIGN_TEMPLATE_CATALOG.md`](DESIGN_TEMPLATE_CATALOG.md) (스타일별 카탈로그), [`docs/PROGRAM_CAPABILITY_MAP.md`](PROGRAM_CAPABILITY_MAP.md) (기능 역량 지도)\n\n';

md += '---\n\n';
md += '## 📊 카테고리별 총괄 진척 현황 요약\n\n';
md += '| 번호 | 공식 카테고리명 | 총 프로그램 수 | ✅ 작업 완료 | ⏸️ 보류 | 완료율 (%) | 대표 핵심 디자인 템플릿 스타일 |\n';
md += '|:---:|---|:---:|:---:|:---:|:---:|---|\n';

let totalAll = 0;
let totalDone = 0;
let totalHold = 0;

catOrder.forEach((catName, idx) => {
  const list = cats[catName] || [];
  const doneCount = list.filter(p => !p.status.includes('보류')).length;
  const holdCount = list.filter(p => p.status.includes('보류')).length;
  totalAll += list.length;
  totalDone += doneCount;
  totalHold += holdCount;
  const rate = ((doneCount / (list.length || 1)) * 100).toFixed(1);

  let repTemplate = '다양한 스타일';
  if (catName === '데이터수집·기획') repTemplate = '포커스 스튜디오 & 플로우 위저드 & 캔버스';
  else if (catName === '블로그') repTemplate = '플로우 위저드 & 포커스 스튜디오';
  else if (catName === '유튜브') repTemplate = '유튜브 다크 콘솔 & 플로우 위저드';
  else if (catName === '이미지') repTemplate = '크리에이티브 아틀리에 (다양한 변형)';
  else if (catName === '음악') repTemplate = '사이버 네온 콘솔 & 사이버 수노 다크';
  else if (catName === '이커머스') repTemplate = '이커머스 셀러 스튜디오 & 포커스 스튜디오';
  else if (catName === '인스타') repTemplate = '크리에이티브 아틀리에 & 댓글 콘솔';
  else if (catName === '쓰레드') repTemplate = '스레드 바이럴 스튜디오';
  else if (catName === 'Tools') repTemplate = '포커스 스튜디오 & 아틀리에 파스텔';
  else if (catName === '네이버') repTemplate = '플로우 위저드 & 스마트 매트릭스 (그린)';
  else if (catName === 'CRM') repTemplate = '플로우 위저드 & 스마트 매트릭스';
  else if (catName === '마케팅(홍보)') repTemplate = '스마트 매트릭스 & 플로우 위저드';
  else if (catName === '멀티미디어') repTemplate = '사이버 네온 콘솔 & 크리에이티브 아틀리에';
  else if (catName === '부동산') repTemplate = '스마트 매트릭스 다크 슬레이트';

  md += `| ${idx + 1} | **${catName}** | ${list.length}개 | ${doneCount}개 | ${holdCount > 0 ? holdCount + '개' : '-'} | **${rate}%** | ${repTemplate} |\n`;
});

const totalRate = ((totalDone / totalAll) * 100).toFixed(1);
md += `| **합계** | **전체 14개 카테고리** | **${totalAll}개** | **${totalDone}개** | **${totalHold}개** | **${totalRate}%** | **정상 운영 82개 100% 전수 완료!** |\n\n`;

md += '---\n\n';
md += '## 🎨 8대 주요 디자인 템플릿의 핵심 철학 및 적용 기준\n\n';
md += '다른 CLI가 특정 기능을 개선하거나 신규 프로그램을 설계할 때, 아래 8대 템플릿의 핵심 철학과 목적을 기준으로 최적의 스타일을 선택합니다:\n\n';
md += '1. **포커스 스튜디오 스타일 (Focus Studio)**\n';
md += '   - **핵심 목적**: 텍스트 집필, 마크다운 문서, 번역 대조, 챗봇 대화 등 텍스트 중심 인터랙션의 집중력 극대화.\n';
md += '   - **선정 기준**: 사용자가 텍스트를 장시간 읽거나 작성해야 하는 경우, 좌우 스플릿 뷰(원문 vs 결과) 및 페이퍼/소프트 크림 질감 적용.\n\n';
md += '2. **사이버 네온 다크 콘솔 스타일 (Cyber Neon Dark Console)**\n';
md += '   - **핵심 목적**: 오디오 파형, 이퀄라이저, 마스터링 데크, 음악 플레이어 등 프로 미디어 하이테크 감성 제공.\n';
md += '   - **선정 기준**: 음악/오디오 조작 컴포넌트(슬라이더, 노브, 스펙트럼)가 핵심이며 암실 프로 스튜디오 분위기가 요구되는 경우.\n\n';
md += '3. **플로우 위저드 스타일 (Flow Wizard)**\n';
md += '   - **핵심 목적**: 1-2-3-4 단계별 순차 진행을 통한 초보자 사용성 보장 및 복잡한 AI 파이프라인의 명확한 상태 안내.\n';
md += '   - **선정 기준**: [글감 수집 ➔ AI 초안 ➔ 삽화 생성 ➔ 검수 발행] 등 순서가 엄격히 정해진 원스톱 자동화 도구.\n\n';
md += '4. **스마트 매트릭스 스타일 (Smart Matrix)**\n';
md += '   - **핵심 목적**: 대량의 정량적 데이터(키워드, 크롤링 결과, 실거래가, 생산성 지표)를 한눈에 조망하고 고속 필터링.\n';
md += '   - **선정 기준**: 상단 3~4종 KPI 통계 카드와 다열 데이터 테이블/그리드 전환 뷰가 데이터 분석의 핵심인 경우.\n\n';
md += '5. **크리에이티브 아틀리에 스타일 (Creative Atelier)**\n';
md += '   - **핵심 목적**: 대형 뷰포트 캔버스, 프리셋 갤러리 칩셋, 비주얼 일러스트 생성을 위한 아티스틱 작업실 환경 제공.\n';
md += '   - **선정 기준**: 이미지 생성, 썸네일 디자인, 웹툰/만화, 패션 피팅, 타로/MBTI 등 시각적 캔버스 중심 도구.\n\n';
md += '6. **유튜브 다크 콘솔 스타일 (YouTube Dark Console)**\n';
md += '   - **핵심 목적**: 유튜브 공식 플랫폼과의 완벽한 시각적 일체감(옵시디언 블랙 & 레드 포인트) 및 16:9 비디오 제어.\n';
md += '   - **선정 기준**: 유튜브 영상 렌더링, 채널 분석, 떡상 탐색기, 유튜브 댓글 자동화 도구.\n\n';
md += '7. **이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio)**\n';
md += '   - **핵심 목적**: 네이버 스마트스토어/쿠팡 셀러센터 감성의 신뢰감 있는 화이트/로열블루 서식 및 롱 이미지 병합.\n';
md += '   - **선정 기준**: 쇼핑몰 상품 상세페이지 12~15단 기획, 상품 소싱, 이커머스 전용 콘텐츠 제작 도구.\n\n';
md += '8. **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio)**\n';
md += '   - **핵심 목적**: Meta Threads 공식 미니멀 감성, 500자 글자수 제약, 6종 페르소나 카드 갤러리 제공.\n';
md += '   - **선정 기준**: Threads 계정 운영, 바이럴 기획, 제휴 마케팅 자동 포스팅 도구.\n\n';

md += '---\n\n';
md += '## 📋 카테고리별 프로그램 전수 상세 대조표 (84개 전원)\n\n';

catOrder.forEach((catName, cIdx) => {
  const list = cats[catName] || [];
  md += `### ${cIdx + 1}. [${catName}] 카테고리 (${list.length}개 프로그램)\n\n`;
  md += `| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |\n`;
  md += `|:---:|---|---|:---:|---|---|---|---|\n`;

  list.forEach(p => {
    const url = urlMap[p.slug] || `https://${p.slug}.buylife.xyz`;
    const reason = reasonMap[p.slug] || '프로그램 고유의 작업 흐름과 가독성을 최적화하기 위해 맞춤 템플릿 채택.';
    const linkStr = `[${url}](${url})`;
    md += `| **${p.no}** | **${p.name}** | \`${p.slug}\` | \`${p.version || 'v1.00'}\` | ${linkStr} | **${p.template}** | ${p.theme} | ${reason} |\n`;
  });

  md += '\n';
});

md += '---\n\n';
md += '## 🤝 타 CLI를 위한 실전 협업 및 개발 가이드\n\n';
md += '1. **새로운 기능 추가 또는 리뉴얼 시 템플릿 준수**:\n';
md += '   - 다른 CLI(Claude Code, Codex 등)는 본 문서의 카테고리별 표를 먼저 확인하고, 해당 프로그램에 이미 확정된 템플릿 톤앤매너와 컬러 토큰을 일관되게 유지해야 합니다.\n';
md += '   - 만약 새로운 화면을 추가하더라도 동일 카테고리 내 타 프로그램의 검증된 레이아웃(예: 블로그군 ➔ 플로우 위저드, 텍스트군 ➔ 포커스 스튜디오)을 준용합니다.\n';
md += '2. **템플릿 변경이 필요한 경우**:\n';
md += '   - 임의로 템플릿이나 배경 테마를 변경하지 않고, 본 문서에 기록된 기존 선정 이유를 검토한 뒤 더 나은 방향이 있을 때만 사전 플랜(`docs/PLAN_*.md`)을 수립하여 주인님의 승인을 거친 후 진행합니다.\n';
md += '3. **문서 동기화 의무**:\n';
md += '   - 신규 프로그램이 추가되거나 버전이 변경될 경우, 본 문서(`docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md`), `DESIGN.md`, `docs/DESIGN_TEMPLATE_CATALOG.md`, `docs/PROGRAM_CAPABILITY_MAP.md`를 함께 갱신합니다.\n';

fs.writeFileSync('docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md', md, 'utf8');
console.log('PROGRAM_CATEGORY_TEMPLATE_MAP.md 생성 완료! 파일 크기:', md.length, '자');
