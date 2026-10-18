"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileCheck,
  HelpCircle,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  LayoutGrid,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { useLang } from "./LangProvider";

interface FaqItem {
  q: string;
  a: string;
  tag: string;
}

const FAQS: FaqItem[] = [
  {
    q: "JPEG 포맷으로 변환할 때 PNG의 투명 배경은 어떻게 처리되나요?",
    a: "JPEG 규격은 알파 채널(투명도)을 지원하지 않습니다. 따라서 본 스튜디오의 스마트 렌더링 엔진은 투명 배경을 자동으로 깨끗한 순백색(#FFFFFF)으로 채워 왜곡이나 검은 얼룩 없이 자연스럽게 변환합니다.",
    tag: "포맷 호환성",
  },
  {
    q: "AVIF 포맷은 어떤 환경에서 사용해야 가장 효율적인가요?",
    a: "AVIF는 최신 압축 표준으로 WebP 대비 최대 20~30% 더 작은 용량으로 초고화질을 구현합니다. 최신 크롬, 사파리, 엣지 등 모던 브라우저와 모바일 환경에서 완벽히 지원되며, 웹사이트 로딩 속도 최적화(LCP 개선)에 최적입니다.",
    tag: "차세대 압축",
  },
  {
    q: "이미지를 한 번에 몇 장까지 일괄 변환할 수 있나요?",
    a: "브라우저의 안정적인 메모리 관리를 위해 1회 업로드당 최대 300장까지 지원하며, 100장 초과 시 안정성 안내가 표시됩니다. 또한 한 변 기준 최대 16,384px 및 1.2억 화소를 초과하는 초거대 해상도는 브라우저 튕김 방지를 위해 자동 제한됩니다.",
    tag: "변환 한도",
  },
  {
    q: "2배, 4배 확대(업스케일) 시 화질이 깨지지 않는 비결은 무엇인가요?",
    a: "단순 픽셀 늘리기가 아닌 전문가용 고성능 알고리즘 'Lanczos3 리샘플링'과 '언샵 마스크(Unsharp Mask) 샤프닝' 필터가 복합 적용됩니다. 경계선 엣지를 날카롭게 보정하여 블러 없이 선명하고 디테일이 살아있는 고해상도 이미지를 생성합니다.",
    tag: "업스케일링",
  },
  {
    q: "변환한 이미지가 외부 서버로 전송되어 유출될 위험은 없나요?",
    a: "전혀 없습니다. 이미지 변환 스튜디오는 100% 클라이언트 사이드(브라우저 내부 WebAssembly 및 HTML5 Canvas)에서만 구동됩니다. 사용자의 이미지는 네트워크를 통해 서버로 1바이트도 전송되지 않으므로 기밀 문서나 개인 사진도 안심하고 처리하실 수 있습니다.",
    tag: "보안 & 프라이버시",
  },
];

