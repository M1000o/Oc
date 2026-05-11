import { expect, test } from '@playwright/test';

const createJwt = (payload: Record<string, unknown>) => {
  const base64UrlEncode = (value: string) =>
    Buffer.from(value, 'utf-8').toString('base64url');

  return [
    base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    base64UrlEncode(JSON.stringify(payload)),
    'signature'
  ].join('.');
};

test('redirecciona al login cuando una ruta protegida no tiene token', async ({ page }) => {
  await page.goto('/portal');

  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fportal$/);
  await expect(page.getByRole('heading', { name: 'Inicio de sesión' })).toBeVisible();
});

test('redirecciona al login cuando una ruta invalida no tiene token', async ({ page }) => {
  await page.goto('/ruta-invalida');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Inicio de sesión' })).toBeVisible();
});

test('redirecciona al portal cuando una ruta invalida tiene sesion activa', async ({ page }) => {
  await page.addInitScript(({ accessTokenKey, refreshTokenKey, accessToken, refreshToken }) => {
    window.localStorage.setItem(accessTokenKey, accessToken);
    window.localStorage.setItem(refreshTokenKey, refreshToken);
  }, {
    accessTokenKey: 'oc.accessToken',
    refreshTokenKey: 'oc.refreshToken',
    accessToken: createJwt({
      sub: 'comprador-1',
      email: 'comprador@empresa.com',
      roles: ['COMPRADOR']
    }),
    refreshToken: 'test-refresh-token'
  });

  await page.goto('/ruta-invalida');

  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Empieza tu pedido' })).toBeVisible();
});

test('redirecciona al portal cuando un usuario autenticado intenta abrir login', async ({
  page
}) => {
  await page.addInitScript(({ accessTokenKey, refreshTokenKey, accessToken, refreshToken }) => {
    window.localStorage.setItem(accessTokenKey, accessToken);
    window.localStorage.setItem(refreshTokenKey, refreshToken);
  }, {
    accessTokenKey: 'oc.accessToken',
    refreshTokenKey: 'oc.refreshToken',
    accessToken: createJwt({
      sub: 'comprador-1',
      email: 'comprador@empresa.com',
      roles: ['COMPRADOR']
    }),
    refreshToken: 'test-refresh-token'
  });

  await page.goto('/login');

  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Empieza tu pedido' })).toBeVisible();
});

test('login exitoso guarda tokens y redirecciona al portal', async ({
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

  await page.goto('/login');
  await page.getByLabel('Nombre de Usuario').fill('proveedor@empresa.com');
  await page.getByLabel('Password').fill('Secreta123!');
  await page.getByRole('button', { name: 'Ingresar al portal' }).click();

  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Empieza tu pedido' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        accessToken: window.localStorage.getItem('oc.accessToken'),
        refreshToken: window.localStorage.getItem('oc.refreshToken')
      }))
    )
    .toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token'
    });
});

test('login exitoso redirecciona al panel de proveedor cuando el token tiene rol PROVEEDOR', async ({
  page
}) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: createJwt({
          sub: 'proveedor-1',
          email: 'proveedor@empresa.com',
          roles: ['PROVEEDOR']
        }),
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer'
      })
    });
  });

  await page.goto('/login');
  await page.getByLabel('Nombre de Usuario').fill('proveedor@empresa.com');
  await page.getByLabel('Password').fill('Secreta123!');
  await page.getByRole('button', { name: 'Ingresar al portal' }).click();

  await expect(page).toHaveURL(/\/portal\/proveedor$/);
  await expect(page.getByText('provider-home works!')).toBeVisible();
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

  await page.goto('/set-password?token=token-prueba');
  await page.getByLabel('Correo del proveedor').fill('contacto@empresa.com');
  await page.getByRole('button', { name: 'Reenviar activacion' }).click();
  await expect(page.getByText('Email de activación reenviado')).toBeVisible();

  await page.getByLabel('Nueva contraseña').fill('NuevaClave123!');
  await page.getByLabel('Confirmar contraseña').fill('NuevaClave123!');
  await page.getByRole('button', { name: 'Activar cuenta' }).click();

  await expect(page.getByText('Contraseña establecida y usuario activado')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
