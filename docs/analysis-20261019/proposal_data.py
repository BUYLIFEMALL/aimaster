"""Analyst decisions. IDs stay stable for CLI collaboration; proposals are not implementation approvals."""
PROGRAM_NOTES = '''
ai-writing-editor|리치 문장 편집과 분석 제안을 한 화면에서 처리|분석 제안 적용 전후 변경 추적·충돌 검증 필요|문장별 수정 이력과 원클릭 되돌리기|markdown-studio·persona-style-studio·document-translator
cinematic-storyboard-studio|이미지에서 9컷 콘티와 영상 프롬프트 구성|컷별 인물·소품 연속성은 생성 품질에 의존|캐릭터 시트와 컷 연속성 점검표|ai-webtoon-studio·music-video-studio
landing-architect|기획안과 격리된 HTML 미리보기|미리보기 성공이 실제 전환율·반응형 품질을 보장하지 않음|입력 목표를 검수 항목으로 바꾼 랜딩 QA 체크|ui-canvas·react-ui-showcase·ai-slide-builder
markdown-studio|폴더·수정 이력·다양한 문서 형식·본인 Drive|동기화 충돌과 복원 시 보관기한 유지 검증 필요|충돌 비교 화면·자료 출처/만료 메타데이터|ai-writing-editor·ebook-studio·document-translator
persona-style-studio|페르소나·문체 강도 조절|문체 변환이 숫자·고유명사까지 바꾸는지 검증 필요|사실 잠금과 문체만 변경하는 비교 모드|ai-writing-editor·블로그·SNS
ui-canvas|드래그 UI 설계·구조 복원·PNG/JSON 내보내기|이미지 복원이 접근성·실행 코드 품질을 보장하지 않음|접근성 체크와 컴포넌트 속성 명세 내보내기|landing-architect·ai-web-ui
website-scraper|DNS·리디렉트까지 검사하는 안전 fetch 기반|사이트 구조 변경·차단·출처 검증 비용|다음 실행의 추출 구조 차이를 알려주는 변경 탐지|web-crawler-saas·ebook-studio
web-crawler-saas|AI 기반 구조 탐색과 표 데이터 수집|DBv1.07·코드v1.08 차이의 운영 배포 확인 필요|수집 규칙 버전·깨진 선택자 탐지·샘플 재현|website-scraper·file-merge
ai-prompt-studio|거친 요구를 모델용 프롬프트로 구조화|성공 기준 없이 문구만 좋아질 위험|예시 입력/기대 출력 기반 프롬프트 평가 세트|prompt-template-studio·reverse-prompt
prompt-template-studio|변수형 프롬프트 재사용|모델 버전 변경 후 결과 변동 추적 부족 검토|버전·변수 스키마·평가 결과를 묶은 개인 템플릿|ai-prompt-studio·모든 생성 프로그램
ai-slide-builder|문서를 발표 구조와 PPTX로 변환|요약에서 숫자/근거 누락·슬라이드 잘림 검증|원문 위치 연결·장표별 근거 배지·표 넘침 검사|markdown-studio·ebook-studio·ai-audio-analyzer
ai-web-ui|컴포넌트 미리보기와 TSX 활용|샘플 렌더와 실제 프로젝트 호환성 차이|접근성/의존성/지원 버전 명세 포함 컴포넌트 패키지|ui-canvas·landing-architect
threads-easy-planner|페르소나·훅·본문·CTA 기획|플랫폼 길이 제한과 실제 게시 흐름 연결 검증|글자 수·타래 분할·게시 전 검수 패키지|threads-content-ops·auto-threads-posting
auto-threads-posting|수집·초안·예약 게시|예약 주기는 개선돼도 중복·토큰 만료 회귀는 필요|예약 드라이런과 게시 결과 대조/실패 사유 표준화|threads-easy-planner·threads-comment-reply
threads-comment-reply|사람 승인 중심 답글·텔레그램 검토|플랫폼별 답글 상태·부분 실패·이력 탐색 편차|공통 승인 상태기계와 취소/중복 방지 회귀|youtube-auto-reply·instagram-comment-reply
threads-affiliate-poster|상품·제휴 링크·개인 계정 발행|네이버 조회 결과의 전역 캐시가 개인 데이터 원칙과 충돌|회원별 캐시·출처/광고표시·링크 만료 검수|trending-product-finder·상세페이지 계열
threads-content-ops|페르소나·수집·상품·검토·발행 통합|기능과 설정 수가 많아 처음 쓰기 어려움|입문/전문 모드·누락 연결 진단·실행 전 비용표|threads-easy-planner·댓글 계열
auto-instagram-posting|수집·캡션·카드 이미지·예약|계정/앱 준비와 이미지 규격·게시 오류 부담|규격 사전검사와 수동 확인 가능한 예약 시뮬레이션|cardnews-studio·ai-influencer-studio
ai-influencer-studio|외형·일상 콘티·PPL 컷 제작|다른 컷에서 얼굴/상품 일관성 흔들림|인물사진 로컬 품질검사 재사용·기준 컷 비교|portrait-photo·fashion-style·cardnews-studio
instagram-comment-reply|게시물 댓글 답글 검토·승인|최근 댓글 수 제한과 이력 UX 편차|댓글 페이지 나눔·게시물 썸네일·중복 승인 차단|threads-comment-reply·youtube-auto-reply
instagram-dm-reply|대화 문맥 답변·사람 검토|시간창·수동 담당자 전환·고객정보 노출 검증 필요|응답 가능 시간 표시·담당자 인계·민감정보 가림|crm-google-form·booking-reminder
ai-webtoon-studio|캐릭터 시트·에피소드·컷 생성|키가 없거나 실패해도 외부 무료 이미지 경로로 넘어감|엔진 명시 선택·실패 시 중단·말풍선 레이어 편집|four-cut-comics·cinematic-storyboard-studio
cardnews-studio|본문 기획·타이포·다중 카드 렌더|자동게시와 창작 편집은 다른 자격/검수 경계|폰트 라이선스 명세·카드 재정렬·문구 길이 검사|insta_auto_poster·emotion-writer
ai-auto-blog|자료 수집에서 블로그 원문 생성|수집 출처와 생성 주장 간 연결 추적 필요|문장별 출처·중복 소재/인용 검사·검토 큐|blog-keyword·ai-writing-editor·블로그 게시 계열
blog-keyword|자동완성·경쟁도·이슈·글감 탐색|다른 도구와 점수/키워드 정의가 다름|지표 정의·수집일·검색 출처 표준화|longtail-keyword-expander·competitor-analysis
tistory-auto-blog|원문 기획과 티스토리 발행 흐름|로그인·발행 실패와 생성 성공을 구분해야 함|생성/검토/발행 상태 분리·중복 포스트 차단|ai-auto-blog·blog-content-maker
naver-blog-agent|수집·개인 글쓰기·발행 연계|브라우저/확장 의존과 네이버 에디터 변경|확장 호환 진단·테스트 게시물 없는 모의 입력 검수|naver-blog-allinone·naver-blog-seo-studio
naver-blog-allinone|네이버 작업 흐름을 한곳에서 조합|기능 중복으로 사용자 선택 부담·엔진 편차|단계별 추천 경로와 게시 전 최종 검수|blog-content-maker·naver-blog-agent
blog-workroom|글/이미지를 편집하는 집중형 작업실|내보내기 때 서식과 이미지 보존 차이 검증|플랫폼별 서식 프리플라이트·원문과 결과 비교|ai-writing-editor·blog-content-maker
blog-content-maker|단계형 글 생성과 전용 확장|확장 ZIP/manifest/DB 일치가 별도 운영 과제|사전검사 리포트와 입력 재실행/되돌리기|blog-keyword·naver-blog-seo-studio
naver-cafe-poster|개인 카페 계정의 글감·예약 발행|카페별 등급/규칙·중복 게시·플랫폼 변경|카페별 게시 규칙 체크·발행 전 미리보기/승인|블로그 계열·SNS 콘텐츠 팩
naver-blog-auto-poster|개인 PC 데스크톱 실행 경로|비활성 상품·배포/지원 범위 혼선|재활성화 전 보안·설치/확장 지원 비용 판단|활성 네이버 프로그램으로 안내만 검토
naver-blog-auto-poster-web|사이드패널에서 네이버 입력|비활성 상품·확장 호환 지원 비용|기존 URL 유지·지원 종료/대체 경로 명확화|활성 네이버 프로그램으로 안내만 검토
naver-blog-seo-studio|검색 전략·페르소나 기반 SEO 초안/재작성|SEO 점수를 실제 노출 보장으로 읽을 위험|사실/출처/키워드 과밀 검사·지표 설명 통일|blog-keyword·longtail-keyword-expander
playlist-channel-studio|곡 기획·가사·업로드 문구·썸네일|실제 음악 생성/영상 출력은 별도 단계|트랙 명세·가사·썸네일 원클릭 제작 패키지|suno-music-studio·yt-playlist-studio
thumbnail-master|A/B 문구·이미지 썸네일 생성|AI 이미지 속 한글 오류와 A/B 통제 변수|배경/텍스트 레이어 분리·같은 배경 A/B 비교|seo-thumbnail-pro·youtube-channel-consultant
youtube-channel-consultant|채널 진단·키워드·황금 채널 엔진|재분석마다 본인 할당량 소비·단면 지표|회원별 30일 스냅샷과 전후 변화 비교|youtube-viral-studio·thumbnail-master
youtube-viral-studio|후보 발굴·보관·분석·참고 메모|VPH/점수는 실측 성장률이 아닌 추정·한도 제약|동일 회원 스냅샷 비교·출처/모델/수집 시각 표시|shorts-viral-studio·youtube-channel-consultant
shorts-viral-studio|분석 공식에서 소재·씬·프롬프트 제작|목록 방문 때만 만료 삭제·직접 조회 기한 검사 없음|조회/RLS cutoff·비접속 정리·씬별 예상 길이|shorts-onestop-studio·cinematic-storyboard-studio
auto-shorts-posting|스토리·장면·음악·영상·게시 흐름|다중 제공사·긴 처리·부분 실패 비용|단계별 재개와 이미 완료된 유료 단계 재사용|shorts-viral-studio·cardnews-studio
youtube-auto-reply|사람 승인·댓글 수집·대시보드|기존 개선 일부 완료와 텔레그램 이전 작업 구분 필요|플랫폼 공통 상태/수동 승인 회귀·운영 연결 점검|Threads/Instagram 댓글 계열
seo-thumbnail-pro|주제/문구/시각 설계·캔버스|생성 품질과 실제 클릭률의 인과 혼동|텍스트 직접 합성·모바일 피드 프리뷰·A/B 명세|thumbnail-master·youtube-channel-consultant
shorts-onestop-studio|대본·장면·음성·자막·최종 영상 조합|렌더 자원·자막/음성 길이·작업 취소 정합성|최종 출력 전 길이/무음/자막 넘침 자동검사|shorts-viral-studio·music-video-studio
crm-google-form|폼 접수·다채널 확인·후속 연락|응답ID 중복 처리와 웹훅 요청 제한 미비|원자적 중복 차단·발송 전 작업 선점·수신 동의|booking-reminder·stepmail
kakao-auto-posting|뉴스 수집·요약·채널 발송|채널/수신자 자격과 발송 정책 의존|출처/최신성 배지·수신거부·발송 미리보기|crm-google-form·stepmail
trending-product-finder|트렌드·경쟁 신호·소싱·마진 계산|기회점수는 실제 판매/수익 확정이 아님|가정별 마진 민감도·실측/추정/누락 데이터 구분|상세페이지 3종·threads-affiliate-poster
video-to-gif|브라우저 변환과 결과 용량 제한|대용량 다중 파일의 메모리/대기 비용|파일별 예상 용량·중단/재개·작업 큐|shop-detail-page·infinite-loop-video
shop-detail-page|실제 상품 분석·15구간 개별 생성|고정 섹션·AI 글자/상품 사실 확인|섹션 재정렬·사실 잠금·텍스트 별도 레이어|detail-page-12p·auto-detail-page
auto-detail-page|HTML 상세페이지·여러 이미지 엔진|HTML 외부 리소스/상품 주장·내보내기 검증|검증된 사실 스키마·이미지/HTML 동일 내용 검사|shop-detail-page·trending-product-finder
detail-page-12p|12/9단 구조·사양서/사진 기반 제작|자동 스펙/후기형 문구의 사실성 확인|인증/리뷰를 근거 없이는 확정하지 않는 사실 잠금|shop-detail-page·video-to-gif
stepmail|고객 차수·다중 본인 SMTP·예약|서버 발송 선점·수신거부·반송 대조 필요|수신 동의 원장·부분 실패 재시도·반송 대시보드|crm-google-form·booking-reminder
competitor-analysis|키워드/경쟁사 리서치·보고서|운영v1.07과 회원격리 후보v1.08의 승인/배포 분리|준비된 회원격리·30일 전환안을 승인 후 우선 적용|longtail-keyword-expander·blog-keyword
longtail-keyword-expander|키워드 확장과 담당자용 작업 지시|긴 단계의 진행률·호출비용·재실행 부담|단계별 진행/중단·회원 내 중복 키워드 사전|competitor-analysis·naver-blog-seo-studio
booking-reminder|예약 전후 다채널 알림|발송 후 기록·실패도 발송완료 집합 취급·시간대|선점/채널별 상태·유효기간/정지 검증·KST 고정|crm-google-form·stepmail
ai-image-studio|여러 엔진의 기준 이미지 호출|엔진별 지원 크기/편집/참조 능력 차이|기능 명세로 가능한 옵션만 표시·부분 재생성 비용표|모든 이미지 생성 프로그램의 호출 기준
banana-canvas|참고 이미지·프롬프트·편집 캔버스|반복 수정의 원본 대비 변화/비용 누적|선택 영역 변경 이력·원본 보존·다단계 되돌리기|style-dna-analyzer·allinone-graphic
fashion-style|인물/의상 중심 스타일 제작|인물·의상 로고/디테일 일관성·체형 왜곡|로컬 인물 검사·상품 부분 사실 잠금·전후 비교|portrait-photo·ai-influencer-studio
four-cut-comics|4컷 스토리·캐릭터·합성|캐릭터/말풍선 위치·대사 품질 확인|캐릭터 참조·대사 직접 합성·무빙툰 내보내기|ai-webtoon-studio·shorts-onestop-studio
image-convert-studio|브라우저 이미지 변환·압축|대량 변환 메모리·투명도/색공간 손실 검증|출력 전 투명도·픽셀·예상용량 비교|상품 상세·썸네일·프로필 계열
portrait-photo|규격 저장·로컬 얼굴/품질 점검|머리 추정선은 실측 인증이 아님|서류 규격 프로파일·수동 보정·보존성 검수|fashion-style·ai-influencer-studio·four-cut-comics
style-dna-analyzer|실측 팔레트+이미지 스타일 역분석|AI 스타일 해석과 픽셀 지표의 혼동|실측/추정 라벨·비교 슬라이더·스타일 버전|ai-image-studio·banana-canvas·reverse-prompt
emotion-writer|직접 타이포 합성·여러 비율|긴 문장 잘림·폰트 라이선스·자동배치|문단별 캐러셀·자동 행갈이·가독성 검사|cardnews-studio·kakao-auto-posting
allinone-graphic|여러 직군 템플릿과 부분 편집|템플릿 선택 부담·개별 앱과 기능 겹침|작업 목적별 3문항 추천·원본/수정영역 비교|style-dna-analyzer·banana-canvas
photo-remake-studio|복원·합성·확대·본인별 로컬 보관|보관함은 개수만20개 제한·날짜 만료 없음|30일 조회 차단/기회 정리·파일 보존/비교 명확화|portrait-photo·fashion-style
ai-mastering-studio|브라우저 오디오 처리와 프리셋|음량 차이를 품질 향상으로 오인할 위험|같은 음량 A/B·클리핑/피크·처리 전후 지표|ai-audio-analyzer·yt-playlist-studio
music-video-studio|음악/기획과 영상 장면 제작|여러 엔진·분절된 렌더/저작물 자격|샷별 재개·오디오 길이·소스 권리 명세|suno-music-studio·cinematic-storyboard-studio
suno-music-studio|가사/스타일 기획·복사·보관|기획과 실제 곡 생성 결과 사이 수동 전달|트랙 명세와 가사/사용 허락 묶음 내보내기|music-automation·playlist-channel-studio
music-automation|본인 음악 서비스 키·곡 생성/관리|웹훅 지연·작업 중복·내보내기 권리 확인|작업ID 정합성·재요청 전 상태 확인·트랙 명세|yt-playlist-studio·ai-mastering-studio
vinyl-lp-studio|턴테이블 시각 연출과 영상 출력|로컬 저장 및 긴 출력의 복구성 검증|아트워크/음원 명세·검정화면/무음 사전검사|yt-playlist-studio·playlist-channel-studio
yt-playlist-studio|음원·시각화·챕터·영상 출력|브라우저 장시간 렌더·기기 지원 제한|출력 지원 진단·시간/메모리 예상·실패 재개|suno-music-studio·music-automation·vinyl-lp-studio
ai-audio-analyzer|음성/음악 분류·회의록/프롬프트|API에서 로그인만 확인·프로그램 권한/파일 상한 미검사|공통 권한 게이트·크기/형식 검증·예상 비용|markdown-studio·ai-mastering-studio
infinite-loop-video|무료 로컬 루프 분석·크로스페이드|원본 움직임/오디오 이음새와 긴 처리|끝/시작 미리듣기·작업시간 예측·짧은 샘플|yt-playlist-studio·music-video-studio
music-player|파일 로컬 재생·시각화·EQ|미디어 키/볼륨 등의 기존 완료와 신규 과제 구분|재생목록 명세·분석/마스터링 전후 비교|ai-audio-analyzer·ai-mastering-studio
reverse-prompt|이미지/영상/음악의 역프롬프트|원작과 유사하게 만들기와 원인 분석을 혼동|출력 목적/권리 확인·불확실성·모델별 변환|style-dna-analyzer·suno-music-studio
real-estate-sales|공공 실거래+개인 관심/AI분석|공시가/AI추정/신고일을 현재 호가로 오독 가능|데이터 기준일·누락·가정별 투자 시나리오|document-translator·ai-slide-builder
ai-task-planner|계획·집중 시간·실제 성과 비교|차트/계정위치 회귀는 분석 중 v1.08에서 수정 완료·새 제안과 구분|일괄 품질검사 결과를 개인 실행 계획으로 수동 가져오기|markdown-studio·ai-audio-analyzer
document-translator|용어집·숫자/URL 대조·역번역|스캔 문서 미지원·긴 문서 분할/서식 제한|용어 잠금·원문 대조·구간 재번역 비용 절감|ebook-studio·ai-writing-editor
file-merge|헤더 정합·중복 제거·서식 유지|최근 브라우저 실패는 제품 결함 아닌 실행 순서|결측/중복 품질표·결과 근거 열·안내 개선|web-crawler-saas·crm-google-form
personality-suite|다양한 자기점검·종합 결과|의료/채용 판단으로 오용·척도 혼합 해석|검사별 설명·비교 가능한 범위·개인 정보 내보내기|personality-code·mbti-character
personality-code|빠른/정식 성격유형 검사|심리검사의 확정 진단처럼 읽을 위험|근소 차이·재검사 변동·비진단 안내|personality-suite·mbti-character
mbti-character|오리지널 캐릭터형 공유 결과|성격 유형 단순화·결과 보관/공유 범위 확인|동의 기반 공유 카드·시각 표현만 선택|personality-code·personality-suite
tarot-reading|독자 화풍 이미지·다양한 스프레드|건강/재무 결정의 확정 근거로 오독 가능|재미/자기성찰 안내·생성 단계 비용/재시도 분리|자기성찰 노트·markdown-studio
ebook-studio|자료 수집·목차·장별 구성·EPUB/PDF|스크래핑/생성 API 자격 검사·URL 안전 검사 부족|권한 게이트·safeFetch·출처/그림/폰트 명세|markdown-studio·document-translator·ai-slide-builder
'''

