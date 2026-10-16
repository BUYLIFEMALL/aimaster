# 이미지 자동화 (AI Image Studio / ai-image-studio)

AIMaster 플랫폼의 서브프로젝트인 **이미지 자동화(AI Image Studio)**입니다.
라이브 배포 URL: [https://ai-image-studio.vercel.app/dashboard](https://ai-image-studio.vercel.app/dashboard)

## 주요 기능
1. **AI 프롬프트 최적화 (Step 1)**: 한국어 단문 아이디어를 구도, 조명, 스타일, 렌즈 및 부정 프롬프트가 포함된 영문 고품질 프롬프트로 전환.
2. **다중 이미지 생성 플랫폼 & 플래그십 모델 지원 (Step 2)**:
   - **ByteDance Official Seedream**:
     - `Seedream 5 Pro` (`bytedance/seedream-5-pro`): 1K/1.5K/2K/auto 해상도, 레이어 분해 모드(`layer_decomposition: true`) 지원.
     - `Seedream 5.0 Lite` (`bytedance/seedream-5-lite`): 2K/3K 해상도, 연작 시퀀스 자동 생성(`sequential_image_generation: auto`), 최대 15장 연속 이미지 제어.
     - `Seedream 4.5` (`bytedance/seedream-4.5`): 2K/4K/custom 해상도, 가로/세로 1024~4096px 조절, 안전 검열 완화(`disable_safety_checker`).
   - **Ideogram (Typo & Text Special)**:
     - `Ideogram v4 Quality` (`ideogram-ai/ideogram-v4-quality`): 최신 v4 플래그십 품질 ($0.10/장, 초고화질 사실감 & 정밀 타이포그래피).
     - `Ideogram v4 Balanced` (`ideogram-ai/ideogram-v4-balanced`): v4 밸런스드 ($0.06/장, 화질 & 속도 & 가성비 조화).
     - `Ideogram v4 Turbo` (`ideogram-ai/ideogram-v4-turbo`): v4 터보 ($0.03/장, 초고속 렌더링).
     - `Ideogram Character` (`ideogram-ai/ideogram-character`): 단일 참조 이미지 기반 일관된 인물/캐릭터 비주얼 유지.
     - `Ideogram v3 Turbo` (`ideogram-ai/ideogram-v3-turbo`): V3 터보 엔진 (타이포그래피 & 시각 디자인).
     - `Ideogram v2 Turbo` (`ideogram-ai/ideogram-v2-turbo`): v2 터보 스피드 카드뉴스 & 포스터.
     - `Ideogram v2 Standard` (`ideogram-ai/ideogram-v2`): v2 표준 정밀 디자인 렌더링.
   - **Recraft (Vector SVG & Design Graphic)**:
     - `Recraft v4.1` (`recraft-ai/recraft-v4.1`): Recraft 최신 v4.1 그래픽 비트맵 모델 (디자인 감각 & 텍스트 렌더링 & 아트 디렉팅).
     - `Recraft v4.1 SVG` (`recraft-ai/recraft-v4.1-svg`): Recraft 최신 v4.1 순수 SVG 벡터 모델 (Figma/Illustrator 레이어 편집 가능, 로고·아이콘 특화).
     - `Recraft v3` (`recraft-ai/recraft-v3`): Recraft v3 (red_panda) 이미지 생성 모델 (다양한 미술/디자인 화풍 지원).
     - `Recraft v3 SVG` (`recraft-ai/recraft-v3-svg`): Recraft v3 로고·아이콘·라인아트 pure SVG 벡터 생성 모델.
   - **Black Forest Labs FLUX 2.0**:
     - FLUX 2.0 Max / Flex / Dev / Pro (Replicate 공식 연동).
   - **Alibaba Z-Image**:
     - `Z-Image Turbo` (`prunaai/z-image-turbo`): 6B 초고속 극실사 & 텍스트 렌더링.
   - **OpenAI**: DALL-E 3, DALL-E 2.
   - **Google Gemini**: Nanobanana 2-2K, NanoBanana Pro, NanoBanana 2-4K, Standard.
   - **Stability AI**: SD3.5, Ultra.
3. **동적 옵션 스키마 UI**: 선택한 플랫폼/모델의 지원 옵션(비율, 해상도, 연작 모드, 화질, 시드 등)에 맞춰 입력 폼 자동 렌더링.
4. **유저 개별 API 키 연동**: `user_api_keys` 테이블과 통합 연동하여 본인 키 기반으로 안전하게 호출.
5. **갤러리 & Supabase Storage 보관**: 생성된 이미지는 Supabase Storage에 자동 보관되며 히스토리 제공.

## 멀티테넌시 & 보안
- 대시보드 레이아웃: `requireProgramAccess("image-automation")`
- API 라우트: `checkProgramAccessApi("image-automation")`
- 동적 캐싱 방지: `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` 세트 선언


## 2026-10-16 DB 연동 변수 호환 — v1.09 (ai-image-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
