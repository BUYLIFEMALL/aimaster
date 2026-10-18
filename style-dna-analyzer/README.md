# 이미지 스타일 분석기 (style-dna-analyzer)

> **공식 서비스 URL**: https://style-dna-analyzer.buylife.xyz  
> **현재 버전**: `v1.22` (크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션)

레퍼런스 이미지 한 장으로 카메라·조명·색상 HEX 팔레트·텍스처·아티스틱 무드를 정밀 분석하여, 동일하거나 변형된 스타일의 고품질 이미지를 생성할 수 있는 마스터 프롬프트를 역공학하는 AI 비주얼 유전자 분석기입니다.

## 주요 기능
- **1단계 이미지 분석 (`/analyze`)**: 이미지 업로드 즉시 Sharp 기반 정밀 픽셀 팔레트 추출 및 Gemini 멀티모달 AI의 6대 유전자 파라미터 분석.
- **2단계 프롬프트 보정 (`/refine`)**: 자연어 피드백 및 칩을 활용한 미세 튜닝, 보정 히스토리 관리.
- **3단계 결과 테스트 (`/test`)**: 회원 본인 API 키 기반 이미지 렌더링 및 원본과의 1:1 색감 일치율 측정.
- **보관함 대시보드 (`/dashboard`)**: 분석한 스타일 카드 저장, 복원 및 관리.
- **비주얼 에디토리얼 가이드북 (`/guide`)**: 단계별 파이프라인 안내, FAQ 아코디언, 본인 키 연동 가이드.
- **API키등록·플랫폼연동 (`/settings`)**: 회원 본인 계정 전용 안전한 API 키 연동 (BYOK 원칙).

## 기술 스택
- **Framework**: Next.js 16.2.11 (Turbopack), React 19.2.4, TypeScript 5.x
- **Image Processing**: Sharp 0.35.5, HTML5 Canvas
- **Styling**: Tailwind CSS v4, Lucide React, 크리에이티브 아틀리에 다크 네이비 테마
- **Database & Auth**: Supabase SSR, PostgreSQL, Storage 버킷
- **AI Integration**: Google Gemini Vision & Imagen API (회원 본인 키)

## 상세 인수인계
전체 아키텍처 및 세부 히스토리는 [AGENTS.md](AGENTS.md)를 참조하세요.
