# Trivia on Your Phone

A five-question General Knowledge trivia game built with React Native, Expo (SDK 58) and TypeScript. It runs on iPhone and Android in Expo Go.

Each game loads 5 fresh questions from [Open Trivia Database](https://opentdb.com) (`api.php?amount=5&category=9&type=multiple`). An internet connection is needed to start a game. Questions are licensed CC BY-SA 4.0.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone Camera app and open it in Expo Go. Your laptop and phone must be on the same Wi-Fi.
If the phone can't connect, use tunnel mode instead:

```bash
npx expo start --tunnel
```

## Checks

```bash
npm run check
```

This runs the TypeScript check and the Jest tests in `__tests__/`. The API tests use a fake `fetch`, so they never call the real server.

## How the Open Trivia Database connection works

- **One request per game.** The first game loads when the app opens. After the results appear, **Play again** stays disabled for 5 seconds ("Play again in 5s" … "1s"). Then a new game loads only when you tap it. Double taps are ignored, and the results stay on screen until the new game has loaded.
- **Session token.** The app asks for a session token once, so the server avoids sending questions you've already had. The token is kept in memory only, so closing the app fully starts a new session. Tokens expire after 6 hours of inactivity.
  - Code 3 (token not found): the app gets a new token and tries once more.
  - Code 4 (all questions used): the app resets the token and tries once more.
  - If that retry also fails, the app shows an error. It never keeps retrying on its own.
- **Rate limit.** The server allows one request every 5 seconds per internet address, and everyone on the same Wi-Fi shares that address, so other people can still trigger it.
  - Every questions request, including token retries, waits until at least 5.5 seconds after the previous one.
  - If the server still says "too many requests" (HTTP 429 / code 5), the app shows a friendly "busy" message and a "Retry in Ns" countdown (5 seconds, or longer if the server sends `Retry-After`, up to 60 seconds).
  - Retry turns on after the countdown, but the app never retries by itself.
  - Session-token requests (`api_token.php`) did not use up the limit in testing, so they are not delayed.
- **Errors.** No internet, a timeout after 10 seconds, server errors, broken data, or fewer than 5 usable questions all show a friendly message with a Retry button. The app never falls back to old fixed questions.
- **Limits.** Repeats are still possible: in the first game after opening the app (if the token request fails), after the token is reset, or in a new app session.

## Project layout

| Folder | What lives there |
|---|---|
| `src/api/` | `openTriviaDb.ts` handles requests, the session token, rate limits, and timeouts. `convertQuestions.ts` decodes HTML codes, shuffles the answers, and checks the response shape. |
| `src/data/` | `questionSource.ts`: `loadQuestions()` returns 5 checked, playable questions. `questionErrors.ts` holds error types and friendly messages. |
| `src/utils/` | `decodeHtmlEntities` and `shuffle`. |
| `src/logic/` | Game rules: answering, scoring, moving to the next question, and resetting for a new game (`quizReducer.ts`). |
| `src/hooks/` | `useQuiz` loads each game, cancels outdated requests, and connects the game rules to the screen. |
| `test-fixtures/` | Fixed sample questions used only by tests. |
| `src/components/` | Reusable building blocks: `QuestionCard`, `AnswerButton`, `ScoreDisplay`, `ProgressIndicator`, `ResultsSummary`, `PrimaryButton`, `StatusMessage`. |
| `src/screens/` | `GameScreen`, the single game screen. |
| `src/theme.ts` | Colors, spacing and sizes. |
