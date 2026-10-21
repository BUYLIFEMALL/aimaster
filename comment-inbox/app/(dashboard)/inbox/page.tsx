import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { loadInbox, loadSourceAccess, PLATFORM_LABEL, SOURCE_PROGRAMS, type InboxPlatform, type SourceKey } from "@/lib/inbox/load";
import { InboxList } from "@/components/inbox/InboxList";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FILTER_KEYS: InboxPlatform[] = ["ig_dm", "ig_comment", "threads", "youtube"];

export default async function InboxPage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await requireProgramAccess();
  const access = await loadSourceAccess(user.id);
  const all = await loadInbox(user.id, access);
  const filter = FILTER_KEYS.includes(searchParams.p as InboxPlatform) ? (searchParams.p as InboxPlatform) : null;
  const items = filter ? all.filter((i) => i.platform === filter) : all;
  const noAccess = (Object.keys(SOURCE_PROGRAMS) as SourceKey[]).filter((k) => !access[k]);
  const urgentDm = all.filter((i) => i.platform === "ig_dm" && i.dmLeftMs != null && i.dmLeftMs < 4 * 3_600_000).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* 머리 카드 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-ig-border bg-ig-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-ig-text">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-lg">📥</span>
            {filter ? PLATFORM_LABEL[filter] : "통합 받은편지함"}
            <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-xs font-bold text-pink-400">{APP_VERSION}</span>
          </h1>
          <p className="mt-1 text-sm text-ig-muted">
            인스타·쓰레드·유튜브에서 AI 초안이 준비된 댓글과 DM을 급한 순서로 모았어요. 고쳐서 바로 승인하면 실제로 게시·발송됩니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-center">
          <div className="rounded-xl border border-ig-border bg-ig-bg px-4 py-2">
            <p className="text-xl font-extrabold text-ig-text">{all.length}</p>
            <p className="text-[11px] text-ig-muted">검토 대기</p>
          </div>
          <div className="rounded-xl border border-ig-warn/30 bg-ig-warn/10 px-4 py-2">
            <p className="text-xl font-extrabold text-ig-warn">{urgentDm}</p>
            <p className="text-[11px] text-ig-muted">4시간 안 DM</p>
          </div>
        </div>
      </div>

      {noAccess.length > 0 && (
        <div className="rounded-xl border border-ig-border bg-ig-surface p-4 text-xs leading-relaxed text-ig-muted">
          🔒 이용 권한이 없는 프로그램의 항목은 보이지 않아요:{" "}
          {noAccess.map((k, i) => (
            <span key={k}>
              {i > 0 && " · "}
              <a href={`https://www.buylife.xyz/programs/${SOURCE_PROGRAMS[k].slug}`} target="_blank" rel="noreferrer" className="font-semibold text-pink-400 hover:underline">
                {SOURCE_PROGRAMS[k].name}
              </a>
            </span>
          ))}
        </div>
      )}

      {/* v1.04: 빈 상태도 목록 부품이 그린다(마지막 항목을 건너뛴 뒤에도 되돌리기 알림이 남게) */}
      <InboxList
        items={items}
        empty={
            <div className="ig-card py-16 text-center">
              <div className="mb-3 text-5xl">📭</div>
              <p className="text-sm text-ig-muted">지금은 검토할 {filter ? PLATFORM_LABEL[filter] : "댓글·DM"}이 없어요.</p>
              <p className="mt-2 text-xs text-ig-muted">
                새 댓글은 각 원래 프로그램이 모니터링으로 가져오고 AI 초안을 만들어 두면 여기에 나타나요.{" "}
                <Link href="/guide" className="font-semibold text-pink-400 hover:underline">
                  사용 매뉴얼
                </Link>
              </p>
            </div>
        }
      />
    </div>
  );
}
