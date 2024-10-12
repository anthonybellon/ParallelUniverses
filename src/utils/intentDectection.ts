import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { createOpenAIFnRunnable } from 'langchain/chains/openai_functions';
import { openAIFunction, INTENT_TEMPLATE } from './promptTemplates';
import { z } from 'zod';

export const determineIntent = async (content: string) => {
  try {
    const intentSchema = z.object({
      content: z.string().min(1, 'Content cannot be empty'),
    });
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini-2024-07-18',
      temperature: 0,
      streaming: false,
      verbose: true,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['human', INTENT_TEMPLATE.replace('{content}', content)],
    ]);
    const outputParser = new JsonOutputFunctionsParser();

    const runnable = createOpenAIFnRunnable({
      functions: [openAIFunction],
      llm: model,
      prompt,
      enforceSingleFunctionUsage: true,
      outputParser,
    });

    const response = await runnable.invoke({ content });

    return JSON.stringify({
      intent: (response as { intent: string }).intent,
    });
  } catch (error) {
    return JSON.stringify({ error: (error as unknown as Error).message });
  }
};
