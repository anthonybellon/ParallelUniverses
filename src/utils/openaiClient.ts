import { createOpenAI } from '@ai-sdk/openai';
import { AI_MODEL } from './aiConfig';

/** The chat model, called with the given key. */
export const chatModel = (apiKey: string) => createOpenAI({ apiKey })(AI_MODEL);
