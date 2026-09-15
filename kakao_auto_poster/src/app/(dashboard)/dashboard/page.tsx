import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ count: topicCount }, { count: activeTopicCount }, { count: reportCount }, { data: program }] =
    await Promise.all([
      supabase.from("kakao_topics").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("kakao_topics")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("kakao_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지 programs.description/
      // short_desc)를 그대로 가져와 보여준다(2026-09-13 요청, naver-cafe-poster 패턴을 전
      // 서브프로젝트로 확대 적용) — 이 프로그램만의 별도 텍스트를 새로 쓰지 않고, 판매 페이지
      // 내용과 항상 같은 소스를 쓰게 해서 나중에 어긋나지 않게 한다.
      // AIMaster Database 타입에는 없는 테이블이라(access.ts와 동일한 이유) 제네릭 타입 충돌을
      // 피하기 위해 from()을 느슨한 타입으로 캐스팅한다.
      (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from("programs")
        .select("description, short_desc")
        .eq("slug", "kakao-auto-posting")
        .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">대시보드</h1>

      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-neutral-700 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{topicCount ?? 0}</p>
          <p className="text-xs text-neutral-500">등록된 주제</p>
        </div>
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{activeTopicCount ?? 0}</p>
          <p className="text-xs text-neutral-500">활성 주제</p>
        </div>
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{reportCount ?? 0}</p>
          <p className="text-xs text-neutral-500">생성된 리포트</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">사용방법</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm text-neutral-600">
          <li>
            <Link href="/settings" className="font-medium text-blue-600 hover:underline">
              API키등록·플랫폼연동
            </Link>
            에서 본인 Perplexity(필수)/OpenAI(필수)/Gemini(이미지 생성용) 키를 등록합니다.
          </li>
          <li>
            <Link href="/topics" className="font-medium text-blue-600 hover:underline">
              관심 주제 등록
            </Link>
            에서 정보를 받아볼 주제 이름과 키워드(최대 10개), 검색할 기간을 등록합니다.
          </li>
          <li>
            바로 확인만 하려면 <strong>&quot;✨ 지금 리포트 생성&quot;</strong>을 눌러 즉시
            만들거나, 주기적으로 자동으로 받고 싶으면 <strong>&quot;🔔 예약 리포트 알림&quot;</strong>을
            켜고 주기·조회 범위·동작 시간대를 정합니다.
          </li>
          <li>
            같은 패널의 <strong>알림 채널</strong>에서 발송 방식을 고릅니다 — 💬 카카오톡은
            검토 없이 즉시 발송(본인 카카오 + 수신자 목록까지 자동 발송), 📨 텔레그램은
            승인 요청 후 직접 발행, 📧 이메일은 예약 자동 생성 시에만 알림 메일을
            보냅니다. 카카오톡 발송 대상은 <strong>전체 수신자</strong> 또는 특정{" "}
            <strong>그룹</strong>으로 좁힐 수 있습니다.
          </li>
          <li>
            <Link href="/reports" className="font-medium text-blue-600 hover:underline">
              생성리포트 목록
            </Link>
            에서 만들어진 콘텐츠를 확인합니다. 각 카드 하단의{" "}
            <strong>💬 카카오톡 공유</strong> 버튼으로 원하는 채팅방에 직접 골라 공유할
            수 있고, 받는 사람은 로그인 없이 바로 읽을 수 있습니다. 🔗 링크 복사·✏️
            수정·삭제도 목록에서 바로 할 수 있습니다.
          </li>
          <li>
            <Link href="/recipients" className="font-medium text-blue-600 hover:underline">
              카카오톡 수신자 목록
            </Link>
            에서 함께 받아볼 사람의 전화번호/이메일을 등록하고 그룹으로 묶어 관리합니다.
            발송 결과는{" "}
            <Link href="/broadcast-log" className="font-medium text-blue-600 hover:underline">
              발송 내역
            </Link>
            에서 확인할 수 있습니다.
          </li>
        </ol>
      </div>
    </div>
  );
}
