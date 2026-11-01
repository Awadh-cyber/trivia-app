import { StatusMessage } from './StatusMessage';

/** The three "no game yet" screens: loading, error and empty. */

export function LoadingState() {
  return <StatusMessage loading title="Loading questions…" message="Getting fresh questions from Open Trivia Database" />;
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  retryTitle?: string;
  retryDisabled?: boolean;
}

export function ErrorState({ message, onRetry, retryTitle = 'Retry', retryDisabled = false }: ErrorStateProps) {
  return (
    <StatusMessage
      emoji="😕"
      title="We couldn’t load the questions"
      message={message}
      actionTitle={retryTitle}
      actionDisabled={retryDisabled}
      onAction={onRetry}
    />
  );
}

interface EmptyStateProps {
  message?: string;
  onTryAgain: () => void;
  tryAgainTitle?: string;
  tryAgainDisabled?: boolean;
}

export function EmptyState({
  message = 'The trivia server didn’t send any questions this time.',
  onTryAgain,
  tryAgainTitle = 'Try again',
  tryAgainDisabled = false,
}: EmptyStateProps) {
  return (
    <StatusMessage
      emoji="📭"
      title="No questions available"
      message={message}
      actionTitle={tryAgainTitle}
      actionDisabled={tryAgainDisabled}
      onAction={onTryAgain}
    />
  );
}
