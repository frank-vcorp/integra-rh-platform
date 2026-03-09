# 🔄 Session Persistence en Desarrollo (9 marzo 2026)

## 🎯 Objetivo
Mantener la sesión de Firebase + CloudRun **siempre viva** durante desarrollo, sin necesidad de re-login constante mientras revisas deploys o modificas código.

---

## ✅ Mejoras Implementadas

### 1. **Token Refresh Proactivo** (Cada 45 minutos)
```typescript
// AuthContext.tsx
const setupTokenRefresh = (user: User) => {
  const refreshInterval = setInterval(async () => {
    await user.getIdToken(true); // force refresh
    console.debug('[Auth] Token refreshed proactively');
  }, 45 * 60 * 1000); // Antes de que expire en 60 min
};
```

**Beneficio:** No hay sorpresas de "token expirado" a mitad de una acción.

---

### 2. **Heartbeat de Sesión** (Cada 5 minutos)
```typescript
// main.tsx
const startHeartbeat = () => {
  setInterval(async () => {
    const user = getAuth().currentUser;
    if (user) {
      await user.getIdToken(true); // Mantener vivo
      console.debug('[Heartbeat] Session kept alive');
    }
  }, 5 * 60 * 1000);
};
```

**Beneficio:** La sesión permanece activa incluso si no haces requests cada X tiempo.

---

### 3. **Retry Automático en Errores Transitorios**
```typescript
// main.tsx - queryClient config
retry: (failureCount, error) => {
  // No reintentar 401 (auth error)
  if (error?.data?.code === 'UNAUTHORIZED') return false;
  // Reintentar máximo 2 veces para otros errores (timeout, conexión, etc.)
  return failureCount < 2;
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

**Beneficio:** Los fallos transitorios (CloudRun redeploying, lag de red) se recuperan automáticamente sin que veas error.

---

### 4. **Monitoreo de Conexión a Internet**
```typescript
// AuthContext.tsx
window.addEventListener('online', () => {
  setIsConnected(true);
  console.debug('[Auth] Connection restored');
});
window.addEventListener('offline', () => {
  setIsConnected(false);
  console.warn('[Auth] Lost connection');
});
```

**Beneficio:** La UI sabe si estás offline y puede mostrar un indicador.

---

### 5. **Mejor Logging de Errores de Auth**
```typescript
// main.tsx - redirectToLoginIfUnauthorized
if (!auth.currentUser) {
  console.warn('[Auth] 401 UNAUTHORIZED detected; no current user in Firebase');
  // → Redirigir a login
} else {
  console.debug('[Auth] 401 detected but Firebase has current user; token may have been revoked');
  // → No redirigir, reintentar en siguiente request
}
```

**Beneficio:** Mejor diagnóstico en consola de qué pasó exactamente.

---

## 📊 Comparación ANTES vs DESPUÉS

| Escenario | ANTES | AHORA |
|----------|-------|-------|
| Token expira mientras trabajas | ❌ Error 401 sorpresa | ✅ Refrescado proactivamente (45 min) |
| Dejas la app abierta 1 hora | ❌ Necesita re-login | ✅ Corazón late cada 5 min, sigue vivo |
| CloudRun redeploy durante request | ❌ Error visto por usuario | ✅ Reintentado automáticamente |
| Pierdes conexión a Internet | ❌ Error no claro | ✅ Detectado, mostrado en consola |
| Error 401 misterioso | ❌ Redirige a login sin contexto | ✅ Console muestra causa exacta |

---

## 🚀 Cómo Verificar que Funciona

### En Consola del Navegador (F12)

**Token refresh proactivo:**
```
[Auth] Token refreshed proactively  // Aparece cada 45 min
```

**Heartbeat de sesión:**
```
[Heartbeat] Session kept alive  // Aparece cada 5 min
```

**Detectar conexión/desconexión:**
```
[Auth] Connection restored  // Si recuperas conexión
[Auth] Lost connection       // Si pierdes conexión
```

**Retry automático:**
```
// Si CloudRun falla temporalmente, React Query lo reintentará
// Sin que veas error en la UI
```

---

## 📱 Cómo Usar en Desarrollo

### Escenario 1: Revisar Deploy de API
```
1. Hacer git push (CloudRun redeploy en ~2 min)
2. Ir a la app, hacer click en algún botón
3. Si falla: retry automático en 1-2 seg
4. No necesitas refrescar página ni re-logearte
```

### Escenario 2: Modificar Frontend
```
1. Vite hot-reload actualiza la app
2. Sesión de Firebase sigue viva
3. Puedes seguir navegando sin interrupciones
```

### Escenario 3: Conexión Intermitente
```
1. Pierdes conexión: [Auth] Lost connection
2. Recuperas: [Auth] Connection restored
3. Requests se reintentan automáticamente
4. No necesitas refrescar manualmente
```

---

## 🧪 Cómo Testear Manualmente

### Test 1: Verificar Token Refresh
```javascript
// En consola del navegador
getAuth().currentUser?.getIdTokenResult(true).then(r => {
  console.log('Token issue time:', new Date(r.issuedAtTime));
  console.log('Token expiry:', new Date(r.expirationTime));
});
```

### Test 2: Simular Desconexión
```javascript
// En consola: desconectar
window.dispatchEvent(new Event('offline'));
// Deberías ver: [Auth] Lost connection

// Reconectar
window.dispatchEvent(new Event('online'));
// Deberías ver: [Auth] Connection restored
```

### Test 3: Forzar Retry
```javascript
// Para testear retry, puedes pausar el backend en Cloud Run
// y hacer un request. Deberías ver 2 reintentos antes de fallar.
```

---

## 📊 Intervalos Configurados

| Funcionalidad | Intervalo | Razón |
|---------------|-----------|----|
| Token Refresh | 45 min | Token expira en 60, refrescar antes |
| Heartbeat | 5 min | Mantener sesión "viva" sin hacer mucho ruido |
| Retry 1 | Inmediato | Primer reintento sin espera |
| Retry 2 | 2 seg | Segundo reintento con backoff |
| Conexión check | Evento browser | Detectar online/offline instantáneamente |

---

## 🔐 Seguridad

✅ **Tokens siempre frescos** → No hay riesgo de token expirado en manos del usuario  
✅ **Refresh automático** → No se envían tokens viejos a la API  
✅ **Heartbeat es ligero** → Solo refresca token, no hace requests innecesarias  
✅ **Monitoreo local** → Todo ocurre en el navegador, sin cambios en backend  

---

## 📝 Archivos Modificados

```
integra-rh-manus/client/src/contexts/AuthContext.tsx
  - setupTokenRefresh() con intervalo de 45 min
  - isConnected state
  - Event listeners para online/offline

integra-rh-manus/client/src/main.tsx
  - queryClient retry config (2 reintentos con backoff)
  - startHeartbeat() con intervalo de 5 min
  - Mejor logging en redirectToLoginIfUnauthorized
```

---

## 🎯 Próximos Pasos (Opcionales)

- [ ] Mostrar indicador visual de "Sesión activa" en UI
- [ ] Notificación si se detecta logout forzado (token revocado)
- [ ] Dashboard de métricas: uptime, reintentos, refreshes
- [ ] Almacenar logs en IndexedDB para diagnóstico offline

---

**Estado:** ✅ Implementado y listo  
**Probado en:** desarrollo local + Firebase Emulator  
**Sin cambios en:** backend, BD, CloudRun  

