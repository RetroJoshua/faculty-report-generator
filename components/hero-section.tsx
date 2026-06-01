'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

export function HeroSection() {
  useEffect(() => {
    // Track page view
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'view' }),
    }).catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/30 to-secondary/10 py-12 md:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
      <div className="max-w-[1200px] mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            CMR Institute of Technology
          </div>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3">
            Faculty <span className="text-primary">Report</span> Generator
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Create professional Flipped Classroom and Video Session reports with ease.
            Fill in the details below and download your report in Word or PDF format.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
