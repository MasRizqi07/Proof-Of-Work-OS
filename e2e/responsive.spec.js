const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { signInUser, resetTestDb } = require('./helpers');

test.describe('V-03: Responsive Overflow & Screenshots', () => {
  const widths = [320, 480, 768, 1024, 1440, 1920];
  const themes = ['light', 'dark'];
  const screenshotsDir = path.join(__dirname, 'screenshots');

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async () => {
    await resetTestDb();
  });

  for (const theme of themes) {
    for (const width of widths) {
      test(`no horizontal overflow at ${width}px in ${theme} theme and captures screenshot`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await signInUser(page);

        // Apply theme
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        // Wait for tasks panel to settle
        await expect(page.locator('.tasks-panel')).toBeVisible();
        await expect(
          page.locator('.state-message:has-text("Loading tasks…")'),
        ).not.toBeVisible();

        // Create a completed task with proof to render realistic dashboard content
        const taskTitle = `Responsive Item (${width}px)`;
        const taskForm = page.locator('form.task-form');
        await taskForm.getByPlaceholder('New task title').fill(taskTitle);

        await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/tasks') && resp.status() === 201,
          ),
          taskForm.getByRole('button', { name: 'Add task' }).click(),
        ]);

        const taskCard = page.locator('.task-card', { hasText: taskTitle });
        await expect(taskCard).toBeVisible();

        // Mark done
        const statusSelect = taskCard.getByRole('combobox', {
          name: `Status for ${taskTitle}`,
        });
        await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/tasks/') && resp.status() === 200,
          ),
          statusSelect.selectOption('done'),
        ]);

        // Allow layout to stabilize
        await page.waitForTimeout(100);

        // Evaluate overflow constraint: scrollWidth <= clientWidth
        const dimensions = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });

        expect(
          dimensions.scrollWidth,
          `Horizontal overflow detected at ${width}px (${theme}): scrollWidth ${dimensions.scrollWidth} > clientWidth ${dimensions.clientWidth}`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);

        // Save screenshot
        const screenshotPath = path.join(
          screenshotsDir,
          `dashboard-${theme}-${width}px.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        expect(fs.existsSync(screenshotPath)).toBe(true);
      });
    }
  }
});
