# blog_auto_poster (AIMaster_dev 24h News SEO AI Auto Poster)

> **운영자 전용 도구 — 회원 서비스가 아닙니다 (2026-10-09 주인님 승인).** 사이트·Vercel 배포가 없고 운영자가 명령줄로 직접 실행하며, 환경변수 `GEMINI_API_KEY`는 운영자 본인 실행에만 씁니다. 회원이 쓰는 기능으로 바꿀 때는 회원 본인 키 방식으로 새로 만들어야 합니다(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8).

본 프로그램은 `AIMaster_dev` 프로젝트 지침에 따라 개발된 **독립형 AI 자동 포스팅 프로그램**입니다.
지정된 키워드/주제에 대하여 **최근 24시간 실시간 뉴스**를 수집하고, **4대 신호 지표(트렌드, 노출빈도, 소셜언급, 사회적 파급력)**를 분석하여 구글·네이버 SEO에 최적화된 마크다운 포스트를 자동 작성 후 통합 DB (`AIMaster_dev`)에 저장합니다.

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 특정 주제어 지정 포스팅 실행
npm run start -- --topic "인공지능 AI"
# 또는
npm run start -- --topic "글로벌 증시"

# 3. 주제어 미지정 시 기본 대표 키워드 자동 포스팅
npm run start
```

## 구조

- `src/collector.ts`: 최근 24시간 뉴스 수집 & 4대 신호 랭킹 엔진
- `src/generator.ts`: 구글/네이버 SEO 최적화 마크다운 & FAQ 포스트 생성기
- `src/db.ts`: Supabase 통합 DB (`AIMaster_dev`) `blog_` 테이블 연동 저정기
- `src/index.ts`: 메인 CLI 실행기

## 2026-10-17 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/nanoBananaConfig.ts`: gemini-2.5-flash-image·gemini-3.1-flash-image → `gemini-nano-banana-2.1`, 주소 v1 → v1beta (기준: ai-image-studio v1.11).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시). 운영자 전용 도구라 배포·버전 없음, `tsc --noEmit` 통과.
