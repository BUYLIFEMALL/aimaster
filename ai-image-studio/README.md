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
