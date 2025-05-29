import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, expect, within } from '@storybook/test';
import { Heart } from 'lucide-react'; // Example icon

import { Button } from '@/components/ui/button'; // Updated import path

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'UI/Button', // Updated title
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    asChild: {
      control: 'boolean',
    },
    // We are not directly controlling `iconLeft` via args in this example,
    // but stories will demonstrate its usage.
    // backgroundColor is not a prop of the new Button.
  },
  args: { // Default args for all stories
    children: 'Button Text',
    onClick: fn(), // Mock function for click events
    disabled: false,
    asChild: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default Button',
    onClick: fn(), // Ensure onClick is mocked for this story
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /Default Button/i });
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: <Heart />, // Using children for icon content as per component structure
    // 'aria-label': 'Like', // Important for accessibility
  },
};

export const WithIconLeft: Story = {
  args: {
    variant: 'default',
    children: 'Like',
    iconLeft: <Heart />,
  },
};

export const AsChild: Story = {
  args: {
    asChild: true,
    children: <a href="#">Link as Button</a>,
  },
};
