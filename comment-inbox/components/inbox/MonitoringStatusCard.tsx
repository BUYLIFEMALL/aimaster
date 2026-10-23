import type { MonitoringStatus } from "@/lib/inbox/load";

// 2026-10-23: 세 댓글 프로그램의 자동 수집(예약 모니터링) 상태 — 보기만. 켜고 끄기·주기·실행 방식은 원래 프로그램 설정에서.
// 시각은 서버에서 그리므로 한국 시간으로 고정해서 표시한다.
const KST = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function intervalLabel(minutes: number | null): string {
  if (!minutes) return "주기 미설정";
  if (minutes % 1440 === 0) return `${minutes / 1440}일마다`;
  if (minutes % 60 === 0) return `${minutes / 60}시간마다`;
  return `${minutes}분마다`;
}

function statusChip(s: MonitoringStatus): { label: string; cls: string } {
  if (!s.enabled) return { label: "꺼짐", cls: "border-ig-border bg-ig-bg text-ig-muted" };
  if (s.paused) return { label: "일시정지", cls: "border-ig-warn/30 bg-ig-warn/10 text-ig-warn" };
  return { label: "켜짐", cls: "border-ig-success/30 bg-ig-success/10 text-ig-success" };
}

export function MonitoringStatusCard({ items }: { items: MonitoringStatus[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-ig-border bg-ig-surface p-5">
      <h2 className="text-base font-bold text-ig-text">🤖 자동 수집 상태</h2>
      <p className="mt-1 text-xs text-ig-muted">새 댓글을 주기마다 가져와 AI 초안을 만들어 두는 「예약 모니터링」 상태예요. 켜고 끄기는 각 프로그램 설정에서 합니다.</p>
      <ul className="mt-3 divide-y divide-ig-border">
        {items.map((s) => {
          const chip = statusChip(s);
          return (
            <li key={s.source} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ig-text">
                  {s.name}
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${chip.cls}`}>{chip.label}</span>
                </p>
                {s.enabled && (
                  <p className="mt-0.5 text-xs text-ig-muted">
                    {intervalLabel(s.intervalMinutes)} · {s.mode === "cronjob" ? "내 cron-job.org" : "AIMaster 기본(Vercel)"}
                    {" · "}마지막 확인 {s.lastRunAt ? KST.format(new Date(s.lastRunAt)) : "아직 없음"}
                    {" · "}다음 예정 {s.paused ? "없음(일시정지)" : s.nextAt ? `약 ${KST.format(new Date(s.nextAt))}` : "곧(5분 안)"}
                  </p>
                )}
              </div>
              <a href={s.settingsHref} target="_blank" rel="noopener noreferrer" className="shrink-0 whitespace-nowrap text-xs font-semibold text-ig-link underline">
                설정 열기 ↗
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
