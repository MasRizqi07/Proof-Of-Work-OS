const { test, expect } = require('@playwright/test');
const { signInUser, resetTestDb } = require('./helpers');

test.describe('Phase 12: Interaction Layer (K-01, K-02, K-03, S-01, O-01)', () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test('K-01: Command palette keyboard navigation, execution, and Esc dismiss with focus return', async ({
    page,
  }) => {
    await signInUser(page);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('.user-name')).toHaveText('User A');

    // Create a task first
    const taskTitle = 'Palette Target Task';
    const taskForm = page.locator('form.task-form');
    const titleInput = taskForm.getByPlaceholder('New task title');
    const addBtn = taskForm.getByRole('button', { name: 'Add task' });

    await titleInput.fill(taskTitle);
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/tasks') &&
          resp.request().method() === 'POST',
      ),
      addBtn.click(),
    ]);
    await expect(
      page.locator('.task-card', { hasText: taskTitle }),
    ).toBeVisible();

    const paletteBtn = page.locator('header .header-action-btn', {
      hasText: 'Palette',
    });
    await paletteBtn.focus();
    await expect(paletteBtn).toBeFocused();

    // 1. Open via Control+k
    await page.keyboard.press('Control+k');
    const palette = page.locator('dialog.palette-dialog');
    await expect(palette).toHaveAttribute('open', '');

    const combobox = palette.getByRole('combobox');
    await expect(combobox).toBeFocused();
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await expect(palette.getByRole('listbox')).toBeVisible();

    // 2. ArrowDown navigation updates aria-activedescendant
    await page.keyboard.press('ArrowDown');
    const activeDescendant = await combobox.getAttribute(
      'aria-activedescendant',
    );
    expect(activeDescendant).toBeTruthy();

    // 3. Esc closes dialog and returns focus to trigger
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible();
    await expect(paletteBtn).toBeFocused();

    // 4. Open via button and filter to select a task
    await paletteBtn.click();
    await expect(palette).toHaveAttribute('open', '');

    await combobox.fill('Target');
    await expect(
      palette.locator('.palette-item', { hasText: taskTitle }),
    ).toBeVisible();

    // Press Enter to select the task and open its detail dialog
    await page.keyboard.press('Enter');
    await expect(palette).not.toBeVisible();

    const detailDialog = page.locator('dialog.task-detail-dialog');
    await expect(detailDialog).toHaveAttribute('open', '');
    await expect(
      detailDialog.getByRole('heading', { name: 'Task details' }),
    ).toBeVisible();

    // Close detail dialog
    await detailDialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(detailDialog).not.toBeVisible();
  });

  test('K-02 & K-03: Single-key shortcuts execute outside inputs and are suppressed inside inputs and dialogs', async ({
    page,
  }) => {
    await signInUser(page);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    // 1. Outside inputs: 'n' focuses new task title
    await page.keyboard.press('n');
    const taskTitleInput = page.getByPlaceholder('New task title');
    await expect(taskTitleInput).toBeFocused();

    // 2. Suppression: typing 'n', '/', 't', '?' into input does not fire shortcuts
    await taskTitleInput.fill('Task / testing shortcuts?');
    await expect(taskTitleInput).toHaveValue('Task / testing shortcuts?');
    // Verify no help dialog was opened
    const helpDialog = page.locator('dialog.shortcuts-dialog');
    await expect(helpDialog).not.toBeVisible();

    // Blur the input
    await taskTitleInput.blur();

    // 3. Outside inputs: '/' focuses search input
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(
      'Search by title or description...',
    );
    await expect(searchInput).toBeFocused();
    await searchInput.blur();

    // 4. Outside inputs: '?' opens shortcuts help dialog
    const helpBtn = page.locator('header .header-action-btn', {
      hasText: 'Shortcuts',
    });
    await helpBtn.focus();
    await expect(helpBtn).toBeFocused();

    await page.keyboard.press('?');
    await expect(helpDialog).toHaveAttribute('open', '');
    await expect(
      helpDialog.getByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).toBeVisible();
    await expect(helpDialog.getByRole('table')).toBeVisible();

    // In modal dialog, single-key shortcuts are suppressed
    await page.keyboard.press('t');
    // Close help dialog via Escape, focus returns to helpBtn
    await page.keyboard.press('Escape');
    await expect(helpDialog).not.toBeVisible();
    await expect(helpBtn).toBeFocused();
  });

  test('S-01: Debounced server search, typographical quote empty state, and clear button', async ({
    page,
  }) => {
    await signInUser(page);

    // Create two distinct tasks
    const taskForm = page.locator('form.task-form');
    const titleInput = taskForm.getByPlaceholder('New task title');
    const addBtn = taskForm.getByRole('button', { name: 'Add task' });

    await titleInput.fill('Database Query Optimization');
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/tasks') &&
          resp.request().method() === 'POST',
      ),
      addBtn.click(),
    ]);
    await expect(
      page.locator('.task-card', { hasText: 'Database Query Optimization' }),
    ).toBeVisible();

    await titleInput.fill('Frontend Animation Polish');
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/tasks') &&
          resp.request().method() === 'POST',
      ),
      addBtn.click(),
    ]);
    await expect(
      page.locator('.task-card', { hasText: 'Frontend Animation Polish' }),
    ).toBeVisible();

    // Search filter input
    const searchInput = page.getByPlaceholder(
      'Search by title or description...',
    );
    await searchInput.fill('Database');

    // Wait for 250ms debounce
    await page.waitForTimeout(350);

    // Only Database task should be visible
    await expect(
      page.locator('.task-card', { hasText: 'Database Query Optimization' }),
    ).toBeVisible();
    await expect(
      page.locator('.task-card', { hasText: 'Frontend Animation Polish' }),
    ).not.toBeVisible();

    // Clear search using the clear button
    const clearBtn = page.getByRole('button', { name: 'Clear search' });
    await clearBtn.click();

    // Both should be visible again
    await expect(
      page.locator('.task-card', { hasText: 'Database Query Optimization' }),
    ).toBeVisible();
    await expect(
      page.locator('.task-card', { hasText: 'Frontend Animation Polish' }),
    ).toBeVisible();

    // Search for non-existent text
    await searchInput.fill('NonExistentKeywordXYZ');
    await page.waitForTimeout(350);

    // Empty search state with typographical quotes in task list
    const emptyState = page.locator('.tasks-panel .state-message');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(
      'No tasks match “NonExistentKeywordXYZ”',
    );
  });

  test('O-01: Optimistic UI rollback and role="alert" message on server update error', async ({
    page,
  }) => {
    await signInUser(page);

    // Create a task
    const taskTitle = 'Rollback Target Task';
    const taskForm = page.locator('form.task-form');
    const titleInput = taskForm.getByPlaceholder('New task title');
    const addBtn = taskForm.getByRole('button', { name: 'Add task' });

    await titleInput.fill(taskTitle);
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/tasks') &&
          resp.request().method() === 'POST',
      ),
      addBtn.click(),
    ]);

    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    await expect(taskCard).toBeVisible();

    // Intercept PATCH to simulate 500 error
    await page.route('**/api/tasks/**', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server update error' }),
        });
      } else {
        await route.continue();
      }
    });

    // Select 'done'
    const statusSelect = taskCard.getByRole('combobox', {
      name: `Status for ${taskTitle}`,
    });
    await statusSelect.selectOption('done');

    // Verify rollback message appears with role="alert"
    const alert = taskCard.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(
      "Couldn't update this task. Your change was undone.",
    );

    // Status select should have reverted to 'todo'
    await expect(statusSelect).toHaveValue('todo');

    // Clean up route handler
    await page.unroute('**/api/tasks/**');
  });
});
