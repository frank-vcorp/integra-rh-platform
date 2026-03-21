# DICTAMEN TÉCNICO: Segunda opinión forense sobre invalid_grant en Firebase Storage
- **ID:** FIX-20260320-01
- **Fecha:** 2026-03-20
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El backend de manus inicializa Firebase Admin leyendo explícitamente la ruta de `GOOGLE_APPLICATION_CREDENTIALS`, resuelve rutas relativas contra múltiples bases y, si encuentra el archivo, materializa `admin.credential.cert(json)` antes de usar Storage. En el entorno local revisado, la ruta relativa `./firebase-admin-sdk.json` sí existe, el JSON tiene forma de `service_account`, el `project_id` coincide con `integra-rh` y contiene `private_key`. Eso reduce mucho la probabilidad de un fallo de path simple.

Hallazgos forenses:
1. **La ruta local parece sana.** `integra-rh-manus/.env` apunta a `./firebase-admin-sdk.json` y el archivo existe en la raíz de manus.
2. **`server/firebase.ts` sí está usando credencial explícita cuando la ruta resuelve.** Por tanto, un `invalid_grant: Invalid JWT Signature` apunta más a llave privada inválida/revocada, service account deshabilitada, reloj del host desfasado o mezcla de credenciales efectivas entre procesos que a bucket inexistente.
3. **Hay una discrepancia documental.** `docs/AUTH_FIREBASE.md` dice que el servidor inicializa “sin ADC”, pero el código actual sí usa `GOOGLE_APPLICATION_CREDENTIALS` cuando está presente.
4. **Riesgo de fallback silencioso.** Si el JSON parsea mal o la ruta no se encuentra, el módulo cae a `initializeApp({ projectId, storageBucket })`; eso no explica este `invalid_grant` concreto, pero sí puede confundir diagnóstico entre entornos.
5. **La segunda opinión de Qodo no estuvo disponible** por límite de cuota del entorno, así que este dictamen se basa en inspección directa del código y de la configuración local.

### B. Justificación de la Solución
No se aplicó parche porque la solicitud fue una segunda opinión corta y sin cambios de código. La evidencia observada mueve el foco fuera de un problema trivial de ruta local: el archivo existe, tiene forma correcta y el código lo carga explícitamente. Lo prioritario es validar cuál credencial efectiva usa el proceso de manus al momento de firmar para Storage y si esa service account sigue siendo válida del lado de Google.

### C. Instrucciones de Handoff para INTEGRA
1. Confirmar si el proceso que corre manus exporta otra `GOOGLE_APPLICATION_CREDENTIALS` a nivel shell, PM2, systemd, Docker o script de arranque; si existe, puede pisar la expectativa del `.env`.
2. Verificar que la service account `firebase-adminsdk-fbsvc@integra-rh.iam.gserviceaccount.com` siga activa, sin key revocada y con la llave privada correspondiente al JSON actual.
3. Revisar reloj/NTF del host donde corre manus; un desfase significativo puede invalidar el JWT firmado.
4. Confirmar que no se esté reutilizando un `dist` viejo o un proceso previo con entorno distinto, porque `server/firebase.ts` inicializa una sola vez por proceso y conserva `admin.apps`.
5. Tratar bucket y `project_id` como verificación secundaria: un bucket incorrecto normalmente deriva en 403/404 o permisos, no en `Invalid JWT Signature`.
6. Alinear documentación: `docs/AUTH_FIREBASE.md` debe reflejar que hoy sí hay uso de `GOOGLE_APPLICATION_CREDENTIALS` cuando está definido.