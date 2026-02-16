import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL || '';

async function run() {
  if (!dbUrl) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  console.log('Connecting to database...');
  // Parse URL manually to ensure options are correct
  // mysql://root:password@host:port/db
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // remove leading slash
    ssl: { rejectUnauthorized: false } // Railway often needs SSL
  });

  console.log('Connected. Running migration 0021...');

  try {
    // 1. Add column to candidates
    console.log('Adding analistaAsignadoId to candidates...');
    await connection.execute(`
      ALTER TABLE \`candidates\`
      ADD COLUMN \`analistaAsignadoId\` int NOT NULL DEFAULT 1 AFTER \`selfFilledReviewedAt\`,
      ADD INDEX \`idx_candidates_analistaAsignadoId\` (\`analistaAsignadoId\`),
      ADD CONSTRAINT \`fk_candidates_analistaAsignadoId\` 
        FOREIGN KEY (\`analistaAsignadoId\`) 
        REFERENCES \`users\` (\`id\`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE;
    `);
    console.log('✅ candidates table updated.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ Column analistaAsignadoId already exists in candidates.');
    } else {
      console.error('Error updating candidates:', err);
    }
  }

  try {
    // 2. Add column to processes
    console.log('Adding analistaAsignadoId to processes...');
    await connection.execute(`
      ALTER TABLE \`processes\`
      ADD COLUMN \`analistaAsignadoId\` int NULL AFTER \`especialistaAtraccionNombre\`,
      ADD INDEX \`idx_processes_analistaAsignadoId\` (\`analistaAsignadoId\`),
      ADD CONSTRAINT \`fk_processes_analistaAsignadoId\` 
        FOREIGN KEY (\`analistaAsignadoId\`) 
        REFERENCES \`users\` (\`id\`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    `);
    console.log('✅ processes table updated.');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ Column analistaAsignadoId already exists in processes.');
    } else {
      console.error('Error updating processes:', err);
    }
  }

  await connection.end();
}

run().catch(console.error);
