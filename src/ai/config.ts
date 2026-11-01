/**
 * AI Quiz settings.
 *
 * OPENROUTER_MODEL must be the exact free model name from the CODED class slide
 * (it ends in ":free"). AI Quiz shows a friendly "not set up" message until it is filled in.
 */
export const OPENROUTER_MODEL = '';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const AI_QUESTION_COUNT = 5;
export const MAX_TOPIC_LENGTH = 60;

/** Free models can be slow, so give them longer than the trivia server. */
export const AI_TIMEOUT_MS = 45_000;
/** How long Try again stays disabled after "too many requests", unless the server says otherwise. */
export const AI_RATE_LIMIT_WAIT_MS = 10_000;
