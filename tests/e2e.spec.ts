import { test, expect } from '@playwright/test';

test.describe('Foresight CDSS E2E Tests', () => {
  test('Dashboard page loads', async ({ page }) => {
    await page.goto('/');
    // Check for a unique element or text on the dashboard.
    // This assumes ForesightApp or DashboardView renders something identifiable.
    // For example, if there's an <h1> with "Dashboard", or a specific data-testid.
    // As a generic check, we'll look for the app's title span from GlassHeader.
    await expect(page.getByText('Foresight').first()).toBeVisible();
    // A more specific check for dashboard content would be better.
    // For example, if DashboardView has a <h2 data-testid="dashboard-title">Dashboard</h2>
    // await expect(page.getByTestId('dashboard-title')).toHaveText('Dashboard');
  });

  test('Sidebar collapse and expand toggle works', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('div[class*="bg-glass"][class*="w-56"], div[class*="bg-glass"][class*="w-[4.5rem"]'); // More specific selector for the sidebar div itself
    const toggleButton = page.locator('button[aria-label="Toggle sidebar"]');

    // Check initial state (expanded)
    await expect(sidebar).toHaveClass(/w-56/);
    await expect(sidebar).not.toHaveClass(/w-\[4\.5rem\]/);

    // Click to collapse
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[4\.5rem\]/);
    await expect(sidebar).not.toHaveClass(/w-56/);
    await page.waitForTimeout(300); // Wait for animation/localStorage update if any

    // Click to expand
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-56/);
    await expect(sidebar).not.toHaveClass(/w-\[4\.5rem\]/);
  });

  test('Navigate to Patients view from sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Click the "Patients" link in the sidebar
    // The link is identified by its text content and role.
    const patientsLink = page.getByRole('link', { name: 'Patients' });
    await patientsLink.click();

    // Verify the URL changed to /patients
    await expect(page).toHaveURL('/patients');

    // Optional: Verify content specific to the Patients view appears
    // For example, if PatientsListView renders <h2 data-testid="patients-title">Patients List</h2>
    // await expect(page.getByTestId('patients-title')).toBeVisible();
    // As a generic check, let's assume the header is still visible with "Foresight"
    await expect(page.getByText('Foresight').first()).toBeVisible();
  });
}); 