import { test, expect, type Page } from '@playwright/test';

// Explicit Auth API fixtures: these tests never create remote users or send mail.
const email = 'signup-fixture@example.invalid';
const password = 'Fixture-password-123';
type AuthCall = { path: string; body: Record<string, string> };

async function submitSignup(page: Page) {
  await page.goto('/cadastro');
  await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Teste de cadastro');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
}

test('signup without a session explicitly requests an OTP before confirming delivery', async ({ page }) => {
  const calls: AuthCall[] = [];
  let releaseDelivery!: () => void;
  const deliveryPending = new Promise<void>(resolve => { releaseDelivery = resolve; });
  await page.route('**/api/auth/**', async route => {
    const path = new URL(route.request().url()).pathname;
    calls.push({ path, body: route.request().postDataJSON() });
    if (path === '/api/auth/sign-up/email') {
      await route.fulfill({ json: { user: { id: 'fixture-user' }, token: null } });
    } else if (path === '/api/auth/email-otp/send-verification-otp') {
      await deliveryPending;
      await route.fulfill({ json: { success: true } });
    } else {
      await route.fulfill({ status: 500, json: { code: 'UNEXPECTED_AUTH_REQUEST' } });
    }
  });

  try {
    await submitSignup(page);
    await expect(page.getByRole('textbox', { name: 'Código de 6 dígitos' })).toBeVisible();
    await expect.poll(() => calls.length).toBe(2);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reenviar código' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Corrigir meus dados' })).toBeDisabled();
    expect(calls).toEqual([
      { path: '/api/auth/sign-up/email', body: { email, password, name: 'Teste de cadastro' } },
      { path: '/api/auth/email-otp/send-verification-otp', body: { email, type: 'email-verification' } },
    ]);
  } finally {
    releaseDelivery();
  }
  await expect(page.getByRole('status')).toHaveText('Enviamos um código de 6 dígitos para seu e-mail. Digite-o abaixo para ativar sua conta.');
  await expect(page.getByRole('button', { name: 'Confirmar e-mail' })).toBeEnabled();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0);
});

test('failed initial OTP delivery retains verification and can recover through resend and verification', async ({ page }) => {
  const calls: AuthCall[] = [];
  let sendAttempts = 0;
  let verifyAttempts = 0;
  await page.route('**/api/auth/**', async route => {
    const path = new URL(route.request().url()).pathname;
    calls.push({ path, body: route.request().postDataJSON() });
    if (path === '/api/auth/sign-up/email') {
      await route.fulfill({ json: { user: { id: 'fixture-user' }, token: null } });
    } else if (path === '/api/auth/email-otp/send-verification-otp') {
      sendAttempts++;
      await route.fulfill(sendAttempts === 1
        ? { status: 503, json: { code: 'EMAIL_DELIVERY_FAILED' } }
        : { json: { success: true } });
    } else if (path === '/api/auth/email-otp/verify-email') {
      verifyAttempts++;
      await route.fulfill(verifyAttempts === 1
        ? { status: 400, json: { code: 'INVALID_OTP' } }
        : { json: { status: true, user: { id: 'fixture-user', emailVerified: true } } });
    } else {
      await route.fulfill({ status: 500, json: { code: 'UNEXPECTED_AUTH_REQUEST' } });
    }
  });

  await submitSignup(page);
  await expect(page.getByRole('alert')).toHaveText('Sua conta foi criada, mas não foi possível enviar o código. Use Reenviar código para tentar novamente.');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Criar conta', exact: true })).toHaveCount(0);
  const codeInput = page.getByRole('textbox', { name: 'Código de 6 dígitos' });
  await expect(codeInput).toBeVisible();
  await codeInput.fill('111111');
  await page.getByRole('button', { name: 'Reenviar código', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Novo código solicitado. Utilize apenas o código de 6 dígitos do e-mail mais recente.');
  await expect(codeInput).toHaveValue('');

  await codeInput.fill('222222');
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click();
  await expect(page.getByRole('alert')).toContainText('Código incorreto ou expirado.');
  await expect(codeInput).toBeVisible();
  await codeInput.fill('333333');
  await page.getByRole('button', { name: 'Confirmar e-mail' }).click();
  await expect(page).toHaveURL(/\/login\?verified=1$/);
  expect(calls.map(call => call.path)).toEqual([
    '/api/auth/sign-up/email',
    '/api/auth/email-otp/send-verification-otp',
    '/api/auth/email-otp/send-verification-otp',
    '/api/auth/email-otp/verify-email',
    '/api/auth/email-otp/verify-email',
  ]);
  expect(calls.slice(1, 3).map(call => call.body)).toEqual([
    { email, type: 'email-verification' },
    { email, type: 'email-verification' },
  ]);
  expect(calls.slice(3).map(call => call.body)).toEqual([
    { email, otp: '222222' },
    { email, otp: '333333' },
  ]);
});
