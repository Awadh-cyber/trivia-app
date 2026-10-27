/**
 * One trivia question.
 * `correctIndex` points at the right answer inside `choices` (0 to 3).
 * Any future question source (internet, AI) only needs to produce this shape.
 */
export interface Question {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

/** What the player picked for one question. */
export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}
