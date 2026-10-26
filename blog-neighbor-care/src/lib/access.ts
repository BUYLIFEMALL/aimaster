import 'server-only';
import { checkProgramAccess } from './programAccess';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import type { Access } from './work-api';

export const PROGRAM_SLUG = 'blog-neighbor-care';

export async function authorizeProgramUser(userId: string): Promise<Access> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || new URL(url).hostname !== 'esgxyikcnnvmlhygjkth.supabase.co') throw new Error('Operating project required');
  const admin = createAdminClient();
  const { data: program, error: programError } = await admin.from('programs').select('id')
    .eq('slug', PROGRAM_SLUG).eq('is_active', true).maybeSingle();
  if (programError) throw new Error('Program lookup failed');
  if (!program) return { allowed: false, status: 403, error: '현재 이용 가능한 프로그램이 아닙니다.' };
  const access = await checkProgramAccess(admin, userId, PROGRAM_SLUG);
  if (!access.allowed) return {
    allowed: false, status: 403, error: access.reason === 'phone_required' ? '핸드폰 번호를 등록해 주세요.' : '프로그램 이용 권한을 확인해 주세요.',
  };
  return { allowed: true, userId };
}

export async function authorizeMember(): Promise<Access> {
  const session = await createClient();
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) return { allowed: false, status: 401, error: '로그인이 필요합니다.' };
  return authorizeProgramUser(data.user.id);
}
