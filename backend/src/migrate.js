/**
 * Database Migration Script
 * Runs all SQL migration files in order
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  let connection;
  
  try {
    // Connect without database first
    console.log('Connecting to MySQL...\n');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
    });

    console.log('Connected to MySQL\n');

    // Create database if not exists
    console.log('Creating database "watertracker"...');
    await connection.query('CREATE DATABASE IF NOT EXISTS watertracker');
    await connection.query('USE watertracker');
    console.log('Database ready\n');

    // Run migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('Running migrations...\n');

    for (const file of files) {
      // Skip database creation file
      if (file === '001_create_database.sql') {
        console.log(`Skipping: ${file} (database already created)\n`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      let sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Executing: ${file}`);
      
      // Remove USE statements and comments
      sql = sql
        .replace(/USE\s+watertracker\s*;/gi, '')
        .replace(/--.*$/gm, '') // Remove line comments
        .trim();
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => {
          const trimmed = s.trim();
          return trimmed.length > 0 && 
                 !trimmed.startsWith('--') && 
                 !trimmed.match(/^\s*$/);
        });
      
      console.log(`   Found ${statements.length} statements to execute`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement && statement.length > 5) { // Minimum meaningful statement
          try {
            await connection.query(statement);
            // Log if table was created
            if (statement.toUpperCase().includes('CREATE TABLE')) {
              const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
              if (tableMatch) {
                console.log(`   Created table: ${tableMatch[1]}`);
              }
            }
          } catch (err) {
            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
              console.log(`   Table already exists (skipping)`);
            } else {
              console.error(`   Error executing statement ${i + 1}: ${err.message}`);
              console.error(`   Statement: ${statement.substring(0, 100)}...`);
              throw err;
            }
          }
        }
      }
      
      console.log(`Completed: ${file}\n`);
    }

    // Verify tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Created ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });

    console.log('\nAll migrations completed successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('\nMigration error:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

runMigrations();