def issue(id,priority,title,targets,status,observation,impact,fix,verify,refs,approval='통상 코드 수정; 이번에는 미구현'):
 return dict(id=id,priority=priority,title=title,targets=targets.split(','),status=status,observation=observation,impact=impact,fix=fix,verify=verify,refs=refs,approval=approval)

ISSUES=[
issue('F-001','P0','공통 DB의 PUBLIC 전체 허용 정책','AIMaster','운영 설정 확인','user_sessions·site_settings·coupons·coupon_usage: FOR ALL TO public USING(true) WITH CHECK(true), anon CRUD grant 모두 true. 정책 이름만 Service role full access.','데이터 접근/변조 차단이 정책 수준에서 무력화될 수 있음. 실제 침해·유출 여부는 조사하지 않음.','각 테이블 공개 읽기/본인 읽기/관리자 쓰기 역할 분리. 불필요 grant 회수. service_role은 정책 없이 RLS 우회하므로 public 허용으로 대체하지 않음.','anon·회원A/B·관리자별 SELECT/INSERT/UPDATE/DELETE 허용/거부 SQL 테스트. 운영 복제/롤백 검사 후 승인된 마이그레이션.',['db-metadata.json','../../../supabase/schema.sql:340'],'DB 정책/권한 변경 사전 승인 필요'),
issue('F-002','P0','eBook 직접 API의 로그인·프로그램 자격 강제 누락','ebook-studio','코드 확인·무해한 운영 응답 확인','scrape 라우트는 인증 호출 없음. cover/outline/chapter는 getUser()가 null이어도 즉시 차단하지 않고 clientKey 입력 경로를 계속 수행. 앱 layout 보호는 API 보호가 아님. 빈 urls/빈 title 비로그인 운영 요청은401 대신400.','직접 API 경로에서 미가입/정지/기간 만료 정책 누락. 유효 키·유료 생성 호출은 재현하지 않음.','모든 작업 API 시작에 checkProgramAccessApi, JSON401/403. 회원 본인 키만 사용, 익명 clientKey 경로로 자격을 건너뛰지 않음.','비로그인401, 정지/권한만료403, 정상회원 본인 키·유효 입력. 모든 AI 호출은 모의 응답.',['../../../ebook-studio/src/app/api/scrape/route.ts:3','../../../ebook-studio/src/app/api/ai/cover/route.ts:8','http-evidence.json']),
issue('F-003','P0','eBook URL 수집의 SSRF 방어 미비','ebook-studio','코드 확인','new URL 뒤 표준 fetch, 사설 IP/DNS/리디렉트 검증 없이 본문 전체 res.text(). 실제 내부망 접근은 시험하지 않음.','회원 입력 URL이 서버의 내부 주소/리디렉트로 향하거나 큰 본문을 읽을 위험.','Website Scraper safeFetch를 기준 후보로 비교. 공개 IP 고정·리디렉트 매 단계 재검증·응답 바이트 상한·전체 마감시간.','테스트용 fake DNS/redirect/oversize fixtures로 차단 확인. 실제 내부망/메타데이터 주소를 호출하지 않음.',['../../../ebook-studio/src/app/api/scrape/route.ts:29','../../../ebook-studio/src/app/api/scrape/route.ts:48','../../../ghost-scraper/src/lib/safeFetch.ts:77']),
issue('F-004','P1','네이버 검색/트렌드 캐시 회원 간 공유','threads-affiliate-poster','코드·운영 정책 확인','캐시 키에 user_id 없음, admin 클라이언트 조회/upsert. 운영 두 캐시 테이블 owner 컬럼 없음·authenticated SELECT true. 트렌드 호출 키는 이미 본인 키로 수정돼 있으므로 운영자 키 폴백으로 잘못 분류하지 않음.','본인 계정·키로 만든 조사 결과가 다른 회원에게 재사용되는 최상위 원칙 위반. TTL 재사용 제한은30일 물리 삭제 증거가 아님.','회원 소유자/키 네임스페이스·RLS·원래 생성일 cutoff·정리 작업을 설계. 무소유 기존 자료 임의 귀속 금지.','같은 검색을 A/B가 실행해도 서로 결과/시각을 보지 않음. 재저장으로 보관기간 연장 불가.',['../../../threads-affiliate-poster/src/lib/naver/searchCache.ts:8','../../../threads-affiliate-poster/src/lib/naver/trendCache.ts:13','../../../threads-affiliate-poster/src/lib/actions/trend.ts:30','db-metadata.json'],'DB 변경/기존 자료 처리 승인 필요'),
issue('F-005','P1','쇼츠 프로젝트 직접 조회의 30일 경계 누락','shorts-viral-studio','코드·운영 정책 확인','listProjectsAction에서만 삭제. getProjectAction/update는 생성일 조건 없음. 운영 RLS는 owner 조건만. 비접속 만료 정리 보장 없음.','오래된 ID 직접 조회/수정 및 장기 미접속 자료 잔존 가능. 전체 pg_cron2개만으로 Vercel 외부 정리 부재를 단정하지 않음.','직접/목록/수정 모두 cutoff·RLS, 비접속 정리, 삭제오류 처리. 저장 프롬프트가 회원 설정인지 생성물인지 별도 분류.','고정시계로29일23:59/30일 경계·직접ID·수정·조회실패 검증, 실제 정리 등록/성공 증거.',['../../../shorts-viral-studio/src/lib/actions/projects.ts:57','../../../shorts-viral-studio/src/lib/actions/projects.ts:82','../../../shorts-viral-studio/supabase/migrations/0001_svs_projects.sql:26'],'RLS/자동정리 DB 변경 승인 필요'),
issue('F-006','P1','포토 리메이크 로컬 보관함에 날짜 만료 없음','photo-remake-studio','코드 확인','IndexedDB는 회원 UUID별로 잘 분리됨. 다만 listSaved는 날짜 필터 없이 반환, saveLocal은 개수20개만 제한.','1개만 저장해도 오래된 생성물이 계속 보관될 수 있음. 회원별 분리는 완료된 장점.','원래 createdAt 기반30일 조회차단·진입/저장 시 기회정리, 브라우저 미실행 중 물리 삭제 한계를 명시. 엄격한 서버 삭제가 필요하면 서버 저장 별도 설계.','가짜 IndexedDB/고정시계로 경계·다른 회원·개수 제한·날짜 갱신 금지 확인.',['../../../photo-remake-studio/src/lib/remake/history.ts:8','../../../photo-remake-studio/src/lib/remake/history.ts:12'],'기존 로컬 자료 자동 삭제 범위 승인 확인'),
issue('F-007','P1','CRM 웹훅 재전송이 접수/유료 발송을 중복 실행','crm-google-form','코드·인덱스 메타데이터 확인','responseId를 저장만 하고 중복 검증/선점 없이 insert 뒤 dispatch. 조회한 운영 인덱스에 응답ID unique 없음.','Apps Script 재전송/중복 트리거가 문자·알림톡 중복 비용으로 이어질 수 있음. 실제 발송은 시험하지 않음.','source+responseId unique, idempotency 저장/선점 후 처리, 응답ID 누락 처리 규칙, 채널별 발송 상태.','같은 응답10회/동시2회 fake sender로 실제 전송효과1회. 장애 후 재시도도 이미 보낸 채널 제외.',['../../../crm-google-form/app/api/webhooks/form-submit/[token]/route.ts:58','../../../crm-google-form/supabase/migrations/0001_crm_google_form_tables.sql','db-detail-evidence.json'],'유니크 제약 DB 변경 사전 승인 필요'),
issue('F-008','P1','예약 알림의 선점 전 발송·실패 재시도 누락','booking-reminder','코드 확인','alreadySent에 status 구분 없음. 외부 발송 후 unique(rule_id,reservation_id) 로그 insert, insert 오류 미검사. 겹친 실행은 둘 다 발송 후 하나만 기록될 수 있고 failed도 다음번 제외.','중복 요금/누락 알림·부분 성공 채널 재발송 위험. 실제 중복 발송 사고를 관찰한 것은 아님.','DB 작업 선점/채널별 상태·제공사 idempotency 가능한 경우 사용, 실패만 제한 재시도, insert 오류 처리.','동시 워커2개·발송후응답유실·이메일성공/SMS실패 fixture. 동일 채널 중복0·실패만 재시도.',['../../../booking-reminder/lib/booking/reminderDispatch.ts:68','../../../booking-reminder/lib/booking/reminderDispatch.ts:158'],'상태/선점 테이블 변경 시 사전 승인 필요'),
issue('F-009','P1','예약 메시지의 시간대가 서버 기본값 의존','booking-reminder','코드 확인·순수 계산 재현','fillTemplate의 toLocaleString(ko-KR)에 timeZone 없음. UTC 서버면 한국09시 예약을00시로 표시.','고객에게 잘못된 예약 시각을 안내할 수 있음. 운영 발송 메시지는 읽지 않음.','Asia/Seoul 명시·저장 UTC/표시 KST·날짜 경계 단위 검사.','2026-10-19T00:00Z가 한국09:00로 표시; UTC/KST 두 프로세스에서 동일 결과.',['../../../booking-reminder/lib/booking/reminderDispatch.ts:31']),
issue('F-010','P1','예약 Cron의 현재 회원 자격 재확인 누락','booking-reminder','코드 확인','실행 규칙은 활성 여부+핸드폰 유무만 검사. 정지·현재 구독/등급/사용기간 재판정 없이 회원 키로 발송 가능.','수동 화면에서 차단된 회원의 예전 예약 작업이 계속 실행될 가능성.','Cron에서도 공용 자격 판정. 관리자/FREE 예외 순서 유지. 정지·만료면 발송 보류하고 사유 기록.','정상/만료/정지/관리자/무료 가입 회원 fixture, 금지 케이스 발송함수0회.',['../../../booking-reminder/app/api/cron/reminder/route.ts:56']),
issue('F-011','P1','Cron 인증 비밀 누락 시 fail-closed 아님','booking-reminder,stepmail,crm-google-form','조건부 코드 결함','일부 isAuthorized는 헤더와 Bearer ${process.env.CRON_SECRET}를 바로 비교. 비밀이 없으면 문자열 Bearer undefined가 비교 대상. 현재 운영 변수 설정 여부·값은 조회하지 않음.','환경변수 누락 배포에서 인증이 예측 가능한 문자열이 됨.','비밀 문자열 존재/공백 검증 실패 시 서버설정오류로 종료, 헤더 비교 이전 차단.','CRON_SECRET 미설정/공백·틀린 값은 항상거부. 실제 운영 Cron 호출/발송 없이 함수 수준 검사.',['../../../booking-reminder/app/api/cron/reminder/route.ts:32','../../../stepmail/app/api/cron/dispatch/route.ts:23','../../../crm-google-form/app/api/cron/followup/route.ts:26']),
issue('F-012','P1','웹툰 생성 실패/키 미등록 뒤 다른 외부 엔진 자동 호출','ai-webtoon-studio','코드 확인','이미 실패 원인 안내는 추가됨. 그러나 키가 없거나 Gemini 실패 뒤 Pollinations/Flux URL을 만들고 prompt를 보내는 경로는 남음.','본인 키 미등록 시 중단 원칙과 충돌·선택하지 않은 제공사로 프롬프트 전송·품질/개인정보 처리 경계 변경.','키 없음/인증/결제/안전차단은 중단. 무료 대체도 별도 엔진의 명시 선택·개인 계정 조건·전송 안내를 먼저 정의.','키누락/401/429/안전차단/timeout 각 경우 외부 대체 호출0회, 사용자 선택 없이는 엔진 변경 안 함.',['../../../ai-webtoon-studio/src/lib/imageGen.ts:90']),
issue('F-013','P1','오디오 분석 API가 로그인만 확인','ai-audio-analyzer','코드 확인','getCurrentUser는 auth.getUser만 실행. analyze/user-key에 프로그램 자격 판정 호출 없음.','정지/사용기간 만료 회원이 직접 API로 작업 가능한 구조. 본인 키 조회는 이미 적용돼 운영자 키 문제와 다름.','공통 checkProgramAccessApi를 분석·키쓰기 진입에 사용하고 JSON401/403 통일.','미로그인/정지/만료/정상 회원 fake provider로 자격 매트릭스 검증.',['../../../ai-audio-analyzer/src/lib/auth.ts:3','../../../ai-audio-analyzer/src/app/api/analyze/route.ts:9']),
issue('F-014','P1','오디오 업로드의 서버 파일 상한/종류 검증 부족','ai-audio-analyzer','코드 확인','File 존재만 검사 뒤 전체 arrayBuffer·Buffer·base64를 메모리에 복사. mode/context 길이/파일 size/type allowlist 검사 없음.','대용량 입력의 메모리/요청 한도 실패·AI 비용 예측 어려움. 프론트 제한만으로 API 보호 불가.','서버 크기/MIME/모드/문자수 제한, 업로드/모델 한도에 맞는 분할, 시간 제한·오류 안내.','상한 전후/잘못된 MIME/가짜 확장/빈 파일/예상모드, provider 호출 전 차단.',['../../../ai-audio-analyzer/src/app/api/analyze/route.ts:28','../../../ai-audio-analyzer/src/app/api/analyze/route.ts:41']),
issue('F-015','P2','공용 모듈 시간 검사 마지막 성공 문구가 수동확인을 숨김','AIMaster','검사 실행 확인','check-shared-modules 실행은 사본 전부 일치. 이미지49곳 중6곳은 timeout/retries 계산 불가 CHECK인데 마지막은 모두300초 안이라고 출력.','자동 분석을 실행 검증으로 오독해 CI/인수인계가 과신될 수 있음. 실제6곳 시간초과를 의미하지 않음.','verified/manual/failed 개수와 종료 정책 분리·동적 식 메타데이터 등록.','49=검증43+수동6을 명시·manual6 확인 전 전체 완료 표현 금지.',['../../../scripts/check-shared-modules.mjs','shared-module-check.txt']),
issue('F-016','P1','경쟁사 회원격리 v1.08 후보와 운영 v1.07 간 승인 대기','competitor-analysis','DB·코드·기존 인수인계 대조','DB는v1.07, 소스APPv1.08. 회원격리/30일 수정안의 운영 승인이 대기 중이며 기존 회사정보 테이블은 owner 컬럼 없음. 버전만 올리면 해결되지 않음.','사용자는 새 격리 정책이 이미 적용됐다고 오해할 수 있음. 준비된 후보를 중복 개발할 위험.','기존 MEMBER_RETENTION_HANDOFF를 검토해 승인 범위 확정→마이그레이션/실제 자격 테스트→배포/DB 동기화.','정책/행소유/30일/정리 검증과 실제 배포 SHA·DB version 일치.',['../../../competitor-analysis/docs/MEMBER_RETENTION_HANDOFF_20261016.md','../../../competitor-analysis/src/lib/version.ts','catalog-db.json'],'운영 DB/기존 데이터 처리 승인 대기; 자동 실행 금지'),
issue('F-017','P2','웹 크롤러 DB/코드 버전 차이','web-crawler-saas','메타데이터 대조','DBv1.07, 고정 소스APPv1.08. package는0.1.0. 미배포/표시누락/분기차이 중 원인을 배포기록으로 확인해야 함.','어느 기능이 운영 중인지 판단하기 어려움. 버전 불일치 자체로 기능 고장을 단정하지 않음.','Vercel source SHA/노출 버전/기존 handoff 확인 후 실제 운영 코드와 동기화.','운영 SHA·APP·programs.version 매트릭스, 실제 회원 화면 확인.',['../../../web-crawler/webapp/src/lib/version.ts','catalog-db.json']),
issue('F-018','P2','개선 원장의 과거 미완료와 현재 완료 상태 혼재','AIMaster','문서·최신 코드 대조','부동산 GET 자동 분석 제거(v1.13), eBook/웹툰 실패 안내, SNS5분 예약, YVS보관 제한안 등이 기존 원장의 미해결 문장과 병존. 역량지도는82개·구버전 값.','다른 CLI 중복개발·사용자 혼선·이미 해결한 문제의 재등장.','안정 ID별 최신상태·검증SHA/일자·원장폐기 아닌 superseded 연결·카탈로그 자동 대조.','대표 해결항목이 신규 미해결 목록에 다시 들어가지 않는 문서 일관성 검사.',['../../../docs/PROGRAM_CAPABILITY_MAP.md','../../../real_estate_sales/src/app/(dashboard)/listings/[id]/page.tsx:26','../../../youtube-viral-studio/docs/IMPROVEMENT_BACKLOG.md'])
]

