# WS-20261116-10 결과 — website-scraper 운영 메타 1행 읽기 (CC-WORKSPACE-01)

- 담당: Claude(Workspace) `CC-WORKSPACE-01` · 지시: Master `msg_6d2cedde2843` · 상태: **ready_review**
- 연결: 이 세션에 기존부터 있던 운영 DB 읽기 연결 `supabase-prod`(ref `esgxyikcnnvmlhygjkth`). 새 연결·권한 확대 없음.

## 1. 실행한 쿼리 (읽기 2회, 쓰기 0)
1. 스키마 확인: `information_schema.columns`에서 `programs`(slug·name·version·is_active·category_id)·`categories`(id·slug·name·is_public) 존재 확인 → 모두 있음.
2. 1행 읽기:
```sql
select p.slug, p.name, p.version, p.is_active, c.slug as category_slug, c.name as category_name, c.is_public as category_is_public
from programs p left join categories c on c.id = p.category_id
where p.slug = 'website-scraper';
```

## 2. 결과 (운영 DB 실제 값, 2026-11-16)

| 칸 | 값 |
|---|---|
| slug | `website-scraper` |
| name | Website Scraper |
| version | **v1.15** |
| is_active | **false** |
| 카테고리 | `backup`(백업) |
| 카테고리 is_public | **false** |

해석(사실만): 운영 메인 사이트에서 비활성 + 비공개 카테고리(백업) 소속. 비공개 카테고리 규칙상 관리자·내부 열람 계정만 보이는 대상.

## 3. 범위 준수
- 회원·키·토큰·다른 프로그램 조회 없음(조건 `slug='website-scraper'` 1행). 운영 쓰기·배포 없음.
- 미확인: 이 값이 Blog 쪽 Lab 기록과 일치하는지는 비교하지 않음(Blog 담당 몫).

## 비용
없음.
