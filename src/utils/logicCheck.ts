import { generateText, Output } from 'ai';
import { z } from 'zod';
import { chatModel } from './openaiClient';
import {
  buildLogicCheckPrompt,
  LogicCheckPromptInput,
} from './promptTemplates';

const NOTE_LIMIT = 400;

export const logicCheckSchema = z.object({
  verdict: z.enum(['plausible', 'questionable', 'implausible']),
  timing: z.object({
    ok: z.boolean().describe('True when the timing is plausible'),
    note: z.string().describe('One or two sentences on the timing'),
  }),
  divergence: z.object({
    ok: z
      .boolean()
      .describe('True when the event follows from what came before'),
    note: z.string().describe('One or two sentences on how it follows on'),
  }),
  suggestions: z
    .array(z.string())
    .describe('Up to three short, concrete fixes; empty when plausible'),
});

export type LogicCheckResult = z.infer<typeof logicCheckSchema>;

const clip = (text: string) => text.trim().slice(0, NOTE_LIMIT);

/** Asks the AI whether an event's timing and divergence make sense. */
export const runLogicCheck = async (
  input: LogicCheckPromptInput,
  apiKey: string,
): Promise<LogicCheckResult> => {
  const { output } = await generateText({
    model: chatModel(apiKey),
    temperature: 0.2,
    maxOutputTokens: 500,
    output: Output.object({ name: 'logic_check', schema: logicCheckSchema }),
    prompt: buildLogicCheckPrompt(input),
  });
  return {
    verdict: output.verdict,
    timing: { ok: output.timing.ok, note: clip(output.timing.note) },
    divergence: {
      ok: output.divergence.ok,
      note: clip(output.divergence.note),
    },
    suggestions: output.suggestions.slice(0, 3).map(clip).filter(Boolean),
  };
};
