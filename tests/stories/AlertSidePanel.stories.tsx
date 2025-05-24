import type { Meta, StoryObj } from '@storybook/react';
import AlertSidePanel from '../components/ui/AlertSidePanel';
import type { ComplexCaseAlert } from '../lib/types';

const sampleAlerts: (ComplexCaseAlert & { patientName?: string })[] = [
  {
    id: '1',
    patientId: 'p1',
    likelihood: 5,
    patientName: 'Alice',
    type: 'autoimmune',
    msg: '',
    date: '2025-05-20',
    severity: 'high',
    triggeringFactors: [],
    suggestedActions: [],
    createdAt: '2025-05-20',
    conditionType: 'autoimmune',
    acknowledged: false,
  },
  {
    id: '2',
    patientId: 'p2',
    likelihood: 4,
    patientName: 'Bob',
    type: 'oncology',
    msg: '',
    date: '2025-05-19',
    severity: 'medium',
    triggeringFactors: [],
    suggestedActions: [],
    createdAt: '2025-05-19',
    conditionType: 'oncology',
    acknowledged: false,
  },
];

const meta = {
  title: 'UI/AlertSidePanel',
  component: AlertSidePanel,
  tags: ['autodocs'],
} satisfies Meta<typeof AlertSidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { args: { isOpen: false, onClose: () => {}, onAlertClick: () => {}, alerts: sampleAlerts } };
export const Open: Story = { args: { isOpen: true, onClose: () => {}, onAlertClick: () => {}, alerts: sampleAlerts } }; 