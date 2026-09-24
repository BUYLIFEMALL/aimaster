import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const serviceClient = createServiceClient();

    // 1. Fetch all programs with category name
    const { data: programs, error: progErr } = await serviceClient
      .from("programs")
      .select("id, name, slug, app_url, is_active, created_at, categories(name)")
      .order("name");

    if (progErr) {
      console.error("Programs fetch error:", progErr);
      return NextResponse.json({ error: progErr.message }, { status: 500 });
    }

    // 2. Fetch usage logs safely
    let logs: { program_id: string | null; user_id: string | null; created_at: string }[] = [];
    try {
      const { data: logData } = await serviceClient
        .from("usage_logs")
        .select("program_id, user_id, created_at");
      if (logData) logs = logData;
    } catch (e) {
      console.error("usage_logs query error:", e);
    }

    // 3. Fetch user API keys safely
    let apiKeys: { user_id: string | null; provider: string | null }[] = [];
    try {
      const { data: keyData } = await serviceClient
        .from("user_api_keys")
        .select("user_id, provider");
      if (keyData) apiKeys = keyData;
    } catch (e) {
      console.error("user_api_keys query error:", e);
    }

    const nowMs = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    // Aggregate usage logs per program_id
    const logMap: Record<
      string,
      {
        total: number;
        last24h: number;
        last7d: number;
        uniqueUsers: Set<string>;
        lastActiveAt: string | null;
      }
    > = {};

    for (const log of logs) {
      const pId = log.program_id;
      if (!pId) continue;
      if (!logMap[pId]) {
        logMap[pId] = {
          total: 0,
          last24h: 0,
          last7d: 0,
          uniqueUsers: new Set(),
          lastActiveAt: null,
        };
      }
      const item = logMap[pId];
      item.total += 1;
      if (log.user_id) item.uniqueUsers.add(log.user_id);

      const createdMs = new Date(log.created_at).getTime();
      if (nowMs - createdMs <= ms24h) item.last24h += 1;
      if (nowMs - createdMs <= ms7d) item.last7d += 1;

      if (!item.lastActiveAt || createdMs > new Date(item.lastActiveAt).getTime()) {
        item.lastActiveAt = log.created_at;
      }
    }

    // Test Vercel Live Endpoints Ping & Status
    const programMetrics = await Promise.all(
      (programs || []).map(async (prog) => {
        const pLogs = logMap[prog.id] || {
          total: 0,
          last24h: 0,
          last7d: 0,
          uniqueUsers: new Set(),
          lastActiveAt: null,
        };

        const categoryName =
          (prog.categories as unknown as { name?: string })?.name || "기타";

        let pingStatus: "online" | "redirect" | "offline" = "offline";
        let statusCode = 0;
        let latencyMs = 0;

        const url = prog.app_url;
        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
          const startMs = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(url, {
              method: "GET",
              signal: controller.signal,
              cache: "no-store",
            });
            clearTimeout(timeoutId);
            latencyMs = Date.now() - startMs;
            statusCode = res.status;
            if (res.status >= 200 && res.status < 300) {
              pingStatus = "online";
            } else if (res.status >= 300 && res.status < 400) {
              pingStatus = "redirect";
            } else {
              pingStatus = "offline";
            }
          } catch {
            latencyMs = Date.now() - startMs;
            pingStatus = "offline";
          }
        }

        return {
          id: prog.id,
          name: prog.name,
          slug: prog.slug,
          category: categoryName,
          app_url: prog.app_url,
          is_active: prog.is_active,
          metrics: {
            totalLogs: pLogs.total,
            last24hLogs: pLogs.last24h,
            last7dLogs: pLogs.last7d,
            uniqueUsersCount: pLogs.uniqueUsers.size,
            lastActiveAt: pLogs.lastActiveAt,
          },
          health: {
            status: pingStatus,
            statusCode,
            latencyMs,
          },
        };
      })
    );

    // Compute Totals
    const totalLogs = Object.values(logMap).reduce((sum, item) => sum + item.total, 0);
    const total24hLogs = Object.values(logMap).reduce((sum, item) => sum + item.last24h, 0);
    const total7dLogs = Object.values(logMap).reduce((sum, item) => sum + item.last7d, 0);
    const totalApiKeys = apiKeys.length;
    const totalPrograms = programMetrics.length;
    const onlinePrograms = programMetrics.filter(
      (p) => p.health.status === "online" || p.health.status === "redirect"
    ).length;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalPrograms,
        onlinePrograms,
        totalLogs,
        total24hLogs,
        total7dLogs,
        totalApiKeys,
      },
      programs: programMetrics,
    });
  } catch (error: any) {
    console.error("System Usage Monitor API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
