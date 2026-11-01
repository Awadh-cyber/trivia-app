/**
 * AI Quiz settings.
 *
 * OPENROUTER_MODEL is a free OpenRouter model (it ends in ":free"). Chosen because it was
 * available, supports JSON mode, and wrote accurate questions in testing (Nov 2026).
 * Free models come and go: if it stops working, pick another ":free" model from openrouter.ai/models.
 */
export const OPENROUTER_MODEL = 'nvidia/nemotron-3.5-super-vl:free';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const AI_QUESTION_COUNT = 5;
export const MAX_TOPIC_LENGTH = 60;

/** Free models can be slow, so give them longer than the trivia server. */
export const AI_TIMEOUT_MS = 45_000;
/** How long Try again stays disabled after "too many requests", unless the server says otherwise. */
export const AI_RATE_LIMIT_WAIT_MS = 10_000;
