import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardContainer } from './DashboardContainer';

describe('DashboardContainer', () => {
  it('renders children inside the dashboard card', () => {
    render(
      <DashboardContainer>
        <div>Dashboard content</div>
      </DashboardContainer>
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <DashboardContainer>
        <h1>Title</h1>
        <p>Body copy</p>
      </DashboardContainer>
    );

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Body copy')).toBeInTheDocument();
  });
});
