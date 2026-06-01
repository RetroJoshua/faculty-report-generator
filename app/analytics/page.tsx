import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
          <AnalyticsDashboard />
        </div>
      </main>
      <Footer />
    </div>
  );
}
