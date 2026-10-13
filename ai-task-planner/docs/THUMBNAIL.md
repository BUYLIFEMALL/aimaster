# 카탈로그 썸네일 — v1.01

2026-10-13 주인님의 생성·등록 지시에 따라 제작했습니다.

- 생성: `imagegen` 스킬의 내장 `image_gen` 도구. 회원/운영자 DB의 Gemini 키를 꺼내 사용하지 않았습니다. 기존 Gemini 생성 스크립트 방식과 구분합니다.
- 메인 지침의 시각 기준: 한국인, 실사 사진, natural skin texture·shallow depth of field·85mm portrait lens·soft cinematic lighting, 16:9 카드 구성, 로고·문구 없음.
- 장면: 밝은 책상에서 노트북의 할 일 목록·진행 차트와 노트·집중 타이머를 확인하는 한국인 직장인.
- 파일: [프로젝트 보관본](../public/ai-task-planner-thumbnail.png).
- 등록: 기존 `scripts/upload-program-thumbnail.mjs` 재사용. Supabase `program-images/catalog/ai-task-planner-thumbnail.png` 및 `programs.thumbnail_url`에 버전 쿼리 추가.
- [공개 이미지](https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-task-planner-thumbnail.png?v=1791879180536).

## 생성 프롬프트

Create one final program catalog thumbnail image, wide 16:9 landscape composition. A photorealistic, professional editorial/stock-photography portrait for a marketing thumbnail of a Korean SaaS automation program for planning daily tasks and recording focus time and results. A Korean professional in their early 30s in comfortable business casual, calmly working at a laptop at a bright modern desk, naturally reviewing a neat checklist notebook beside a small simple physical focus timer. The laptop screen shows a white minimal productivity dashboard with a checklist of colored checkmarks, a circular progress indicator and a small bar chart, all without legible text or numbers. Natural skin texture, shallow depth of field, soft cinematic lighting, photographed with a professional camera (85mm portrait lens look), softly blurred contemporary office interior with warm daylight bokeh. Believable candid photography, neutral whites with subtle indigo accents. Choose gender naturally without stereotypes. No visible text, words, logos, watermarks, decorative illustrations, robots or 3D cartoon rendering anywhere. Make the human subject and laptop both clear within a 16:9 catalog crop.
