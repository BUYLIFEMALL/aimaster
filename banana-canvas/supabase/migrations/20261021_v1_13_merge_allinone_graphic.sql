-- v1.13 (2026-10-21) 이미지 병합 B: AI 올인원 그래픽 → 바나나 캔버스 「템플릿 그래픽」. 서버 키 스크립트로 적용(백업 docs/analysis-image-consolidation-20261021/backup-programs-before-merge-B.json).
-- 올인원 그래픽 권한 회원 148명은 모두 이미 이 앱 권한(같거나 긴 기간)·같은 등급 설정 보유 — 권한 추가 없음.
update public.programs set version = 'v1.13', updated_at = now()
       -- short_desc(56자)·description(493자)·detail_sections.features[3](템플릿·스페셜)도 같은 작업에서 갱신
 where slug = 'banana-canvas';
