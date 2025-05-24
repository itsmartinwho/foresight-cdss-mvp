import type { Meta, StoryObj } from '@storybook/react';
import SeverityBadge from '../components/ui/SeverityBadge';

const meta = {
  title: 'UI/SeverityBadge',
  component: SeverityBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof SeverityBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = { args: { severity: 'Low' } };
export const Medium: Story = { args: { severity: 'Medium' } };
export const High: Story = { args: { severity: 'High' } }; 