import { StyleSheet, Text, View } from 'react-native';

import type { AnswerRecord, Question } from '../types';
import { colors, radius, spacing } from '../theme';
import { AnswerButton, type AnswerStatus } from './AnswerButton';

const LETTERS = ['A', 'B', 'C', 'D'];

interface QuestionCardProps {
  question: Question;
  /** The player's answer, or undefined while they are still choosing. */
  answer: AnswerRecord | undefined;
  onAnswer: (choiceIndex: number) => void;
}

function getStatus(question: Question, answer: AnswerRecord | undefined, index: number): AnswerStatus {
  if (!answer) return 'idle';
  if (index === question.correctIndex) return 'correct';
  if (index === answer.selectedIndex) return 'incorrect';
  return 'inactive';
}

/** Shows one question, its four answer buttons, and feedback once answered. */
export function QuestionCard({ question, answer, onAnswer }: QuestionCardProps) {
  const isLocked = answer !== undefined;
  const correctText = question.choices[question.correctIndex];

  return (
    <View style={styles.card}>
      <Text style={styles.question} accessibilityRole="header">
        {question.question}
      </Text>

      <View style={styles.choices}>
        {question.choices.map((choice, index) => (
          <AnswerButton
            key={`${question.id}-${index}`}
            letter={LETTERS[index]}
            label={choice}
            status={getStatus(question, answer, index)}
            isSelected={answer?.selectedIndex === index}
            disabled={isLocked}
            onPress={() => onAnswer(index)}
          />
        ))}
      </View>

      {answer && (
        <View
          style={[styles.feedback, answer.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.feedbackTitle}>
            {answer.isCorrect ? '🎉 Correct! +1 point' : '❌ Incorrect. No points this time.'}
          </Text>
          {!answer.isCorrect && <Text style={styles.feedbackText}>The correct answer is {correctText}.</Text>}
          <Text style={styles.feedbackText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  question: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
  },
  choices: {
    gap: spacing.md,
  },
  feedback: {
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.xs,
  },
  feedbackCorrect: {
    borderColor: colors.correct,
    backgroundColor: colors.correctBg,
  },
  feedbackIncorrect: {
    borderColor: colors.incorrect,
    backgroundColor: colors.incorrectBg,
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
