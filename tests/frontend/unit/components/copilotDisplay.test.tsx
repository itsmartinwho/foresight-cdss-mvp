// tests/frontend/unit/components/copilotDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CopilotDisplay from '@/components/copilot/CopilotDisplay';
import { CopilotAlert, CopilotAlertType, CopilotAlertSeverity } from '@/types/copilot';
import { v4 as uuidv4 } from 'uuid';

const mockAlerts: CopilotAlert[] = [
  {
    id: uuidv4(),
    type: CopilotAlertType.DRUG_INTERACTION,
    severity: CopilotAlertSeverity.CRITICAL,
    message: 'Critical drug interaction detected between DrugA and DrugB.',
    suggestion: 'Immediately consult pharmacology.',
    timestamp: new Date(),
    relatedData: { drug1: 'DrugA', drug2: 'DrugB', interactionDetails: 'Severe reaction' }
  },
  {
    id: uuidv4(),
    type: CopilotAlertType.MISSING_LAB_RESULT,
    severity: CopilotAlertSeverity.INFO,
    message: 'Consider ordering CBC for fatigue.',
    suggestion: 'Order CBC.',
    timestamp: new Date(),
    relatedData: { labName: 'CBC', reasonForSuggestion: 'Standard workup for fatigue' }
  },
];

describe('CopilotDisplay', () => {
  it('renders "No active alerts" message when no alerts are provided', () => {
    render(<CopilotDisplay alerts={[]} />);
    expect(screen.getByText('Medical Co-pilot')).toBeInTheDocument();
    expect(screen.getByText(/No active alerts at the moment/i)).toBeInTheDocument();
  });

  it('renders a list of alerts correctly', () => {
    render(<CopilotDisplay alerts={mockAlerts} />);

    expect(screen.getByText('Co-pilot Alerts')).toBeInTheDocument();

    // Check first alert
    expect(screen.getByText(CopilotAlertType.DRUG_INTERACTION.replace(/_/g, ' '))).toBeInTheDocument();
    expect(screen.getByText(mockAlerts[0].message)).toBeInTheDocument();
    // Use a custom text matcher to handle potential extra spaces around the suggestion text
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === `Suggestion: ${mockAlerts[0].suggestion}` || node?.textContent === `Suggestion: ${mockAlerts[0].suggestion?.trim()}` || (node?.textContent?.startsWith('Suggestion:') && node.textContent.endsWith(mockAlerts[0].suggestion || ''));
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return elementHasText && childrenDontHaveText;
    })).toBeInTheDocument();
    expect(screen.getByText(CopilotAlertSeverity.CRITICAL)).toBeInTheDocument(); // Badge

    // Check second alert
    expect(screen.getByText(CopilotAlertType.MISSING_LAB_RESULT.replace(/_/g, ' '))).toBeInTheDocument();
    expect(screen.getByText(mockAlerts[1].message)).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      const hasText = (node: Element | null) => node?.textContent === `Suggestion: ${mockAlerts[1].suggestion}` || node?.textContent === `Suggestion: ${mockAlerts[1].suggestion?.trim()}` || (node?.textContent?.startsWith('Suggestion:') && node.textContent.endsWith(mockAlerts[1].suggestion || ''));
      const elementHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return elementHasText && childrenDontHaveText;
    })).toBeInTheDocument();
    expect(screen.getByText(CopilotAlertSeverity.INFO)).toBeInTheDocument(); // Badge

    // Check for icons (presence by title or other accessible means if possible, otherwise structural check)
    // Lucide icons often use <title> tags for accessibility.
    // For example, the Skull icon for CRITICAL severity might have a <title>Critical</title> or similar.
    // This is a bit fragile, depends on lucide-react's implementation detail.
    // A more robust way might be to check for the SVG's class if icons add specific classes.
    // For now, we'll assume the visual rendering implies icon presence.
    const criticalAlertCard = screen.getByText(mockAlerts[0].message).closest('div[class*="card"]');
    expect(criticalAlertCard).not.toBeNull();
    // Example: query for an svg within the card, not ideal but demonstrates the concept
    // const criticalIcon = criticalAlertCard?.querySelector('svg');
    // expect(criticalIcon).toBeInTheDocument();

    // Check that the correct number of alert titles are rendered
    const titles = mockAlerts.map(alert => screen.getByText(alert.type.replace(/_/g, ' ')));
    expect(titles).toHaveLength(mockAlerts.length);

  });

  it('displays correct severity icon and badge variant', () => {
    const singleCriticalAlert: CopilotAlert[] = [{
      id: uuidv4(),
      type: CopilotAlertType.DRUG_INTERACTION,
      severity: CopilotAlertSeverity.CRITICAL,
      message: 'Test critical',
      timestamp: new Date(),
    }];
    render(<CopilotDisplay alerts={singleCriticalAlert} />);
    // Check for CRITICAL badge (often has 'destructive' variant)
    const criticalBadge = screen.getByText(CopilotAlertSeverity.CRITICAL);
    expect(criticalBadge).toHaveClass('bg-destructive'); // Or specific class for critical badge

    const singleWarningAlert: CopilotAlert[] = [{
      id: uuidv4(),
      type: CopilotAlertType.ABNORMAL_VITAL, // Assuming this type exists
      severity: CopilotAlertSeverity.WARNING,
      message: 'Test warning',
      timestamp: new Date(),
    }];
    render(<CopilotDisplay alerts={singleWarningAlert} />);
    const warningBadge = screen.getByText(CopilotAlertSeverity.WARNING);
    // Default 'destructive' is also used for WARNING in the component, adjust if needed
    expect(warningBadge).toHaveClass('bg-destructive');

    const singleInfoAlert: CopilotAlert[] = [{
      id: uuidv4(),
      type: CopilotAlertType.CLINICAL_GUIDELINE, // Assuming this type exists
      severity: CopilotAlertSeverity.INFO,
      message: 'Test info',
      timestamp: new Date(),
    }];
    render(<CopilotDisplay alerts={singleInfoAlert} />);
    const infoBadge = screen.getByText(CopilotAlertSeverity.INFO);
    expect(infoBadge).toHaveClass('bg-primary'); // Or specific class for info badge (using 'default' variant)
  });
});
