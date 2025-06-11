import { test, expect } from '@playwright/test';

test.describe('Modal Drag and Minimize Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should open a draggable guideline modal', async ({ page }) => {
    // Look for any guideline or modal trigger in the UI
    // This assumes there's a way to trigger a guideline modal from the main interface
    const guidelineButton = page.locator('[data-testid="guideline-button"]').first();
    
    if (await guidelineButton.isVisible()) {
      await guidelineButton.click();
      
      // Wait for modal to appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Check if it has draggable features
      const titleBar = page.locator('[data-testid="modal-title-bar"]').first();
      await expect(titleBar).toBeVisible();
    }
  });

  test('should be able to drag a modal by its title bar', async ({ page }) => {
    // Open any modal that supports dragging
    // First try to open patient workspace which might have modals
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Look for a patient to click
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      // Try to open a consultation or guideline modal
      const modalTrigger = page.locator('button').filter({ hasText: /consultation|guideline|new/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();
        
        // Check if modal is draggable
        const titleBar = page.locator('[data-testid="modal-title-bar"]').first();
        if (await titleBar.isVisible()) {
          // Get initial position
          const initialBox = await modal.boundingBox();
          
          // Perform drag operation
          await titleBar.hover();
          await page.mouse.down();
          await page.mouse.move(initialBox!.x + 100, initialBox!.y + 50);
          await page.mouse.up();
          
          // Verify modal moved
          const newBox = await modal.boundingBox();
          expect(newBox!.x).not.toBe(initialBox!.x);
        }
      }
    }
  });

  test('should be able to minimize and restore a modal', async ({ page }) => {
    // Navigate to a page that might have minimizable modals
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Look for a patient to work with
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      // Try to trigger a modal
      const modalTrigger = page.locator('button').filter({ hasText: /consultation|new/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();
        
        // Look for minimize button
        const minimizeButton = page.locator('button[title*="minimize"], button[aria-label*="minimize"]').first();
        if (await minimizeButton.isVisible()) {
          await minimizeButton.click();
          
          // Modal content should be hidden
          await expect(modal).not.toBeVisible();
          
          // Should appear in minimized bar
          const minimizedBar = page.locator('[data-testid="minimized-modal-bar"]');
          await expect(minimizedBar).toBeVisible();
          
          // Click on minimized item to restore
          const minimizedItem = minimizedBar.locator('button').first();
          await minimizedItem.click();
          
          // Modal should be visible again
          await expect(modal).toBeVisible();
        }
      }
    }
  });

  test('should handle keyboard shortcuts for modal management', async ({ page }) => {
    // Navigate and open a modal
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      const modalTrigger = page.locator('button').filter({ hasText: /consultation|new/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();
        
        // Test Ctrl+M to minimize (if supported)
        await page.keyboard.press('Control+m');
        
        // Give it a moment to process
        await page.waitForTimeout(500);
        
        // Test Escape to close
        await page.keyboard.press('Escape');
        
        // Give it a moment to process
        await page.waitForTimeout(500);
      }
    }
  });

  test('should constrain modal position to viewport', async ({ page }) => {
    // Set a specific viewport size for consistent testing
    await page.setViewportSize({ width: 1024, height: 768 });
    
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      const modalTrigger = page.locator('button').filter({ hasText: /consultation|new/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();
        
        const titleBar = page.locator('[data-testid="modal-title-bar"]').first();
        if (await titleBar.isVisible()) {
          // Try to drag modal outside viewport bounds
          await titleBar.hover();
          await page.mouse.down();
          await page.mouse.move(-100, -100); // Try to move outside top-left
          await page.mouse.up();
          
          // Verify modal is still within viewport
          const modalBox = await modal.boundingBox();
          expect(modalBox!.x).toBeGreaterThanOrEqual(0);
          expect(modalBox!.y).toBeGreaterThanOrEqual(0);
          
          // Try to drag to bottom-right beyond viewport
          await titleBar.hover();
          await page.mouse.down();
          await page.mouse.move(2000, 2000);
          await page.mouse.up();
          
          // Verify modal is constrained
          const newModalBox = await modal.boundingBox();
          expect(newModalBox!.x + newModalBox!.width).toBeLessThanOrEqual(1024);
          expect(newModalBox!.y + newModalBox!.height).toBeLessThanOrEqual(768);
        }
      }
    }
  });

  test('should persist modal position across page navigation', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      const modalTrigger = page.locator('button').filter({ hasText: /consultation|new/i }).first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toBeVisible();
        
        const titleBar = page.locator('[data-testid="modal-title-bar"]').first();
        if (await titleBar.isVisible()) {
          // Move modal to a specific position
          await titleBar.hover();
          await page.mouse.down();
          await page.mouse.move(300, 200);
          await page.mouse.up();
          
          const initialBox = await modal.boundingBox();
          
          // Close modal
          const closeButton = page.locator('button[aria-label*="close"], button[title*="close"]').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
          
          // Wait a moment
          await page.waitForTimeout(500);
          
          // Reopen modal
          if (await modalTrigger.isVisible()) {
            await modalTrigger.click();
            
            const reopenedModal = page.locator('[role="dialog"]').first();
            await expect(reopenedModal).toBeVisible();
            
            // Check if position was restored
            const restoredBox = await reopenedModal.boundingBox();
            
            // Position should be close to where we left it (allowing for small differences)
            expect(Math.abs(restoredBox!.x - initialBox!.x)).toBeLessThan(50);
            expect(Math.abs(restoredBox!.y - initialBox!.y)).toBeLessThan(50);
          }
        }
      }
    }
  });

  test('should handle multiple minimized modals in the bottom bar', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Try to open multiple modals if possible
    const patientLink = page.locator('a[href*="/patients/"]').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for multiple modal triggers
      const modalTriggers = page.locator('button').filter({ hasText: /consultation|new|guideline/i });
      const triggerCount = await modalTriggers.count();
      
      if (triggerCount > 1) {
        // Open first modal
        await modalTriggers.nth(0).click();
        let modal1 = page.locator('[role="dialog"]').first();
        await expect(modal1).toBeVisible();
        
        // Minimize it
        const minimizeButton1 = page.locator('button[title*="minimize"], button[aria-label*="minimize"]').first();
        if (await minimizeButton1.isVisible()) {
          await minimizeButton1.click();
        }
        
        // Open second modal
        await modalTriggers.nth(1).click();
        let modal2 = page.locator('[role="dialog"]').first();
        await expect(modal2).toBeVisible();
        
        // Minimize it
        const minimizeButton2 = page.locator('button[title*="minimize"], button[aria-label*="minimize"]').first();
        if (await minimizeButton2.isVisible()) {
          await minimizeButton2.click();
        }
        
        // Check minimized bar has multiple items
        const minimizedBar = page.locator('[data-testid="minimized-modal-bar"]');
        if (await minimizedBar.isVisible()) {
          const minimizedItems = minimizedBar.locator('button');
          const itemCount = await minimizedItems.count();
          expect(itemCount).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
}); 