export class NextRequest {}
export const NextResponse = { json: (body, init) => ({ body, status: init?.status ?? 200 }) };
