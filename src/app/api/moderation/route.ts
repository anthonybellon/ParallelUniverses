import { NextRequest, NextResponse } from 'next/server';
import { OpenAIModerationChain } from 'langchain/chains';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const moderationChain = new OpenAIModerationChain({
      openAIApiKey: process.env.OPENAI_API_KEY,
      throwError: false,
    });

    const result = await moderationChain.invoke({ input: text });
    return NextResponse.json({
      isFlagged: result.results[0].flagged,
      output: result.output,
      categories: result.results[0].categories,
      categoryScores: result.results[0].category_scores,
    });
  } catch (error) {
    console.error('Error in moderation:', error);
    return NextResponse.json(
      { error: 'An error occurred during moderation' },
      { status: 500 },
    );
  }
}
