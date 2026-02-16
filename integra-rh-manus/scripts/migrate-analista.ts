import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL || '';
const url = new URL(dbUrl);

async function migrate() {
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  try {
    console.log('Starting migration...');
    
    // Agregar columna a candidates (inicialmente NULLABLE con default NULL)
    try {
      await connection.execute(`
        ALTER TABLE \`candidates\`
        ADD COLUMN \`analistaAsignadoId\` int NULL AFTER \`selfFilledReviewedAt\`,
        ADD INDEX \`idx_candidates_analistaAsignadoId\` (\`analistaAsignadoId\`),
        ADD CONSTRAINT \`fk_candidates_analistaAsignadoId\` 
          FOREIGN KEY (\`analistaAsignadoId\`) 
          REFERENCES \`users\` (\`id\`) 
          ON DELETE RESTRICT 
          ON UPDATE CASCADE
      `);
      console.log('✓ Columna analistaAsignadoId agregada a candidates (nullable)');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
        console.log('⚠️ Columna analistaAsignadoId ya existe en candidates');
      } else {
        throw e;
      }
    }

    // Agregar columna a processes (inicialmente NULLABLE)
    try {
      await connection.execute(`
        ALTER TABLE \`processes\`
        ADD COLUMN \`analistaAsignadoId\` int NULL AFTER \`especialistaAtraccionNombre\`,
        ADD INDEX \`idx_processes_analistaAsignadoId\` (\`analistaAsignadoId\`),
        ADD CONSTRAINT \`fk_processes_analistaAsignadoId\` 
          FOREIGN KEY (\`analistaAsignadoId\`) 
          REFERENCES \`users\` (\`id\`) 
          ON DELETE SET NULL 
          ON UPDATE CASCADE
      `);
      console.log('✓ Columna analistaAsignadoId agregada a processes (nullable)');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
        console.log('⚠️ Columna analistaAsignadoId ya existe en processes');
      } else {
        throw e;
      }
    }

    console.log('✅ Migraciones completadas exitosamente');
    console.log('ℹ️  Las columnas están como NULLABLE. El backend validará la asignación.');
  } catch (error: any) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
