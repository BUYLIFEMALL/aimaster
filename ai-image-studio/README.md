# 이미지 자동화 (image-automation)

AIMaster 플랫폼의 서브프로젝트인 **이미지 자동화(AI Image Studio)**입니다.

## 주요 기능
1. **AI 프롬프트 최적화 (Step 1)**: 한국어 단문 아이디어를 구도, 조명, 스타일, 렌즈 및 부정 프롬프트가 포함된 영문 고품질 프롬프트로 전환.
2. **다중 이미지 생성 플랫폼 지원 (Step 2)**:
   - OpenAI (DALL-E 3, DALL-E 2)
   - FLUX (via Fal.ai / Replicate)
   - Google Gemini (Imagen 3)
   - Stability AI (SD3.5, Ultra)
   - Recraft & Leonardo AI 확장 지원
3. **동적 옵션 스키마 UI**: 선택한 플랫폼/모델의 지원 옵션(비율, 화질, 스텝, 시드 등)에 맞춰 입력 폼 자동 렌더링.
4. **유저 개별 API 키 연동**: `user_api_keys` 테이블과 통합 연동하여 본인 키 기반으로 안전하게 호출.
5. **갤러리 & Supabase Storage 보관**: 생성된 이미지는 Supabase Storage에 자동 보관되며 히스토리 제공.

## 멀티테넌시 & 보안
- 대시보드 레이아웃: `requireProgramAccess("image-automation")`
- API 라우트: `checkProgramAccessApi("image-automation")`
- 동적 캐싱 방지: `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"` 세트 선언
