# 참고 화면·공개 코드 분석 — 2026-10-12

참고 URL https://emotion-writer.vercel.app/ 와 주인님 첨부 화면. 공개 HTML 1,125자, 메인 JS 529,452자 전체를 받아 로컬 Git 제외 docs/reference에 보관했습니다. 본인 아닌 회원의 API 키·localStorage·비공개 서버 정보는 읽지 않았습니다. 원본 소스가 아닌 배포된 축약 번들이므로 서버 전체를 분석했다고 표현하지 않습니다.

## 전체 기능 지도

- 주제 프리셋 3종(wise/health/sharing)·직접 주제 입력·수정/적용.
- 이미지 공급처 gemini/pixabay/pexels와 각 키 팝업: 표시/숨김·연결 테스트·저장·취소·발급 링크.
- 비율 9:16/1:1/3:4, 줄 수 5~8, 글귀 시/에세이/짧은 문장, 후보 5개 선택.
- 소스 선택 이전에는 3~5가 숨겨지며 결과 카드 6은 항상 표시.
- 선택 문구 → AI 이미지 또는 번역 검색어로 무료 사진 검색 → 외부 변환 프록시/직접 다운로드 → Canvas에 문구 → JPEG 저장.
- 원본 배경 모델 gemini-3.1-flash-lite-image, 문구/검색어 번역 모델 gemini-2.5-flash. 문구·배경은 별도의 호출.

## 확인한 코드 문제

- `gemini: !!k.gemini || !0`: 연결 상태를 항상 참으로 만듦.
- 스타일 선택 H / 줄 수 변경 J에서 바로 ug() 호출: 설정 수정이 유료 생성 실행과 연결됨.
- AES-GCM API 키와 export된 암호화 키를 같은 브라우저 localStorage에 저장. 회원 인증·계정 격리를 대체하지 못함.
- uc()는 본인 브라우저 키만 사용하고 번들 Tx 값은 undefined였음. 운영자 키 폴백이 실제 존재한다고 주장하지 않음.
- 모든 설정 초기화 Ee()는 스타일·문구·배경까지 제거함. 새 구현에서는 비용 호출과 결과 삭제를 설정 선택에서 분리.
- 사진은 images.weserv.nl 외부 프록시가 우선. 새 구현은 허용 CDN URL·사진 경로·HTTPS·포트/자격증명 제한, 리다이렉트 금지, 응답 형식·스트리밍 용량 검사 후 데이터 URL로 전달.
- 원본 화면 전체 h-screen/max-h-screen overflow-hidden으로 양쪽 내부 스크롤. 새 구현은 화면 폭에 맞는 2열/1열과 정상 페이지 스크롤.

## 자체 구현 결정

새 Next.js 앱, 회원 권한은 기존 cardnews-studio 구조, 공용 DB user_api_keys 본인 행만. 공급처 지원을 늘리려면 provider CHECK 승인 필요. 참고 사이트를 소유한 것으로 간주해 덮어쓰지 않음. 문구/디자인·사진·키 변경을 구분, 생성은 명시 버튼만 실행. 같은 Canvas 함수로 미리보기와 PNG/JPEG 내보내기, 한글 무료 OFL 글꼴을 npm 패키지로 자체 포함. 원본 JS/문구를 프로그램 코드에 복사하지 않고 자체 핸들러·레이아웃 구현.

## 공식 공급사 확인

- Gemini: https://ai.google.dev/gemini-api/docs/image-generation / https://ai.google.dev/gemini-api/docs/deprecations/ . 선택 모델은 공개 문서의 실제 ID를 사용하고 조용한 모델 치환 없음. 본인 계정 모델 사용 가능 여부는 실제 검수 대상.
- Pexels: https://www.pexels.com/api/documentation/ . 작가·원본 링크를 유지하고 검색 결과를 직접 선택.
- Pixabay: https://pixabay.com/api/docs/ . 검색 결과 미리보기는 일시적으로 표시하고 선택 배경은 복사한 파일 데이터로 렌더링; 영구 외부 hotlink 보관 없음.

사용한 유료 API 호출: 계획/구현 자동 검사 단계는 0회. 실제 회원 로그인·공급처 생성 성공은 아직 별도 검수 전입니다.
