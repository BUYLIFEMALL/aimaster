"""service/escalation.py — 사다리 B(통지 후 진행) 대응: curl_cffi 그리드 → StealthyFetcher.

이 저장소 CLI 도구의 `.claude/skills/web-crawler/references/fetcher-patterns.md` §F
(curl_cffi 경량 그리드)와 `antibot-strategies.md`(Cloudflare → StealthyFetcher) 패턴을
그대로 가져왔다. Chrome CDP(6단)는 이식하지 않는다 — 그 단계는 사용자 본인의 로컬 PC에
이미 로그인된 실제 브라우저가 있어야 작동하는데, Render 서버(헤드리스, 사용자 브라우저
접근 불가)에는 그런 게 존재할 수 없다. 따라서 Akamai급 고급 WAF는 이 서비스에서 원리적으로
넘을 수 없다 — `looks_like_akamai()`로 감지되면 애초에 우회를 시도하지 않고 바로 포기한다
(그리드/Stealthy를 돌려봐야 어차피 안 뚫리므로 사용자의 시간/비용만 낭비된다).

모든 fetch 함수는 (html: str, page, method: str) | (None, None, None)을 반환한다.
`page`는 이후 `.css()`로 아이템을 뽑는 데 쓰고, `html`은 소프트블록 판정/LLM 프롬프트용
원문이 필요할 때 쓴다 — curl_cffi 그리드는 raw text를 Scrapling Selector로 감싸서
반환하므로(Selector 자체에는 `.html_content`가 없다), 호출부가 매번 타입을 분기하지
않도록 여기서 항상 둘 다 쥐여준다.
"""
from urllib.parse import urlparse

# scripts/ 를 sys.path 에 넣는 작업은 pipeline.py가 이 모듈을 import하기 전에 이미
# 해뒀다(pipeline.py 상단 참고) — 여기서 다시 하지 않는다(호출 위치에 따라 달라지는
# 상대경로를 또 넣으면 오히려 깨지기 쉽다).
from utils import detect_softblock

IMPERSONATE = ["safari17_0", "chrome131", "chrome120", "firefox133", "safari_ios"]

_AKAMAI_MARKERS = ("errors.edgesuite.net", "akamaighost", "ak_bmsc", "bm_sz")

_EMPTY = (None, None, None)


def looks_like_akamai(html: str) -> bool:
    """Akamai 감지 근사치. CLI 도구는 _abck 쿠키값(~-1~)까지 보지만, 이 서비스가 쓰는
    plain_get/plain_dynamic 응답에서는 쿠키를 쉽게 못 꺼내 본문 마커만으로 판단한다 —
    완벽하지 않지만 "헛수고 방지"라는 목적에는 충분하다."""
    low = (html or "").lower()
    return any(marker in low for marker in _AKAMAI_MARKERS)


def _url_transforms(url: str):
    p = urlparse(url)
    host = p.netloc
    yield url
    if host.startswith("www."):
        bare = host[4:]
        yield url.replace(host, "m." + bare, 1)
        yield url.replace(host, bare, 1)
    elif host.count(".") == 1:
        yield url.replace(host, "m." + host, 1)


def _referers(url: str):
    p = urlparse(url)
    return [f"{p.scheme}://{p.netloc}/", "https://www.google.com/", None]


def _fetch_via_grid(url: str, timeout: int = 25):
    from curl_cffi import requests as cffi
    from scrapling import Selector

    for imp in IMPERSONATE:
        for u in _url_transforms(url):
            for ref in _referers(url):
                headers = {"Referer": ref} if ref else {}
                try:
                    r = cffi.get(u, impersonate=imp, headers=headers, timeout=timeout, allow_redirects=True)
                except Exception:
                    continue
                verdict = detect_softblock(r.text, status=r.status_code, cookies=r.cookies.get_dict())
                if not verdict["blocked"]:
                    return r.text, Selector(r.text), "grid"
    return _EMPTY


def _fetch_via_stealthy(url: str):
    from scrapling.fetchers import StealthyFetcher

    fetcher = StealthyFetcher()
    page = fetcher.fetch(url, headless=True, solve_cloudflare=True)
    html = str(page.html_content)
    verdict = detect_softblock(html, status=getattr(page, "status", 200))
    if verdict["blocked"]:
        return _EMPTY
    return html, page, "stealthy"


def fetch_escalated(url: str):
    """그리드 → Stealthy 순으로 시도. 전부 실패하면 (None, None, None)."""
    result = _fetch_via_grid(url)
    if result[0] is not None:
        return result
    return _fetch_via_stealthy(url)


def fetch_escalated_by_method(url: str, method: str):
    """페이지네이션 중 이미 성공했던 방식만 재시도한다(매 페이지 그리드 전체를 다시
    돌리면 느리고 비용도 커서, 첫 페이지에서 통한 방식 하나로 고정)."""
    if method == "grid":
        from curl_cffi import requests as cffi
        from scrapling import Selector

        try:
            r = cffi.get(url, impersonate="chrome131", timeout=25, allow_redirects=True)
        except Exception:
            return _EMPTY
        verdict = detect_softblock(r.text, status=r.status_code, cookies=r.cookies.get_dict())
        return _EMPTY if verdict["blocked"] else (r.text, Selector(r.text), "grid")
    if method == "stealthy":
        return _fetch_via_stealthy(url)
    return _EMPTY
