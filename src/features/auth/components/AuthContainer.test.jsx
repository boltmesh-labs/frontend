import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthContainer } from './AuthContainer';

describe('AuthContainer', () => {
  it('renders children inside the centered auth card without another main landmark', () => {
    render(
      <AuthContainer>
        <div>Sign in form</div>
      </AuthContainer>
    );

    expect(screen.getByText('Sign in form')).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <AuthContainer>
        <h1>Title</h1>
        <p>Subtitle</p>
      </AuthContainer>
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });
});
