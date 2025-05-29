import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, Terminal } from 'lucide-react'; // Example icons

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
    // We won't directly control children via args in the same way for composed components,
    // but stories will show different content structures.
  },
  // Default args are not as useful here since content is key
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    className: 'w-[400px]', // Added for better display in centered layout
  },
  render: (args) => (
    <Alert {...args}>
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can use component dependencies to define relations between components.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    className: 'w-[400px]', // Added for better display in centered layout
  },
  render: (args) => (
    <Alert {...args}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const WithOnlyTitle: Story = {
  args: {
    variant: 'default',
    className: 'w-[400px]',
  },
  render: (args) => (
    <Alert {...args}>
      <Terminal className="h-4 w-4" />
      <AlertTitle>Notification</AlertTitle>
    </Alert>
  ),
};

export const WithOnlyDescription: Story = {
  args: {
    variant: 'default',
    className: 'w-[400px]',
  },
  render: (args) => (
    <Alert {...args}>
      <AlertDescription>
        A new software update is available.
      </AlertDescription>
    </Alert>
  ),
};

export const DestructiveWithLongText: Story = {
  args: {
    variant: 'destructive',
    className: 'w-[400px]',
  },
  render: (args) => (
    <Alert {...args}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Critical System Failure</AlertTitle>
      <AlertDescription>
        The system has encountered a critical error and needs to be restarted. This is a longer description to see how the text wraps and the alert component handles overflow or larger content within its defined boundaries.
      </AlertDescription>
    </Alert>
  ),
};
