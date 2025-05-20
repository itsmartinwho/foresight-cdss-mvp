import { test, expect } from '@playwright/test';

test.describe('Foresight CDSS E2E Tests', () => {
  test('Dashboard page loads', async ({ page }) => {
    await page.goto('/');
    // Check that the header logo is visible
    await expect(page.getByAltText('Foresight Logo')).toBeVisible();
  });

  test('Sidebar collapse and expand toggle works', async ({ page }) => {
    await page.goto('/');
    // Sidebar selector by width classes
    const sidebar = page.locator('div[class*="w-56"], div[class*="w-[4.5rem]"]');
    const toggleButton = page.locator('button[aria-label="Minimize menu"]');

    // Check initial state (expanded)
    await expect(sidebar).toHaveClass(/w-56/);
    await expect(sidebar).not.toHaveClass(/w-\[4\.5rem\]/);

    // Click to collapse
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[4\.5rem\]/);
    await expect(sidebar).not.toHaveClass(/w-56/);
    await page.waitForTimeout(300); // Wait for animation/localStorage update if any

    // Click to expand
    // The aria-label changes after collapse
    const expandButton = page.locator('button[aria-label="Maximize menu"]');
    await expandButton.click();
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
    // As a generic check, let's assume the header logo is still visible
    await expect(page.getByAltText('Foresight Logo')).toBeVisible();
  });
}); 