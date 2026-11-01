import { AI_QUESTION_COUNT, MAX_TOPIC_LENGTH } from './config';

/** Trims the topic, squeezes extra spaces, and limits its length. Returns '' if nothing is left. */
export function normalizeTopic(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TOPIC_LENGTH).trim();
}

export const SYSTEM_INSTRUCTIONS =
  'You are a careful trivia question writer for a mobile quiz game. ' +
  'Reply with JSON only: no Markdown, no code fences, no explanations, and no text before or after the JSON.';

/** The exact instructions sent to the AI for one game. */
export function buildUserInstructions(topic: string): string {
  return [
    `Write exactly ${AI_QUESTION_COUNT} multiple-choice trivia questions about this topic: ${JSON.stringify(topic)}.`,
    '',
    'Rules:',
    '- Each question has exactly 1 correct answer and exactly 3 incorrect answers.',
    '- All 4 answers must be different from each other, short (under 80 characters) and believable.',
    '- Exactly one answer may be correct. Do not use "All of the above", "None of the above" or trick questions.',
    '- Use only facts you are confident are true and well established. Do not invent facts, names, dates or numbers.',
    `- If you do not have enough reliable information to write ${AI_QUESTION_COUNT} accurate questions about this topic, return {"questions": []} instead.`,
    '- Do not repeat a question. Write for a casual player.',
    '',
    'Return only JSON in exactly this shape:',
    '{"questions":[{"question":"...","correct_answer":"...","incorrect_answers":["...","...","..."]}]}',
  ].join('\n');
}

export function buildMessages(topic: string) {
  return [
    { role: 'system' as const, content: SYSTEM_INSTRUCTIONS },
    { role: 'user' as const, content: buildUserInstructions(topic) },
  ];
}
