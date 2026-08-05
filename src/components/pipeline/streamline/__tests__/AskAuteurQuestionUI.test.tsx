import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AskAuteurQuestionUI, type AskAuteurQuestion } from '../AskAuteurQuestionUI';

const QUESTIONS: AskAuteurQuestion[] = [
  {
    id: 'q1',
    category: 'contradiction',
    questionText: 'You mentioned two different names for the antagonist — which is correct?',
    options: [{ id: 'o1', label: 'Marcus' }, { id: 'o2', label: 'Marc' }],
    subjectEntityType: 'character',
    subjectEntityName: 'Marcus',
  },
];

describe('AskAuteurQuestionUI', () => {
  it('renders multiple-choice options plus a "type your own answer" escape hatch', () => {
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByText(/two different names/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /type my own answer/i })).toBeInTheDocument();
  });

  it('disables submit until every question is answered', async () => {
    const user = userEvent.setup();
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit 1 answer/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Marc' }));
    expect(screen.getByRole('button', { name: /submit 1 answer/i })).not.toBeDisabled();
  });

  it('submits option-sourced answers with answerSource "option"', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={onSubmit} onDecline={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Marc' }));
    await user.click(screen.getByRole('button', { name: /submit 1 answer/i }));

    expect(onSubmit).toHaveBeenCalledWith([{ questionId: 'q1', selectedAnswer: 'Marc', answerSource: 'option' }]);
  });

  it('submits freetext answers with answerSource "freetext" when the custom option is used', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={onSubmit} onDecline={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /type my own answer/i }));
    const input = screen.getByPlaceholderText(/your answer/i);
    await user.type(input, 'Marcus Aurelius');

    await user.click(screen.getByRole('button', { name: /submit 1 answer/i }));
    expect(onSubmit).toHaveBeenCalledWith([{ questionId: 'q1', selectedAnswer: 'Marcus Aurelius', answerSource: 'freetext' }]);
  });

  it('freetext submission stays disabled until text is actually typed', async () => {
    const user = userEvent.setup();
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={vi.fn()} onDecline={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /type my own answer/i }));
    expect(screen.getByRole('button', { name: /submit 1 answer/i })).toBeDisabled();
  });

  it('decline calls onDecline without requiring any answers', async () => {
    const onDecline = vi.fn();
    const user = userEvent.setup();
    render(<AskAuteurQuestionUI questions={QUESTIONS} onSubmit={vi.fn()} onDecline={onDecline} />);

    await user.click(screen.getByRole('button', { name: /skip these questions/i }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
