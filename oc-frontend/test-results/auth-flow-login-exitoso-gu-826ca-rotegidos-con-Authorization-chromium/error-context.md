# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> login exitoso guarda tokens y consume endpoints protegidos con Authorization
- Location: e2e\auth-flow.spec.ts:21:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Email Address')

```

# Page snapshot

```yaml
- main [ref=e4]:
  - generic [ref=e7]:
    - heading "Inicio de sesión" [level=1] [ref=e8]
    - paragraph [ref=e9]: Ingresa tus credenciales para acceder al portal
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Nombre de Usuario
        - textbox "Nombre de Usuario" [ref=e13]:
          - /placeholder: usuario
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - link "Tengo token de activacion" [ref=e17] [cursor=pointer]:
            - /url: /set-password
        - textbox "Password" [ref=e18]:
          - /placeholder: ••••••••
      - button "Ingresar al portal" [ref=e19] [cursor=pointer]
    - paragraph [ref=e20]:
      - text: ¿Aun no activas tu cuenta?
      - link "Registrate como proveedor" [ref=e21] [cursor=pointer]:
        - /url: /register
      - text: .
  - generic [ref=e22]:
    - generic [ref=e23]: © 2026 Grupo Kong. All rights reserved.
    - navigation [ref=e24]:
      - link "Terms of Service" [ref=e25] [cursor=pointer]:
        - /url: /
      - link "Privacy Policy" [ref=e26] [cursor=pointer]:
        - /url: /
      - link "Contact Support" [ref=e27] [cursor=pointer]:
        - /url: /
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const createJwt = (payload: Record<string, unknown>) => {
  4   |   const base64UrlEncode = (value: string) =>
  5   |     Buffer.from(value, 'utf-8').toString('base64url');
  6   | 
  7   |   return [
  8   |     base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  9   |     base64UrlEncode(JSON.stringify(payload)),
  10  |     'signature'
  11  |   ].join('.');
  12  | };
  13  | 
  14  | test('redirecciona al login cuando una ruta protegida no tiene token', async ({ page }) => {
  15  |   await page.goto('/#/portal');
  16  | 
  17  |   await expect(page).toHaveURL(/#\/login\?redirectTo=%2Fportal/);
  18  |   await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  19  | });
  20  | 
  21  | test('login exitoso guarda tokens y consume endpoints protegidos con Authorization', async ({
  22  |   page
  23  | }) => {
  24  |   await page.route('**/api/v1/auth/login', async (route) => {
  25  |     const body = route.request().postDataJSON();
  26  |     expect(body).toEqual({
  27  |       username: 'proveedor@empresa.com',
  28  |       password: 'Secreta123!'
  29  |     });
  30  | 
  31  |     await route.fulfill({
  32  |       status: 200,
  33  |       contentType: 'application/json',
  34  |       body: JSON.stringify({
  35  |         accessToken: 'test-access-token',
  36  |         refreshToken: 'test-refresh-token',
  37  |         tokenType: 'Bearer'
  38  |       })
  39  |     });
  40  |   });
  41  | 
  42  |   await page.route('**/api/v1/services', async (route) => {
  43  |     expect(route.request().headers()['authorization']).toBe('Bearer test-access-token');
  44  |     await route.fulfill({
  45  |       status: 200,
  46  |       contentType: 'application/json',
  47  |       body: JSON.stringify({
  48  |         message: 'ok',
  49  |         data: [
  50  |           { id: 1, nombre: 'Homologacion' },
  51  |           { id: 2, nombre: 'Auditoria' }
  52  |         ]
  53  |       })
  54  |     });
  55  |   });
  56  | 
  57  |   await page.route('**/api/v1/banks', async (route) => {
  58  |     expect(route.request().headers()['authorization']).toBe('Bearer test-access-token');
  59  |     await route.fulfill({
  60  |       status: 200,
  61  |       contentType: 'application/json',
  62  |       body: JSON.stringify({
  63  |         message: 'ok',
  64  |         data: [
  65  |           { id: 1, banco: 'Banco 1' },
  66  |           { id: 2, banco: 'Banco 2' }
  67  |         ]
  68  |       })
  69  |     });
  70  |   });
  71  | 
  72  |   await page.goto('/#/login');
> 73  |   await page.getByLabel('Email Address').fill('proveedor@empresa.com');
      |                                          ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  74  |   await page.getByLabel('Password').fill('Secreta123!');
  75  |   await page.getByRole('button', { name: 'Login to Portal' }).click();
  76  | 
  77  |   await expect(page).toHaveURL(/#\/portal$/);
  78  |   await expect(page.getByText('2 servicios cargados')).toBeVisible();
  79  |   await expect(page.getByText('2 bancos cargados')).toBeVisible();
  80  | });
  81  | 
  82  | test('login exitoso redirecciona al panel de proveedor cuando el token tiene rol PROVEEDOR', async ({
  83  |   page
  84  | }) => {
  85  |   await page.route('**/api/v1/auth/login', async (route) => {
  86  |     await route.fulfill({
  87  |       status: 200,
  88  |       contentType: 'application/json',
  89  |       body: JSON.stringify({
  90  |         accessToken: createJwt({
  91  |           sub: 'proveedor-1',
  92  |           email: 'proveedor@empresa.com',
  93  |           roles: ['PROVEEDOR']
  94  |         }),
  95  |         refreshToken: 'test-refresh-token',
  96  |         tokenType: 'Bearer'
  97  |       })
  98  |     });
  99  |   });
  100 | 
  101 |   await page.goto('/#/login');
  102 |   await page.getByLabel('Email Address').fill('proveedor@empresa.com');
  103 |   await page.getByLabel('Password').fill('Secreta123!');
  104 |   await page.getByRole('button', { name: 'Login to Portal' }).click();
  105 | 
  106 |   await expect(page).toHaveURL(/#\/portal\/proveedor$/);
  107 |   await expect(page.getByText('provider-home works!')).toBeVisible();
  108 | });
  109 | 
  110 | test('cambio de contraseña y reenvio de activacion consumen los endpoints del flujo', async ({
  111 |   page
  112 | }) => {
  113 |   await page.route('**/activation/resend', async (route) => {
  114 |     const body = route.request().postDataJSON();
  115 |     expect(body).toEqual({ email: 'contacto@empresa.com' });
  116 | 
  117 |     await route.fulfill({
  118 |       status: 200,
  119 |       contentType: 'application/json',
  120 |       body: JSON.stringify({ message: 'Email de activación reenviado' })
  121 |     });
  122 |   });
  123 | 
  124 |   await page.route('**/set-password', async (route) => {
  125 |     const body = route.request().postDataJSON();
  126 |     expect(body).toEqual({
  127 |       token: 'token-prueba',
  128 |       newPassword: 'NuevaClave123!'
  129 |     });
  130 | 
  131 |     await route.fulfill({
  132 |       status: 200,
  133 |       contentType: 'application/json',
  134 |       body: JSON.stringify({ message: 'Contraseña establecida y usuario activado' })
  135 |     });
  136 |   });
  137 | 
  138 |   await page.goto('/#/set-password?token=token-prueba');
  139 |   await page.getByLabel('Correo del proveedor').fill('contacto@empresa.com');
  140 |   await page.getByRole('button', { name: 'Reenviar activacion' }).click();
  141 |   await expect(page.getByText('Email de activación reenviado')).toBeVisible();
  142 | 
  143 |   await page.getByLabel('Nueva contraseña').fill('NuevaClave123!');
  144 |   await page.getByLabel('Confirmar contraseña').fill('NuevaClave123!');
  145 |   await page.getByRole('button', { name: 'Activar cuenta' }).click();
  146 | 
  147 |   await expect(page.getByText('Contraseña establecida y usuario activado')).toBeVisible();
  148 |   await expect(page).toHaveURL(/#\/login$/);
  149 | });
  150 | 
```