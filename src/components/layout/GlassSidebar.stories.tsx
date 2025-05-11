import type { Meta, StoryObj } from '@storybook/react';
import GlassSidebar from './GlassSidebar';

const meta: Meta<typeof GlassSidebar> = {
  title: 'Layout/GlassSidebar',
  component: GlassSidebar,
  parameters: {
    // Optional: if you want to provide a mock router context for usePathname
    nextjs: {
      router: {
        pathname: '/', // Default pathname for the story
      },
    },
    layout: 'fullscreen', // Or 'padded', typically fullscreen for sidebars
  },
  // Add argTypes if you want to control props, though GlassSidebar doesn't have direct props for collapsed state
};

export default meta;
type Story = StoryObj<typeof GlassSidebar>;

export const Default: Story = {};

// If you want to show specific path active, you can set it in parameters
export const PatientsActive: Story = {
  parameters: {
    nextjs: {
      router: {
        pathname: '/patients',
      },
    },
  },
};

export const SettingsActive: Story = {
  parameters: {
    nextjs: {
      router: {
        pathname: '/settings',
      },
    },
  },
}; 