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

  test('Advisor tab uses correct model for default and Think mode', async ({ page }) => {
    await page.goto('/advisor');

    // Wait for AdvisorView to mount
    await page.waitForSelector('textarea');

    // Intercept the network request to /api/advisor
    let modelUsed = '';
    await page.route('**/api/advisor', async (route, request) => {
      const postData = request.postDataJSON();
      modelUsed = postData.model;
      // Respond with a minimal valid response stream
      route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'Test response from AI', // Modified mock response for clarity
      });
    });

    // Type a message and send (default mode)
    await page.fill('textarea', 'Test message for default mode');
    await page.click('button:has(svg[data-lucide="Send"])');
    // Wait for the response to appear in the chat
    // Assuming responses are rendered in a div with role 'log' or similar structure
    await expect(page.locator('div[role="log"] >> text="Test response from AI"').last()).toBeVisible({ timeout: 5000 });
    expect(modelUsed).toBe('gpt-4.1-mini');

    // Clear the chat or ensure the next message is distinguishable
    // For simplicity, we'll rely on the .last() selector or ensure different mock responses if needed.
    // Re-routing for the second message to ensure clean state for model check if necessary,
    // or use a more specific response. For this test, same mock response is fine.
    
    // Enable Think mode
    await page.click('button:has(svg[data-lucide="Sparkles"])');
    await page.fill('textarea', 'Test message for Think mode');
    await page.click('button:has(svg[data-lucide="Send"])');
    await expect(page.locator('div[role="log"] >> text="Test response from AI"').last()).toBeVisible({ timeout: 5000 });
    expect(modelUsed).toBe('o3');
  });

  test('No consultations appear in the wrong table in Patients tab (upcoming vs past)', async ({ page }) => {
    await page.goto('/'); // Start from home page for navigation consistency
    // Navigate to Patients tab
    const patientsLink = page.getByRole('link', { name: 'Patients' });
    await patientsLink.click();
    await expect(page).toHaveURL(/.*\/patients$/); // More specific URL check

    // Wait for the consultations tab to load (assuming it's the default or loads quickly)
    // Click the "All Consultations" tab to ensure it's active for this test
    const consultationsTab = page.getByRole('tab', { name: /All Consultations/i });
    await consultationsTab.click();
    await expect(consultationsTab).toHaveAttribute('aria-selected', 'true');


    // Get current time for comparison
    const now = Date.now();

    // Check Upcoming Consultations table
    // Ensure the table is visible before trying to get rows
    const upcomingTable = page.locator('table:has-caption("Upcoming Consultations")');
    await expect(upcomingTable).toBeVisible();
    const upcomingRows = await upcomingTable.locator('tbody tr').all();
    for (const row of upcomingRows) {
      const dateCellText = await row.locator('td').nth(1).textContent(); // Assuming date is the second cell
      if (dateCellText) {
        const scheduledTime = new Date(dateCellText).getTime();
        expect(scheduledTime).toBeGreaterThan(now);
      }
    }

    // Check Past Consultations table
    const pastTable = page.locator('table:has-caption("Past Consultations")');
    await expect(pastTable).toBeVisible();
    const pastRows = await pastTable.locator('tbody tr').all();
    for (const row of pastRows) {
      const dateCellText = await row.locator('td').nth(1).textContent(); // Assuming date is the second cell
      if (dateCellText) {
        const scheduledTime = new Date(dateCellText).getTime();
        expect(scheduledTime).toBeLessThanOrEqual(now);
      }
    }
  });

  test('Patient Workspace Tabs Interaction', async ({ page }) => {
    await page.goto('/patients');

    // Click on the first patient in the list to go to their workspace.
    // This assumes patients are listed in a table or similar structure.
    // Using a generic selector for the first row link/button.
    // Adjust if the structure is different (e.g., data-testid for rows).
    const firstPatientLink = page.locator('table tbody tr:first-child a[href*="/patients/"]').first();
    // OR if the row itself is clickable: page.locator('table tbody tr:first-child').first().click();
    // OR page.getByRole('row').nth(1).getByRole('link').first().click(); (nth(1) because header is often a row)
    
    // For robustness, let's find the table and then the first patient link.
    // This assumes the patient list is in a table. If not, this selector needs to change.
    const patientTable = page.locator('table'); // Or a more specific selector for the patients table
    await expect(patientTable).toBeVisible();
    
    // Get the href of the first patient link to verify navigation later
    const firstPatientRow = patientTable.locator('tbody tr').first();
    const patientLink = firstPatientRow.locator('a[href*="/patients/"]').first(); // Link within the row
    const patientName = await firstPatientRow.locator('td').first().textContent(); // Assuming name is in the first cell
    
    await expect(patientLink).toBeVisible();
    const patientPageUrlRegex = /.*\/patients\/[^/]+$/;
    await patientLink.click();
    await expect(page).toHaveURL(patientPageUrlRegex);

    // Verify the patient's name or an identifier is visible on the workspace page.
    // This could be a header, a title, etc. Using a text assertion.
    if (patientName) {
      await expect(page.getByText(patientName, { exact: false })).toBeVisible();
    } else {
      // Fallback if name couldn't be extracted or is not directly on page
      await expect(page.locator('h1, h2, [data-testid="patient-name"]')).not.toBeEmpty();
    }
    
    // Tab interaction
    const tabs = [
      { name: 'All Consultations', uniqueContentTestId: 'all-consultations-view', uniqueText: 'Upcoming Consultations' }, // Assuming a table caption or title
      { name: 'Diagnosis', uniqueContentTestId: 'diagnosis-view', uniqueText: 'Current Diagnoses' }, // Example, adjust as per actual content
      { name: 'History', uniqueContentTestId: 'history-view', uniqueText: 'Medical History Overview' },
      { name: 'Labs', uniqueContentTestId: 'labs-view', uniqueText: 'Lab Results' },
      { name: 'Prior Auth', uniqueContentTestId: 'prior-auth-view', uniqueText: 'Prior Authorizations' },
      { name: 'Treatment', uniqueContentTestId: 'treatment-view', uniqueText: 'Current Treatments' },
      { name: 'Trials', uniqueContentTestId: 'trials-view', uniqueText: 'Clinical Trials' },
    ];

    for (const tab of tabs) {
      const tabButton = page.getByRole('tab', { name: new RegExp(tab.name, 'i') });
      await tabButton.click();
      await expect(tabButton).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
      // Verify unique content for the tab. This could be a data-testid, a heading, etc.
      // Using getByText as a general approach.
      await expect(page.getByText(tab.uniqueText, { exact: false })).toBeVisible({ timeout: 10000 });
      // Or, if using test-ids:
      // await expect(page.getByTestId(tab.uniqueContentTestId)).toBeVisible({ timeout: 10000 });
    }
  });

  test('Navigate to Analytics page from sidebar', async ({ page }) => {
    await page.goto('/');
    const analyticsLink = page.getByRole('link', { name: 'Analytics' });
    await analyticsLink.click();
    await expect(page).toHaveURL(/.*\/analytics$/);
    // Check for a unique title or element. Example:
    await expect(page.getByRole('heading', { name: /Analytics Dashboard/i, level: 1 })).toBeVisible();
    // Or a data-testid
    // await expect(page.getByTestId('analytics-page-title')).toBeVisible();
  });

  test('Navigate to Settings page from sidebar', async ({ page }) => {
    await page.goto('/');
    const settingsLink = page.getByRole('link', { name: 'Settings' });
    await settingsLink.click();
    await expect(page).toHaveURL(/.*\/settings$/);
    // Check for a unique title or element. Example:
    await expect(page.getByRole('heading', { name: /Settings/i, level: 1 })).toBeVisible();
    // Or a data-testid
    // await expect(page.getByTestId('settings-page-title')).toBeVisible();
  });

});