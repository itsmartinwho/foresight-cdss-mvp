import type { Meta, StoryObj } from '@storybook/react';
import RenderDetailTable from '../../src/components/ui/RenderDetailTable';

const sampleData = [
  { name: 'Alice', age: 30, city: 'NY' },
  { name: 'Bob', age: 25, city: 'LA' },
];

const meta = {
  title: 'UI/RenderDetailTable',
  component: RenderDetailTable,
  tags: ['autodocs'],
} satisfies Meta<typeof RenderDetailTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyData: Story = { args: { title: 'Sample Table', dataArray: [], headers: ['Name', 'Age', 'City'] } };
export const PopulatedData: Story = { args: { title: 'Sample Table', dataArray: sampleData, headers: ['Name', 'Age', 'City'], columnAccessors: ['name', 'age', 'city'] } }; 