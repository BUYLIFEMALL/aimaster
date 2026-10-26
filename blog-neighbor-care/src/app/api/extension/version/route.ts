import { READER_VERSION } from '@/lib/reader/api';
export function GET() {
  return Response.json({ version: READER_VERSION, protocol: 1,
    downloadUrl: 'https://blog-neighbor-care.buylife.xyz/downloads/blog-neighbor-care-extension-latest.zip' },
  { headers: { 'Cache-Control': 'no-store' } });
}
