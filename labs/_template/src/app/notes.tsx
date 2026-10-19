"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Note = { id: string; body: string; created_at: string };

// 예시 기능: 본인 메모만 보이고 저장된다(RLS). 실제 기능으로 바꿔 쓴다.
export default function Notes() {
  const supabase = createClient();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("__LAB_PREFIX___notes")
      .select("id, body, created_at")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setNotes(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!body.trim()) return;
    const { error } = await supabase.from("__LAB_PREFIX___notes").insert({ body });
    if (error) return setError(error.message);
    setBody("");
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <section className="mt-8">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="메모를 입력하세요"
        />
        <button className="rounded bg-gray-900 px-4 py-2 text-white" onClick={add}>
          저장
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded border px-3 py-2">
            {n.body}
          </li>
        ))}
      </ul>
      <button className="mt-8 text-sm text-gray-500 underline" onClick={logout}>
        로그아웃
      </button>
    </section>
  );
}
