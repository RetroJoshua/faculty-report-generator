import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { ReportFormWrapper } from '@/components/report-form-wrapper';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div className="max-w-[1200px] mx-auto px-4 pb-16">
          <ReportFormWrapper />
        </div>
      </main>
      <Footer />
    </div>
  );
}
