# AI 리버스 프롬프트 자동화 (Reverse Prompt Architect)

> **공식 서비스 URL**: https://reverse-prompt.buylife.xyz  
> **현재 버전**: `v1.10`  
> **공식 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션 (Creative Atelier Style — Reverse Prompt Architect Edition)**

---

## 🌟 주요 기능
1. **멀티모달 3종 미디어 역분석**: 이미지, 동영상, 오디오 미디어를 Gemini Vision/Audio 모델로 심층 분석하여 피사체, 조명, 구도, 카메라 무빙, 악기 구성 분해.
2. **10대 주요 생성 AI 맞춤 프롬프트 생성**: Midjourney, DALL·E 3, Flux.1, Stable Diffusion, Sora, Google Veo 2, Runway Gen-3, Kling, Suno v3.5, Udio v1.5 완벽 지원.
3. **실시간 프롬프트 재조합 & 파라미터 계산**: 프롬프트 수정 시 Midjourney 명령어 자동 재조합 및 JSON/Markdown 내보내기.
4. **독립 비주얼 가이드북 (`/guide`)**: 4단계 역추출 파이프라인, 도구별 프롬프트 특성 비교표, FAQ 5종 제공.
5. **BYOK (본인 API 키 원칙)**: 회원 본인의 Google Gemini API 키로만 격리 동작.

---

## 🛠️ 기술 스택
- **프론트엔드**: Next.js 16.4.0 (Turbopack), React 19.3.0, Lucide React
- **인공지능**: Google Gemini (`@google/genai`)
- **데이터베이스/인프라**: Supabase SSR, Supabase Storage
- **배포 환경**: Vercel Production
