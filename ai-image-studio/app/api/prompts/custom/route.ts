import { checkProgramAccessApi } from '@/lib/access';
import { createClient } from '@/lib/supabase/server';
import { createCustomPromptHandlers } from '@/lib/prompts/customPromptHandlers';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const handlers = createCustomPromptHandlers({ authorize: checkProgramAccessApi, client: createClient });
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
