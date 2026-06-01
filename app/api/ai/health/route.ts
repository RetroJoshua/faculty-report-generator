export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { checkAIHealth, getAIConfig } from '@/lib/ai-service';

export async function GET() {
  try {
    const config = getAIConfig();
    const health = await checkAIHealth();
    return NextResponse.json({
      configured: config.enabled,
      available: health.available,
      model: health.model,
      endpoint: config.enabled ? health.endpoint : null,
    });
  } catch (err: any) {
    return NextResponse.json({ configured: false, available: false, error: err?.message }, { status: 500 });
  }
}
