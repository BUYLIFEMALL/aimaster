"use client";

// 프로그램 썸네일 상단 중앙의 ♥ 추천 투표 버튼. 회원 1명이 프로그램 1개에 1표(다시 누르면 취소).
// 로그인하지 않았으면 로그인 화면으로 보냈다가 돌아온다(본인 계정으로만 투표).
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";

interface LikeButtonProps {
  programId: string;
  initialCount: number;
  initialLiked: boolean;
  loggedIn: boolean;
}

export default function LikeButton({ programId, initialCount, initialLiked, loggedIn }: LikeButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (pending) return;
    const prev = { liked, count };
    setPending(true);
    setLiked(!liked);
    setCount(Math.max(0, count + (liked ? -1 : 1)));
    try {
      const res = await fetch(`/api/programs/${programId}/like`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { liked?: boolean; count?: number } | null;
      if (!res.ok || typeof data?.liked !== "boolean") throw new Error("like failed");
      setLiked(data.liked);
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      setLiked(prev.liked);
      setCount(prev.count);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={liked}
      aria-label={liked ? "추천 취소" : "이 프로그램 추천하기"}
      title={loggedIn ? (liked ? "추천 취소" : "마음에 들면 추천(♥)해 주세요") : "로그인하고 추천(♥)에 참여하세요"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black backdrop-blur-sm border transition-all active:scale-95 cursor-pointer ${
        liked ? "bg-rose-500/90 border-rose-300/60 text-white" : "bg-black/60 border-white/25 text-white hover:bg-black/80"
      }`}
    >
      <Heart size={14} className={liked ? "fill-white text-white" : "text-rose-300"} />
      <span>{count}</span>
    </button>
  );
}
