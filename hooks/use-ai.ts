'use client';

import { useState, useEffect, useCallback } from 'react';

interface AIStatus {
  configured: boolean;
  available: boolean;
  model: string;
  endpoint: string | null;
}

interface UseAIReturn {
  status: AIStatus;
  loading: boolean;
  generate: (action: string, params: Record<string, any>) => Promise<{ content: string; success: boolean; error?: string }>;
  generating: boolean;
}

export function useAI(): UseAIReturn {
  const [status, setStatus] = useState<AIStatus>({
    configured: false,
    available: false,
    model: '',
    endpoint: null,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkHealth() {
      try {
        const res = await fetch('/api/ai/health');
        if (!cancelled && res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // AI not available
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkHealth();
    return () => { cancelled = true; };
  }, []);

  const generate = useCallback(async (action: string, params: Record<string, any>) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { content: '', success: false, error: err?.message || 'Request failed' };
    } finally {
      setGenerating(false);
    }
  }, []);

  return { status, loading, generate, generating };
}
