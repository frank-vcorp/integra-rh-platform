# DICTAMEN TÉCNICO: Fallo "no puedo ver la db en local"
- **ID:** FIX-20260311-02
- **Fecha:** 2026-03-11
- **Solicitante:** HUMANO / SOFIA / INTEGRA
- **Estado:** ✅ VALIDADO (Requiere acción humana de configuración)

### A. Análisis de Causa Raíz
El usuario reporta que no visualiza la base de datos al ejecutar `npm run dev`.
Al inspeccionar el entorno, observamos:
1. El archivo `integra-rh-manus/.env` tiene configurado `DATABASE_URL=mysql://Integra-rh:***@34.134.83.164:3306/integra_rh_v2`.
2. La dirección IP `34.134.83.164` es una IP pública que apunta a la instancia MySQL en la nube (frecuentemente GCP Cloud SDL).
3. Una prueba directa de conectividad (`npx tsx test-db.ts`) detona un "hang" / timeout al inicializar el *pool* de conexiones de MySQL con Drizzle/mysql2 porque la red remota o proveedor (GCP/Railway) **NO tiene en la whitelist la IP actual** desde donde se ejecuta el código. 

**Causa Raíz:** Restricción de Firewall / IP Blocker de la nube que impide conectar el ambiente local (`npm run dev`) con el servidor remoto MySQL.

### B. Justificación de la Solución
Para que Drizzle y tRPC no arrojen timeout durante la fase de inicialización o lecturas a la DB, el entorno local debe o bien ser autorizado en la nube o migrar temporalmente la cadena de conexión a un entorno 100% local. 

### C. Instrucciones de Handoff para el HUMANO (Configuración Requerida)

Tienes **dos opciones** para resolver este bloqueo:

#### OPCIÓN 1: Conectarte a la DB remota (Recomendado si quieres ver datos reales)
1. Obtén tu IP pública actual corriendo en la terminal:
   ```bash
   curl ifconfig.me
   ```
2. Ve a la consola del proveedor de base de datos (Ej: Google Cloud SQL o Railway) y añade esa IP a los **Orígenes Autorizados (Authorized Networks / Whitelist)**.
3. Vuelve a correr `npm run dev`.

#### OPCIÓN 2: Usar un MySQL local via Docker (Para entorno 100% aislado)
1. Levanta un contendor MySQL local:
   ```bash
   docker run --name mysql-local -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=integra_rh_v2 -p 3306:3306 -d mysql:8.0
   ```
2. Edita tu archivo `integra-rh-manus/.env` y reemplaza temporalmente la variable `DATABASE_URL`:
   ```env
   DATABASE_URL=mysql://root:root@localhost:3306/integra_rh_v2
   ```
3. Ejecuta las migraciones o seeders (si existen) y detona de nuevo tu `npm run dev`.

4. Sincroniza el esquema de la base de datos a tu MySQL local corriendo:
   ```bash
   npm run db:push
   ```
