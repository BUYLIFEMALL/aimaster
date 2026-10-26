import { authorizeMember } from '@/lib/access';
import { createMaterialPreviewHandler } from '@/lib/material-preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createMaterialPreviewHandler(authorizeMember);
