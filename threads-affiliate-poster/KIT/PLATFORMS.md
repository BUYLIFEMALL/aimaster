# 플랫폼별 가입 · 키 발급 (Threads 쇼핑제휴 자동화)

각 매뉴얼은 `KIT/manuals/` 의 HTML 파일입니다(브라우저로 열기). 문서 속 `<복제본-주소>`는 **내 사이트 주소**로 읽으세요. 키는 모두 내 사이트 **API키등록·플랫폼연동** 화면에 저장합니다(쓰는 것만).

| 플랫폼 | 매뉴얼 | 저장하는 값 | 필수 |
|---|---|---|---|
| OpenAI | `manuals/01_openai_api_key.html` | OpenAI API 키 | 글 생성(셋 중 하나 이상) |
| Google Gemini | `manuals/02_gemini_api_key.html` | Gemini API 키(나노바나나 이미지 포함) | 〃 |
| Anthropic Claude | https://console.anthropic.com → API Keys | Claude API 키 | 〃 |
| Threads(Meta) | `manuals/03_threads_connect.html` (+ 설치 안내 4장) | Threads 앱 ID·Threads 앱 시크릿 → 계정 연결 | ✅ |
| Meta 앱 심사(선택) | `manuals/04_threads_business_app_review.html` | — (다른 사람 공개 글 검색용) | 선택 |
| 쿠팡파트너스 | `manuals/05_coupang_partners_api_key.html` | Access Key·Secret Key | 쓰는 경우 |
| 알리익스프레스 | `manuals/06_aliexpress_api_key.html` | App Key·App Secret·Tracking ID | 쓰는 경우 |
| 토스쇼핑 쉐어링크 | `manuals/07_toss_sharelink_api_key.html` | Access Key·Secret Key·회원 연동 ID (+ 사이트에 `FIXIE_URL`) | 쓰는 경우 |
| 네이버 브랜드커넥트 | `manuals/08_naver_brandconnect_link.html` | 키 없음(상품 관리에서 링크 붙여넣기) | 쓰는 경우 |
| cron-job.org | https://console.cron-job.org/signup → Settings → API → Create API key | cron-job.org API 키(설정 → ⏰ 예약 발행) | 예약 게시(기본 방식) |
