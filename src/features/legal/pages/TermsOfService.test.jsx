import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import TermsOfService from './TermsOfService';
import { SUPPORT_EMAIL } from '@/utils/config';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/terms']}>
      <Routes>
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<div>Privacy page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('TermsOfService', () => {
  it('renders the terms heading with sections and a support contact', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText(/rules of use/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toBeInTheDocument();
  });

  it('links to the privacy policy', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    renderPage();

    await user.click(screen.getAllByRole('link', { name: /privacy policy/i })[0]);
    expect(await screen.findByText('Privacy page')).toBeInTheDocument();
  });
});
