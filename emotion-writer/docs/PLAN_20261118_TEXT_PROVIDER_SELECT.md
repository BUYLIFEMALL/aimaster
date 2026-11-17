# 플랜 — 감성 글귀 이미지: 글귀 생성 AI를 OpenAI·Claude·Gemini 중에서 고르고 상세 모델까지 직접 설정 (2026-11-18)

> 주인님 직접 지시(2026-11-18, 스크린샷 「글귀 생성 AI 모델」 칸): 「OpenAI / Claude / Gemini 중에서 선택할 수 있게 해주고 각각 상세 모델도 사용자가 설정해서 사용할 수 있게 해줘」「개발되어 있는 모듈 많으니 참고해서 기능 확장해주면 돼」「작업결과와 지휘는 master에게 통제 받도록 해」.
> 담당: Claud(ecommerce) `claude-win-sdp`. **구현은 Master 승인·배정 뒤** 시작한다.

## 1. 지금 상태 (확인한 사실)
- 운영 v1.29. 글귀 생성 `src/app/api/copy/route.ts`가 `getUserApiKey(id, "gemini")`만 쓰고, 모델 목록 `src/lib/studio/config.ts`의 `TEXT_MODELS`는 Gemini 3.8 Flash 1개뿐이다.
- 같은 날 확인: 미리보기 아래 PNG·JPG 저장, 인스타에 올리기(INSTA 새 글 화면 열림), 바나나 캔버스·이미지 스튜디오 연결은 운영에서 모두 동작한다(ego, 시험 계정, AI 호출 0).
- **겹침 주의**: 디자인 담당 AGY(`agy-win-design`)가 같은 날 주인님 지시로 `config.ts`·`KeySettings.tsx`·`Workspace.tsx`를 작업 중이다(Pexels 삭제, 미커밋). 이 세 파일은 AGY 작업이 커밋된 뒤에 손댄다.

## 2. 참고할 기존 모듈 (새로 만들지 않음)
| 가져올 것 | 출처 | 비고 |
|---|---|---|
| 3사 모델 목록·기본값·플랫폼 판정·묶음(optgroup)·키 없음 문구 | `kakao_auto_poster/src/lib/textModels.ts` (= `ebook-studio/src/lib/textModels.ts`, 2026-11-14 같은 지시로 구현) | `docs/AI_MODEL_CATALOG.md` 등급별 추천 3개씩, 9개 |
| 3사 호출(회원 본인 키, 재시도 0) | `kakao_auto_poster/src/lib/ai/textLlm.ts` · `ebook-studio/src/lib/ai/textLlm.ts` | 두 사본을 비교해 더 단단한 쪽 사용, JSON 응답 처리만 이 프로그램에 맞춤 |

## 3. 구현 순서
1. `src/lib/studio/textModels.ts` 새 파일 — 위 목록 사본. **기본값은 지금처럼 Gemini 3.8 Flash**(기존 회원 동작 유지), 옛 모델 이름 바꾸기(`gemini-2.5-flash` → 3.8) 그대로.
2. `src/lib/studio/textLlm.ts` 새 파일 — 3사 호출 사본. 회원 본인 키만, 운영자 키 대체 없음.
3. `services.ts` `generateCopy` — 고른 모델의 플랫폼으로 호출(지시문·글귀 5개 JSON 처리는 지금 그대로).
4. `api/copy/route.ts` — 모델에서 플랫폼을 정해 그 플랫폼 본인 키(`openai`·`anthropic`·`gemini`)를 읽고, 없으면 「○○ 키를 API키등록에 넣거나 다른 플랫폼 모델로 바꿔 주세요」.
5. `validation.ts` — 9개 모델만 허용.
6. (AGY 커밋 뒤) `config.ts`의 `TEXT_MODELS`를 새 목록으로 연결, `Workspace.tsx` 선택 칸을 플랫폼별 묶음 + 「키 등록됨/필요」 표시, `KeySettings.tsx`에 OpenAI·Claude 키 칸(공용 `user_api_keys`, 이미 있으면 재사용).
7. 안내 문구 2곳(「무료 사진 방식의 AI 글귀 생성에도 Gemini 키가 필요」 → 「고른 AI 플랫폼 키」), `/guide` 해당 줄.
8. 시험: 모델→플랫폼 판정·옛 값 변환·허용 목록·키 없음 문구(node:test), `tsc`.

## 4. 검수
- 자체: 시험·`tsc`·로컬 빌드(무료).
- 실제 호출: 시험 계정 본인 키로 플랫폼마다 가성비 모델 1회씩(최대 3회, 글귀 5개) — **비용 승인 필요**(아래).
- 운영 화면: 배포 뒤 ego(시험 계정)로 선택 칸·키 없음 안내·생성 결과.
- 독립 검수는 Master 배정.

## 5. 비용
| 항목 | 내용 | 승인 |
|---|---|---|
| 개발·시험 | 시험 계정 본인 키, 플랫폼별 가성비 모델 1회(합계 3회, 몇 원 수준) | 필요 |
| 배포 | Vercel 빌드 1회 | 필요 |
| 회원 부담 | 회원 본인 키로 고른 모델 요금 | 화면에 비용 등급 표시 |

## 6. 버전·배포
- 배포 때 v1.30(코드 + DB `programs.version`). AGY의 Pexels 삭제와 한 번에 묶어 빌드 1회로 내보내는 것을 Master에 제안.

## 7. 하지 않는 것
- 이미지 생성 모델(나노바나나)은 이번 범위가 아니다.
- 운영자 키 대체, 자동 재시도, 다른 회원 키 사용은 하지 않는다.
