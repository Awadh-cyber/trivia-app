/**
 * One trivia question, ready to play.
 * `correctIndex` points at the right answer inside `choices` (0 to 3).
 * Any question source (Open Trivia Database today, maybe AI later) only needs to produce this shape.
 */
export interface Question {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  /** Optional extra fact shown after answering. Open Trivia Database does not provide one. */
  explanation?: string;
}

/** What the player picked for one question. */
export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}
