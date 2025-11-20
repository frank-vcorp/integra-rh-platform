import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const conn = await mysql.createConnection(url);
  try {
    await conn.query("ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `whatsapp` varchar(50) NULL");
    console.log('OK: whatsapp column ensured');
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });

