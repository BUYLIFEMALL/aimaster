import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { TopicForm } from "@/components/topics/TopicForm";
import { TopicRow } from "@/components/topics/TopicRow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TopicsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("kakao_topics")
    .select(
      "id, topic_name, keywords, is_active, lookback_days, schedule_enabled, interval_minutes, active_hour_start, active_hour_end, notify_channels",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">관심 주제 등록</h1>
      <p className="mb-4 text-sm text-neutral-600">
        정보를 받아볼 주제와 관련 키워드를 등록해두면, 이 주제로 최신 뉴스/정보/정책/트렌드
        콘텐츠를 AI가 만들어줍니다.
      </p>

      {/* 2026-09-15: "지금 생성" 버튼이 알림 채널 설정과 별개로 동작한다고 오해해서, 카카오톡
          채널이 켜진 주제를 테스트 삼아 "지금 생성"했다가 검토 없이 374명에게 즉시
          발송돼버린 사고가 있었다. 재발 방지를 위해 이 페이지에 들어오자마자 규칙을
          한눈에 파악할 수 있도록 안내 박스를 추가했다(사용자 요청). */}
      <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
        <p className="mb-2 text-sm font-bold text-amber-900">📖 알림 채널, 이렇게 동작해요</p>
        <ul className="mb-3 space-y-1.5 text-xs leading-relaxed text-amber-900">
          <li>
            <strong>이 설정은 &ldquo;지금 생성&rdquo;(수동)과 &ldquo;예약 자동 생성&rdquo; 둘
            다에 똑같이 적용돼요.</strong> 예약을 꺼둔 상태에서 &ldquo;지금 생성&rdquo;만
            눌러도, 아래 켜둔 채널로 바로 발송됩니다.
          </li>
          <li>
            <strong>💬 카카오톡</strong> — 검토 절차 없이 <strong>즉시 발송</strong>됩니다.
            본인 카카오뿐 아니라, 카카오 채널이 연동돼 있으면{" "}
            <strong>등록해둔 수신자 목록 전체</strong>에도 자동으로 함께 나갑니다.
          </li>
          <li>
            <strong>📨 텔레그램</strong> — 발송 전 &ldquo;✅ 발행 / ❌ 발행 안 함&rdquo; 승인
            요청만 보냅니다. 실제 발행은 사람이 직접 눌러야 이뤄집니다.
          </li>
          <li>
            <strong>📧 이메일</strong> — 예약(자동) 생성일 때만 알림 메일이 갑니다. 수동
            &ldquo;지금 생성&rdquo;에는 오지 않습니다.
          </li>
        </ul>
        <p className="rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-800">
          ⚠️ 카카오톡과 텔레그램을 같이 켜두면, 텔레그램 승인 요청보다 카카오 발송이 먼저
          실행돼서 검토 기능이 의미 없어져요.
          <br />
          <strong>결과를 먼저 확인하고 보내고 싶다면 텔레그램만 켜두고</strong>, 리포트
          화면에서 확인 후 직접 발송해주세요.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">📌 새 주제 등록</h2>
        <TopicForm />
      </div>

      <div className="space-y-3">
        {(topics ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            아직 등록된 주제가 없습니다. 위에서 첫 주제를 등록해보세요.
          </p>
        ) : (
          (topics ?? []).map((t) => (
            <TopicRow
              key={t.id}
              id={t.id}
              topicName={t.topic_name}
              keywords={t.keywords}
              isActive={t.is_active}
              lookbackDays={t.lookback_days}
              scheduleEnabled={t.schedule_enabled}
              intervalMinutes={t.interval_minutes}
              activeHourStart={t.active_hour_start}
              activeHourEnd={t.active_hour_end}
              notifyChannels={t.notify_channels}
            />
          ))
        )}
      </div>
    </div>
  );
}
