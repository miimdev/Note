'use client';

import { aiActionSchema, type AiActionInput } from '@/lib/validation/schemas';

export const AI_ENABLED =
  process.env.NEXT_PUBLIC_AI_ENABLED === 'true' || process.env.NEXT_PUBLIC_AI_ENABLED === '1';

export type AiActionResult = {
  result: string;
  action: AiActionInput['action'];
  model: string;
};

/** Calls the server route; the API key never reaches the browser. */
export async function runAiAction(input: AiActionInput): Promise<AiActionResult> {
  const parsed = aiActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر است');
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  const payload = (await response.json()) as { result?: string; error?: string; model?: string };
  if (!response.ok || !payload.result) {
    throw new Error(payload.error ?? 'پاسخ دستیار دریافت نشد');
  }

  return { result: payload.result, action: parsed.data.action, model: payload.model ?? 'unknown' };
}
