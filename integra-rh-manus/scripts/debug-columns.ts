import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL || '';

async function run() {
  if (!dbUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  console.log('--- Columns in processes ---');
  const [rowsProcesses] = await connection.execute(`SHOW COLUMNS FROM processes`);
  (rowsProcesses as any[]).forEach(r => console.log(r.Field, r.Type));

  console.log('\n--- Columns in candidates ---');
  const [rowsCandidates] = await connection.execute(`SHOW COLUMNS FROM candidates`);
  (rowsCandidates as any[]).forEach(r => console.log(r.Field, r.Type));

  await connection.end();
}

run().catch(console.error);
