import type { Meta, StoryObj } from '@storybook/react';
import ErrorDisplay from '../components/ui/ErrorDisplay';

const meta = {
  title: 'UI/ErrorDisplay',
  component: ErrorDisplay,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoMessage: Story = { args: { message: undefined } };
export const WithMessage: Story = { args: { message: 'An error occurred' } };
export const WithContext: Story = { args: { message: 'Failed to load', context: 'Fetching patient data' } }; 