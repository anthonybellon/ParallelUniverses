export const HISTORY_TEMPLATE = `
Event Details:
  - Date: {date}
  - Original Title: {title}
  - Original Description: {description}
  
Alternative Universe Scenario:
  
  Imagine an alternative outcome for this event in a parallel universe where things turned out differently:
  
  Hypothetical Question: "{question}"
  
In this scenario, generate a new date, title and description that reflect this alternate reality. Format your response as JSON.
`;

export const INTENT_TEMPLATE = `
Based on the content, determine if it describes a hypothetical "what if" scenario related to alternate timelines or if it suggests malicious intent.

Possible intents are:
  1. **createAlternateTimelineEvent**: Select this intent if the content describes a "what if" scenario, such as modifying historical events, exploring hypothetical situations, or creating new outcomes in a parallel universe context.
  2. **maliciousIntent**: Select this intent if the content seems to be attempting something malicious, harmful, or otherwise unrelated to exploring hypothetical scenarios in a parallel universe context.

Content: {content}
`;

export const openAIFunction = {
  name: 'determine_intent',
  description: 'Identify the intent from the user based on provided content',
  parameters: {
    title: 'determine_intent',
    description: 'Identify the intent from the content',
    type: 'object',
    properties: {
      intent: {
        description: 'The detected intent from the content',
        type: 'string',
        enum: ['createAlternateTimelineEvent', 'maliciousIntent'],
      },
    },
  },
  required: ['intent'],
};
