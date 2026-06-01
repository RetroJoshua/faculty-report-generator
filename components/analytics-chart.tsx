'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ActivityItem {
  date: string;
  views: number;
  reports: number;
}

export default function AnalyticsChart({ data }: { data: ActivityItem[] }) {
  const chartData = (data ?? []).map((item: ActivityItem) => {
    const d = item?.date ?? '';
    const parts = d.split('-');
    const label = parts?.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
    return {
      name: label,
      Views: item?.views ?? 0,
      Reports: item?.reports ?? 0,
    };
  });

  if ((chartData?.length ?? 0) === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No activity data yet. Generate some reports to see trends!
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          label={{ value: 'Date', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
        />
        <YAxis
          tickLine={false}
          tick={{ fontSize: 10 }}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
        />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Views" fill="#60B5FF" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Reports" fill="#FF9149" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
