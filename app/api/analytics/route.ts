export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalViews, totalReports, docxCount, pdfCount, flippedCount, videoCount] = await Promise.all([
      prisma.analytics.count({ where: { type: 'view' } }),
      prisma.analytics.count({ where: { type: 'report_generated' } }),
      prisma.analytics.count({ where: { type: 'report_generated', format: 'docx' } }),
      prisma.analytics.count({ where: { type: 'report_generated', format: 'pdf' } }),
      prisma.analytics.count({ where: { type: 'report_generated', sessionType: 'flipped_class' } }),
      prisma.analytics.count({ where: { type: 'report_generated', sessionType: 'video_session' } }),
    ]);

    // Get recent 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAnalytics = await prisma.analytics.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap: Record<string, { views: number; reports: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0] ?? '';
      if (key) dailyMap[key] = { views: 0, reports: 0 };
    }

    for (const entry of recentAnalytics ?? []) {
      const key = (entry?.createdAt?.toISOString?.() ?? '').split('T')[0] ?? '';
      if (key && dailyMap[key]) {
        if (entry?.type === 'view') {
          dailyMap[key].views += 1;
        } else if (entry?.type === 'report_generated') {
          dailyMap[key].reports += 1;
        }
      }
    }

    const recentActivity = Object.entries(dailyMap ?? {}).map(([date, data]: [string, any]) => ({
      date: date ?? '',
      views: data?.views ?? 0,
      reports: data?.reports ?? 0,
    }));

    return NextResponse.json({
      totalViews: totalViews ?? 0,
      totalReports: totalReports ?? 0,
      reportsByFormat: { docx: docxCount ?? 0, pdf: pdfCount ?? 0 },
      reportsBySession: { flipped_class: flippedCount ?? 0, video_session: videoCount ?? 0 },
      recentActivity,
    });
  } catch (error: any) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = body?.type ?? 'view';
    const format = body?.format ?? null;
    const sessionType = body?.sessionType ?? null;

    await prisma.analytics.create({
      data: { type, format, sessionType },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Analytics POST error:', error);
    return NextResponse.json({ error: 'Failed to record analytics' }, { status: 500 });
  }
}
