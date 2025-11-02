import path from 'path';
import fs from 'fs/promises';
import { db, connection } from './db';
import { clients, posts, candidates } from '../drizzle/schema';
import { count } from 'drizzle-orm';

async function readCountFromJson(p: string) {
  try {
    const raw = await fs.readFile(p, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const base = path.join(process.cwd(), 'data', 'exports');
  const clientsJson = path.join(base, 'clients.json');
  const postsJson = path.join(base, 'posts.json');
  const candidatesJson = path.join(base, 'candidates.json');

  const srcClients = await readCountFromJson(clientsJson);
  const srcPosts = await readCountFromJson(postsJson);
  const srcCandidates = await readCountFromJson(candidatesJson);

  const dbClients = (await db.select({ c: count() }).from(clients))[0]?.c ?? 0;
  const dbPosts = (await db.select({ c: count() }).from(posts))[0]?.c ?? 0;
  const dbCandidates = (await db.select({ c: count() }).from(candidates))[0]?.c ?? 0;

  console.log('=== Verificación de Conteos ===');
  console.log(`clients   → fuente: ${srcClients} | db: ${dbClients} | ${(dbClients === srcClients) ? 'OK' : 'DESALINEADO'}`);
  console.log(`posts     → fuente: ${srcPosts} | db: ${dbPosts} | ${(dbPosts === srcPosts) ? 'OK' : 'DESALINEADO'}`);
  console.log(`candidates→ fuente: ${srcCandidates} | db: ${dbCandidates} | ${(dbCandidates === srcCandidates) ? 'OK' : 'DESALINEADO'}`);
}

main()
  .catch(err => {
    console.error('[verify] Error:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('[verify] Cerrando conexión.');
    connection.end();
  });

