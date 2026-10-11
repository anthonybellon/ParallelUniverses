import { NextResponse } from 'next/server';
import { isAiConfigured } from '@utils/aiConfig';

// Read the environment on every request rather than at build time.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ available: isAiConfigured() });
}
