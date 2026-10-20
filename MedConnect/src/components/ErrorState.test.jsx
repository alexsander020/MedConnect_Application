/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from './ErrorState';

describe('ErrorState Component', () => {
  it('should render default error message and retry button', () => {
    const handleRetry = jest.fn();
    render(<ErrorState onRetry={handleRetry} message="Erro de conexão" />);

    expect(screen.getByTestId('error-state')).toBeTruthy();
    expect(screen.getByText('Erro de conexão')).toBeTruthy();

    const retryBtn = screen.getByTestId('retry-button');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
