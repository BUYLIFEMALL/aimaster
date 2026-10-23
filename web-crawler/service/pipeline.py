"""service/pipeline.py — 크롤링 파이프라인.

사다리 A(자동 접근 차단이 없는 사이트)는 통지 없이 자동으로 처리한다. 소프트블록(WAF/
CAPTCHA 등)이 감지되면, 원본 CLI 도구의 "이음매 통지 게이트"와 같은 원칙으로 즉시
실패시키지 않고 `BlockedNeedsConfirmation`을 던져 작업을 "확인 대기"(blocked) 상태로
멈춘다 — 사용자가 화면에서 우회 시도 여부를 직접 고른 뒤, 진행을 선택하면
`escalate=True`로 이 파이프라인이 다시 호출된다(사다리 B: curl_cffi 그리드 →
StealthyFetcher, `escalation.py`). Chrome CDP(사다리 6단, Akamai용)는 사용자 로컬 PC의
실제 브라우저가 있어야 해서 이 서버에는 존재할 수 없다 — Akamai로 보이면 애초에
"확인 대기"로 멈추지 않고 바로 실패 처리한다(우회해봐야 안 되므로 헛수고시키지 않는다).

"정찰"(사이트 구조 파악)은 원본 도구에서 AI 에이전트가 대화하며 판단하던 부분을, 여기서는
회원 본인의 AI 키로 하는 LLM 1회 호출(`llm.extract_selectors`)로 대체한다. 같은 도메인+
수집항목 조합을 재수집할 때는 `domain_cache`에 저장해둔 이전 셀렉터를 재사용해 이 LLM
호출(비용+시간)을 건너뛴다.
"""
import os
import sys
import traceback
from datetime import datetime, timezone
from urllib.parse import urljoin

# 이 저장소의 scripts/*.py 는 전부 "scripts/ 자체가 sys.path 에 있다"는 전제로 flat import를
# 쓴다(`from utils import ...`, `python scripts/foo.py` 로 실행될 때 스크립트 자신의 디렉터리가
# sys.path[0]이 되는 방식과 동일하게 맞춘 것). 여기서도 같은 convention을 따른다 — 새 임포트
# 스타일(`scripts.utils`)을 쓰면 이 서비스만 다른 관례가 되어 나중에 scripts/*.py 를 고칠 때
# 헷갈린다.
_SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
sys.path.insert(0, _SCRIPTS_DIR)

from utils import (  # noqa: E402
    BudgetExceeded,
    RateLimiter,
    check_robots,
    detect_pii,
    detect_softblock,
    plain_dynamic,
    plain_get,
    validate_url,
)
from export_excel import export_to_excel  # noqa: E402

import domain_cache  # noqa: E402
from escalation import fetch_escalated, fetch_escalated_by_method, looks_like_akamai  # noqa: E402
from llm import LLMError, extract_selectors  # noqa: E402
from supabase_client import get_service_client  # noqa: E402

MAX_PAGES = 5
MAX_ROWS = 2000
RESULT_BUCKET = "web-crawler-results"
MIN_STATIC_HTML_LEN = 1500  # 이보다 짧으면 CSR(클라이언트 렌더링) 의심 → 3단(브라우저)으로 승격


class PipelineError(Exception):
    """사용자에게 그대로 보여줘도 되는, 예상된 실패(최종 — 더 이상 손쓸 방법 없음)."""


class BlockedNeedsConfirmation(Exception):
    """사다리 A가 소진됐고(WAF/CAPTCHA 감지) 우회 가능성이 있다 — 실패가 아니라 사용자
    확인을 기다리는 상태로 멈춘다."""


def run_job(
    job_id: str,
    user_id: str,
    url: str,
    target_fields: list[str],
    ai_provider: str,
    ai_model: str,
    ai_api_key: str,
    max_rows: int,
    escalate: bool = False,
):
    supabase = get_service_client()
    _update_job(supabase, job_id, status="running")
    filepath = f"/tmp/{job_id}.xlsx"
    try:
        # main.py에서 이미 1~MAX_ROWS 범위로 검증하지만, 서비스 자체 안전 상한도 한 번 더
        # 강제한다(방어적 이중 체크 — API 스펙이 바뀌어도 이 함수 하나만 보면 안전함을 알 수 있게).
        effective_max_rows = min(max_rows, MAX_ROWS)
        rows, pii_warnings = _crawl(
            supabase, url, target_fields, ai_provider, ai_model, ai_api_key, effective_max_rows, escalate
        )
        export_to_excel(rows, filepath, sheet_name="수집 데이터")
        result_url = _upload_result(supabase, job_id, user_id, filepath)
        _update_job(
            supabase,
            job_id,
            status="completed",
            result_url=result_url,
            row_count=len(rows),
            pii_warning=bool(pii_warnings),
            completed_at=_now(),
        )
    except BlockedNeedsConfirmation as exc:
        # completed_at은 남기지 않는다 — 아직 끝난 게 아니라 사용자 확인을 기다리는 중이다.
        _update_job(supabase, job_id, status="blocked", error_message=str(exc))
    except (PipelineError, LLMError) as exc:
        _update_job(supabase, job_id, status="failed", error_message=str(exc), completed_at=_now())
    except Exception:
        traceback.print_exc()
        _update_job(
            supabase,
            job_id,
            status="failed",
            error_message="크롤링 중 예상하지 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            completed_at=_now(),
        )
    finally:
        # 컨테이너가 오래 떠 있으면 /tmp에 엑셀 파일이 쌓이므로 업로드 성공/실패와 무관하게 정리.
        if os.path.exists(filepath):
            os.remove(filepath)


