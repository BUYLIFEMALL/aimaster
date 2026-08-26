"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Pencil, X, Check, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GoldButton from "@/components/ui/GoldButton";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type { Program, Category, MemberGrade } from "@/types/database.types";

interface PricingPlanInput {
  id?: string;
  name: string;
  billing_type: string;
  price: string;
  original_price: string;
  is_active: boolean;
  sort_order: number;
}

interface ProgramFormProps {
  program?: Program & { pricing_plans?: PricingPlanInput[] };
}

const BADGE_OPTIONS: { value: NonNullable<Program["badge"]>; label: string }[] = [
  { value: "best", label: "BEST" },
  { value: "new", label: "NEW" },
  { value: "sale", label: "SALE" },
  { value: "free", label: "FREE" },
  { value: "coming", label: "COMING SOON" },
];

const BILLING_OPTIONS = [
  { value: "monthly", label: "1개월" },
  { value: "biannual", label: "6개월" },
  { value: "annual", label: "12개월" },
  { value: "lifetime", label: "평생" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-base font-bold text-white whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 md:grid md:grid-cols-[160px_1fr] md:items-start md:gap-4 py-3 border-b border-white/5">
      <label className="text-sm text-subtext md:pt-2.5 flex items-center gap-1">
        {label}
        {required && <span className="text-gold text-xs">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

export default function ProgramForm({ program }: ProgramFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!program;

  const [categories, setCategories] = useState<Category[]>([]);
  const [grades, setGrades] = useState<MemberGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategorySlug, setEditCategorySlug] = useState("");

  const [name, setName] = useState(program?.name ?? "");
  const [slug, setSlug] = useState(program?.slug ?? "");
  const [categoryId, setCategoryId] = useState(program?.category_id ?? "");
  const [requiredGradeId, setRequiredGradeId] = useState(program?.required_grade_id ?? "");
  const [shortDesc, setShortDesc] = useState(program?.short_desc ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(program?.thumbnail_url ?? "");
  const [badge, setBadge] = useState<NonNullable<Program["badge"]> | "">(program?.badge ?? "");
  const [videoUrl, setVideoUrl] = useState(program?.video_url ?? "");
  const [appUrl, setAppUrl] = useState(program?.app_url ?? "");
  const [isActive, setIsActive] = useState(program?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(program?.sort_order ?? 0));
  const [affiliateRate, setAffiliateRate] = useState("10");

  const [plans, setPlans] = useState<PricingPlanInput[]>(
    program?.pricing_plans?.map((p) => ({
      ...p,
      price: String(p.price),
      original_price: String(p.original_price ?? ""),
    })) ?? []
  );

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => {
      setCategories(data ?? []);
    });
    supabase.from("member_grades").select("*").order("sort_order").then(({ data }) => {
      setGrades(data ?? []);
      // 새 프로그램 등록 시 기본값은 "전체 공개"가 아니라 가장 낮은 등급("일반")으로 시작한다.
      // 등록 후에는 이 화면에서 언제든 다른 등급/전체 공개로 바꿀 수 있다.
      if (!isEdit) {
        const basicGrade = (data ?? []).find((g) => g.slug === "basic") ?? (data ?? [])[0];
        if (basicGrade) setRequiredGradeId(basicGrade.id);
      }
    });
    if (isEdit && program?.id) {
      supabase.from("affiliate_rates").select("rate").eq("program_id", program.id).single()
        .then(({ data }) => { if (data) setAffiliateRate(String(data.rate)); });
    }
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-"));
    }
  };

  const slugify = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const refreshCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories(data ?? []);
  };

  const handleAddCategory = async () => {
    setCategoryError("");
    const name = newCategoryName.trim();
    const slug = (newCategorySlug.trim() || slugify(name));
    if (!name || !slug) { setCategoryError("카테고리명과 슬러그를 입력해주세요."); return; }

    const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;
    const { data, error: e } = await supabase
      .from("categories")
      .insert({ name, slug, sort_order: nextSortOrder })
      .select("id")
      .single();
    if (e) { setCategoryError(e.message); return; }

    setNewCategoryName("");
    setNewCategorySlug("");
    await refreshCategories();
    if (data?.id) setCategoryId(data.id);
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setCategoryError("");
  };

  const handleSaveCategory = async (id: string) => {
    setCategoryError("");
    const name = editCategoryName.trim();
    const slug = editCategorySlug.trim();
    if (!name || !slug) { setCategoryError("카테고리명과 슬러그를 입력해주세요."); return; }

    const { error: e } = await supabase.from("categories").update({ name, slug }).eq("id", id);
    if (e) { setCategoryError(e.message); return; }

    setEditingCategoryId(null);
    await refreshCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryError("");
    const { error: e } = await supabase.from("categories").delete().eq("id", id);
    if (e) { setCategoryError("이 카테고리를 사용 중인 프로그램이 있으면 삭제할 수 없습니다. 먼저 해당 프로그램의 카테고리를 변경해주세요."); return; }

    if (categoryId === id) setCategoryId("");
    await refreshCategories();
  };

  const addPlan = () => {
    setPlans([...plans, { name: "", billing_type: "monthly", price: "", original_price: "", is_active: true, sort_order: plans.length }]);
  };

  const removePlan = (i: number) => setPlans(plans.filter((_, idx) => idx !== i));

  const updatePlan = (i: number, field: keyof PricingPlanInput, value: string | boolean | number) => {
    setPlans(plans.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!name || !slug) { setError("프로그램명과 슬러그는 필수입니다."); setLoading(false); return; }

    try {
      const programData = {
        name, slug,
        category_id: categoryId || null,
        required_grade_id: requiredGradeId || null,
        short_desc: shortDesc || null,
        description: description || null,
        thumbnail_url: thumbnailUrl || null,
        badge: badge || null,
        video_url: videoUrl || null,
        app_url: appUrl || null,
        is_active: isActive,
        sort_order: parseInt(sortOrder) || 0,
      };

      let programId = program?.id;

      if (isEdit && programId) {
        const { error: e } = await supabase.from("programs").update(programData).eq("id", programId);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from("programs").insert(programData).select("id").single();
        if (e) throw e;
        programId = data.id;
      }

      if (programId) {
        // 예전엔 매번 전체 삭제 후 재삽입했는데, 이미 결제(subscriptions)된 플랜은 FK
        // 제약(ON DELETE NO ACTION) 때문에 삭제가 통째로 실패하면서도 에러를 확인하지
        // 않아 무시되고, 그 뒤 insert만 계속 쌓여 저장할 때마다 플랜이 중복되는 버그가
        // 있었다(2026-08-21, ai-auto-blog에서 28개까지 쌓인 것을 발견해 수정). 이제
        // 기존 id가 있으면 update, 없으면 insert, 폼에서 빠진 기존 항목만 delete하는
        // 방식으로 바꿔서 이미 결제 이력이 있는 플랜은 건드리지 않는다.
        const existingIds = new Set((program?.pricing_plans ?? []).map((p) => p.id).filter(Boolean));
        const currentIds = new Set(plans.map((p) => p.id).filter(Boolean));
        const idsToDelete = [...existingIds].filter((id) => !currentIds.has(id));

        if (idsToDelete.length > 0) {
          const { error: de } = await supabase.from("pricing_plans").delete().in("id", idsToDelete as string[]);
          if (de) {
            throw new Error(
              `일부 플랜은 이미 결제(구독) 이력이 있어 삭제할 수 없습니다. 삭제 대신 "비활성화"를 사용해주세요. (${de.message})`
            );
          }
        }

        for (const [i, p] of plans.entries()) {
          const payload = {
            program_id: programId!,
            name: p.name || BILLING_OPTIONS.find((b) => b.value === p.billing_type)?.label || p.billing_type,
            billing_type: p.billing_type,
            price: parseInt(p.price) || 0,
            original_price: p.original_price ? parseInt(p.original_price) : null,
            is_active: p.is_active,
            sort_order: i,
          };
          if (p.id) {
            const { error: ue } = await supabase.from("pricing_plans").update(payload).eq("id", p.id);
            if (ue) throw ue;
          } else {
            const { error: ie } = await supabase.from("pricing_plans").insert(payload);
            if (ie) throw ie;
          }
        }
      }

      if (programId) {
        await supabase.from("affiliate_rates").upsert({ program_id: programId, rate: parseFloat(affiliateRate) || 10 });
      }

      router.push("/admin/programs");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-3xl space-y-8">

        {/* ── 기본 정보 ── */}
        <div className="glass-card rounded-2xl p-6">
          <SectionTitle>기본 정보</SectionTitle>
          <div>
            <FieldRow label="프로그램명" required>
              <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
                className="input-dark w-full" placeholder="예: SNS 자동화 마스터" required />
            </FieldRow>
            <FieldRow label="슬러그 (URL)" required>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                className="input-dark w-full" placeholder="예: sns-automation-master" required />
              <p className="text-xs text-subtext mt-1">/programs/<span className="text-gold">{slug || "slug"}</span></p>
            </FieldRow>
            <FieldRow label="카테고리">
              <div className="flex items-center gap-2">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-dark w-full">
                  <option value="">카테고리 선택</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-subtext hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings size={14} /> 카테고리 관리
                </button>
              </div>

              {showCategoryManager && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      {editingCategoryId === cat.id ? (
                        <>
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="input-dark flex-1 text-sm"
                            placeholder="카테고리명"
                          />
                          <input
                            type="text"
                            value={editCategorySlug}
                            onChange={(e) => setEditCategorySlug(e.target.value)}
                            className="input-dark flex-1 text-sm"
                            placeholder="슬러그"
                          />
                          <button type="button" onClick={() => handleSaveCategory(cat.id)}
                            className="shrink-0 p-1.5 rounded hover:bg-white/10 text-gold">
                            <Check size={14} />
                          </button>
                          <button type="button" onClick={() => setEditingCategoryId(null)}
                            className="shrink-0 p-1.5 rounded hover:bg-white/10 text-subtext">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-white">{cat.name}</span>
                          <span className="text-xs text-subtext">{cat.slug}</span>
                          <button type="button" onClick={() => startEditCategory(cat)}
                            className="shrink-0 p-1.5 rounded hover:bg-white/10 text-subtext hover:text-white">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => handleDeleteCategory(cat.id)}
                            className="shrink-0 p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="input-dark flex-1 text-sm"
                      placeholder="새 카테고리명 (예: 쇼핑몰)"
                    />
                    <input
                      type="text"
                      value={newCategorySlug}
                      onChange={(e) => setNewCategorySlug(e.target.value)}
                      className="input-dark flex-1 text-sm"
                      placeholder="슬러그 (비우면 자동 생성)"
                    />
                    <button type="button" onClick={handleAddCategory}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-gold/10 text-gold px-3 py-2 text-xs font-medium hover:bg-gold/20">
                      <Plus size={14} /> 추가
                    </button>
                  </div>

                  {categoryError && <p className="text-xs text-red-400">{categoryError}</p>}
                </div>
              )}
            </FieldRow>
            <FieldRow label="접근가능 등급">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRequiredGradeId("")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    requiredGradeId === ""
                      ? "bg-gold text-black border-gold"
                      : "bg-white/5 text-subtext border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  전체 공개 (등급 제한 없음)
                </button>
                {grades.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setRequiredGradeId(g.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      requiredGradeId === g.id
                        ? "bg-gold text-black border-gold"
                        : "bg-white/5 text-subtext border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-subtext mt-2">
                선택한 등급 이상의 회원만 접근 가능합니다. &lsquo;일반&rsquo;을 선택하면 회원가입만 한
                모든 사용자(무료)가 접근 가능하고, &lsquo;실버/골드/VIP&rsquo;를 선택하면 해당 등급
                이상인 사용자만 접근 가능합니다.
              </p>
            </FieldRow>
            <FieldRow label="한줄 설명">
              <input type="text" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)}
                className="input-dark w-full" placeholder="프로그램을 한 문장으로 소개하세요" />
            </FieldRow>
            <FieldRow label="공개 여부">
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setIsActive(!isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-gold" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm text-white">{isActive ? "공개" : "비공개"}</span>
              </div>
            </FieldRow>
            <FieldRow label="정렬 순서">
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                className="input-dark w-32" placeholder="0" />
            </FieldRow>
          </div>
        </div>

        {/* ── 실행형 프로그램 (platform-hub) ── */}
        <div className="glass-card rounded-2xl p-6">
          <SectionTitle>실행형 프로그램 (선택)</SectionTitle>
          <p className="text-xs text-subtext mb-4">
            threads처럼 실제로 배포된 AI 웹앱이 있는 프로그램이면 실행 URL을 입력하세요.
            대시보드의 구독 카드에 &quot;실행하기&quot; 버튼이 표시됩니다. 비워두면 일반 판매 프로그램으로 동작합니다.
          </p>
          <FieldRow label="앱 실행 URL">
            <input type="url" value={appUrl} onChange={(e) => setAppUrl(e.target.value)}
              className="input-dark w-full" placeholder="https://threads.buylife.xyz" />
          </FieldRow>
        </div>

        {/* ── 미디어 ── */}
        <div className="glass-card rounded-2xl p-6">
          <SectionTitle>미디어</SectionTitle>
          <div>
            <FieldRow label="썸네일 URL">
              <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}
                className="input-dark w-full" placeholder="https://..." />
            </FieldRow>
            <FieldRow label="추천 뱃지">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBadge("")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    badge === ""
                      ? "bg-gold text-black border-gold"
                      : "bg-white/5 text-subtext border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  없음
                </button>
                {BADGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBadge(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      badge === opt.value
                        ? "bg-gold text-black border-gold"
                        : "bg-white/5 text-subtext border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-subtext mt-2">
                카드 썸네일 왼쪽 위에 표시됩니다. 카테고리별 목록/전체 목록/상세 어디서든 이 값 하나로 통일해서 보여줍니다.
              </p>
            </FieldRow>
            <FieldRow label="영상 URL">
              <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                className="input-dark w-full" placeholder="https://www.youtube.com/embed/..." />
              <p className="text-xs text-subtext mt-1">YouTube embed URL 형식으로 입력 (예: https://www.youtube.com/embed/xxxxx)</p>
            </FieldRow>
            <FieldRow label="상세 설명">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="프로그램 상세 설명을 입력하세요"
              />
            </FieldRow>
          </div>
        </div>

        {/* ── 가격 플랜 ── */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 flex-1">
              <h2 className="text-base font-bold text-white whitespace-nowrap">가격 플랜</h2>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <GoldButton type="button" variant="outline" size="sm" onClick={addPlan} className="ml-4 flex-shrink-0">
              <Plus size={14} /> 플랜 추가
            </GoldButton>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
              <p className="text-subtext text-sm">플랜이 없습니다.</p>
              <button type="button" onClick={addPlan} className="text-gold text-sm mt-1 hover:underline">+ 플랜 추가</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs text-subtext font-medium pb-3 pr-3">구독 유형</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3 pr-3">플랜명</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3 pr-3">판매가 (원)</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3 pr-3">정가 (할인 전)</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 pr-3">
                        <select value={plan.billing_type} onChange={(e) => updatePlan(i, "billing_type", e.target.value)}
                          className="input-dark w-full text-sm">
                          {BILLING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input type="text" value={plan.name} onChange={(e) => updatePlan(i, "name", e.target.value)}
                          className="input-dark w-full text-sm" placeholder="예: 스탠다드" />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={plan.price} onChange={(e) => updatePlan(i, "price", e.target.value)}
                          className="input-dark w-full text-sm" placeholder="29000" required />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" value={plan.original_price} onChange={(e) => updatePlan(i, "original_price", e.target.value)}
                          className="input-dark w-full text-sm" placeholder="39000" />
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removePlan(i)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 어필리에이트 ── */}
        <div className="glass-card rounded-2xl p-6">
          <SectionTitle>어필리에이트 설정</SectionTitle>
          <div>
            <FieldRow label="수수료율">
              <div className="flex items-center gap-2">
                <input type="number" value={affiliateRate} onChange={(e) => setAffiliateRate(e.target.value)}
                  className="input-dark w-28" placeholder="10" min="0" max="100" step="0.5" />
                <span className="text-subtext">%</span>
                <span className="text-xs text-subtext ml-2">추천인에게 지급되는 판매 수수료</span>
              </div>
            </FieldRow>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <GoldButton type="submit" size="lg" disabled={loading}>
            <Save size={18} />
            {loading ? "저장 중..." : isEdit ? "수정 저장" : "프로그램 등록"}
          </GoldButton>
          <GoldButton type="button" variant="outline" size="lg" onClick={() => router.push("/admin/programs")}>
            취소
          </GoldButton>
        </div>

      </div>
    </form>
  );
}
