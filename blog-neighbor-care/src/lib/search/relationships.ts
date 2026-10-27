import type { SupabaseClient } from '@supabase/supabase-js';
import type { RelationRow } from './evidence';

// Service-role query always binds both the member and their exact connected actor blog.
// A relation for another actor account is not transferable to this profile.
export async function loadRelationshipRecords(client: SupabaseClient, userId: string, ownBlogId: string, blogIds: string[]): Promise<RelationRow[]> {
  if (!blogIds.length) return [];
  if (blogIds.length > 20 || [ownBlogId, ...blogIds].some(id => !/^[a-z0-9_-]{1,50}$/.test(id))) throw new Error('Invalid relationship scope');
  const account = async () => {
    const { data, error } = await client.from('member_platform_accounts').select('id')
      .eq('user_id', userId).eq('platform', 'naver_blog').eq('external_id', ownBlogId).eq('needs_reconnect', false).limit(2);
    if (error) throw new Error('Relationship account unavailable');
    return data?.length === 1 ? data[0].id as string : null;
  };
  const accountId = await account(); if (!accountId) return [];
  const { data, error } = await client.from('bnc_neighbors').select('neighbor_id,state,verified_at')
    .eq('user_id', userId).eq('account_id', accountId).in('neighbor_id', blogIds).limit(20);
  if (error) throw new Error('Relationship records unavailable');
  if (await account() !== accountId) return [];
  return data as RelationRow[] ?? [];
}
