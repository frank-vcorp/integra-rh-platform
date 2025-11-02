import fs from 'fs/promises';
import path from 'path';
import { db, connection } from './db';
import { clients, posts, candidates, type InsertClient, type InsertPost, type InsertCandidate } from '../drizzle/schema';

type AnyRecord = Record<string, any>;

async function readJson<T = unknown>(p: string): Promise<T> {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as T;
}

async function main() {
  console.log('[etl] Limpiando tablas existentes...');
  await db.execute('SET FOREIGN_KEY_CHECKS = 0;');
  await db.execute('TRUNCATE TABLE clients;');
  await db.execute('TRUNCATE TABLE posts;');
  await db.execute('TRUNCATE TABLE candidates;');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('[etl] Tablas limpiadas.');

  const base = path.join(process.cwd(), 'data', 'exports');
  const clientsPath = path.join(base, 'clients.json');
  const postsPath = path.join(base, 'posts.json');
  const candidatesPath = path.join(base, 'candidates.json'); // Path para candidatos

  const clientsRows = await readJson<AnyRecord[]>(clientsPath);
  const postsRows = await readJson<AnyRecord[]>(postsPath);
  const candidatesRows = await readJson<AnyRecord[]>(candidatesPath); // Leer datos de candidatos

  const idMap = new Map<string, number>();
  const postIdMap = new Map<string, number>(); // Mapa para IDs de puestos

  console.log(`[etl] Importando clients (${clientsRows.length})...`);
  for (const c of clientsRows) {
    const payload: InsertClient = {
      nombreEmpresa: c.nombreEmpresa ?? c.nombre_empresa ?? 'N/D',
      ubicacionPlaza: c.ubicacionPlaza ?? null,
      reclutador: c.reclutador ?? null,
      contacto: c.contacto ?? null,
      telefono: c.telefono ?? null,
      email: c.email ?? null,
    } as InsertClient;

    const res = await db.insert(clients).values(payload);
    const insertId = (res as any)[0]?.insertId as number | undefined;
    if (insertId) {
      if (typeof c.id === 'string') idMap.set(c.id, insertId);
    }
  }

  // Escribir mapeo para trazabilidad
  const mapOut = path.join(base, 'client-id-map.json');
  await fs.writeFile(
    mapOut,
    JSON.stringify(Object.fromEntries(idMap.entries()), null, 2),
    'utf8'
  );
  console.log(`[etl] Mapa de IDs guardado en ${mapOut}`);

  console.log(`[etl] Importando posts (${postsRows.length})...`);
  let skipped = 0;
  let imported = 0;
  for (const p of postsRows) {
    const fsClientId = p.clienteId ?? p.clientId;
    const sqlClientId = typeof fsClientId === 'string' ? idMap.get(fsClientId) : undefined;
    if (!sqlClientId) {
      skipped++;
      continue; // no hay mapeo válido → saltar para no romper FK
    }
    const payload: InsertPost = {
      nombreDelPuesto: p.nombreDelPuesto ?? p.title ?? 'N/D',
      clienteId: sqlClientId,
      descripcion: p.descripcion ?? null,
      estatus: (p.estatus as any) ?? 'activo',
    } as InsertPost;
    const res = await db.insert(posts).values(payload);
    const insertId = (res as any)[0]?.insertId as number | undefined;
    if (insertId) {
      if (typeof p.id === 'string') postIdMap.set(p.id, insertId);
    }
    imported++;
  }
  console.log(`[etl] posts importados: ${imported}, omitidos (sin mapeo cliente): ${skipped}`);

  console.log(`[etl] Importando candidates (${candidatesRows.length})...`);
  let skippedCandidates = 0;
  let importedCandidates = 0;
  for (const cand of candidatesRows) {
    const fsClientId = cand.clienteId ?? cand.clientId;
    const sqlClientId = typeof fsClientId === 'string' ? idMap.get(fsClientId) : undefined;

    const fsPostId = cand.puestoId ?? cand.postId;
    const sqlPostId = typeof fsPostId === 'string' ? postIdMap.get(fsPostId) : undefined;

    const payload: InsertCandidate = {
      nombreCompleto: cand.nombreCompleto ?? 'N/D',
      email: cand.email ?? null,
      telefono: cand.telefono ?? null,
      medioDeRecepcion: cand.medioDeRecepcion ?? null,
      clienteId: sqlClientId,
      puestoId: sqlPostId,
      psicometricos: cand.psicometricos ?? null,
    } as InsertCandidate;

    await db.insert(candidates).values(payload);
    importedCandidates++;
  }
  console.log(`[etl] candidates importados: ${importedCandidates}, omitidos: ${skippedCandidates}`);

  console.log('[etl] Finalizado');
}

main()
  .catch(err => {
    console.error('[etl] Error:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('[etl] Cerrando conexión a la base de datos...');
    connection.end();
  });

