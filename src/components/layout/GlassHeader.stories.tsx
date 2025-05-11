import type { Meta, StoryObj } from '@storybook/react';
import GlassHeader from './GlassHeader';

const meta: Meta<typeof GlassHeader> = {
  title: 'Layout/GlassHeader',
  component: GlassHeader,
  parameters: {
    layout: 'fullscreen', // Or 'padded' depending on how you want to view it
  },
};

export default meta;
type Story = StoryObj<typeof GlassHeader>;

export const Default: Story = {}; 