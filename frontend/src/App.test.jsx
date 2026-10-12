import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => { sessionStorage.clear(); global.fetch = vi.fn(); });
const ok = answer => ({ ok: true, json: async () => ({ answer }) });

describe('Studybuddy chat', () => {
  it('sends a question and shows the loading state and answer', async () => {
    let release; fetch.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    render(<App/>); fireEvent.change(screen.getByLabelText('Ask a study question'), { target: { value: 'What is recursion?' } }); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(screen.getByText('Thinking it through…')).toBeInTheDocument(); release(ok('A function calling itself.'));
    expect(await screen.findByText('A function calling itself.')).toBeInTheDocument();
  });
  it('does not send empty input', () => { render(<App/>); fireEvent.click(screen.getByRole('button', { name: 'Send question' })); expect(fetch).not.toHaveBeenCalled(); });
  it('sends the selected learning mode', async () => { fetch.mockResolvedValue(ok('Exam notes response')); render(<App/>); fireEvent.click(screen.getByRole('button', { name: /Exam prep/ })); fireEvent.change(screen.getByLabelText('Ask a study question'), { target: { value: 'Define a stack' } }); fireEvent.click(screen.getByRole('button', { name: 'Send question' })); await screen.findByText('Exam notes response'); expect(JSON.parse(fetch.mock.calls[0][1].body).mode).toBe('exam'); });
  it('requests another explanation using the original question without retyping', async () => { fetch.mockResolvedValueOnce(ok('First explanation')).mockResolvedValueOnce(ok('Analogy version')); render(<App/>); fireEvent.change(screen.getByLabelText('Ask a study question'), { target: { value: 'Explain recursion' } }); fireEvent.click(screen.getByRole('button', { name: 'Send question' })); await screen.findByText('First explanation'); fireEvent.click(screen.getByRole('button', { name: /Explain it another way/ })); await screen.findByText('Analogy version'); expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ question: 'Explain recursion', explain_another_way: true }); });
  it('offers retry on recoverable failures', async () => { fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'AI is unavailable' }) }).mockResolvedValueOnce(ok('Recovered')); render(<App/>); fireEvent.change(screen.getByLabelText('Ask a study question'), { target: { value: 'Explain SQL' } }); fireEvent.click(screen.getByRole('button', { name: 'Send question' })); expect(await screen.findByText('AI is unavailable')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /Try again/ })); expect(await screen.findByText('Recovered')).toBeInTheDocument(); });
});
