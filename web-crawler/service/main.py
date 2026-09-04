"""service/main.py — web-crawler-saas가 호출하는 얇은 FastAPI 래퍼.

Next.js(web-crawler-saas)가 job row를 만든 뒤 이 서비스의 POST /jobs를 호출하면, 이 서비스가
백그라운드로 실제 크롤링(pipeline.run_job)을 수행하고 Supabase에 직접 결과를 기록한다.
Next.js와의 통신은 왕복 콜백 없이 단방향(트리거만)이다.
"""
import os

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

from pipeline import run_job

app = FastAPI(title="web-crawler-saas service")

SERVICE_SECRET = os.environ.get("WEB_CRAWLER_SERVICE_SECRET")


class JobRequest(BaseModel):
    job_id: str
    user_id: str
    url: str
    target_fields: list[str]
    ai_provider: str
    ai_api_key: str


def _verify_secret(authorization: str | None):
    if not SERVICE_SECRET:
        raise HTTPException(status_code=500, detail="WEB_CRAWLER_SERVICE_SECRET이 서버에 설정되지 않았습니다.")
    expected = f"Bearer {SERVICE_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="인증되지 않은 요청입니다.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/jobs", status_code=202)
def create_job(req: JobRequest, background_tasks: BackgroundTasks, authorization: str | None = Header(default=None)):
    _verify_secret(authorization)

    if not req.target_fields:
        raise HTTPException(status_code=400, detail="target_fields가 비어 있습니다.")

    background_tasks.add_task(
        run_job,
        job_id=req.job_id,
        user_id=req.user_id,
        url=req.url,
        target_fields=req.target_fields,
        ai_provider=req.ai_provider,
        ai_api_key=req.ai_api_key,
    )
    return {"accepted": True, "job_id": req.job_id}
