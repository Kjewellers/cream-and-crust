import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Path', () => {
  test('App boots and renders without crashing', async ({ page }) => {
    // Navigate to root
    const response = await page.goto('/');
    
    // Ensure we got a successful response (not a 404/500)
    expect(response.status()).toBe(200);

    // Wait for the app to mount. The App container or a core element should be visible.
    // If React crashes due to an undefined variable, the root `#root` will be empty.
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
    
    // Check if there are any fatal console errors
    const errors = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // Let the app settle
    await page.waitForTimeout(2000);
    
    // The smoke test passes if React is still alive and no fatal page errors were thrown.
    expect(errors.length).toBe(0);
  });
});