MERGES=[
dict(id='M-01',name='콘텐츠 리서치·SEO 기획실',sources=['blog-keyword','longtail-keyword-expander','competitor-analysis','naver-blog-seo-studio'],value='발굴→경쟁 근거→롱테일 묶음→편집 지시서까지 한 번의 기획',keep='키워드 탐색·키워드별 독립 결과·경쟁 근거·SEO 페르소나',remove='중복 검색/지표 혼동/복사 반복',mvp='수동 입력/가져오기한 키워드 묶음으로 비교·브리프 출력만',risk='회원격리 F-004/F-016 해결 선행·추가 수집을 자동 실행하지 않음',effort='L',gate='검색 중복률·브리프 작성시간을 본인 작업의 전후 기준으로 비교',phase='2차'),
dict(id='M-02',name='유튜브 성장·제작 기획실',sources=['youtube-viral-studio','youtube-channel-consultant','shorts-viral-studio','seo-thumbnail-pro'],value='후보를 왜 선택했는지 근거가 연결된 영상 기획',keep='황금 채널 기준 엔진·후보보관·바이럴 분석·썸네일 전략',remove='검색 중복·추정지표 오독·후보 전달 단절',mvp='회원이 고른 후보1개→채널 근거→대본 브리프→썸네일 문구; 검색은 별도 확인',risk='할당량/저작물 권리·회원별 저장·지표 정의',effort='L',gate='참조ID 연결률100%·모의 동일 검색 중복0·유료 생성 단계별 확인',phase='2차'),
dict(id='M-03',name='셀러 상품 출시 스튜디오',sources=['trending-product-finder','shop-detail-page','detail-page-12p','auto-detail-page','video-to-gif','threads-affiliate-poster'],value='소싱 검토→사실 확인→상세페이지→광고 소재까지 한 상품 명세 사용',keep='마진 계산·실제 사진 분석·구간별 재생성·HTML/이미지 내보내기·GIF용량제한',remove='서로 다른 상품스펙·가짜 후기/인증·중복 이미지 생성',mvp='사실확정 상품명세→5개 핵심 섹션+GIF 미리보기; 게시 없음',risk='확인 안 된 스펙은 미확인으로 고정·키/제휴계정 개별·추가 비용',effort='XL',gate='확정한 스펙 변경0·재생성은 선택구간만·동일 상품 명세 추적',phase='3차'),
dict(id='M-04',name='고객 접수·예약 케어',sources=['crm-google-form','booking-reminder','stepmail','instagram-dm-reply'],value='접수부터 예약 확인·후속 응대까지 누락/중복 줄이기',keep='폼 실시간 접수·다채널 리마인드·차수 관리·사람 응대',remove='이중발송·정지회원 작업·수신거부 분산',mvp='접수→예약 카드→보낼 메시지 검토 큐; 실제 발송은 후속 승인',risk='F-001/F-007~F-011 선행·연락처/동의·메시지별30일 분류',effort='XL',gate='동시/재전송 fixture 외부효과1회·취소/거부 발송0·채널별 부분 실패 복구',phase='3차'),
dict(id='M-05',name='통합 댓글·문의 검토함',sources=['threads-comment-reply','instagram-comment-reply','youtube-auto-reply','instagram-dm-reply'],value='여러 플랫폼 검토 대기를 한 흐름에서 판단',keep='사람 승인·원본 문맥·텔레그램 검토·플랫폼별 정책',remove='검토 화면 왕복·상태명 차이·중복 승인',mvp='처음에는 데이터 패키지 가져오기 기반 읽기 전용 통합 큐·플랫폼별 분리',risk='새 앱 자체에 각 플랫폼 본인 연동·기존 프로그램 API 직접 호출 금지·DM시간창 유지',effort='L',gate='승인 전 외부게시0·같은 댓글 두 번 승인해도1회·계정 혼합0',phase='2차'),
dict(id='M-06',name='음악 채널 제작 스튜디오',sources=['suno-music-studio','playlist-channel-studio','music-automation','ai-audio-analyzer','ai-mastering-studio','yt-playlist-studio','vinyl-lp-studio'],value='곡 기획→음원 점검→영상·챕터·썸네일 한 세트',keep='가사/스타일·트랙메타·음량 비교·시각화·챕터·LP연출',remove='곡 순서/길이 불일치·무음 출력·반복 입력',mvp='본인 음원2곡+트랙 JSON→음량 점검→1개 시각화·챕터 출력',risk='음악 서비스별 API/권리·WebCodecs지원·긴 처리; 서버 비싼 렌더 기본화 금지',effort='XL',gate='샘플 출력 오디오트랙 있음·시간 오차 허용치 정의·챕터 총길이 일치',phase='3차'),
dict(id='M-07',name='캐릭터 스토리·무빙툰 스튜디오',sources=['four-cut-comics','ai-webtoon-studio','ai-influencer-studio','cinematic-storyboard-studio','shorts-onestop-studio'],value='캐릭터 기준표를 유지하며 만화/콘티/쇼츠로 전개',keep='4컷 간단 기획·캐릭터 시트·콘티·직접 대사 레이어·영상 조합',remove='얼굴/의상 불일치·말풍선 깨짐·다시 처음부터 생성',mvp='캐릭터1명·4컷·텍스트 별도 합성→가벼운 무빙툰',risk='F-012 선행·얼굴 점 비교는 동일인 인증이 아님·생성 컷수 비용',effort='XL',gate='대사 원문 보존100%·참조캐릭터/컷 연결·재생성 단위1컷',phase='3차'),
dict(id='M-08',name='브랜드 비주얼 작업실',sources=['style-dna-analyzer','banana-canvas','allinone-graphic','thumbnail-master','emotion-writer','image-convert-studio'],value='브랜드색/폰트/안전영역을 여러 소재 규격에 일관 적용',keep='실측 팔레트·부분 편집·다양한 템플릿·직접 타이포·로컬 압축',remove='소재마다 색/글꼴 흔들림·텍스트 오류·불필요 재생성',mvp='브랜드 설정→같은 배경으로1:1/4:5/16:9 레이아웃·텍스트 직접 합성',risk='프로그램별 이미지 프롬프트 컨셉은 보존; 브랜드 설정은 본인 것만',effort='L',gate='텍스트 원문 일치·안전영역 잘림0·정해진 팔레트 허용오차',phase='2차'),
dict(id='M-09',name='자료를 책·발표로 만드는 출판실',sources=['website-scraper','markdown-studio','ai-writing-editor','document-translator','ebook-studio','ai-slide-builder'],value='출처가 살아 있는 문서→책/요약/발표를 함께 제작',keep='안전한 수집·수정이력·리치 교정·용어집·전자책·PPTX',remove='복사마다 출처/숫자 손실·같은 자료 반복 요약',mvp='회원 직접 올린 문서1개→출처 번호 유지→전자책 목차+발표 개요',risk='F-002/F-003 선행·저작권/민감정보·추가 번역비용·생성물 재가져오기 보관기간 연장 금지',effort='L',gate='숫자/URL 대조·문단 출처ID 보존·없는 근거는 미확인 표시',phase='2차'),
dict(id='M-10',name='아이디어에서 화면 명세까지',sources=['ai-prompt-studio','prompt-template-studio','landing-architect','ui-canvas','ai-web-ui','ai-slide-builder'],value='요구→성공 기준→구조→UI 시제품→개발 인수인계',keep='요구 정제·변수 템플릿·랜딩 기획·캔버스·컴포넌트·발표',remove='멋진 시제품과 구현 명세의 간격·의존성 누락',mvp='1페이지 요구→와이어프레임 JSON+컴포넌트 명세+검수 체크',risk='실행 코드는 별도 검토·iframe격리·사용성 품질은 실제 검수',effort='L',gate='필수 요구→화면→테스트 추적률100%·모의 버튼은 명시',phase='2차'),
dict(id='M-11',name='사진 품질·규격 제작실',sources=['portrait-photo','photo-remake-studio','fashion-style','image-convert-studio'],value='원본 품질 점검→필요한 복원→규격·압축 일괄 출력',keep='로컬 얼굴품질·복원·업스케일·규격/투명도 검증',remove='쓸 수 없는 원본으로 유료 재생성·규격 실패',mvp='원본 점검→비파괴 보정 선택→3가지 프로필 규격 출력',risk='F-006 선행·얼굴 측정은 추정·신분증 사진 인정 여부 보장 금지',effort='M',gate='로컬 점검은 네트워크0·목표 픽셀/파일크기 일치·수동보정 가능',phase='2차'),
dict(id='M-12',name='데이터 수집·정제 작업대',sources=['website-scraper','web-crawler-saas','file-merge','document-translator'],value='수집→열 정합→중복/누락 검사→필요 구간 번역→표 내보내기',keep='안전 fetch·구조 추출·헤더 기반 병합·용어/숫자 대조',remove='표 구조 깨짐·출처 누락·중복 데이터',mvp='회원 CSV2개+수집 fixture→열 매핑·품질표·출처열 보존',risk='대량 외부 수집은 비용/사이트 조건·개인 데이터30일·스크레이핑 엔진 중복 제거',effort='M',gate='행 수/중복/출처 추적·한글 CSV·수식 주입 정책·서식 유지 한계 표시',phase='2차')
]

