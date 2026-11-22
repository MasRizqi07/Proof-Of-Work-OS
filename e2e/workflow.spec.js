const { test, expect } = require('@playwright/test');
const { signInUser, resetTestDb } = require('./helpers');

test.describe('V-01: Full Browser Workflow', () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test('executes complete user journey in real browser', async ({ page }) => {
    // 1. Sign in
    await signInUser(page);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.locator('.user-name')).toHaveText('User A');

    // 2. Buat task
    const taskTitle = 'V-01 Core Verification Task';
    const taskForm = page.locator('form.task-form');
    await taskForm.getByPlaceholder('New task title').fill(taskTitle);
    await taskForm.getByRole('button', { name: 'Add task' }).click();

    const taskCard = page.locator('.task-card', { hasText: taskTitle });
    await expect(taskCard).toBeVisible();

    // 3. Tandai done (muncul "No proof yet")
    const statusSelect = taskCard.getByRole('combobox', {
      name: `Status for ${taskTitle}`,
    });
    await statusSelect.selectOption('done');

    const noProofBadge = taskCard.locator('.proof-badge-without');
    await expect(noProofBadge).toContainText('No proof yet');

    // 4. Tambah bukti link (daftar menampilkan 1 item, lencana berubah jadi "With proof · 1")
    await taskCard.getByRole('button', { name: 'Add proof' }).click();
    const detailDialog = page.locator('dialog.task-detail-dialog');
    await expect(detailDialog).toHaveAttribute('open', '');

    const labelInput = detailDialog.getByPlaceholder('e.g. Pull Request #42');
    await labelInput.fill('Pull Request #1');
    const urlInput = detailDialog.getByPlaceholder('https://github.com/...');
    await urlInput.fill('https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/1');
    await detailDialog.getByRole('button', { name: 'Add proof' }).click();

    await expect(detailDialog.locator('.evidence-item')).toHaveCount(1);
    await expect(detailDialog.locator('.evidence-count-badge')).toContainText(
      '1 / 20',
    );

    // Close detail dialog and check badge
    await detailDialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(detailDialog).not.toBeVisible();

    const withProofBadge = taskCard.locator('.proof-badge-with');
    await expect(withProofBadge).toContainText('With proof ·');
    await expect(withProofBadge).toContainText('1');

    // 5. Tambah bukti catatan
    await taskCard
      .getByRole('button', { name: `Open details for ${taskTitle}` })
      .click();
    await expect(detailDialog).toHaveAttribute('open', '');

    await detailDialog.getByRole('radio', { name: 'Note' }).check();
    const noteLabelInput = detailDialog.getByPlaceholder('e.g. Test output log');
    await noteLabelInput.fill('Vitest Output Log');
    const noteBodyInput = detailDialog.getByPlaceholder(
      'Paste output or test run results (max 2000 chars)',
    );
    await noteBodyInput.fill('38 tests passed in 3.8s with 0 errors.');
    await detailDialog.getByRole('button', { name: 'Add proof' }).click();

    await expect(detailDialog.locator('.evidence-item')).toHaveCount(2);
    await expect(detailDialog.locator('.evidence-count-badge')).toContainText(
      '2 / 20',
    );

    // 6. Hapus satu bukti
    const deleteNoteBtn = detailDialog.getByRole('button', {
      name: 'Remove proof: Vitest Output Log',
    });
    await deleteNoteBtn.click();

    await expect(detailDialog.locator('.evidence-item')).toHaveCount(1);
    await expect(detailDialog.locator('.evidence-count-badge')).toContainText(
      '1 / 20',
    );

    // Close and verify badge
    await detailDialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(detailDialog).not.toBeVisible();
    await expect(withProofBadge).toContainText('With proof ·');
    await expect(withProofBadge).toContainText('1');

    // 7. Ganti tema dan reload (pilihan bertahan)
    const themeToggle = page.locator('button.theme-toggle');
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    const targetTheme = initialTheme === 'dark' ? 'light' : 'dark';

    await themeToggle.click();
    const themeAfterToggle = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(themeAfterToggle).toBe(targetTheme);

    await page.reload();
    await page.waitForSelector('.user-name', { timeout: 10000 });
    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(themeAfterReload).toBe(targetTheme);

    // 8. Buka dan tutup panel dengan keyboard saja (fokus kembali ke pemicu)
    const detailsBtn = taskCard.getByRole('button', {
      name: `Open details for ${taskTitle}`,
    });
    await detailsBtn.focus();
    await expect(detailsBtn).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(detailDialog).toHaveAttribute('open', '');

    await page.keyboard.press('Escape');
    await expect(detailDialog).not.toBeVisible();
    await expect(detailsBtn).toBeFocused();

    // 9. Hapus task lewat dialog konfirmasi
    const deleteBtn = taskCard.getByRole('button', {
      name: `Delete ${taskTitle}`,
    });
    await deleteBtn.click();

    const confirmDialog = page.locator('dialog.delete-confirm-dialog');
    await expect(confirmDialog).toHaveAttribute('open', '');
    await expect(
      confirmDialog.getByRole('heading', { name: 'Delete this task?' }),
    ).toBeVisible();

    await confirmDialog
      .getByRole('button', { name: 'Delete task', exact: true })
      .click();
    await expect(confirmDialog).not.toBeVisible();
    await expect(
      page.locator('.task-title', { hasText: taskTitle }),
    ).not.toBeVisible();
  });
});
