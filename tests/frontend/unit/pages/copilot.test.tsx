// tests/frontend/unit/pages/copilot.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CopilotPage from '@/app/copilot/page';

// Mock the CopilotDisplay component as it's not the focus of this page test
vi.mock('@/components/copilot/CopilotDisplay', () => ({
  default: () => <div data-testid="copilot-display-mock">Mocked Copilot Display</div>,
}));

describe('CopilotPage', () => {
  it('renders the main heading', () => {
    render(<CopilotPage />);
    expect(screen.getByRole('heading', { name: /Tool C: Medical Co-pilot/i })).toBeInTheDocument();
  });

  it('renders the mocked CopilotDisplay component', () => {
    render(<CopilotPage />);
    expect(screen.getByTestId('copilot-display-mock')).toBeInTheDocument();
    expect(screen.getByText('Mocked Copilot Display')).toBeInTheDocument();
  });
});
