const { test, expect } = require('@playwright/test');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { signInUser, resetTestDb } = require('./helpers');

test.describe('Phase 13: Insight Layer (H-01, RP-01)', () => {
  test.beforeEach(async () => {
    await resetTestDb();
  });

  test('H-01: Heatmap renders 26x7 grid, updates counts, supports keyboard arrow navigation & 320px inner scroll', async ({
    page,
  }) => {
    await signInUser(page);

    // Create two completed tasks: one with proof, one without proof
    const taskForm = page.locator('form.task-form');
    const titleInput = taskForm.getByPlaceholder('New task title');
    const addBtn = taskForm.getByRole('button', { name: 'Add task' });

    await titleInput.fill('Proved Heatmap Task');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/tasks') && r.request().method() === 'POST',
      ),
      addBtn.click(),
    ]);

    const provedCard = page.locator('.task-card', {
      hasText: 'Proved Heatmap Task',
    });
    await provedCard.getByRole('combobox').selectOption('done');
    await provedCard.getByRole('button', { name: 'Add proof' }).click();

    const detailDialog = page.locator('dialog.task-detail-dialog');
    await expect(detailDialog).toHaveAttribute('open', '');
    await detailDialog
      .getByPlaceholder('e.g. Pull Request #42')
      .fill('Pull Request #77');
    await detailDialog
      .getByPlaceholder('https://github.com/...')
      .fill('https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/77');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/metrics/heatmap') &&
          r.request().method() === 'GET',
      ),
      detailDialog.getByRole('button', { name: 'Add proof' }).click(),
    ]);
    await detailDialog.getByRole('button', { name: 'Close dialog' }).click();

    // Heatmap grid should render 182 cells and summary text
    const heatmapFigure = page.locator('.proof-heatmap-figure');
    await expect(heatmapFigure).toBeVisible();
    await expect(heatmapFigure.locator('.heatmap-cell')).toHaveCount(182);
    await expect(heatmapFigure).toContainText('1 completed with proof');

    // Keyboard roving navigation inside heatmap grid
    const activeCell = heatmapFigure.locator('.heatmap-cell[tabindex="0"]');
    await activeCell.focus();
    await expect(activeCell).toBeFocused();
    await page.keyboard.press('ArrowLeft');

    const newActiveCell = heatmapFigure.locator('.heatmap-cell[tabindex="0"]');
    await expect(newActiveCell).toBeFocused();
    await expect(heatmapFigure.locator('.heatmap-tooltip')).not.toBeEmpty();

    // Open data table fallback
    await heatmapFigure.getByText('Show data table').click();
    await expect(
      heatmapFigure.locator('.proof-data-table tbody tr'),
    ).toHaveCount(1);

    // Verify zero body overflow at 320px width while heatmap scroll wrap handles horizontal scroll
    await page.setViewportSize({ width: 320, height: 900 });
    const metricsLayout = await page.evaluate(() => {
      const wrap = document.querySelector('.heatmap-scroll-wrap');
      return {
        docScroll: document.documentElement.scrollWidth,
        docClient: document.documentElement.clientWidth,
        wrapScroll: wrap ? wrap.scrollWidth : 0,
        wrapClient: wrap ? wrap.clientWidth : 0,
      };
    });
    expect(metricsLayout.docScroll).toBeLessThanOrEqual(
      metricsLayout.docClient,
    );
    expect(metricsLayout.wrapScroll).toBeGreaterThan(metricsLayout.wrapClient);
  });

  test('RP-01: Proof report /report switches date ranges, enforces print light theme, hides app chrome, prints URLs, and passes axe', async ({
    page,
  }) => {
    await signInUser(page);

    // Seed a completed task with both URL and Note proof
    const taskForm = page.locator('form.task-form');
    await taskForm
      .getByPlaceholder('New task title')
      .fill('Report Evidence Task');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/tasks') && r.request().method() === 'POST',
      ),
      taskForm.getByRole('button', { name: 'Add task' }).click(),
    ]);

    const taskCard = page.locator('.task-card', {
      hasText: 'Report Evidence Task',
    });
    await taskCard.getByRole('combobox').selectOption('done');
    await taskCard.getByRole('button', { name: 'Add proof' }).click();

    const detailDialog = page.locator('dialog.task-detail-dialog');
    await expect(detailDialog).toHaveAttribute('open', '');
    await detailDialog.getByPlaceholder('e.g. Pull Request #42').fill('PR #88');
    await detailDialog
      .getByPlaceholder('https://github.com/...')
      .fill('https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/88');
    await detailDialog.getByRole('button', { name: 'Add proof' }).click();

    await detailDialog.getByRole('radio', { name: 'Note' }).check();
    await detailDialog
      .getByPlaceholder('e.g. Test output log')
      .fill('Smoke test note');
    await detailDialog
      .getByPlaceholder('Paste output or test run results (max 2000 chars)')
      .fill('Verified heatmap SQL boundaries and print preview.');
    await detailDialog.getByRole('button', { name: 'Add proof' }).click();
    await detailDialog.getByRole('button', { name: 'Close dialog' }).click();

    // Navigate to /report via visible Proof report button
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/report') && r.request().method() === 'GET',
      ),
      page.getByRole('button', { name: 'Proof report' }).click(),
    ]);
    await expect(page).toHaveURL(/\/report$/);

    await expect(
      page.getByRole('heading', { name: 'User A', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.report-disclaimer')).toContainText(
      'Proof is attached by the owner.',
    );
    await expect(page.getByText('Report Evidence Task')).toBeVisible();
    await expect(
      page.getByText('Verified heatmap SQL boundaries and print preview.'),
    ).toBeVisible();

    // Switch report window to 90 days
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/report?days=90')),
      page.getByRole('button', { name: '90 days' }).click(),
    ]);

    // Axe accessibility checks on /report in light and dark theme before print emulation
    for (const theme of ['light', 'dark']) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const severe = axeResults.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(severe).toEqual([]);
    }

    // Even when page was toggled to dark mode, emulating print must force paper light theme & hide chrome
    await page.emulateMedia({ media: 'print' });

    const printAudit = await page.evaluate(() => {
      const header = document.querySelector('.app-header');
      const toolbar = document.querySelector('.report-toolbar');
      const link = document.querySelector(
        '.report-evidence-item a.evidence-link',
      );
      const afterContent = link
        ? window.getComputedStyle(link, '::after').content
        : '';
      return {
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyColor: window.getComputedStyle(document.body).color,
        headerDisplay: header ? window.getComputedStyle(header).display : null,
        toolbarDisplay: toolbar
          ? window.getComputedStyle(toolbar).display
          : null,
        afterContent,
      };
    });

    // Paper light background (#fffdf9 = rgb(255, 253, 249)) & ink text (#1c1b18 = rgb(28, 27, 24))
    expect(printAudit.bodyBg).toBe('rgb(255, 253, 249)');
    expect(printAudit.bodyColor).toBe('rgb(28, 27, 24)');
    expect(printAudit.headerDisplay).toBe('none');
    expect(printAudit.toolbarDisplay).toBe('none');
    expect(printAudit.afterContent).toContain(
      'https://github.com/MasRizqi07/Proof-Of-Work-OS/pull/88',
    );

    // Capture visual proof of print preview layout
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'proof-report-print.png'),
      fullPage: true,
    });

    await page.emulateMedia({ media: 'screen' });
  });
});
