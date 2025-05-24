import type { Meta, StoryObj } from '@storybook/react';
import NotificationBell from '../components/ui/NotificationBell';

const meta = {
  title: 'UI/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
} satisfies Meta<typeof NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoNotifications: Story = { args: { count: 0, onClick: () => {} } };
export const WithNotifications: Story = { args: { count: 5, onClick: () => {} } }; 