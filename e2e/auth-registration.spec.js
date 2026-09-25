import { test, expect } from './fixtures/test';
import { mockJson, mockSequence } from './fixtures/api';

const VALID_FORM = {
  username: 'new-user',
  email: 'new-user@example.com',
  password: 'correct-horse',
  passwordConfirmation: 'correct-horse',
};

const fillRegisterForm = async (page, overrides = {}) => {
  const values = { ...VALID_FORM, ...overrides };

  await page.locator('#username').fill(values.username);
  await page.locator('#email').fill(values.email);
  await page.locator('#password').fill(values.password);
  await page.locator('#passwordConfirmation').fill(values.passwordConfirmation);
  await page.locator('#acceptTerms').check();
};

test('a visitor can register and is sent to the login page', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/register',
    status: 201,
    requestBody: { username: VALID_FORM.username, email: VALID_FORM.email },
    body: {},
  });

  await page.goto('/register');
  await fillRegisterForm(page);
  await page.getByRole('button', { name: 'Register Account' }).click();

  await expect(page.getByRole('alert')).toHaveText(/Registration successful/);
  // The page holds the success alert for 1.5s before handing over to login.
  await expect(page).toHaveURL(/\/login$/, { timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('registration validation runs in the browser before calling the API', async ({
  guestPage: page,
}) => {
  const register = await mockSequence(page, {
    method: 'POST',
    path: '/auth/register',
    responses: [{ status: 201, body: {} }],
  });

  await page.goto('/register');

  await fillRegisterForm(page, { password: 'short7c', passwordConfirmation: 'short7c' });
  await page.getByRole('button', { name: 'Register Account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Password must be at least 8 characters.');

  await fillRegisterForm(page, { password: 'correct-horse', passwordConfirmation: 'different' });
  await page.getByRole('button', { name: 'Register Account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');

  expect(register.calls, 'no invalid form was ever submitted').toBe(0);
});

test('the browser blocks a malformed email before the form is submitted', async ({
  guestPage: page,
}) => {
  const register = await mockSequence(page, {
    method: 'POST',
    path: '/auth/register',
    responses: [{ status: 201, body: {} }],
  });

  await page.goto('/register');
  await fillRegisterForm(page, { email: 'not-an-email' });

  // The email field is type="email" required, so native constraint validation
  // stops the submit before the app's own validator ever runs.
  await expect(page.locator('#email')).toHaveJSProperty('validity.typeMismatch', true);

  await page.getByRole('button', { name: 'Register Account' }).click();

  expect(register.calls, 'nothing was submitted').toBe(0);
  await expect(page).toHaveURL(/\/register$/);
});

test('registration surfaces the first API validation error', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/register',
    status: 422,
    body: {
      detail: [
        { loc: ['body', 'email'], msg: 'Email already registered' },
        { loc: ['body', 'username'], msg: 'Username already taken' },
      ],
    },
  });

  await page.goto('/register');
  await fillRegisterForm(page);
  await page.getByRole('button', { name: 'Register Account' }).click();

  // getApiError collapses a FastAPI detail array to the first message rather
  // than stacking every field error on this inline alert.
  await expect(page.getByRole('alert')).toHaveText('Email already registered');
  await expect(page).toHaveURL(/\/register$/);
});

test('a visitor can request a password reset link', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/password-reset/request',
    requestBody: { email: 'test@example.com' },
    body: {},
  });

  await page.goto('/forgot-password');
  await page.locator('#email').fill('test@example.com');
  await page.getByRole('button', { name: 'Send Reset Link' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Password reset instructions have been sent to your email.'
  );
  // The form clears itself so the same link cannot be requested twice by
  // accident.
  await expect(page.locator('#email')).toHaveValue('');
});

test('a reset link without a token cannot be submitted', async ({ guestPage: page }) => {
  const confirm = await mockSequence(page, {
    method: 'POST',
    path: '/auth/password-reset/confirm',
    responses: [{ status: 200, body: {} }],
  });

  await page.goto('/reset-password');

  await expect(page.getByRole('alert')).toContainText('No valid reset token found');
  await expect(page.getByRole('button', { name: 'Reset Password' })).toBeDisabled();
  await expect(page.locator('#password')).toBeDisabled();
  expect(confirm.calls).toBe(0);
});

test('a visitor can set a new password from a reset link', async ({ guestPage: page }) => {
  await mockJson(page, {
    method: 'POST',
    path: '/auth/password-reset/confirm',
    requestBody: { token: 'reset-token', new_password: 'brand-new-secret' },
    body: { detail: 'Password updated' },
  });

  await page.goto('/reset-password?token=reset-token');
  await page.locator('#password').fill('brand-new-secret');
  await page.locator('#confirmPassword').fill('brand-new-secret');
  await page.getByRole('button', { name: 'Reset Password' }).click();

  // The backend's own detail wins over the generic copy.
  await expect(page.getByRole('alert')).toHaveText('Password updated');
  await expect(page).toHaveURL(/\/login$/, { timeout: 5000 });
});

test('mismatched reset passwords are rejected before calling the API', async ({
  guestPage: page,
}) => {
  const confirm = await mockSequence(page, {
    method: 'POST',
    path: '/auth/password-reset/confirm',
    responses: [{ status: 200, body: {} }],
  });

  await page.goto('/reset-password?token=reset-token');
  await page.locator('#password').fill('brand-new-secret');
  await page.locator('#confirmPassword').fill('something-else');
  await page.getByRole('button', { name: 'Reset Password' }).click();

  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');
  expect(confirm.calls).toBe(0);
});
