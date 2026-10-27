import { createAnalysisHandler } from '@/lib/analysis/api';
import { analysisDependencies } from '@/lib/analysis/server';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export const POST=createAnalysisHandler(analysisDependencies);
export function GET(){return new Response(null,{status:405,headers:{Allow:'POST'}});}
