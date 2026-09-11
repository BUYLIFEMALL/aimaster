import { DraftItem } from "./DraftItem";
import type { CafePost, CafeTarget } from "@/types/post";

export function DraftList({
  drafts,
  targets,
  hasNaverAccount,
  editId,
}: {
  drafts: CafePost[];
  targets: CafeTarget[];
  hasNaverAccount: boolean;
  editId?: string;
}) {
  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        아직 작성한 초안이 없습니다. 위에서 새 초안을 만들어보세요.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {drafts.map((post) => (
        <DraftItem
          key={post.id}
          post={post}
          targets={targets}
          hasNaverAccount={hasNaverAccount}
          startInEdit={post.id === editId}
        />
      ))}
    </ul>
  );
}
