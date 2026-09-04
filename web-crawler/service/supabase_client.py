"""service/supabase_client.py — service role 클라이언트 (RLS 우회, job 갱신 + 결과 업로드 전용)"""
import os

from supabase import create_client, Client

_client: Client | None = None


def get_service_client() -> Client:
    global _client
    if _client is not None:
        return _client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    _client = create_client(url, key)
    return _client
