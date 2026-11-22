const { cleanDatabase } = require('../server/integration/helpers');

const USER_A_EMAIL = 'user-a@example.com';
const USER_A_NAME = 'User A';

async function setupAuthMock(page) {
  // Mock Supabase auth password grant
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    const body = {
      access_token: 'user-a',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token-user-a',
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        aud: 'authenticated',
        role: 'authenticated',
        email: USER_A_EMAIL,
        user_metadata: {
          full_name: USER_A_NAME,
        },
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // Mock Supabase session user fetch
  await page.route('**/auth/v1/user', async (route) => {
    const body = {
      id: '11111111-1111-4111-8111-111111111111',
      aud: 'authenticated',
      role: 'authenticated',
      email: USER_A_EMAIL,
      user_metadata: {
        full_name: USER_A_NAME,
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // Mock Supabase sign-out
  await page.route('**/auth/v1/logout', async (route) => {
    await route.fulfill({ status: 204 });
  });
}

async function resetTestDb() {
  try {
    await cleanDatabase();
  } catch (err) {
    console.warn('Warning: Could not clean test database:', err.message);
  }
}

async function signInUser(page) {
  await setupAuthMock(page);
  await page.goto('/');

  const emailInput = page.getByRole('textbox', { name: 'Email' });
  const passwordInput = page.locator('input[type="password"]');
  const signInButton = page.getByRole('button', { name: 'Sign in' });

  await emailInput.fill(USER_A_EMAIL);
  await passwordInput.fill('password123');
  await signInButton.click();

  await page.waitForSelector('.user-name', { timeout: 10000 });
  await page.getByRole('button', { name: 'Sign out' }).waitFor();
}

module.exports = {
  USER_A_EMAIL,
  USER_A_NAME,
  setupAuthMock,
  signInUser,
  resetTestDb,
};
