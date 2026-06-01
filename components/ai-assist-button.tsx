'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistButtonProps {
  onGenerate: () => Promise<{ content: string; success: boolean; error?: string }>;
  onApply: (content: string) => void;
  label?: string;
  disabled?: boolean;
  aiAvailable: boolean;
}

export function AIAssistButton({ onGenerate, onApply, label = 'AI Assist', disabled = false, aiAvailable }: AIAssistButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  if (!aiAvailable) return null;

  const handleGenerate = async () => {
    setState('loading');
    setError('');
    try {
      const result = await onGenerate();
      if (result.success && result.content) {
        setContent(result.content);
        setState('preview');
      } else {
        setError(result.error || 'Generation failed');
        setState('error');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setState('error');
    }
  };

  const handleApply = () => {
    onApply(content);
    setState('idle');
    setContent('');
  };

  const handleDismiss = () => {
    setState('idle');
    setContent('');
    setError('');
  };

  return (
    <div className="relative inline-block">
      {state === 'idle' && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={label}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {label}
        </button>
      )}

      {state === 'loading' && (
        <button type="button" disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white opacity-80">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating...
        </button>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </span>
          <button type="button" onClick={handleDismiss} className="text-xs text-muted-foreground underline hover:text-foreground">Dismiss</button>
        </div>
      )}

      <AnimatePresence>
        {state === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full mt-2 left-0 right-0 min-w-[320px] max-w-[500px] bg-card border border-border rounded-xl shadow-xl p-4"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" /> AI Generated Preview
            </p>
            <div className="max-h-48 overflow-y-auto text-sm text-foreground whitespace-pre-wrap mb-3 bg-muted/50 rounded-lg p-3">
              {content}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={handleDismiss} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                Discard
              </button>
              <button type="button" onClick={handleApply} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-600 hover:to-indigo-600 transition-all flex items-center gap-1">
                <Check className="w-3 h-3" /> Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
