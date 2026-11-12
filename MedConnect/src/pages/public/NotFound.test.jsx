/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

describe('Página 404', () => {
  it('explica que a página não existe e oferece caminhos de volta', () => {
    render(
      <MemoryRouter initialEntries={['/rota-que-nao-existe']}>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /não encontramos esta página/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para o início/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /farmácias credenciadas/i })).toHaveAttribute('href', '/pharmacies');
    expect(screen.getByRole('link', { name: /central de ajuda/i })).toHaveAttribute('href', '/help');
  });
});
