import {createNeighborImportHandler} from '@/lib/neighbors/importApi';
import {importDependencies} from '@/lib/neighbors/importServer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
export const POST=createNeighborImportHandler(importDependencies,true);
export const GET=()=>new Response(null,{status:405,headers:{Allow:'POST'}});
