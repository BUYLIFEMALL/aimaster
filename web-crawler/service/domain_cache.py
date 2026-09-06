"""service/domain_cache.py — 도메인+수집항목 조합별 셀렉터 재사용 캐시.

CLI 도구의 fingerprints/profile.json(파일 기반)과 같은 목적(재정찰 비용 절감)이지만,
Render 컨테이너는 재배포할 때마다 파일시스템이 초기화되므로 파일 대신 Supabase 테이블
(web_crawler_domain_profiles)에 저장한다. 사용자 데이터가 아니라 도메인 구조에 대한
공유 캐시라 모든 사용자가 같은 캐시를 재사용한다.

같은 도메인이라도 수집하려는 항목(target_fields)이 다르면 셀렉터도 달라지므로,
(domain, target_fields_key) 조합을 키로 쓴다.
"""
from urllib.parse import urlparse


def normalize_domain(url: str) -> str:
    return (urlparse(url).netloc or "").lower().removeprefix("www.")


def target_fields_key(target_fields: list[str]) -> str:
    """필드 순서/공백 차이로 캐시가 갈리지 않도록 정규화한다."""
    return ",".join(sorted(f.strip().lower() for f in target_fields))


def get_cached_plan(supabase, url: str, target_fields: list[str]) -> dict | None:
    domain = normalize_domain(url)
    key = target_fields_key(target_fields)
    res = (
        supabase.table("web_crawler_domain_profiles")
        .select("*")
        .eq("domain", domain)
        .eq("target_fields_key", key)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def save_plan(
    supabase,
    url: str,
    target_fields: list[str],
    item_selector: str,
    field_selectors: dict,
    next_page_selector: str | None,
    needs_dynamic: bool,
    fetch_method: str,
):
    domain = normalize_domain(url)
    key = target_fields_key(target_fields)
    existing = get_cached_plan(supabase, url, target_fields)
    hit_count = (existing.get("hit_count", 0) + 1) if existing else 1

    supabase.table("web_crawler_domain_profiles").upsert(
        {
            "domain": domain,
            "target_fields_key": key,
            "item_selector": item_selector,
            "field_selectors": field_selectors,
            "next_page_selector": next_page_selector,
            "needs_dynamic": needs_dynamic,
            "fetch_method": fetch_method,
            "hit_count": hit_count,
            "last_used_at": "now()",
        },
        on_conflict="domain,target_fields_key",
    ).execute()


def invalidate(supabase, url: str, target_fields: list[str]):
    """캐시된 셀렉터가 더 이상 안 맞을 때(0건 수집) 삭제한다 — 다음 요청은 재정찰한다."""
    domain = normalize_domain(url)
    key = target_fields_key(target_fields)
    supabase.table("web_crawler_domain_profiles").delete().eq("domain", domain).eq(
        "target_fields_key", key
    ).execute()
