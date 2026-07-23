"use client";

import Link from "next/link";
import { Play } from "lucide-react";

export default function HeroSubscribeButton() {
  return (
    <Link
      href="/blog"
      className="btn-gold w-full py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 no-underline cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg"
    >
      <Play size={20} className="fill-slate-950 text-slate-950" />
      <span>지금 무료 실행 및 이용하기</span>
    </Link>
  );
}
