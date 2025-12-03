/**
 * SCRIPT DE INICIALIZACIÓN (BOOTSTRAP) - EJECUTAR LOCALMENTE UNA SOLA VEZ
 * --------------------------------------------------------------------
 * Propósito: Asigna el rol de 'superAdmin' al primer usuario del sistema.
 *
 * USO:
 * 1. Descarga el archivo de credenciales de tu cuenta de servicio desde:
 *    Firebase Console > Project Settings > Service accounts > Generate new private key
 *    y guárdalo en la raíz de la carpeta `functions` como `serviceAccountKey.json`.
 *    ¡¡¡IMPORTANTE: NUNCA subas este archivo a Git. Añádelo a tu .gitignore!!!
 *
 * 2. Reemplaza 'TU_UID_AQUI' con el UID del usuario que será superAdmin.
 *
 * 3. Ejecuta desde la terminal en la raíz del proyecto:
 *    node scripts/setSuperAdmin.js
 */

const admin = require('firebase-admin');

// ¡¡¡IMPORTANTE!!! La ruta debe apuntar a tu archivo de credenciales.
const serviceAccount = require('./../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'cFgEjgwUJuOApwmGCulGRS0UIJt1'; // <--- REEMPLAZA ESTO CON TU UID

admin.auth().setCustomUserClaims(uid, { role: 'superAdmin' })
  .then(() => {
    console.log(`¡Éxito! El usuario ${uid} ahora es Super Administrador.`);
    console.log('Puedes verificar los claims en la consola de Firebase o refrescando el token del usuario.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error al asignar el rol de Super Administrador:', error);
    process.exit(1);
  });