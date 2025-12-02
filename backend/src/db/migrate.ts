import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './client';
import { logger } from '../utils/logger';

async function migrate() {
  try {
    logger.info('Starting database migration...');
    
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    await db.query(schema);
    
    logger.info('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', error);
    process.exit(1);
  }
}

migrate();
