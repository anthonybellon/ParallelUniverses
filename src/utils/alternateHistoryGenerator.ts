import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { createOpenAIFnRunnable } from 'langchain/chains/openai_functions';
import { z } from 'zod';

import { HISTORY_TEMPLATE } from './promptTemplates';

const alternateHistorySchema = z.object({
  date: z.string(),
  title: z.string(),
  description: z.string(),
});

export interface AlternateHistory {
  date: string;
  title: string;
  description: string;
}

const openAIFunction = {
  name: 'generate_alternate_history',
  description:
    'Generate an alternate history based on a given historical event and hypothetical scenario.',
  parameters: {
    title: 'generate_alternate_history',
    description:
      'Generate an alternate history for a specified date, title, and description.',
    type: 'object',
    properties: {
      date: { type: 'string', description: 'The date of the alternate event' },
      title: {
        type: 'string',
        description: 'The title of the alternate event',
      },
      description: {
        type: 'string',
        description: 'A summary of the alternate history outcome',
      },
    },
    required: ['date', 'title', 'description'],
  },
};

export const generateAlternateHistory = async (
  date: string,
  title: string,
  description: string,
  question: string,
): Promise<AlternateHistory | string> => {
  try {
    alternateHistorySchema.parse({ date, title, description });

    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
      maxTokens: 100,
    });

    const promptContent = HISTORY_TEMPLATE.replace('{date}', date)
      .replace('{title}', title)
      .replace('{description}', description)
      .replace('{question}', question);

    const prompt = ChatPromptTemplate.fromMessages([['human', promptContent]]);
    const outputParser = new JsonOutputFunctionsParser();
    const runnable = createOpenAIFnRunnable({
      functions: [openAIFunction],
      llm: model,
      prompt,
      enforceSingleFunctionUsage: true,
      outputParser,
    });

    const response = await runnable.invoke({
      date,
      title,
      description,
      question,
    });

    return response as AlternateHistory;
  } catch (error) {
    console.error('Error:', error);
    return JSON.stringify({ error: (error as Error).message });
  }
};