def _crawl(
    supabase,
    url: str,
    target_fields: list[str],
    ai_provider: str,
    ai_model: str,
    ai_api_key: str,
    max_rows: int,
    escalate: bool,
):
    if not validate_url(url):
        raise PipelineError("올바르지 않은 URL입니다.")

    robots = check_robots(url)
    if robots["allowed"] is False:
        raise PipelineError(
            "이 사이트의 robots.txt가 수집을 허용하지 않습니다. "
            "이 서비스는 사이트가 명시적으로 막은 곳은 자동으로 수집하지 않습니다."
        )

    cached = None if escalate else domain_cache.get_cached_plan(supabase, url, target_fields)
    fetch_method = "ladder_a"

    if escalate:
        html, page, fetch_method = fetch_escalated(url)
        if page is None:
            raise PipelineError(
                "우회를 시도했지만 이 사이트의 보호를 넘지 못했습니다. "
                "이 서비스가 지원하는 범위를 벗어난 사이트입니다."
            )
    else:
        page, used_dynamic = _fetch(url, force_dynamic=bool(cached and cached.get("needs_dynamic")))
        html = str(page.html_content)

        softblock = detect_softblock(html, status=getattr(page, "status", 200))
        if softblock["blocked"]:
            if looks_like_akamai(html):
                raise PipelineError(
                    "이 사이트는 고급 봇 차단(Akamai 등)을 사용하고 있어 이 서비스로는 "
                    "우회할 방법이 없습니다."
                )
            raise BlockedNeedsConfirmation(
                "이 사이트는 자동 접근을 차단하고 있습니다(추가 인증/봇 확인 필요). "
                "우회를 시도해볼 수 있지만 100% 성공을 보장하지는 못합니다."
            )

    if cached:
        item_selector = cached["item_selector"]
        field_selectors = cached["field_selectors"]
        next_page_selector = cached.get("next_page_selector")
        if not page.css(item_selector):
            # 캐시된 셀렉터가 더 이상 안 맞는다(사이트 구조 변경) — 버리고 새로 정찰한다.
            domain_cache.invalidate(supabase, url, target_fields)
            cached = None

    if not cached:
        plan = extract_selectors(html, target_fields, ai_provider, ai_model, ai_api_key)
        item_selector = plan["item_selector"]
        field_selectors = plan["field_selectors"]
        next_page_selector = plan.get("next_page_selector")

    limiter = RateLimiter(delay=1.5, max_requests=500, max_consecutive_errors=3)
    rows: list[dict] = []
    current_page = page
    current_url = url

    for page_num in range(1, MAX_PAGES + 1):
        items = current_page.css(item_selector)
        if not items and page_num == 1:
            raise PipelineError(
                "AI가 반복되는 상품/게시글 영역을 찾지 못했습니다. "
                "수집 항목을 더 구체적으로 적어서 다시 시도해주세요."
            )

        for item in items:
            row = {field: str(item.css(sel).get("")).strip() for field, sel in field_selectors.items()}
            rows.append(row)
            if len(rows) >= max_rows:
                break
        if len(rows) >= max_rows or not next_page_selector or page_num >= MAX_PAGES:
            break

        next_href = current_page.css(next_page_selector).get()
        if not next_href:
            break
        next_url = urljoin(current_url, next_href)
        if next_url == current_url:
            break

        try:
            limiter.wait()
        except BudgetExceeded:
            break

        if escalate:
            _, current_page, _ = fetch_escalated_by_method(next_url, fetch_method)
            if current_page is None:
                break  # 다음 페이지부터 다시 막히면 지금까지 모은 것만 반환(전체 실패 아님)
        else:
            current_page, _ = _fetch(next_url, force_dynamic=used_dynamic)
        current_url = next_url

    if not rows:
        raise PipelineError("수집된 데이터가 없습니다.")

    if not cached:
        domain_cache.save_plan(
            supabase,
            url,
            target_fields,
            item_selector,
            field_selectors,
            next_page_selector,
            needs_dynamic=False if escalate else used_dynamic,
            fetch_method=fetch_method,
        )

    pii_warnings = detect_pii(rows)
    return rows, pii_warnings


def _fetch(url: str, force_dynamic: bool = False):
    if not force_dynamic:
        try:
            page = plain_get(url)
            if len(str(page.html_content)) >= MIN_STATIC_HTML_LEN:
                return page, False
        except Exception:
            pass
    page = plain_dynamic(url)
    return page, True


def _update_job(supabase, job_id: str, **fields):
    supabase.table("web_crawler_jobs").update(fields).eq("id", job_id).execute()


def _upload_result(supabase, job_id: str, user_id: str, filepath: str) -> str:
    storage_path = f"{user_id}/{job_id}.xlsx"
    with open(filepath, "rb") as f:
        supabase.storage.from_(RESULT_BUCKET).upload(
            storage_path,
            f,
            file_options={
                "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "upsert": "true",
            },
        )
    return supabase.storage.from_(RESULT_BUCKET).get_public_url(storage_path)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
