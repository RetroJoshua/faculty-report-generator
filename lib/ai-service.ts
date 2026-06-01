/**
 * AI Service Abstraction Layer
 * 
 * This module provides a pluggable AI integration layer.
 * Currently supports:
 *   - Gemma (via Ollama or any OpenAI-compatible API)
 *   - Any OpenAI-compatible endpoint (vLLM, TGI, LM Studio, etc.)
 * 
 * To connect your self-hosted Gemma:
 *   1. Set AI_ENDPOINT in .env (e.g., http://your-server:11434/v1)
 *   2. Set AI_MODEL in .env (e.g., gemma2:2b)
 *   3. Optionally set AI_API_KEY if your endpoint requires auth
 */

export interface AIConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
  enabled: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

// Default config from environment
export function getAIConfig(): AIConfig {
  return {
    endpoint: process.env.AI_ENDPOINT || '',
    model: process.env.AI_MODEL || 'gemma2:2b',
    apiKey: process.env.AI_API_KEY || '',
    enabled: Boolean(process.env.AI_ENDPOINT),
  };
}

/**
 * Check if AI service is available and responding
 */
export async function checkAIHealth(): Promise<{ available: boolean; model: string; endpoint: string }> {
  const config = getAIConfig();
  if (!config.enabled) {
    return { available: false, model: config.model, endpoint: '' };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    // Try models endpoint (OpenAI-compatible)
    const res = await fetch(`${config.endpoint}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    });
    return { available: res.ok, model: config.model, endpoint: config.endpoint };
  } catch {
    return { available: false, model: config.model, endpoint: config.endpoint };
  }
}

/**
 * Send a chat completion request to the AI endpoint
 */
export async function chatCompletion(messages: AIMessage[], options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.enabled) {
    return { content: '', success: false, error: 'AI service is not configured. Set AI_ENDPOINT in environment.' };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const body = {
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    };

    const res = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000), // 60s timeout for slower models
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      return { content: '', success: false, error: `AI request failed (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return { content, success: true };
  } catch (err: any) {
    return { content: '', success: false, error: err?.message || 'AI request failed' };
  }
}

/**
 * AI-powered helpers for report generation
 */
export const ReportAI = {
  /**
   * Generate a conduction writeup for a flipped class session
   */
  async generateConductionWriteup(params: {
    topic: string;
    subtype: string;
    totalStudents: string;
    materialsShared: string;
  }): Promise<AIResponse> {
    return chatCompletion([
      {
        role: 'system',
        content: 'You are an academic report assistant for CMR Institute of Technology. Write concise, professional conduction writeups for flipped classroom sessions. Keep it to 2-3 paragraphs. Focus on pedagogy, student engagement, and learning methodology.',
      },
      {
        role: 'user',
        content: `Write a conduction writeup for a ${params.subtype} session on "${params.topic}" with ${params.totalStudents} students. Materials shared: ${params.materialsShared}. Describe how the session was conducted including pre-class, in-class, and post-class activities.`,
      },
    ], { temperature: 0.7, maxTokens: 512 });
  },

  /**
   * Generate evaluation questions for a topic
   */
  async generateEvaluationQuestions(params: {
    topic: string;
    subtype: string;
    count?: number;
  }): Promise<AIResponse> {
    return chatCompletion([
      {
        role: 'system',
        content: 'You are an academic assessment expert. Generate clear, academically appropriate evaluation questions. Provide a mix of conceptual and application-based questions. Format as numbered list.',
      },
      {
        role: 'user',
        content: `Generate ${params.count || 5} evaluation questions for a ${params.subtype} session on the topic: "${params.topic}". Include a mix of multiple choice, short answer, and analytical questions.`,
      },
    ], { temperature: 0.8, maxTokens: 512 });
  },

  /**
   * Suggest relevant POs and PSOs based on topic and course
   */
  async suggestPOsPSOs(params: {
    topic: string;
    courseName: string;
    department: string;
  }): Promise<AIResponse> {
    return chatCompletion([
      {
        role: 'system',
        content: 'You are an academic curriculum expert familiar with NBA/NAAC accreditation. Suggest relevant Program Outcomes (POs) and Program Specific Outcomes (PSOs) that align with the given topic. Use standard PO numbering (PO1-PO12) and explain briefly how each applies.',
      },
      {
        role: 'user',
        content: `For the topic "${params.topic}" in the course "${params.courseName}" (${params.department} department), suggest the most relevant POs and PSOs with brief justifications.`,
      },
    ], { temperature: 0.5, maxTokens: 512 });
  },

  /**
   * Generate learning outcomes for a video session
   */
  async generateLearningOutcomes(params: {
    topic: string;
    duration: string;
  }): Promise<AIResponse> {
    return chatCompletion([
      {
        role: 'system',
        content: 'You are an academic curriculum designer. Generate specific, measurable learning outcomes using Bloom\'s taxonomy verbs. Format as a numbered list with 4-6 outcomes.',
      },
      {
        role: 'user',
        content: `Generate learning outcomes for a video session on "${params.topic}" (duration: ${params.duration}). Use action verbs from Bloom\'s taxonomy.`,
      },
    ], { temperature: 0.6, maxTokens: 384 });
  },

  /**
   * Analyze quiz performance and generate summary
   */
  async analyzePerformance(params: {
    topic: string;
    performanceStats: string;
  }): Promise<AIResponse> {
    return chatCompletion([
      {
        role: 'system',
        content: 'You are an academic performance analyst. Analyze the given quiz/evaluation performance data and provide a concise summary with insights and recommendations. Keep it professional and constructive.',
      },
      {
        role: 'user',
        content: `Analyze the following performance data for the topic "${params.topic}":\n${params.performanceStats}\n\nProvide a brief performance summary with key observations and improvement suggestions.`,
      },
    ], { temperature: 0.5, maxTokens: 384 });
  },
};
