# allinone-graphic — AI 올인원 그래픽 자동화

> **공식 서비스 URL**: https://graphic.buylife.xyz  
> **버전**: v1.01  
> **역할**: 19개 직군 123종 전문 템플릿, 초고해상도 나노바나나 엔진, 브러시 인페인팅 & 아웃페인팅 올인원 그래픽 스튜디오

## 불변 규칙
1. **최상위 불변 규칙**: 모든 사용자는 본인의 Google Gemini API 키를 직접 등록하여 연동한다 (`user_api_keys.provider = 'gemini'`). 운영자 키 폴백 금지.
2. **화이트 베이스 테마 & 표준 사이드바**: `docs/SIDEBAR_LAYOUT_STANDARD.md` 규격 준수.
3. **2026년 기준 프롬프트**: 항상 당해 연도(`${new Date().getFullYear()}`) 주입.
4. **버전 관리**: `src/lib/version.ts`의 `APP_VERSION = 'v1.01'`과 DB `programs.version = 'v1.01'`.

## 빌드 & 배포
```bash
npm run build
vercel deploy --prod --yes
```
