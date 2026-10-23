import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* 🤖 헤더 및 캐릭터 안내 말풍선 */}
      <div className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-2xl font-black text-white shadow-lg">
            🤖
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Threads 쇼핑제휴 자동화 연동 &amp; 사용 매뉴얼
              </h1>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              쿠팡·알리·네이버·토스 제휴 상품을 1클릭으로 Threads 바이럴 카드뉴스와 최적화 캡션으로 변환하고,
              공정위 문구 부착부터 즉시·예약 포스팅까지 완벽하게 자동화하세요!
            </p>
          </div>
        </div>
      </div>

      {/* 🚀 4단계 핵심 워크플로우 비주얼 다이어그램 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            <span>4단계 바이럴 쇼핑제휴 자동화 프로세스</span>
          </h2>
          <span className="text-xs text-neutral-400">클릭 4번으로 끝나는 수익형 포스팅</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* STEP 1 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 1
              </span>
              <span className="text-lg">🔑</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/settings" className="hover:text-amber-400 transition-colors">
                플랫폼 &amp; API 연동
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Threads 공식 OAuth 계정 연동 및 Google Gemini/OpenAI, 쿠팡·알리·토스 제휴 키를 1회 등록합니다.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 2
              </span>
              <span className="text-lg">🛒</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/products" className="hover:text-blue-400 transition-colors">
                제휴 상품 등록
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              키워드 검색이나 제휴 상품 URL을 입력하면 고화질 썸네일과 나만의 트래킹 제휴 링크가 자동 저장됩니다.
            </p>
          </div>

          {/* STEP 3 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 3
              </span>
              <span className="text-lg">🔥</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/trends" className="hover:text-purple-400 transition-colors">
                떡상 탐지 &amp; 페르소나
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Threads 실시간 바이럴 글을 벤치마킹하고, 10종 AI 페르소나(자취러, 리뷰에디터 등) 문체로 캡션을 생성합니다.
            </p>
          </div>

          {/* STEP 4 */}
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-2.5 relative group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                STEP 4
              </span>
              <span className="text-lg">⚡</span>
            </div>
            <h3 className="font-bold text-sm text-white">
              <Link href="/posts/new" className="hover:text-emerald-400 transition-colors">
                카드뉴스 &amp; 발행
              </Link>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              나노바나나 AI 이미지 카드뉴스를 결합하고, 즉시 포스팅하거나 원하는 일시에 맞춰 예약 발행합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 📊 4대 제휴 플랫폼 연동 비교 가이드 테이블 */}
      <section className="rounded-2xl border border-neutral-800 bg-[#1f1f1f] p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🛒 4대 제휴 플랫폼 연동 &amp; 키 등록 가이드</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            수익을 창출할 플랫폼에 따라 필요한 사전 준비와 등록 방식이 다릅니다.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/50">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/90 text-left text-neutral-400">
                <th className="p-3 font-semibold">제휴 플랫폼</th>
                <th className="p-3 font-semibold">등록 방식</th>
                <th className="p-3 font-semibold">사전 준비 및 API 키 조건</th>
                <th className="p-3 font-semibold">장점 및 특징</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              <tr className="hover:bg-neutral-800/40 transition-colors">
                <td className="p-3 font-medium text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <span>🛒</span>
                    <span>쿠팡파트너스</span>
                  </div>
                </td>
                <td className="p-3 text-neutral-200">
                  <span className="font-bold text-neutral-100">(A) 키워드 검색</span> 자동 등록<br />
                  <span className="font-bold text-neutral-100">(B) 직링크 URL</span> 붙여넣기
                </td>
                <td className="p-3 text-neutral-400">
                  (A)는 Access/Secret Key 필요 (누적 매출 15만원 필요)<br />
                  (B)는 <span className="text-emerald-400 font-medium">키 없이 바로 URL 등록 가능</span>
                </td>
                <td className="p-3 text-neutral-300">
                  가장 높은 전환율 및 친숙한 로켓배송 상품군
                </td>
              </tr>
              <tr className="hover:bg-neutral-800/40 transition-colors">
                <td className="p-3 font-medium text-blue-300">
                  <div className="flex items-center gap-1.5">
                    <span>🌏</span>
                    <span>알리익스프레스</span>
                  </div>
                </td>
                <td className="p-3 text-neutral-200">
                  상품명 + 알리 상품 URL 입력 시 Affiliate API로 트래킹 링크 자동 변환
                </td>
                <td className="p-3 text-neutral-400">
                  알리익스프레스 어필리에이트 App Key, App Secret, Tracking ID 등록 필요
                </td>
                <td className="p-3 text-neutral-300">
                  가성비 직구·기발한 아이디어 생활용품 바이럴에 최적화
                </td>
              </tr>
              <tr className="hover:bg-neutral-800/40 transition-colors">
                <td className="p-3 font-medium text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <span>📎</span>
                    <span>네이버 브랜드커넥트</span>
                  </div>
                </td>
                <td className="p-3 text-neutral-200">
                  브랜드커넥트에서 발급받은 제휴 링크 직접 복사/붙여넣기
                </td>
                <td className="p-3 text-emerald-400 font-medium">
                  별도 API 키 발급 불필요 (누구나 즉시 사용)
                </td>
                <td className="p-3 text-neutral-300">
                  네이버 브랜드 기획전 및 고단가 뷰티/패션 상품에 유리
                </td>
              </tr>
              <tr className="hover:bg-neutral-800/40 transition-colors">
                <td className="p-3 font-medium text-sky-300">
                  <div className="flex items-center gap-1.5">
                    <span>💙</span>
                    <span>토스쇼핑 쉐어링크</span>
                  </div>
                </td>
                <td className="p-3 text-neutral-200">
                  베스트/오늘의특가 목록에서 상품 선택 등록
                </td>
                <td className="p-3 text-neutral-400">
                  Access Key, Secret Key, Publisher ID + 토스 어드민에 고정 IP 2개 등록
                </td>
                <td className="p-3 text-neutral-300">
                  모바일 토스 앱 결제 친화적 구성 및 실시간 인기 특가 상품
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
          <p>
            💡 API 키 및 계정 연동은 사이드바의{" "}
            <Link href="/settings" className="text-amber-400 font-bold underline">
              🔑 API키등록·플랫폼연동
            </Link>
            에서 안전하게 관리할 수 있습니다.
          </p>
        </div>
      </section>

      {/* ⚖️ 공정위 표시·광고 심사지침 준수 안내 카드 */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h3 className="text-sm font-bold text-amber-300">
            공정거래위원회 추천·보증 심사지침 필수 준수 안내
          </h3>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Threads에 상품 홍보 및 제휴 링크를 공유할 때는 공정거래위원회 지침에 따라 경제적 이해관계
          (수수료 지급 등)를 명확히 고지해야 계정 제재를 예방할 수 있습니다.
        </p>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-300 font-mono">
          &quot;이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.&quot;
        </div>
        <p className="text-[11px] text-amber-400/90">
          ✨ 본 자동화 시스템은 AI 캡션 작성 시 선택한 플랫폼에 맞춰 공정위 고지 문구를 글 본문 또는 첫 댓글에 자동으로 포함시켜 드립니다.
        </p>
      </section>

      {/* ❓ 자주 묻는 질문 (FAQ) */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-amber-400">💡</span>
          <span>자주 묻는 질문 (FAQ)</span>
        </h2>

        <div className="space-y-2.5">
          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>쿠팡 파트너스 API 키가 아직 없는데 사용할 수 없나요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              아닙니다! 쿠팡 파트너스 웹사이트에서 직접 생성한 제휴 링크(URL)를{" "}
              <span className="text-neutral-200 font-medium">제휴 상품 관리 → 등록</span>에서 붙여넣으시면
              API 키 없이도 즉시 고화질 썸네일과 제휴 링크가 자동 파싱되어 모든 기능을 정상 이용하실 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>AI 이미지 생성 및 캡션 작성 시 비용이 나가나요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              AIMaster의 모든 시스템은 회원 본인의 AI API 키(Google Gemini, OpenAI, Claude)를 연동하여 동작합니다.
              Google AI Studio의 Gemini 무료 티어를 이용하시면 비용 부담 없이 고품질 텍스트 및 나노바나나 이미지를 생성할 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>Threads 예약 발행은 컴퓨터를 끄거나 외출 중에도 실행되나요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              네, 클라우드 스케줄러를 통해 설정하신 일시에 맞춰 자동으로 Meta Threads 서버로 안전하게 발행됩니다.
              대시보드의 &quot;예약 게시 실행&quot; 버튼을 통해 수동으로 즉시 동기화할 수도 있습니다.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#1f1f1f] p-4 space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-amber-400 font-black">Q.</span>
              <span>카드뉴스 이미지는 몇 장까지 첨부할 수 있나요?</span>
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed pl-4">
              Threads 캐러셀 포스팅 규격에 맞춰 최대 10장까지의 고해상도 카드뉴스 또는 상품 상세 컷을 한 번에 묶어 발행할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 🚀 바로 시작하기 CTA */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">지금 바로 제휴 상품을 등록하고 첫 글을 발행해보세요!</h3>
          <p className="text-xs text-neutral-400 mt-1">
            인기 트렌드 탐색부터 상품 등록까지 3분이면 완성됩니다.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Link
            href="/products"
            className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-sm"
          >
            🛒 상품 등록하기
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            대시보드로 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