export function GuideView() {
  const { t } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. 히어로 공식 가이드 배너 */}
      <div className="relative overflow-hidden rounded-3xl border border-[#1e293b] bg-gradient-to-br from-[#131926] via-[#101524] to-[#0d111d] p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 h-48 w-48 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-4 backdrop-blur-xs">
            <Sparkles size={13} className="text-violet-400" />
            <span>Creative Atelier 공식 사용자 매뉴얼</span>
            <span className="rounded-full bg-violet-400/20 px-1.5 py-0.2 text-[10px] font-mono text-violet-200">
              {APP_VERSION}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            전문가를 위한 100% 온디바이스
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              이미지 변환 & 콜라주 스튜디오
            </span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            여러 장의 이미지를 WebP·AVIF·PNG·JPEG로 초고속 일괄 변환하고, Lanczos3 엔진으로 화질 손상 없이 2×·4× 업스케일하며,
            원하는 레이아웃으로 완벽한 콜라주를 완성하세요.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/convert"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all"
            >
              <ImagePlus size={15} />
              <span>변환 스튜디오 바로가기</span>
            </Link>
            <Link
              href="/collage"
              className="inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b]/80 hover:bg-[#334155] px-4 py-2.5 text-xs font-bold text-slate-200 transition-all"
            >
              <LayoutGrid size={15} className="text-violet-400" />
              <span>콜라주 만들기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 5단계 원스톱 생성 파이프라인 다이어그램 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
            <Zap size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">5단계 원스톱 변환 & 최적화 파이프라인</h2>
            <p className="text-xs text-slate-400">초보자도 클릭 몇 번으로 끝나는 고성능 이미지 프로세싱 워크플로우</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            {
              step: "01",
              title: "파일 업로드",
              desc: "최대 300장까지 이미지 드래그앤드롭",
              detail: "JPG, PNG, WebP, GIF, SVG 등 모든 주요 이미지 형식 즉시 인식",
              icon: ImagePlus,
              color: "from-violet-600 to-indigo-600",
            },
            {
              step: "02",
              title: "출력 포맷 선택",
              desc: "WebP · AVIF · PNG · JPEG",
              detail: "목적에 맞춰 압축률과 투명도 지원 여부를 고려하여 최적 포맷 지정",
              icon: Sliders,
              color: "from-indigo-600 to-blue-600",
            },
            {
              step: "03",
              title: "업스케일 & 필터",
              desc: "Lanczos3 초고화질 확대",
              detail: "0.5× 축소부터 4× 확대까지, 언샵 마스크로 엣지 디테일 선명화",
              icon: Sparkles,
              color: "from-blue-600 to-cyan-600",
            },
            {
              step: "04",
              title: "브라우저 고속 변환",
              desc: "100% 로컬 메모리 처리",
              detail: "서버 업로드 없이 내 PC 연산력으로 수십 장을 수 초 만에 일괄 렌더링",
              icon: ShieldCheck,
              color: "from-cyan-600 to-emerald-600",
            },
            {
              step: "05",
              title: "1-Click 다운로드",
              desc: "개별 저장 & ZIP 압축",
              detail: "절감된 용량을 실시간 확인하고 개별 저장 또는 압축 파일로 한 번에 수령",
              icon: Download,
              color: "from-emerald-600 to-amber-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-[#1e293b] bg-[#111726] p-4 shadow-sm hover:border-violet-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                      STEP {item.step}
                    </span>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr ${item.color} text-white shadow-xs`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-xs font-semibold text-violet-300 mb-2">{item.desc}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 포맷별 최적 활용 매트릭스 테이블 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
            <FileCheck size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">포맷별 최적 활용 매트릭스</h2>
            <p className="text-xs text-slate-400">내 콘텐츠 목적에 가장 적합한 이미지 포맷을 선택하세요</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#111726] shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e293b] bg-[#0d121f] text-slate-400 font-semibold">
                <th className="p-3.5 pl-4">포맷</th>
                <th className="p-3.5">압축 효율</th>
                <th className="p-3.5">투명 배경</th>
                <th className="p-3.5">추천 사용처</th>
                <th className="p-3.5 pr-4">핵심 특징</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/70 text-slate-300">
              <tr className="hover:bg-[#162032]/40 transition-colors">
                <td className="p-3.5 pl-4 font-bold text-violet-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  <span>WebP (추천)</span>
                </td>
                <td className="p-3.5">
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    매우 우수 (-30~70%)
                  </span>
                </td>
                <td className="p-3.5 text-emerald-400 font-semibold">지원 (알파 채널)</td>
                <td className="p-3.5 text-white">웹사이트, 블로그, 이커머스 상세페이지</td>
                <td className="p-3.5 pr-4 text-slate-400">모든 모던 브라우저 100% 호환, 최상의 범용성</td>
              </tr>
              <tr className="hover:bg-[#162032]/40 transition-colors">
                <td className="p-3.5 pl-4 font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span>AVIF (차세대)</span>
                </td>
                <td className="p-3.5">
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20">
                    최고 압축 (-40~80%)
                  </span>
                </td>
                <td className="p-3.5 text-emerald-400 font-semibold">지원</td>
                <td className="p-3.5 text-white">최고 성능 최적화 웹, 고화질 갤러리</td>
                <td className="p-3.5 pr-4 text-slate-400">초소형 용량 대비 극상의 해상도 디테일 보존</td>
              </tr>
              <tr className="hover:bg-[#162032]/40 transition-colors">
                <td className="p-3.5 pl-4 font-bold text-blue-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>PNG</span>
                </td>
                <td className="p-3.5">
                  <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 border border-slate-500/20">
                    보통 (무손실)
                  </span>
                </td>
                <td className="p-3.5 text-emerald-400 font-semibold">완벽 지원</td>
                <td className="p-3.5 text-white">로고, 아이콘, 그래픽 소스, 인쇄용</td>
                <td className="p-3.5 pr-4 text-slate-400">100% 무손실 픽셀 보존, 투명 누끼 이미지 필수</td>
              </tr>
              <tr className="hover:bg-[#162032]/40 transition-colors">
                <td className="p-3.5 pl-4 font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>JPEG</span>
                </td>
                <td className="p-3.5">
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                    우수
                  </span>
                </td>
                <td className="p-3.5 text-rose-400">미지원 (흰색 채움)</td>
                <td className="p-3.5 text-white">일반 사진 인화, 구형 시스템 연동</td>
                <td className="p-3.5 pr-4 text-slate-400">모든 기기/레거시 뷰어 호환, 사진 압축에 특화</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 전문가 팁 & 체크리스트 카드 그리드 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 프로 팁 */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
            <Sparkles size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white">크리에이티브 아틀리에 실전 팁</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold mt-0.5">•</span>
              <div>
                <strong className="text-white">품질 85~90% 세팅 권장:</strong> WebP/AVIF 변환 시 90% 내외로 설정하면 사람의 눈으로는 구별 불가능한 화질을 유지하면서 용량은 원본 대비 최대 70%까지 줄어듭니다.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold mt-0.5">•</span>
              <div>
                <strong className="text-white">Lanczos3 리샘플링 필터:</strong> 고화질 사진을 확대하거나 축소할 때는 'Lanczos3'을 선택하세요. 모아레 현상과 블러를 억제하는 현존 최고의 리샘플러입니다.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold mt-0.5">•</span>
              <div>
                <strong className="text-white">콜라주 Cover vs Contain:</strong> 바둑판 격자로 딱 떨어지는 썸네일을 만들 때는 <code className="text-violet-300 bg-violet-950/50 px-1 py-0.5 rounded">Cover</code>를, 원본 비율을 보존해야 하는 작품집은 <code className="text-violet-300 bg-violet-950/50 px-1 py-0.5 rounded">Contain</code>을 사용하세요.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold mt-0.5">•</span>
              <div>
                <strong className="text-white">1-Click ZIP 일괄 다운로드:</strong> 대량 변환 완료 후 개별 저장할 필요 없이 상단 [ZIP 다운로드] 버튼으로 폴더째 안전하게 다운로드할 수 있습니다.
              </div>
            </li>
          </ul>
        </div>

        {/* 안전 & 체크리스트 */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#111726] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">변환 전 체크리스트</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
              <span>투명 배경이 필요한 로고나 스티커는 <strong>WebP</strong> 또는 <strong>PNG</strong>로 선택했는가?</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
              <span>확대 시 샤프닝 수치(기본 80)를 적절히 조절하여 선명도를 확보했는가?</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
              <span>최대 해상도 제한이 필요한 경우 '크기 상한 지정' 체크박스를 켰는가?</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
              <span>콜라주 작업 시 배경색(기본 #FFFFFF)과 여백(Padding/Gap)을 미리 확인했는가?</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
              <span>작업 완료 후 브라우저 탭을 닫기 전 ZIP 파일 다운로드를 마쳤는가?</span>
            </li>
          </ul>
        </div>
      </section>

      {/* 5. 트러블슈팅 FAQ 아코디언 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
            <HelpCircle size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">자주 묻는 질문 (FAQ) & 트러블슈팅</h2>
            <p className="text-xs text-slate-400">작업 중 발생할 수 있는 궁금증을 즉시 해결해 드립니다</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#111726] transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#162032]/60"
                >
                  <div className="flex items-center gap-2.5 pr-4">
                    <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20">
                      {faq.tag}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0d121f] text-slate-400">
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[#1e293b] bg-[#0d121f]/50 p-4 pt-3 text-xs text-slate-300 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
