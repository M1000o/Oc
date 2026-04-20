import { expect, test } from '@playwright/test';

test('redirecciona al login cuando una ruta protegida no tiene token', async ({ page }) => {
  await page.goto('/#/portal');

  await expect(page).toHaveURL(/#\/login\?redirectTo=%2Fportal/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('login exitoso guarda tokens y consume endpoints protegidos con Authorization', async ({
  page
}) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      username: 'proveedor@empresa.com',
      password: 'Secreta123!'
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer'
      })
    });
  });

  await page.route('**/api/v1/services', async (route) => {
    expect(route.request().headers()['authorization']).toBe('Bearer test-access-token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'ok',
        data: [
          { id: 1, nombre: 'Homologacion' },
          { id: 2, nombre: 'Auditoria' }
        ]
      })
    });
  });

  await page.route('**/api/v1/banks', async (route) => {
    expect(route.request().headers()['authorization']).toBe('Bearer test-access-token');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'ok',
        data: [
          { id: 1, banco: 'Banco 1' },
          { id: 2, banco: 'Banco 2' }
        ]
      })
    });
  });

  await page.goto('/#/login');
  await page.getByLabel('Email Address').fill('proveedor@empresa.com');
  await page.getByLabel('Password').fill('Secreta123!');
  await page.getByRole('button', { name: 'Login to Portal' }).click();

  await expect(page).toHaveURL(/#\/portal$/);
  await expect(page.getByText('2 servicios cargados')).toBeVisible();
  await expect(page.getByText('2 bancos cargados')).toBeVisible();
});

test('cambio de contraseña y reenvio de activacion consumen los endpoints del flujo', async ({
  page
}) => {
  await page.route('**/activation/resend', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ email: 'contacto@empresa.com' });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email de activación reenviado' })
    });
  });

  await page.route('**/set-password', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      token: 'token-prueba',
      newPassword: 'NuevaClave123!'
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Contraseña establecida y usuario activado' })
    });
  });

  await page.goto('/#/set-password?token=token-prueba');
  await page.getByLabel('Correo del proveedor').fill('contacto@empresa.com');
  await page.getByRole('button', { name: 'Reenviar activacion' }).click();
  await expect(page.getByText('Email de activación reenviado')).toBeVisible();

  await page.getByLabel('Nueva contraseña').fill('NuevaClave123!');
  await page.getByLabel('Confirmar contraseña').fill('NuevaClave123!');
  await page.getByRole('button', { name: 'Activar cuenta' }).click();

  await expect(page.getByText('Contraseña establecida y usuario activado')).toBeVisible();
  await expect(page).toHaveURL(/#\/login$/);
});
