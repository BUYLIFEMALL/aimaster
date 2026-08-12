import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { confirmInstagramAccountAction } from "@/lib/actions/accounts";
import { PENDING_INSTAGRAM_CONNECTION_COOKIE, type PendingInstagramConnection } from "@/lib/instagram/pendingConnection";

// Facebook OAuth 콜백에서 넘어오는 페이지 선택 화면. Make의 "연결할 페이지/프로필 선택" 단계와
// 동일한 역할 — 여러 Facebook 페이지를 관리하는 경우 어떤 인스타그램 계정으로 연결할지 직접 고른다.
export default async function SelectInstagramAccountPage() {
  await requireUser();

  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_INSTAGRAM_CONNECTION_COOKIE)?.value;

  if (!raw) {
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent("연결 세션이 만료되었습니다. 다시 시도해주세요.")}`);
  }

  let pending: PendingInstagramConnection;
  try {
    pending = JSON.parse(raw);
  } catch {
    redirect(`/accounts?error=connect_failed&reason=${encodeURIComponent("연결 세션을 해석하지 못했습니다. 다시 시도해주세요.")}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">연결할 인스타그램 계정 선택</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Facebook 계정에서 관리 중인 페이지 중, 인스타그램 비즈니스 계정이 연결된 페이지 목록입니다.
        게시글을 올릴 계정을 선택해주세요.
      </p>

      <div className="space-y-3">
        {pending.candidates.map((c) => (
          <form key={c.pageId} action={confirmInstagramAccountAction}>
            <input type="hidden" name="pageId" value={c.pageId} />
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-900 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">@{c.igUsername}</p>
                <p className="mt-1 text-xs text-neutral-500">Facebook 페이지: {c.pageName}</p>
              </div>
              <span className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                이 계정으로 연결
              </span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
