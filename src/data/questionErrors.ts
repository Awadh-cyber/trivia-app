export type QuestionErrorKind =
  | 'network' // no internet / server unreachable
  | 'timeout' // the server took too long
  | 'http' // the server answered with an error status (e.g. 500)
  | 'rate-limit' // Open Trivia Database: too many requests (code 5 / HTTP 429)
  | 'no-results' // Open Trivia Database could not give enough questions (code 1)
  | 'token' // the session token kept failing (codes 3 / 4)
  | 'malformed' // the response was not in the expected shape
  | 'empty' // no questions at all
  | 'invalid'; // a question is broken (wrong number of choices, duplicates, ...)

/** Thrown when questions can't be loaded, so the screen can show a helpful message. */
export class QuestionLoadError extends Error {
  kind: QuestionErrorKind;
  /** How long to wait before trying again (only for rate limits). */
  retryAfterMs: number;

  constructor(kind: QuestionErrorKind, message: string, retryAfterMs = 0) {
    super(message);
    this.name = 'QuestionLoadError';
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

/** A short, friendly sentence for the player. Technical details stay in `error.message`. */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof QuestionLoadError)) {
    return 'Something unexpected went wrong. Please try again.';
  }
  switch (error.kind) {
    case 'network':
      return 'We couldn’t reach the trivia server. Check that your phone is online, then tap Retry.';
    case 'timeout':
      return 'The trivia server took too long to answer. Please tap Retry.';
    case 'http':
      return 'The trivia server is having trouble right now. Please wait a moment, then tap Retry.';
    case 'rate-limit':
      return 'Too many requests in a short time. The trivia server allows one every 5 seconds, shared by everyone on your Wi-Fi — please wait a few seconds, then tap Retry.';
    case 'no-results':
      return 'The trivia server couldn’t provide 5 questions right now. Please tap Retry.';
    case 'token':
      return 'The trivia session needed a reset. Please tap Retry to start a fresh session.';
    case 'malformed':
    case 'empty':
    case 'invalid':
      return 'We received questions we couldn’t use. Please tap Retry for a new set.';
  }
}
