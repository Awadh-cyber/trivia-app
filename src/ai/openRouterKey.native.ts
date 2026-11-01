/**
 * PHONE version (iOS/Android only).
 *
 * The key comes from the Git-ignored .env.local file (EXPO_PUBLIC_OPENROUTER_API_KEY).
 * Keeping it out of Git does NOT make it secret: Expo copies EXPO_PUBLIC_ values into the
 * app itself, so anyone with the app could dig it out. That is acceptable only for this
 * classroom exercise with a free model and a $1 key limit. A real app needs a server in between.
 */
export const AI_QUIZ_AVAILABLE_ON_THIS_PLATFORM: boolean = true;

export function getOpenRouterKey(): string | null {
  const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY?.trim();
  return key ? key : null;
}
