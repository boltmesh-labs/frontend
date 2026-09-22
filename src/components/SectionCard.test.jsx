import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionCard } from './SectionCard';

describe('SectionCard', () => {
  it('renders the title and children', () => {
    render(
      <SectionCard title="VPN Devices">
        <div data-testid="body">content</div>
      </SectionCard>
    );
    expect(screen.getByText('VPN Devices')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<SectionCard title="T" subtitle="A helpful description" />);
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });

  it('renders action nodes in the header', () => {
    render(<SectionCard title="T" actions={<button type="button">Add</button>} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('applies an extra className', () => {
    const { container } = render(<SectionCard title="T" className="extra-class" />);
    expect(container.querySelector('.card')).toHaveClass('extra-class');
  });

  it('renders without a title', () => {
    render(<SectionCard>plain</SectionCard>);
    expect(screen.getByText('plain')).toBeInTheDocument();
  });
});
