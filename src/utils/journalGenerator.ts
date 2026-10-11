import { generateText } from 'ai';
import { chatModel } from './openaiClient';
import { buildJournalPrompt, JournalPromptInput } from './promptTemplates';
import { TEXT_LIMITS } from './sanitizeInput';

/** Retells an event as a diary entry. Throws if it fails or comes back empty. */
export const generateJournal = async (
  input: JournalPromptInput,
  apiKey: string,
): Promise<string> => {
  const { text } = await generateText({
    model: chatModel(apiKey),
    maxOutputTokens: 500,
    prompt: buildJournalPrompt(input),
  });
  const journal = text.trim().slice(0, TEXT_LIMITS.description);
  if (!journal) throw new Error('The AI returned an empty diary entry.');
  return journal;
};
