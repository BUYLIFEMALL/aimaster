# landing-architect CLI 인수인계 (2026-10-13, v1.02)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 랜딩페이지 기획 자동화 / `landing-architect` |
| 운영 주소 | https://landing-architect.buylife.xyz (Vercel `buylife/landing-architect`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` (간헐적 `Not authorized`는 재시도하면 성공) |
| DB | `landing_architect_projects`(RLS owner-only), `user_api_keys` provider 제약에 unsplash/pexels/pixabay 추가(0002), `programs` 등록·요금제 3종·VIP 등급 접근(0001), 썸네일 §13 실사 16:9 등록 |
| 버전 | v1.02 (코드 `src/lib/version.ts`, DB `programs.version`) |

## 완료·검증
- 순수 로직 테스트 11/11, 보이는 Chrome 14/14(키 미등록 안내·자동 완성·필수 검증·기획안·JSON 편집/거부·섹션 재생성·미리보기·모바일 폭·다운로드·자동 저장·이미지 치환), 빌드 통과.
- 실제 Gemini(standard) 1회: 기획안 서브 4개·이미지 에셋 8개, HTML 23KB·loremflickr 12개, 2026년 기준 문구 확인.

## 남은 일 (우선순위)
1. 일반 회원(`buylifemall@naver.com`)으로 실제 로그인한 화면 검수.
2. 실제 이미지 제공자 키(Unsplash/Pexels/Pixabay) 1회씩 조회 확인(서버 코드는 모의 시험만 됨).
3. 후속 기능(계획서 §3): 사용자 정의 템플릿, AI 이미지 생성 옵션, Vite 프로젝트 ZIP 내보내기, 영어 UI, 공유 링크.

## v1.02 (2026-10-13)
- Pro 모델 실호출 확인: `gemini-3.1-pro-preview` 기획안 28초·HTML 75초 정상. `gemini-2.5-pro`는 신규 계정에서 404(사용 불가)라 폴백 체인에서 제거(`pro: 3.1-pro-preview → 2.5-flash`).

## 알아둘 점
- `vercel link` 직후 생기는 폴더 `.env.local`에는 Supabase 값이 없다. 로컬 스크립트는 루트 `.env.local`을 읽는다.
- 생성 HTML 안의 이미지는 `https://loremflickr.com/1600/900/{키워드}` 형식이어야 치환된다(프롬프트에 고정).
