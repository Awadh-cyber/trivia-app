/**
 * WEB version (also used by TypeScript for type checking).
 *
 * AI Quiz is for the phone app only. The web build never reads the OpenRouter key,
 * so the key can't end up in the website or on Vercel.
 * The phone version lives in openRouterKey.native.ts (Expo picks it automatically on iOS/Android).
 */
export const AI_QUIZ_AVAILABLE_ON_THIS_PLATFORM: boolean = false;

export function getOpenRouterKey(): string | null {
  return null;
}
