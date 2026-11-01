import { QuestionLoadError } from '../data/questionErrors';

/** Friendly sentences for AI Quiz problems. The HTTP code (if any) is shown separately in small text. */
export function describeAiError(error: unknown): string {
  if (!(error instanceof QuestionLoadError)) {
    return 'Something unexpected went wrong while writing your questions. Please try again.';
  }
  switch (error.kind) {
    case 'config':
      if (error.message === 'missing-model') {
        return 'AI Quiz isn’t set up yet: the AI model name hasn’t been added to the app.';
      }
      if (error.message === 'missing-key') {
        return 'AI Quiz isn’t set up yet: the OpenRouter key is missing from .env.local. Add it, then restart Expo.';
      }
      return 'Please type a topic first.';
    case 'network':
      return 'We couldn’t reach the AI service. Check that your phone is online, then try again.';
    case 'timeout':
      return 'The AI took too long to answer. Free models can be slow, so please try again.';
    case 'rate-limit':
      return 'The free AI model is busy or you’ve made a lot of requests. Please wait for the countdown, then try again.';
    case 'http':
      if (error.status === 401 || error.status === 403) {
        return 'OpenRouter didn’t accept the key. Check the key in .env.local, then restart Expo.';
      }
      if (error.status === 402) {
        return 'OpenRouter says this key has no credit for this model. Make sure the model name ends in ":free".';
      }
      if (error.status === 400 || error.status === 404) {
        return 'OpenRouter couldn’t use this request. The model name may be wrong or no longer available.';
      }
      return 'The AI service had a problem. Please try again in a moment.';
    case 'no-results':
      return 'The AI didn’t have reliable facts about that topic. Try a broader or better-known topic.';
    case 'empty':
      return 'The AI sent back an empty answer. Please try again.';
    case 'malformed':
    case 'invalid':
      return 'The AI’s questions weren’t in a form we could use safely. Please try again.';
    default:
      return 'Something went wrong while writing your questions. Please try again.';
  }
}
