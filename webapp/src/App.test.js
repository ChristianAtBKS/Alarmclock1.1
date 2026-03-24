import { render, screen, act } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      current_condition: [{
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        temp_C: '20',
      }],
    }),
  });
});

test('zeigt die aktuelle Uhrzeit an', async () => {
  await act(async () => render(<App />));
  expect(screen.getByText(/Alarm setzen/i)).toBeInTheDocument();
});

test('zeigt Weckzeit-Eingabe an', async () => {
  await act(async () => render(<App />));
  expect(screen.getByDisplayValue('07:00')).toBeInTheDocument();
});
