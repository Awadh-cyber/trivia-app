# Trivia on Your Phone (Core level)

A five-question General Knowledge trivia game built with React Native, Expo (SDK 58) and TypeScript. It runs on iPhone and Android in Expo Go.

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

This runs the TypeScript check and the Jest tests in `__tests__/`.

## Project layout

| Folder | What lives there |
|---|---|
| `src/data/` | The five questions (`generalKnowledgeQuestions.ts`) and the question source with validation (`questionSource.ts`). Replace `loadQuestions()` to load questions from somewhere else. |
| `src/logic/` | Game rules: answering, scoring, moving to the next question, and restarting (`quizReducer.ts`). |
| `src/hooks/` | `useQuiz` connects the question source and game rules to the screen. |
| `src/components/` | Reusable building blocks: `QuestionCard`, `AnswerButton`, `ScoreDisplay`, `ProgressIndicator`, `ResultsSummary`, `PrimaryButton`, `StatusMessage`. |
| `src/screens/` | `GameScreen`, the single game screen. |
| `src/theme.ts` | Colors, spacing and sizes. |
