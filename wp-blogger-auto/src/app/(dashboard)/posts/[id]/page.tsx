import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { DraftEditor, type EditablePost } from "@/components/draft/DraftEditor";
import { STATUS_LABEL, PLATFORM_LABEL } from "@/lib/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWordpressConnection } from "@/lib/wordpressConnect";
import { loadBloggerAccount } from "@/lib/googleConnect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // 회원 세션으로 읽는다(RLS: 본인 원고만)
  const supabase = await createClient();
  const { data } = await supabase.from("wba_posts").select("id, platform, status, title, excerpt, slug, tags, html, images, updated_at, remote_id, remote_url, scheduled_at, error_detail").eq("id", id).maybeSingle();
  if (!data) notFound();
  const post: EditablePost = { id: data.id, platform: data.platform === "blogger" ? "blogger" : "wordpress", status: data.status, title: data.title, excerpt: data.excerpt ?? "", slug: data.slug ?? "", tags: data.tags ?? [], html: data.html, images: (Array.isArray(data.images) ? data.images : []) as EditablePost["images"] };
  const admin = createAdminClient();
  const connected = post.platform === "wordpress" ? !!(await loadWordpressConnection(admin, user.id)) : !!((await loadBloggerAccount(admin, user.id))?.extra as { blog_id?: string } | undefined)?.blog_id;
  const publish = { id: data.id, platform: post.platform, status: data.status, remoteId: data.remote_id, remoteUrl: data.remote_url, scheduledAt: data.scheduled_at, errorDetail: data.error_detail };
  const [label, cls] = STATUS_LABEL[post.status] ?? [post.status, "lp-tag-idle"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-black">원고 편집</h1>
        <span className={`lp-tag ${cls}`}>{label}</span>
        <span className={`lp-tag ${post.platform === "wordpress" ? "lp-tag-wp" : "lp-tag-blogger"}`}>{PLATFORM_LABEL[post.platform]}</span>
      </div>
      {sp.skipped && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">참고 주소 중 읽지 못한 곳이 있어, 읽은 자료만으로 원고를 만들었습니다.</p>}
      <DraftEditor key={data.updated_at} post={post} publish={publish} connected={connected} />
    </div>
  );
}
