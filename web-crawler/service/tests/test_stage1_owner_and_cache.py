"""T-03 1단계(2026-11-18): 작업 소유자 확인(fail closed)과 공용 캐시 우회 — 가짜 supabase, 외부 요청 0.

실행: web-crawler/.venv/Scripts/python.exe -m pytest web-crawler/service/tests -q
"""
import os
import sys

import pytest

SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

import main  # noqa: E402
import pipeline  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

SECRET = "test-secret"
AUTH = {"Authorization": f"Bearer {SECRET}"}
OWNER = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"
JOB = "33333333-3333-3333-3333-333333333333"


class FakeQuery:
    def __init__(self, client, table):
        self.client, self.table, self.op = client, table, "select"

    def select(self, *_a, **_k):
        self.op = "select"
        return self

    def update(self, *_a, **_k):
        self.op = "update"
        return self

    def insert(self, *_a, **_k):
        self.op = "insert"
        return self

    def upsert(self, *_a, **_k):
        self.op = "upsert"
        return self

    def delete(self, *_a, **_k):
        self.op = "delete"
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        self.client.calls.append((self.table, self.op))
        if self.client.mode == "raise":
            raise RuntimeError("connection reset by peer - raw detail")
        if self.client.mode == "bad_shape":
            return type("R", (), {"data": None})()
        rows = self.client.rows if self.op == "select" else []
        return type("R", (), {"data": rows})()


class FakeClient:
    def __init__(self, mode="ok", rows=None):
        self.mode, self.rows, self.calls = mode, rows or [], []

    def table(self, name):
        return FakeQuery(self, name)


@pytest.fixture
def env(monkeypatch):
    state = {"client": FakeClient(rows=[{"user_id": OWNER}]), "runs": []}
    monkeypatch.setattr(main, "SERVICE_SECRET", SECRET)
    monkeypatch.setattr(main, "get_service_client", lambda: state["client"])
    monkeypatch.setattr(main, "run_job", lambda **kw: state["runs"].append(kw))
    state["http"] = TestClient(main.app)
    return state


def body(**over):
    b = {
        "job_id": JOB,
        "user_id": OWNER,
        "url": "https://example.com/list",
        "target_fields": ["상품명"],
        "ai_provider": "anthropic",
        "ai_model": "m",
        "ai_api_key": "k",
        "max_rows": 10,
    }
    b.update(over)
    return b


def resume_body(**over):
    b = body(**over)
    b.pop("job_id")
    return b


def call(env, kind, **over):
    if kind == "start":
        return env["http"].post("/jobs", json=body(**over), headers=AUTH)
    return env["http"].post(f"/jobs/{JOB}/resume", json=resume_body(**over), headers=AUTH)


@pytest.mark.parametrize("kind", ["start", "resume"])
def test_owner_matches_schedules_as_before(env, kind):
    r = call(env, kind)
    assert r.status_code == 202
    assert len(env["runs"]) == 1
    assert env["runs"][0]["user_id"] == OWNER
    assert env["runs"][0]["job_id"] == JOB
    assert env["client"].calls == [("web_crawler_jobs", "select")]


@pytest.mark.parametrize("kind", ["start", "resume"])
@pytest.mark.parametrize(
    "client,status",
    [
        (FakeClient(rows=[{"user_id": OTHER}]), 403),  # 주인 불일치
        (FakeClient(rows=[]), 404),  # 작업 행 없음
        (FakeClient(mode="raise"), 503),  # 조회 실패
        (FakeClient(mode="bad_shape"), 503),  # 응답 모양 이상
        (FakeClient(rows=[{"other": 1}]), 403),  # user_id 칸 없음
    ],
)
def test_owner_unverified_rejects_without_side_effects(env, kind, client, status, capsys):
    env["client"] = client
    r = call(env, kind)
    assert r.status_code == status
    assert env["runs"] == [], "예약 0"
    assert all(op == "select" for _t, op in client.calls), "작업 행 변경·캐시 쓰기 0"
    assert all(t == "web_crawler_jobs" for t, _op in client.calls), "캐시 표 호출 0"
    out = capsys.readouterr().out
    assert "raw detail" not in out and "raw detail" not in r.text, "원문 오류 노출 0"


@pytest.mark.parametrize("kind", ["start", "resume"])
def test_empty_user_id_rejected_before_lookup(env, kind):
    r = call(env, kind, user_id="")
    assert r.status_code == 403
    assert env["runs"] == []
    assert env["client"].calls == []


def test_wrong_secret_never_reaches_owner_lookup(env):
    r = env["http"].post("/jobs", json=body(), headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401
    assert env["client"].calls == []
    assert env["runs"] == []


# ── 공용 캐시 우회: 수집 중 어떤 표도 부르지 않음 ──
class FakeNode:
    def __init__(self, value):
        self.value = value

    def get(self, default=""):
        return self.value

    def css(self, _sel):
        return FakeNode(self.value)


class FakePage:
    html_content = "<html>" + "x" * 2000 + "</html>"
    status = 200

    def css(self, sel):
        if sel == ".item":
            return [FakeNode("사과"), FakeNode("배")]
        return FakeNode(None)


def test_crawl_uses_no_cache_table(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(pipeline, "validate_url", lambda u: True)
    monkeypatch.setattr(pipeline, "check_robots", lambda u: {"allowed": True})
    monkeypatch.setattr(pipeline, "_fetch", lambda url, force_dynamic=False: (FakePage(), False))
    monkeypatch.setattr(pipeline, "detect_softblock", lambda html, status=200: {"blocked": False})
    monkeypatch.setattr(
        pipeline,
        "extract_selectors",
        lambda *a, **k: {"item_selector": ".item", "field_selectors": {"상품명": ".name"}, "next_page_selector": None},
    )
    rows, _pii = pipeline._crawl(client, "https://example.com/list", ["상품명"], "anthropic", "m", "k", 10, False)
    assert [r["상품명"] for r in rows] == ["사과", "배"]
    assert client.calls == [], "수집 중 캐시 조회·저장·삭제 0"


def test_pipeline_has_no_domain_cache_reference():
    assert "domain_cache" not in vars(pipeline)
    src = open(pipeline.__file__, encoding="utf-8").read()
    code = "\n".join(l for l in src.splitlines() if not l.lstrip().startswith("#"))
    for name in ("get_cached_plan", "save_plan", "invalidate(", "web_crawler_domain_profiles"):
        assert name not in code, name


def test_health_reports_stage_marker(env, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abcdef1234567890")
    r = env["http"].get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "commit": "abcdef123", "domain_cache": "bypass"}
    assert env["client"].calls == []
