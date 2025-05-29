// tests/frontend/unit/example.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// A simple React component for testing
const MyComponent = ({ title }: { title: string }) => <h1>{title}</h1>;

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
