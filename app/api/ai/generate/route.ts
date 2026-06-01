export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAIConfig, ReportAI } from '@/lib/ai-service';

type AIAction = 'conduction_writeup' | 'evaluation_questions' | 'pos_psos' | 'learning_outcomes' | 'performance_analysis';

export async function POST(request: Request) {
  try {
    const config = getAIConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { success: false, error: 'AI is not configured. Please set AI_ENDPOINT in your environment variables.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action, params } = body as { action: AIAction; params: Record<string, any> };

    if (!action || !params) {
      return NextResponse.json({ success: false, error: 'Missing action or params' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'conduction_writeup':
        result = await ReportAI.generateConductionWriteup(params as any);
        break;
      case 'evaluation_questions':
        result = await ReportAI.generateEvaluationQuestions(params as any);
        break;
      case 'pos_psos':
        result = await ReportAI.suggestPOsPSOs(params as any);
        break;
      case 'learning_outcomes':
        result = await ReportAI.generateLearningOutcomes(params as any);
        break;
      case 'performance_analysis':
        result = await ReportAI.analyzePerformance(params as any);
        break;
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('AI generate error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal error' }, { status: 500 });
  }
}
