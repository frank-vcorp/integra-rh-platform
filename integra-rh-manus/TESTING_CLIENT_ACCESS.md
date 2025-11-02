# 🧪 Guía de Prueba: Sistema de Enlaces Únicos para Clientes

Esta guía explica cómo probar el sistema de acceso mediante enlaces únicos para clientes empresariales.

---

## 📋 Resumen del Sistema

El sistema de enlaces únicos permite que los clientes empresariales accedan a su portal sin necesidad de contraseñas. Simplemente reciben un enlace por email que les da acceso directo a su dashboard.

**Características:**
- ✅ Sin contraseñas (acceso mediante token único)
- ✅ Tokens seguros de 64 caracteres hexadecimales
- ✅ Expiración automática después de 30 días
- ✅ Seguimiento de último uso
- ✅ Posibilidad de invalidar tokens individualmente o todos los de un cliente

---

## 🚀 Método 1: Generar Token con Script de Prueba

### Paso 1: Ejecutar el script

```bash
cd /home/ubuntu/integra-rh
pnpm exec tsx scripts/test-client-token.ts
```

### Paso 2: Copiar el enlace generado

El script mostrará algo como:

```
🔗 ENLACE DE ACCESO:
   https://3000-i0pf9h5ekofypiaphazkp-8317efc8.manusvm.computer/cliente/d5f888f3c618af34be7667cbc718d69df8cd45f6d4fdd037e23fc30e33ce5e59
```

### Paso 3: Abrir el enlace en tu navegador

Copia y pega el enlace en tu navegador. Deberías ver:
- ✅ Validación del token
- ✅ Redirección al dashboard del cliente
- ✅ Menú filtrado según el rol de cliente

---

## 🛠️ Método 2: Usar la Interfaz de Administración (Próximamente)

Una vez implementado el botón "Reenviar enlace", podrás:

1. Ir a la página de **Procesos**
2. Buscar el proceso del cliente
3. Hacer clic en **"Enviar Enlace de Acceso"**
4. El sistema enviará automáticamente el email con el enlace

---

## 🔍 Verificar el Token en la Base de Datos

### Consultar tokens activos:

```sql
SELECT * FROM clientAccessTokens WHERE expiresAt > NOW();
```

### Ver tokens de un cliente específico:

```sql
SELECT * FROM clientAccessTokens WHERE clientId = 30001;
```

### Ver información completa:

```sql
SELECT 
  cat.token,
  cat.createdAt,
  cat.expiresAt,
  cat.lastUsedAt,
  c.nombreEmpresa,
  c.email
FROM clientAccessTokens cat
JOIN clients c ON cat.clientId = c.id
WHERE cat.expiresAt > NOW();
```

---

## 📊 Estructura de la Tabla `clientAccessTokens`

```sql
CREATE TABLE clientAccessTokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clientId INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NOT NULL,
  lastUsedAt TIMESTAMP NULL
);
```

**Campos:**
- `id`: Identificador único del registro
- `clientId`: Referencia al cliente (tabla `clients`)
- `token`: Token único de 64 caracteres hexadecimales
- `createdAt`: Fecha de creación del token
- `expiresAt`: Fecha de expiración (30 días desde creación)
- `lastUsedAt`: Última vez que se usó el token (se actualiza en cada acceso)

---

## 🔐 Funciones Disponibles en el Backend

### `generateClientAccessToken(clientId: number): Promise<string>`
Genera un nuevo token de acceso para un cliente.

```typescript
const token = await generateClientAccessToken(30001);
// Retorna: "d5f888f3c618af34be7667cbc718d69df8cd45f6d4fdd037e23fc30e33ce5e59"
```

### `validateClientAccessToken(token: string): Promise<number | null>`
Valida un token y retorna el clientId si es válido.

```typescript
const clientId = await validateClientAccessToken(token);
if (clientId) {
  console.log(`Token válido para cliente ${clientId}`);
} else {
  console.log("Token inválido o expirado");
}
```

### `invalidateClientAccessToken(token: string): Promise<void>`
Invalida (elimina) un token específico.

```typescript
await invalidateClientAccessToken(token);
```

### `invalidateAllClientTokens(clientId: number): Promise<void>`
Invalida todos los tokens de un cliente.

```typescript
await invalidateAllClientTokens(30001);
```

### `getActiveClientTokens(clientId: number)`
Obtiene todos los tokens activos de un cliente.

```typescript
const tokens = await getActiveClientTokens(30001);
console.log(`El cliente tiene ${tokens.length} tokens activos`);
```

---

## 🧩 Integración con tRPC

### Router `clientAccess`

```typescript
// Validar token
const result = await trpc.clientAccess.validateToken.query({ token });

// Obtener datos del cliente
const clientData = await trpc.clientAccess.getClientData.query({ clientId });
```

---

## ✉️ Envío de Email con SendGrid

El sistema incluye una plantilla de email profesional que se envía automáticamente:

**Template:** `sendClientAccessLink`

**Variables:**
- `{{clientName}}`: Nombre de la empresa cliente
- `{{accessLink}}`: Enlace único de acceso
- `{{expirationDays}}`: Días hasta la expiración (30)

**Función:**
```typescript
await sendClientAccessLink(
  clientEmail,
  clientName,
  accessUrl
);
```

---

## 🎯 Flujo Completo de Uso

### Para el Administrador (Paula):

1. Crear un proceso de evaluación
2. El sistema genera automáticamente un token
3. El sistema envía el email con el enlace al cliente
4. (Opcional) Reenviar el enlace si el cliente lo pierde

### Para el Cliente Empresarial:

1. Recibir email con el enlace de acceso
2. Hacer clic en el enlace
3. Acceder automáticamente al dashboard
4. Ver solo sus candidatos y procesos
5. El enlace es válido por 30 días

---

## ⚠️ Consideraciones de Seguridad

- ✅ Los tokens son de 64 caracteres hexadecimales (256 bits de entropía)
- ✅ Los tokens expiran automáticamente después de 30 días
- ✅ Se registra el último uso de cada token
- ✅ Los tokens pueden ser invalidados manualmente
- ✅ Un cliente puede tener múltiples tokens activos simultáneamente
- ⚠️ Los enlaces deben enviarse solo por email seguro
- ⚠️ No compartir enlaces públicamente

---

## 🐛 Solución de Problemas

### El token no funciona:
1. Verificar que no haya expirado: `SELECT * FROM clientAccessTokens WHERE token = 'xxx'`
2. Verificar que el cliente existe: `SELECT * FROM clients WHERE id = xxx`
3. Revisar logs del servidor para errores de validación

### El email no se envía:
1. Verificar configuración de SendGrid en variables de entorno
2. Verificar que el template `sendClientAccessLink` existe en SendGrid
3. Revisar logs del servidor para errores de SendGrid

### El dashboard no filtra correctamente:
1. Verificar que el token se validó correctamente
2. Verificar que el `clientId` se está pasando al dashboard
3. Revisar la lógica de filtrado en las queries de tRPC

---

## 📝 Próximos Pasos

- [ ] Implementar dashboard filtrado por cliente
- [ ] Agregar botón "Reenviar enlace" en panel de admin
- [ ] Integrar validación de token con DashboardLayout
- [ ] Agregar página de "Token expirado" con opción de solicitar nuevo enlace
- [ ] Implementar notificaciones cuando un token está por expirar

---

## 📞 Soporte

Para más información o problemas, contactar al equipo de desarrollo.
