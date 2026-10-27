import { sampleQuestions as questions } from '../test-fixtures/sampleQuestions';
import {
  PLAY_AGAIN_COOLDOWN_MS,
  getScore,
  initialQuizState,
  isCurrentAnswered,
  quizReducer,
  type QuizAction,
  type QuizState,
} from '../src/logic/quizReducer';

function run(actions: QuizAction[], start: QuizState = initialQuizState): QuizState {
  return actions.reduce(quizReducer, start);
}

const started = run([{ type: 'LOAD_START' }, { type: 'LOAD_SUCCESS', questions }]);
const correctOf = (i: number) => questions[i].correctIndex;
const wrongOf = (i: number) => (questions[i].correctIndex + 1) % 4;

describe('quizReducer', () => {
  it('starts on question 1 with a score of 0', () => {
    expect(started.phase).toBe('playing');
    expect(started.currentIndex).toBe(0);
    expect(getScore(started)).toBe(0);
  });

  it('adds exactly one point for a correct answer', () => {
    const state = run([{ type: 'ANSWER', choiceIndex: correctOf(0) }], started);
    expect(getScore(state)).toBe(1);
    expect(state.answers[0].isCorrect).toBe(true);
  });

  it('adds no points for an incorrect answer', () => {
    const state = run([{ type: 'ANSWER', choiceIndex: wrongOf(0) }], started);
    expect(getScore(state)).toBe(0);
    expect(state.answers[0].isCorrect).toBe(false);
  });

  it('lets each question be answered only once', () => {
    const state = run(
      [
        { type: 'ANSWER', choiceIndex: wrongOf(0) },
        { type: 'ANSWER', choiceIndex: correctOf(0) },
        { type: 'ANSWER', choiceIndex: correctOf(0) },
      ],
      started,
    );
    expect(state.answers).toHaveLength(1);
    expect(state.answers[0].selectedIndex).toBe(wrongOf(0));
    expect(getScore(state)).toBe(0);
  });

  it('does not score twice when a correct answer is tapped repeatedly', () => {
    const state = run(
      [
        { type: 'ANSWER', choiceIndex: correctOf(0) },
        { type: 'ANSWER', choiceIndex: correctOf(0) },
      ],
      started,
    );
    expect(getScore(state)).toBe(1);
  });

  it('will not move on before the question is answered', () => {
    const state = run([{ type: 'NEXT', now: 0 }, { type: 'NEXT', now: 0 }], started);
    expect(state.currentIndex).toBe(0);
  });

  it('moves forward only one question when Next is double tapped', () => {
    const state = run([{ type: 'ANSWER', choiceIndex: correctOf(0) }, { type: 'NEXT', now: 0 }, { type: 'NEXT', now: 0 }], started);
    expect(state.currentIndex).toBe(1);
    expect(isCurrentAnswered(state)).toBe(false);
  });

  it('ignores answer numbers that do not exist', () => {
    expect(run([{ type: 'ANSWER', choiceIndex: 4 }], started).answers).toHaveLength(0);
    expect(run([{ type: 'ANSWER', choiceIndex: -1 }], started).answers).toHaveLength(0);
  });

  it('stops at the results after question five and gives the right final score', () => {
    // Correct, wrong, correct, correct, wrong → 3 out of 5
    const pattern = [true, false, true, true, false];
    const actions: QuizAction[] = pattern.flatMap((right, i) => [
      { type: 'ANSWER', choiceIndex: right ? correctOf(i) : wrongOf(i) } as QuizAction,
      { type: 'NEXT', now: 0 } as QuizAction,
    ]);

    const beforeLastNext = run(actions.slice(0, -1), started);
    expect(beforeLastNext.phase).toBe('playing');
    expect(beforeLastNext.currentIndex).toBe(4);

    const finished = run(actions, started);
    expect(finished.phase).toBe('finished');
    expect(finished.currentIndex).toBe(4);
    expect(getScore(finished)).toBe(3);

    // Extra taps after the results cannot change anything.
    const afterExtraTaps = run(
      [{ type: 'NEXT', now: 0 }, { type: 'ANSWER', choiceIndex: correctOf(4) }, { type: 'NEXT', now: 0 }],
      finished,
    );
    expect(afterExtraTaps).toBe(finished);
  });

  it('gives 5/5 for all correct and 0/5 for all wrong', () => {
    const play = (pick: (i: number) => number) =>
      run(
        questions.flatMap((_, i) => [
          { type: 'ANSWER', choiceIndex: pick(i) } as QuizAction,
          { type: 'NEXT', now: 0 } as QuizAction,
        ]),
        started,
      );
    expect(getScore(play(correctOf))).toBe(5);
    expect(getScore(play(wrongOf))).toBe(0);
  });

  const finishedAt = 1_000_000;
  function finishGame(): QuizState {
    return run(
      questions.flatMap((_, i) => [
        { type: 'ANSWER', choiceIndex: correctOf(i) } as QuizAction,
        { type: 'NEXT', now: finishedAt } as QuizAction,
      ]),
      started,
    );
  }

  it('locks Play again for 5 seconds after the results appear', () => {
    const finished = finishGame();
    expect(finished.phase).toBe('finished');
    expect(PLAY_AGAIN_COOLDOWN_MS).toBe(5000);
    expect(finished.playAgainAvailableAt).toBe(finishedAt + 5000);
  });

  it('keeps the results on screen while the next game loads', () => {
    const finished = finishGame();
    const loading = run([{ type: 'LOAD_START' }], finished);
    expect(loading.phase).toBe('finished');
    expect(loading.isLoading).toBe(true);
    expect(getScore(loading)).toBe(5);
    expect(loading.answers).toHaveLength(5);
  });

  it('Play again completely resets the game once the new set has loaded', () => {
    const loading = run([{ type: 'LOAD_START' }], finishGame());
    const newSet = questions.map((q) => ({ ...q, id: `new-${q.id}` }));
    const restarted = run([{ type: 'LOAD_SUCCESS', questions: newSet }], loading);
    expect(restarted.phase).toBe('playing');
    expect(restarted.isLoading).toBe(false);
    expect(restarted.currentIndex).toBe(0);
    expect(restarted.answers).toEqual([]);
    expect(getScore(restarted)).toBe(0);
    expect(isCurrentAnswered(restarted)).toBe(false);
    expect(restarted.errorMessage).toBeNull();
    expect(restarted.playAgainAvailableAt).toBeNull();
    expect(restarted.questions[0].id).toBe(`new-${questions[0].id}`);
  });

  it('keeps the results if loading the next game fails, and shows the problem with a retry time', () => {
    const loading = run([{ type: 'LOAD_START' }], finishGame());
    const failed = run([{ type: 'LOAD_FAILURE', message: 'busy', retryAvailableAt: 42 }], loading);
    expect(failed.phase).toBe('finished');
    expect(getScore(failed)).toBe(5);
    expect(failed.isLoading).toBe(false);
    expect(failed.errorMessage).toBe('busy');
    expect(failed.retryAvailableAt).toBe(42);
  });

  it('ignores a second LOAD_START while one is already loading (no duplicate requests)', () => {
    const loading = run([{ type: 'LOAD_START' }], finishGame());
    expect(run([{ type: 'LOAD_START' }], loading)).toBe(loading);
  });

  it('ignores answers and Next taps while the first game is loading', () => {
    const loading = run([{ type: 'LOAD_START' }]);
    expect(run([{ type: 'ANSWER', choiceIndex: 0 }, { type: 'NEXT', now: 0 }], loading)).toBe(loading);
  });

  it('ignores a late result that arrives after the game already started', () => {
    const lateSet = questions.map((q) => ({ ...q, id: `late-${q.id}` }));
    const playing = run([{ type: 'ANSWER', choiceIndex: correctOf(0) }], started);
    expect(run([{ type: 'LOAD_SUCCESS', questions: lateSet }], playing)).toBe(playing);
    expect(run([{ type: 'LOAD_FAILURE', message: 'late error' }], playing)).toBe(playing);
  });

  it('shows an error state when loading fails, and retry starts loading again', () => {
    const failed = run([{ type: 'LOAD_START' }, { type: 'LOAD_FAILURE', message: 'No questions were found.' }]);
    expect(failed.phase).toBe('error');
    expect(failed.errorMessage).toBe('No questions were found.');

    const retrying = run([{ type: 'LOAD_START' }], failed);
    expect(retrying.phase).toBe('loading');
    expect(retrying.errorMessage).toBeNull();
  });

  it('remembers when Retry is allowed again after a rate limit', () => {
    const loading = run([{ type: 'LOAD_START' }]);
    const failed = run([{ type: 'LOAD_FAILURE', message: 'Too many requests', retryAvailableAt: 12345 }], loading);
    expect(failed.retryAvailableAt).toBe(12345);
    expect(run([{ type: 'LOAD_START' }], failed).retryAvailableAt).toBeNull();
  });
});
