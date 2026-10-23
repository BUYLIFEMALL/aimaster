"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Lab은 누구나 가입한다(docs/AIMASTER_DEV_LAB_GUIDELINES.md). dev에서 이메일 확인을 끄면 가입 즉시 로그인된다.
export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(mode: "signin" | "signup") {
    setMessage("");
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (error) return setMessage(error.message);
    if (!data.session) return setMessage("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold">__LAB_NAME__</h1>
      <div className="mt-6 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="flex-1 rounded bg-gray-900 py-2 text-white" onClick={() => submit("signin")}>
            로그인
          </button>
          <button className="flex-1 rounded border py-2" onClick={() => submit("signup")}>
            가입
          </button>
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </main>
  );
}
