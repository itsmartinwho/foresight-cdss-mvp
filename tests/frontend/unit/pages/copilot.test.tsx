// tests/frontend/unit/pages/copilot.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CopilotPage from '@/app/copilot/page';
import * as copilotLogic from '@/lib/copilotLogic'; // Import all exports
import { CopilotAlertType, CopilotAlertSeverity } from '@/types/copilot'; // Ensure this path is correct
import { v4 as uuidv4 } from 'uuid';

// Mock the CopilotDisplay component
vi.mock('@/components/copilot/CopilotDisplay', () => ({
  default: ({ alerts }: { alerts: any[] }) => (
    <div data-testid="copilot-display-mock">
      {alerts.map(alert => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          <p>{alert.message}</p>
          <p>{alert.type}</p>
        </div>
      ))}
    </div>
  ),
}));

// Mock the copilotLogic functions
const mockCheckForDrugInteractions = vi.spyOn(copilotLogic, 'checkForDrugInteractions');
const mockCheckForMissingLabs = vi.spyOn(copilotLogic, 'checkForMissingLabs');


// Mock data (can be simplified for page tests)
const mockInteractionAlert = {
  id: uuidv4(),
  type: CopilotAlertType.DRUG_INTERACTION,
  severity: CopilotAlertSeverity.WARNING,
  message: 'Interaction: Drug X and Warfarin',
  suggestion: 'Adjust dosage.',
  timestamp: new Date(),
  relatedData: { drug1: 'Drug X', drug2: 'Warfarin' }
};

const mockMissingLabAlert = {
  id: uuidv4(),
  type: CopilotAlertType.MISSING_LAB_RESULT,
  severity: CopilotAlertSeverity.INFO,
  message: 'Missing Lab: CBC',
  suggestion: 'Order CBC.',
  timestamp: new Date(),
  relatedData: { labName: 'CBC' }
};

describe('CopilotPage', () => {
  beforeEach(() => {
    // Polyfill for target.hasPointerCapture
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    }
    // Polyfill for element.scrollIntoView
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn();
    }
    // Reset mocks before each test
    mockCheckForDrugInteractions.mockClear();
    mockCheckForMissingLabs.mockClear();
    mockCheckForDrugInteractions.mockReturnValue([]); // Default to no alerts
    mockCheckForMissingLabs.mockReturnValue([]);    // Default to no alerts
  });

  it('renders the main heading and introductory text', () => {
    render(<CopilotPage />);
    expect(screen.getByRole('heading', { name: /Tool C: Medical Co-pilot/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Real-time assistance during consultations./i)).toBeInTheDocument();
  });

  it('renders patient snapshot information', () => {
    render(<CopilotPage />);
    expect(screen.getByText(/Patient Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument(); // From mockPatientData
    expect(screen.getByText(/Lisinopril/i)).toBeInTheDocument();
  });

  it('renders UI elements for triggering checks', () => {
    render(<CopilotPage />);
    expect(screen.getByLabelText(/Check New Drug Interaction:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter new drug name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Interactions/i })).toBeInTheDocument();

    expect(screen.getByLabelText(/Check Missing Labs for Context:/i)).toBeInTheDocument();
    // The combobox is associated with the label "Check Missing Labs for Context:"
    expect(screen.getByRole('combobox', { name: /Check Missing Labs for Context:/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check Missing Labs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear All Alerts/i })).toBeInTheDocument();
  });

  it('calls checkForDrugInteractions and updates alerts when "Check Interactions" is clicked', async () => {
    mockCheckForDrugInteractions.mockReturnValue([mockInteractionAlert]);
    render(<CopilotPage />);

    const drugInput = screen.getByPlaceholderText(/Enter new drug name/i);
    const checkButton = screen.getByRole('button', { name: /Check Interactions/i });

    fireEvent.change(drugInput, { target: { value: 'Warfarin' } });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(mockCheckForDrugInteractions).toHaveBeenCalledTimes(1);
      // Check if the mockPatientData.currentMedications and 'Warfarin' were passed
      expect(mockCheckForDrugInteractions).toHaveBeenCalledWith(
        expect.any(Array), // mockPatientData.currentMedications
        'Warfarin',
        expect.any(Array)  // mockDrugInteractions
      );
    });

    // Check if the alert is displayed (via the mocked CopilotDisplay)
    expect(screen.getByTestId(`alert-${mockInteractionAlert.id}`)).toBeInTheDocument();
    expect(screen.getByText(mockInteractionAlert.message)).toBeInTheDocument();
  });

  it('calls checkForMissingLabs and updates alerts when "Check Missing Labs" is clicked', async () => {
    mockCheckForMissingLabs.mockReturnValue([mockMissingLabAlert]);
    render(<CopilotPage />);

    // For Shadcn Select, interaction is more complex. We need to open the dropdown then click an item.
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(selectTrigger).toHaveAttribute('data-state', 'closed');

    await userEvent.click(selectTrigger); // Use userEvent.click to open the dropdown

    // Check if the select opened
    await waitFor(() => {
      expect(selectTrigger).toHaveAttribute('aria-expanded', 'true');
      expect(selectTrigger).toHaveAttribute('data-state', 'open');
    });

    // Wait for the items to appear and click one
    // The items might not have explicit roles if not using standard HTML select options.
    // We'll find by text content.
    const option = await screen.findByText('Fatigue/General Checkup');
    fireEvent.click(option);

    const checkButton = screen.getByRole('button', { name: /Check Missing Labs/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(mockCheckForMissingLabs).toHaveBeenCalledTimes(1);
      expect(mockCheckForMissingLabs).toHaveBeenCalledWith(
        expect.any(Array), // mockPatientData.labResults
        'fatigue',        // Value of the selected option
        expect.any(Object) // mockLabRequirements
      );
    });

    expect(screen.getByTestId(`alert-${mockMissingLabAlert.id}`)).toBeInTheDocument();
    expect(screen.getByText(mockMissingLabAlert.message)).toBeInTheDocument();
  });

  it('clears alerts when "Clear All Alerts" is clicked', async () => {
    mockCheckForDrugInteractions.mockReturnValue([mockInteractionAlert]);
    render(<CopilotPage />);

    // First, generate an alert
    fireEvent.change(screen.getByPlaceholderText(/Enter new drug name/i), { target: { value: 'Warfarin' } });
    fireEvent.click(screen.getByRole('button', { name: /Check Interactions/i }));

    await waitFor(() => {
      expect(screen.getByTestId(`alert-${mockInteractionAlert.id}`)).toBeInTheDocument();
    });

    // Now, click clear
    const clearButton = screen.getByRole('button', { name: /Clear All Alerts/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByTestId(`alert-${mockInteractionAlert.id}`)).not.toBeInTheDocument();
    });
  });

  it('does not call interaction check if drug name is empty', () => {
    render(<CopilotPage />);
    const checkButton = screen.getByRole('button', { name: /Check Interactions/i });
    fireEvent.click(checkButton);
    expect(mockCheckForDrugInteractions).not.toHaveBeenCalled();
  });

  it('does not call missing labs check if context is not selected', () => {
    render(<CopilotPage />);
    const checkButton = screen.getByRole('button', { name: /Check Missing Labs/i });
    fireEvent.click(checkButton);
    expect(mockCheckForMissingLabs).not.toHaveBeenCalled();
  });

});
