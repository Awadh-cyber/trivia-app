import type { Question } from '../types';

/** The five local General Knowledge questions used by the Core level. */
export const generalKnowledgeQuestions: Question[] = [
  {
    id: 'gk-largest-ocean',
    question: 'What is the largest ocean on Earth?',
    choices: ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Arctic Ocean'],
    correctIndex: 1,
    explanation: 'The Pacific is the largest and deepest ocean, covering about a third of Earth’s surface.',
  },
  {
    id: 'gk-leap-year-days',
    question: 'How many days are there in a leap year?',
    choices: ['364', '365', '366', '367'],
    correctIndex: 2,
    explanation: 'A leap year adds an extra day, February 29, for a total of 366 days.',
  },
  {
    id: 'gk-red-planet',
    question: 'Which planet is known as the Red Planet?',
    choices: ['Venus', 'Jupiter', 'Mercury', 'Mars'],
    correctIndex: 3,
    explanation: 'Mars looks red because its surface is rich in iron oxide, better known as rust.',
  },
  {
    id: 'gk-capital-japan',
    question: 'What is the capital city of Japan?',
    choices: ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo'],
    correctIndex: 0,
    explanation: 'Tokyo is Japan’s capital and its largest city.',
  },
  {
    id: 'gk-mona-lisa',
    question: 'Who painted the Mona Lisa?',
    choices: ['Michelangelo', 'Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso'],
    correctIndex: 1,
    explanation: 'Leonardo da Vinci painted the Mona Lisa in the early 1500s. It hangs in the Louvre in Paris.',
  },
];
