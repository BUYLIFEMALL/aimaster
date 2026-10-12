# LP 턴테이블 자동화 (LP Turntable Studio)

- **버전**: `v1.03`
- **도메인**: `https://lp-turntable.buylife.xyz` (Vercel: `https://lp-turntable.vercel.app`)
- **프로그램 명칭**: **LP 턴테이블 자동화 (LP Turntable Studio)**
- **정체성**: Google Gemini AI를 활용하여 바이닐 LP 레코드 및 CD 컴팩트 디스크의 감각적인 앨범 아트를 디자인하고, 브라우저에서 직접 고화질 60fps MP4 회전 비디오와 무한 루프 GIF 목업을 생성하는 전문 턴테이블 영상 자동화 스튜디오
- **문서 안내**:
  - 📖 **사용자 및 운영 상세 매뉴얼**: [`MANUAL.md`](MANUAL.md)
  - 🤖 **AI 에이전트 인수인계 문서**: [`AGENTS.md`](AGENTS.md)

---

## 핵심 엔진 & 주요 기능

0. **AIMaster 메인 지침 준수 좌측 표준 사이드바 메뉴 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**
   - 상단 프로그램명 + 버전 배지(`v1.01`) + `← 다른 프로그램 보기` (`https://www.buylife.xyz/programs`)
   - `🏠 대시보드` 진입점
   - **번호형 핵심 작업 흐름 (원형 배지 1~4 + 세로 연결선)**:
     - Step 1: 미디어 & 메타데이터 (`#step-1-metadata`)
     - Step 2: 비주얼 아트워크 (`#step-2-artwork`)
     - Step 3: 턴테이블 & RPM (`#step-3-turntable`)
     - Step 4: 애니메이션 내보내기 (`#step-4-export`)
   - 구분선 아래:
     - `🔑 API키등록·플랫폼연동`
     - `💡 사용 가이드`
     - `⚙️ 작업 히스토리`
     - 회원 이메일 및 로그아웃 폼 바짝 밀착 (2026-10-12 주인님 확정 규격)

1. **CD & LP 2대 미디어 포맷 정밀 텍스처링 (`processDiscTexture`)**
   - **CD 컴팩트 디스크**: 프리즘 무지개 홀로그램 반사광(`color-dodge`), 중앙 클램핑 링, 점선 레이저 가이드, 투명 중앙 홀
   - **Vinyl LP 레코드**: 딥 블랙 레코드 베이스, 동심원 음각 그루브(홈), 45도/225도 코닉 회전 광택(`screen`), 센터 라벨 클리핑 및 스핀들 핀

2. **AI 비주얼 스타일 추천 (`/api/suggest-style`)**
   - 앨범 제목, 아티스트 이름, 장르 정보를 기반으로 Gemini 2.5 Flash가 최적의 아트 스타일 프롬프트(색상, 분위기, 조명, 텍스처) 1~2문장 자동 생성

3. **고화질 정방형 앨범 아트워크 생성 (`/api/generate-artwork`)**
   - Gemini 3 Pro / Imagen 3.0 초고화질 엔진
   - 중앙 구멍 컷아웃을 회피하는 원형 호(Circular Arc) 및 상/하단 텍스트 배치 (한글/영문 완벽 지원)

4. **나만의 커스텀 이미지 직접 업로드**
   - 이미 준비된 앨범 커버 이미지(PNG/JPG)를 업로드하여 원클릭으로 LP/CD 디스크 텍스처로 자동 변환

5. **브라우저 100% 네이티브 비디오 / GIF 인코더 (`renderSpinningAnimation`)**
   - **60fps MP4 비디오**: WebCodecs `VideoEncoder` + `mp4-muxer` (720x720, 5Mbps)
   - **무한 루프 GIF**: `gifenc` (360x360, 256색 양자화 팔레트, 투명도 지원)
   - 서버 전송 없이 사용자 브라우저에서 회전 주기를 수학적으로 일치시켜 무한 루프로 즉시 인코딩 및 다운로드

---

## 보안 및 플랫폼 규칙

- **최상위 불변 규칙**: 사용자 본인 Gemini API 키 (`user_api_keys.provider = 'gemini'`) 직접 등록 및 연동. 타인/운영자 키 폴백 원천 금지.
- **테마 규칙**: 클린 화이트 스튜디오 테마 (`bg-white` / `bg-slate-50`).
- **권한 체계**: AIMaster 공유 Supabase DB 통합 세션 및 `requireProgramAccess()`.
- **배지**: `['free', 'new']` (가입 회원 누구나 무료 이용).
