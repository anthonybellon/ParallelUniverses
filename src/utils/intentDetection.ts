import { generateText, Output } from 'ai';
import { chatModel } from './openaiClient';
import { buildIntentPrompt } from './promptTemplates';

/** True when the text asks for an alternate-history scenario. Throws if the check fails. */
export const isAlternateHistoryRequest = async (
  content: string,
  apiKey: string,
): Promise<boolean> => {
  const { output } = await generateText({
    model: chatModel(apiKey),
    temperature: 0,
    output: Output.choice({
      options: ['createAlternateTimelineEvent', 'maliciousIntent'],
    }),
    prompt: buildIntentPrompt(content),
  });
  return output === 'createAlternateTimelineEvent';
};
