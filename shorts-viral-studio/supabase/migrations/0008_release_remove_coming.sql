-- shorts-viral-studio 출시 (2026-10-11): 실제 키 검수(6단계 전체)를 마치고 카탈로그의 '준비중(coming)' 배지를 내린다. DB 구조 변경 없음.
update programs set badges = array_remove(badges, 'coming'), updated_at = now() where slug = 'shorts-viral-studio';
