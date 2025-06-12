import { test, expect } from '@playwright/test';

test.describe('Modal Cross-Page Persistence', () => {
  test('minimized modals should persist when navigating between pages', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Open the demo modal
    const demoButton = page.locator('button', { hasText: /demo|introduction/i });
    if (await demoButton.isVisible()) {
      await demoButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Minimize the modal
      const minimizeButton = page.locator('[role="dialog"] button[title*="minimize" i], [role="dialog"] button[aria-label*="minimize" i]');
      if (await minimizeButton.isVisible()) {
        await minimizeButton.click();
        
        // Verify modal is minimized (should appear in bottom bar)
        await page.waitForSelector('.minimized-modal-bar', { state: 'visible' });
        const minimizedModalCount = await page.locator('.minimized-modal-item').count();
        expect(minimizedModalCount).toBeGreaterThan(0);
        
        // Navigate to patients page
        await page.click('a[href="/patients"]');
        await page.waitForLoadState('networkidle');
        
        // Verify minimized modal still appears in the bar
        const minimizedModalBarAfterNav = page.locator('.minimized-modal-bar');
        await expect(minimizedModalBarAfterNav).toBeVisible();
        
        const minimizedModalCountAfterNav = await page.locator('.minimized-modal-item').count();
        expect(minimizedModalCountAfterNav).toBeGreaterThan(0);
        
        // Click on minimized modal to restore it
        const minimizedModal = page.locator('.minimized-modal-item').first();
        await minimizedModal.click();
        
        // Verify modal is restored and visible
        await page.waitForSelector('[role="dialog"]', { state: 'visible' });
        
        // Navigate back to dashboard
        await page.click('a[href="/"]');
        await page.waitForLoadState('networkidle');
        
        // Verify modal is still open on dashboard
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    }
  });

  test('should handle multiple minimized modals across navigation', async ({ page }) => {
    // This test would require multiple modals to be available
    // For now, we'll skip this as it depends on having multiple modal types available
    test.skip();
  });

  test('minimized modal should restore to correct position after navigation', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open demo modal if available
    const demoButton = page.locator('button', { hasText: /demo|introduction/i });
    if (await demoButton.isVisible()) {
      await demoButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Drag modal to a specific position
      const modalDialog = page.locator('[role="dialog"]');
      const modalHeader = modalDialog.locator('.cursor-move, [data-testid="drag-handle"]').first();
      
      if (await modalHeader.isVisible()) {
        const initialBox = await modalDialog.boundingBox();
        
        // Drag modal to a new position
        await modalHeader.dragTo(page.locator('body'), {
          targetPosition: { x: 300, y: 200 }
        });
        
        // Wait a bit for position to settle
        await page.waitForTimeout(500);
        
        // Minimize the modal
        const minimizeButton = modalDialog.locator('button[title*="minimize" i], button[aria-label*="minimize" i]');
        if (await minimizeButton.isVisible()) {
          await minimizeButton.click();
          
          // Navigate to different page
          await page.click('a[href="/patients"]');
          await page.waitForLoadState('networkidle');
          
          // Navigate back
          await page.click('a[href="/"]');
          await page.waitForLoadState('networkidle');
          
          // Restore the modal
          const minimizedModal = page.locator('.minimized-modal-item').first();
          if (await minimizedModal.isVisible()) {
            await minimizedModal.click();
            
            // Verify modal appears in approximately the same position
            await page.waitForSelector('[role="dialog"]', { state: 'visible' });
            const restoredBox = await modalDialog.boundingBox();
            
            if (restoredBox && initialBox) {
              // Allow some tolerance for position differences
              expect(Math.abs(restoredBox.x - 300)).toBeLessThan(50);
              expect(Math.abs(restoredBox.y - 200)).toBeLessThan(50);
            }
          }
        }
      }
    }
  });
}); 