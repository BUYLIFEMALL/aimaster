"""service/main.py — web-crawler-saas가 호출하는 얇은 FastAPI 래퍼.

Next.js(web-crawler-saas)가 job row를 만든 뒤 이 서비스의 POST /jobs를 호출하면, 이 서비스가
백그라운드로 실제 크롤링(pipeline.run_job)을 수행하고 Supabase에 직접 결과를 기록한다.
Next.js와의 통신은 왕복 콜백 없이 단방향(트리거만)이다.
"""
import os

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from pipeline import MAX_ROWS, run_job
from supabase_client import get_service_client

app = FastAPI(title="web-crawler-saas service")

SERVICE_SECRET = os.environ.get("WEB_CRAWLER_SERVICE_SECRET")


def _verify_job_owner(job_id: str, user_id: str) -> None:
    """T-03 1단계(2026-11-18): 작업을 예약하기 전에 그 작업 행의 주인이 요청한 회원인지 확인한다.

    웹앱이 보낸 user_id를 그대로 믿지 않는다(비밀값이 새도 남의 작업을 돌리지 못하게).
    행 없음 → 404, 조회 실패·응답 모양 이상 → 503, 주인 불일치·빈 user_id → 403.
    어느 경우든 이 요청에서는 수집·캐시·작업 행 변경을 하지 않는다(읽기 1회만, fail closed).
    """
    if not job_id or not user_id:
        raise HTTPException(status_code=403, detail="작업 소유자를 확인할 수 없습니다.")
    try:
        res = (
            get_service_client()
            .table("web_crawler_jobs")
            .select("user_id")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        rows = res.data
    except Exception:
        print("[web-crawler] job_owner_lookup_failed")  # 고정 코드만 — 원문·키 미기록
        raise HTTPException(status_code=503, detail="작업 소유자를 지금 확인할 수 없습니다.")
    if not isinstance(rows, list):
        raise HTTPException(status_code=503, detail="작업 소유자를 지금 확인할 수 없습니다.")
    if not rows:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    owner = rows[0].get("user_id") if isinstance(rows[0], dict) else None
    if owner != user_id:
        print("[web-crawler] job_owner_mismatch")
        raise HTTPException(status_code=403, detail="작업 소유자가 일치하지 않습니다.")


class JobRequest(BaseModel):
    job_id: str
    user_id: str
    url: str
    target_fields: list[str]
    ai_provider: str
    ai_model: str
    ai_api_key: str
    max_rows: int = Field(gt=0, le=MAX_ROWS)


class ResumeJobRequest(BaseModel):
    """job_id는 URL path에 있으므로 여기엔 없다. status='blocked'인 작업을 사다리 B
    (curl_cffi 그리드 → StealthyFetcher)로 다시 시도할 때 웹앱이 보낸다 — API 키는 저장해두지
    않으므로 매번 새로 받는다."""

    user_id: str
    url: str
    target_fields: list[str]
    ai_provider: str
    ai_model: str
    ai_api_key: str
    max_rows: int = Field(gt=0, le=MAX_ROWS)


def _verify_secret(authorization: str | None):
    if not SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="WEB_CRAWLER_SERVICE_SECRET이 서버에 설정되지 않았습니다.")
    expected = f"Bearer {SERVICE_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="인증되지 않은 요청입니다.")


@app.get("/health")
def health():
    # T-03 전환 증명용(2026-11-18): 지금 요청을 받는 인스턴스의 커밋과 캐시 방식을 알려 준다.
    # RENDER_GIT_COMMIT은 Render가 자동으로 넣는 값(비밀 아님). 새 환경변수 0.
    return {
        "status": "ok",
        "commit": (os.environ.get("RENDER_GIT_COMMIT") or "")[:9],
        "domain_cache": "bypass",
    }


@app.post("/jobs", status_code=202)
def create_job(req: JobRequest, background_tasks: BackgroundTasks, authorization: str | None = Header(default=None)):
    _verify_secret(authorization)

    if not req.target_fields:
        raise HTTPException(status_code=400, detail="target_fields가 비어 있습니다.")

    _verify_job_owner(req.job_id, req.user_id)  # 예약 전에 확인(실패면 아래 예약 0)

    background_tasks.add_task(
        run_job,
        job_id=req.job_id,
        user_id=req.user_id,
        url=req.url,
        target_fields=req.target_fields,
        ai_provider=req.ai_provider,
        ai_model=req.ai_model,
        ai_api_key=req.ai_api_key,
        max_rows=req.max_rows,
    )
    return {"accepted": True, "job_id": req.job_id}


@app.post("/jobs/{job_id}/resume", status_code=202)
def resume_job(
    job_id: str,
    req: ResumeJobRequest,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
):
    _verify_secret(authorization)

    if not req.target_fields:
        raise HTTPException(status_code=400, detail="target_fields가 비어 있습니다.")

    _verify_job_owner(job_id, req.user_id)  # 재개도 예약 전에 같은 확인

    background_tasks.add_task(
        run_job,
        job_id=job_id,
        user_id=req.user_id,
        url=req.url,
        target_fields=req.target_fields,
        ai_provider=req.ai_provider,
        ai_model=req.ai_model,
        ai_api_key=req.ai_api_key,
        max_rows=req.max_rows,
        escalate=True,
    )
    return {"accepted": True, "job_id": job_id}
