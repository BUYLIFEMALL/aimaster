import { createReaderExtensionHandler } from '@/lib/reader/api';
import { readerDependencies } from '@/lib/reader/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createReaderExtensionHandler(readerDependencies);
