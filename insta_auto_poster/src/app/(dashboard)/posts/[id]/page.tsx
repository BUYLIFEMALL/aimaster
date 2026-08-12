import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/posts/StatusBadge";
import { Button } from "@/components/ui/Button";
import { deletePostAction, publishNowAction } from "@/lib/actions/posts";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { PublishButton } from "@/components/posts/PublishButton";
import { isPublishStuck } from "@/lib/posts/publishStatus";

// 캐러셀(카드뉴스, 최대 4장)은 이미지마다 컨테이너 생성+FINISHED 대기를 순차로 반복해서
// 기본 실행 시간 제한(수십 초)을 넘길 수 있다. 넉넉하게 늘려 정상 처리 도중 강제 종료되지
// 않도록 한다.
export const maxDuration = 120;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: post }, { data: account }] = await Promise.all([
    supabase.from("insta_posts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("insta_accounts").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!post) notFound();

  const { data: slides } = await supabase
    .from("insta_post_slides")
    .select("image_url")
    .eq("post_id", post.id)
    .eq("user_id", user.id)
    .order("slide_order", { ascending: true });

  const imageUrls = (slides ?? []).map((s) => s.image_url).filter((url): url is string => !!url);

  // "publishing"은 정상적으로는 몇 초~몇 분 안에 published/failed로 넘어가지만,
  // 서버가 처리 도중 죽는 등의 이유로 그 상태에 영영 멈춰 재시도할 방법이 없어지는
  // 경우를 막기 위해 재시도 가능한 상태로 취급한다. 단, 아직 처리 중일 가능성이 있는
  // (updated_at이 최근인) "publishing"까지 재시도를 허용하면, 진행 중인 게시 요청 위에
  // 똑같은 요청을 한 번 더 보내 인스타그램에 중복 게시될 수 있다. 그래서 일정 시간
  // 이상 지난 "publishing"만 멈춘 것으로 보고 재시도를 허용한다.
  const publishStuck = isPublishStuck(post.status, post.updated_at);
  const isEditable =
    post.status === "draft" ||
    post.status === "scheduled" ||
    post.status === "failed" ||
    publishStuck;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">
          게시글 결과 <span className="text-sm font-normal text-neutral-400">({post.post_type === "card_news" ? "카드뉴스" : "피드"})</span>
        </h1>
        <StatusBadge status={post.status} />
      </div>

      {post.status === "failed" && post.error_message && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">게시 실패 사유</p>
          <p className="mt-1">{post.error_message}</p>
        </div>
      )}

      {post.status === "published" && post.ig_permalink && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">인스타그램에 게시되었습니다.</p>
          <a
            href={post.ig_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block underline"
          >
            {post.ig_permalink}
          </a>
        </div>
      )}

      {post.status === "scheduled" && post.scheduled_at && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          예약 게시 시각: {new Date(post.scheduled_at).toLocaleString("ko-KR")}
        </div>
      )}

      {post.status === "publishing" && !publishStuck && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">인스타그램에 게시 처리 중입니다.</p>
          <p className="mt-1">
            보통 몇십 초 정도 걸립니다. 완료될 때까지 이 버튼을 다시 누르지 마시고, 잠시 후
            새로고침해서 확인해주세요. 중복 클릭 시 같은 내용이 두 번 게시될 수 있습니다.
          </p>
        </div>
      )}

      {/* 완성된 게시글 + 이미지 미리보기 (실제 인스타그램 피드에 보이는 모습과 유사하게) */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {imageUrls.length === 1 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrls[0]} alt="게시글 이미지" className="aspect-square w-full object-cover" />
        )}
        {imageUrls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`카드뉴스 슬라이드 ${i + 1}`}
                className="aspect-square w-40 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <div className="p-5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
            {post.caption}
          </p>
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="mt-2 text-sm text-blue-700">
              {post.hashtags.map((h) => `#${h}`).join(" ")}
            </p>
          )}
          <p className="mt-3 text-xs text-neutral-400">
            {new Date(post.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-6">
        {isEditable && (
          <Link href={`/posts/${post.id}/edit`}>
            <Button type="button" variant="secondary">
              수정하기
            </Button>
          </Link>
        )}
        {isEditable && post.status !== "scheduled" && (
          <form action={publishNowAction}>
            <input type="hidden" name="postId" value={post.id} />
            <PublishButton disabled={!account} />
          </form>
        )}
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <DeleteButton variant="solid" />
        </form>
      </div>

      {isEditable && post.status !== "scheduled" && !account && (
        <p className="mt-2 text-xs text-red-600">
          인스타그램 계정이 연결되어 있지 않아 즉시 게시할 수 없습니다. 계정 연결 후 이용해주세요.
        </p>
      )}
    </div>
  );
}
