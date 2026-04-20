# Flujo completo de registro y activación de proveedores (actualizado)

Este documento explica paso a paso cómo replicar el flujo completo que implementamos (versión actual):
- Registro del proveedor con `/api/v1/suppliers/form` (crea Supplier, Contact, cuentas y usuario INACTIVO)
- Generación y persistencia segura del token de activación (solo hash en BD)
- Envío del email con enlace de activación (por Gmail SMTP usando JavaMailSender)
- Validación del token (GET `/activate?token=...`) y redirección segura al frontend (token en fragment)
- Establecimiento de contraseña (POST `/set-password`) y activación del usuario
- Login normal (POST `/api/v1/auth/login`)
- Reenvío de token (POST `/activation/resend`)

Todo lo descrito asume que estás trabajando en Windows PowerShell y el proyecto está en `C:\Users\Usuario\Documents\oc`.

---

Resumen rápido (qué cambió desde la versión previa)
- Ya no usamos SendGrid; el envío se hace por Gmail (Spring `JavaMailSender`).
- El backend guarda SOLO el `token_hash` (SHA-256) en BD; el `token` en claro se envía por correo.
- Añadido endpoint dev (perfil `dev`): `GET /dev/activation/token-by-email?email=...` que devuelve `token` en claro para pruebas locales.
- `/activate` valida token y 302-redirige a la SPA con el token en el fragment: `http://127.0.0.1:4200/#/set-password?token=...`.
- El endpoint de registro ahora responde con un mensaje de estado (p. ej. "Registro recibido. Email de activación enviado ...") y `userId`.

---

## 1. Requisitos previos

- Java 21 instalado (java -version)
- Maven (se usa el wrapper `mvnw` incluido)
- Base de datos SQL Server accesible y configurada en `src/main/resources/application.yaml` o variables de entorno
- Cuenta Gmail con App Password (recomendada) para SMTP
- Frontend de pruebas: Angular en `http://127.0.0.1:4200` (por defecto el backend redirige ahí)

Variables de entorno relevantes (ejemplo PowerShell):

```powershell
setx SPRING_MAIL_USERNAME "tu@gmail.com"
setx SPRING_MAIL_PASSWORD "TU_APP_PASSWORD"
setx APP_FRONTEND_BASE_URL "http://127.0.0.1:4200"
```

> No metas credenciales en VCS. Usa App Passwords o un Secret Manager en producción.

---

## 2. Configuración SMTP (Gmail)

