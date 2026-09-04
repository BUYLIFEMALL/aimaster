"""service/pipeline.py — Phase 1 크롤링 파이프라인.

Phase 1 범위: "사다리 A"(자동 접근 차단이 없는 사이트)만 지원한다. robots.txt가 막았거나
소프트블록(WAF/CAPTCHA 등)이 감지되면 즉시 실패 처리한다 — 사람이 실시간으로 개입해
진행 여부를 확인해줄 수 없는 자동화 서비스이므로, 원본 CLI 도구처럼 "우회 시도 전 확인"을
하는 대신 아예 시도하지 않는다. 통지-확인 UI(사다리 B)는 Phase 2에서 다룬다.

"정찰"(사이트 구조 파악)은 원본 도구에서 AI 에이전트가 대화하며 판단하던 부분을, 여기서는
회원 본인의 AI 키로 하는 LLM 1회 호출(`llm.extract_selectors`)로 대체한다 — 이 서비스에서
가장 새로운/미검증 로직이다.
"""
import os
import sys
import traceback
from datetime import datetime, timezone

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

from llm import LLMError, extract_selectors  # noqa: E402
from supabase_client import get_service_client  # noqa: E402

MAX_PAGES = 5
MAX_ROWS = 2000
RESULT_BUCKET = "web-crawler-results"
MIN_STATIC_HTML_LEN = 1500  # 이보다 짧으면 CSR(클라이언트 렌더링) 의심 → 3단(브라우저)으로 승격


class PipelineError(Exception):
    """사용자에게 그대로 보여줘도 되는, 예상된 실패."""


def run_job(job_id: str, user_id: str, url: str, target_fields: list[str], ai_provider: str, ai_api_key: str):
    supabase = get_service_client()
    _update_job(supabase, job_id, status="running")
    filepath = f"/tmp/{job_id}.xlsx"
    try:
        rows, pii_warnings = _crawl(url, target_fields, ai_provider, ai_api_key)
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


def _crawl(url: str, target_fields: list[str], ai_provider: str, ai_api_key: str):
    if not validate_url(url):
        raise PipelineError("올바르지 않은 URL입니다.")

    robots = check_robots(url)
    if robots["allowed"] is False:
        raise PipelineError(
            "이 사이트의 robots.txt가 수집을 허용하지 않습니다. "
            "이 서비스는 사이트가 명시적으로 막은 곳은 자동으로 수집하지 않습니다."
        )

    page, used_dynamic = _fetch(url)
    html = str(page.html_content)

    softblock = detect_softblock(html, status=getattr(page, "status", 200))
    if softblock["blocked"]:
        raise PipelineError(
            "이 사이트는 자동 접근을 차단하고 있습니다(추가 인증/봇 확인 필요). "
            "현재 버전에서는 이런 사이트를 지원하지 않습니다."
        )

    plan = extract_selectors(html, target_fields, ai_provider, ai_api_key)
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
            if len(rows) >= MAX_ROWS:
                break
        if len(rows) >= MAX_ROWS or not next_page_selector or page_num >= MAX_PAGES:
            break

        next_href = current_page.css(next_page_selector).get()
        if not next_href:
            break
        next_url = current_page.urljoin(next_href)
        if next_url == current_url:
            break

        try:
            limiter.wait()
        except BudgetExceeded:
            break

        current_page, _ = _fetch(next_url, force_dynamic=used_dynamic)
        current_url = next_url

    if not rows:
        raise PipelineError("수집된 데이터가 없습니다.")

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
