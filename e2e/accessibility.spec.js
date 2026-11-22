const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { signInUser, resetTestDb } = require('./helpers');

test.describe('V-02: Axe-core Accessibility Scans', () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  const themes = ['light', 'dark'];

  for (const theme of themes) {
    test(`zero serious or critical axe violations on ${theme} theme (dashboard, detail dialog, confirm dialog)`, async ({
      page,
    }) => {
      await signInUser(page);

      // Set theme
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      // Create a task to populate the dashboard
      const taskTitle = `A11y Test Task (${theme})`;
      const taskForm = page.locator('form.task-form');
      await taskForm.getByPlaceholder('New task title').fill(taskTitle);
      await taskForm.getByRole('button', { name: 'Add task' }).click();

      const taskCard = page.locator('.task-card', { hasText: taskTitle });
      await expect(taskCard).toBeVisible();

      // Scan 1: Dashboard
      const dashboardResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const dashboardSevere = dashboardResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (dashboardSevere.length > 0) {
        console.error(
          `Dashboard (${theme}) violations:`,
          JSON.stringify(dashboardSevere, null, 2),
        );
      }
      expect(dashboardSevere).toEqual([]);

      // Scan 2: Open TaskDetailDialog
      await taskCard
        .getByRole('button', { name: `Open details for ${taskTitle}` })
        .click();
      const detailDialog = page.locator('dialog.task-detail-dialog');
      await expect(detailDialog).toHaveAttribute('open', '');

      const detailResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const detailSevere = detailResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (detailSevere.length > 0) {
        console.error(
          `TaskDetailDialog (${theme}) violations:`,
          JSON.stringify(detailSevere, null, 2),
        );
      }
      expect(detailSevere).toEqual([]);

      await detailDialog.getByRole('button', { name: 'Close dialog' }).click();
      await expect(detailDialog).not.toBeVisible();

      // Scan 3: Open DeleteConfirmDialog
      await taskCard
        .getByRole('button', { name: `Delete ${taskTitle}` })
        .click();
      const confirmDialog = page.locator('dialog.delete-confirm-dialog');
      await expect(confirmDialog).toHaveAttribute('open', '');

      const confirmResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const confirmSevere = confirmResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (confirmSevere.length > 0) {
        console.error(
          `DeleteConfirmDialog (${theme}) violations:`,
          JSON.stringify(confirmSevere, null, 2),
        );
      }
      expect(confirmSevere).toEqual([]);

      await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirmDialog).not.toBeVisible();
    });
  }
});
