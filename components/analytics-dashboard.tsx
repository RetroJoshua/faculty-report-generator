'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Eye, FileText, FileDown, Video, BookOpen, TrendingUp, BarChart3, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { AnalyticsData } from '@/lib/types';

const AnalyticsChart = dynamic(() => import('./analytics-chart'), { ssr: false, loading: () => <div className="h-[300px] bg-muted/30 rounded-xl animate-pulse" /> });

function AnimatedCounter({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const target = value ?? 0;
    if (target === 0) { setCount(0); return; }
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      className="bg-card rounded-xl p-5 group hover:shadow-lg transition-shadow"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <span className="font-display text-3xl font-bold tracking-tight">{count}</span>
    </motion.div>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res: Response) => res?.json?.() ?? {})
      .then((d: any) => setData(d ?? null))
      .catch((e: any) => console.error('Analytics fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i: number) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-[300px] bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const safeData = data ?? { totalViews: 0, totalReports: 0, reportsByFormat: { docx: 0, pdf: 0 }, reportsBySession: { flipped_class: 0, video_session: 0 }, recentActivity: [] };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        </div>
        <p className="text-muted-foreground mb-8">Track report generation activity and application usage</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <AnimatedCounter value={safeData?.totalViews ?? 0} label="Total Views" icon={Eye} color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <AnimatedCounter value={safeData?.totalReports ?? 0} label="Reports Generated" icon={FileText} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <AnimatedCounter value={safeData?.reportsByFormat?.docx ?? 0} label="Word Downloads" icon={FileDown} color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" />
        <AnimatedCounter value={safeData?.reportsByFormat?.pdf ?? 0} label="PDF Downloads" icon={FileDown} color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-5"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Flipped Class Reports</span>
          </div>
          <span className="font-display text-2xl font-bold">{safeData?.reportsBySession?.flipped_class ?? 0}</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-5"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Video Session Reports</span>
          </div>
          <span className="font-display text-2xl font-bold">{safeData?.reportsBySession?.video_session ?? 0}</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-5"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">Total Activity</span>
          </div>
          <span className="font-display text-2xl font-bold">{(safeData?.totalViews ?? 0) + (safeData?.totalReports ?? 0)}</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-xl p-5 md:p-6"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">7-Day Activity</h3>
        </div>
        <div className="h-[300px]">
          <AnalyticsChart data={safeData?.recentActivity ?? []} />
        </div>
      </motion.div>
    </div>
  );
}
