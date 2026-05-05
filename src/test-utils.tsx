import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

export function renderWithRouter(
  ui: React.ReactElement,
  { route = '/' }: { route?: string } = {}
) {
  return {
    ...render(
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    ),
    mockNavigate,
  };
}

export { mockNavigate };
