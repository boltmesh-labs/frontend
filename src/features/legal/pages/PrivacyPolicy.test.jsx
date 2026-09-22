import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import PrivacyPolicy from './PrivacyPolicy';
import { SUPPORT_EMAIL } from '@/utils/config';

describe('PrivacyPolicy', () => {
  it('renders the policy heading with sections and a support contact', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/strict no-logs policy/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: SUPPORT_EMAIL }).length).toBeGreaterThan(0);
  });
});
