import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/blog/utils/supabase/admin'
import { checkProgramAccessApi } from '@/blog/utils/access'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }
  const user = access.user
  const { id } = await params

  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_candidates').delete().eq('user_id', user.id).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
