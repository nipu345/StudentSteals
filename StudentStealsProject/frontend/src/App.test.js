import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// react-markdown ships as ESM, which Create React App's Jest setup can't transform
jest.mock('react-markdown', () => ({ children }) => children);

test('asks for a name, then shows the deals tab', () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/enter your first name/i);
  fireEvent.change(input, { target: { value: 'Nikhil' } });
  fireEvent.click(screen.getByText(/let's go/i));
  expect(screen.getByText(/Nikhil/)).toBeInTheDocument();
  expect(screen.getByText(/find steals near you/i)).toBeInTheDocument();
});

test('budget setup starts with default categories', () => {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/enter your first name/i), { target: { value: 'Sam' } });
  fireEvent.click(screen.getByText(/let's go/i));
  fireEvent.click(screen.getByText(/📊 Budget/));
  expect(screen.getByText(/set your monthly budget/i)).toBeInTheDocument();
  expect(screen.getByDisplayValue('Food')).toBeInTheDocument();
});
