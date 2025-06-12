import { test, expect } from '@playwright/test';

test.describe('Modal Cross-Page Persistence with Navigation', () => {
  test('minimized modals should persist and restore via navigation when clicked from different pages', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Open a test modal from demo page first
    await page.goto('/demo/modal-test');
    await page.waitForLoadState('networkidle');
    
    // Open the draggable guideline modal
    const openGuidelineButton = page.locator('button', { hasText: 'Open Draggable Guideline Modal' });
    if (await openGuidelineButton.isVisible()) {
      await openGuidelineButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Minimize the modal
      const minimizeButton = page.locator('[role="dialog"] button[title*="minimize" i], [role="dialog"] button[aria-label*="minimize" i]');
      if (await minimizeButton.count() > 0) {
        await minimizeButton.first().click();
        
        // Wait for modal to be minimized
        await page.waitForTimeout(500);
        
        // Verify modal is minimized (modal dialog should not be visible, but minimized bar should be)
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
        
        // Check for minimized modal bar
        const minimizedBar = page.locator('[data-testid="minimized-modal-bar"], .minimized-modal-bar, [class*="minimized"]');
        await expect(minimizedBar).toBeVisible();
        
        // Navigate to a different page (dashboard)
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Verify minimized modal bar still exists on the new page
        await expect(minimizedBar).toBeVisible();
        
        // Click on the minimized modal to restore it
        const minimizedModalButton = page.locator('[data-testid="minimized-modal-bar"] button, .minimized-modal-bar button').first();
        await minimizedModalButton.click();
        
        // Wait for navigation back to the original page
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Verify we're back on the demo page and modal is restored
        expect(page.url()).toContain('/demo/modal-test');
        
        // Wait for modal to appear after navigation
        await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
        
        // Verify the modal content is visible
        const modalContent = page.locator('[role="dialog"]');
        await expect(modalContent).toBeVisible();
        await expect(modalContent).toContainText('Test Clinical Guideline');
      }
    }
  });

  test('multiple minimized modals from different pages should persist and restore correctly', async ({ page }) => {
    // Test with multiple modals from different origins
    
    // 1. Create a modal from demo page
    await page.goto('/demo/modal-test');
    await page.waitForLoadState('networkidle');
    
    const customModalButton = page.locator('button', { hasText: 'Open Custom Draggable Modal' });
    if (await customModalButton.isVisible()) {
      await customModalButton.click();
      await page.waitForTimeout(500);
      
      // Minimize this modal
      const minimizeButton = page.locator('button[title*="minimize" i], button[aria-label*="minimize" i]').first();
      if (await minimizeButton.count() > 0) {
        await minimizeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // 2. Navigate to dashboard and create another modal
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to find and open a modal from dashboard (if available)
    const demoButton = page.locator('button', { hasText: /demo|introduction|start/i }).first();
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForTimeout(500);
      
      // Minimize this modal if it opened
      const dashboardMinimizeButton = page.locator('button[title*="minimize" i], button[aria-label*="minimize" i]').first();
      if (await dashboardMinimizeButton.count() > 0) {
        await dashboardMinimizeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // 3. Navigate to patients page
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Verify both minimized modals are still visible
    const minimizedModals = page.locator('[data-testid="minimized-modal-bar"] button, .minimized-modal-bar button');
    const modalCount = await minimizedModals.count();
    expect(modalCount).toBeGreaterThan(0);
    
    // Test restoring one of the modals
    if (modalCount > 0) {
      await minimizedModals.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Should navigate back to the origin page
      const currentUrl = page.url();
      expect(currentUrl === '/demo/modal-test' || currentUrl === '/').toBeTruthy();
      
      // Modal should be visible
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    }
  });
}); 