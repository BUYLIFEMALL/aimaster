"use client";

import { useEffect, useState } from "react";
import { Link2, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";

// 「내 연동 정보」 — 회원이 한 번 연결한 플랫폼 계정을 모든 프로그램이 함께 쓴다(2026-10-20, lib/memberIntegrations.ts).
// 토큰 칸은 DB 권한상 회원이 읽을 수 없으므로, 아래처럼 칸 이름을 직접 지정해서만 읽는다(select("*") 금지).

type CatalogItem = { key: string; label: string; description: string | null; connect_program_url: string | null };
type AccountRow = {
  id: string;
  platform: string;
  username: string | null;
  external_id: string;
  token_expires_at: string | null;
  granted_scopes: string[];
  needs_reconnect: boolean;
  connected_via: string | null;
  updated_at: string;
};

const fmt = (t: string | null) =>
  t ? new Date(t).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }) : null;

export default function MemberIntegrations({ userId }: { userId: string }) {
  const supabase = createClient();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [{ data: items }, { data: rows, error: rowsError }] = await Promise.all([
      supabase
        .from("integration_catalog")
        .select("key, label, description, connect_program_url")
        .eq("kind", "oauth_account")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("member_platform_accounts")
        .select("id, platform, username, external_id, token_expires_at, granted_scopes, needs_reconnect, connected_via, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);
    setCatalog(items ?? []);
    setAccounts(rows ?? []);
    setError(rowsError ? "연동 정보를 불러오지 못했습니다." : "");
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function disconnect(id: string) {
    const { error: delError } = await supabase.from("member_platform_accounts").delete().eq("id", id).eq("user_id", userId);
    setConfirmId(null);
    if (delError) setError("연결을 해제하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    await load();
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Link2 size={18} className="text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-white">내 연동 정보</h2>
      </div>
      <p className="text-xs text-subtext mb-4">
        한 프로그램에서 연결한 플랫폼 계정은 같은 계정이 필요한 다른 프로그램에서도 다시 연결하지 않고 함께 사용됩니다.
        토큰 같은 비밀 값은 화면에 표시하지 않습니다.
      </p>

      {!loaded ? (
        <p className="text-sm text-subtext">불러오는 중...</p>
      ) : (
        <div className="space-y-3">
          {catalog.map((item) => {
            const mine = accounts.filter((a) => a.platform === item.key);
            return (
              <div key={item.key} className="rounded-xl border border-white/10 p-4">
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.description && <p className="mt-0.5 text-xs text-subtext">{item.description}</p>}

                {mine.length === 0 ? (
                  <p className="mt-2 text-xs text-subtext">
                    아직 연결된 계정이 없습니다.
                    {item.connect_program_url && (
                      <a
                        href={item.connect_program_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center gap-1 text-gold hover:underline"
                      >
                        연결하러 가기 <ExternalLink size={11} />
                      </a>
                    )}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {mine.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                        <div className="text-xs text-subtext space-y-0.5">
                          <p className="text-sm text-white">{a.username ? `@${a.username}` : a.external_id}</p>
                          {a.needs_reconnect && (
                            <p className="flex items-center gap-1 text-amber-300">
                              <AlertTriangle size={12} /> 다시 연결이 필요합니다
                            </p>
                          )}
                          {fmt(a.token_expires_at) && <p>연결 만료 예정: {fmt(a.token_expires_at)}</p>}
                          {a.granted_scopes.length > 0 && <p>받은 권한: {a.granted_scopes.join(", ")}</p>}
                          {a.connected_via && <p>연결한 프로그램: {a.connected_via}</p>}
                        </div>
                        {confirmId === a.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => disconnect(a.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">
                              정말 해제
                            </button>
                            <button onClick={() => setConfirmId(null)} className="text-xs text-subtext hover:text-white">
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(a.id)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={12} /> 연결 해제
                          </button>
                        )}
                      </div>
                    ))}
                    {confirmId && mine.some((a) => a.id === confirmId) && (
                      <p className="text-xs text-amber-300">해제하면 이 계정을 함께 쓰는 모든 프로그램에서 연결이 풀립니다.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </GlassCard>
  );
}
