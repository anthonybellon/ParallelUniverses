import { generateText, Output } from 'ai';
import { z } from 'zod';

import { EventDraft } from 'src/data/events';
import { chatModel } from './openaiClient';
import { buildHistoryPrompt, HistoryPromptInput } from './promptTemplates';
import { TEXT_LIMITS } from './sanitizeInput';

const alternateHistorySchema = z.object({
  date: z.string().describe('Date of the new event, written as YYYY-MM-DD'),
  title: z.string().describe('A short title for the new event'),
  description: z
    .string()
    .describe('A few sentences on what happens and why it matters'),
});

/** Asks the AI for the next event. Throws if it fails or returns something unusable. */
export const generateAlternateHistory = async (
  input: HistoryPromptInput,
  apiKey: string,
): Promise<EventDraft> => {
  const { output } = await generateText({
    model: chatModel(apiKey),
    maxOutputTokens: 600,
    output: Output.object({
      name: 'alternate_history_event',
      schema: alternateHistorySchema,
    }),
    prompt: buildHistoryPrompt(input),
  });

  const name = output.title.trim().slice(0, TEXT_LIMITS.name);
  if (!name) throw new Error('The AI returned an event without a title.');
  return {
    name,
    date: output.date.trim().slice(0, TEXT_LIMITS.date),
    description: output.description.trim().slice(0, TEXT_LIMITS.description),
  };
};