Ejemplo mínimo en `application.yaml`:

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${SPRING_MAIL_USERNAME}
    password: ${SPRING_MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

app:
  frontend-base-url: http://127.0.0.1:4200
  email:
    from: ${SPRING_MAIL_USERNAME}
  activation:
    expiration-hours: 24
```

Con esto el servicio `EmailService` usa `JavaMailSender` para enviar el correo HTML de activación.

---

## 3. Levantar la aplicación

Desde la carpeta del proyecto:

```powershell
# Compilar
.\mvnw -DskipTests package

# Ejecutar la app
.\mvnw spring-boot:run

# O ejecutar el jar
java -jar target\oc-0.0.1-SNAPSHOT.jar
```

Confirma en logs que el perfil activo es `dev` (si corresponde) y que la app arrancó sin errores.

---

## 4. Datos necesarios (servicios y bancos)

Crea al menos un servicio y un banco en la BD (SQL). Por ejemplo:

```sql
INSERT INTO servicios (nombre) VALUES ('SERVICIO_PRINCIPAL');
INSERT INTO bancos (banco) VALUES ('BANCO_TEST');
```

---

## 5. Registrar proveedor (payload de ejemplo)

Archivo `payload.json` (ajusta ids de `services` y `bank`):

```json
{
  "ruc":"20123387326",
  "razon_social":"TEMPANO S.A.C.",
  "services":[1,21,22],
  "nombre_contacto":"Francisco",
  "apellido_p_contacto":"Delgado",
  "apellido_m_contacto":"Ramirez",
  "telefono_contacto":"938839299",
  "correo_pedidos":"fdelgado@tempano.net",
  "bank":3,
  "accountType":"CUENTA_CORRIENTE",
  "accountNumber_Soles":"193-0072492-0-41",
  "cci_soles":"002-193-000072492041-18",
  "accountNumber_Dolares":"193-1044644-1-68",
  "cci_dolares":"002-193-001044644168-14",
  "is_detraccion":true,
  "accountNumber_Detraccion":"0000547417",
  "correo_constancia":"ecordova@tempano.net",
  "creditDays":21
}
```

Enviar la petición (PowerShell):

```powershell
$body = Get-Content .\payload.json -Raw
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/suppliers/form -Body $body -ContentType 'application/json'
```

Respuesta actual:

```json
{
  "message": "Registro recibido. Email de activación enviado (o en cola). Revise su correo o la carpeta de spam.",
  "userId": 1
}
```

En paralelo el backend crea `Supplier`, `Contacts`, `CuentasBancarias`, crea `User` con `enabled=false`, y genera un `ActivationToken` (se guarda `token_hash` en BD). El servicio publica un evento para enviar correo y, en `dev`, también almacena el tokenPlain en memory para pruebas.

---

## 6. Obtener el tokenPlain (usar token en claro, NO el token_hash)

Opciones:

- Opción 1 (correo): abre el correo que recibiste; el enlace contiene `token=TOKEN_PLAIN`.

- Opción 2 (dev): endpoint adicional sólo en perfil `dev`:

```bash
curl "http://localhost:8080/dev/activation/token-by-email?email=fdelgado@tempano.net"
# Respuesta: { "token": "TOKEN_PLAIN" }
```

- Opción 3 (reenvío): `POST /activation/resend` y revisar correo o logs.

> Importante: la columna en BD `token_hash` almacena SHA-256(tokenPlain). No pases `token_hash` a `/activate` — el endpoint espera el token en claro.

---

## 7. Activación: validar y redirigir

Abrir en el navegador (recomendado):

```
http://localhost:8080/activate?token=TOKEN_PLAIN
```

Comportamiento:
- Backend valida token (hash comparison, expiry, used flag).
- Si es válido, responde con 302 redirect a:

```
http://127.0.0.1:4200/#/set-password?token=TOKEN_PLAIN
```

Nota: el token aparece en el fragment (`#`) para evitar leaks vía Referer.

Si prefieres no seguir la redirección en Postman, desactiva "Follow Redirects" y copia manualmente el header `Location`.

---

## 8. Establecer contraseña (POST `/set-password`)

Desde SPA o por curl:

```bash
curl -X POST http://localhost:8080/set-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_PLAIN","newPassword":"MiPassSegura123!"}'
```

Respuesta esperada:

```json
{ "message": "Contraseña establecida y usuario activado" }
```

Resultado: `user.enabled = true`, contraseña guardada con BCrypt, `activation_token.used = true`.

---

## 9. Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"fdelgado@tempano.net","password":"MiPassSegura123!"}'
```

Recibirás `accessToken` y `refreshToken` según la implementación de auth.

---

## 10. Reenvío de token (`POST /activation/resend`)

Cuerpo: `{ "email": "fdelgado@tempano.net" }`

- Cooldown por defecto: 10 minutos (configurado en código).
- Marca tokens previos no usados como `used=true` y crea uno nuevo.

Ejemplo:

```powershell
$body = @{ email = 'fdelgado@tempano.net' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8080/activation/resend -Body $body -ContentType 'application/json'
```

---

## 11. Verificación en BD (si necesitas confirmar)

```sql
SELECT id, username, enabled FROM users WHERE username = 'fdelgado@tempano.net';

SELECT id, token_hash, created_at, expiry_date, used, attempts
FROM activation_tokens
WHERE user_id = (SELECT id FROM users WHERE username = 'fdelgado@tempano.net')
ORDER BY created_at DESC;
```

Recuerda: `token_hash` es SHA-256; no lo uses para `/activate`.

---

## 12. Troubleshooting rápido

- 401 al abrir `/activate`: asegúrate de reiniciar la app luego de cambios de seguridad; ahora `/activate` es público.
- `ECONNREFUSED ::1:4200` en Postman: usa el navegador o configura `app.frontend-base-url` a `http://127.0.0.1:4200` (ya está configurado). Alternativamente, en Postman desactiva "Follow Redirects" y abre Location manualmente en el navegador.
- Email no llega: revisa logs del backend (`EmailService` registrará envío o excepción) y verifica `spring.mail.username` y `spring.mail.password` (App Password).
- Token inválido: usa tokenPlain (no token_hash), confirma `expiry_date` y `used=false`.

---

## 13. Seguridad y recomendaciones finales

- TLS obligatorio en producción (https).
- No exponer el endpoint dev fuera de `dev`.
- Guardar sólo hash del token en la BD (ya implementado).
- Evitar logs con tokenPlain en producción (solo DEBUG en dev).
- Rotar y proteger credenciales SMTP (usar vault/secret manager).

---

Si quieres, puedo:
- Generar una colección Postman con todos los requests listos.
- Añadir un `POST /mail/test` para comprobar SMTP desde la app.
- Exponer `RESEND_COOLDOWN_MINUTES` como propiedad configurable.

Dime qué prefieres y continúo.
