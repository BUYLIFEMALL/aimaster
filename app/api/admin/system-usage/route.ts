import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

    // 1. Fetch all programs
    const { data: programs, error: progErr } = await serviceClient
      .from("programs")
      .select("id, title, slug, category, app_url, is_active, required_grade_id, created_at")
      .order("title");

    if (progErr) {
      return NextResponse.json({ error: progErr.message }, { status: 500 });
    }

    // 2. Fetch usage logs aggregated metrics
    const { data: logs, error: logsErr } = await serviceClient
      .from("usage_logs")
      .select("program_id, user_id, created_at");

    if (logsErr) {
      console.error("Error fetching usage_logs:", logsErr);
    }

    // 3. Fetch user API keys aggregated metrics
    const { data: apiKeys, error: keysErr } = await serviceClient
      .from("user_api_keys")
      .select("program_id, user_id");

    if (keysErr) {
      console.error("Error fetching user_api_keys:", keysErr);
    }

    const nowMs = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    // Map metrics per program
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

    if (logs) {
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
    }

    // Map API keys per program
    const apiKeyMap: Record<string, { totalKeys: number; uniqueKeyUsers: Set<string> }> = {};
    if (apiKeys) {
      for (const k of apiKeys) {
        const pId = k.program_id;
        if (!pId) continue;
        if (!apiKeyMap[pId]) {
          apiKeyMap[pId] = { totalKeys: 0, uniqueKeyUsers: new Set() };
        }
        apiKeyMap[pId].totalKeys += 1;
        if (k.user_id) apiKeyMap[pId].uniqueKeyUsers.add(k.user_id);
      }
    }

    // 4. Test Vercel Live Endpoints Ping & Status
    const programMetrics = await Promise.all(
      (programs || []).map(async (prog) => {
        const pLogs = logMap[prog.id] || {
          total: 0,
          last24h: 0,
          last7d: 0,
          uniqueUsers: new Set(),
          lastActiveAt: null,
        };
        const pKeys = apiKeyMap[prog.id] || { totalKeys: 0, uniqueKeyUsers: new Set() };

        let pingStatus: "online" | "redirect" | "offline" = "offline";
        let statusCode = 0;
        let latencyMs = 0;

        if (prog.app_url) {
          const startMs = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(prog.app_url, {
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
          } catch (e) {
            latencyMs = Date.now() - startMs;
            pingStatus = "offline";
          }
        }

        return {
          id: prog.id,
          title: prog.title,
          slug: prog.slug,
          category: prog.category || "기타",
          app_url: prog.app_url,
          is_active: prog.is_active,
          metrics: {
            totalLogs: pLogs.total,
            last24hLogs: pLogs.last24h,
            last7dLogs: pLogs.last7d,
            uniqueUsersCount: pLogs.uniqueUsers.size,
            registeredApiKeys: pKeys.totalKeys,
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
    const totalApiKeys = Object.values(apiKeyMap).reduce((sum, item) => sum + item.totalKeys, 0);
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
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
