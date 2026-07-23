'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Search, SlidersHorizontal } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import GoldButton from '@/components/ui/GoldButton'
import { formatKRW } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        
        const { data: pData } = await supabase
          .from('programs')
          .select('*, category:categories(*), pricing_plans(*)')
          .eq('is_active', true)
          .order('sort_order')

        const { data: cData } = await supabase
          .from('categories')
          .select('*')
          .is('parent_id', null)
          .order('sort_order')

        setPrograms(pData || [])
        setCategories(cData || [])
      } catch (err) {
        console.error('[Programs Load Error]:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = searchQuery === '' || 
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (program.short_desc && program.short_desc.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = !selectedCategory || program.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          마케팅 자동화 프로그램
        </h1>
        <p className="text-subtext text-lg">
          AI 기반 마케팅 도구로 비즈니스를 성장시키세요
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
            <input
              type="text"
              placeholder="프로그램 검색..."
              className="input-dark w-full pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories Nav */}
      <div className="mb-8">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null ? 'bg-gold text-black' : 'bg-white/5 text-subtext hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id ? 'bg-gold text-black' : 'bg-white/5 text-subtext hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-20 text-subtext">
          <p className="text-xl mb-2">등록된 프로그램이 없습니다</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => {
            const minPrice = program.pricing_plans
              ?.filter((p: any) => p.is_active)
              .sort((a: any, b: any) => a.price - b.price)[0]

            const isBlogProgram = program.slug === 'ai-auto-blog' || program.name.includes('블로그') || !!program.app_url
            const executeTarget = program.app_url || '/blog'

            return (
              <GlassCard key={program.id} hover className="flex flex-col h-full p-0 overflow-hidden">
                <div className="relative aspect-video bg-white/5 overflow-hidden">
                  {program.thumbnail_url ? (
                    <Image src={program.thumbnail_url} alt={program.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                        <Play size={28} className="text-gold ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {program.category && (
                    <span className="text-xs text-gold/70 font-medium mb-1">
                      {program.category.name}
                    </span>
                  )}
                  <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 leading-snug">
                    {program.name}
                  </h3>
                  {program.short_desc && (
                    <p className="text-subtext text-sm line-clamp-2 mb-4 flex-1">
                      {program.short_desc}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                    <div>
                      {minPrice ? (
                        <>
                          <span className="text-xs text-subtext">월 </span>
                          <span className="text-gold font-bold text-lg">
                            {formatKRW(minPrice.price)}
                          </span>
                          <span className="text-xs text-subtext"> ~</span>
                        </>
                      ) : (
                        <span className="text-subtext text-sm">가격 문의</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isBlogProgram && (
                        <Link href={executeTarget}>
                          <button
                            type="button"
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer border-none"
                          >
                            <Play size={12} className="fill-slate-950 text-slate-950" />
                            <span>실행하기</span>
                          </button>
                        </Link>
                      )}
                      <Link href={`/programs/${program.slug}`}>
                        <GoldButton size="sm">자세히 보기</GoldButton>
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
