-- ai-work-workspace v1.15 (2026-10-24): 화면 영어 문구 약 1,500종 한국어화 + 회의록 수정(정지 시 마지막 문장 손실·요약 after()·짧은 녹취 안내·자동 요약 100자·마이크 없음 안내) + 3D 버튼 + 매뉴얼(화면 구성·회의록·마이크)
update public.programs set version = 'v1.15', updated_at = now() where slug = 'ai-work-workspace';
