"use client";

// 프로그램 공지 띠(2026-10-20, 웹툰 v1.24 첫 적용) — 메인 사이트 관리자가 공지의 「관련 프로그램」으로 이 프로그램을 고르면
// 작업 화면 맨 위에 가장 최근 공지 1건(30일 이내)을 띄운다. 「닫기」는 공지별로 이 브라우저에 기억한다.
// 공용 DB의 공개 데이터(programs·notices, 공개 읽기)만 읽는다. 다른 프로그램에 옮길 때는 programSlug와 tone(화면 밝기)만 고른다.
// 필요: lucide-react, `@/lib/supabase/client`의 createClient(). 공용 기준 코드 — 사본은 직접 고치지 않는다(docs/SHARED_MODULES.md).
import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const DISMISSED_KEY = "aimaster_dismissed_notices";
const NOTICE_BASE = "https://www.buylife.xyz/support/notice/";

interface Notice {
  id: string;
  title: string;
}

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

const TONES = {
  dark: { box: "border-sky-400/30 bg-sky-500/10 text-sky-100", accent: "text-sky-300", close: "text-sky-200/70 hover:bg-sky-500/20 hover:text-white" },
  light: { box: "border-sky-200 bg-sky-50 text-sky-900", accent: "text-sky-600", close: "text-sky-700/70 hover:bg-sky-100 hover:text-sky-900" },
} as const;

export function ProgramNoticeBanner({ programSlug, tone = "dark" }: { programSlug: string; tone?: keyof typeof TONES }) {
  const c = TONES[tone];
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 프로그램마다 DB 형식 정의(Database)에 programs·notices 표가 없을 수 있어, 이 부품은 형식 정의 없이 조회한다(2026-10-20 사본 5개 추가 때 확인).
      const supabase = createClient() as unknown as SupabaseClient;
      const { data: program } = await supabase.from("programs").select("id").eq("slug", programSlug).maybeSingle();
      if (!program) return;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("notices")
        .select("id, title")
        .eq("is_active", true)
        .contains("program_ids", [program.id])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      const dismissed = readDismissed();
      const latest = (data ?? []).find((n) => !dismissed.includes(n.id as string));
      if (alive && latest) setNotice({ id: latest.id as string, title: latest.title as string });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [programSlug]);

  if (!notice) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...readDismissed(), notice.id].slice(-50)));
    } catch {
      // 저장소를 못 쓰는 환경 — 이번 화면에서만 닫힌다
    }
    setNotice(null);
  };

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${c.box}`}>
      <Megaphone className={`h-4 w-4 shrink-0 ${c.accent}`} />
      <span className={`shrink-0 text-xs font-bold ${c.accent}`}>공지</span>
      <a
        href={`${NOTICE_BASE}${notice.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate font-semibold hover:underline"
        title={notice.title}
      >
        {notice.title}
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="공지 닫기"
        title="이 공지 닫기"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.close}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
