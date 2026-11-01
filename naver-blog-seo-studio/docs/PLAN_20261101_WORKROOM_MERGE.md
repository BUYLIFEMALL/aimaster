# 플랜 — 작업실 → SEO 병합 마무리 (v2.22)

> 2026-11-01 주인님 승인(「승인해 그대로 진행해」). 작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini].
> 대상: ① AIMaster 운영. 블로그 9→5 정리 제안(주인님 「제안대로 진행해」)의 첫 묶음.

## 배경 — 재대조 결과
10-23 BLC-14가 꼽은 작업실 → SEO 이관 항목(AI 검수 6영역·최종 게이트·문체 영구 보관·이미지 비율/스타일·서식 복사)은 v2.14~v2.17에 이미 배포됐다. 2026-11-01 코드 재대조로 작업실에만 남은 기능은 아래 3가지다.

| 기능 | 작업실(v1.14) | SEO(v2.21) | 근거 |
|---|---|---|---|
| 이미지마다 다른 참고 사진 | 노드마다 최대 10장 | 공통 참고 사진 5장만 | `blog-workroom/src/lib/actions/image.ts` refs · SEO `components/studio/useStudio.ts` `imageOptionBody` |
| 문체 수집 글 수 | 5·10·20·30 | 5·10 | `blog-workroom/src/lib/actions/style.ts` `DEPTHS` · SEO `app/api/styles/route.ts` |
| 문체 분석의 블로그 주제·하위 주제 | 저장 | 없음 | `blog-workroom/src/lib/actions/style.ts` categories/subtopics |

가져오지 않는 것: 이미지 최대 10장(생성 시간·회원 비용 증가), 키워드 등급·급상승·벤치마킹(키워드 프로그램 담당), 구간 직접 편집(SEO 블록 편집기로 가능).

## 구현 순서
1. 이미지별 참고 사진 — 노드 사진이 있으면 그것, 없으면 공통 사진. 노드당 최대 5장, 요청 크기 한도 유지.
2. 문체 수집 5·10·20·30 — 글이 많으면 글당 본문 길이를 줄여 AI 입력 상한 유지.
3. 문체 주제 정보 — 분석 결과에 주제(≤3)·하위 주제(≤5) 저장·표시, 기존 문체 그대로 동작.
4. 문서 갱신(AGENTS·IMPROVEMENTS·HANDOFF, 블로그 비교표·작업표·분석 보고서, 역할 파일).

## 검수
- 맥미니: `tsc --noEmit`, 관련 `node --test`, 경로 지정 커밋.
- 윈도우 요청: `npm run build` → `vercel deploy --prod` → DB `version`·확장 버전·ZIP → `check-extension-release.mjs`.
- 배포 뒤 맥미니 크롬, 시험 계정으로 노드별 참고 사진 이미지 1장·문체 30개 분석 1회.

## 비용(승인됨)
Vercel 빌드 1회 · 이미지 1장(시험 계정 Gemini, 약 0.04달러) · 문체 분석 1회(약 0.01~0.03달러). 로컬 개발 무료.

## 버전
v2.21 → v2.22(코드+DB). 확장 코드 변경 없음, manifest·ZIP·DB 확장 버전만 맞춤.
