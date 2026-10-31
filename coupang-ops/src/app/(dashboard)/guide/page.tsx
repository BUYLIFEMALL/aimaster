import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { KeyRound, ShieldCheck, Zap, ArrowRight, ExternalLink, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const WING = "https://wing.coupang.com";

const STEPS = [
  { emoji: "🔑", title: "WING에서 키 발급", body: "판매자정보 → 추가판매정보 → OPEN API 키 발급" },
  { emoji: "🌐", title: "내 고정 IP 만들기", body: "Fixie 가입, 프록시 주소와 고정 IP 2개 확인" },
  { emoji: "🛡️", title: "자체개발 + IP 등록", body: "연동 방식 「자체개발」, 내 고정 IP 2개 넣기" },
  { emoji: "🧩", title: "이 프로그램에 키 등록", body: "업체코드·Access Key·Secret Key·WING 로그인 ID" },
  { emoji: "✅", title: "연결 시험 → 사용", body: "연결이 확인되면 상품 등록부터 시작" },
];

export default async function GuidePage() {
  await requireProgramAccess();

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📖"
        title="연동 & 사용 매뉴얼"
        description="쿠팡 WING Open API 키 발급부터 고정 IP 등록, 연결 시험까지 따라 하는 안내입니다."
      >
        <a
          href={WING}
          target="_blank"
          rel="noreferrer"
          className="btn-3d-indigo text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5"
        >
          <span>쿠팡 WING 셀러 열기</span>
          <ExternalLink size={12} />
        </a>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 shadow-xs">
          ⏱ 소요시간 약 10분
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-emerald-700 bg-emerald-50/50 shadow-xs">
          💳 쿠팡 API 무료 · Fixie 월 500회 무료
        </span>
      </div>

      <section className="lab-card p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs">
            🚀
          </span>
          <h2 className="text-base font-extrabold text-slate-900">연동 파이프라인 한눈에 보기</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          이 프로그램은 쿠팡이 공식 제공하는 <b>WING Open API</b>로 직결됩니다. 화면을 대신 매크로로 누르는 불안정한 방식이 아니라 정식 API 통신이므로 속도가 빠르고 계정 정지 위험이 없습니다. 판매자 본인 Fixie 계정의 고정 IP로만 쿠팡 서버와 통신합니다.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-3.5 shadow-xs transition-all hover:border-indigo-300"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-indigo-700">STEP {i + 1}</span>
                <span className="text-base" aria-hidden>{s.emoji}</span>
              </div>
              <p className="font-extrabold text-slate-900 text-[13px]">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lab-card space-y-3.5 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            1
          </span>
          <h2 className="text-base font-extrabold text-slate-900">STEP 1. WING에서 Open API 키 발급</h2>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            <a href={WING} target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              쿠팡 WING 셀러 센터
            </a>
            에 판매자 계정으로 로그인합니다.
          </li>
          <li>
            좌측 메뉴 <b>판매자정보 → 추가판매정보</b>로 이동하여 아래쪽 <b>「OPEN API 키 발급」</b> 항목을 찾습니다.
          </li>
          <li>
            「발급」 버튼을 누르면 <b>업체코드 (A로 시작하는 번호), Access Key, Secret Key</b>가 발급됩니다. (이미 발급된 경우 기존 키를 복사합니다.)
          </li>
        </ol>
        <Notice tone="warn">
          ⚠️ <b>판매정지 상태 계정</b>은 쿠팡 정책상 API 키 발급이 차단됩니다. 먼저 WING 온라인 문의를 통해 판매를 재개해 주세요.
        </Notice>
      </section>

      <section className="lab-card space-y-3.5 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            2
          </span>
          <h2 className="text-base font-extrabold text-slate-900">STEP 2. 내 고정 IP 발급 (Fixie 프록시)</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          쿠팡 WING은 보안 강화를 위해 WING에 사전 등록된 고정 IP에서 유입되는 API 호출만 승인합니다. Fixie를 통해 본인 고유의 고정 IP 2개를 발급받아 WING에 등록합니다.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            <a href="https://usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              Fixie 공식 사이트 ↗
            </a>
            에서 무료 가입 후 HTTP/HTTPS 프록시를 생성합니다.
          </li>
          <li>
            <a href="https://app.usefixie.com/" target="_blank" rel="noreferrer" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              Fixie 대시보드 ↗
            </a>
            에서 <b>프록시 URL</b>과 <b>고정 IP 2개</b>를 복사합니다.
          </li>
          <li>
            이 프로그램{" "}
            <Link href="/connect" className="font-bold text-indigo-700 underline hover:text-indigo-900">
              🔑 API키등록·플랫폼연동
            </Link>{" "}
            화면에 프록시 주소를 등록합니다.
          </li>
        </ol>
      </section>

      <section className="lab-card space-y-3.5 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            3
          </span>
          <h2 className="text-base font-extrabold text-slate-900">STEP 3. WING에 「자체개발」 + 고정 IP 2개 등록</h2>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>쿠팡 WING 「OPEN API 키 발급」 화면에서 연동 방식을 <b>「자체개발」</b>로 선택합니다.</li>
          <li>IP 입력 칸에 Fixie에서 확인한 <b>고정 IP 2개</b>를 줄바꿈 또는 쉼표로 입력하고 저장합니다.</li>
          <li>쿠팡 서버에 IP가 동기화되기까지 약 15~30분이 소요될 수 있습니다.</li>
        </ol>
      </section>

      <section className="lab-card space-y-4 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
            4
          </span>
          <h2 className="text-base font-extrabold text-slate-900">STEP 4. 프로그램에 키 등록 후 연결 시험</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          발급받은 4대 정보(업체코드, Access Key, Secret Key, WING 로그인 ID)를 등록하고 연결 시험을 누르면 WING과 즉시 통신 상태를 확인합니다.
        </p>

        <div className="pt-2">
          <Link href="/connect" className="btn-3d-indigo text-xs py-2 px-5 inline-flex items-center gap-2">
            <KeyRound size={14} />
            <span>키 등록 &amp; 플랫폼 연동 페이지로 이동</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <section className="lab-card space-y-3 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={18} className="text-indigo-600" />
          <h2 className="text-base font-extrabold text-slate-900">자주 묻는 질문 (FAQ)</h2>
        </div>
        <details className="rounded-xl border border-slate-200 p-3.5 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">
            아이템위너 자동 가격 조정이 되나요?
          </summary>
          <p className="mt-2 leading-relaxed text-slate-600 text-xs">
            아니요. 쿠팡 공식 API는 위너 여부와 경쟁사 가격을 알려 주지 않아, 이 프로그램은 위너를 추적하거나 가격을 자동으로 바꾸지 않습니다. 가격은 회원이 확인하고 직접 바꿉니다.
          </p>
        </details>
        <details className="rounded-xl border border-slate-200 p-3.5 text-sm">
          <summary className="cursor-pointer font-bold text-slate-800">쿠팡 WING API 사용료가 있나요?</summary>
          <p className="mt-2 leading-relaxed text-slate-600 text-xs">
            쿠팡 Open API는 무료입니다. 쿠팡 호출은 내 Fixie 고정 IP를 거치며, Fixie 무료 요금은 월 500회입니다. 넘으면 회원이 Fixie 요금제를 올려야 합니다. AI 기능은 내 AI 키에 사용량이 청구됩니다. 이 프로그램 이용 권한은 AIMaster 회원 등급·구독을 따릅니다.
          </p>
        </details>
      </section>
    </div>
  );
}
