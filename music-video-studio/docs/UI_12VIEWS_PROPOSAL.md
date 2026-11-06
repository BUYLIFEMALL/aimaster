# AI 뮤직비디오 자동화 (music-video-studio) UI 4대 화면 3시안(12뷰) 비교 제안서

> **작업 일시**: 2026-11-06  
> **대상 프로그램**: `music-video-studio` (현행 `v1.26`, Vercel 독립 배포)  
> **카테고리**: Group 4 영상 & 미디어 대표 모델  
> **공식 표준 포트 쇼케이스 URL**: [http://localhost:3800/showcase.html](http://localhost:3800/showcase.html)

---

## 🌐 5대 핵심 확인 링크 세트

1. 🌐 **공식 운영 서비스 링크**: [https://music-video-studio.buylife.xyz](https://music-video-studio.buylife.xyz)
2. 🌐 **Vercel 프로덕션 보조 링크**: [https://music-video-studio.buylife.xyz](https://music-video-studio.buylife.xyz) *(외부 타인 선점 도메인 music-video-studio.vercel.app 제외, 공식 buylife 도메인 단일화)*
3. 📮 **관리자 dev-docs 결과함 링크**: [https://www.buylife.xyz/admin/dev-docs/requests](https://www.buylife.xyz/admin/dev-docs/requests)
4. 🎨 **단일 통합 쇼케이스 웹서버 링크 (순수 영문 표준 포트)**:
   - [http://localhost:3800/showcase.html](http://localhost:3800/showcase.html) *(종합 비교표 + 1440px 라이트박스 팝업)*
   - [http://localhost:3800/comparison.html](http://localhost:3800/comparison.html) *(공식 종합 비교표 전용)*
5. 📁 **로컬 영구 자산 폴더 경로**:
   - `D:\Antigravity\Design\45_cinematic_neon_mv_studio\music-video-studio` (추천 1안)
   - `D:\Antigravity\Design\46_creative_artist_mv_atelier\music-video-studio` (2안 보존)
   - `D:\Antigravity\Design\47_hyper_cybernetic_mv_synth\music-video-studio` (3안 보존)

---

## 🔍 프로그램 성능·기능 분석 및 발견된 버그·오류 리포트

디자인 시안 제작과 함께 `music-video-studio` 소스 코드 전반을 점검한 결과, 담당 작업자 및 향후 개선이 필요한 핵심 사항들을 정리하였습니다:

### 1. [치명적 UX 오류] 외국어(영문) 템플릿 잔재 및 혼선
- **현상**: Vercel 기본 템플릿(영문 랜딩 페이지)과 buylife 공식 도메인의 불일치로 인해, 사용자가 외부 영문 사이트로 오인할 위험이 큼.
- **조치 권고**: 100% 한글 레이블과 한국인 크리에이터 중심의 4단계 원스톱 파이프라인으로 전면 개편.

### 2. [로그인 화면 지침 미준수] 구형 로그인 폼 유지
- **현상**: `/login` 화면이 최신 5단계 표준 규격(상단 로고 + 영문 알약 뱃지 + 한글 타이틀 + 1행 축소 약관)을 따르지 않고 과거 3단계 폼으로 방치됨.
- **조치 권고**: 공식 로그인 표준 레이아웃으로 교체.

### 3. [성능/안정성] 다중 씬 렌더링 시 Vercel 서버리스 타임아웃 리스크
- **위치**: `app/api/render/route.ts`
- **현상**: 여러 씬(Scene 1~6)을 하나의 API 요청에서 연속 생성할 경우 15초/60초 서버리스 타임아웃 한계를 초과하여 렌더링이 중단될 위험이 있음.
- **조치 권고**: 씬 단위 비동기 큐잉(Queue) 처리 및 브라우저 WebCodecs 클라이언트 사이드 합성 병행.

---

## 📊 4대 화면 3시안 한눈에 보는 종합 비교표

| 핵심 구분 | 시안 1: 시네마틱 네온 MV (추천안 ⭐) | 시안 2: 크리에이티브 아티스트 | 시안 3: 하이퍼 사이버네틱 콘솔 |
| :--- | :--- | :--- | :--- |
| **템플릿 명칭** | **45. 시네마틱 네온 MV 비주얼라이저 스튜디오** | **46. 크리에이티브 아티스트 MV 아틀리에** | **47. 하이퍼 사이버네틱 비디오 신디사이저 콘솔** |
| **테마 & 배색** | 시네마틱 옵시디언 (`#0A0D18`) & 네온 마젠타 (`#E11D48`) | 웜 다크 에스프레소 (`#121118`) & 샴페인 골드 (`#D97706`) | 딥 스페이스 블랙 (`#040711`) & 일렉트릭 사이언 (`#06B6D4`) |
| **1. 메인 음악/가사**<br>`(01_main)` | • **4단계 원스톱 파이프라인 진행 바**<br>• 12대 장르 원클릭 칩셋 & AI 가사 블록<br>• 3D 엠보싱 마젠타 실행 버튼 | • 바이닐 앨범 커버 메타포 워크스페이스<br>• 작사가 노트를 닮은 감성 원고 조판<br>• 3D 엠보싱 골드 실행 버튼 | • 오디오 신디사이저 파형 분석 입력 콘솔<br>• BPM & 키(Key) 템포 실시간 감지 데크<br>• 3D 엠보싱 사이언 실행 버튼 |
| **2. 상세 씬 영상 렌더러**<br>`(02_detail)` | • **16:9 영화관 시네마틱 뷰파인더 덱 목업**<br>• LIVE 🔴 REC 타임코드 인디케이터<br>• 씬 1~6 비주얼 프롬프트 & 카메라 무브먼트 | • 갤러리형 씬 스토리보드 필름스트립<br>• 장면별 시각 묘사 & 감정 곡선 인디케이터<br>• 아날로그 필름 그레인 프리뷰어 | • 8채널 씬 비디오 렌더 큐 텔레메트리<br>• 오디오 반응형 타임라인 트랙 HUD<br>• WebCodecs GPU 가속 고속 합성기 |
| **3. 올인원 매뉴얼**<br>`(03_guide)` | • **4단계 파이프라인 올인원 인포그래픽**<br>• 영화 감독처럼 연출하는 프롬프트 공식<br>• 3D 엠보싱 버튼 가이드 | • 크리에이터를 위한 MV 연출 미학 핸드북<br>• 가사와 비주얼의 서사적 동기화 팁<br>• 아티스트 브랜딩 및 썸네일 노하우 | • 비디오 생성 프로토콜 및 코덱 사양서<br>• Gemini Omni Flash 1.1 프롬프트 규격<br>• 렌더링 최적화 트러블슈팅 |
| **4. 연동/환경설정**<br>`(04_settings)` | • **공식 2단 분리형 카드 표준 레이아웃**<br>• Claude Opus 5.5 & Gemini Omni Flash 키 허브<br>• 1080p/4K 및 24/30fps 원클릭 토글 | • 레이블 보안 자격증명 볼트(Vault)<br>• 음원 라이브러리 및 스토리지 연동<br>• 아티스트 프리셋 커스터마이징 | • AI 엔진 라우팅 및 폴백 관제 센터<br>• GPU 가속 모드 및 버퍼 메모리 할당<br>• 암호화 토큰 텔레메트리 인스펙터 |
| **특징 및 장점** | **누구나 1초 만에 이해하는 직관적인 4단계 워크플로우**, 헐리우드 촬영장 OSD 감성으로 몰입도 극대화 | 세련되고 우아한 음악 작업실 느낌으로 감성 서사와 예술성 강조 | 전문 영상/모션 엔지니어를 위한 고성능 실시간 렌더링 관제 감성 |
| **최종 평가 & 추천** | ⭐ **1순위 추천 (공식 표준 채택안)** | 📁 100% 템플릿 자산화 보존 (`D:\Antigravity\Design\46_...`) | 📁 100% 템플릿 자산화 보존 (`D:\Antigravity\Design\47_...`) |

---

## 🎨 4대 핵심 화면별 3시안 시각 비교

### 1. 메인 음악/가사 기획 대시보드 (01_main)
````carousel
![시안 1 - 메인 기획](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c1_main.png)
<!-- slide -->
![시안 2 - 메인 기획](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c2_main.png)
<!-- slide -->
![시안 3 - 메인 기획](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c3_main.png)
````

---

### 2. 상세 씬별 스토리보드 & 영상 렌더러 (02_detail)
````carousel
![시안 1 - 상세 렌더러](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c1_detail.png)
<!-- slide -->
![시안 2 - 상세 렌더러](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c2_detail.png)
<!-- slide -->
![시안 3 - 상세 렌더러](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c3_detail.png)
````

---

### 3. 올인원 사용 매뉴얼 (03_guide)
````carousel
![시안 1 - 사용 매뉴얼](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c1_guide.png)
<!-- slide -->
![시안 2 - 사용 매뉴얼](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c2_guide.png)
<!-- slide -->
![시안 3 - 사용 매뉴얼](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c3_guide.png)
````

---

### 4. 연동 및 환경설정 (04_settings)
````carousel
![시안 1 - 환경설정](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c1_settings.png)
<!-- slide -->
![시안 2 - 환경설정](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c2_settings.png)
<!-- slide -->
![시안 3 - 환경설정](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/mvs_c3_settings.png)
````