IDEAS=[
('I-01','실행 전 비용·할당량 영수증','공통','실행할 단계·본인 키/계정·이미지 수·예상 최악 시간·추정 비용 범위를 먼저 보여 주고 동의한 단계만 실행','금액은 제공사 가격표/사용량에 따라 갱신하며 확정 청구액처럼 표시하지 않음','중복 실행0·동의 없는 추가 단계0'),
('I-02','근거가 연결된 콘텐츠 패키지','리서치/글/슬라이드','문장·숫자·이미지별 source_id/수집시각/원문위치를 유지해 사실 확인을 쉽게','출처 문서는 데이터일 뿐 도구 지시로 실행하지 않음','출처 없는 주장은 미확인 표기'),
('I-03','실패한 단계부터 다시 시작','이미지/영상/발행','작업 DAG와 단계별 상태·입력 해시로 성공 결과를 보존하고 실패 단계만 재실행','회원간 결과 재사용 금지·생성일30일 연장 금지','합성 장애 시 이미 성공한 유료 단계 호출0'),
('I-04','브랜드 설정과 프롬프트 컨셉 분리','이미지/SNS/상세','색·폰트·로고 안전영역은 개인 설정, 생성 프롬프트 스타일은 프로그램 고유로 유지','자동 공용화/다른 회원 브랜드 재사용 없음','여러 규격에서 브랜드·텍스트 일치'),
('I-05','게시·발송 없는 자동화 리허설','CRM/SNS/블로그','일정/수신자/권한/본문을 fake provider로 실행해 누가 언제 무엇을 받는지 표로 확인','실제 최종게시/발송 버튼과 명확히 구분','드라이런 외부효과0'),
('I-06','내 자료 전달 봉투','프로그램 연계','사용자가 JSON/ZIP 패키지를 내려받아 다른 프로그램에 명시적으로 가져오기: schemaVersion·source/target·ownerHint·createdAt·expiresAt·해시·권리정보','ownerHint는 인증 토큰이 아님. 수신 앱 세션/자격을 다시 확인, 원생성시각 보존, 실제 API키/토큰 포함 금지','30일 만료 원본을 가져와도 재생성일로 세탁되지 않음'),
('I-07','만료 예정 보관함·내보내기 안내','모든 저장형','건별 남은 보관기간·7일/1일 전 안내·명시적 다운로드. 회원 설정/키는 삭제 제외','다운로드한 개인 파일을 서버가 원격 삭제할 수 있다고 약속하지 않음','조회 경계30일·자동 정리 실패 알림'),
('I-08','실측·AI추정·사용자입력 배지','SEO/소싱/유튜브/부동산','지표마다 계산식·출처·기준일·누락값을 펼쳐 보이고 추정치를 수익/노출 보장으로 사용하지 않음','보기 좋은 점수를 근거 없이 채우지 않음','누락값은미확인·추정은추정 표시'),
('I-09','여러 포맷을 한 번에 만드는 콘텐츠 팩','블로그/카드/쇼츠/메일','확정한 사실 원본1개에서 플랫폼별 길이/규격만 변환, 각 결과를 사람이 검토','동일 문구 무차별 자동 발행 없음·채널별 권한/키 분리','사실 변경0·형식별 상한 검수'),
('I-10','생성 전 로컬 품질 검사','사진/영상/음원','얼굴/해상도/투명도/클리핑/음원 길이/텍스트 잘림을 가능한 범위에서 브라우저 처리','얼굴 점으로 동일인 확정·의료/신분증 적합성 보장 금지','로컬 사전검사 외부호출0'),
('I-11','내 작업 기준 프롬프트 실험실','프롬프트/문체/생성','본인 기준 예시와 기대 결과를 저장하고 모델/버전별 출력 차이를 표로 비교','정답 점수도 평가 기준과 한계를 표시·대량 유료실험 승인 필요','고정 fixture와 실제 품질 검수를 분리'),
('I-12','계정 연결 건강 점검','예약/게시/CRM','토큰 만료·권한·등록 도메인·필수 키 존재만 검사, 실제 게시·요금 호출 없이 사전진단','키 원문·다른 회원 계정 열람 금지','만료/잘못된권한을 실행 전에 구분'),
('I-13','클릭을 줄이는 개인 작업 경로 추천','카탈로그','목표/보유자료/연결한 본인 키를 선택하면 쓸 수 있는 프로그램 순서와 빠진 준비물을 안내','추천만으로 다른 프로그램 실행·자료 전송·새권한 부여하지 않음','제안 경로별 필요한 준비물/비용 단계 명확'),
('I-14','품질을 수치로 비교하는 A/B 작업실','썸네일/오디오/상세','같은 배경·음량·상품사실을 고정하고 문구/배치/처리 하나만 바꿔 비교','실제 CTR/매출 상승 효과는 별도 실험 전 주장하지 않음','통제 변수 보존·변경 항목 표시'),
('I-15','CLI 협업 품질 현황판','개발/운영','프로그램별 sourceSHA·운영SHA·DB버전·테스트일·수동확인·미배포·미완료 항목을 분리','디자인완료/HTTP200을 기능완료로 환산하지 않음','버전차이·승인대기·검사미실행을 숨기지 않음'),
('I-16','만료·수신거부·사람 인계가 있는 고객 여정','CRM/DM/예약','접수→예약→방문후안내 단계별로 현재 동의·기간·담당자·전송 가능한 채널을 표시','마케팅 동의를 예약 필수 알림과 자동 동일시하지 않음','거부/정지/취소 고객 전송0'),
('I-17','기능은 병합하고 화면은 역할별로','병합 프로그램','같은 엔진을 새 독립 앱의 단계형 화면에 구성하되 초보/전문 모드로 복잡도 제한','기존 상품 메뉴/권한/주소 폐지는 별도 주인님 결정','MVP는 핵심2~3기능·기존 상품 회귀0'),
('I-18','배포 전 비용 없는 회귀 꾸러미','개발/운영','로그인/권한/만료/빈상태/부분실패/모바일을 공통 fake provider fixture로 검사','33개 tests폴더 미발견은 테스트 부재 확정이 아님. 실제 스크립트/CI 재조사','실제외부호출0·커버한경계/미검수항목 명시')
]

