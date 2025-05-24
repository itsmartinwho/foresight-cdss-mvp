import type { Meta, StoryObj } from '@storybook/react';
import LikelihoodBadge from '../components/ui/LikelihoodBadge';

const meta = {
  title: 'UI/LikelihoodBadge',
  component: LikelihoodBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof LikelihoodBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = { args: { likelihood: 0 } };
export const Three: Story = { args: { likelihood: 3 } };
export const Five: Story = { args: { likelihood: 5 } }; 