# References resolve from docs/analysis-20261019/.
for entry in ISSUES:
 entry['refs']=[ref.replace('../../../','../../') for ref in entry['refs']]
 if entry['id']=='F-016':
  entry['refs']=[ref.replace('competitor-analysis/src/lib/version.ts','competitor-analysis/lib/version.ts') for ref in entry['refs']]

ISSUES.append(issue('F-019','P2','오디오 분석 lint 명령이 실제 검사 대신 실패','ai-audio-analyzer','실행 재현','package lint=next lint, 설치된 Next16 CLI에는 lint 명령 없음. npm run lint 실행은 프로젝트의 lint 디렉터리가 없다는 오류/종료1.','검사가 있다고 생각해도 정적 품질 검사가 실제 실행되지 않음. 다른 next lint 프로그램은 Next버전별로 추가 확인 필요.','해당 버전의 ESLint 설정/명령을 갖추고 다른 프로그램은 무조건 일괄 변경하지 않음.','lint 실제 파일 검사 완료/의도한 오류 fixture 감지·원래 타입/빌드 회귀.',['../../ai-audio-analyzer/package.json','tooling-evidence.json']))

ROADMAP=[
('W-01','P0','공통 DB 접근 정책 긴급 정비','F-001','없음','Codex: 영향/시험설계 → Claude Code: 승인된 SQL → Codex: 역할별 검수','DB 권한/정책 변경 승인','PUBLIC 전체허용 제거·역할별 allow/deny·롤백/운영 증거'),
('W-02','P0','eBook API 자격·안전 수집 정비','F-002/F-003','W-01 영향 검토; 코드 수정은 독립 가능','Codex: 재현/기준 선정 → Claude Code: 게이트·safeFetch → Codex: 무해한 회귀','코드 작업 지시; DB변경 없음','401/403·DNS/redirect/큰본문 차단·정상 공개 URL fixture'),
('W-03','P1','회원 자료 격리·30일 적용 지도','F-004/F-005/F-006/F-016','W-01','Codex: 데이터 분류/기존 승인 검토 → Claude Code: 승인된 스키마/정리 → Codex: 경계 검수','테이블/정책/기존자료 처리 승인','본인/타회원·직접ID·만료·비접속 정리·실행 증거'),
('W-04','P1','발송 중복·누락 방지','F-007/F-008','W-01','Claude Code: 선점/상태기계 → Codex: 동시성/실패 시험','DB 제약/상태 변경 승인; 실제 발송 별도 확인','동시 재전송 외부효과1회·부분성공 재발송0'),
('W-05','P1','예약 자격·시각·Cron 안전 기본값','F-009/F-010/F-011','W-04와 같은 폴더 순차','Codex: 공통판정/시간·인증 회귀 → Claude Code: 필요한 복잡한 연결','일반 코드 작업 지시','만료/정지/비밀누락 발송0·UTC/KST 같은 표시'),
('W-06','P1','오디오 API 접근/파일 보호','F-013/F-014','독립; 폴더 작업표 확인','Codex: 경계 재현/설계 → Claude Code: 파일 흐름 보완 → Codex 검수','유료 실제 분석 없이 fixture 우선','자격/파일 상한 전후·provider 전 차단'),
('W-07','P1','웹툰 엔진 대체 경로 정비','F-012','독립; 폴더 작업표 확인','Codex: 최상위 원칙 대조 → Claude Code: 명시적 엔진 선택 → Codex 검수','사용 엔진/무료 대체의 회원 연동 정책 확인','키 없음/오류 시 자동 다른 외부엔진 호출0'),
('W-08','P2','상태·버전·자동검사 정직한 현황','F-015/F-017/F-018','W-01~07과 병행 가능한 문서/도구 범위','Codex: 목록/메타 검수 → UI 작업은 주인님이 CLI 배정','중복 배포 금지·기존 승인대기 상태 보존','DB/코드/운영SHA·manual/미실행을 각각 표기'),
('W-09','P2','개인 자료 전달 형식 시범','I-06','W-03','Codex: schema/권한·보관 설계 → Claude Code: 양쪽 importer/exporter → Codex 회귀','새 DB/권한은 승인 필요; 파일 수동전달 MVP 권장','키 없음·원생성일 보존·만료 원본 재사용0'),
('W-10','P2','저위험 병합 MVP 선택','M-08/M-10/M-11/M-12 중1','W-09; 관련 F 이슈 해결','Codex: 요구·성공기준 → Claude Code: 엔진/기능 → UI는 주인님이 배정 → Codex 검수','새 프로그램 개발/등록·필요 DB 사전 승인','선택한 핵심2~3기능만·기존 상품 유지·회귀0'),
('W-11','P2','성장/출판/검토함 MVP','M-01/M-02/M-05/M-09 중1','W-02/W-03/W-09','같은 역할 분담·프로그램마다 단일 담당 락','주인님 목표/우선 프로그램 선택','출처/권한/비용/휴대폰·내보내기 흐름 통과'),
('W-12','P3','복합 제작/발송 병합','M-03/M-04/M-06/M-07 중1','관련 P0/P1 해소·선행MVP 결과','복잡한 기능 Claude Code·Codex 설계/검수·UI는 주인님 배정','구현/비용·게시·자료 정책 별도 확정','외부효과 승인·실패복구·대량 작업 제한·운영증거')
]
